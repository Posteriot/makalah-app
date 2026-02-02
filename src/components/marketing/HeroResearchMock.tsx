"use client"

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
    <div className="hero-mockup layer-back hidden md:block neo-card">
      {/* Browser Header */}
      <div className="neo-header">
        <div className="neo-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="neo-url">makalah.ai/paper</div>
      </div>

      {/* Content */}
      <div className="neo-content">
        {/* Progress Header */}
        <div className="mb-4">
          <div className="text-sm font-semibold mb-1">Progress</div>
          <div className="text-xs text-muted-foreground truncate mb-3">
            Dampak AI pada Pendidikan Tinggi
          </div>

          {/* Progress Bar */}
          <div className="neo-progress-bar">
            <div
              className="neo-progress-fill"
              style={{ width: `${MOCK_PROGRESS.percent}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground text-right mt-1">
            {MOCK_PROGRESS.percent}% &middot; Stage {MOCK_PROGRESS.current}/{MOCK_PROGRESS.total}
          </div>
        </div>

        {/* Timeline */}
        <div className="neo-timeline">
          {MOCK_STAGES.map((stage, index) => {
            const isLast = index === MOCK_STAGES.length - 1
            const statusText =
              stage.state === "completed"
                ? "Completed"
                : stage.state === "current"
                  ? "In Progress"
                  : undefined

            return (
              <div key={stage.name} className="neo-timeline-item">
                {/* Dot & Line Column */}
                <div className="neo-dot-col">
                  <div className={`neo-dot ${stage.state}`} />
                  {!isLast && (
                    <div
                      className={`neo-line ${stage.state === "completed" ? "completed" : ""}`}
                    />
                  )}
                </div>

                {/* Label Column */}
                <div className="neo-label-col">
                  <div className={`neo-label ${stage.state}`}>
                    {index + 1}. {stage.name}
                  </div>
                  {statusText && (
                    <div className={`neo-status ${stage.state}`}>
                      {statusText}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* More stages indicator */}
        <div className="neo-more-stages">+7 tahap lagi</div>
      </div>
    </div>
  )
}
