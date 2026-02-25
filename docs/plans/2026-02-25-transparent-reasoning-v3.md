# V3 Transparent Reasoning (Live Thought Stream) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace template-based reasoning trace with live model thoughts — status bar shows actual AI reasoning in real-time, panel shows structured timeline with per-step reasoning excerpts.

**Architecture:** Enable Gemini `includeThoughts: true`, intercept `reasoning` chunks in `fullStream`, emit progressive `data-reasoning-thought` events to client during thinking phase, then segment accumulated reasoning into curated steps with dynamic labels/thoughts after thinking completes. Client accumulates thought deltas for live display, then transitions to structured timeline.

**Tech Stack:** Vercel AI SDK v5 (`fullStream`, `reasoning` chunk type), Gemini 2.5 Flash (thinkingConfig), React 19, Tailwind CSS 4

**Design Doc:** `docs/reasoning-model-migration/2026-02-25-desain-v3-transparent-reasoning-live-thought.md`

---

## Task 1: Enable `includeThoughts` in streaming config

**Files:**
- Modify: `src/lib/ai/streaming.ts:10` (ReasoningTraceMode type)
- Modify: `src/lib/ai/streaming.ts:353-375` (buildReasoningProviderOptions)

**Step 1: Add "transparent" to ReasoningTraceMode type**

In `src/lib/ai/streaming.ts`, change:

```ts
export type ReasoningTraceMode = "off" | "curated"
```

to:

```ts
export type ReasoningTraceMode = "off" | "curated" | "transparent"
```

**Step 2: Conditionally set `includeThoughts` based on traceMode**

In `buildReasoningProviderOptions`, change `includeThoughts: false` to be conditional:

```ts
export function buildReasoningProviderOptions(options: {
  settings: ReasoningSettings
  target: ReasoningTarget
  profile: ReasoningExecutionProfile
}) {
  const slot = options.target === "primary" ? options.settings.primary : options.settings.fallback
  if (!options.settings.enabled || !slot.supported) {
    return undefined
  }

  const narrativeBudget = clampThinkingBudget(slot.thinkingBudget)
  const toolHeavyBudget = clampThinkingBudget(Math.min(narrativeBudget, TOOL_HEAVY_THINKING_CAP))
  const budget = options.profile === "tool-heavy" ? toolHeavyBudget : narrativeBudget

  return {
    google: {
      thinkingConfig: {
        thinkingBudget: budget,
        includeThoughts: options.settings.traceMode === "transparent",
      },
    },
  }
}
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `streaming.ts`

**Step 4: Commit**

```bash
git add src/lib/ai/streaming.ts
git commit -m "feat(ai): enable includeThoughts for transparent reasoning mode"
```

---

## Task 2: Add reasoning sanitizer utility

**Files:**
- Create: `src/lib/ai/reasoning-sanitizer.ts`

This utility sanitizes raw model reasoning before sending to client. Runs server-side only.

**Step 1: Create the sanitizer**

Create `src/lib/ai/reasoning-sanitizer.ts`:

```ts
/**
 * Server-side sanitizer for model reasoning text.
 * Strips sensitive content before forwarding to client.
 *
 * Rules:
 * 1. Strip system prompt references
 * 2. Strip credential-like patterns (API keys, tokens)
 * 3. Strip raw JSON/code blocks from tool internals
 * 4. Length limits: 500 chars per chunk, 200 chars per step thought
 */

const SENSITIVE_PATTERNS = [
  /system\s*prompt/gi,
  /instruksi\s*(internal|sistem)/gi,
  /CLAUDE\.md/gi,
  /\b[A-Za-z0-9_-]{20,}(?:key|token|secret|api)[A-Za-z0-9_-]{0,10}\b/gi,
  /\b(sk|pk|api|key|token|secret)[-_][A-Za-z0-9]{16,}\b/g,
  /```[\s\S]*?```/g, // code blocks
  /\{[\s\S]{100,}\}/g, // large JSON objects
]

export function sanitizeReasoningDelta(delta: string): string {
  if (!delta) return delta

  let sanitized = delta
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  return sanitized.slice(0, 500)
}

export function sanitizeStepThought(thought: string): string {
  if (!thought) return thought

  let sanitized = thought
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  return sanitized.trim().slice(0, 200)
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/ai/reasoning-sanitizer.ts
git commit -m "feat(ai): add reasoning text sanitizer for transparent mode"
```

---

## Task 3: Add reasoning segmentation to curated-trace

**Files:**
- Modify: `src/lib/ai/curated-trace.ts`

Add `populateFromReasoning()` method that segments raw reasoning text into the 6 curated steps with dynamic labels and thought excerpts.

**Step 1: Add keyword affinity map and segmentation function**

After the existing `STEP_LABELS` constant (line 88-95), add:

```ts
const STEP_KEYWORDS: Record<CuratedTraceStepKey, RegExp[]> = {
  "intent-analysis": [/user/i, /ingin/i, /minta/i, /butuh/i, /pertanyaan/i, /maksud/i, /memahami/i, /kebutuhan/i],
  "paper-context-check": [/paper/i, /sesi/i, /stage/i, /tahap/i, /workflow/i, /makalah/i],
  "search-decision": [/cari/i, /search/i, /web/i, /referensi/i, /sumber/i, /internet/i, /google/i],
  "source-validation": [/validasi/i, /sumber/i, /kredibel/i, /sitasi/i, /jurnal/i, /verifikasi/i],
  "tool-action": [/tool/i, /function/i, /panggil/i, /jalankan/i, /aksi/i, /simpan/i],
  "response-compose": [/jawab/i, /susun/i, /tulis/i, /respons/i, /sampaikan/i, /rangkum/i],
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function scoreStep(sentence: string, stepKey: CuratedTraceStepKey): number {
  return STEP_KEYWORDS[stepKey].reduce(
    (score, pattern) => score + (pattern.test(sentence) ? 1 : 0),
    0
  )
}

export interface ReasoningSegmentation {
  stepThoughts: Record<CuratedTraceStepKey, string | null>
  stepLabels: Record<CuratedTraceStepKey, string>
  headline: string
}

export function segmentReasoning(
  rawReasoning: string,
  fallbackMode: "normal" | "paper" | "websearch" = "normal"
): ReasoningSegmentation {
  const sentences = splitIntoSentences(rawReasoning)

  // Assign sentences to steps by highest keyword score
  const buckets: Record<CuratedTraceStepKey, string[]> = {
    "intent-analysis": [],
    "paper-context-check": [],
    "search-decision": [],
    "source-validation": [],
    "tool-action": [],
    "response-compose": [],
  }

  for (const sentence of sentences) {
    let bestStep: CuratedTraceStepKey = "intent-analysis"
    let bestScore = 0

    for (const stepKey of STEP_ORDER) {
      const score = scoreStep(sentence, stepKey)
      if (score > bestScore) {
        bestScore = score
        bestStep = stepKey
      }
    }

    // If no keywords matched, assign to intent-analysis (catch-all)
    buckets[bestStep].push(sentence)
  }

  // Extract thoughts and labels per step
  const stepThoughts: Record<CuratedTraceStepKey, string | null> = {} as Record<CuratedTraceStepKey, string | null>
  const stepLabels: Record<CuratedTraceStepKey, string> = {} as Record<CuratedTraceStepKey, string>

  for (const stepKey of STEP_ORDER) {
    const bucket = buckets[stepKey]
    if (bucket.length > 0) {
      // Take top 1-2 sentences as thought
      const thought = bucket.slice(0, 2).join(" ")
      stepThoughts[stepKey] = thought.slice(0, 200)
      // Label = first sentence, truncated to 80 chars
      stepLabels[stepKey] = bucket[0].slice(0, 80)
    } else {
      stepThoughts[stepKey] = null
      // Fallback label from template
      stepLabels[stepKey] = STEP_LABELS[stepKey]
    }
  }

  // Headline = last sentence of the whole reasoning, or fallback
  const headline = sentences.length > 0
    ? sentences[sentences.length - 1].slice(0, 120)
    : `Proses ${fallbackMode === "paper" ? "paper" : fallbackMode === "websearch" ? "pencarian" : "chat"} selesai.`

  return { stepThoughts, stepLabels, headline }
}
```

**Step 2: Add `thought` field to persisted snapshot types**

Update `PersistedCuratedTraceSnapshot` to support version 2:

```ts
export interface PersistedCuratedTraceSnapshot {
  version: 1 | 2
  headline: string
  traceMode: "curated" | "transparent"
  completedAt: number
  steps: Array<{
    stepKey: CuratedTraceStepKey
    label: string
    status: CuratedTraceStepStatus
    progress?: number
    ts: number
    thought?: string  // NEW: reasoning excerpt per step (max 200 chars)
    meta?: CuratedTraceMeta
  }>
}
```

**Step 3: Add `populateFromReasoning` to controller interface and implementation**

Add to `CuratedTraceController` interface:

```ts
export interface CuratedTraceController {
  enabled: boolean
  initialEvents: CuratedTraceDataPart[]
  markToolRunning: (toolName?: string) => CuratedTraceDataPart[]
  markToolDone: (toolName?: string) => CuratedTraceDataPart[]
  markSourceDetected: () => CuratedTraceDataPart[]
  populateFromReasoning: (rawReasoning: string) => CuratedTraceDataPart[]  // NEW
  finalize: (options: {
    outcome: "done" | "error" | "stopped"
    sourceCount: number
    errorNote?: string
  }) => CuratedTraceDataPart[]
  getPersistedSnapshot: () => PersistedCuratedTraceSnapshot
}
```

In `createCuratedTraceController`, add a `populateFromReasoning` implementation inside the returned object (after `markSourceDetected`):

```ts
populateFromReasoning: (rawReasoning: string) => {
  if (!rawReasoning || rawReasoning.trim().length === 0) return []

  const { sanitizeStepThought } = require("./reasoning-sanitizer") as typeof import("./reasoning-sanitizer")
  const segmentation = segmentReasoning(rawReasoning, options.mode)
  const events: CuratedTraceDataPart[] = []

  for (const stepKey of STEP_ORDER) {
    const step = steps[stepKey]
    const thought = segmentation.stepThoughts[stepKey]
    const label = segmentation.stepLabels[stepKey]

    // Update label to dynamic version
    step.label = label
    if (thought) {
      step.meta = {
        ...step.meta,
        note: sanitizeStepThought(thought),
      }
    }
    step.ts = nowTs()
    events.push(buildEvent(options.traceId, step))
  }

  return events
},
```

Also update `buildPersistedSnapshot` to use version 2 when thoughts are present, and include thought field:

```ts
function buildPersistedSnapshot(
  steps: Record<CuratedTraceStepKey, InternalStep>,
  traceMode: "curated" | "transparent" = "curated"
): PersistedCuratedTraceSnapshot {
  const hasThoughts = Object.values(steps).some(
    (s) => s.meta?.note && traceMode === "transparent"
  )
  return {
    version: hasThoughts ? 2 : 1,
    headline: buildHeadlineFromSteps(steps),
    traceMode,
    completedAt: nowTs(),
    steps: STEP_ORDER.map((key) => {
      const step = steps[key]
      return {
        stepKey: step.key,
        label: step.label,
        status: step.status,
        progress: step.progress,
        ts: step.ts,
        ...(step.meta?.note && traceMode === "transparent" ? { thought: step.meta.note } : {}),
        ...(step.meta ? { meta: step.meta } : {}),
      }
    }),
  }
}
```

Update the disabled controller to include `populateFromReasoning: () => []`.

**Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to `curated-trace.ts`

**Step 5: Commit**

```bash
git add src/lib/ai/curated-trace.ts
git commit -m "feat(ai): add reasoning segmentation and populateFromReasoning to trace controller"
```

---

## Task 4: Add `data-reasoning-thought` event type support

**Files:**
- Modify: `src/lib/ai/curated-trace.ts` (add new event type)

**Step 1: Add the new data part type**

Add after `CuratedTraceDataPart` interface:

```ts
export interface ReasoningThoughtDataPart {
  type: "data-reasoning-thought"
  id: string
  data: {
    traceId: string
    delta: string
    ts: number
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/curated-trace.ts
git commit -m "feat(ai): add data-reasoning-thought event type"
```

---

## Task 5: Intercept reasoning chunks in route.ts (Primary Web Search path)

This is the largest task. We modify route.ts to use `result.fullStream` alongside `result.toUIMessageStream()` to capture reasoning chunks.

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Strategy:** Instead of replacing `toUIMessageStream()` entirely (which would break all existing stream handling), we add a parallel `fullStream` consumer that captures reasoning text, then call `populateFromReasoning()` when reasoning completes. We also emit progressive `data-reasoning-thought` events during thinking.

**Step 1: Update `reasoningTraceEnabled` check to include transparent**

Change line ~1269:

```ts
const reasoningTraceEnabled = reasoningSettings.traceMode === "curated" || reasoningSettings.traceMode === "transparent"
const isTransparentReasoning = reasoningSettings.traceMode === "transparent"
```

**Step 2: Add reasoning accumulator helper**

Add after the `getToolNameFromChunk` helper (~line 1284):

```ts
// Helper: accumulate reasoning from fullStream and emit progressive thought events
function createReasoningAccumulator(options: {
  traceId: string
  writer: { write: (data: unknown) => void }
  ensureStart: () => void
  enabled: boolean
}) {
  let buffer = ""
  let chunkCount = 0

  return {
    onReasoningDelta: (delta: string) => {
      if (!options.enabled || !delta) return
      buffer += delta
      chunkCount += 1

      // Emit progressive thought event (throttled: every 3 chunks or every 100 chars)
      if (chunkCount % 3 === 0 || delta.length > 100) {
        const { sanitizeReasoningDelta } = require("@/lib/ai/reasoning-sanitizer") as typeof import("@/lib/ai/reasoning-sanitizer")
        const sanitized = sanitizeReasoningDelta(delta)
        if (sanitized.trim()) {
          options.ensureStart()
          options.writer.write({
            type: "data-reasoning-thought",
            id: `${options.traceId}-thought-${chunkCount}`,
            data: {
              traceId: options.traceId,
              delta: sanitized,
              ts: Date.now(),
            },
          })
        }
      }
    },
    getFullReasoning: () => buffer,
    hasReasoning: () => buffer.length > 0,
  }
}
```

**Step 3: Wire up reasoning accumulator in Primary Web Search stream path**

In the Primary Web Search path (~line 1618-1730), after `const stream = createUIMessageStream({`:

Inside the `execute: async ({ writer }) => {` callback, after the existing variable declarations, add:

```ts
const reasoningAccumulator = createReasoningAccumulator({
  traceId,
  writer,
  ensureStart,
  enabled: isTransparentReasoning,
})
```

Then, inside the `for await (const chunk of result.toUIMessageStream({...}))` loop, add a check for reasoning at the top of the loop body:

**Important note:** `toUIMessageStream` with `sendReasoning: false` does NOT emit reasoning chunks. To capture reasoning, we need to consume `result.fullStream` in parallel. However, consuming both `toUIMessageStream` and `fullStream` from the same result is problematic.

**Revised approach:** Instead, change `sendReasoning: false` to `sendReasoning: isTransparentReasoning` and intercept reasoning chunks from within the existing `toUIMessageStream` loop:

Change:

```ts
for await (const chunk of result.toUIMessageStream({
    sendStart: false,
    generateMessageId: () => messageId,
    sendSources: true,
    sendReasoning: false,
})) {
```

to:

```ts
for await (const chunk of result.toUIMessageStream({
    sendStart: false,
    generateMessageId: () => messageId,
    sendSources: true,
    sendReasoning: isTransparentReasoning,
})) {
    // Intercept reasoning chunks for transparent mode
    if (isTransparentReasoning && chunk.type === "reasoning") {
        // Don't forward raw reasoning to client - we emit our own sanitized version
        reasoningAccumulator.onReasoningDelta(
            typeof chunk.data === "string" ? chunk.data : ""
        )
        continue // skip forwarding the raw reasoning chunk
    }
```

Then, just before the `finish` handling block where `reasoningTrace.finalize()` is called, add:

```ts
// Populate trace steps from accumulated reasoning
if (reasoningAccumulator.hasReasoning()) {
    const populateEvents = reasoningTrace.populateFromReasoning(
        reasoningAccumulator.getFullReasoning()
    )
    emitTrace(populateEvents)
}
```

**Step 4: Apply the same pattern to the other 3 stream paths**

The route has 4 stream paths:
1. Primary + Web Search (~line 1603)
2. Primary + No Web Search (~line 2168)
3. Fallback + Web Search (~line 2382)
4. Fallback + No Web Search (~line 2485)

Apply the same changes to each:
- Add `reasoningAccumulator` creation
- Change `sendReasoning: false` to `sendReasoning: isTransparentReasoning`
- Add reasoning interception in the stream loop
- Add `populateFromReasoning` call before finalize

**NOTE:** For fallback paths, transparent reasoning may not work (OpenRouter doesn't support `includeThoughts`). The accumulator's `enabled` flag will be false if the fallback model doesn't support it. Use this check:

```ts
const fallbackTransparent = isTransparentReasoning && reasoningSettings.fallback.supported
```

**Step 5: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(ai): intercept reasoning chunks and emit progressive thought events"
```

---

## Task 6: Client — handle `data-reasoning-thought` in ChatWindow

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1: Add thought extraction function**

After `extractReasoningHeadline` function, add:

```ts
function extractLiveThought(uiMessage: UIMessage): string | null {
  let lastThought: string | null = null

  for (const part of uiMessage.parts ?? []) {
    if (!part || typeof part !== "object") continue
    const dataPart = part as { type?: unknown; data?: unknown }
    if (dataPart.type !== "data-reasoning-thought") continue
    if (!dataPart.data || typeof dataPart.data !== "object") continue

    const data = dataPart.data as { delta?: unknown }
    if (typeof data.delta === "string" && data.delta.trim()) {
      lastThought = data.delta.trim()
    }
  }

  return lastThought
}
```

**Step 2: Wire live thought into reasoning state**

In the `activeReasoningState` useMemo (find where it computes the reasoning state for the current streaming message), add live thought extraction:

```ts
const liveThought = extractLiveThought(activeMessage)
```

Use `liveThought` as the headline when steps are still empty (thinking phase):

```ts
const headline = liveThought || extractReasoningHeadline(activeMessage, steps) || null
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(chat): handle data-reasoning-thought events for live thought display"
```

---

## Task 7: Status bar — show live thought text during thinking phase

**Files:**
- Modify: `src/components/chat/ChatProcessStatusBar.tsx`

The status bar already shows `narrativeHeadline` during processing. With Task 6, the headline will now contain live model thoughts from `data-reasoning-thought` events. No code changes needed in the status bar itself unless we want specific styling for live thoughts.

**Step 1: Add truncation for long thoughts**

The live thought text can be long. Add CSS truncation to the headline span:

In the processing mode headline `<span>`, add `truncate` class:

```tsx
<span className="truncate font-sans text-sm leading-snug text-[var(--chat-secondary-foreground)]">
  {narrativeHeadline ?? "Memproses..."}
</span>
```

**Step 2: Commit**

```bash
git add src/components/chat/ChatProcessStatusBar.tsx
git commit -m "feat(chat): add truncation for live thought text in status bar"
```

---

## Task 8: Panel — show `thought` field in step details

**Files:**
- Modify: `src/components/chat/ReasoningTracePanel.tsx`

**Step 1: Add `thought` to ReasoningTraceStep type**

```ts
export interface ReasoningTraceStep {
  traceId: string
  stepKey: string
  label: string
  status: ReasoningTraceStatus
  progress: number
  ts?: number
  thought?: string  // NEW: reasoning excerpt per step
  meta?: {
    note?: string
    sourceCount?: number
    toolName?: string
    stage?: string
    mode?: "normal" | "paper" | "websearch"
  }
}
```

**Step 2: Update `getDetail` to prefer `thought` over template meta**

```ts
function getDetail(step: ReasoningTraceStep): string | null {
  // V3: Prefer actual reasoning thought over template meta
  if (step.thought) {
    return step.thought
  }

  // V2 fallback: template-based meta
  if (step.meta?.sourceCount && step.meta.sourceCount > 0) {
    return `${step.meta.sourceCount} sumber tervalidasi`
  }

  if (step.meta?.toolName) {
    return `Tool aktif: ${step.meta.toolName}`
  }

  if (step.meta?.stage) {
    return `Tahap aktif: ${step.meta.stage}`
  }

  if (step.meta?.mode) {
    if (step.meta.mode === "paper") return "Mode paper workflow aktif"
    if (step.meta.mode === "websearch") return "Mode pencarian web aktif"
    return "Mode chat normal aktif"
  }

  if (step.meta?.note) {
    return humanizeNote(step.meta.note)
  }

  return null
}
```

**Step 3: Commit**

```bash
git add src/components/chat/ReasoningTracePanel.tsx
git commit -m "feat(chat): show reasoning thought in panel step details"
```

---

## Task 9: Wire `thought` from persisted trace through ChatWindow

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1: Parse `thought` field from persisted trace**

In `extractReasoningTraceSteps`, where it processes `persistedTrace.steps`, add `thought` extraction:

In the persisted trace parsing block (~line 194), update:

```ts
byStepKey.set(rawStep.stepKey, {
  traceId: uiMessage.id,
  stepKey: rawStep.stepKey,
  label: rawStep.label,
  status: rawStep.status as ReasoningTraceStatus,
  progress,
  ...(typeof rawStep.ts === "number" && Number.isFinite(rawStep.ts) ? { ts: rawStep.ts } : {}),
  ...(parsedMeta ? { meta: parsedMeta } : {}),
  ...(typeof (rawStep as { thought?: unknown }).thought === "string"
    ? { thought: (rawStep as { thought?: unknown }).thought as string }
    : {}),
})
```

Also add `thought` to the `PersistedReasoningTraceStepRaw` interface (or add if not exists):

```ts
interface PersistedReasoningTraceStepRaw {
  stepKey?: unknown
  label?: unknown
  status?: unknown
  progress?: unknown
  ts?: unknown
  meta?: unknown
  thought?: unknown  // NEW
}
```

**Step 2: Parse `thought` from streaming trace events too**

In the streaming trace parsing block (~line 163-175), add thought:

```ts
const parsedStep: ReasoningTraceStep = {
  traceId: data.traceId,
  stepKey: data.stepKey,
  label: data.label,
  status: data.status as ReasoningTraceStatus,
  progress,
  ...(typeof data.ts === "number" && Number.isFinite(data.ts) ? { ts: data.ts } : {}),
  ...(typeof (data as { thought?: unknown }).thought === "string"
    ? { thought: (data as { thought?: unknown }).thought as string }
    : {}),
}
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(chat): parse thought field from both streaming and persisted traces"
```

---

## Task 10: Update persistence sanitizer in route.ts

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Update `sanitizeReasoningTraceForPersistence` to handle version 2**

In the `sanitizeReasoningTraceForPersistence` function (~line 860-952), update:

1. Accept `version: 1 | 2` and `traceMode: "curated" | "transparent"` values
2. Pass through `thought` field per step (sanitized)
3. Return correct version/traceMode

Change the version/traceMode lines:

```ts
return {
    version: trace.version === 2 ? 2 : 1,
    headline: sanitizeReasoningText(
        trace.headline || "Agen lagi memproses jawaban...",
        "Agen lagi memproses jawaban."
    ),
    traceMode: trace.traceMode === "transparent" ? "transparent" : "curated",
    completedAt: Number.isFinite(trace.completedAt) ? trace.completedAt : Date.now(),
    steps,
}
```

In the per-step mapping, add `thought`:

```ts
return {
    stepKey: step.stepKey,
    label: sanitizeReasoningText(step.label, "Langkah reasoning"),
    status: sanitizeReasoningStatus(step.status),
    ...(typeof step.progress === "number" && Number.isFinite(step.progress)
        ? { progress: Math.max(0, Math.min(100, step.progress)) }
        : {}),
    ts: Number.isFinite(step.ts) ? step.ts : Date.now(),
    ...(typeof step.thought === "string" && step.thought.trim()
        ? { thought: sanitizeReasoningText(step.thought.trim().slice(0, 200), "Detail reasoning.") }
        : {}),
    ...(sanitizedMeta && Object.keys(sanitizedMeta).length > 0 ? { meta: sanitizedMeta } : {}),
}
```

**Step 2: Update `getPersistedSnapshot` calls to pass traceMode**

In the stream paths where `reasoningTrace.getPersistedSnapshot()` is called, the controller already knows its mode. Ensure `buildPersistedSnapshot` receives the traceMode from controller options.

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(ai): update persistence sanitizer for transparent reasoning trace v2"
```

---

## Task 11: Update Convex schema for `thought` field in reasoningTrace

**Files:**
- Modify: `convex/schema.ts` (if reasoningTrace has explicit schema validation)
- Modify: `convex/messages.ts` (if createMessage validates reasoningTrace shape)

**Step 1: Check if Convex schema needs changes**

The reasoningTrace field is likely stored as a JSON blob (`v.any()` or `v.optional(v.object(...))`). Check:

Run: `grep -n "reasoningTrace" convex/schema.ts convex/messages.ts`

If the field is `v.any()` or loosely typed, no schema changes needed — the new `thought` field and `version: 2` will be stored as-is.

If explicitly typed with `v.object()`, add:
- `version: v.union(v.literal(1), v.literal(2))`
- `traceMode: v.union(v.literal("curated"), v.literal("transparent"))`
- `thought: v.optional(v.string())` in each step

**Step 2: Commit (if changes needed)**

```bash
git add convex/schema.ts convex/messages.ts
git commit -m "feat(db): extend reasoningTrace schema for transparent mode v2"
```

---

## Task 12: Update admin config to allow `transparent` mode selection

**Files:**
- Modify: Convex schema for `aiProviderConfigs.reasoningTraceMode` validator
- Modify: Admin panel component for reasoning config

**Step 1: Update Convex config validator**

In the `aiProviderConfigs` schema, change `reasoningTraceMode` validator from:

```ts
reasoningTraceMode: v.union(v.literal("off"), v.literal("curated"))
```

to:

```ts
reasoningTraceMode: v.union(v.literal("off"), v.literal("curated"), v.literal("transparent"))
```

**Step 2: Update admin panel dropdown**

Find the admin panel component that renders the reasoning trace mode selector and add "transparent" option.

**Step 3: Commit**

```bash
git add convex/schema.ts src/components/admin/
git commit -m "feat(admin): add transparent reasoning mode to admin config"
```

---

## Task 13: Integration test — full cycle verification

**Step 1: Run build to catch compile errors**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds

**Step 2: Run existing tests**

Run: `npm run test 2>&1 | tail -30`
Expected: All tests pass

**Step 3: Manual verification checklist**

With admin config set to `reasoningTraceMode: "transparent"`:

1. Send a chat message and observe:
   - Status bar shows live thought text (not template)
   - Progress bar animates during thinking
   - When response starts, status bar shows step labels
   - When done, "Memproses Xm Yd >" appears

2. Click to open panel and verify:
   - Timeline steps have dynamic labels (different per turn)
   - Step details show reasoning excerpts (not template text)
   - "Proses" header visible

3. Reload page and open the same message:
   - Panel shows persisted trace with thoughts
   - Headline is dynamic (from reasoning)

4. Switch to `reasoningTraceMode: "curated"` in admin:
   - Verify V2 behavior still works (template labels)
   - No regression

5. Switch to `reasoningTraceMode: "off"`:
   - No reasoning UI appears

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(ai): V3 transparent reasoning — live thought stream integration"
```

---

## Summary of Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/ai/streaming.ts` | Modify | Add `"transparent"` to `ReasoningTraceMode`, conditional `includeThoughts` |
| `src/lib/ai/reasoning-sanitizer.ts` | Create | Server-side sanitizer for reasoning text |
| `src/lib/ai/curated-trace.ts` | Modify | Add `segmentReasoning()`, `populateFromReasoning()`, `ReasoningThoughtDataPart`, version 2 snapshot |
| `src/app/api/chat/route.ts` | Modify | Reasoning accumulator, progressive thought events, `sendReasoning` toggle, persistence v2 |
| `src/components/chat/ChatWindow.tsx` | Modify | Parse `data-reasoning-thought`, `thought` field from traces |
| `src/components/chat/ChatProcessStatusBar.tsx` | Modify | Truncation for live thought text |
| `src/components/chat/ReasoningTracePanel.tsx` | Modify | `thought` field in type + prefer thought over template in details |
| `convex/schema.ts` | Modify (if needed) | Extend reasoningTrace + config validators |
| Admin panel component | Modify | Add "transparent" option |
