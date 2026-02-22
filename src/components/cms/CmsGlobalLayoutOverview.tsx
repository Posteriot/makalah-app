"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { GlobalLayoutPageId } from "./CmsSidebar"
import { NavArrowRight } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"

const LAYOUT_ITEMS: Array<{ id: GlobalLayoutPageId; label: string; configKey: string }> = [
  { id: "header", label: "Header", configKey: "header" },
  { id: "footer", label: "Footer", configKey: "footer" },
]

type CmsGlobalLayoutOverviewProps = {
  userId: Id<"users">
  onPageClick: (pageId: GlobalLayoutPageId) => void
}

export function CmsGlobalLayoutOverview({
  userId,
  onPageClick,
}: CmsGlobalLayoutOverviewProps) {
  const allConfigs = useQuery(api.siteConfig.listAllConfigs, {
    requestorId: userId,
  })

  // Loading
  if (allConfigs === undefined) {
    return (
      <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
        <Skeleton className="mb-6 h-7 w-40" />
        <Skeleton className="mb-4 h-4 w-48" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-12 w-full" />
        ))}
      </div>
    )
  }

  const configMap = new Map(allConfigs.map((c) => [c.key, c]))

  const rows = LAYOUT_ITEMS.map((def) => {
    const record = configMap.get(def.configKey)
    return {
      ...def,
      hasRecord: !!record,
    }
  })

  const configuredCount = rows.filter((r) => r.hasRecord).length

  return (
    <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
      {/* Page title */}
      <h2 className="text-narrative text-xl font-medium tracking-tight text-foreground">
        Global Layout
      </h2>
      <div className="mt-2 border-t border-border" />

      {/* Summary */}
      <p className="mt-4 text-interface text-xs text-muted-foreground">
        {rows.length} komponen{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span className="text-emerald-600">{configuredCount} configured</span>{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span>{rows.length - configuredCount} default</span>
      </p>

      {/* Component list */}
      <div className="mt-4 overflow-hidden rounded-action border border-border">
        {rows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onPageClick(row.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            {/* Status dot */}
            <span
              className={`h-2 w-2 min-w-2 rounded-full ${
                row.hasRecord
                  ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/40"
                  : "bg-slate-400 dark:bg-slate-600"
              }`}
            />

            {/* Component name */}
            <span className="text-interface flex-1 text-sm font-medium text-foreground">
              {row.label}
            </span>

            {/* Status badge */}
            <span
              className={`text-signal text-[10px] font-bold uppercase tracking-widest ${
                row.hasRecord
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              {row.hasRecord ? "Configured" : "Default"}
            </span>

            {/* Arrow */}
            <NavArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* Info box */}
      <div className="mt-4 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Header dan Footer tampil di semua halaman marketing. Komponen yang belum pernah
          disimpan di CMS akan menggunakan konfigurasi default bawaan (nav links, logo, copyright).
        </p>
      </div>

      {/* Info: scope */}
      <div className="mt-2 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Perubahan pada Header atau Footer berlaku secara global di seluruh halaman marketing
          (Home, About, Pricing, Blog, Docs, Legal).
        </p>
      </div>
    </div>
  )
}
