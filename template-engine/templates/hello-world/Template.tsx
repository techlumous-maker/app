import type { HelloWorldContent } from "./schema"

export function Template({ content }: { content: HelloWorldContent }) {
  const dark = content.theme === "dark"
  const bg = dark
    ? "radial-gradient(circle at 50% 30%, #1e293b, #020617)"
    : "radial-gradient(circle at 50% 30%, #f8fafc, #cbd5e1)"
  const fg = dark ? "#f8fafc" : "#0f172a"
  const muted = dark ? "#94a3b8" : "#475569"

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "3rem 1.5rem",
        background: bg,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: fg,
          margin: 0,
          textAlign: "center",
        }}
      >
        {content.landingPage.message}
      </h1>

      <p
        style={{
          fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
          color: muted,
          maxWidth: "36rem",
          textAlign: "center",
          margin: 0,
        }}
      >
        {content.landingPage.tagline}
      </p>

      <a
        href={content.ctaUrl}
        style={{
          display: "inline-block",
          padding: "0.75rem 1.5rem",
          borderRadius: "0.5rem",
          background: fg,
          color: bg.includes("#020617") ? "#020617" : "#f8fafc",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        {content.ctaLabel}
      </a>

      {content.links.length > 0 && (
        <nav style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
          {content.links.map((link, i) => (
            <a
              key={i}
              href={link.href}
              style={{
                color: muted,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </main>
  )
}
