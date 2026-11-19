import "dotenv/config";
import { S3 } from "aws-sdk";
import fs from "node:fs";
import path from "node:path";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function listFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

export async function uploadDirectory(deploymentId: string, directory: string) {
  const { ACCESS, SECRET, ENDPOINT, BUCKET } = process.env;
  if (!ACCESS || !SECRET || !ENDPOINT || !BUCKET) {
    throw new Error("Missing required object storage environment variables.");
  }
  const s3 = new S3({
    accessKeyId: ACCESS,
    secretAccessKey: SECRET,
    endpoint: ENDPOINT,
    s3ForcePathStyle: true,
  });
  const files = listFiles(directory);
  if (!files.length) throw new Error("Build output directory is empty.");

  for (let index = 0; index < files.length; index += 8) {
    await Promise.all(
      files.slice(index, index + 8).map(async (file) => {
        const relativePath = path
          .relative(directory, file)
          .split(path.sep)
          .join("/");
        await s3
          .upload({
            Bucket: BUCKET,
            Key: `dist/${deploymentId}/${relativePath}`,
            Body: fs.createReadStream(file),
            ContentType:
              contentTypes[path.extname(file).toLowerCase()] ??
              "application/octet-stream",
          })
          .promise();
      }),
    );
  }
}
