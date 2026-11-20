import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useReveal, CornerBracket } from "./LandingHelpers";

// ─── Terminal mock ────────────────────────────────────────────────────────────
export function Terminal() {
  const lines = [
    {
      text: "$ pushmint deploy --repo github.com/user/app",
      color: "var(--text-muted)",
    },
    { text: "  ✦ Validating public GitHub repo...", color: "var(--primary)" },
    { text: "  ✦ Adding job to deployment queue...", color: "var(--primary)" },
    { text: "  ✦ Queuing build job [id: cmwpcr4nh00012v731jc89zlf]", color: "#D4FF24" },
    { text: "  ✦ Starting isolated E2B sandbox", color: "#D4FF24" },
    { text: "  ✦ Running bun install... done", color: "#1558C9" },
    { text: "  ✦ Running bun run build... done", color: "#1558C9" },
    { text: "  ✦ Uploading static output to R2... done", color: "#1558C9" },
    { text: "  ↗ https://cmwpcr4nh00012v731jc89zlf.pushmint.itsaatvik.dev", color: "var(--green)" },
  ];

  const [visibleLines, setVisibleLines] = useState<typeof lines>([]);
  const started = useRef(false);
  const [ref, inView] = useReveal(0.3);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    lines.forEach((line, i) => {
      setTimeout(
        () => {
          setVisibleLines((prev) => [...prev, line]);
        },
        i * 320 + 200,
      );
    });
  }, [inView]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Outer frame with corner brackets */}
      <div
        style={{
          position: "relative",
          borderRadius: 11,
          border: "1px solid var(--border)",
          background: "rgba(0, 0, 0, 0.17)",
          padding: 8,
          backdropFilter: "blur(40px)",
        }}
      >
        <CornerBracket style={{ top: -6, left: -6 }} rotate={0} />
        <CornerBracket style={{ top: -6, right: -6 }} rotate={90} />
        <CornerBracket style={{ bottom: -6, left: -6 }} rotate={-90} />
        <CornerBracket style={{ bottom: -6, right: -6 }} rotate={180} />

        {/* Inner frame */}
        <div
          style={{
            borderRadius: 8,
            border: "1px solid var(--border-card)",
            overflow: "hidden",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
          }}
        >
          {/* Title bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.015)",
              padding: "10px 16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--primary-dim)",
                }}
              />
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "var(--text-faint)",
                }}
              />
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.15em",
                color: "var(--text-faint)",
                textTransform: "uppercase",
              }}
            >
              pushmint
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-faint)",
              }}
            >
              ⌘ K
            </span>
          </div>

          {/* Terminal content */}
          <div
            style={{
              padding:
                "clamp(12px, 3vw, 20px) clamp(12px, 3vw, 20px) clamp(16px, 3vw, 28px)",
              minHeight: "clamp(180px, 30vw, 260px)",
            }}
          >
            {/* Grid background overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                backgroundImage:
                  "linear-gradient(to right, rgba(21,88,201,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(21,88,201,0.035) 1px, transparent 1px)",
                backgroundSize: "42px 42px",
              }}
            />
            {visibleLines.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(10px, 2vw, 12.5px)",
                  color: line.color,
                  lineHeight: 2.1,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {line.text}
              </motion.p>
            ))}
            {visibleLines.length < lines.length && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(10px, 2vw, 12.5px)",
                  color: "var(--text-muted)",
                  animation: "blink 1s infinite",
                }}
              >
                ▌
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingHero() {
  return (
    <section className="pushmint-hero">
      <div className="pushmint-hero-copy">
        <motion.div
          className="pushmint-hero-eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="pushmint-live-dot" />
          STATIC DEPLOYMENTS, WITHOUT THE RUNAROUND
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          From GitHub repo
          <br />
          <span>to live link.</span>
        </motion.h1>
        <motion.p
          className="pushmint-hero-description"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
        >
          Pushmint builds static frontend projects in an isolated sandbox,
          stores the output, and gives every deployment its own shareable URL.
        </motion.p>
        <motion.div
          className="pushmint-hero-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
        >
          <Link to="/deploy" className="pushmint-button pushmint-button-primary">
            Deploy a repository <span aria-hidden="true">↗</span>
          </Link>
          {/* <a
            href="https://github.com/saatvik-10/pushmint"
            target="_blank"
            rel="noopener noreferrer"
            className="pushmint-button pushmint-button-quiet"
          >
            Explore the project
          </a> */}
        </motion.div>
        <div className="pushmint-hero-facts" aria-label="Build platform details">
          <span><b>01</b> Isolated builds</span>
          <span><b>02</b> Static output</span>
          <span><b>03</b> Unique preview URLs</span>
        </div>
      </div>
      <motion.aside
        className="pushmint-hero-console"
        initial={{ opacity: 0, y: 18, rotate: 1 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.65, delay: 0.2 }}
      >
        <div className="pushmint-console-heading">
          <div>
            <span className="pushmint-console-kicker">BUILD SESSION / DEMO</span>
            <strong>Deploy pipeline</strong>
          </div>
          <span className="pushmint-console-state"><i /> READY</span>
        </div>
        <Terminal />
        <div className="pushmint-console-foot">
          <span>Sandboxed build</span><span>→</span><span>Static artifacts</span><span>→</span><span>Live preview</span>
        </div>
      </motion.aside>
    </section>
  );
}
