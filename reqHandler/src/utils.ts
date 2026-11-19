import path from "node:path";

export function getObjectKey(deploymentId: string, requestPath: string) {
  const decodedPath = decodeURIComponent(requestPath);
  const normalizedPath = path.posix
    .normalize(`/${decodedPath}`)
    .replace(/^\/+/, "");
  if (normalizedPath.startsWith("..") || normalizedPath.includes("\\"))
    return null;
  return `dist/${deploymentId}/${normalizedPath || "index.html"}`;
}

export function shouldFallbackToIndex(requestPath: string) {
  return requestPath === "/" || !path.posix.extname(requestPath);
}
