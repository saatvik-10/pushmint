import { afterEach, describe, expect, test } from "bun:test";
import {
  consumeDeploymentQuota,
  DeploymentRateLimitError,
  hashClientIp,
} from "../rateLimit";

describe("deployment quota", () => {
  afterEach(() => {
    delete process.env.DEPLOY_LIMIT_PER_HOUR;
    delete process.env.DEPLOY_LIMIT_PER_DAY;
  });

  test("hashes client addresses instead of storing them directly", () => {
    const fingerprint = hashClientIp("203.0.113.4", "local-test-secret");
    expect(fingerprint).not.toContain("203.0.113.4");
    expect(fingerprint).toBe(hashClientIp("203.0.113.4", "local-test-secret"));
    expect(fingerprint).not.toBe(
      hashClientIp("203.0.113.5", "local-test-secret"),
    );
  });

  test("enforces the hourly and daily fixed-window limits", async () => {
    process.env.DEPLOY_LIMIT_PER_HOUR = "10";
    process.env.DEPLOY_LIMIT_PER_DAY = "2";
    const buckets = new Map<string, { count: number }>();
    const database = {
      deploymentRateLimit: {
        async upsert({ where, create, update }: any) {
          const key = `${where.clientHash_period_windowStart.clientHash}:${where.clientHash_period_windowStart.period}:${where.clientHash_period_windowStart.windowStart.toISOString()}`;
          const bucket = buckets.get(key) ?? { count: create.count };
          if (buckets.has(key)) bucket.count += update.count.increment;
          buckets.set(key, bucket);
          return bucket;
        },
      },
    } as any;
    const now = new Date("2026-11-18T12:15:00.000Z");

    await consumeDeploymentQuota(database, "client-hash", now);
    await consumeDeploymentQuota(database, "client-hash", now);
    await expect(
      consumeDeploymentQuota(database, "client-hash", now),
    ).rejects.toBeInstanceOf(DeploymentRateLimitError);
    await consumeDeploymentQuota(
      database,
      "client-hash",
      new Date("2026-11-19T00:00:00.000Z"),
    );
  });
});
