"use client"

import { useState } from "react"
import { WarningTriangle, Copy, Check } from "iconoir-react"

interface DroppedKeyEntry {
  stage: string
  keyName: string
  count: number
  lastSeen: number
  resolved: number
}

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
}

function generatePromotePrompt(stage: string, keyName: string): string {
  return `Promote key "${keyName}" ke schema stage "${stage}". Tambahkan sebagai field v.optional(v.string()) di convex/schema.ts (dalam object stageData.${stage}) dan tambahkan "${keyName}" ke STAGE_KEY_WHITELIST["${stage}"] di convex/paperSessions.ts.`
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function DroppedKeysPanel({
  data,
}: {
  data: DroppedKeyEntry[] | undefined
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card/90 p-5 dark:bg-slate-900/90 mt-4 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <WarningTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Dropped Keys — Schema Promotion Candidates
        </span>
      </div>

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-10 rounded-[8px] bg-muted animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground font-mono">
          Belum ada key yang di-drop. Panel ini akan terisi otomatis saat AI mengirim key di luar schema.
        </p>
      ) : (
        <>
          <p className="text-[10px] text-muted-foreground mb-3 font-mono">
            Key yang dikirim AI tapi tidak ada di schema. Frekuensi tinggi = kandidat promote.
          </p>
          <div className="space-y-2">
            {data.map((entry) => (
              <DroppedKeyRow key={`${entry.stage}::${entry.keyName}`} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function DroppedKeyRow({ entry }: { entry: DroppedKeyEntry }) {
  const [copied, setCopied] = useState(false)
  const prompt = generatePromotePrompt(entry.stage, entry.keyName)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-border px-3 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-mono font-bold text-foreground truncate">
            {entry.keyName}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {STAGE_LABELS[entry.stage] || entry.stage}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span className="text-xs font-mono font-bold text-amber-500">
            {entry.count}×
          </span>
          <span className="text-[10px] text-muted-foreground font-mono block">
            {timeAgo(entry.lastSeen)}
          </span>
        </div>

        <button
          onClick={handleCopy}
          title="Copy promote prompt"
          className="flex items-center gap-1 rounded-[6px] border border-border px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Promote</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
