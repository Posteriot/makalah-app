export type CuratedTraceStepKey =
  | "intent-analysis"
  | "paper-context-check"
  | "search-decision"
  | "source-validation"
  | "response-compose"
  | "tool-action"

export type CuratedTraceStepStatus =
  | "pending"
  | "running"
  | "done"
  | "skipped"
  | "error"

export interface CuratedTraceMeta {
  mode?: "normal" | "paper" | "websearch"
  stage?: string
  note?: string
  sourceCount?: number
  toolName?: string
}

export interface CuratedTraceStepData {
  traceId: string
  stepKey: CuratedTraceStepKey
  label: string
  status: CuratedTraceStepStatus
  progress: number
  ts: number
  meta?: CuratedTraceMeta
}

export interface CuratedTraceDataPart {
  type: "data-reasoning-trace"
  id: string
  data: CuratedTraceStepData
}

interface InternalStep {
  id: string
  key: CuratedTraceStepKey
  label: string
  status: CuratedTraceStepStatus
  progress: number
  meta?: CuratedTraceMeta
}

export interface CuratedTraceController {
  enabled: boolean
  initialEvents: CuratedTraceDataPart[]
  markToolRunning: (toolName?: string) => CuratedTraceDataPart[]
  markToolDone: (toolName?: string) => CuratedTraceDataPart[]
  markSourceDetected: () => CuratedTraceDataPart[]
  finalize: (options: {
    outcome: "done" | "error" | "stopped"
    sourceCount: number
    errorNote?: string
  }) => CuratedTraceDataPart[]
}

const STEP_ORDER: CuratedTraceStepKey[] = [
  "intent-analysis",
  "paper-context-check",
  "search-decision",
  "source-validation",
  "response-compose",
  "tool-action",
]

const STEP_LABELS: Record<CuratedTraceStepKey, string> = {
  "intent-analysis": "Memahami intent user",
  "paper-context-check": "Cek konteks paper",
  "search-decision": "Keputusan web search",
  "source-validation": "Validasi sumber",
  "response-compose": "Menyusun jawaban",
  "tool-action": "Eksekusi tool",
}

function nowTs() {
  return Date.now()
}

function buildEvent(traceId: string, step: InternalStep): CuratedTraceDataPart {
  return {
    type: "data-reasoning-trace",
    id: step.id,
    data: {
      traceId,
      stepKey: step.key,
      label: step.label,
      status: step.status,
      progress: step.progress,
      ts: nowTs(),
      ...(step.meta ? { meta: step.meta } : {}),
    },
  }
}

function createSteps(options: {
  traceId: string
  mode: "normal" | "paper" | "websearch"
  stage?: string
  webSearchEnabled: boolean
}): Record<CuratedTraceStepKey, InternalStep> {
  return {
    "intent-analysis": {
      id: `${options.traceId}-intent-analysis`,
      key: "intent-analysis",
      label: STEP_LABELS["intent-analysis"],
      status: "done",
      progress: 12,
      meta: { mode: options.mode },
    },
    "paper-context-check": {
      id: `${options.traceId}-paper-context-check`,
      key: "paper-context-check",
      label: STEP_LABELS["paper-context-check"],
      status: "done",
      progress: 24,
      meta: {
        ...(options.stage ? { stage: options.stage } : { note: "non-paper-turn" }),
      },
    },
    "search-decision": {
      id: `${options.traceId}-search-decision`,
      key: "search-decision",
      label: STEP_LABELS["search-decision"],
      status: "done",
      progress: 36,
      meta: { note: options.webSearchEnabled ? "web-search-enabled" : "web-search-disabled" },
    },
    "source-validation": {
      id: `${options.traceId}-source-validation`,
      key: "source-validation",
      label: STEP_LABELS["source-validation"],
      status: options.webSearchEnabled ? "pending" : "skipped",
      progress: options.webSearchEnabled ? 52 : 55,
      meta: options.webSearchEnabled ? undefined : { note: "no-web-search" },
    },
    "response-compose": {
      id: `${options.traceId}-response-compose`,
      key: "response-compose",
      label: STEP_LABELS["response-compose"],
      status: "running",
      progress: 62,
    },
    "tool-action": {
      id: `${options.traceId}-tool-action`,
      key: "tool-action",
      label: STEP_LABELS["tool-action"],
      status: "pending",
      progress: 70,
      meta: { note: "no-tool-detected-yet" },
    },
  }
}

function updateStep(
  traceId: string,
  step: InternalStep,
  next: {
    status?: CuratedTraceStepStatus
    progress?: number
    meta?: CuratedTraceMeta
  }
): CuratedTraceDataPart[] {
  const nextStatus = next.status ?? step.status
  const nextProgress = next.progress ?? step.progress

  const sameMeta = JSON.stringify(step.meta ?? null) === JSON.stringify(next.meta ?? step.meta ?? null)
  if (nextStatus === step.status && nextProgress === step.progress && sameMeta) {
    return []
  }

  step.status = nextStatus
  step.progress = nextProgress
  if (next.meta !== undefined) {
    step.meta = next.meta
  }

  return [buildEvent(traceId, step)]
}

export function createCuratedTraceController(options: {
  enabled: boolean
  traceId: string
  mode: "normal" | "paper" | "websearch"
  stage?: string
  webSearchEnabled: boolean
}): CuratedTraceController {
  if (!options.enabled) {
    return {
      enabled: false,
      initialEvents: [],
      markToolRunning: () => [],
      markToolDone: () => [],
      markSourceDetected: () => [],
      finalize: () => [],
    }
  }

  const steps = createSteps(options)
  let sourceSeenCount = 0

  const initialEvents = STEP_ORDER.map((key) => buildEvent(options.traceId, steps[key]))

  return {
    enabled: true,
    initialEvents,
    markToolRunning: (toolName?: string) =>
      updateStep(options.traceId, steps["tool-action"], {
        status: "running",
        progress: 78,
        meta: { ...(toolName ? { toolName } : {}), note: "tool-running" },
      }),
    markToolDone: (toolName?: string) =>
      updateStep(options.traceId, steps["tool-action"], {
        status: "done",
        progress: 86,
        meta: { ...(toolName ? { toolName } : {}), note: "tool-done" },
      }),
    markSourceDetected: () => {
      sourceSeenCount += 1
      return updateStep(options.traceId, steps["source-validation"], {
        status: "running",
        progress: 74,
        meta: { sourceCount: sourceSeenCount, note: "source-detected" },
      })
    },
    finalize: ({ outcome, sourceCount, errorNote }) => {
      const events: CuratedTraceDataPart[] = []

      if (options.webSearchEnabled) {
        if (sourceCount > 0) {
          events.push(
            ...updateStep(options.traceId, steps["source-validation"], {
              status: "done",
              progress: 90,
              meta: { sourceCount, note: "sources-validated" },
            })
          )
        } else {
          events.push(
            ...updateStep(options.traceId, steps["source-validation"], {
              status: "skipped",
              progress: 90,
              meta: { note: "no-sources-returned" },
            })
          )
        }
      } else {
        events.push(
          ...updateStep(options.traceId, steps["source-validation"], {
            status: "skipped",
            progress: 90,
            meta: { note: "no-web-search" },
          })
        )
      }

      if (steps["tool-action"].status === "pending") {
        events.push(
          ...updateStep(options.traceId, steps["tool-action"], {
            status: "skipped",
            progress: 92,
            meta: { note: "no-tool-call" },
          })
        )
      } else if (steps["tool-action"].status === "running") {
        events.push(
          ...updateStep(options.traceId, steps["tool-action"], {
            status: "done",
            progress: 92,
            meta: { ...(steps["tool-action"].meta ?? {}), note: "tool-completed" },
          })
        )
      }

      if (outcome === "done") {
        events.push(
          ...updateStep(options.traceId, steps["response-compose"], {
            status: "done",
            progress: 100,
          })
        )
      }

      if (outcome === "error") {
        events.push(
          ...updateStep(options.traceId, steps["response-compose"], {
            status: "error",
            progress: 100,
            meta: { note: errorNote ?? "stream-error" },
          })
        )
      }

      if (outcome === "stopped") {
        events.push(
          ...updateStep(options.traceId, steps["response-compose"], {
            status: "skipped",
            progress: 100,
            meta: { note: "stopped-by-user-or-stream-abort" },
          })
        )
      }

      return events
    },
  }
}
