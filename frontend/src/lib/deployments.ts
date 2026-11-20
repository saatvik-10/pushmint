import axios from "axios";

export type DeploymentStatus = "queued" | "building" | "deployed" | "failed";
export type StaticFramework = "vite" | "next_static";

export interface Deployment {
  id: string;
  displayName: string | null;
  repoUrl: string;
  framework: StaticFramework;
  buildScript: string;
  outputDirectory: string;
  projectDirectory: string;
  status: DeploymentStatus;
  siteUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

const apiBaseUrl =
  import.meta.env.VITE_BACKEND_UPLOAD_URL ?? "http://localhost:3000";

export const deploymentApi = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
});

export const DISPLAY_NAME_STORAGE_KEY = "pushmint.displayName";

export function getDisplayName() {
  return window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY)?.trim() ?? "";
}

export function saveDisplayName(displayName: string) {
  const normalized = displayName.normalize("NFKC").trim().replace(/\s+/g, " ");
  window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, normalized);
  return normalized;
}

export async function listDeployments() {
  const response = await deploymentApi.get<{ deployments: Deployment[] }>(
    "/deployments",
  );
  return response.data.deployments;
}

export async function getDeployment(id: string) {
  const response = await deploymentApi.get<{
    deployment: Deployment & { logs: { message: string }[] };
  }>(`/deployments/${id}`);
  return response.data.deployment;
}

export function formatDeploymentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
