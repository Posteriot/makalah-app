# Design Doc: Json Renderer V2 — Tool-Based Recommendation Card

Date: 2026-03-18
Context: `2026-03-18-json-renderer-as-model-visual-language.md`
Scope: Phase one — gagasan, topik, outline — single-select only

## Overview

The model emits recommendation cards by calling a tool. The backend intercepts the tool output in the stream loop, compiles it into a json-render spec, and emits a `data-json-renderer-recommendation` part to the UI stream. No second LLM call. No skip logic. No workflow interference.

## Architecture

```
MODEL                    BACKEND (route.ts stream loop)           FRONTEND
  │                              │                                   │
  ├─ text-delta ────────────────►├─ writer.write(chunk) ────────────►│ render prose
  ├─ text-delta ────────────────►├─ writer.write(chunk) ────────────►│
  │                              │                                   │
  ├─ tool-call: emitRecommendationCard({...})                        │
  │       │                      │                                   │
  │       ▼                      │                                   │
  │  tool executes (pure,        │                                   │
  │  returns compiled spec)      │                                   │
  │       │                      │                                   │
  │       ▼                      │                                   │
  ├─ tool-output-available ─────►├─ intercept tool output            │
  │                              ├─ emit data-json-renderer-rec ────►│ render card
  │                              ├─ writer.write(chunk) ────────────►│ (tool part hidden)
  │                              │                                   │
  ├─ finish ────────────────────►├─ persist message + payload ──────►│
```

## Component 1: Tool Definition

### Name: `emitRecommendationCard`

### Input Schema (what model provides)

```typescript
z.object({
  title: z.string().min(1).describe(
    "Short heading for the decision point, in Indonesian. Example: 'Arah Gagasan Penelitian'"
  ),
  options: z.array(z.object({
    id: z.string().min(1).describe(
      "Kebab-case identifier. Example: 'fokus-berpikir-kritis'"
    ),
    label: z.string().min(1).describe(
      "Human-readable option label in Indonesian. Keep it concise (under 60 chars)."
    ),
  })).min(2).max(5).describe(
    "The selectable options. Must match what was discussed in the response text."
  ),
  recommendedId: z.string().min(1).describe(
    "The id of the option you recommend most strongly."
  ),
  submitLabel: z.string().max(40).optional().describe(
    "Button label. Defaults to 'Lanjutkan' if omitted."
  ),
})
```

### Execute Function

The tool's `execute` does NOT emit to stream (AI SDK limitation). It performs **deterministic compilation** of the model's input into a full json-render spec and returns it.

```typescript
execute: async (input) => {
  // 1. Normalize option IDs (slugify, dedup)
  // 2. Append global "Sudah cukup, lanjut validasi" option
  // 3. Build json-render spec (root, elements, event bindings)
  // 4. Build initial state (selectedOptionId = recommendedId)
  // 5. Return compiled payload

  return {
    success: true,
    payload: {
      version: 1,
      engine: "json-render",
      stage: currentStage,
      kind: "single-select",
      spec: compiledSpec,
      initialState: { recommendation: { selectedOptionId, customText: "" } },
      options: normalizedOptions,
    }
  }
}
```

This reuses the existing `buildSpecFromDraft` logic from v1 — the spec compilation is identical, only the input source changes (model tool call instead of second LLM extraction).

### Tool Registration

Added to paper tools alongside existing tools, gated by stage:

```typescript
// Only available during phase-one drafting stages
if (stage === "gagasan" || stage === "topik" || stage === "outline") {
  if (stageStatus === "drafting") {
    tools.emitRecommendationCard = tool({ ... })
  }
}
```

When the tool is not registered, the model cannot call it — natural gating, no skip logic.

## Component 2: Stream Loop Interception

In the `for await` chunk loop in `route.ts`, intercept `tool-output-available` for `emitRecommendationCard`:

```typescript
if (chunk.type === "tool-output-available") {
  const output = (chunk as any).output
  if (output?.success && output?.payload) {
    // Store for persistence
    streamRecommendationPayload = output.payload

    // Emit to UI stream
    ensureStart()
    writer.write({
      type: "data-json-renderer-recommendation",
      id: `${messageId}-json-renderer-recommendation`,
      data: output.payload,
    })
  }
  // Always pass through the original chunk (hidden in UI by MessageBubble)
  ensureStart()
  writer.write(chunk)
  continue
}
```

This pattern already exists in the codebase:
- `tool-input-start` → emit trace event (line ~2360)
- `source-url` → emit source detection (line ~2354)

### Persistence

At stream `finish`, include the payload in `saveAssistantMessage`:

```typescript
if (chunk.type === "finish") {
  // ... existing logic ...
  await saveAssistantMessage(
    normalizedAssistantText,
    sources,
    model,
    reasoningTrace,
    uiMessageId,
    streamRecommendationPayload ?? undefined  // NEW: include payload
  )
}
```

`saveAssistantMessage` already accepts `jsonRendererRecommendation` parameter (from v1). Convex schema needs the `jsonRendererRecommendation: v.optional(v.string())` field re-added.

### Fallback Path Mirror

Same interception logic in the fallback `runFallbackWithoutSearch` stream loop.

### onFinish Path

`onFinish` does NOT need to generate recommendation payload. It's already captured from the stream. If `streamRecommendationPayload` exists, include it in the save:

```typescript
onFinish: async ({ text, ... }) => {
  // ... existing logic ...
  if (persistedContent.length > 0 && !primaryAssistantMessagePersisted) {
    await saveAssistantMessage(
      persistedContent,
      sources,
      model,
      reasoningTrace,
      uiMessageId,
      streamRecommendationPayload ?? undefined  // Already captured
    )
    primaryAssistantMessagePersisted = true
  }
}
```

## Component 3: System Prompt Instruction

Injected as system message when the tool is available (phase-one drafting stages):

```
RECOMMENDATION CARD TOOL:
You have access to the `emitRecommendationCard` tool. Use it when you present 2-5 options
or recommendations for the user to choose from.

How to use:
1. Write your analysis and reasoning as normal prose.
2. When you reach the point where you would list options, call emitRecommendationCard
   with a title, the options (id + label), and your recommended option.
3. After the tool call, you may write a brief closing sentence.

The frontend will render an interactive card. The user clicks their choice instead of typing.

When NOT to use this tool:
- When you are saving stage data (updateStageData, createArtifact, submitStageForValidation)
- When responding to an approval or revision
- When having a general discussion without concrete options
- When there is only one obvious next step (no real choice needed)
```

This instruction is the **only** mechanism that guides when the card appears. No code-level skip logic needed.

## Component 4: Frontend Rendering

### MessageBubble Extraction

Add extractor in `MessageBubble.tsx` following existing pattern:

```typescript
function extractJsonRendererRecommendation(uiMessage: UIMessage) {
  for (const part of uiMessage.parts ?? []) {
    if (!part || typeof part !== "object") continue
    const dataPart = part as { type?: string; data?: unknown }
    if (dataPart.type !== "data-json-renderer-recommendation") continue
    // validate and return payload
  }
  return null
}
```

### Rendering

Render the `JsonRendererBlock` component (generalized from v1's `JsonRendererStageRecommendationBlock`):
- Shows card with title + option buttons + submit button
- On submit: sends `interactionEvent` back to chat API via `sendMessage` body
- After submit: card becomes read-only (disabled buttons, "Sudah dikirim" label)

### Tool Part Hiding

When `emitRecommendationCard` tool result appears in `message.parts`, hide the default tool-call UI. The card already renders from the `data-json-renderer-recommendation` part.

```typescript
// In MessageBubble, skip rendering tool-emitRecommendationCard parts
if (part.type === "tool-emitRecommendationCard") continue
```

## Component 5: History Rehydration

On page refresh, reconstruct recommendation card from persisted data:

```typescript
// In ChatWindow history mapping
const rawPayload = (msg as any).jsonRendererRecommendation
if (rawPayload) {
  const payload = JSON.parse(rawPayload)
  parts.push({
    type: "data-json-renderer-recommendation",
    id: `${messageId}-json-renderer-recommendation`,
    data: payload,
  })
}
```

Same pattern as v1 — already proven working.

## Component 6: Submit Flow

When user clicks option + submit in card:

1. Frontend builds `interactionEvent` with selected option ID
2. Frontend sends synthetic user message: `[Stage Recommendation: {stage}] Pilihan: {label}`
3. Chat API receives event, validates stage match, injects context note
4. Model sees user's choice and continues workflow

This reuses the v1 submit contract — the event shape and validation logic are sound.

## What Changes vs V1

| Area | V1 | V2 |
|------|----|----|
| `json-renderer-recommendation.ts` (LLM generator) | 400 lines, `generateText` call | **DELETED** — no second LLM call |
| `route.ts` skip logic | 6+ conditions, 80+ lines | **ZERO** — tool availability = natural gate |
| `route.ts` stream finish | Build payload + persist | Just persist (payload already captured) |
| `route.ts` onFinish | Build payload + persist | Just persist (payload already captured) |
| `paper-tools.ts` | No recommendation tool | New `emitRecommendationCard` tool |
| System prompt | No card awareness | Card tool usage instruction |
| Spec compilation | In `json-renderer-recommendation.ts` | In tool `execute` function |

## Schema Changes

### Convex messages table

Re-add field (removed during rollback):

```typescript
jsonRendererRecommendation: v.optional(v.string()),
```

Also re-add `uiMessageId` in metadata for rehydration:

```typescript
metadata: v.optional(v.object({
  model: v.optional(v.string()),
  tokens: v.optional(v.number()),
  finishReason: v.optional(v.string()),
  uiMessageId: v.optional(v.string()),
})),
```

And top-level `uiMessageId` for legacy compat:

```typescript
uiMessageId: v.optional(v.string()),
```

### Convex messages mutation

`createMessage` args must accept `jsonRendererRecommendation: v.optional(v.string())`.

## Files to Create or Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/ai/paper-tools.ts` | Modify | Add `emitRecommendationCard` tool |
| `src/app/api/chat/route.ts` | Modify | Stream loop interception + persist + system instruction |
| `src/components/chat/MessageBubble.tsx` | Modify | Extract + render recommendation card, hide tool part |
| `src/components/chat/ChatWindow.tsx` | Modify | History rehydration + submit handler |
| `src/components/chat/json-renderer/` | Create | Card components (from v1 backup, generalized) |
| `src/lib/json-render/catalog.ts` | Create | Component catalog + prop schemas |
| `src/lib/json-render/recommendation-payload.ts` | Create | Payload schema + spec validator |
| `convex/schema.ts` | Modify | Add fields |
| `convex/messages.ts` | Modify | Accept new fields in mutation |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Model doesn't call tool when it should | System prompt instruction + tool description guide usage. Fallback: user types manually. |
| Model calls tool when it shouldn't (validation turn) | Tool not registered during non-drafting status. Model can't call what doesn't exist. |
| Tool compile fails (bad option IDs) | `execute` normalizes IDs with slugify + dedup. Same proven logic from v1. |
| Payload too large for Convex | JSON-serialized string, same as v1. Payloads are small (~2KB). |
| Fallback provider doesn't support tools | User sees prose only, types manually. Card is enhancement, not gate. |

## Verification Plan

1. `npm run typecheck` — zero errors
2. `npx eslint src/app/api/chat/route.ts src/lib/ai/paper-tools.ts` — clean
3. Unit tests for spec compilation (tool execute logic)
4. Unit tests for payload parsing and validation
5. Unit tests for history rehydration
6. Browser: gagasan stage → model writes context + calls tool → card appears
7. Browser: click option → submit → model sees choice → continues workflow
8. Browser: refresh → card rehydrated from DB
9. Browser: validation panel still appears correctly after stage submission
10. Terminal: single `[ASSISTANT-DIAG][persist]` per turn (no duplicates)
11. Terminal: no `[JSONR-DIAG]` logs (entire skip system removed)
