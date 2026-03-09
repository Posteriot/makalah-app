"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="max-w-md text-center space-y-4 p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Terjadi kesalahan sistem
          </h2>
          <p className="text-sm font-mono text-muted-foreground">
            {error.digest && (
              <span className="block text-xs mb-2">
                Kode: {error.digest}
              </span>
            )}
            Silakan coba muat ulang halaman.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-action bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  )
}
