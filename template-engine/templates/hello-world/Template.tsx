import type { HelloWorldContent } from "./schema"

export function Template({ content }: { content: HelloWorldContent }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 50% 30%, #1e293b, #020617)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(2.5rem, 8vw, 5rem)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#f8fafc",
          margin: 0,
        }}
      >
        {content.message}
      </h1>
    </main>
  )
}
