# Design Doc: Json Renderer v3 — YAML Text-Based Visual Language

Date: 2026-03-19
Context: `2026-03-19-temuan-arsitektural-tool-vs-yaml.md`
Supersedes: v2 tool-based approach (failed — model does not proactively call tools)
Reference: `https://github.com/vercel-labs/json-render`, `@json-render/yaml` package

## Scope

All 14 paper stages during `stageStatus === "drafting"`. The choice card is not limited to specific stages — it is the model's visual language across the entire workflow. The model decides when to use it based on conversation context.

## Overview

The model emits interactive cards by writing YAML specs as text in its response — the same way it writes code blocks. This is the model's **visual language**: prose for analysis, YAML for structured interaction. No tool calling. No extra LLM calls. No skip logic. Works in ALL code paths including web search compose.

The `@json-render/yaml` package provides `pipeYamlRender()` — a stream transform that intercepts YAML code fences from text, parses them into specs, and emits `data-spec` parts to the frontend (constant: `SPEC_DATA_PART_TYPE = "data-" + "spec"`). The `yamlPrompt()` function auto-generates system prompts from the component catalog.

## Constraints

1. **Zero workflow interference** — card must not block or delay `submitStageForValidation`, validation panel, or stream closure.
2. **Zero extra LLM calls** — model writes YAML directly, no second-pass extraction.
3. **Zero skip logic** — no code-level gating per stage or stageStatus. Model decides when to write YAML.
4. **Shell chat architecture intact** — uses `createUIMessageStream`, `writer.merge`, and message parts extraction.
5. **User always has text fallback** — if model doesn't write YAML, user types manually.
6. **Model does not gain new authority** — the card presents choices. Clicking sends an `interactionEvent` to the API. The application decides what to do with it. The model does not directly mutate paper session state through the card.

## Architecture

```
MODEL                          STREAM TRANSFORM                    FRONTEND
  │                                │                                  │
  ├─ prose text ──────────────────►├─ pass through as text ──────────►│ render prose
  │                                │                                  │
  ├─ ```yaml-spec                  │                                  │
  │  root: card                    │                                  │
  │  elements:                     │                                  │
  │    card:                       │                                  │
  │      type: ChoiceCardShell     │                                  │
  │      ...                       │                                  │
  ├─ ```                           │                                  │
  │       │                        │                                  │
  │       ▼                        │                                  │
  │  pipeYamlRender() intercepts   │                                  │
  │  YAML fence, parses it         │                                  │
  │       │                        │                                  │
  │       ▼                        │                                  │
  │                                ├─ emit data-spec patches ────────►│ render card
  │                                │                                  │
  ├─ more prose ──────────────────►├─ pass through as text ──────────►│ render prose
  │                                │                                  │
  ├─ finish ──────────────────────►├─ persist spec + text ───────────►│
```

## Why This Works Where Tool-Based Failed

| Problem with tool-based | How YAML-text solves it |
|------------------------|------------------------|
| Model must deliberate "call tool now" | Model writes YAML naturally — same as writing a code block |
| Web search compose has no tools | YAML is text — works in ALL streamText paths |
| 4 prompt iterations couldn't force proactive behavior | YAML output is inline with text — model's natural output flow |
| Tool registration gating needed | Not needed — model writes YAML when it decides to |
| Complex stream interception (toolCallId mapping) | `pipeYamlRender()` handles everything — drop-in transform |

## Component 1: Install @json-render/yaml

```bash
npm install @json-render/yaml yaml
```

## Component 2: System Prompt via yamlPrompt()

`yamlPrompt(catalog, options)` auto-generates a system prompt from the choice catalog. It tells the model:
- What components are available (names, props, descriptions)
- The YAML spec format (root, elements, state)
- When to use inline mode (prose + YAML in same response)
- State management ($state references, $bindState bindings)

```typescript
import { yamlPrompt } from "@json-render/yaml"
import { choiceCatalog } from "@/lib/json-render/choice-catalog"

const CHOICE_YAML_PROMPT = yamlPrompt(choiceCatalog.catalog, {
  mode: "inline",
  editModes: ["merge"],
  system: `You have two communication channels: text and interactive cards.
Text is for analysis, context, reasoning, and narration.
Interactive cards (via YAML specs) are for guiding, recommending,
confirming, or structuring any moment where user input shapes what happens next.

Use cards proactively — whenever showing is more effective than telling.
Never write numbered lists or bullet-point options in prose when you can
render them as an interactive card instead.`,
})
```

This replaces the manually-written CHOICE_CARD_INSTRUCTION constant. The `yamlPrompt` function generates the complete prompt including:
- Component catalog with prop schemas
- YAML format rules and examples
- State management instructions
- The custom `system` preamble we provide

Inject into `fullMessagesBase` when `isDraftingStage` (same condition as before):

```typescript
...(isDraftingStage
    ? [{ role: "system" as const, content: CHOICE_YAML_PROMPT }]
    : []),
```

## Component 3: Stream Transform — pipeYamlRender()

Replace the manual `tool-output-available` interception with `pipeYamlRender()`.

### Primary stream path (non-web-search)

```typescript
const result = streamText({
    model,
    messages: fullMessagesGateway,
    tools,
    ...samplingOptions,
})

const stream = createUIMessageStream({
    execute: async ({ writer }) => {
        // pipeYamlRender intercepts yaml-spec fences, emits data-spec parts
        writer.merge(pipeYamlRender(result.toUIMessageStream({
            sendStart: false,
            generateMessageId: () => messageId,
            sendReasoning: isTransparentReasoning,
        })))
    },
})
```

This replaces the `for await` chunk loop for spec handling. The loop still exists for reasoning trace and other custom logic — but choice card handling is delegated to `pipeYamlRender`.

**IMPORTANT**: If the existing `for await` loop handles other custom logic (reasoning traces, source detection, etc.), we need to pipe through BOTH:
1. `pipeYamlRender` for YAML → data-spec conversion
2. Custom logic for reasoning, sources, etc.

This may require piping the stream through `pipeYamlRender` first, then iterating the result for custom logic. Or using a two-pass approach. The exact integration depends on whether `writer.merge` and custom chunk iteration can coexist.

### Web search compose path

Same pattern — add `pipeYamlRender` to the compose stream in orchestrator.ts:

```typescript
const composeResult = streamText({
    model: config.composeModel,
    messages: composeMessages,
    ...config.samplingOptions,
})

// In the stream creation, pipe through pipeYamlRender:
writer.merge(pipeYamlRender(composeResult.toUIMessageStream()))
```

This is the critical fix — web search compose now supports choice cards because YAML is text, not a tool.

### Fallback stream path

Same pattern as primary.

## Component 4: Frontend Rendering

### Option A: Use useJsonRenderMessage hook (recommended)

`@json-render/react` provides `useJsonRenderMessage(message)` which extracts `data-spec` parts from UIMessage parts and builds the spec. This replaces our manual `extractJsonRendererChoice` function.

```tsx
import { useJsonRenderMessage } from "@json-render/react"

function MessageBubble({ message }) {
    const { spec, text } = useJsonRenderMessage(message)

    return (
        <>
            {/* Render text parts */}
            <MarkdownRenderer content={text} />

            {/* Render choice card if spec exists */}
            {spec && (
                <JsonRendererChoiceBlock
                    spec={spec}
                    isSubmitted={isChoiceSubmitted}
                    onSubmit={onChoiceSubmit}
                />
            )}
        </>
    )
}
```

### Option B: Manual extraction (if hook doesn't fit our architecture)

If `useJsonRenderMessage` doesn't integrate cleanly with our existing MessageBubble (which has complex parts iteration), we can manually extract `data-spec` parts:

```typescript
function extractSpecFromParts(parts: UIMessage["parts"]): Spec | null {
    // Look for data-spec part type emitted by pipeYamlRender
    for (const part of parts ?? []) {
        if (part.type === "data-spec") {
            // build spec from patches
        }
    }
    return null
}
```

The exact approach depends on how `data-spec` parts integrate with our existing parts iteration in MessageBubble. This needs investigation during implementation.

## Component 5: Persistence

Same as v2 — capture the final spec from the stream and persist as `jsonRendererChoice` JSON string in the messages table.

`pipeYamlRender` emits `data-spec` parts. We need to capture the final compiled spec at stream finish and include it in `saveAssistantMessage`. The `createYamlStreamCompiler` has `getResult()` method that returns the current spec state.

```typescript
// After stream finishes, get the compiled spec
const compiler = createYamlStreamCompiler()
// ... feed chunks through compiler ...
const finalSpec = compiler.getResult()
if (finalSpec) {
    await saveAssistantMessage(text, sources, model, trace, finalSpec, messageId)
}
```

The exact integration depends on how `pipeYamlRender` exposes the compiled spec. If it only emits patches (not the final compiled spec), we may need to maintain a parallel compiler instance that captures the same YAML.

## Component 6: Submit Flow

Unchanged from v2:
- User clicks option → submit → `interactionEvent` sent via sendMessage body
- route.ts parses event → validates → builds context note → injects into messages
- Model continues with chosen direction

The `choice-submit.ts` and `choice-request.ts` contracts remain identical.

## Component 7: History Rehydration

Parse `jsonRendererChoice` from persisted message. The persisted data is the compiled spec (same structure as what `pipeYamlRender` produces). On rehydration, inject it as a `data-spec` part with type `flat` (a complete spec, not incremental patches):

```typescript
const rawChoice = (historyMsg as Record<string, unknown>)?.jsonRendererChoice
if (rawChoice && typeof rawChoice === "string") {
    const spec = JSON.parse(rawChoice)
    // Inject as data-spec part with flat type — same format useJsonRenderMessage expects
    parts.push({
        type: "data-spec", // SPEC_DATA_PART_TYPE from @json-render/core
        data: { type: "flat", spec },
    })
}
```

This uses the `flat` discriminator from `isSpecDataPart` validation in `@json-render/react`. During streaming, `pipeYamlRender` emits `patch` type parts (incremental). During rehydration from DB, we emit `flat` type (complete spec). The frontend `buildSpecFromParts` handles both.

### Part Type Compatibility

`data-spec` (`SPEC_DATA_PART_TYPE`) is the part type used by `@json-render/yaml` and consumed by `@json-render/react`. This replaces our custom `data-json-renderer-choice` type. The existing MessageBubble parts iteration must be updated to recognize `data-spec` instead of `data-json-renderer-choice`. The `extractJsonRendererChoice` function is replaced by `useJsonRenderMessage` or manual `data-spec` extraction.

## What Changes vs V2

| Area | V2 (tool-based) | V3 (YAML text-based) |
|------|-----------------|----------------------|
| Emission mechanism | `emitChoiceCard` tool call | Model writes yaml-spec code fence |
| Stream handling | Manual `tool-output-available` interception + toolCallId map | `pipeYamlRender()` drop-in transform |
| System prompt | Manual CHOICE_CARD_INSTRUCTION | `yamlPrompt(catalog)` auto-generated |
| Web search support | No — compose step has no tools | Yes — YAML is text |
| Tool registration | Conditional per stage + stageStatus | Not needed |
| paper-tools.ts | Added `emitChoiceCard` tool | Remove `emitChoiceCard` tool |
| New dependency | None | `@json-render/yaml`, `yaml` |
| Frontend extraction | Manual `extractJsonRendererChoice` | `useJsonRenderMessage` hook or `data-spec` part extraction |

## What Does NOT Change

- Frontend components (ChoiceCardShell, ChoiceOptionButton, etc.)
- choice-catalog.ts catalog definition
- registry.tsx + JSONUIProvider + Renderer pattern
- choice-payload.ts types (may need adaptation for spec format)
- Convex schema (jsonRendererChoice field)
- choice-submit.ts event builder
- choice-request.ts event parser + context note
- Submit flow (interactionEvent → context note → model continues)
- Read-only lock after submission (cloneSpecWithReadOnlyState)

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Model outputs malformed YAML | Catalog constrains valid components; pipeYamlRender validates structure |
| Model doesn't write YAML at all | yamlPrompt + stage skill instructions guide model; fallback: user types manually |
| YAML code fence visible to user briefly | pipeYamlRender strips fences from text stream; user sees clean prose + card |
| Spec too large for persistence | Same as v2 — JSON-serialized string, typically ~2KB |
| Conflict with existing code block rendering | yaml-spec fence type is distinct from generic code fences |

## Open Questions (Must Be Resolved During Implementation via Code Investigation)

1. **pipeYamlRender + existing for-await loop**: Can they coexist? The existing loop handles reasoning traces, source detection, etc. Need to verify if `writer.merge(pipeYamlRender(...))` can be combined with custom chunk iteration, or if we need to pipe the stream through pipeYamlRender first and then iterate the result.

2. **Spec capture for persistence**: How to capture the final compiled spec for DB persistence. `pipeYamlRender` may not expose this directly. Options: (a) maintain a parallel `createYamlStreamCompiler` instance, (b) intercept `data-spec` parts after pipeYamlRender, (c) read back from the stream. Must be verified by reading `pipeYamlRender` source.

3. **State management**: Does `yamlPrompt` include instructions for `$state` references and `$bindState` bindings? The choice card needs `/selection/selectedOptionId` state tracking. The `yamlPrompt` source shows it generates state management documentation, but the exact format must be verified against our catalog's action params that use `$state`.
