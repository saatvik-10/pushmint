const reservedSubdomains = new Set(["api", "www"]);

export function validateRepositoryUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "github.com" &&
      !url.port &&
      !url.search &&
      !url.hash &&
      /^\/[a-z0-9_.-]+\/[a-z0-9_.-]+(?:\.git)?\/?$/i.test(url.pathname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function normalizeRepositoryUrl(repositoryUrl: string) {
  return repositoryUrl
    .trim()
    .replace(/\.git\/?$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export function isDeploymentHost(hostname: string, siteDomain: string) {
  const host = hostname.toLowerCase();
  const suffix = `.${siteDomain.toLowerCase()}`;
  if (!host.endsWith(suffix)) return false;
  const label = host.slice(0, -suffix.length);
  return /^[a-z0-9-]+$/.test(label) && !reservedSubdomains.has(label);
}

export function getSiteUrl(
  id: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const protocol = environment.PUBLIC_SITE_PROTOCOL ?? "http";
  const domain = environment.SITE_DOMAIN ?? "localhost";
  const portSuffix =
    domain === "localhost" ? `:${environment.SITE_PORT ?? "3000"}` : "";
  return `${protocol}://${id}.${domain}${portSuffix}`;
}

export function getOutputDirectory(framework: string, requested?: unknown) {
  const defaultDirectory = framework === "next_static" ? "out" : "dist";
  const value = requested ?? defaultDirectory;
  if (
    typeof value !== "string" ||
    value === "." ||
    value === "./" ||
    !/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]{1,120}$/.test(value) ||
    value.includes("\\")
  )
    return null;
  return value;
}

export function getProjectDirectory(requested?: unknown) {
  if (requested === undefined) return ".";
  if (typeof requested !== "string") return null;
  const value = requested
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
  if (!value || value === ".") return ".";
  if (
    value.length > 180 ||
    !/^[a-zA-Z0-9._/-]+$/.test(value) ||
    value
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  )
    return null;
  return value;
}

export function getStaticFramework(value: unknown) {
  if (value === undefined || value === "vite") return "vite" as const;
  if (value === "next_static") return "next_static" as const;
  return null;
}

export function getBuildScript(value: unknown) {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{1,80}$/.test(value)
    ? value
    : null;
}

export function normalizeDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const displayName = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (
    displayName.length < 2 ||
    displayName.length > 32 ||
    !/^[\p{L}\p{N}][\p{L}\p{N} ._'’-]{1,31}$/u.test(displayName)
  )
    return null;
  return { displayName, displayNameKey: displayName.toLocaleLowerCase("en-US") };
}
