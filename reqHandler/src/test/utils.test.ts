import { describe, expect, test } from "bun:test";
import { getObjectKey, shouldFallbackToIndex } from "../utils";

describe("static asset routing", () => {
  test("maps paths into the deployment prefix and uses index for root", () => {
    expect(getObjectKey("abc123", "/")).toBe("dist/abc123/index.html");
    expect(getObjectKey("abc123", "/assets/app.js")).toBe(
      "dist/abc123/assets/app.js",
    );
    expect(getObjectKey("abc123", "/about/")).toBe("dist/abc123/about/");
  });

  test("keeps normalized paths inside one deployment and distinguishes SPA routes from assets", () => {
    expect(getObjectKey("abc123", "/../../other/index.html")).toBe(
      "dist/abc123/other/index.html",
    );
    expect(shouldFallbackToIndex("/")).toBe(true);
    expect(shouldFallbackToIndex("/account/settings")).toBe(true);
    expect(shouldFallbackToIndex("/assets/missing.js")).toBe(false);
  });
});
