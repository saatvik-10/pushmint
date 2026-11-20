import "dotenv/config";
import { runSandboxBuild } from "./sandbox";

type DeploymentJob = {
  id: string;
  repoUrl: string;
  buildScript: string;
  outputDirectory: string;
  projectDirectory: string;
};

type Database = {
  deployment: {
    findFirst(args: {
      where: { status: "queued" };
      orderBy: { createdAt: "asc" };
    }): Promise<DeploymentJob | null>;
    updateMany(args: {
      where: { id: string; status: "queued" };
      data: { status: "building"; errorMessage: null };
    }): Promise<{ count: number }>;
    update(args: {
      where: { id: string };
      data: {
        status: "deployed" | "failed";
        completedAt: Date;
        errorMessage?: string;
      };
    }): Promise<unknown>;
  };
  deploymentLog: {
    create(args: {
      data: { deploymentId: string; message: string };
    }): Promise<{ id: number }>;
    deleteMany(args: {
      where: { deploymentId: string; id: { lt: number } };
    }): Promise<unknown>;
  };
};

const pause = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const MAX_LOG_ROWS = 500;

async function writeLog(db: Database, deploymentId: string, message: string) {
  const log = await db.deploymentLog.create({
    data: { deploymentId, message: message.slice(0, 4000) },
  });
  if (log.id > MAX_LOG_ROWS && log.id % 100 === 0) {
    await db.deploymentLog.deleteMany({
      where: { deploymentId, id: { lt: log.id - MAX_LOG_ROWS } },
    });
  }
}

async function buildDeployment(db: Database, deployment: DeploymentJob) {
  await runSandboxBuild(deployment, (message) =>
    writeLog(db, deployment.id, message),
  );
}

export function startDeploymentWorker(db: Database) {
  let stopping = false;
  const stop = () => {
    stopping = true;
  };

  void (async () => {
    while (!stopping) {
      try {
        const queued = await db.deployment.findFirst({
          where: { status: "queued" },
          orderBy: { createdAt: "asc" },
        });
        if (!queued) {
          await pause(1500);
          continue;
        }

        const claimed = await db.deployment.updateMany({
          where: { id: queued.id, status: "queued" },
          data: { status: "building", errorMessage: null },
        });
        if (claimed.count !== 1) continue;

        try {
          await buildDeployment(db, queued);
          await db.deployment.update({
            where: { id: queued.id },
            data: { status: "deployed", completedAt: new Date() },
          });
          await writeLog(db, queued.id, "✓ Deployment is live.");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          await db.deployment.update({
            where: { id: queued.id },
            data: {
              status: "failed",
              errorMessage: message,
              completedAt: new Date(),
            },
          });
          await writeLog(db, queued.id, `✖ Deployment failed: ${message}`);
        }
      } catch (error) {
        console.error("Deployment worker error:", error);
        await pause(3000);
      }
    }
  })();

  return stop;
}
