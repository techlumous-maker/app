import type { ReactNode } from "react"

import "./globals.css"

/**
 * Minimal shell. Templates are fully self-contained (inline styles, no shared
 * CSS), so the layout only provides the document scaffolding plus a tiny reset.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
