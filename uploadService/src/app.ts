import cors from "cors";
import express from "express";
import type { Prisma, PrismaClient } from "./generated/prisma/client";
import {
  consumeDeploymentQuota,
  DeploymentRateLimitError,
  hashClientIp,
  RateLimitConfigurationError,
} from "./rateLimit";
import { verifyTurnstileToken } from "./turnstile";
import {
  getBuildScript,
  getOutputDirectory,
  getProjectDirectory,
  getSiteUrl,
  getStaticFramework,
  isDeploymentHost,
  normalizeDisplayName,
  normalizeRepositoryUrl,
  validateRepositoryUrl,
} from "./utils";

type AppDatabase = Pick<
  PrismaClient,
  "deployment" | "deploymentLog" | "deploymentRateLimit" | "$transaction"
>;
type TurnstileVerifier = (
  token: string,
  remoteIp: string,
) => Promise<"valid" | "invalid" | "unavailable">;

class DeploymentQueueFullError extends Error {
  constructor() {
    super("The deployment queue is full. Please try again shortly.");
    this.name = "DeploymentQueueFullError";
  }
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

let rateLimitCleanupCounter = 0;

export function createApp(
  database: AppDatabase,
  siteHandler: express.RequestHandler,
  options: { verifyTurnstile?: TurnstileVerifier } = {},
) {
  const app = express();
  const siteDomain = (process.env.SITE_DOMAIN ?? "localhost").toLowerCase();
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 1);

  app.set(
    "trust proxy",
    Number.isSafeInteger(trustProxyHops) && trustProxyHops >= 0
      ? trustProxyHops
      : 1,
  );
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? true }));
  app.use(express.json({ limit: "16kb" }));
  app.use((req, res, next) => {
    if (isDeploymentHost(req.hostname, siteDomain))
      return siteHandler(req, res, next);
    return next();
  });

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.post("/deploy", async (req, res) => {
    if (process.env.DEPLOYMENTS_ENABLED?.toLowerCase() === "false") {
      return res
        .status(503)
        .json({ error: "New deployments are temporarily paused." });
    }

    const body =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    const identity = normalizeDisplayName(body.displayName);
    if (!identity) {
      return res.status(400).json({ error: "Enter a display name between 2 and 32 characters." });
    }
    const repoUrl = body.repoUrl ?? body.repoURL;
    if (!validateRepositoryUrl(repoUrl)) {
      return res
        .status(400)
        .json({ error: "Enter a public HTTPS GitHub repository URL." });
    }
    const framework = getStaticFramework(body.framework);
    if (!framework)
      return res
        .status(400)
        .json({ error: "Choose a supported static framework." });
    const defaultOutputDirectory = framework === "next_static" ? "out" : "dist";
    const outputDirectory = getOutputDirectory(
      framework,
      body.outputDirectory ?? defaultOutputDirectory,
    );
    const projectDirectory = getProjectDirectory(body.projectDirectory);
    const buildScript = getBuildScript(body.buildScript ?? "build");

    if (!projectDirectory) {
      return res.status(400).json({
        error: "Project directory must be a relative path inside the repository.",
      });
    }

    if (!outputDirectory) {
      return res
        .status(400)
        .json({
          error:
            "Output directory must be a relative path inside the project directory.",
        });
    }
    if (!buildScript) {
      return res
        .status(400)
        .json({ error: "Build script must be a valid package script name." });
    }

    const turnstileToken = body.turnstileToken;
    if (
      typeof turnstileToken !== "string" ||
      turnstileToken.length < 1 ||
      turnstileToken.length > 4096
    ) {
      return res
        .status(400)
        .json({ error: "Complete the anti-bot check and try again." });
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    const rateLimitSecret = process.env.RATE_LIMIT_SECRET;
    if (!secretKey || !rateLimitSecret || rateLimitSecret.length < 32) {
      return res
        .status(503)
        .json({ error: "Public deployments are not configured yet." });
    }

    const clientIp = req.ip;
    if (!clientIp)
      return res
        .status(503)
        .json({
          error: "Could not determine the client IP for abuse protection.",
        });

    const verify =
      options.verifyTurnstile ??
      ((token, remoteIp) =>
        verifyTurnstileToken(token, remoteIp, {
          ...(process.env.TURNSTILE_EXPECTED_HOSTNAME
            ? { expectedHostname: process.env.TURNSTILE_EXPECTED_HOSTNAME }
            : {}),
        }));
    const turnstileResult = await verify(turnstileToken, clientIp);
    if (turnstileResult === "invalid") {
      return res
        .status(403)
        .json({ error: "Anti-bot verification failed. Please try again." });
    }
    if (turnstileResult !== "valid") {
      return res
        .status(503)
        .json({ error: "Anti-bot verification is temporarily unavailable." });
    }

    try {
      const clientHash = hashClientIp(clientIp, rateLimitSecret);
      const queued = await database.$transaction(
        async (transaction: Prisma.TransactionClient) => {
          await consumeDeploymentQuota(transaction, clientHash);
          const displayNameHash = hashClientIp(
            `display-name:${identity.displayNameKey}`,
            rateLimitSecret,
          );
          await consumeDeploymentQuota(transaction, displayNameHash);

          const queuedCount = await transaction.deployment.count({
            where: { status: "queued" },
          });
          if (
            queuedCount >=
            positiveInteger(process.env.MAX_QUEUED_DEPLOYMENTS, 20)
          ) {
            throw new DeploymentQueueFullError();
          }

          const deployment = await transaction.deployment.create({
            data: {
              repoUrl: normalizeRepositoryUrl(repoUrl),
              displayName: identity.displayName,
              displayNameKey: identity.displayNameKey,
              framework,
              buildScript,
              outputDirectory,
              projectDirectory,
            },
          });
          const siteUrl = getSiteUrl(deployment.id);
          await transaction.deployment.update({
            where: { id: deployment.id },
            data: { siteUrl },
          });
          await transaction.deploymentLog.create({
            data: {
              deploymentId: deployment.id,
              message: `✦ Deployment queued for ${framework === "vite" ? "Vite-compatible static build" : "Next.js static export"}.`,
            },
          });

          rateLimitCleanupCounter += 1;
          if (rateLimitCleanupCounter % 100 === 0) {
            await transaction.deploymentRateLimit.deleteMany({
              where: { expiresAt: { lt: new Date() } },
            });
          }

          return { deployment, siteUrl };
        },
        { isolationLevel: "Serializable" },
      );
      return res
        .status(202)
        .json({
          id: queued.deployment.id,
          status: queued.deployment.status,
          siteUrl: queued.siteUrl,
        });
    } catch (error) {
      if (error instanceof DeploymentRateLimitError) {
        res.setHeader("Retry-After", String(error.retryAfterSeconds));
        return res
          .status(429)
          .json({
            error: error.message,
            retryAfterSeconds: error.retryAfterSeconds,
          });
      }
      if (error instanceof DeploymentQueueFullError) {
        res.setHeader("Retry-After", "60");
        return res.status(503).json({ error: error.message });
      }
      if (error instanceof RateLimitConfigurationError) {
        return res
          .status(503)
          .json({ error: "Public deployments are not configured yet." });
      }
      if ((error as { code?: string })?.code === "P2034") {
        res.setHeader("Retry-After", "5");
        return res
          .status(503)
          .json({
            error: "The deployment queue is busy. Please retry shortly.",
          });
      }
      console.error("Could not queue deployment:", error);
      return res.status(500).json({ error: "Unable to queue deployment." });
    }
  });

  app.get("/deployments", async (_req, res) => {
    try {
      const deployments = await database.deployment.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          displayName: true,
          repoUrl: true,
          framework: true,
          buildScript: true,
          outputDirectory: true,
          projectDirectory: true,
          status: true,
          siteUrl: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
        },
      });
      return res.json({ deployments });
    } catch (error) {
      console.error("Could not list deployments:", error);
      return res.status(500).json({ error: "Unable to load deployments." });
    }
  });

  app.get("/deployments/:id", async (req, res) => {
    try {
      const deployment = await database.deployment.findUnique({
        where: { id: req.params.id },
        include: { logs: { orderBy: { id: "asc" }, take: 500 } },
      });
      if (!deployment)
        return res.status(404).json({ error: "Deployment not found." });
      return res.json({ deployment });
    } catch (error) {
      console.error("Could not load deployment:", error);
      return res.status(500).json({ error: "Unable to load deployment." });
    }
  });

  // Kept for polling compatibility with the existing deployment console.
  app.get("/status", async (req, res) => {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    const deployment = await database.deployment.findUnique({
      where: { id },
      select: { status: true, siteUrl: true },
    });
    if (!deployment)
      return res.status(404).json({ error: "Deployment not found." });
    return res.json(deployment);
  });

  app.get("/logs", async (req, res) => {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!id) return res.status(400).json({ error: "Missing deployment id." });
    const deployment = await database.deployment.findUnique({
      where: { id },
      select: {
        logs: { orderBy: { id: "asc" }, take: 500, select: { message: true } },
      },
    });
    if (!deployment)
      return res.status(404).json({ error: "Deployment not found." });
    return res.json({
      logs: deployment.logs.map((log: { message: string }) => log.message),
    });
  });

  return app;
}
