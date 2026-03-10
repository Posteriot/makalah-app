"use client"

import Link from "next/link"
import { ArrowLeft } from "iconoir-react"

export function WorkspaceManagerHeader() {
  return (
    <header className="rounded-shell border border-[color:var(--chat-border)] bg-[var(--chat-card)] px-5 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
            Workspace governance
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--chat-foreground)]">
            Workspace Manager
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--chat-muted-foreground)]">
            Area manajemen penuh untuk percakapan workspace chat yang dipisahkan
            dari sidebar 50 riwayat terbaru.
          </p>
        </div>
        <Link
          href="/chat"
          className="inline-flex h-9 items-center gap-2 rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-3 text-sm font-medium text-[var(--chat-foreground)] transition-colors hover:bg-[var(--chat-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke chat
        </Link>
      </div>
    </header>
  )
}
