import { createHmac } from "node:crypto";
import type { Prisma } from "./generated/prisma/client";

type RateLimitDatabase = Pick<Prisma.TransactionClient, "deploymentRateLimit">;

export class DeploymentRateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Deployment rate limit exceeded. Try again later.");
    this.name = "DeploymentRateLimitError";
  }
}

export class RateLimitConfigurationError extends Error {
  constructor() {
    super(
      "RATE_LIMIT_SECRET must be configured before public deployments can be accepted.",
    );
    this.name = "RateLimitConfigurationError";
  }
}

export function hashClientIp(
  ip: string,
  secret = process.env.RATE_LIMIT_SECRET,
) {
  if (!secret) throw new RateLimitConfigurationError();
  return createHmac("sha256", secret).update(ip).digest("hex");
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function consumeDeploymentQuota(
  database: RateLimitDatabase,
  clientHash: string,
  now = new Date(),
) {
  const windows = [
    {
      period: "hour",
      durationMs: 60 * 60 * 1000,
      limit: positiveInteger(process.env.DEPLOY_LIMIT_PER_HOUR, 3),
    },
    {
      period: "day",
      durationMs: 24 * 60 * 60 * 1000,
      limit: positiveInteger(process.env.DEPLOY_LIMIT_PER_DAY, 10),
    },
  ];

  for (const window of windows) {
    const startMs =
      Math.floor(now.getTime() / window.durationMs) * window.durationMs;
    const windowStart = new Date(startMs);
    const expiresAt = new Date(startMs + window.durationMs);
    const bucket = await database.deploymentRateLimit.upsert({
      where: {
        clientHash_period_windowStart: {
          clientHash,
          period: window.period,
          windowStart,
        },
      },
      create: {
        clientHash,
        period: window.period,
        windowStart,
        count: 1,
        expiresAt,
      },
      update: { count: { increment: 1 } },
    });

    if (bucket.count > window.limit) {
      throw new DeploymentRateLimitError(
        Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
      );
    }
  }
}

export type { Prisma };
