"use client"

import { cn } from "@/lib/utils"

/**
 * HeroResearchMock - Unified Dark Mockup (Manifesto Compliant)
 * Theme: Permanent Dark (Stone-800)
 * Shadow: Sharp Diagonal Bottom-Left (-12px 12px)
 *   - Dark APP: Stone-400/20% shadow
 *   - Light APP: Stone-700/30% shadow
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
        "hidden md:block absolute w-full transition-all duration-300",
        // Unified Dark Theme (Stone-800)
        "bg-stone-800 border-stone-700",
        "border-[1px] rounded-md", // Shell: rounded-md
        // Sharp Shadow - Diagonal Bottom-Left
        "dark:shadow-[-12px_12px_0px_0px_rgba(168,162,158,0.2)]", // Stone-400 transp
        "shadow-[-12px_12px_0px_0px_rgba(68,64,60,0.3)]",          // Stone-700 transp
        // layer-back positioning
        "z-10 top-1/2 -translate-y-1/2 scale-[0.88] -translate-x-[60px]"
      )}
    >
      {/* Browser Header */}
      <div className={cn(
        "flex items-center gap-4 p-3 rounded-t-md border-b-[0.5px] border-stone-700 bg-stone-900"
      )}>
        {/* Traffic lights - Colored sequence */}
        <div className="flex gap-1.5 px-1">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        {/* URL bar - Terminal style (Stone-500 BG) */}
        <div className={cn(
          "font-mono text-[9px] font-medium px-3 py-1 rounded-none border-[0.5px] tracking-widest transition-colors",
          "bg-stone-500 text-stone-100 border-stone-600"
        )}>
          makalah.ai/workflow
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Progress Header */}
        <div className="mb-6">
          <div className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-amber-500 mb-2">
            Progress
          </div>
          <div className={cn(
            "font-mono text-base font-normal tracking-wider truncate mb-4 text-stone-100"
          )}>
            Dampak AI pada Pendidikan Tinggi
          </div>

          {/* Progress Bar - Mechanical Style (SHARP) */}
          <div className={cn(
            "h-1.5 border-[0.5px] border-stone-700 bg-stone-900 rounded-none overflow-hidden"
          )}>
            <div
              className="h-full bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${MOCK_PROGRESS.percent}%` }}
            />
          </div>
          <div className={cn(
            "font-mono text-sm text-right mt-2 uppercase tracking-[0.25em] text-stone-400"
          )}>
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
                  : null

            return (
              <div key={stage.name} className="flex gap-4 relative">
                {/* Dot & Line Column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full border-[1px] flex-shrink-0 z-[1] transition-colors duration-300", // Milestone: rounded-full (Dot)
                      stage.state === "completed" && "bg-emerald-500 border-emerald-400",
                      stage.state === "current" && "bg-amber-500 border-amber-400",
                      stage.state === "pending" && "bg-transparent border-stone-700"
                    )}
                  />
                  {!isLast && (
                    <div
                      className={cn(
                        "w-px flex-1 min-h-[32px] transition-colors", // Weight: 1px (w-px)
                        stage.state === "completed"
                          ? "bg-emerald-500/40"
                          : "bg-stone-700"
                      )}
                    />
                  )}
                </div>

                {/* Label Column */}
                <div className={cn("pb-6 w-full", isLast && "pb-0")}>
                  <div
                    className={cn(
                      "font-mono text-sm tracking-wider transition-colors", // Enlarge to sm
                      stage.state === "current" && "text-stone-50 font-medium",
                      stage.state === "pending" && "text-stone-500",
                      stage.state === "completed" && "text-stone-400"
                    )}
                  >
                    {index + 1}. {stage.name}
                  </div>
                  {statusText && (
                    <div
                      className={cn(
                        "font-mono text-sm font-bold mt-1 uppercase tracking-[0.2em] transition-colors", // Enlarge to sm
                        stage.state === "completed" && "text-emerald-500/60",
                        stage.state === "current" && "text-amber-500"
                      )}
                    >
                      {statusText}
                    </div>
                  )}
                  {/* Dashed Separator */}
                  {!isLast && (
                    <div className={cn(
                      "absolute left-6 right-0 bottom-0 border-b-[0.5px] border-dashed border-stone-700/30"
                    )} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* More stages indicator */}
        <div className={cn(
          "font-mono text-sm font-bold text-center pt-4 pb-2 mt-2 uppercase tracking-[0.3em] text-stone-500" // Enlarge to sm
        )}>
          +7 tahap lagi
        </div>
      </div>
    </div>
  )
}
