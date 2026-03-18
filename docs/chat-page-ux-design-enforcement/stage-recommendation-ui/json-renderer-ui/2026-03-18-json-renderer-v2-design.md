# Design Doc: Json Renderer V2 — Tool-Based Interactive Card

Date: 2026-03-18 (patched after audit)
Context: `2026-03-18-json-renderer-as-model-visual-language.md`
Scope: Phase one — gagasan, topik, outline — single-select only (architecture extensible to all 14 stages and 4 interaction types)

## Overview

The model emits interactive cards by calling a tool — its **visual language** for any structured decision point where the user should click instead of type. This includes recommendations (with strong preference), neutral options (without preference), and confirmations (yes/no). The backend intercepts the tool output in the stream loop, compiles it into a json-render spec, and emits a `data-json-renderer-choice` part to the UI stream. No second LLM call. No skip logic. No workflow interference.

## Architecture

```
MODEL                    BACKEND (route.ts stream loop)           FRONTEND
  │                              │                                   │
  ├─ text-delta ────────────────►├─ writer.write(chunk) ────────────►│ render prose
  ├─ text-delta ────────────────►├─ writer.write(chunk) ────────────►│
  │                              │                                   │
  ├─ tool-call: emitChoiceCard({...})                        │
  │       │                      │                                   │
  │       ▼                      │                                   │
  │  tool executes (pure,        │                                   │
  │  returns compiled spec)      │                                   │
  │       │                      │                                   │
  │       ▼                      │                                   │
  ├─ tool-output-available ─────►├─ intercept tool output            │
  │                              ├─ emit data-json-renderer-choice ─►│ render card
  │                              ├─ writer.write(chunk) ────────────►│ (tool part hidden)
  │                              │                                   │
  ├─ finish ────────────────────►├─ persist message + payload ──────►│
```

## Component 1: Tool Definition

### Name: `emitChoiceCard`

The name is **generic** — not "recommendation" — because the card serves multiple interaction purposes: recommendations (with preference), neutral options (without preference), and confirmations.

### Input Schema (what model provides)

```typescript
z.object({
  kind: z.enum(["single-select"]).describe(
    "Interaction type. Phase one supports single-select only. Phase two will add: multi-select, ranked-select, action-list."
  ),
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
  recommendedId: z.string().optional().describe(
    "The id of the option you recommend most strongly. Omit if all options are equally valid and you have no strong preference."
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
  // 2. Append global "Sudah cukup, lanjut validasi" option (phase-one stages only)
  // 3. Build json-render spec (root, elements, event bindings)
  // 4. Build initial state:
  //    - If recommendedId provided: pre-select it
  //    - If recommendedId omitted: no pre-selection (null)
  // 5. Return compiled payload

  const selectedOptionId = input.recommendedId
    ? normalizedOptions.find(o => o.id === slugify(input.recommendedId))?.id ?? null
    : null

  return {
    success: true,
    payload: {
      version: 1,
      engine: "json-render",
      stage: currentStage,
      kind: input.kind,
      spec: compiledSpec,
      initialState: { selection: { selectedOptionId, customText: "" } },
      options: normalizedOptions,
    }
  }
}
```

**Key design decisions:**
- `recommendedId` is **optional**. When omitted, no option is pre-selected — the card presents neutral choices.
- State key is `selection` (not `recommendation`) — generic, works for all interaction types.
- `kind` comes from model input — currently only `"single-select"`, but schema is ready for phase-two types.
- "Sudah cukup, lanjut validasi" is auto-appended only during phase-one drafting stages. This option triggers the same validation flow as before: model receives the choice and calls `updateStageData → createArtifact → submitStageForValidation`. The card does NOT directly mutate paper session state.

This reuses the existing `buildSpecFromDraft` logic from v1 — the spec compilation is identical, only the input source changes (model tool call instead of second LLM extraction).

### Tool Registration

Added to paper tools alongside existing tools, gated by stage:

```typescript
// Only available during phase-one drafting stages
if (stage === "gagasan" || stage === "topik" || stage === "outline") {
  if (stageStatus === "drafting") {
    tools.emitChoiceCard = tool({ ... })
  }
}
```

When the tool is not registered, the model cannot call it — natural gating, no skip logic.

### Phase-Two Extensibility

The architecture is designed to extend without breaking changes:

| Phase Two Addition | How It Extends |
|-------------------|----------------|
| More stages (abstrak, metodologi, etc.) | Add stage names to registration gate |
| `multi-select` kind | Add to `kind` enum, change state to `selectedOptionIds: string[]`, add multi-select component |
| `ranked-select` kind | Add to `kind` enum, add `rankedOptionIds` state, add drag/number ranking component |
| `action-list` kind | Add to `kind` enum, change options to include `actionType`, add action button component |

No breaking changes to the tool schema, stream protocol, or persistence format are needed.

## Component 2: Stream Loop Interception

In the `for await` chunk loop in `route.ts`, intercept `tool-output-available` for `emitChoiceCard`:

```typescript
if (chunk.type === "tool-output-available") {
  const output = (chunk as any).output
  if (output?.success && output?.payload) {
    // Store for persistence
    streamChoicePayload = output.payload

    // Emit to UI stream
    ensureStart()
    writer.write({
      type: "data-json-renderer-choice",
      id: `${messageId}-json-renderer-choice`,
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
    streamChoicePayload ?? undefined  // NEW: include payload
  )
}
```

`saveAssistantMessage` already accepts `jsonRendererChoice` parameter (from v1). Convex schema needs the `jsonRendererChoice: v.optional(v.string())` field re-added.

### Fallback Path Mirror

Same interception logic in the fallback `runFallbackWithoutSearch` stream loop.

### onFinish Path

`onFinish` does NOT need to generate the choice payload. It's already captured from the stream. If `streamChoicePayload` exists, include it in the save:

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
      streamChoicePayload ?? undefined  // Already captured
    )
    primaryAssistantMessagePersisted = true
  }
}
```

## Component 3: System Prompt Instruction

Injected as system message when the tool is available (phase-one drafting stages):

```
INTERACTIVE CHOICE CARD:
You have access to the `emitChoiceCard` tool. This is your visual language for presenting
structured choices to the user. Use it whenever the user needs to make a decision by
choosing from 2-5 options — whether that is a recommendation (you have a preference),
a neutral option set (all equally valid), or a confirmation (proceed vs reconsider).

How to use:
1. Write your analysis, context, and reasoning as normal prose.
2. Do NOT list the options as a numbered/bulleted list in your prose. The card replaces
   that section entirely.
3. When you reach the decision point, write a short transition (e.g., "Berikut beberapa
   arah yang bisa dipilih:") and immediately call emitChoiceCard.
4. If you have a strong recommendation, set recommendedId to that option. If all options
   are equally valid, omit recommendedId.
5. After the tool call, you may write a brief closing sentence if needed.

The frontend renders an interactive card. The user clicks their choice instead of typing.

Examples of when to use:
- Presenting research angle options in gagasan stage
- Presenting topic focus alternatives in topik stage
- Presenting outline structure choices in outline stage
- Asking user to confirm a direction (2 options: proceed vs reconsider)
- Any decision point where clicking is faster and clearer than typing

When NOT to use this tool:
- When saving stage data (updateStageData, createArtifact, submitStageForValidation)
- When responding to an approval or revision
- When having a general discussion without concrete options
- When there is only one obvious next step (no real choice needed)
- When the user explicitly asked to type their preference
```

This instruction is the **only** mechanism that guides when the card appears. No code-level skip logic needed. Key enforcement: **"Do NOT list the options as a numbered/bulleted list in your prose"** — this prevents the duplication problem from v1.

## Component 4: Frontend Rendering

### MessageBubble Extraction

Add extractor in `MessageBubble.tsx` following existing pattern:

```typescript
function extractJsonRendererChoice(uiMessage: UIMessage) {
  for (const part of uiMessage.parts ?? []) {
    if (!part || typeof part !== "object") continue
    const dataPart = part as { type?: string; data?: unknown }
    if (dataPart.type !== "data-json-renderer-choice") continue
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

When `emitChoiceCard` tool result appears in `message.parts`, hide the default tool-call UI. The card already renders from the `data-json-renderer-choice` part.

```typescript
// In MessageBubble, skip rendering tool-emitChoiceCard parts
if (part.type === "tool-emitChoiceCard") continue
```

## Component 5: History Rehydration

On page refresh, reconstruct choice card from persisted data:

```typescript
// In ChatWindow history mapping
const rawPayload = (msg as any).jsonRendererChoice
if (rawPayload) {
  const payload = JSON.parse(rawPayload)
  parts.push({
    type: "data-json-renderer-choice",
    id: `${messageId}-json-renderer-choice`,
    data: payload,
  })
}
```

Same pattern as v1 — already proven working.

## Component 6: Submit Flow

When user clicks option + submit in card:

1. Frontend builds `interactionEvent` with selected option ID
2. Frontend sends synthetic user message: `[Choice: {stage}] Pilihan: {selectedLabel}`
3. Chat API receives event, validates stage match, injects context note for model
4. Model sees user's choice and continues workflow (elaborate, save, or present new choices)

### InteractionEvent Schema

```typescript
{
  type: "paper.choice.submit",
  version: 1,
  conversationId: string,
  stage: PaperStageId,
  sourceMessageId: string,          // ID of assistant message containing the card
  choicePartId: string,             // ID of the data-json-renderer-choice part
  kind: "single-select",            // Matches card kind
  selectedOptionIds: [string],      // Array with single ID for single-select
  customText?: string,              // Optional user note alongside selection
  submittedAt: number,              // Timestamp
}
```

### Context Note Injected to Model

When the API receives an interactionEvent, it builds a context note:

```
USER_CHOICE_DECISION:
- Stage: {stage}
- Kind: {kind}
- Selected: {selectedOptionIds}
- Custom note: {customText} (if any)
- Next action: elaborate on the user's chosen direction. If the content is mature enough,
  you may call updateStageData and createArtifact. Do not submit validation automatically.
```

If selected option is "Sudah cukup, lanjut validasi":

```
USER_CHOICE_DECISION:
- Stage: {stage}
- Mode: validation-ready
- Next action: summarize the stage decision, then call updateStageData, createArtifact,
  and submitStageForValidation in sequence. Do not open new branches.
```

### Custom Text Behavior

The card includes an optional text input area. Custom text is:
- Always available alongside option selection
- Submitted as `customText` field in interactionEvent
- Injected into context note so model can see user's additional input
- NOT a replacement for option selection — it's supplementary

### After Submit: Read-Only Lock

After submission, the card becomes read-only:
- Option buttons disabled, selection visually frozen
- Submit button disabled, label changes to "Sudah dikirim"
- Text input disabled
- Lock state determined by checking if a submission key exists for this card's `sourceMessageId + choicePartId`

## What Changes vs V1

| Area | V1 | V2 |
|------|----|----|
| `json-renderer-choice.ts` (LLM generator) | 400 lines, `generateText` call | **DELETED** — no second LLM call |
| `route.ts` skip logic | 6+ conditions, 80+ lines | **ZERO** — tool availability = natural gate |
| `route.ts` stream finish | Build payload + persist | Just persist (payload already captured) |
| `route.ts` onFinish | Build payload + persist | Just persist (payload already captured) |
| `paper-tools.ts` | No choice tool | New `emitChoiceCard` tool |
| System prompt | No card awareness | Card tool usage instruction with anti-duplication rule |
| Spec compilation | In `json-renderer-choice.ts` | In tool `execute` function |
| Naming | "recommendation" everywhere | "choice" — generic for recommendations, options, confirmations |
| `recommendedId` | Required | Optional — supports neutral option presentations |
| State key | `recommendation.selectedOptionId` | `selection.selectedOptionId` — generic |
| `kind` parameter | Hardcoded `single-select` | Model-provided, extensible to phase-two types |

## Schema Changes

### Convex messages table

Re-add field (removed during rollback):

```typescript
jsonRendererChoice: v.optional(v.string()),
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

`createMessage` args must accept `jsonRendererChoice: v.optional(v.string())`.

## Files to Create or Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/ai/paper-tools.ts` | Modify | Add `emitChoiceCard` tool |
| `src/app/api/chat/route.ts` | Modify | Stream loop interception + persist + system instruction |
| `src/components/chat/MessageBubble.tsx` | Modify | Extract + render choice card, hide tool part |
| `src/components/chat/ChatWindow.tsx` | Modify | History rehydration + submit handler |
| `src/components/chat/json-renderer/` | Create | Card components (generalized from v1 backup): `ChoiceCardShell`, `ChoiceOptionButton`, `ChoiceTextarea`, `ChoiceSubmitButton` |
| `src/lib/json-render/catalog.ts` | Create | Component catalog + prop schemas |
| `src/lib/json-render/choice-payload.ts` | Create | Payload schema + spec validator (renamed from recommendation-payload) |
| `src/lib/chat/choice-submit.ts` | Create | Submit event builder + synthetic text generator |
| `src/lib/chat/choice-request.ts` | Create | Interaction event parser + context note builder |
| `convex/schema.ts` | Modify | Add `jsonRendererChoice` field + `uiMessageId` in metadata |
| `convex/messages.ts` | Modify | Accept new fields in mutation |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Model doesn't call tool when it should | System prompt instruction + tool description guide usage. Fallback: user types manually. |
| Model calls tool when it shouldn't (validation turn) | Tool not registered during non-drafting status. Model can't call what doesn't exist. |
| Tool compile fails (bad option IDs) | `execute` normalizes IDs with slugify + dedup. Same proven logic from v1. |
| Payload too large for Convex | JSON-serialized string, same as v1. Payloads are small (~2KB). |
| Fallback provider doesn't support tools | User sees prose only, types manually. Card is enhancement, not gate. |
| Model duplicates options in prose despite instruction | System prompt explicitly forbids it. If it still happens, instruction can be strengthened. Not a functional blocker. |
| Model omits recommendedId when it should recommend | Prompt gives clear guidance. No pre-selection = user chooses freely, which is acceptable fallback. |

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
12. Browser: card with recommendedId → option pre-selected, highlighted
13. Browser: card without recommendedId → no pre-selection, user chooses freely
14. Browser: "Sudah cukup" option → triggers validation flow correctly
15. Browser: model does NOT list options in prose when card is emitted
