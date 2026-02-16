"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Xmark, WarningTriangle, InfoCircle, Check, AlignLeft, NavArrowDown, NavArrowRight } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"

const STAGE_LABELS: Record<string, string> = {
  gagasan: "Gagasan",
  topik: "Topik",
  outline: "Outline",
  abstrak: "Abstrak",
  pendahuluan: "Pendahuluan",
  tinjauan_literatur: "Tinjauan Literatur",
  metodologi: "Metodologi",
  hasil: "Hasil",
  diskusi: "Diskusi",
  kesimpulan: "Kesimpulan",
  daftar_pustaka: "Daftar Pustaka",
  lampiran: "Lampiran",
  judul: "Judul",
  completed: "Selesai",
}

interface SessionSuggestion {
  severity: "warning" | "info"
  message: string
}

function generateSessionSuggestions(data: {
  session: { isDirty?: boolean; digestCount: number; currentStage: string; stageStatus: string }
  stageDetails: Array<{ hasRingkasan: boolean; validatedAt: unknown; superseded: boolean; revisionCount: number }>
  rewindHistory: Array<unknown>
  invalidatedArtifacts: number
}): SessionSuggestion[] {
  const suggestions: SessionSuggestion[] = []

  if (data.session.isDirty) {
    suggestions.push({
      severity: "warning",
      message: "Session ini dirty — data stage belum sinkron dengan percakapan terakhir. User perlu minta AI menyimpan ulang sebelum approve.",
    })
  }

  if (data.session.digestCount === 0 && data.session.currentStage !== "gagasan") {
    suggestions.push({
      severity: "warning",
      message: "Belum ada memory digest. Kemungkinan user belum pernah approve stage apapun — progress mungkin stuck.",
    })
  }

  if (data.session.stageStatus === "revision") {
    suggestions.push({
      severity: "info",
      message: "Session dalam mode revision. User sedang memperbaiki tahap ini berdasarkan feedback.",
    })
  }

  const supersededStages = data.stageDetails.filter((s) => s.superseded)
  if (supersededStages.length > 0) {
    suggestions.push({
      severity: "info",
      message: `${supersededStages.length} stage sudah di-supersede oleh rewind. Data lama sudah difilter dari prompt AI.`,
    })
  }

  if (data.invalidatedArtifacts > 0) {
    suggestions.push({
      severity: "warning",
      message: `${data.invalidatedArtifacts} artifact invalidated menunggu update. Artifact lama masih ada tapi ditandai tidak valid.`,
    })
  }

  const highRevision = data.stageDetails.filter((s) => s.revisionCount >= 3)
  if (highRevision.length > 0) {
    suggestions.push({
      severity: "info",
      message: `${highRevision.length} stage sudah direvisi 3+ kali. User mungkin kesulitan di tahap tersebut.`,
    })
  }

  if (data.rewindHistory.length >= 2) {
    suggestions.push({
      severity: "info",
      message: `Session ini sudah di-rewind ${data.rewindHistory.length} kali. Kemungkinan user berubah arah atau menemui hambatan.`,
    })
  }

  return suggestions
}

function formatTimeFull(ts: number): string {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SessionDetailDialog({
  sessionId,
  onClose,
}: {
  sessionId: Id<"paperSessions">
  onClose: () => void
}) {
  const data = useQuery(api.aiOps.getSessionDrillDown, { sessionId })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-shell border border-border bg-background shadow-xl mx-4">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-3">
          <h3 className="text-sm font-bold tracking-tight">Session Detail</h3>
          <button
            onClick={onClose}
            className="rounded-action p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>

        {!data ? (
          <div className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Overview */}
            <Section title="Overview">
              <Row label="Title" value={data.session.paperTitle || data.session.workingTitle || "(Untitled)"} />
              <Row label="Current Stage" value={STAGE_LABELS[data.session.currentStage] || data.session.currentStage} />
              <Row label="Status" value={data.session.stageStatus} />
              <Row label="Dirty" value={data.session.isDirty ? "Ya" : "Tidak"} warn={data.session.isDirty} />
              <Row label="Created" value={formatTimeFull(data.session._creationTime)} />
              <Row label="Digest Entries" value={String(data.session.digestCount)} />
              <Row label="Artifacts" value={`${data.artifactCount} total, ${data.invalidatedArtifacts} invalidated`} />
            </Section>

            {/* Suggestions */}
            {(() => {
              const suggestions = generateSessionSuggestions(data)
              if (suggestions.length === 0) return null
              return (
                <Section title="Suggestions">
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 border-l-2 pl-3 py-1 ${
                          s.severity === "warning" ? "border-l-amber-500" : "border-l-sky-500"
                        }`}
                      >
                        {s.severity === "warning" ? (
                          <WarningTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                        ) : (
                          <InfoCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-sky-500" />
                        )}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {s.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </Section>
              )
            })()}

            {/* Memory Digest */}
            {data.session.digest.length > 0 && (
              <Section title="Memory Digest">
                <div className="space-y-1.5">
                  {data.session.digest.map((d, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2 text-xs ${d.superseded ? "opacity-40 line-through" : ""}`}
                    >
                      <span className="font-mono text-muted-foreground shrink-0 w-24">
                        {STAGE_LABELS[d.stage] || d.stage}
                      </span>
                      <span className="text-foreground">
                        {d.ringkasan || "(kosong)"}
                      </span>
                      {d.superseded && (
                        <span className="shrink-0 rounded-badge border border-rose-500/30 bg-rose-500/10 px-1 py-0.5 text-[8px] font-bold uppercase text-rose-500">
                          superseded
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Stage Details */}
            {data.stageDetails.length > 0 && (
              <Section title="Stage Data">
                <StageDataList stages={data.stageDetails} />
              </Section>
            )}

            {/* Rewind History */}
            {data.rewindHistory.length > 0 && (
              <Section title="Rewind History">
                <div className="space-y-2">
                  {data.rewindHistory.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">
                        {formatTimeFull(r._creationTime)}
                      </span>
                      <span className="text-foreground">
                        {STAGE_LABELS[r.fromStage] || r.fromStage}
                        {" → "}
                        {STAGE_LABELS[r.toStage] || r.toStage}
                      </span>
                      {r.invalidatedStages && r.invalidatedStages.length > 0 && (
                        <span className="text-[10px] text-rose-500 font-mono">
                          ({r.invalidatedStages.length} stage invalidated)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type StageDetail = {
  stageId: string
  hasRingkasan: boolean
  hasRingkasanDetail: boolean
  ringkasan: string | null
  ringkasanDetail: string | null
  validatedAt: number | null
  superseded: boolean
  revisionCount: number
}

function StageDataList({ stages }: { stages: StageDetail[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-0.5">
      {stages.map((s) => {
        const isOpen = expanded === s.stageId
        const hasContent = s.hasRingkasan || s.hasRingkasanDetail
        return (
          <div key={s.stageId}>
            <button
              type="button"
              onClick={() => hasContent && setExpanded(isOpen ? null : s.stageId)}
              className={`flex w-full items-center justify-between text-xs py-1.5 px-1 rounded-action transition-colors ${
                hasContent ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-2">
                {hasContent ? (
                  isOpen
                    ? <NavArrowDown className="size-3 text-muted-foreground" strokeWidth={2} />
                    : <NavArrowRight className="size-3 text-muted-foreground" strokeWidth={2} />
                ) : (
                  <span className="size-3" />
                )}
                <span className="font-mono text-muted-foreground w-24 shrink-0 text-left">
                  {STAGE_LABELS[s.stageId] || s.stageId}
                </span>
                {s.validatedAt && (
                  <span className="rounded-badge border border-emerald-500/30 bg-emerald-500/10 px-1 py-0.5 text-[8px] font-bold uppercase text-emerald-600">
                    validated
                  </span>
                )}
                {s.superseded && (
                  <span className="rounded-badge border border-rose-500/30 bg-rose-500/10 px-1 py-0.5 text-[8px] font-bold uppercase text-rose-500">
                    superseded
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {s.hasRingkasan ? (
                  <span className="inline-flex items-center gap-1 rounded-badge border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-sky-600">
                    <Check className="size-2.5" strokeWidth={2.5} />
                    ringkasan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-badge border border-muted/50 bg-muted/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    ringkasan
                  </span>
                )}
                {s.hasRingkasanDetail ? (
                  <span className="inline-flex items-center gap-1 rounded-badge border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-600">
                    <AlignLeft className="size-2.5" strokeWidth={2.5} />
                    detail
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-badge border border-muted/50 bg-muted/20 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    detail
                  </span>
                )}
                {s.revisionCount > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {s.revisionCount} rev
                  </span>
                )}
              </div>
            </button>
            {isOpen && (
              <div className="ml-5 mb-2 space-y-2 border-l-2 border-border pl-3 py-2">
                {s.ringkasan && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Ringkasan</span>
                    <p className="text-xs text-foreground mt-0.5 font-mono leading-relaxed">{s.ringkasan}</p>
                  </div>
                )}
                {s.ringkasanDetail && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Detail</span>
                    <p className="text-xs text-foreground mt-0.5 font-mono leading-relaxed">{s.ringkasanDetail}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </h4>
      <div className="rounded-action border border-border p-3">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${warn ? "text-amber-500 font-bold" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}
