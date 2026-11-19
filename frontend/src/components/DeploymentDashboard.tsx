import { useCallback, useEffect, useState } from "react";
import { ExternalLink, LoaderCircle, RefreshCw, Terminal } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import LandingNav from "./landing/LandingNav";
import {
  formatDeploymentDate,
  getDisplayName,
  getDeployment,
  listDeployments,
  type Deployment,
} from "../lib/deployments";
import "./landing/landingmain.css";

const statusColors: Record<Deployment["status"], string> = {
  queued: "#929BAA",
  building: "#1558C9",
  deployed: "#D4FF24",
  failed: "#f87171",
};

export default function DeploymentDashboard() {
  const [displayName] = useState(() => getDisplayName());
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");
      setDeployments(await listDeployments(displayName));
    } catch {
      setError(
        "Could not load deployments. Check that the Pushmint API is running.",
      );
    } finally {
      setLoading(false);
    }
  }, [displayName]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 8000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const toggleLogs = async (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedLogs([]);
      return;
    }
    setSelectedId(id);
    try {
      const deployment = await getDeployment(id);
      setSelectedLogs(deployment.logs.map((log) => log.message));
    } catch {
      setSelectedLogs(["Unable to load build logs."]);
    }
  };

  if (!displayName) return <Navigate to="/login" replace state={{ from: "/deployments" }} />;

  return (
    <main
      className="landingmain-container pushmint-dashboard"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-primary)",
      }}
    >
      <LandingNav />
      <section
        style={{
          width: "min(1080px, calc(100% - 32px))",
          margin: "0 auto",
          padding: "64px 0 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div>
            <p
              style={{
                color: "var(--primary)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            >
              // Deployment history
            </p>
            <h1
              style={{
                margin: "8px 0",
                fontFamily: "var(--font-body)",
                fontSize: "clamp(28px, 5vw, 42px)",
                fontWeight: 500,
              }}
            >
              {displayName}’s deployments
            </h1>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              Build status, preview links, and recent output.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Refresh deployments"
              style={secondaryButton}
            >
              <RefreshCw size={15} /> Refresh
            </button>
            <Link to="/deploy" style={primaryButton}>
              New deployment
            </Link>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: "#f87171",
              padding: 16,
              border: "1px solid #f8717133",
              borderRadius: 10,
            }}
          >
            {error}
          </p>
        )}
        {loading ? (
          <div style={emptyState}>
            <LoaderCircle size={18} className="deployment-spin" /> Loading
            deployments...
          </div>
        ) : deployments.length === 0 ? (
          <div style={emptyState}>
            <p>No deployments yet.</p>
            <Link to="/deploy" style={{ color: "var(--primary)" }}>
              Deploy a static site
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {deployments.map((deployment) => (
              <article key={deployment.id} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          color: statusColors[deployment.status],
                          fontSize: 13,
                        }}
                      >
                        ● {deployment.status}
                      </span>
                      <span style={tagStyle}>by {deployment.displayName ?? displayName}</span>
                      <span style={tagStyle}>
                        {deployment.framework === "next_static"
                          ? "Next.js static"
                          : "Vite / static"}
                      </span>
                      <code
                        style={{ color: "var(--text-faint)", fontSize: 11 }}
                      >
                        {deployment.id}
                      </code>
                    </div>
                    <a
                      href={deployment.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={repoStyle}
                    >
                      {deployment.repoUrl}
                    </a>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 12,
                        margin: "8px 0 0",
                      }}
                    >
                      {formatDeploymentDate(deployment.createdAt)} · bun run{" "}
                      {deployment.buildScript} · {deployment.outputDirectory}/
                    </p>
                    {deployment.errorMessage && (
                      <p
                        style={{
                          color: "#f87171",
                          fontSize: 13,
                          marginBottom: 0,
                        }}
                      >
                        {deployment.errorMessage}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {deployment.siteUrl && deployment.status === "deployed" && (
                      <a
                        href={deployment.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={secondaryButton}
                      >
                        Open site <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleLogs(deployment.id)}
                      style={secondaryButton}
                    >
                      <Terminal size={14} />{" "}
                      {selectedId === deployment.id
                        ? "Hide logs"
                        : "Build logs"}
                    </button>
                  </div>
                </div>
                {selectedId === deployment.id && (
                  <pre style={logStyle}>
                    {selectedLogs.length
                      ? selectedLogs.join("\n")
                      : "Waiting for build output..."}
                  </pre>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const cardStyle = {
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  borderRadius: 14,
  padding: 20,
} as const;
const tagStyle = {
  border: "1px solid var(--border)",
  borderRadius: 20,
  padding: "3px 8px",
  color: "var(--text-muted)",
  fontSize: 11,
} as const;
const repoStyle = {
  display: "block",
  color: "var(--text-primary)",
  marginTop: 12,
  overflowWrap: "anywhere",
  fontSize: 14,
} as const;
const emptyState = {
  minHeight: 180,
  border: "1px dashed var(--border)",
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  color: "var(--text-muted)",
} as const;
const secondaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  padding: "9px 12px",
  color: "var(--text-secondary)",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 8,
  font: "inherit",
  fontSize: 12,
  textDecoration: "none",
  cursor: "pointer",
} as const;
const primaryButton = {
  ...secondaryButton,
  color: "#030407",
  background: "var(--primary)",
  borderColor: "var(--primary)",
  fontWeight: 600,
} as const;
const logStyle = {
  margin: "18px 0 0",
  padding: 16,
  maxHeight: 320,
  overflow: "auto",
  borderRadius: 10,
  background: "#0B0F16",
  color: "#D4FF24",
  font: "12px/1.7 var(--font-mono)",
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
} as const;
