"use client"

import type { Id } from "@convex/_generated/dataModel"

type ContentManagerProps = {
  userId: Id<"users">
}

export function ContentManager({ userId }: ContentManagerProps) {
  return (
    <div className="rounded-shell border-main border border-border bg-card/60">
      <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
        <h3 className="text-interface mb-2 text-base font-medium text-foreground">
          Content Manager
        </h3>
        <p className="text-narrative mb-4 max-w-md text-sm text-muted-foreground">
          Kelola konten halaman marketing, gambar, dan pengaturan navigasi situs.
        </p>
        <span className="text-signal rounded-badge border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-500">
          IN DEVELOPMENT
        </span>
      </div>
    </div>
  )
}
