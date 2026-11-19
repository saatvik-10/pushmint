import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { deploymentApi, getDisplayName, saveDisplayName, type StaticFramework } from "../lib/deployments";
import { TurnstileWidget } from "./TurnstileWidget";
import "./landing/landingmain.css";
import LandingNav from "./landing/LandingNav";
import {
  RailLine,
  RailContainer,
  FadeUp,
  SectionLabel,
  CornerBracket,
} from "./landing/LandingHelpers";

export function Landing() {
  const [displayName, setDisplayName] = useState(() => getDisplayName());
  const [repoUrl, setRepoUrl] = useState("");
  const [framework, setFramework] = useState<StaticFramework>("vite");
  const [buildScript, setBuildScript] = useState("build");
  const [outputDirectory, setOutputDirectory] = useState("dist");
  const [uploadId, setUploadId] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [deployError, setDeployError] = useState("");
  const [turnstileError, setTurnstileError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";
  const handleTurnstileToken = useCallback(
    (token: string) => setTurnstileToken(token),
    [],
  );
  const handleTurnstileError = useCallback(() => {
    setTurnstileError(
      "Anti-bot verification could not load. Please refresh and try again.",
    );
  }, []);
  const intervalRef = useRef<any>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("landing-main-active");

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=IBM+Plex+Mono:wght@300;400;500;600&family=Sora:wght@300;400;500;600&display=swap";
    document.head.appendChild(fontLink);

    return () => {
      document.body.classList.remove("landing-main-active");
      document.head.removeChild(fontLink);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleDeploy = async () => {
    if (!repoUrl.trim()) return;
    setUploading(true);
    setDeployed(false);
    setUploadId("");
    setSiteUrl("");
    setLogs([]);
    setStatus("");
    setDeployError("");
    const requestToastId = toast.loading("Submitting deployment...");

    try {
      const res = await deploymentApi.post("/deploy", {
        repoUrl: repoUrl,
        displayName,
        framework,
        buildScript,
        outputDirectory,
        turnstileToken,
      });
      toast.success("Deployment queued. Build is starting.", { id: requestToastId });
      const id = res.data.id;
      setUploadId(id);
      setSiteUrl(res.data.siteUrl ?? "");

      const interval = setInterval(async () => {
        try {
          const response = await deploymentApi.get(`/status?id=${id}`);
          const currentStatus = response.data.status;
          setStatus(currentStatus);
          if (response.data.siteUrl) setSiteUrl(response.data.siteUrl);

          try {
            const logsResponse = await deploymentApi.get(`/logs?id=${id}`);
            if (logsResponse.data && logsResponse.data.logs) {
              setLogs(logsResponse.data.logs);
            }
          } catch (logErr) {
            console.error("Error checking logs:", logErr);
          }

          if (currentStatus === "deployed") {
            toast.success("Deployment is live.", { id: `deployment-${id}-done` });
            clearInterval(interval);
            setDeployed(true);
            setUploading(false);
          } else if (currentStatus === "failed") {
            toast.error("Build failed. Check the deployment logs for details.", { id: `deployment-${id}-failed` });
            clearInterval(interval);
            setUploading(false);
          }
        } catch (err) {
          console.error("Error checking status:", err);
        }
      }, 3000);
      intervalRef.current = interval;
    } catch (err) {
      console.error("Deployment request failed:", err);
      const apiMessage =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { error?: unknown } } }).response
              ?.data?.error
          : undefined;
      const message =
        typeof apiMessage === "string"
          ? apiMessage
          : err instanceof Error
            ? err.message
            : "Could not start deployment.";
      toast.error(message, { id: requestToastId });
      setDeployError(message);
      setUploading(false);
    } finally {
      setTurnstileToken("");
      setTurnstileReset((current) => current + 1);
    }
  };

  return (
    <div
      className="landingmain-container pushmint-deploy-page"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(21, 88, 201, 0.38) 0.62px, transparent 0)",
        backgroundSize: "25px 25px",
        backgroundRepeat: "repeat",
      }}
    >
      <LandingNav />

      <div
        style={{
          opacity: 0.72,
          filter: "blur(14px)",
          transform: "translateY(18px)",
        }}
      >
        <RailLine />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(24px, 6vw, 60px) clamp(12px, 3vw, 20px)",
        }}
      >
        <RailContainer
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            padding: "40px 0",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "min(480px, 100%)",
              margin: "0 auto",
              position: "relative",
              zIndex: 1,
            }}
          >
            <FadeUp>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <SectionLabel text="// Pipeline" />
                <h1
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(22px, 5vw, 28px)",
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: "var(--text-primary)",
                  }}
                >
                  Deploy repository
                </h1>
                <Link
                  to="/deployments"
                  style={{
                    color: "var(--primary)",
                    fontSize: 12,
                    textDecoration: "none",
                  }}
                >
                  View deployment history →
                </Link>
              </div>

              {/* Deployment Card */}
              <div
                style={{
                  position: "relative",
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  padding: 8,
                  backdropFilter: "blur(12px)",
                }}
              >
                <CornerBracket style={{ top: -6, left: -6 }} rotate={0} />
                <CornerBracket style={{ top: -6, right: -6 }} rotate={90} />
                <CornerBracket style={{ bottom: -6, left: -6 }} rotate={-90} />
                <CornerBracket style={{ bottom: -6, right: -6 }} rotate={180} />

                <div
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--border-card)",
                    background: "var(--bg-card-inner)",
                    padding: "clamp(16px, 4vw, 28px) clamp(14px, 3vw, 24px)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label htmlFor="deployment-display-name" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                        Your display name
                      </label>
                      <input
                        id="deployment-display-name"
                        type="text"
                        value={displayName}
                        onChange={(event) => {
                          setDisplayName(event.target.value);
                          saveDisplayName(event.target.value);
                        }}
                        disabled={uploading || (uploadId !== "" && status !== "failed")}
                        minLength={2}
                        maxLength={32}
                        autoComplete="nickname"
                        placeholder="How should we label your deployments?"
                        style={{ ...fieldStyle, width: "100%" }}
                      />
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        Used to group your deployments and apply your name-based build limit. This is a public display name, not a verified account.
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <label
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--text-secondary)",
                        }}
                      >
                        GitHub Repository URL
                      </label>
                      <input
                        type="url"
                        onChange={(e) => setRepoUrl(e.target.value)}
                        value={repoUrl}
                        disabled={
                          uploading || (uploadId !== "" && status !== "failed")
                        }
                        placeholder="https://github.com/username/repo"
                        style={{
                          background: "rgba(0, 0, 0, 0.4)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "12px 14px",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 13,
                          outline: "none",
                          transition: "border-color 0.2s, box-shadow 0.2s",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor =
                            "var(--primary-dim)";
                          e.currentTarget.style.boxShadow =
                            "0 0 12px var(--primary-glow)";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                      />
                      <span
                        style={{ color: "var(--text-muted)", fontSize: 11 }}
                      >
                        Any public GitHub repo · up to 3 builds per hour and 10 per day per name and IP
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <label
                          htmlFor="static-framework"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Static framework
                        </label>
                        <select
                          id="static-framework"
                          value={framework}
                          disabled={uploading}
                          onChange={(event) => {
                            const nextFramework = event.target
                              .value as StaticFramework;
                            setFramework(nextFramework);
                            setOutputDirectory(
                              nextFramework === "next_static" ? "out" : "dist",
                            );
                          }}
                          style={fieldStyle}
                        >
                          <option value="vite">Vite / compatible</option>
                          <option value="next_static">
                            Next.js static export
                          </option>
                        </select>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <label
                          htmlFor="build-script"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Bun script
                        </label>
                        <input
                          id="build-script"
                          value={buildScript}
                          onChange={(event) =>
                            setBuildScript(event.target.value)
                          }
                          disabled={uploading}
                          style={fieldStyle}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <label
                          htmlFor="output-directory"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Output directory
                        </label>
                        <input
                          id="output-directory"
                          value={outputDirectory}
                          onChange={(event) =>
                            setOutputDirectory(event.target.value)
                          }
                          disabled={uploading}
                          style={fieldStyle}
                        />
                      </div>
                    </div>

                    {framework === "next_static" && (
                      <p
                        style={{
                          margin: 0,
                          color: "var(--text-muted)",
                          fontSize: 12,
                        }}
                      >
                        Configure <code>output: &quot;export&quot;</code> in
                        next.config and use a static-compatible app.
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <TurnstileWidget
                        key={turnstileReset}
                        siteKey={turnstileSiteKey}
                        onToken={handleTurnstileToken}
                        onError={handleTurnstileError}
                      />
                      {!turnstileSiteKey && (
                        <p
                          role="alert"
                          style={{ margin: 0, color: "#f87171", fontSize: 12 }}
                        >
                          Public deploys need the frontend Turnstile site key
                          configured.
                        </p>
                      )}
                      {turnstileError && (
                        <p
                          role="alert"
                          style={{ margin: 0, color: "#f87171", fontSize: 12 }}
                        >
                          {turnstileError}
                        </p>
                      )}
                    </div>
                    {deployError && (
                      <p
                        role="alert"
                        style={{ margin: 0, color: "#f87171", fontSize: 12 }}
                      >
                        {deployError}
                      </p>
                    )}

                    <motion.button
                      whileHover={
                        uploading || (uploadId !== "" && status !== "failed")
                          ? {}
                          : { scale: 1.02 }
                      }
                      whileTap={
                        uploading || (uploadId !== "" && status !== "failed")
                          ? {}
                          : { scale: 0.98 }
                      }
                      onClick={handleDeploy}
                      disabled={
                        uploading ||
                        (uploadId !== "" && status !== "failed") ||
                        !repoUrl.trim() ||
                        displayName.trim().length < 2 ||
                        !turnstileToken ||
                        !turnstileSiteKey
                      }
                      style={{
                        background:
                          uploading ||
                          (uploadId !== "" && status !== "failed") ||
                          !repoUrl.trim() ||
                          displayName.trim().length < 2 ||
                          !turnstileToken ||
                          !turnstileSiteKey
                            ? "rgba(255,255,255,0.04)"
                            : "var(--primary)",
                        color:
                          uploading ||
                          (uploadId !== "" && status !== "failed") ||
                          !repoUrl.trim() ||
                          displayName.trim().length < 2 ||
                          !turnstileToken ||
                          !turnstileSiteKey
                            ? "var(--text-muted)"
                            : "#000",
                        border: "none",
                        borderRadius: 8,
                        padding: "14px",
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "var(--font-body)",
                        cursor:
                          uploading ||
                          (uploadId !== "" && status !== "failed") ||
                          !repoUrl.trim() ||
                          displayName.trim().length < 2 ||
                          !turnstileToken ||
                          !turnstileSiteKey
                            ? "not-allowed"
                            : "pointer",
                        transition: "background 0.2s, color 0.2s",
                      }}
                    >
                      {uploading
                        ? "Queueing build..."
                        : uploadId && status === "failed"
                          ? "Deployment Failed (Try Again)"
                          : uploadId && !deployed
                            ? "Deploying app..."
                            : deployed
                              ? "Deployed"
                              : "Deploy Now"}
                    </motion.button>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Console output while building */}
            <AnimatePresence>
              {(uploading || uploadId !== "") && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.5 }}
                  style={{ marginTop: 24 }}
                >
                  <div
                    style={{
                      position: "relative",
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      background: "var(--bg-card)",
                      padding: 6,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 10,
                        border: "1px solid var(--border-card)",
                        background: "var(--bg-card-inner)",
                        overflow: "hidden",
                      }}
                    >
                      {/* Terminal header */}
                      <div
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          background: "rgba(255,255,255,0.015)",
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--primary-dim)",
                            }}
                          />
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--text-faint)",
                            }}
                          />
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.08)",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            letterSpacing: "0.15em",
                            color: "var(--text-faint)",
                            textTransform: "uppercase",
                          }}
                        >
                          status log
                        </span>
                      </div>

                      {/* Terminal lines */}
                      <div
                        style={{
                          padding: 16,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          maxHeight: "280px",
                          overflowY: "auto",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "clamp(10px, 2.5vw, 12px)",
                            color: "var(--text-secondary)",
                            wordBreak: "break-all",
                          }}
                        >
                          $ pushmint deploy --repo {repoUrl}
                        </p>
                        {uploading && (
                          <p
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "clamp(10px, 2.5vw, 12px)",
                              color: "var(--primary-dim)",
                            }}
                          >
                            ✦ Verifying request and queueing isolated build...
                          </p>
                        )}
                        {uploadId && (
                          <p
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "clamp(10px, 2.5vw, 12px)",
                              color: "var(--primary-dim)",
                            }}
                          >
                            ✦ Deployment queued. Build ID:{" "}
                            <span style={{ color: "var(--primary)" }}>
                              {uploadId}
                            </span>
                          </p>
                        )}

                        {logs.map((log, index) => {
                          let color = "var(--text-secondary)";
                          if (
                            log.includes("✖") ||
                            log.toLowerCase().includes("failed") ||
                            log.toLowerCase().includes("err")
                          ) {
                            color = "#f87171"; // soft red
                          } else if (
                            log.includes("✓") ||
                            log.toLowerCase().includes("successfully") ||
                            log.toLowerCase().includes("live")
                          ) {
                            color = "var(--green)";
                          } else if (log.includes("✦")) {
                            color = "var(--primary-dim)";
                          }
                          return (
                            <p
                              key={index}
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "clamp(10px, 2.5vw, 12px)",
                                color,
                                wordBreak: "break-all",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {log}
                            </p>
                          );
                        })}

                        {uploadId &&
                          !deployed &&
                          status !== "failed" &&
                          logs.length === 0 && (
                            <p
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "clamp(10px, 2.5vw, 12px)",
                                color: "#1558C9",
                              }}
                            >
                              ✦{" "}
                              {status === "queued"
                                ? "Queued for a static build..."
                                : "Build worker is starting..."}
                            </p>
                          )}
                        {deployed && (
                          <>
                            <p
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "clamp(10px, 2.5vw, 12px)",
                                color: "var(--green)",
                              }}
                            >
                              ✓ Build finished. Your static preview is live.
                            </p>
                            <p
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "clamp(10px, 2.5vw, 12px)",
                                color: "var(--green)",
                              }}
                            >
                              ↗ URL: {siteUrl}
                            </p>
                          </>
                        )}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Card */}
            <AnimatePresence>
              {deployed && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.5 }}
                  style={{ marginTop: 24 }}
                >
                  <div
                    style={{
                      position: "relative",
                      borderRadius: 20,
                      border: "1px solid var(--primary-dim)",
                      background: "rgba(21,88,201,0.035)",
                      padding: 8,
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <CornerBracket style={{ top: -6, left: -6 }} rotate={0} />
                    <CornerBracket style={{ top: -6, right: -6 }} rotate={90} />
                    <CornerBracket
                      style={{ bottom: -6, left: -6 }}
                      rotate={-90}
                    />
                    <CornerBracket
                      style={{ bottom: -6, right: -6 }}
                      rotate={180}
                    />

                    <div
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(21,88,201,0.32)",
                        background: "var(--bg-card-inner)",
                        padding: "24px",
                      }}
                    >
                      <h2
                        style={{
                          fontSize: 18,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          marginBottom: 8,
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        Deployment Success
                      </h2>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-muted)",
                          marginBottom: 20,
                        }}
                      >
                        Your website has been deployed successfully to the
                        cloud.
                      </p>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <label
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              color: "var(--text-muted)",
                            }}
                          >
                            Deployment URL
                          </label>
                          <input
                            readOnly
                            type="url"
                            value={siteUrl}
                            onClick={(e) => e.currentTarget.select()}
                            style={{
                              background: "rgba(0, 0, 0, 0.4)",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              padding: "10px",
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-mono)",
                              fontSize: "clamp(10px, 2.5vw, 12px)",
                              outline: "none",
                              cursor: "pointer",
                              width: "100%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          />
                        </div>

                        <motion.a
                          href={siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            display: "block",
                            textAlign: "center",
                            background: "var(--primary)",
                            color: "#000",
                            border: "none",
                            borderRadius: 8,
                            padding: "12px",
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "var(--font-body)",
                            textDecoration: "none",
                            transition: "background 0.2s",
                          }}
                        >
                          Visit Preview Website →
                        </motion.a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </RailContainer>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  background: "rgba(0, 0, 0, 0.4)",
  font: "12px var(--font-mono)",
  outline: "none",
};
