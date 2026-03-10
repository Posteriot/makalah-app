"use client"

import { WorkspaceManagerHeader } from "./WorkspaceManagerHeader"
import { WorkspaceManagerConversationPanel } from "./WorkspaceManagerConversationPanel"
import { WorkspaceManagerSidebar } from "./WorkspaceManagerSidebar"

export function WorkspaceManagerShell() {
  return (
    <div className="min-h-dvh bg-[var(--chat-background)] text-[var(--chat-foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <WorkspaceManagerHeader />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
          <WorkspaceManagerSidebar />
          <main className="min-w-0 rounded-shell border border-[color:var(--chat-border)] bg-[var(--chat-card)] p-5">
            <div className="flex flex-col gap-3 border-b border-[color:var(--chat-border)] pb-4">
              <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
                Modul aktif
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-[var(--chat-foreground)]">
                Percakapan
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-[var(--chat-muted-foreground)]">
                Daftar penuh percakapan, paginasi, selection halaman aktif, dan destructive
                actions aman sekarang dikelola langsung dari panel ini.
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] p-4">
                <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
                  Scope fase awal
                </p>
                <p className="mt-2 text-sm text-[var(--chat-foreground)]">
                  Percakapan dengan total count akurat, paginasi, dan destructive control.
                </p>
              </div>
              <div className="rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] p-4">
                <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
                  Paper
                </p>
                <p className="mt-2 text-sm text-[var(--chat-muted-foreground)]">Coming soon</p>
              </div>
              <div className="rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] p-4">
                <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
                  Lampiran + Knowledge Base
                </p>
                <p className="mt-2 text-sm text-[var(--chat-muted-foreground)]">Coming soon</p>
              </div>
            </div>
            <div className="mt-4">
              <WorkspaceManagerConversationPanel />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
