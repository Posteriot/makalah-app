# Implementation Plan: Json Renderer V2 — Tool-Based Interactive Card

Date: 2026-03-18
Design doc: `2026-03-18-json-renderer-v2-design.md` (verified, patched)
Rollback point: tag `safe-rollback-pre-jsonrenderer-v2` (commit `be20116c`)

## Implementation Layers

The implementation is split into 4 layers, each independently testable. A layer must be complete and verified before the next begins.

```
Layer 1: Foundation (schema + payload + catalog)
    ↓
Layer 2: Tool + Compilation (emitChoiceCard tool in paper-tools)
    ↓
Layer 3: Stream + Persist (route.ts interception, persist, system prompt)
    ↓
Layer 4: Frontend (components, render, rehydration, submit)
```

## Pre-Implementation Checklist

- [ ] `npm run typecheck` passes (baseline)
- [ ] `npx vitest run` full suite passes (baseline count: ~637 tests)
- [ ] Dev server starts cleanly
- [ ] Tag `safe-rollback-pre-jsonrenderer-v2` confirmed at `be20116c`

---

## Layer 1: Foundation

### Task 1.1: Convex Schema — Add Choice Fields

**File**: `convex/schema.ts`

Add to messages table:
```typescript
jsonRendererChoice: v.optional(v.string()),
uiMessageId: v.optional(v.string()),  // top-level for legacy compat
```

Add `uiMessageId` inside metadata object:
```typescript
metadata: v.optional(v.object({
  model: v.optional(v.string()),
  tokens: v.optional(v.number()),
  finishReason: v.optional(v.string()),
  uiMessageId: v.optional(v.string()),
})),
```

**File**: `convex/messages.ts`

Update `createMessage` args to accept:
```typescript
jsonRendererChoice: v.optional(v.string()),
```

**Verify**: `npx convex dev --typecheck=enable --once` passes schema validation.

### Task 1.2: Choice Payload Schema

**File**: `src/lib/json-render/choice-payload.ts` (NEW)

Define the payload schema that represents a compiled choice card. Extract and generalize from v1's `recommendation-payload.ts` (in backup branch).

Key types:
```typescript
export type JsonRendererChoicePayload = {
  version: 1
  engine: "json-render"
  stage: string  // PaperStageId
  kind: "single-select"
  spec: JsonRendererChoiceSpec
  initialState: { selection: { selectedOptionId: string | null; customText: string } }
  options: Array<{ id: string; label: string }>
}

export type JsonRendererChoiceSpec = {
  root: string
  elements: Record<string, JsonRendererElement>
}
```

Include:
- `parseJsonRendererChoicePayload(payload: unknown)` — Zod parse
- `cloneSpecWithReadOnlyState(spec)` — disable all interactive elements
- Spec validation with `superRefine` (root exists, children resolve, per-component prop validation)

**Verify**: Unit test — parse valid payload, reject invalid, clone produces read-only spec.

### Task 1.3: Component Catalog

**File**: `src/lib/json-render/catalog.ts` (NEW)

Define Zod prop schemas for each component type:
- `ChoiceCardShell` — props: `title: string`
- `ChoiceOptionButton` — props: `optionId: string, label: string, recommended: boolean, selected: boolean, disabled: boolean`
- `ChoiceTextarea` — props: `label: string, placeholder?: string, disabled: boolean`
- `ChoiceSubmitButton` — props: `label: string, disabled: boolean`

**Verify**: Unit test — validate prop shapes.

### Task 1.4: Submit Event Contracts

**File**: `src/lib/chat/choice-submit.ts` (NEW)

- `buildChoiceInteractionEvent(params)` — builds `paper.choice.submit` event
- `buildChoiceSyntheticText(params)` — builds `[Choice: {stage}] Pilihan: {label}`

**File**: `src/lib/chat/choice-request.ts` (NEW)

- `parseOptionalChoiceInteractionEvent(body)` — extract from request body
- `validateChoiceInteractionEvent(params)` — validate stage, conversationId, paper mode
- `buildChoiceContextNote(event)` — build context note for model (decision-to-draft or validation-ready)

**Verify**: Unit test — event shape, synthetic text, context note for both modes.

### Layer 1 Gate

After all 1.x tasks:
- `npm run typecheck` passes
- `npx convex dev --typecheck=enable --once` passes
- Unit tests for payload, catalog, submit, request all pass
- **Commit**: "feat: add choice card foundation — schema, payload, catalog, submit contracts"

---

## Layer 2: Tool + Compilation

### Task 2.1: Spec Compilation Logic

**File**: `src/lib/json-render/compile-choice-spec.ts` (NEW)

Deterministic compiler that takes model's tool input and produces a full json-render spec:

```typescript
export function compileChoiceSpec(params: {
  stage: string
  kind: "single-select"
  title: string
  options: Array<{ id: string; label: string }>
  recommendedId?: string
  submitLabel?: string
  appendValidationOption?: boolean
}): { spec: JsonRendererChoiceSpec; normalizedOptions: Array<{ id: string; label: string }> }
```

Logic:
1. Slugify and dedup option IDs
2. If `appendValidationOption`, add "Sudah cukup, lanjut validasi"
3. Build root element (`ChoiceCardShell`)
4. Build option elements (`ChoiceOptionButton` per option)
5. Build submit element (`ChoiceSubmitButton`)
6. Wire event bindings (setState on press, submitChoice on submit)
7. Return compiled spec + normalized option list

Reuse `slugifyRecommendationId`, `normalizeRecommendationDraft`, and `buildSpecFromDraft` logic from v1 backup.

**Verify**: Unit test — compile with various inputs, verify spec structure, verify validation option appended, verify ID normalization.

### Task 2.2: `emitChoiceCard` Tool

**File**: `src/lib/ai/paper-tools.ts` (MODIFY)

Add tool inside `createPaperTools`:

```typescript
...(isPhaseOneDraftingStage ? {
  emitChoiceCard: tool({
    description: "Present an interactive choice card...",
    inputSchema: z.object({
      kind: z.enum(["single-select"]),
      title: z.string().min(1),
      options: z.array(z.object({
        id: z.string().min(1),
        label: z.string().min(1),
      })).min(2).max(5),
      recommendedId: z.string().optional(),
      submitLabel: z.string().max(40).optional(),
    }),
    execute: async (input) => {
      const { spec, normalizedOptions } = compileChoiceSpec({
        stage: currentStage,
        kind: input.kind,
        title: input.title,
        options: input.options,
        recommendedId: input.recommendedId,
        submitLabel: input.submitLabel,
        appendValidationOption: true,
      })
      const selectedOptionId = input.recommendedId
        ? normalizedOptions.find(o => o._originalId === input.recommendedId)?.id ?? null
        : null
      return {
        success: true,
        payload: parseJsonRendererChoicePayload({
          version: 1,
          engine: "json-render",
          stage: currentStage,
          kind: input.kind,
          spec,
          initialState: { selection: { selectedOptionId, customText: "" } },
          options: normalizedOptions.map(o => ({ id: o.id, label: o.label })),
        }),
      }
    },
  }),
} : {}),
```

Gating: `isPhaseOneDraftingStage` = `(stage === "gagasan" || stage === "topik" || stage === "outline") && stageStatus === "drafting"`

**Verify**: Unit test — tool execute produces valid payload, normalization works, validation option appended.

### Layer 2 Gate

After all 2.x tasks:
- `npm run typecheck` passes
- Unit tests for compilation and tool execute pass
- **Commit**: "feat: add emitChoiceCard tool with deterministic spec compilation"

---

## Layer 3: Stream + Persist

### Task 3.1: Stream Loop Interception

**File**: `src/app/api/chat/route.ts` (MODIFY)

In the primary `for await` chunk loop, add interception BEFORE the default `writer.write(chunk)`:

```typescript
if (chunk.type === "tool-output-available") {
  const output = (chunk as any).output
  if (output?.success && output?.payload?.engine === "json-render") {
    streamChoicePayload = output.payload
    ensureStart()
    writer.write({
      type: "data-json-renderer-choice",
      id: `${messageId}-json-renderer-choice`,
      data: output.payload,
    })
  }
  ensureStart()
  writer.write(chunk)
  continue
}
```

Declare `let streamChoicePayload: JsonRendererChoicePayload | null = null` at stream scope.

Mirror same logic in fallback stream loop.

### Task 3.2: Persistence Integration

**File**: `src/app/api/chat/route.ts` (MODIFY)

In `saveAssistantMessage` function, add `jsonRendererChoice` parameter:

```typescript
const saveAssistantMessage = async (
  content: string,
  sources?: ...,
  usedModel?: string,
  reasoningTrace?: ...,
  uiMessageId?: string,
  jsonRendererChoice?: JsonRendererChoicePayload
)
```

Serialize to JSON string before passing to Convex:
```typescript
const serializedChoice = jsonRendererChoice ? JSON.stringify(jsonRendererChoice) : undefined
```

Pass `streamChoicePayload` at both persist points:
- Stream `finish` handler
- `onFinish` callback (already captured, just pass through)

### Task 3.3: System Prompt Injection

**File**: `src/app/api/chat/route.ts` (MODIFY)

In `fullMessagesBase` construction, inject when tool is available:

```typescript
...(isPhaseOneDraftingStage ? [{
  role: "system" as const,
  content: CHOICE_CARD_INSTRUCTION,  // The "INTERACTIVE CHOICE CARD:" text from design doc
}] : []),
```

Define `CHOICE_CARD_INSTRUCTION` as a const near the top of the handler, or import from a shared file.

`isPhaseOneDraftingStage` is derived from `paperStageScope` and `paperSession?.stageStatus`.

### Task 3.4: Interaction Event Handling

**File**: `src/app/api/chat/route.ts` (MODIFY)

In the request body parsing section:
1. Parse `interactionEvent` using `parseOptionalChoiceInteractionEvent`
2. Validate using `validateChoiceInteractionEvent`
3. Build context note using `buildChoiceContextNote`
4. Inject context note into `fullMessagesBase`

This replaces the v1 `stage-recommendation-request.ts` logic with the new `choice-request.ts`.

### Layer 3 Gate

After all 3.x tasks:
- `npm run typecheck` passes
- `npx eslint src/app/api/chat/route.ts` clean
- Dev server starts, no runtime errors
- Manual test: send message in gagasan stage → check terminal for tool call + `data-json-renderer-choice` emission
- **Commit**: "feat: wire emitChoiceCard through stream loop with persist and system prompt"

---

## Layer 4: Frontend

### Task 4.1: Card Components

**Directory**: `src/components/chat/json-renderer/` (NEW)

Copy from v1 backup and rename:
- `ChoiceCardShell.tsx` — card container with title + children slot
- `ChoiceOptionButton.tsx` — selectable option with radio-like behavior, reads from `/selection/selectedOptionId`
- `ChoiceTextarea.tsx` — bound textarea for custom input
- `ChoiceSubmitButton.tsx` — submit button with send icon

**File**: `src/components/chat/json-renderer/registry.tsx` (NEW)

Register components + `submitChoice` action handler.

**File**: `src/components/chat/json-renderer/JsonRendererChoiceBlock.tsx` (NEW)

Top-level wrapper:
- Takes `payload`, `isSubmitted`, `onSubmit` callback
- Sets up `JSONUIProvider` with registry, initial state, action handlers
- If submitted: clone spec with read-only state
- Renders via `<Renderer>`

### Task 4.2: MessageBubble Integration

**File**: `src/components/chat/MessageBubble.tsx` (MODIFY)

Add extractor:
```typescript
function extractJsonRendererChoice(uiMessage: UIMessage): JsonRendererChoicePayload | null
```

In render section:
- If payload found, render `<JsonRendererChoiceBlock>`
- Skip rendering `tool-emitChoiceCard` parts (hide default tool UI)
- Pass `isSubmitted` based on submission key lookup
- Pass `onSubmit` callback that builds interactionEvent and calls `sendMessage`

### Task 4.3: ChatWindow — Submit Handler

**File**: `src/components/chat/ChatWindow.tsx` (MODIFY)

Add submit handler:
```typescript
const handleChoiceSubmit = useCallback((params: {
  sourceMessageId: string
  choicePartId: string
  payload: JsonRendererChoicePayload
  selectedOptionId: string
  customText?: string
}) => {
  const event = buildChoiceInteractionEvent({ ... })
  const syntheticText = buildChoiceSyntheticText({ ... })
  sendUserMessageWithContext({
    text: syntheticText,
    mode: "inherit",
    body: { interactionEvent: event },
  })
}, [sendUserMessageWithContext])
```

Track submitted cards:
```typescript
const [submittedChoiceKeys, setSubmittedChoiceKeys] = useState<Set<string>>(new Set())
```

Pass `isSubmitted` and `onSubmit` down to MessageBubble.

### Task 4.4: ChatWindow — History Rehydration

**File**: `src/components/chat/ChatWindow.tsx` (MODIFY)

In the history message mapping (`mappedMessages`):
```typescript
const rawChoice = (msg as any).jsonRendererChoice
if (rawChoice) {
  const choicePayload = JSON.parse(rawChoice)
  parts.push({
    type: "data-json-renderer-choice",
    id: `${persistedUiMessageId}-json-renderer-choice`,
    data: choicePayload,
  })
}
```

Reconstruct submission keys from persisted metadata:
```typescript
const interaction = (msg as any)?.metadata?.interaction
if (interaction?.type === "paper_choice") {
  submittedKeys.add(`${interaction.sourceMessageId}::${interaction.choicePartId}`)
}
```

### Layer 4 Gate

After all 4.x tasks:
- `npm run typecheck` passes
- Unit tests for components pass
- Browser: card renders in gagasan stage
- Browser: click + submit works
- Browser: refresh → card rehydrated
- Browser: submitted card is read-only
- Browser: validation panel still works
- **Commit**: "feat: render interactive choice cards in chat with submit and rehydration"

---

## Post-Implementation Verification

### Automated
```bash
npm run typecheck
npx eslint src/app/api/chat/route.ts src/lib/ai/paper-tools.ts
npx vitest run  # full suite
```

### Browser (manual)

| # | Test Case | Expected | Bug/Feature |
|---|-----------|----------|-------------|
| 1 | Gagasan → model presents options | Prose + card, no option list in prose | Visual language |
| 2 | Click option → submit | Model continues with chosen direction | Submit flow |
| 3 | Refresh after card | Card rehydrated, submitted cards read-only | Persistence |
| 4 | Click "Sudah cukup" | Model calls validation tools | Validation flow |
| 5 | Validation panel after submit | Panel appears promptly | No interference |
| 6 | Topik stage same flow | Card works in topik | Multi-stage |
| 7 | Outline stage same flow | Card works in outline | Multi-stage |
| 8 | Card without recommendedId | No pre-selection | Neutral options |
| 9 | Non-phase-one stage (abstrak) | No card, model writes prose | Tool gating |
| 10 | Approval turn | No card | Natural gating |
| 11 | Terminal: persist logs | Single `[ASSISTANT-DIAG][persist]` per turn | No duplicate |
| 12 | Full workflow gagasan→topik→outline | Smooth transitions, no stuck stages | Workflow health |

### Rollback

```bash
git reset --hard safe-rollback-pre-jsonrenderer-v2
```

All changes are on top of the tagged commit. Single command reverts everything.
