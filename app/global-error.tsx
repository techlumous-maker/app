"use client"

import { ErrorState } from "@/components/error-state"

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <ErrorState
          code="500"
          message="An unexpected error occurred. Please return home and try again."
          actionHref="/"
          actionLabel="Back to home"
        />
      </body>
    </html>
  )
}
