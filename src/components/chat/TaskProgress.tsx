"use client"

import { useState } from "react"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { TaskItem } from "@/lib/paper/task-derivation"

interface TaskProgressProps {
  stageId: string
  stageLabel: string
  tasks: TaskItem[]
  completed: number
  total: number
  defaultOpen?: boolean
}

const STATUS_ICON: Record<string, string> = {
  complete: "✅",
  pending: "○",
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  gagasan: "Eksplorasi ide awal, analisis kelayakan, dan tentukan angle penelitian yang unik.",
  topik: "Definisikan judul, spesifikasi angle, dan identifikasi research gap.",
  outline: "Susun struktur paper lengkap dengan estimasi panjang tiap bagian.",
  abstrak: "Sintesis gagasan dan topik menjadi ringkasan penelitian dengan keywords.",
  pendahuluan: "Bangun latar belakang, rumusan masalah, dan tujuan penelitian.",
  tinjauan_literatur: "Susun kerangka teoretis, review literatur, dan analisis gap.",
  metodologi: "Tentukan desain penelitian, metode pengumpulan data, dan teknik analisis.",
  hasil: "Identifikasi temuan utama dan tentukan format penyajian data.",
  diskusi: "Interpretasi temuan, bandingkan dengan literatur, dan analisis implikasi.",
  kesimpulan: "Ringkas hasil, jawab rumusan masalah, dan susun saran.",
  pembaruan_abstrak: "Perbarui abstrak berdasarkan seluruh konten paper yang sudah ditulis.",
  daftar_pustaka: "Kompilasi seluruh referensi dari semua tahap dalam format APA.",
  lampiran: "Susun material pendukung (tabel, instrumen, data mentah).",
  judul: "Evaluasi opsi judul berdasarkan cakupan keyword dan pilih yang terbaik.",
}

export function TaskProgress({
  stageId,
  stageLabel,
  tasks,
  completed,
  total,
  defaultOpen = false,
}: TaskProgressProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (tasks.length === 0) return null

  const description = STAGE_DESCRIPTIONS[stageId] ?? ""

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-action border border-[color:var(--chat-border)]",
          "bg-[var(--chat-muted)]",
          "overflow-hidden"
        )}
      >
        {/* Header — always visible */}
        <div className="px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs">📋</span>
                <span className="text-xs font-mono font-semibold text-[var(--chat-foreground)]">
                  {stageLabel}
                </span>
                <span className="text-[10px] font-mono text-[var(--chat-muted-foreground)]">
                  {completed}/{total}
                </span>
              </div>
              {description && (
                <p className="text-[11px] font-sans text-[var(--chat-muted-foreground)] leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "shrink-0 h-6 w-6 rounded-full flex items-center justify-center",
                  "text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)]",
                  "hover:bg-[var(--chat-accent)] transition-colors"
                )}
              >
                <span className="text-[10px]">{open ? "▴" : "▾"}</span>
              </button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Content — collapsible key steps */}
        <CollapsibleContent>
          <div className="px-3 pb-2 pt-1 border-t border-[color:var(--chat-border)]">
            <div className="text-[10px] font-mono font-semibold text-[var(--chat-muted-foreground)] uppercase tracking-wider mb-1.5">
              Langkah
            </div>
            <div className="space-y-0.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-2 py-0.5 text-xs font-mono",
                    task.status === "complete" && "text-[var(--chat-muted-foreground)]",
                    task.status === "pending" && "text-[var(--chat-muted-foreground)] opacity-50"
                  )}
                >
                  <span className="w-4 text-center shrink-0">
                    {STATUS_ICON[task.status]}
                  </span>
                  <span>{task.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
