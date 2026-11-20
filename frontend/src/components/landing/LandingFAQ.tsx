import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FadeUp, SectionLabel } from "./LandingHelpers";

const faqs = [
  {
    q: "What frontend frameworks does Pushmint support?",
    a: "Pushmint supports public GitHub repositories that have a Bun-compatible build script and produce static files. Vite-compatible apps and Next.js static exports are supported when configured to generate an output directory with an index.html.",
  },
  {
    q: "How does the wildcard subdomain routing work?",
    a: "Wildcard DNS sends preview subdomains to the backend. Its Express middleware matches the deployment hostname, and the static request handler reads that deployment’s files from Cloudflare R2.",
  },
  {
    q: "Where are build artifacts stored?",
    a: "Generated static artifacts are uploaded to Cloudflare R2. The backend request handler reads and serves the requested HTML, CSS, JavaScript, and asset files.",
  },
  {
    q: "Does Pushmint use a sandbox?",
    a: "Yes. Each deployment build runs in an isolated sandbox, keeping build processes separate while generating static files for hosting.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {faqs.map((faq, i) => {
        const isOpen = open === i;
        return (
          <FadeUp key={i} delay={i * 0.04}>
            <div
              style={{
                borderBottom: "1px solid var(--border)",
                cursor: "pointer",
              }}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "20px 0",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: "var(--text-primary)",
                  }}
                >
                  {faq.q}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    color: "var(--primary)",
                    fontSize: 20,
                    marginLeft: 16,
                    flexShrink: 0,
                    fontWeight: 300,
                  }}
                >
                  +
                </motion.span>
              </div>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--text-muted)",
                        lineHeight: 1.75,
                        paddingBottom: 20,
                      }}
                    >
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeUp>
        );
      })}
    </div>
  );
}

export default function LandingFAQ() {
  return (
    <section
      id="faq"
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
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <SectionLabel text="// FAQ" />
          <h2
            style={{
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              fontFamily: "var(--font-body)",
            }}
          >
            Questions, ideas, or bugs?
          </h2>
        </div>
      </FadeUp>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <FAQ />
      </div>
    </section>
  );
}
