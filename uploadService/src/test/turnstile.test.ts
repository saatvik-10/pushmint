/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { verifyTurnstileToken } from "../turnstile";

describe("Turnstile Siteverify", () => {
  test("accepts only a successful deploy action for the configured hostname", async () => {
    const fetcher = (async (_input: URL | RequestInfo, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(String(init?.body)).toContain("response=valid-token");
      expect(String(init?.body)).toContain("remoteip=203.0.113.4");
      return Response.json({
        success: true,
        action: "deploy",
        hostname: "pushmint.example",
      });
    }) as typeof fetch;

    expect(
      await verifyTurnstileToken("valid-token", "203.0.113.4", {
        secretKey: "secret",
        expectedHostname: "pushmint.example",
        fetcher,
      }),
    ).toBe("valid");
  });

  test("rejects failed, wrong-action, and wrong-hostname tokens", async () => {
    const response = (value: unknown) =>
      (async () => Response.json(value)) as unknown as typeof fetch;

    expect(
      await verifyTurnstileToken("bad", "", {
        secretKey: "secret",
        fetcher: response({ success: false }),
      }),
    ).toBe("invalid");
    expect(
      await verifyTurnstileToken("wrong-action", "", {
        secretKey: "secret",
        fetcher: response({ success: true, action: "login" }),
      }),
    ).toBe("invalid");
    expect(
      await verifyTurnstileToken("wrong-host", "", {
        secretKey: "secret",
        expectedHostname: "pushmint.example",
        fetcher: response({
          success: true,
          action: "deploy",
          hostname: "attacker.example",
        }),
      }),
    ).toBe("invalid");
  });

  test("fails closed if configuration or Cloudflare is unavailable", async () => {
    expect(await verifyTurnstileToken("token", "", { secretKey: "" })).toBe(
      "unavailable",
    );
    const failingFetch = (async () => {
      throw new Error("network failure");
    }) as unknown as typeof fetch;
    expect(
      await verifyTurnstileToken("token", "", {
        secretKey: "secret",
        fetcher: failingFetch,
      }),
    ).toBe("unavailable");
  });
});
