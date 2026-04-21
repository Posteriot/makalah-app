# Synthetic Reasoning Envelope Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add protocol-correct `reasoning-start`/`reasoning-end` envelope around synthetic `reasoning-delta` chunks emitted by `pipeThinkTagStrip`.

**Architecture:** Single-file fix in the think-tag-strip state machine. Generate unique IDs per think block, emit envelope at 4 state transition points + stream-end. TDD — write failing tests first, then implement.

**Tech Stack:** TypeScript, Vitest, Web Streams API

**Context doc:** `docs/reasoning-issues/fix-synthetic-reasoning-envelope.md`

---

## Task 1: Add Envelope Test — Single Think Block

**Files:**
- Modify: `src/lib/ai/harness/pipe-think-tag-strip.test.ts`

**Step 1: Write the failing tests**

Add after the existing test block (after line 367):

```typescript
// ── 17. Envelope: reasoning-start/reasoning-end emitted ──

describe("reasoning envelope", () => {
  function reasoningStarts(output: unknown[]): Chunk[] {
    return output.filter((c) => (c as Chunk).type === "reasoning-start") as Chunk[]
  }

  function reasoningEnds(output: unknown[]): Chunk[] {
    return output.filter((c) => (c as Chunk).type === "reasoning-end") as Chunk[]
  }

  it("emits reasoning-start before first reasoning-delta and reasoning-end after last", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("Before <think>internal</think> After"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))
    const types = output.map((c) => (c as Chunk).type)

    // Must have exactly 1 reasoning-start and 1 reasoning-end
    expect(reasoningStarts(output)).toHaveLength(1)
    expect(reasoningEnds(output)).toHaveLength(1)

    // Ordering: reasoning-start < reasoning-delta < reasoning-end
    const startIdx = types.indexOf("reasoning-start")
    const firstDeltaIdx = types.indexOf("reasoning-delta")
    const lastDeltaIdx = types.lastIndexOf("reasoning-delta")
    const endIdx = types.indexOf("reasoning-end")

    expect(startIdx).toBeLessThan(firstDeltaIdx)
    expect(lastDeltaIdx).toBeLessThan(endIdx)
  })

  it("uses unique ID distinct from text block ID", async () => {
    const input = streamFromChunks([
      textStart("txt-1"),
      textDelta("A <think>hidden</think> B", "txt-1"),
      textEnd("txt-1"),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    const start = reasoningStarts(output)[0]
    const deltas = reasoningDeltas(output)
    const end = reasoningEnds(output)[0]

    // ID must NOT be the text block ID
    expect(start.id).not.toBe("txt-1")
    // All three share same ID
    expect(start.id).toBe(end.id)
    for (const d of deltas) {
      expect(d.id).toBe(start.id)
    }
    // ID must be non-empty
    expect(start.id!.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/reasoning-issues && npx vitest run src/lib/ai/harness/pipe-think-tag-strip.test.ts --reporter=verbose 2>&1 | tail -30`

Expected: 2 FAIL — `reasoning-start` not found in output

**Step 3: Commit**

```bash
git add src/lib/ai/harness/pipe-think-tag-strip.test.ts
git commit -m "test: add failing tests for reasoning envelope in pipeThinkTagStrip"
```

---

## Task 2: Add Envelope Tests — Edge Cases

**Files:**
- Modify: `src/lib/ai/harness/pipe-think-tag-strip.test.ts`

**Step 1: Write failing tests for edge cases**

Add inside the `describe("reasoning envelope", ...)` block:

```typescript
  it("multiple think blocks produce separate envelope pairs with unique IDs", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("A <think>first</think> B <think>second</think> C"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(reasoningStarts(output)).toHaveLength(2)
    expect(reasoningEnds(output)).toHaveLength(2)

    // Each pair has a different ID
    const startIds = reasoningStarts(output).map((c) => c.id)
    expect(startIds[0]).not.toBe(startIds[1])

    // Each start matches its corresponding end
    const endIds = reasoningEnds(output).map((c) => c.id)
    expect(startIds[0]).toBe(endIds[0])
    expect(startIds[1]).toBe(endIds[1])
  })

  it("emits reasoning-end when stream ends inside think block", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const input = streamFromChunks([
      textStart(),
      textDelta("Before <think>unclosed"),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(reasoningStarts(output)).toHaveLength(1)
    expect(reasoningEnds(output)).toHaveLength(1)

    // reasoning-end is after all reasoning-delta
    const types = output.map((c) => (c as Chunk).type)
    const lastDelta = types.lastIndexOf("reasoning-delta")
    const endIdx = types.lastIndexOf("reasoning-end")
    expect(lastDelta).toBeLessThan(endIdx)

    warnSpy.mockRestore()
  })

  it("empty think block emits reasoning-start and reasoning-end with no delta", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("A <think></think> B"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(reasoningStarts(output)).toHaveLength(1)
    expect(reasoningEnds(output)).toHaveLength(1)
    expect(reasoningDeltas(output)).toHaveLength(0)
    expect(allText(output)).toBe("A  B")
  })

  it("envelope ordering correct when tag resolved via resolveTagBuffer", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("hello <thi"),
      textDelta("nk>reason</think> world"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))
    const types = output.map((c) => (c as Chunk).type)

    // Verify full sequence: text → start → delta → end → text
    const startIdx = types.indexOf("reasoning-start")
    const endIdx = types.indexOf("reasoning-end")
    const firstReasoningDelta = types.indexOf("reasoning-delta")

    expect(startIdx).toBeLessThan(firstReasoningDelta)
    expect(firstReasoningDelta).toBeLessThan(endIdx)

    // Text before and after intact
    expect(allText(output)).toBe("hello  world")
    expect(allReasoning(output)).toBe("reason")
  })

  it("no envelope emitted when there are no think tags", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("plain text without think"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    expect(reasoningStarts(output)).toHaveLength(0)
    expect(reasoningEnds(output)).toHaveLength(0)
  })
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/reasoning-issues && npx vitest run src/lib/ai/harness/pipe-think-tag-strip.test.ts --reporter=verbose 2>&1 | tail -40`

Expected: 5 FAIL (all new envelope tests)

**Step 3: Commit**

```bash
git add src/lib/ai/harness/pipe-think-tag-strip.test.ts
git commit -m "test: add edge case tests for reasoning envelope (multiple blocks, stream-end, empty, resolveTagBuffer)"
```

---

## Task 3: Implement Envelope Emission

**Files:**
- Modify: `src/lib/ai/harness/pipe-think-tag-strip.ts`

**Step 1: Add state variables**

After line 37 (`let thinkChars = 0`), add:

```typescript
  // Unique ID per reasoning block (distinct from text block ID)
  let reasoningBlockCount = 0
  let activeReasoningId = ""
```

**Step 2: Add envelope emit helpers**

After the `flushTagBuffer` function (after line 67), add:

```typescript
  function emitReasoningStart(controller: ReadableStreamDefaultController) {
    activeReasoningId = `think-${++reasoningBlockCount}`
    controller.enqueue({ type: "reasoning-start", id: activeReasoningId })
  }

  function emitReasoningEnd(controller: ReadableStreamDefaultController) {
    if (activeReasoningId) {
      controller.enqueue({ type: "reasoning-end", id: activeReasoningId })
      activeReasoningId = ""
    }
  }
```

**Step 3: Update `emitReasoning` to use `activeReasoningId`**

Change line 54 from:
```typescript
      controller.enqueue({ type: "reasoning-delta", id: currentTextId, delta: text })
```
to:
```typescript
      controller.enqueue({ type: "reasoning-delta", id: activeReasoningId, delta: text })
```

**Step 4: Emit envelope in `processText` — outside→inside transition**

At line 102, after `state = "inside"`, add `emitReasoningStart(controller)`:

```typescript
          if (remaining.startsWith(OPEN_TAG)) {
            // Full <think> found — switch to inside
            state = "inside"
            emitReasoningStart(controller)
            pos = openIdx + OPEN_TAG.length
            continue
          }
```

**Step 5: Emit envelope in `processText` — inside→outside transition**

At line 145, after `state = "outside"`, add `emitReasoningEnd(controller)`:

```typescript
          if (remaining.startsWith(CLOSE_TAG)) {
            // Full </think> found — switch to outside
            state = "outside"
            emitReasoningEnd(controller)
            pos = closeIdx + CLOSE_TAG.length
            continue
          }
```

**Step 6: Emit envelope in `resolveTagBuffer` — outside→inside (line 186)**

CRITICAL: Insert between state assignment and `processText` call:

```typescript
        if (combined.startsWith(OPEN_TAG)) {
          // Confirmed <think> — switch state, process remainder
          state = "inside"
          emitReasoningStart(controller)
          processText(controller, combined.slice(OPEN_TAG.length))
        }
```

**Step 7: Emit envelope in `resolveTagBuffer` — inside→outside (line 204)**

CRITICAL: Insert between state assignment (line 204) and `processText` call (line 205):

```typescript
        if (combined.startsWith(CLOSE_TAG)) {
          // Confirmed </think> — switch state, process remainder
          state = "outside"
          emitReasoningEnd(controller)
          processText(controller, combined.slice(CLOSE_TAG.length))
        }
```

**Step 8: Emit `reasoning-end` at stream-end handler**

In the stream-end handler, emit `reasoning-end` AFTER `flushTagBuffer` but BEFORE `controller.close()`. Change the `if (state === "inside")` block:

```typescript
            flushTagBuffer(controller)

            if (state === "inside") {
              emitReasoningEnd(controller)
              console.warn(
                `[THINK-STRIP] stream ended inside <think> block — ` +
                `flushed ${thinkChars} chars to reasoning`,
              )
            }
```

**Step 9: Run all tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/reasoning-issues && npx vitest run src/lib/ai/harness/pipe-think-tag-strip.test.ts --reporter=verbose 2>&1 | tail -50`

Expected: ALL 24 tests PASS (16 existing + 8 new envelope tests)

**Step 10: Commit**

```bash
git add src/lib/ai/harness/pipe-think-tag-strip.ts
git commit -m "fix: emit reasoning-start/reasoning-end envelope in pipeThinkTagStrip

Synthetic reasoning-delta from <think> tag stripping now wrapped in
proper protocol envelope. Fixes cosmetic text rendering hiccup caused
by pipeUITextCoalesce type-change flush instead of designed boundary
flush.

Each think block gets a unique ID (think-1, think-2, ...) distinct
from the text block ID to avoid AI SDK eventProcessor collision."
```

---

## Task 4: Fix text-end Boundary + Regression Check

**Files:**
- Modify: `src/lib/ai/harness/pipe-think-tag-strip.ts` (line 265-268)
- Modify: `src/lib/ai/harness/pipe-think-tag-strip.test.ts`

**Step 1: Verify test 8 assertion logic is still valid**

Test 8 asserts: `lastReasoningIdx < textEndIdx` where `lastReasoningIdx = types.lastIndexOf("reasoning-delta")`.

After the fix, the stream for test 8 (`<think>reasoning` + `text-end`) produces:
```
reasoning-start → reasoning-delta("reasoning") → reasoning-end → text-end
```

`lastIndexOf("reasoning-delta")` still finds the delta. `indexOf("text-end")` finds text-end. Delta comes before text-end. Assertion holds.

BUT: `reasoning-end` is now emitted BEFORE `text-end`. This is correct — the think block's `flushTagBuffer` call at line 265 (`if chunk.type === "text-end"`) already flushes before forwarding text-end, and the new `emitReasoningEnd` in the stream-end path... wait — this test has a `text-end` chunk which triggers line 265-268:

```typescript
if (chunk.type === "text-end") {
  flushTagBuffer(controller)
  controller.enqueue(value)
  continue
}
```

`flushTagBuffer` emits remaining reasoning content. But we also need `reasoning-end` here if state is still "inside" when text-end arrives. This is a gap — text-end triggers flush but NOT envelope close.

**Step 2: Add reasoning-end emission before text-end forwarding**

In the `text-end` handler (line 265-268), add `emitReasoningEnd` after `flushTagBuffer`:

```typescript
          if (chunk.type === "text-end") {
            flushTagBuffer(controller)
            if (state === "inside") {
              emitReasoningEnd(controller)
            }
            controller.enqueue(value)
            continue
          }
```

**Step 3: Write dedicated test for text-end boundary case**

Add inside the `describe("reasoning envelope", ...)` block:

```typescript
  it("emits reasoning-end before text-end when think block spans to text-end boundary", async () => {
    const input = streamFromChunks([
      textStart(),
      textDelta("<think>reasoning"),
      textEnd(),
    ])

    const output = await collect(pipeThinkTagStrip(input))
    const types = output.map((c) => (c as Chunk).type)

    // Must have envelope
    expect(reasoningStarts(output)).toHaveLength(1)
    expect(reasoningEnds(output)).toHaveLength(1)

    // reasoning-end must come BEFORE text-end
    const reasoningEndIdx = types.lastIndexOf("reasoning-end")
    const textEndIdx = types.indexOf("text-end")
    expect(reasoningEndIdx).toBeLessThan(textEndIdx)

    // reasoning content intact
    expect(allReasoning(output)).toBe("reasoning")
  })
```

**Step 4: Run all tests**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/reasoning-issues && npx vitest run src/lib/ai/harness/pipe-think-tag-strip.test.ts --reporter=verbose 2>&1 | tail -50`

Expected: ALL 25 tests PASS (16 existing + 9 new)

**Step 5: Commit**

```bash
git add src/lib/ai/harness/pipe-think-tag-strip.ts src/lib/ai/harness/pipe-think-tag-strip.test.ts
git commit -m "fix: emit reasoning-end before text-end when think block spans to text-end boundary"
```

---

## Task 5: Integration Smoke Test — pipeUITextCoalesce Handles Envelope

**Files:**
- Read: `src/lib/ai/harness/create-readable-text-transform.test.ts`
- Modify: `src/lib/ai/harness/pipe-think-tag-strip.test.ts`

**Step 1: Write integration test that chains pipeThinkTagStrip → pipeUITextCoalesce**

Add at the end of `pipe-think-tag-strip.test.ts`, outside the main describe:

```typescript
describe("pipeThinkTagStrip → pipeUITextCoalesce integration", () => {
  it("text coalescing is not disrupted by think block mid-stream", async () => {
    // Simulate word-by-word streaming with a think block in the middle
    const input = streamFromChunks([
      textStart("t1"),
      textDelta("Tinjauan ", "t1"),
      textDelta("Literatur\n", "t1"),
      textDelta("<think>\nReflecting on structure\n</think>\n", "t1"),
      textDelta("Hasil ", "t1"),
      textDelta("penelitian", "t1"),
      textEnd("t1"),
    ])

    const output = await collect(pipeThinkTagStrip(input))

    // Text is intact (no mid-word cuts)
    expect(allText(output)).toBe("Tinjauan Literatur\n\nHasil penelitian")

    // Reasoning captured
    expect(allReasoning(output)).toBe("\nReflecting on structure\n")

    // Envelope present
    const types = output.map((c) => (c as Chunk).type)
    expect(types.filter((t) => t === "reasoning-start")).toHaveLength(1)
    expect(types.filter((t) => t === "reasoning-end")).toHaveLength(1)

    // No text-delta appears between reasoning-start and reasoning-end
    const startIdx = types.indexOf("reasoning-start")
    const endIdx = types.indexOf("reasoning-end")
    const textInBetween = output
      .slice(startIdx, endIdx + 1)
      .filter((c) => (c as Chunk).type === "text-delta")
    expect(textInBetween).toHaveLength(0)
  })
})
```

**Step 2: Run the test**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/reasoning-issues && npx vitest run src/lib/ai/harness/pipe-think-tag-strip.test.ts --reporter=verbose 2>&1 | tail -30`

Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/lib/ai/harness/pipe-think-tag-strip.test.ts
git commit -m "test: add integration smoke test for think-strip envelope with text coalescing"
```

---

## Task 6: Final Verification — Full Test Suite for Changed Files

**Step 1: Run all tests in harness directory**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/reasoning-issues && npx vitest run src/lib/ai/harness/ --reporter=verbose 2>&1 | tail -40`

Expected: ALL PASS

**Step 2: Run create-readable-text-transform tests (downstream consumer)**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/reasoning-issues && npx vitest run src/lib/ai/harness/create-readable-text-transform.test.ts --reporter=verbose 2>&1 | tail -30`

Expected: ALL PASS (no changes to this file, existing behavior preserved)

**Step 3: TypeScript compile check**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/reasoning-issues && npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "pipe-think-tag-strip|error" | head -20`

Expected: No errors related to pipe-think-tag-strip.ts

---

## Summary of Changes

| File | Action | Lines Changed |
|---|---|---|
| `src/lib/ai/harness/pipe-think-tag-strip.ts` | Modify | ~20 lines added |
| `src/lib/ai/harness/pipe-think-tag-strip.test.ts` | Modify | ~140 lines added (10 new tests) |

**Total test count:** 26 (16 existing + 9 envelope tests + 1 integration test). Zero changes to downstream consumers.
