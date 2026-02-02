"use client"

import { cn } from "@/lib/utils"

/**
 * HeroResearchMock - Paper Progress Preview with Neo-Brutalist styling
 * Back layer mockup showing paper writing progress timeline
 */

type StageState = "completed" | "current" | "pending"

interface MockStage {
  name: string
  state: StageState
}

const MOCK_STAGES: MockStage[] = [
  { name: "Gagasan Paper", state: "completed" },
  { name: "Penentuan Topik", state: "completed" },
  { name: "Menyusun Outline", state: "completed" },
  { name: "Penyusunan Abstrak", state: "completed" },
  { name: "Pendahuluan", state: "current" },
  { name: "Tinjauan Literatur", state: "pending" },
]

const MOCK_PROGRESS = { percent: 38, current: 5, total: 13 }

export function HeroResearchMock() {
  return (
    <div
      className={cn(
        "hidden md:block absolute w-full font-mono",
        "bg-neo-card border-[4px] border-neo-border rounded-lg",
        "shadow-[var(--spacing-neo-shadow-x)_var(--spacing-neo-shadow-y)_0_var(--neo-shadow)]",
        "backdrop-blur-sm",
        // layer-back positioning
        "z-10 -top-10 scale-[0.88] -translate-x-[60px]"
      )}
    >
      {/* Browser Header */}
      <div className="flex items-center gap-4 p-3 rounded-t bg-neo-border border-b-[3px] border-neo-shadow">
        {/* Traffic lights */}
        <div className="flex gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#ff5f56] border-[3px] border-neo-shadow" />
          <span className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e] border-[3px] border-neo-shadow" />
          <span className="w-3.5 h-3.5 rounded-full bg-[#27c93f] border-[3px] border-neo-shadow" />
        </div>
        {/* URL bar */}
        <div className="font-mono text-xs font-semibold text-neo-text bg-white/90 dark:bg-zinc-800 px-3.5 py-1.5 rounded border-[3px] border-neo-shadow">
          makalah.ai/paper
        </div>
      </div>

      {/* Content */}
      <div className="p-5 font-mono text-neo-text">
        {/* Progress Header */}
        <div className="mb-4">
          <div className="text-sm font-bold mb-1 text-neo-text">Progress</div>
          <div className="text-xs truncate mb-3 text-neo-text-muted">
            Dampak AI pada Pendidikan Tinggi
          </div>

          {/* Progress Bar */}
          <div className="h-3 bg-neo-muted border-[3px] border-neo-border overflow-hidden">
            <div
              className="h-full bg-success transition-all duration-300"
              style={{ width: `${MOCK_PROGRESS.percent}%` }}
            />
          </div>
          <div className="text-[10px] text-right mt-1 text-neo-text">
            {MOCK_PROGRESS.percent}% &middot; Stage {MOCK_PROGRESS.current}/{MOCK_PROGRESS.total}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-0 font-mono">
          {MOCK_STAGES.map((stage, index) => {
            const isLast = index === MOCK_STAGES.length - 1
            const statusText =
              stage.state === "completed"
                ? "DONE"
                : stage.state === "current"
                  ? "IN PROGRESS"
                  : undefined

            return (
              <div key={stage.name} className="flex gap-3 relative">
                {/* Dot & Line Column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded-full border-[3px] border-neo-border flex-shrink-0 z-[1]",
                      stage.state === "completed" && "bg-success",
                      stage.state === "current" && "bg-primary ring-4 ring-primary/30",
                      stage.state === "pending" && "bg-transparent"
                    )}
                  />
                  {!isLast && (
                    <div
                      className={cn(
                        "w-[3px] flex-1 min-h-5",
                        stage.state === "completed" ? "bg-success" : "bg-neo-border"
                      )}
                    />
                  )}
                </div>

                {/* Label Column */}
                <div className={cn("pb-4", isLast && "pb-0")}>
                  <div
                    className={cn(
                      "font-mono text-xs font-semibold",
                      stage.state === "current" && "text-primary font-bold",
                      stage.state === "pending" && "text-neo-text-muted",
                      stage.state === "completed" && "text-neo-text"
                    )}
                  >
                    {index + 1}. {stage.name}
                  </div>
                  {statusText && (
                    <div
                      className={cn(
                        "font-mono text-[10px] font-medium mt-0.5 uppercase tracking-wide",
                        stage.state === "completed" && "text-success",
                        stage.state === "current" && "text-primary"
                      )}
                    >
                      {statusText}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* More stages indicator */}
        <div className="font-mono text-[11px] font-semibold text-neo-text-muted text-center pt-2.5 pb-1 border-t-[3px] border-dashed border-neo-border mt-3">
          +7 tahap lagi
        </div>
      </div>
    </div>
  )
}
