import React, { useState } from "react";
import { motion } from "motion/react";
import { useReveal, FadeUp, SectionLabel } from "./LandingHelpers";

// Feature cards use the Pushmint deployment panel treatment.
export function FeatureCard({ icon, title, desc, delay = 0 }: any) {
  const [hover, setHover] = useState(false);
  const [ref, inView] = useReveal();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 14,
        border: `1px solid ${hover ? "var(--border-hover)" : "var(--border-card)"}`,
        background: "var(--bg-card)",
        padding: 6,
        backdropFilter: "blur(4px)",
        transition: "border-color 0.25s ease",
        cursor: "default",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          borderRadius: 8,
          border: "1px solid var(--border-card)",
          background: hover ? "var(--bg-card-hover)" : "var(--bg-card-inner)",
          padding: "20px",
          transition: "background 0.25s ease",
          height: "100%",
        }}
      >
        <span
          style={{
            color: hover ? "var(--text-secondary)" : "var(--text-muted)",
            transition: "color 0.25s",
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          {icon}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.65,
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            {desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingFeatures() {
  const features = [
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: 20, height: 20 }}
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M9 22h6" />
          <circle cx="12" cy="18.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      ),
      title: "One-Click GitHub Deployments",
      desc: "Paste a GitHub repo URL and Pushmint handles the build, uploads the static artifacts, and gives the site a live URL.",
      delay: 0,
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: 20, height: 20 }}
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      title: "Automated Build Pipeline",
      desc: "Pushmint uses Bun to install dependencies and run the selected build script, producing static assets.",
      delay: 0.06,
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: 20, height: 20 }}
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      ),
      title: "Unique Subdomain per Deploy",
      desc: "Every deployment gets its own subdomain under the preview domain configured for Pushmint.",
      delay: 0.12,
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: 20, height: 20 }}
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 12l10 5 10-5" />
          <path d="M2 17l10 5 10-5" />
        </svg>
      ),
      title: "Postgres Deployment Queue",
      desc: "Deployments are stored in Postgres and picked up asynchronously by the worker in the backend service.",
      delay: 0.18,
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: 20, height: 20 }}
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" strokeDasharray="2 2" />
          <line x1="10" y1="6" x2="10" y2="18" strokeDasharray="2 2" />
        </svg>
      ),
      title: "Cloudflare R2 Storage",
      desc: "Generated static artifacts are stored in Cloudflare R2. Source repositories are cloned and built inside E2B.",
      delay: 0.24,
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: 20, height: 20 }}
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="4" y="4" width="12" height="12" rx="2" />
          <rect
            x="8"
            y="8"
            width="12"
            height="12"
            rx="2"
            opacity="0.4"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      ),
      title: "Isolated E2B Builds",
      desc: "Each deployment builds in a disposable E2B sandbox. The current backend worker processes one build at a time.",
      delay: 0.3,
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: 20, height: 20 }}
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
          <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
        </svg>
      ),
      title: "Single Render Backend",
      desc: "The API, deployment worker, and static request handler run together in one Docker service on Render.",
      delay: 0.36,
    },
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          style={{ width: 20, height: 20 }}
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="2" y="5" width="10" height="14" rx="2" />
          <rect x="14" y="7" width="8" height="10" rx="2" opacity="0.6" />
        </svg>
      ),
      title: "Live Status Polling",
      desc: "The dashboard polls deployment status and build logs while a job moves from queued to deployed or failed.",
      delay: 0.48,
    },
  ];

  return (
    <section
      id="features"
      style={{
        position: "relative",
        padding: "clamp(48px, 6vw, 96px) clamp(20px, 4vw, 48px)",
      }}
    >
      <FadeUp>
        <div
          style={{
            marginBottom: 48,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <SectionLabel text="// Features" />
          <h2
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              fontFamily: "var(--font-body)",
            }}
          >
            Everything you need to ship.
            <br />
            <span
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              Nothing you don't.
            </span>
          </h2>
        </div>
      </FadeUp>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
          gap: 12,
        }}
      >
        {features.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  );
}
