import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import express from "express";
import type { Server } from "node:http";
import { createSiteHandler } from "../index";

describe("static request handler", () => {
  let server: Server;
  let baseUrl: string;
  let requestedKeys: string[];

  beforeEach(async () => {
    requestedKeys = [];
    const storage = {
      getObject({ Key }: { Bucket: string; Key: string }) {
        requestedKeys.push(Key);
        return {
          async promise() {
            if (Key === "dist/site/index.html")
              return { Body: Buffer.from("<h1>static app</h1>") };
            throw Object.assign(new Error("missing key"), {
              code: "NoSuchKey",
            });
          },
        };
      },
    };
    const app = express();
    app.set("trust proxy", true);
    app.use(createSiteHandler(storage, "test-bucket", "sites.test"));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  test("serves index for client-side routes and preserves HTML cache behavior", async () => {
    const response = await fetch(`${baseUrl}/settings/profile`, {
      headers: { "x-forwarded-host": "site.sites.test" },
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<h1>static app</h1>");
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(requestedKeys).toEqual([
      "dist/site/settings/profile",
      "dist/site/index.html",
    ]);
  });

  test("returns 404 for missing asset files without SPA fallback", async () => {
    const response = await fetch(`${baseUrl}/assets/missing.js`, {
      headers: { "x-forwarded-host": "site.sites.test" },
    });
    expect(response.status).toBe(404);
    expect(requestedKeys).toEqual(["dist/site/assets/missing.js"]);
  });
});
