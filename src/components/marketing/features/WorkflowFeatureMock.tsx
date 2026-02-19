import { cn } from "@/lib/utils"

type StageState = "completed" | "current" | "pending"

interface WorkflowStage {
  number: number
  title: string
  state: StageState
  status?: string
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  { number: 1, title: "Gagasan Paper", state: "completed", status: "Selesai" },
  { number: 2, title: "Penentuan Topik", state: "completed", status: "Selesai" },
  { number: 3, title: "Menyusun Outline", state: "completed", status: "Selesai" },
  { number: 4, title: "Penyusunan Abstrak", state: "completed", status: "Selesai" },
  { number: 5, title: "Pendahuluan", state: "current", status: "Sedang berjalan" },
  { number: 6, title: "Tinjauan Literatur", state: "pending" },
  { number: 7, title: "Metodologi", state: "pending" },
  { number: 8, title: "Hasil Penelitian", state: "pending" },
  { number: 9, title: "Diskusi", state: "pending" },
  { number: 10, title: "Kesimpulan", state: "pending" },
  { number: 11, title: "Daftar Pustaka", state: "pending" },
  { number: 12, title: "Lampiran", state: "pending" },
  { number: 13, title: "Pemilihan Judul", state: "pending" },
]

const CHAT_PLACEHOLDER = [
  "Draf Pendahuluan:",
  "Makalah ini membahas pengembangan sistem peringatan dini berbasis data spasial...",
  "Daftar Sitasi APA (sementara):",
  "1. Wijaya (2023)",
  "2. Kementerian PUPR (n.d.)",
]

export function WorkflowFeatureMock() {
  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div
        className={cn(
          "overflow-hidden rounded-xl border",
          "bg-stone-900/95 border-stone-600/80",
          "shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.35)]",
          "dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.22)]"
        )}
      >
        <div className="flex h-11 items-center gap-3 border-b border-stone-600 bg-stone-700 px-4">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="rounded-none border border-stone-500 bg-stone-800 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.24em] text-stone-200">
            makalah.ai/workflow
          </div>
        </div>

        <div className="grid min-h-[510px] grid-cols-[52px_minmax(0,1fr)] md:grid-cols-[52px_290px_minmax(0,1fr)]">
          <aside className="flex flex-col items-center border-r border-stone-700 bg-stone-950/60 py-3">
            <div className="mb-6 mt-1 flex h-7 w-7 items-center justify-center rounded-md border border-stone-600 bg-stone-900 text-xs text-stone-200">
              <span className="font-mono">M</span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-2">
              <span className="h-9 w-9 rounded-md border border-stone-700 bg-stone-900/40" />
              <span className="h-9 w-9 rounded-md border border-stone-700 bg-stone-900/40" />
              <span className="h-9 w-9 rounded-md border border-stone-500 bg-stone-800/60" />
            </div>
          </aside>

          <div className="border-r border-stone-700 px-4 py-5 md:px-5">
            <div className="border-b border-stone-700/80 pb-4">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-amber-400">Progress</p>
              <p className="mt-1 font-mono text-[17px] text-stone-200">Paper Tanpa Judul</p>
              <div className="mt-3 h-3 rounded-full bg-stone-700">
                <div className="h-full w-[38%] rounded-full bg-emerald-400" />
              </div>
              <p className="mt-2 text-right font-mono text-[15px] tracking-wide text-stone-400">38% · Stage 5/13</p>
            </div>

            <div className="mt-4 space-y-1">
              {WORKFLOW_STAGES.map((stage, index) => {
                const isLast = index === WORKFLOW_STAGES.length - 1
                const pointClass =
                  stage.state === "completed"
                    ? "bg-emerald-400 border-emerald-400"
                    : stage.state === "current"
                      ? "bg-amber-500 border-amber-400 shadow-[0_0_0_2px_rgba(245,158,11,0.25)]"
                      : "bg-transparent border-stone-500"
                const titleClass =
                  stage.state === "completed"
                    ? "text-stone-100"
                    : stage.state === "current"
                      ? "text-amber-300"
                      : "text-stone-500"
                const statusClass =
                  stage.state === "completed"
                    ? "text-emerald-400"
                    : stage.state === "current"
                      ? "text-amber-400"
                      : "text-stone-500"

                return (
                  <div key={stage.title} className="relative flex gap-3">
                    <div className="flex w-4 flex-col items-center">
                      <span className={cn("z-[1] mt-1.5 h-3.5 w-3.5 rounded-full border-2", pointClass)} />
                      {!isLast && (
                        <span
                          className={cn(
                            "w-px flex-1 min-h-[18px]",
                            stage.state === "completed" ? "bg-emerald-500/70" : "bg-stone-700"
                          )}
                        />
                      )}
                    </div>

                    <div className="pb-2.5">
                      <p className={cn("font-mono text-[15px] tracking-wide", titleClass)}>
                        {stage.number}. {stage.title}
                      </p>
                      {stage.status && (
                        <p className={cn("font-mono text-[14px] font-semibold tracking-wide", statusClass)}>
                          {stage.status}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="hidden bg-stone-950/60 p-5 md:block">
            <div className="h-full rounded-lg border border-stone-800 bg-stone-950/70 p-4">
              <p className="mb-3 font-mono text-[17px] font-bold text-stone-100">Draft Pendahuluan</p>
              <div className="space-y-3">
                {CHAT_PLACEHOLDER.map((line) => (
                  <p key={line} className="font-mono text-[13px] leading-relaxed text-stone-300">
                    {line}
                  </p>
                ))}
              </div>
              <div className="mt-4 h-px bg-stone-800" />
              <div className="mt-4 rounded-md border border-stone-700 bg-stone-900/80 px-3 py-2 text-[13px] text-stone-500">
                Kirim percakapan...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
