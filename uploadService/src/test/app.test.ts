import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { AddressInfo } from "node:net";
import { createApp } from "../app";

type Row = Record<string, any>;

function createDatabase() {
  const deployments = new Map<string, Row>();
  const logs = new Map<string, { id: number; message: string }[]>();
  let nextLogId = 1;
  let nextDeploymentId = 1;
  const database = {
    deployment: {
      async create({ data }: { data: Row }) {
        const row = {
          id: `deploy-test-${nextDeploymentId++}`,
          status: "queued",
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          errorMessage: null,
          siteUrl: null,
          ...data,
        };
        deployments.set(row.id, row);
        logs.set(row.id, []);
        return row;
      },
      async update({ where, data }: { where: { id: string }; data: Row }) {
        const row = deployments.get(where.id);
        if (!row) throw new Error("Not found");
        Object.assign(row, data);
        return row;
      },
      async findMany({ where }: { where?: { displayNameKey?: string } } = {}) {
        return [...deployments.values()].filter(
          (row) =>
            !where?.displayNameKey ||
            row.displayNameKey === where.displayNameKey,
        );
      },
      async count({ where }: { where: { status: string } }) {
        return [...deployments.values()].filter(
          (row) => row.status === where.status,
        ).length;
      },
      async findUnique({
        where,
        select,
        include,
      }: {
        where: { id: string };
        select?: Row;
        include?: Row;
      }) {
        const row = deployments.get(where.id);
        if (!row) return null;
        if (select?.status && select?.siteUrl)
          return { status: row.status, siteUrl: row.siteUrl };
        if (select?.logs)
          return {
            logs: (logs.get(where.id) ?? []).map(({ message }) => ({
              message,
            })),
          };
        if (include?.logs) return { ...row, logs: logs.get(where.id) ?? [] };
        return { ...row, logs: logs.get(where.id) ?? [] };
      },
    },
    deploymentLog: {
      async create({
        data,
      }: {
        data: { deploymentId: string; message: string };
      }) {
        const log = { id: nextLogId++, message: data.message };
        logs.get(data.deploymentId)?.push(log);
        return log;
      },
    },
    deploymentRateLimit: {
      async upsert({ where, create, update }: Row) {
        const key = `${where.clientHash_period_windowStart.clientHash}:${where.clientHash_period_windowStart.period}:${where.clientHash_period_windowStart.windowStart.toISOString()}`;
        const existing = rateLimits.get(key);
        const row = existing
          ? { ...existing, count: existing.count + update.count.increment }
          : { ...create };
        rateLimits.set(key, row);
        return row;
      },
      async deleteMany() {
        return { count: 0 };
      },
    },
    async $transaction<T>(callback: (transaction: Row) => Promise<T>) {
      return callback(database as unknown as Row);
    },
  };
  return database;
}

describe("deployment API", () => {
  let server: ReturnType<ReturnType<typeof createApp>["listen"]>;
  let baseUrl: string;
  let database: ReturnType<typeof createDatabase>;

  beforeEach(async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    process.env.RATE_LIMIT_SECRET = "test-rate-limit-secret-32-characters-long";
    process.env.DEPLOYMENTS_ENABLED = "true";
    process.env.DEPLOY_LIMIT_PER_HOUR = "3";
    process.env.DEPLOY_LIMIT_PER_DAY = "10";
    process.env.MAX_QUEUED_DEPLOYMENTS = "20";
    rateLimits.clear();
    database = createDatabase();
    server = createApp(
      database as never,
      (_req, res) => res.status(404).end(),
      {
        verifyTurnstile: async () => "valid",
      },
    ).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.RATE_LIMIT_SECRET;
    delete process.env.DEPLOYMENTS_ENABLED;
    delete process.env.DEPLOY_LIMIT_PER_HOUR;
    delete process.env.DEPLOY_LIMIT_PER_DAY;
    delete process.env.MAX_QUEUED_DEPLOYMENTS;
  });

  test("queues validated static deployments and exposes them with durable logs", async () => {
    const createResponse = await fetch(`${baseUrl}/deploy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Avery Dev",
        repoUrl: "https://github.com/acme/site.git",
        framework: "next_static",
        buildScript: "build",
        outputDirectory: "out",
        turnstileToken: "valid-test-token",
      }),
    });
    expect(createResponse.status).toBe(202);
    const created = (await createResponse.json()) as {
      id: string;
      siteUrl: string;
      status: string;
    };
    expect(created).toEqual({
      id: "deploy-test-1",
      status: "queued",
      siteUrl: "http://deploy-test-1.localhost:3000",
    });

    const listResponse = await fetch(`${baseUrl}/deployments`);
    const list = (await listResponse.json()) as { deployments: Row[] };
    expect(list.deployments[0]).toMatchObject({
      id: created.id,
      displayName: "Avery Dev",
      framework: "next_static",
      buildScript: "build",
      outputDirectory: "out",
      status: "queued",
      siteUrl: created.siteUrl,
    });

    const detailResponse = await fetch(`${baseUrl}/deployments/${created.id}`);
    const detail = (await detailResponse.json()) as { deployment: Row };
    expect(detail.deployment.logs[0].message).toContain(
      "Next.js static export",
    );

    const statusResponse = await fetch(`${baseUrl}/status?id=${created.id}`);
    expect(await statusResponse.json()).toEqual({
      status: "queued",
      siteUrl: created.siteUrl,
    });
  });

  test("accepts any syntactically valid public GitHub repository and rejects unsafe build settings", async () => {
    const invalidRepo = await fetch(`${baseUrl}/deploy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://example.com/org/repo" }),
    });
    expect(invalidRepo.status).toBe(400);

    const publicRepository = await fetch(`${baseUrl}/deploy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Avery Dev",
        repoUrl: "https://github.com/someone/else",
        turnstileToken: "valid-test-token",
      }),
    });
    expect(publicRepository.status).toBe(202);

    const invalidOutput = await fetch(`${baseUrl}/deploy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Avery Dev",
        repoUrl: "https://github.com/acme/site",
        outputDirectory: "../secrets",
        turnstileToken: "valid-test-token",
      }),
    });
    expect(invalidOutput.status).toBe(400);

    const invalidScript = await fetch(`${baseUrl}/deploy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Avery Dev",
        repoUrl: "https://github.com/acme/site",
        buildScript: "build;whoami",
        turnstileToken: "valid-test-token",
      }),
    });
    expect(invalidScript.status).toBe(400);
  });


  test("lists public deployment history across all display names", async () => {
    const submit = (displayName: string) =>
      fetch(`${baseUrl}/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          repoUrl: "https://github.com/acme/site",
          turnstileToken: "valid-test-token",
        }),
      });
    expect((await submit("Avery Dev")).status).toBe(202);
    expect((await submit("Morgan Dev")).status).toBe(202);
    const response = await fetch(`${baseUrl}/deployments`);
    expect(response.status).toBe(200);
    const { deployments } = (await response.json()) as { deployments: Row[] };
    expect(deployments).toHaveLength(2);
    expect(deployments.map((deployment) => deployment.displayName).sort()).toEqual([
      "Avery Dev",
      "Morgan Dev",
    ]);
    expect((await submit("x")).status).toBe(400);
  });

  test("requires a valid Turnstile token and does not queue failed verification", async () => {
    const serverWithFailure = createApp(
      database as never,
      (_req, res) => res.status(404).end(),
      {
        verifyTurnstile: async () => "invalid",
      },
    ).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) =>
      serverWithFailure.once("listening", resolve),
    );
    const address = serverWithFailure.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${address.port}/deploy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: "Avery Dev",
        repoUrl: "https://github.com/acme/site",
        turnstileToken: "invalid-token",
      }),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "Anti-bot verification failed. Please try again.",
    });
    expect(
      await fetch(`${baseUrl}/deployments`).then((result) => result.json()),
    ).toMatchObject({ deployments: [] });
    await new Promise<void>((resolve, reject) =>
      serverWithFailure.close((error) => (error ? reject(error) : resolve())),
    );
  });

  test("limits each client to three deployments per hour", async () => {
    const submit = () =>
      fetch(`${baseUrl}/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "Avery Dev",
        repoUrl: "https://github.com/acme/site",
          turnstileToken: "valid-test-token",
        }),
      });

    expect((await submit()).status).toBe(202);
    expect((await submit()).status).toBe(202);
    expect((await submit()).status).toBe(202);
    const limited = await submit();
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  test("keeps deployment quotas separate by forwarded client IP", async () => {
    const submit = (ip: string, displayName = "Avery Dev") =>
      fetch(`${baseUrl}/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({
          displayName,
          repoUrl: "https://github.com/acme/site",
          turnstileToken: "valid-test-token",
        }),
      });

    expect((await submit("198.51.100.10")).status).toBe(202);
    expect((await submit("198.51.100.10")).status).toBe(202);
    expect((await submit("198.51.100.10")).status).toBe(202);
    expect((await submit("198.51.100.10")).status).toBe(429);
    expect((await submit("198.51.100.11", "Morgan Dev")).status).toBe(202);
  });

  test("applies the display-name quota across different client IPs", async () => {
    const submit = (ip: string) =>
      fetch(`${baseUrl}/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({
          displayName: "Same Name",
          repoUrl: "https://github.com/acme/site",
          turnstileToken: "valid-test-token",
        }),
      });

    expect((await submit("198.51.100.20")).status).toBe(202);
    expect((await submit("198.51.100.21")).status).toBe(202);
    expect((await submit("198.51.100.22")).status).toBe(202);
    expect((await submit("198.51.100.23")).status).toBe(429);
  });

  test("applies a queue cap and the global deployments pause switch", async () => {
    process.env.MAX_QUEUED_DEPLOYMENTS = "1";
    const submit = () =>
      fetch(`${baseUrl}/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: "Avery Dev",
        repoUrl: "https://github.com/acme/site",
          turnstileToken: "valid-test-token",
        }),
      });

    expect((await submit()).status).toBe(202);
    expect((await submit()).status).toBe(503);

    process.env.DEPLOYMENTS_ENABLED = "false";
    expect((await submit()).status).toBe(503);
  });
});

const rateLimits = new Map<string, Row>();
