import "dotenv/config";
import { S3 } from "aws-sdk";
import express, { type Request, type Response } from "express";
import path from "node:path";
import { getObjectKey, shouldFallbackToIndex } from "./utils";

type StorageObject = { Body?: unknown };
type ObjectStorage = {
  getObject(params: { Bucket: string; Key: string }): {
    promise(): Promise<StorageObject>;
  };
};

const mimeTypes: Record<string, string> = {
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

function createConfiguredStorage() {
  const accessKeyId = process.env.ACCESS;
  const secretAccessKey = process.env.SECRET;
  const endpoint = process.env.ENDPOINT;
  const bucket = process.env.BUCKET;
  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new Error("Missing required object storage environment variables.");
  }
  return {
    storage: new S3({
      accessKeyId,
      secretAccessKey,
      endpoint,
      s3ForcePathStyle: true,
    }),
    bucket,
  };
}

export function createSiteHandler(
  storageOverride?: ObjectStorage,
  bucketOverride?: string,
  domain = process.env.SITE_DOMAIN ?? "localhost",
) {
  const configured =
    storageOverride && bucketOverride
      ? { storage: storageOverride, bucket: bucketOverride }
      : createConfiguredStorage();
  const siteDomain = domain.toLowerCase();
  const router = express.Router();

  router.use(async (req: Request, res: Response, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const host = req.hostname.toLowerCase();
    const suffix = `.${siteDomain}`;
    if (!host.endsWith(suffix)) return next();

    const deploymentId = host.slice(0, -suffix.length);
    if (!/^[a-z0-9-]+$/.test(deploymentId)) return next();

    let key: string | null;
    try {
      key = getObjectKey(deploymentId, req.path);
    } catch {
      return res.status(400).send("Invalid path");
    }
    if (!key) return res.status(400).send("Invalid path");

    const fetchObject = async (objectKey: string) =>
      configured.storage
        .getObject({ Bucket: configured.bucket, Key: objectKey })
        .promise();
    try {
      let objectKey = key;
      let object: StorageObject;
      try {
        object = await fetchObject(objectKey);
      } catch (error) {
        if (!shouldFallbackToIndex(req.path)) throw error;
        objectKey = `dist/${deploymentId}/index.html`;
        object = await fetchObject(objectKey);
      }

      const extension = path.posix.extname(objectKey).toLowerCase();
      res.setHeader(
        "Content-Type",
        mimeTypes[extension] ?? "application/octet-stream",
      );
      res.setHeader(
        "Cache-Control",
        objectKey.endsWith("/index.html") ? "no-cache" : "public, max-age=3600",
      );
      if (req.method === "HEAD") return res.end();
      return res.send(object.Body);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "NoSuchKey" || code === "NotFound")
        return res.status(404).send("Not Found");
      console.error("Error reading deployment asset:", error);
      return res.status(502).send("Unable to read deployment asset");
    }
  });
  return router;
}
