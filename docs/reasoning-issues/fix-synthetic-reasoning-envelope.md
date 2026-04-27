# Fix: Synthetic Reasoning-Delta Missing Envelope

## Context

`pipeThinkTagStrip` (src/lib/ai/harness/pipe-think-tag-strip.ts) intercepts `<think>...</think>` tags from Gemini's text-delta output and re-emits content as `reasoning-delta` chunks. These synthetic chunks lack the `reasoning-start`/`reasoning-end` envelope that native providers (Anthropic) emit via the AI SDK.

**Issue document:** `docs/reasoning-issues/synthetic-reasoning-delta-missing-envelope.md`

## Pipeline Position

```
toUIMessageStream (AI SDK)
  → pipeThinkTagStrip          ← FIX HERE
  → pipePlanCapture
  → pipeYamlRender
  → pipeUITextCoalesce         ← AFFECTED (flush boundary logic)
  → writer loop (build-step-stream.ts)
```

## Root Cause

Two state transitions in `pipeThinkTagStrip` emit bare `reasoning-delta` without protocol-required envelope:

1. **outside → inside** (line 102, line 186): No `reasoning-start` emitted
2. **inside → outside** (line 148, line 203): No `reasoning-end` emitted

This causes `pipeUITextCoalesce` (create-readable-text-transform.ts line 251) to trigger type-change flush instead of using the designed `forcesFullFlush` boundary path (line 225-226). Result: cosmetic text rendering hiccup (word cut mid-stream).

## Confirmed Safe Behaviors (Post-Fix)

| Downstream Consumer | Behavior with Envelope | Status |
|---|---|---|
| `pipePlanCapture` (line 302) | `if chunk.type !== "text-delta" → enqueue` — passes through | SAFE |
| `pipeYamlRender` (default case) | Passes through non-text chunks unchanged | SAFE |
| `pipeUITextCoalesce` (line 225-226) | `reasoning-start`/`reasoning-end` trigger `forcesFullFlush` — designed behavior | SAFE |
| Writer loop (build-step-stream.ts line 752) | Catches all `reasoning-*` types, does `continue` | SAFE |
| `reasoningAccumulator` | Only acts on `reasoning-delta` — envelope chunks are no-ops | SAFE |

## Audited Issues and Mitigations

### CRITICAL: ID Collision (Confidence 95-100)

**Problem:** Current `emitReasoning` uses `currentTextId` — same ID as the active text block. AI SDK's eventProcessor maintains `activeTextContent[id]` keyed by ID. Sharing IDs between text and reasoning blocks risks state confusion.

**Mitigation:** Generate a unique ID per think block using a counter:
```ts
let reasoningBlockCount = 0
let activeReasoningId = ""

// On outside → inside transition:
activeReasoningId = `think-${++reasoningBlockCount}`
```

Use `activeReasoningId` for `reasoning-start`, all `reasoning-delta` within that block, and `reasoning-end`.

### CRITICAL: Insertion Order in `resolveTagBuffer` (Confidence 95)

**Problem:** `resolveTagBuffer` has pattern:
```ts
state = "inside"                        // line 186
processText(controller, remainder)      // line 187 — emits reasoning-delta
```

If envelope is emitted AFTER `processText`, ordering becomes `reasoning-delta → reasoning-start` (wrong).

**Mitigation:** Emit envelope BETWEEN state assignment and `processText` call:
```ts
state = "inside"
controller.enqueue({ type: "reasoning-start", id: activeReasoningId })  // HERE
processText(controller, combined.slice(OPEN_TAG.length))
```

Same pattern for `reasoning-end` at line 203-205.

### IMPORTANT: Stream-End Handler (Confidence 90)

**Problem:** If stream ends while `state === "inside"`, `flushTagBuffer` emits final reasoning-delta but no `reasoning-end` closes the block.

**Mitigation:** Emit `reasoning-end` in existing `if (state === "inside")` block (line 231):
```ts
flushTagBuffer(controller)
if (state === "inside") {
  controller.enqueue({ type: "reasoning-end", id: activeReasoningId })
  console.warn(...)
}
```

### LOW: Empty Think Block (Acceptable)

`<think></think>` produces `reasoning-start → reasoning-end` with no delta between. Per protocol this is valid. Downstream consumers only act on `reasoning-delta`, so empty envelope = no-op. Unnecessary flush occurs but zero data loss.

### FALSE ALARM: `transparentReasoningEnabled` Flag

Auditor flagged that synthetic envelope emits regardless of flag. But current code ALREADY emits bare `reasoning-delta` regardless — the fix doesn't change that surface. Both current and fixed behavior produce a flush at the `<think>` boundary. The fix merely upgrades from accidental type-change flush to designed forcesFullFlush path.

### THEORETICAL: Duplicate Blocks (Native + Synthetic)

If native SDK reasoning AND `<think>` tags coexist, two reasoning blocks appear. Practically impossible: Gemini uses `<think>` (no native reasoning API), Anthropic uses native reasoning (no `<think>` tags). No action needed.

## Solution: Emit Proper Envelope

### Changes Required (Single File)

**File:** `src/lib/ai/harness/pipe-think-tag-strip.ts`

1. Add state: `reasoningBlockCount` counter + `activeReasoningId` string
2. Emit `reasoning-start` at 2 transition points (outside → inside):
   - `processText` line 102 (after `state = "inside"`)
   - `resolveTagBuffer` line 186 (between state assignment and `processText` call)
3. Emit `reasoning-end` at 2 transition points (inside → outside):
   - `processText` line 145 (after `state = "outside"`)
   - `resolveTagBuffer` line 204 (between state assignment and `processText` call)
4. Emit `reasoning-end` at stream-end handler (line 231 if-block)
5. Emit `reasoning-end` in `text-end` handler (line 265) — when think block spans to text-end boundary without explicit `</think>` close
6. Update `emitReasoning` to use `activeReasoningId` instead of `currentTextId`

### Chunk Shape (AI SDK UIMessageChunk Protocol)

```ts
{ type: "reasoning-start", id: string }
{ type: "reasoning-delta", id: string, delta: string }
{ type: "reasoning-end",   id: string }
```

All three must share the same `id` within one think block. ID must be non-empty string.

### Expected Output After Fix

Input: `"Tinjauan Literatur\n<think>\nReflecting on...\n</think>\nHasil:\n"`

```
text-delta    { id: "t1", delta: "Tinjauan Literatur\n" }
reasoning-start { id: "think-1" }
reasoning-delta { id: "think-1", delta: "\nReflecting on...\n" }
reasoning-end   { id: "think-1" }
text-delta    { id: "t1", delta: "\nHasil:\n" }
```

### Test Coverage Required

Current 16 tests pass but provide ZERO coverage for envelope behavior. New tests needed:

1. Single think block emits reasoning-start before first reasoning-delta
2. Single think block emits reasoning-end after last reasoning-delta
3. Multiple think blocks produce separate envelope pairs with unique IDs
4. Stream-end inside think block emits reasoning-end
5. Empty think block emits reasoning-start + reasoning-end (no delta)
6. Reasoning chunks use unique ID (not text block ID)
7. Envelope ordering in cross-chunk tag resolution (resolveTagBuffer path)

## Data Flow Confirmation

Reasoning content path (verified):
```
reasoning-delta → reasoningAccumulator.onReasoningDelta()
  → data-reasoning-live SSE (throttled 160ms)
  → client UIMessage.parts[]
  → resolveLiveReasoningHeadline()
  → ChatProcessStatusBar (teal loading bar above chat input)
```

Chat text path (verified NO leak):
- Layer 1: pipeThinkTagStrip routes to reasoning-delta (not text-delta)
- Layer 2: writer loop `continue` — never reaches writer.write()
- Layer 3: onFinish regex strip before DB persist
- Layer 4: MessageBubble.tsx render-time regex strip

## Severity & Risk

- **Severity:** Low (cosmetic rendering hiccup)
- **Blast radius:** Single file change (`pipe-think-tag-strip.ts`)
- **Risk of regression:** Low — all downstream consumers already handle reasoning envelope correctly
- **Trigger condition:** Gemini outputs `<think>` tag mid-prose (not at turn start)
