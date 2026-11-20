import React from "react";

export default function LandingFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "40px clamp(16px, 4vw, 48px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 20,
        maxWidth: "76rem",
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#1558C9" />
          <path d="M8 10.5 14 16l-6 5.5M17 22h7" stroke="#D4FF24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          Pushmint
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-faint)",
            marginLeft: 16,
          }}
        >
        </span>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {[
          // {
          //   label: "GitHub",
          //   href: "https://github.com/saatvik-10/pushmint",
          // },
          // {
          //   label: "Docs",
          //   href: "https://github.com/saatvik-10/pushmint#readme",
          // },
          // { label: "Architecture", href: "#architecture" },
          { label: "Contact", href: "https://itsaatvik.dev" },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={
              item.href.startsWith("http") ? "noopener noreferrer" : undefined
            }
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "color 0.2s",
              textDecoration: "none",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            {item.label}
          </a>
        ))}
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-faint)",
        }}
      >
        2026 © All rights reserved.
      </span>
    </footer>
  );
}
