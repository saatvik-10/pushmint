import "dotenv/config";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app";

const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 3000);
const { createSiteHandler } = require("../../../reqHandler/dist/index.js") as {
  createSiteHandler: () => express.RequestHandler;
};
const app = createApp(prisma, createSiteHandler());

async function start() {
  await prisma.$connect();
  // A Render restart can interrupt a demo build; requeue records that would otherwise remain stuck.
  await prisma.deployment.updateMany({
    where: { status: "building" },
    data: { status: "queued" },
  });
  const { startDeploymentWorker } =
    require("../../../deployService/dist/index.js") as {
      startDeploymentWorker: (database: PrismaClient) => () => void;
    };
  startDeploymentWorker(prisma);
  const server = app.listen(port, () =>
    console.log(`Pushmint API and static router listening on ${port}`),
  );

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

start().catch(async (error) => {
  console.error("Pushmint failed to start:", error);
  await prisma.$disconnect();
  process.exit(1);
});
