"use client"

import { type ElementType } from "react"
import { Id } from "../../../convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import {
  Page,
  Code,
  List,
  Table2Columns,
  Book,
  Calculator,
  MagicWand,
} from "iconoir-react"
import { cn } from "@/lib/utils"

type ArtifactType = "code" | "outline" | "section" | "table" | "citation" | "formula" | "refrasa"

interface Artifact {
  _id: Id<"artifacts">
  title: string
  type: ArtifactType
  version: number
  createdAt: number
  invalidatedAt?: number
  sourceArtifactId?: Id<"artifacts">
}

interface ArtifactListProps {
  artifacts: Artifact[]
  selectedId: Id<"artifacts"> | null
  onSelect: (id: Id<"artifacts">) => void
  /**
   * Keep latest-only as default to avoid stale version context
   * when used as alternative artifact entry point.
   */
  showLatestOnly?: boolean
}

const typeIcons: Record<ArtifactType, ElementType> = {
  code: Code,
  outline: List,
  section: Page,
  table: Table2Columns,
  citation: Book,
  formula: Calculator,
  refrasa: MagicWand,
}

const typeLabels: Record<ArtifactType, string> = {
  code: "CODE",
  outline: "OUTLINE",
  section: "SEKSI",
  table: "TABEL",
  citation: "SITASI",
  formula: "FORMULA",
  refrasa: "REFRASA",
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  })
}

function getLatestArtifactVersions(artifacts: Artifact[]): Artifact[] {
  const latestMap = new Map<string, Artifact>()

  for (const artifact of artifacts) {
    const key = `${artifact.type}-${artifact.title}`
    const existing = latestMap.get(key)
    if (!existing || artifact.version > existing.version) {
      latestMap.set(key, artifact)
    }
  }

  const latest = Array.from(latestMap.values())

  const parents = latest.filter((a) => a.type !== "refrasa")
  const refrasas = latest.filter((a) => a.type === "refrasa")

  parents.sort((a, b) => a.createdAt - b.createdAt)

  const result: Artifact[] = []
  for (const parent of parents) {
    result.push(parent)
    const children = refrasas.filter((r) => r.sourceArtifactId === parent._id)
    children.sort((a, b) => a.createdAt - b.createdAt)
    result.push(...children)
  }

  const placedIds = new Set(result.map((a) => a._id))
  for (const r of refrasas) {
    if (!placedIds.has(r._id)) result.push(r)
  }

  return result
}

export function ArtifactList({
  artifacts,
  selectedId,
  onSelect,
  showLatestOnly = true,
}: ArtifactListProps) {
  const items = showLatestOnly ? getLatestArtifactVersions(artifacts) : artifacts

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/50 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-wide text-muted-foreground">
            Daftar Artifak
          </p>
          <span className="rounded-badge border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {items.length}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-mono text-muted-foreground/85">
          {showLatestOnly ? "Mode latest-only aktif" : "Semua versi ditampilkan"}
        </p>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <Page className="mb-2 h-8 w-8 opacity-50" />
            <span className="text-xs font-mono uppercase">Belum ada artifak</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((artifact) => {
              const TypeIcon = typeIcons[artifact.type]
              const isSelected = selectedId === artifact._id
              const isFinal = !artifact.invalidatedAt

              return (
                <button
                  key={artifact._id}
                  type="button"
                  onClick={() => onSelect(artifact._id)}
                  className={cn(
                    "w-full rounded-action border p-2 text-left transition-colors",
                    "border-border/55 hover:border-border hover:bg-accent/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1",
                    isSelected && "border-primary/40 bg-primary/10"
                  )}
                  aria-label={`Pilih artifak ${artifact.title} versi ${artifact.version}`}
                  aria-current={isSelected ? "page" : undefined}
                >
                  <div className="flex items-start gap-2">
                    <TypeIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {artifact.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="rounded-badge border border-border/60 bg-muted/70 px-1 py-0 text-[10px] font-mono"
                        >
                          v{artifact.version}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-badge border-border/60 px-1 py-0 text-[10px] font-mono"
                        >
                          {typeLabels[artifact.type]}
                        </Badge>
                        {isFinal ? (
                          <Badge className="rounded-badge border border-emerald-500/35 bg-emerald-500/15 px-1 py-0 text-[10px] font-mono uppercase text-emerald-700 dark:text-emerald-300">
                            Final
                          </Badge>
                        ) : (
                          <Badge className="rounded-badge border border-amber-500/35 bg-amber-500/15 px-1 py-0 text-[10px] font-mono uppercase text-amber-700 dark:text-amber-300">
                            Revisi
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                        Dibuat {formatDate(artifact.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
