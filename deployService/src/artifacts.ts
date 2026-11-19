import path from "node:path";

export const MAX_ARTIFACT_FILES = 2_000;
export const MAX_ARTIFACT_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_ARTIFACT_TOTAL_BYTES = 100 * 1024 * 1024;

export function resolveArtifactPath(root: string, sandboxPath: string) {
  const relativePath = path.posix.relative(root, sandboxPath);
  if (
    !relativePath ||
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    path.posix.isAbsolute(relativePath)
  ) {
    throw new Error(
      "Build output contains a file outside its output directory.",
    );
  }
  return relativePath;
}

export function enforceArtifactLimits(
  fileCount: number,
  fileBytes: number,
  totalBytes: number,
) {
  if (fileCount > MAX_ARTIFACT_FILES)
    throw new Error(
      `Build output exceeds the ${MAX_ARTIFACT_FILES} file limit.`,
    );
  if (fileBytes > MAX_ARTIFACT_FILE_BYTES)
    throw new Error("A build output file exceeds the 25 MB limit.");
  if (totalBytes > MAX_ARTIFACT_TOTAL_BYTES)
    throw new Error("Build output exceeds the 100 MB total size limit.");
}
