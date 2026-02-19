import Image from "next/image"
import { ChatBubble, Page, GitBranch, FastArrowLeft } from "iconoir-react"
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

export function WorkflowFeatureMock() {
  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      <div
        className={cn(
          "aspect-[1/1.12] overflow-hidden rounded-xl border",
          "border-stone-400/70 bg-stone-200/90 dark:border-stone-600/80 dark:bg-stone-900/95",
          "shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.18)]",
          "dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.22)]"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-11 items-center gap-3 border-b border-stone-500/60 bg-stone-500/90 px-4 dark:border-stone-600 dark:bg-stone-700">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div className="rounded-none border border-stone-500/80 bg-stone-800 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.24em] text-stone-200">
              makalah.ai/workflow
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[48px_minmax(0,1fr)]">
            <aside
              className={cn(
                "flex flex-col items-center gap-0 py-0",
                "border-r border-slate-400/20 bg-slate-300 dark:border-slate-700/90 dark:bg-slate-900"
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-full items-center justify-center rounded-none border-b",
                  "border-slate-400/40 dark:border-slate-700/80"
                )}
              >
                <Image
                  src="/logo/makalah_logo_light.svg"
                  alt="Makalah"
                  width={18}
                  height={18}
                  className="hidden dark:block"
                />
                <Image
                  src="/logo/makalah_logo_dark.svg"
                  alt="Makalah"
                  width={18}
                  height={18}
                  className="block dark:hidden"
                />
              </div>

              <div className="mt-3 flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-action border border-transparent",
                    "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <ChatBubble className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-action border border-transparent",
                    "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <Page className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-action border",
                    "border-slate-400/50 bg-slate-200 text-slate-800",
                    "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  )}
                >
                  <GitBranch className="h-5 w-5" />
                </span>
              </div>
            </aside>

            <div className="flex min-h-0 flex-col border-r border-slate-300/50 bg-slate-200 dark:border-slate-700/80 dark:bg-slate-800">
              <div className="flex h-11 items-center justify-end border-b border-slate-300/90 px-3 dark:border-slate-700/80">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-action text-muted-foreground",
                    "bg-foreground/0 hover:bg-foreground/5"
                  )}
                >
                  <FastArrowLeft className="h-4 w-4" />
                </span>
              </div>

              <div className="border-b border-border/50 px-4 py-3">
                <div className="mb-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  Progress
                </div>
                <div className="mb-3 truncate text-xs font-mono text-muted-foreground">Paper Tanpa Judul</div>
                <div className="space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-400/80 ring-1 ring-slate-500/40 dark:bg-slate-700/80 dark:ring-slate-600/80">
                    <div className="h-full w-[38%] rounded-full bg-emerald-600 dark:bg-emerald-400" />
                  </div>
                  <div className="text-right text-xs font-mono text-muted-foreground">38% · Stage 5/13</div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
                <div className="space-y-0">
                  {WORKFLOW_STAGES.map((stage, index) => {
                    const isLast = index === WORKFLOW_STAGES.length - 1
                    const pointClass =
                      stage.state === "completed"
                        ? "bg-emerald-500 border-emerald-500 dark:bg-emerald-400 dark:border-emerald-400"
                        : stage.state === "current"
                          ? "bg-amber-500 border-amber-500 ring-2 ring-amber-500/35 ring-offset-1 ring-offset-slate-200 dark:bg-amber-400 dark:border-amber-400 dark:ring-amber-400/40 dark:ring-offset-slate-800"
                          : "bg-transparent border-muted-foreground/50"
                    const titleClass =
                      stage.state === "completed"
                        ? "text-slate-700 dark:text-slate-200"
                        : stage.state === "current"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-muted-foreground"
                    const statusClass =
                      stage.state === "completed"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : stage.state === "current"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-muted-foreground"
                    const hasStatus = Boolean(stage.status)
                    const lineClass =
                      stage.state === "completed"
                        ? "bg-gradient-to-b from-emerald-500 via-emerald-500/90 to-amber-400 dark:from-emerald-400 dark:via-emerald-400/90 dark:to-amber-400"
                        : stage.state === "current"
                          ? "bg-gradient-to-b from-amber-400/70 to-border dark:from-amber-400/50 dark:to-border"
                          : "bg-border"

                    return (
                      <div key={stage.title} className="relative flex h-10 gap-3.5">
                        <div className="flex w-3 flex-col items-center">
                          <span className={cn("z-[1] mt-[2px] h-3 w-3 rounded-full border-2", pointClass)} />
                          {!isLast && (
                            <span className={cn("mt-[2px] w-0.5 flex-1", lineClass)} />
                          )}
                        </div>

                        <div className="pt-[1px]">
                          <p className={cn("text-[13px] font-mono font-medium leading-snug", titleClass)}>
                            {stage.number}. {stage.title}
                          </p>
                          <p
                            className={cn(
                              "text-[12px] font-mono leading-snug",
                              hasStatus ? statusClass : "opacity-0 select-none"
                            )}
                          >
                            {stage.status ?? "\u00a0"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
