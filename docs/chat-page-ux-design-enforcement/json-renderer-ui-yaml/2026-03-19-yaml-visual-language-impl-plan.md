# Json Renderer v3 — YAML Visual Language Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace tool-based choice card emission with YAML text-based emission using `@json-render/yaml`. Model writes YAML specs as text in code fences — no tool calling required.

**Architecture:** Model writes prose + `yaml-spec` code fence in one response → `pipeYamlRender()` transform intercepts YAML from text stream → emits `data-spec` parts to frontend → existing components render the card. Parallel `createYamlStreamCompiler()` captures final spec for DB persistence.

**Tech Stack:** `@json-render/yaml` (v0.14.1), `@json-render/core` (v0.14.1), `@json-render/react` (reinstall needed), `yaml` package, existing choice card components.

**Design doc:** `docs/chat-page-ux-design-enforcement/json-renderer-ui-yaml/2026-03-19-yaml-visual-language-design.md`

**Critical facts from code investigation:**
- Part type: `data-spec` (from `SPEC_DATA_PART_TYPE = "data-" + "spec"`)
- `pipeYamlRender()` returns `ReadableStream` — can be iterated with `for await`
- Spec capture: use separate `createYamlStreamCompiler()`, feed text chunks, call `getResult()`
- `yamlPrompt(catalog, { mode: "inline" })` generates complete system prompt including state docs

---

## Pre-Implementation: Revert V2 Tool-Based Code

### Task 0: Remove emitChoiceCard tool and stream interception

**Why:** V2 tool-based code must be removed before adding YAML-based code. The tool, stream interception, and manual CHOICE_CARD_INSTRUCTION are replaced entirely by pipeYamlRender + yamlPrompt.

**Files:**
- Modify: `src/lib/ai/paper-tools.ts` — remove `emitChoiceCard` tool block, remove `compileChoiceSpec` and `parseJsonRendererChoicePayload` imports, remove `paperStageScope`/`paperStageStatus` from context type
- Modify: `src/app/api/chat/route.ts` — remove CHOICE_CARD_INSTRUCTION constant, remove `isDraftingStage` and its injection in fullMessagesBase, remove `tool-output-available` interception block + toolCallIdToName map (primary + fallback), remove `primaryStreamChoicePayload`/`fallbackStreamChoicePayload` variables, remove `paperStageScope`/`paperStageStatus` from createPaperTools call, remove `[CHOICE-CARD]` diagnostic logs related to tool flow
- Modify: `src/lib/ai/paper-mode-prompt.ts` — remove choice card reinforcement line from GENERAL RULES

**Keep intact:**
- `src/lib/json-render/choice-catalog.ts` — reused by yamlPrompt
- `src/lib/json-render/choice-payload.ts` — reused for persistence types (may need adaptation)
- `src/lib/chat/choice-submit.ts` — unchanged
- `src/lib/chat/choice-request.ts` — unchanged
- `src/components/chat/json-renderer/` — all components unchanged
- `convex/schema.ts` and `convex/messages.ts` — unchanged
- `saveAssistantMessage` — keep the jsonRendererChoice + uiMessageId params (used by new approach too)

**Step 1:** Make all removals described above.

**Step 2:** Run `npm run typecheck`. There will be errors from MessageBubble/ChatWindow referencing removed types — that's expected, those get fixed in later tasks.

**Step 3:** Commit: `refactor: remove v2 tool-based emitChoiceCard (replaced by YAML text emission)`

---

## Layer 1: YAML Stream Integration

### Task 1: Install packages + generate yamlPrompt

**Files:**
- Modify: `package.json` — ensure `@json-render/yaml`, `@json-render/react`, `yaml` in dependencies
- Create: `src/lib/json-render/choice-yaml-prompt.ts`

**Step 1:** Install packages:
```bash
npm install @json-render/yaml @json-render/react yaml
```

**Step 2:** Create `src/lib/json-render/choice-yaml-prompt.ts`:

```typescript
import { yamlPrompt } from "@json-render/yaml"
import { choiceCatalog } from "./choice-catalog"

export const CHOICE_YAML_SYSTEM_PROMPT = yamlPrompt(choiceCatalog.catalog, {
  mode: "inline",
  editModes: ["merge"],
  system: `You have two communication channels: text and interactive cards.
Text is for analysis, context, reasoning, and narration.
Interactive cards (via YAML specs) are for guiding, recommending,
confirming, or structuring any moment where user input shapes what happens next.

Use cards proactively — whenever showing is more effective than telling.
Never write numbered lists or bullet-point options in prose when you can
render them as an interactive card instead.`,
  customRules: [
    "When presenting research angles, topic options, methodology choices, or any 2+ alternatives — use a card.",
    "The ChoiceSubmitButton action params MUST use $state references: { selectedOptionId: { $state: '/selection/selectedOptionId' }, customText: { $state: '/selection/customText' } }",
    "Always include initial state: state: { selection: { selectedOptionId: null, customText: '' } }",
    "Include a 'Sudah cukup, lanjut validasi' option in every card to let the user fast-track to validation.",
  ],
})
```

**Step 3:** Verify the generated prompt by logging it:
```bash
npx tsx -e "import { CHOICE_YAML_SYSTEM_PROMPT } from './src/lib/json-render/choice-yaml-prompt'; console.log(CHOICE_YAML_SYSTEM_PROMPT)"
```

Verify the output includes: component catalog, state management docs, YAML format rules, inline mode instructions.

**Step 4:** Run `npm run typecheck` — verify no new errors from this file.

**Step 5:** Commit: `feat: generate YAML visual language system prompt from choice catalog`

---

### Task 2: Wire pipeYamlRender into route.ts primary stream

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1:** Add imports:
```typescript
import { pipeYamlRender, createYamlStreamCompiler } from "@json-render/yaml"
import type { Spec } from "@json-render/core"
import { CHOICE_YAML_SYSTEM_PROMPT } from "@/lib/json-render/choice-yaml-prompt"
```

**Step 2:** Inject CHOICE_YAML_SYSTEM_PROMPT into fullMessagesBase (same position where CHOICE_CARD_INSTRUCTION was):
```typescript
...(isDraftingStage
    ? [{ role: "system" as const, content: CHOICE_YAML_SYSTEM_PROMPT }]
    : []),
```

Re-add `isDraftingStage` derivation if it was removed in Task 0:
```typescript
const isDraftingStage = !!paperStageScope && paperSession?.stageStatus === "drafting"
```

**Step 3:** Replace the primary stream creation. The existing pattern is a `for await` loop that handles reasoning, sources, and custom logic. We need to:
1. Pipe through `pipeYamlRender` for YAML → `data-spec` conversion
2. Maintain a parallel `createYamlStreamCompiler` for spec capture
3. Keep existing reasoning/source logic

The approach: iterate the OUTPUT of `pipeYamlRender` (since it returns a ReadableStream):

```typescript
// Create compiler for spec capture
const yamlCompiler = createYamlStreamCompiler<Spec>()
let capturedSpec: Spec | null = null

const uiStream = result.toUIMessageStream({
    sendStart: false,
    generateMessageId: () => messageId,
    sendReasoning: isTransparentReasoning,
})

// Pipe through YAML transform
const yamlTransformed = pipeYamlRender(uiStream)

// Iterate the transformed stream for custom logic
for await (const chunk of yamlTransformed) {
    // Feed text chunks to parallel compiler for persistence
    if (chunk.type === "text-delta") {
        const delta = (chunk as { delta?: string }).delta ?? ""
        yamlCompiler.push(delta)
    }

    // Existing reasoning logic
    if (chunk.type === "reasoning-start" || chunk.type === "reasoning-delta" || chunk.type === "reasoning-end") {
        // ... existing reasoning handling ...
        continue
    }

    // Existing source detection
    if (chunk.type === "source-url") {
        sourceCount += 1
        emitTrace(reasoningTrace.markSourceDetected())
    }

    // Existing tool-input-start trace
    if (chunk.type === "tool-input-start") {
        const toolName = getToolNameFromChunk(chunk)
        emitTrace(reasoningTrace.markToolRunning(toolName))
    }

    // Finish/error/abort handling (existing)
    if (chunk.type === "finish") {
        // Capture final spec
        const { result: finalResult } = yamlCompiler.flush()
        if (finalResult && Object.keys(finalResult).length > 0) {
            capturedSpec = finalResult
            console.info(`[CHOICE-CARD][yaml-capture] stage=${paperStageScope} specKeys=${Object.keys(finalResult).join(",")}`)
        }
        // ... existing finish logic ...
        writer.write(chunk)
        break
    }

    if (chunk.type === "error" || chunk.type === "abort") {
        // ... existing error/abort logic ...
        writer.write(chunk)
        break
    }

    // Pass through all chunks (including data-spec parts from pipeYamlRender)
    ensureStart()
    writer.write(chunk)
}
```

**IMPORTANT:** The exact integration depends on whether `pipeYamlRender` output preserves reasoning chunks, tool chunks, etc. If it strips non-text chunks, we need a different approach. VERIFY by logging chunk types during a test run.

**Step 4:** Pass captured spec to saveAssistantMessage:
```typescript
// In onFinish or stream finish handler:
await saveAssistantMessage(
    persistedContent,
    sources,
    model,
    reasoningTrace,
    capturedSpec ? { spec: capturedSpec } as any : undefined,  // Adapt to persistence format
    messageId
)
```

**Step 5:** Run `npm run typecheck`.

**Step 6:** Commit: `feat: wire pipeYamlRender into primary stream path`

---

### Task 3: Wire pipeYamlRender into web search compose + fallback

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts` — add pipeYamlRender to compose stream
- Modify: `src/app/api/chat/route.ts` — add pipeYamlRender to fallback stream

**Step 1:** In orchestrator.ts compose step, pipe through pipeYamlRender:
```typescript
import { pipeYamlRender } from "@json-render/yaml"

// In the compose stream creation:
const composeStream = composeResult.toUIMessageStream()
const yamlTransformed = pipeYamlRender(composeStream)
// Use yamlTransformed instead of composeStream for the writer
```

Also inject CHOICE_YAML_SYSTEM_PROMPT into compose system messages. Import and add to `composeSystemMessages` array.

**Step 2:** Same pattern in fallback stream in route.ts.

**Step 3:** Run `npm run typecheck`.

**Step 4:** Commit: `feat: wire pipeYamlRender into web search compose and fallback streams`

---

## Layer 2: Frontend Adaptation

### Task 4: Update MessageBubble to extract data-spec parts

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

**Step 1:** Replace `extractJsonRendererChoice` with `data-spec` extraction:

```typescript
import { SPEC_DATA_PART_TYPE } from "@json-render/core"

function extractChoiceSpec(uiMessage: UIMessage): Spec | null {
    // Build spec from data-spec parts (patches applied incrementally)
    let spec: Spec | null = null
    for (const part of uiMessage.parts ?? []) {
        if (!part || typeof part !== "object") continue
        const dataPart = part as unknown as { type?: string; data?: unknown }
        if (dataPart.type !== SPEC_DATA_PART_TYPE) continue
        // Apply patch or set flat spec
        const data = dataPart.data as { type?: string; spec?: Spec; patch?: unknown } | null
        if (!data) continue
        if (data.type === "flat" && data.spec) {
            spec = data.spec
        }
        // For patches, apply incrementally (may need applySpecPatch from core)
    }
    return spec
}
```

**NOTE:** The exact extraction logic depends on how `data-spec` parts are structured. During implementation, log `message.parts` to see exact shape. `buildSpecFromParts` from `@json-render/react` may handle this — check if it exists in the installed version.

**Step 2:** Update render logic to use extracted spec with `JsonRendererChoiceBlock`.

**Step 3:** Remove `emitChoiceCard` tool part hiding (no longer needed).

**Step 4:** Run `npm run typecheck`.

**Step 5:** Commit: `feat: update MessageBubble to render data-spec parts as choice cards`

---

### Task 5: Update ChatWindow history rehydration

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1:** Update rehydration to inject `data-spec` parts with `flat` type:

```typescript
const rawChoice = (historyMsg as Record<string, unknown>)?.jsonRendererChoice
if (rawChoice && typeof rawChoice === "string") {
    try {
        const spec = JSON.parse(rawChoice)
        parts.push({
            type: SPEC_DATA_PART_TYPE, // "data-spec"
            data: { type: "flat", spec },
        })
    } catch { /* skip */ }
}
```

**Step 2:** Run `npm run typecheck`.

**Step 3:** Commit: `feat: update ChatWindow rehydration for data-spec part type`

---

## Layer 3: Verification

### Task 6: Update stage skill instructions in paperModePrompt

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts`

**Step 1:** Update the GENERAL RULES reinforcement line to reference YAML instead of tool:

```typescript
- When guiding, recommending, or presenting directions to the user, write an interactive card using a yaml-spec code fence — it is your visual language alongside text. Never write options as numbered lists or bullet points when the card is available.
```

**Step 2:** Commit: `fix: update paperModePrompt reinforcement for YAML approach`

---

### Task 7: End-to-end verification

**Step 1:** Run full test suite:
```bash
npm run typecheck
npx vitest run src/lib/json-render/__tests__/ src/lib/chat/__tests__/choice-
```

**Step 2:** Start dev server and test:
1. New paper session → gagasan stage
2. User provides topic → web search turn → model writes analysis + YAML card (THIS IS THE KEY TEST)
3. Card renders in UI
4. User clicks option → submit → model continues
5. Refresh → card rehydrated from DB

**Step 3:** Check terminal logs for `[CHOICE-CARD][yaml-capture]` — confirms spec captured for persistence.

**Step 4:** Final commit: `feat: json renderer v3 — YAML visual language verified end-to-end`

---

## Post-Implementation Verification Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | Gagasan: web search turn | Model writes prose + YAML card IN SAME response |
| 2 | Card renders inline | Choice card appears below prose, options clickable |
| 3 | Submit choice | Model continues with chosen direction |
| 4 | Refresh | Card rehydrated from DB |
| 5 | Submitted card | Read-only state |
| 6 | Validation panel | Still works after submitStageForValidation |
| 7 | Non-drafting status | No YAML prompt injected, model writes prose only |
| 8 | Terminal logs | `[CHOICE-CARD][yaml-capture]` with spec keys |
| 9 | No tool-related code | Zero `emitChoiceCard` references in codebase |
| 10 | All 14 stages | YAML prompt available at all stages during drafting |
