import { describe, expect, test } from "bun:test";
import {
  MAX_ARTIFACT_FILE_BYTES,
  MAX_ARTIFACT_FILES,
  MAX_ARTIFACT_TOTAL_BYTES,
  enforceArtifactLimits,
  resolveArtifactPath,
} from "../artifacts";

describe("build artifact validation", () => {
  test("accepts files below the output root", () => {
    expect(
      resolveArtifactPath(
        "/home/user/source/dist",
        "/home/user/source/dist/assets/app.js",
      ),
    ).toBe("assets/app.js");
  });

  test("rejects paths outside the output root", () => {
    expect(() =>
      resolveArtifactPath("/source/dist", "/source/secret.txt"),
    ).toThrow();
    expect(() =>
      resolveArtifactPath("/source/dist", "/source/dist/../../secret.txt"),
    ).toThrow();
    expect(() => resolveArtifactPath("/source/dist", "/source/dist")).toThrow();
  });

  test("enforces per-file, file-count, and total size limits", () => {
    expect(() => enforceArtifactLimits(MAX_ARTIFACT_FILES + 1, 1, 1)).toThrow(
      "file limit",
    );
    expect(() =>
      enforceArtifactLimits(1, MAX_ARTIFACT_FILE_BYTES + 1, 1),
    ).toThrow("25 MB");
    expect(() =>
      enforceArtifactLimits(1, 1, MAX_ARTIFACT_TOTAL_BYTES + 1),
    ).toThrow("100 MB");
    expect(() => enforceArtifactLimits(1, 1, 1)).not.toThrow();
  });
});
