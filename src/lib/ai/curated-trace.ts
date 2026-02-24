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

export interface PersistedCuratedTraceSnapshot {
  version: 1
  headline: string
  traceMode: "curated"
  completedAt: number
  steps: Array<{
    stepKey: CuratedTraceStepKey
    label: string
    status: CuratedTraceStepStatus
    progress?: number
    ts: number
    meta?: CuratedTraceMeta
  }>
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
  ts: number
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
  getPersistedSnapshot: () => PersistedCuratedTraceSnapshot
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
  "intent-analysis": "Memahami kebutuhan user",
  "paper-context-check": "Memeriksa konteks paper aktif",
  "search-decision": "Menentukan kebutuhan pencarian web",
  "source-validation": "Memvalidasi sumber referensi",
  "response-compose": "Menyusun jawaban final",
  "tool-action": "Menjalankan aksi pendukung",
}

function nowTs() {
  return Date.now()
}

function lowerFirst(input: string) {
  if (!input) return input
  return input.charAt(0).toLowerCase() + input.slice(1)
}

function buildHeadlineFromSteps(steps: Record<CuratedTraceStepKey, InternalStep>): string {
  const allSteps = Object.values(steps)
  const running = allSteps.find((step) => step.status === "running")
  if (running) return `Sedang ${lowerFirst(running.label)}...`

  const errored = allSteps.find((step) => step.status === "error")
  if (errored) return `Terjadi kendala saat ${lowerFirst(errored.label)}.`

  const composeStep = steps["response-compose"]
  if (composeStep.status === "done") return "Jawaban selesai disusun."
  if (composeStep.status === "skipped") return "Proses penyusunan jawaban dihentikan."

  const completedByProgress = allSteps
    .filter((step) => step.status === "done")
    .sort((a, b) => b.progress - a.progress)[0]

  if (completedByProgress) return `${completedByProgress.label} selesai.`
  return "Model sedang menyusun jawaban..."
}

function normalizeErrorNote(errorNote?: string) {
  const value = (errorNote ?? "").trim().toLowerCase()
  if (!value) return "Terjadi kendala saat memproses jawaban."

  if (value.includes("websearch")) return "Terjadi kendala saat pencarian web."
  if (value.includes("stream")) return "Terjadi kendala pada aliran respons."
  if (value.includes("abort") || value.includes("stopped")) return "Proses dihentikan sebelum selesai."
  return "Terjadi kendala saat memproses jawaban."
}

function buildPersistedSnapshot(steps: Record<CuratedTraceStepKey, InternalStep>): PersistedCuratedTraceSnapshot {
  return {
    version: 1,
    headline: buildHeadlineFromSteps(steps),
    traceMode: "curated",
    completedAt: nowTs(),
    steps: STEP_ORDER.map((key) => {
      const step = steps[key]
      return {
        stepKey: step.key,
        label: step.label,
        status: step.status,
        progress: step.progress,
        ts: step.ts,
        ...(step.meta ? { meta: step.meta } : {}),
      }
    }),
  }
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
      ts: step.ts,
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
      ts: nowTs(),
      meta: { mode: options.mode },
    },
    "paper-context-check": {
      id: `${options.traceId}-paper-context-check`,
      key: "paper-context-check",
      label: STEP_LABELS["paper-context-check"],
      status: "done",
      progress: 24,
      ts: nowTs(),
      meta: {
        ...(options.stage ? { stage: options.stage } : { note: "Turn ini tidak memakai paper workflow." }),
      },
    },
    "search-decision": {
      id: `${options.traceId}-search-decision`,
      key: "search-decision",
      label: STEP_LABELS["search-decision"],
      status: "done",
      progress: 36,
      ts: nowTs(),
      meta: {
        note: options.webSearchEnabled
          ? "Pencarian web diaktifkan untuk memperkuat jawaban."
          : "Pencarian web tidak diperlukan untuk turn ini.",
      },
    },
    "source-validation": {
      id: `${options.traceId}-source-validation`,
      key: "source-validation",
      label: STEP_LABELS["source-validation"],
      status: options.webSearchEnabled ? "pending" : "skipped",
      progress: options.webSearchEnabled ? 52 : 55,
      ts: nowTs(),
      meta: options.webSearchEnabled ? undefined : { note: "Langkah validasi sumber dilewati karena tanpa pencarian web." },
    },
    "response-compose": {
      id: `${options.traceId}-response-compose`,
      key: "response-compose",
      label: STEP_LABELS["response-compose"],
      status: "running",
      progress: 62,
      ts: nowTs(),
    },
    "tool-action": {
      id: `${options.traceId}-tool-action`,
      key: "tool-action",
      label: STEP_LABELS["tool-action"],
      status: "pending",
      progress: 70,
      ts: nowTs(),
      meta: { note: "Belum ada tool yang perlu dijalankan." },
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
  step.ts = nowTs()
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
      getPersistedSnapshot: () => ({
        version: 1,
        headline: "Jejak reasoning tidak aktif.",
        traceMode: "curated",
        completedAt: nowTs(),
        steps: [],
      }),
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
        meta: { ...(toolName ? { toolName } : {}), note: "Tool sedang dijalankan untuk membantu proses." },
      }),
    markToolDone: (toolName?: string) =>
      updateStep(options.traceId, steps["tool-action"], {
        status: "done",
        progress: 86,
        meta: { ...(toolName ? { toolName } : {}), note: "Tool selesai dijalankan." },
      }),
    markSourceDetected: () => {
      sourceSeenCount += 1
      return updateStep(options.traceId, steps["source-validation"], {
        status: "running",
        progress: 74,
        meta: { sourceCount: sourceSeenCount, note: "Sumber terdeteksi dan sedang diverifikasi." },
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
              meta: { sourceCount, note: "Sumber yang dipakai sudah tervalidasi." },
            })
          )
        } else {
          events.push(
            ...updateStep(options.traceId, steps["source-validation"], {
              status: "skipped",
              progress: 90,
              meta: { note: "Tidak ada sumber valid yang bisa dipakai." },
            })
          )
        }
      } else {
        events.push(
          ...updateStep(options.traceId, steps["source-validation"], {
            status: "skipped",
            progress: 90,
            meta: { note: "Validasi sumber dilewati karena pencarian web tidak aktif." },
          })
        )
      }

      if (steps["tool-action"].status === "pending") {
        events.push(
          ...updateStep(options.traceId, steps["tool-action"], {
            status: "skipped",
            progress: 92,
            meta: { note: "Tidak ada tool tambahan yang diperlukan." },
          })
        )
      } else if (steps["tool-action"].status === "running") {
        events.push(
          ...updateStep(options.traceId, steps["tool-action"], {
            status: "done",
            progress: 92,
            meta: { ...(steps["tool-action"].meta ?? {}), note: "Eksekusi tool telah selesai." },
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
            meta: { note: normalizeErrorNote(errorNote) },
          })
        )
      }

      if (outcome === "stopped") {
        events.push(
          ...updateStep(options.traceId, steps["response-compose"], {
            status: "skipped",
            progress: 100,
            meta: { note: "Proses dihentikan sebelum jawaban selesai." },
          })
        )
      }

      return events
    },
    getPersistedSnapshot: () => buildPersistedSnapshot(steps),
  }
}
