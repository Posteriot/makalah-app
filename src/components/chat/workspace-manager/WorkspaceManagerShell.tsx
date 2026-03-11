"use client"

import Link from "next/link"
import { WorkspaceManagerConversationPanel } from "./WorkspaceManagerConversationPanel"

export function WorkspaceManagerShell() {
  return (
    <div className="min-h-dvh bg-[var(--chat-background)] text-[var(--chat-foreground)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--chat-muted-foreground)] transition-colors hover:text-[var(--chat-foreground)]"
          >
            ← Kembali ke chat
          </Link>
        </div>
        <main className="rounded-shell border border-[color:var(--chat-border)] bg-[var(--chat-card)] p-5">
          <section className="flex flex-col gap-4">
            <div className="border-b border-[color:var(--chat-border)] pb-4">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--chat-foreground)]">
                Kelola Percakapan
              </h1>
            </div>
            <WorkspaceManagerConversationPanel />
          </section>
        </main>
      </div>
    </div>
  )
}
