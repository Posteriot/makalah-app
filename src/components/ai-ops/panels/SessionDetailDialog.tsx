"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Xmark } from "iconoir-react"
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
                <div className="space-y-1">
                  {data.stageDetails.map((s) => (
                    <div key={s.stageId} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground w-24 shrink-0">
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
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                        <span>{s.hasRingkasan ? "ringkasan" : ""}</span>
                        <span>{s.hasRingkasanDetail ? "detail" : ""}</span>
                        {s.revisionCount > 0 && (
                          <span>{s.revisionCount} revision</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                      {r.invalidatedStages.length > 0 && (
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
