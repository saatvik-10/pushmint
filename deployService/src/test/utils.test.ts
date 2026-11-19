/// <reference types="bun" />

import { describe, expect, test } from "bun:test";
import { resolveOutputDirectory } from "../utils";

describe("resolveOutputDirectory", () => {
  test("keeps build output under the project root", () => {
    expect(resolveOutputDirectory("/tmp/project", "dist")).toBe(
      "/tmp/project/dist",
    );
    expect(resolveOutputDirectory("/tmp/project", "apps/web/out")).toBe(
      "/tmp/project/apps/web/out",
    );
  });

  test("rejects the project root and paths that escape it", () => {
    expect(() => resolveOutputDirectory("/tmp/project", ".")).toThrow();
    expect(() =>
      resolveOutputDirectory("/tmp/project", "../outside"),
    ).toThrow();
    expect(() =>
      resolveOutputDirectory("/tmp/project", "/tmp/other"),
    ).toThrow();
  });
});
