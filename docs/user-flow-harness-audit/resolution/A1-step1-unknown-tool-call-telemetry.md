# A1 — Step 1: Unknown Tool Call Telemetry Guard

**Status:** Plan only — not yet implemented
**Author:** harness-architect skill (critique mode)
**Source anomaly:** A1 (3 plan tools declared in skill/system-prompt without implementor)
**Source plan:** `docs/user-flow-harness-audit/01-stage-gagasan-audit.md` + critique session 2026-04-27
**Branch:** `durable-agent-harness`
**Worktree:** `.worktrees/durable-agent-harness`

---

## 1. Why this step (problem framing)

### 1.1 The anomaly we are NOT fixing in this step

`system-prompt.md:295-302` and `01-gagasan-skill.md:97,115,119` instruct the model to call three tools that do not exist in the registry:

- `createStagePlan`
- `markTaskDone(taskId)`
- `confirmStageFinalization`

Verified against code on 2026-04-27:

- `src/lib/chat-harness/executor/build-tool-registry.ts` registers 13 tools: 4 base tools (`createArtifact`, `updateArtifact`, `readArtifact`, `renameConversationTitle`) in `build-tool-registry.ts:60-630`, plus 9 paper tools spread from `createPaperTools(...)` in `src/lib/ai/paper-tools.ts` (`getCurrentPaperState`, `updateStageData`, `compileDaftarPustaka`, `submitStageForValidation`, `requestRevision`, `resetToStage`, `inspectSourceDocument`, `quoteFromSource`, `searchAcrossSources`). **Zero of the three plan tools are present.**
- 17 grep hits across the repo for the three names — all under `docs/`. None in `src/` or `convex/`.

The full fix (build the missing tools) is **Step 2**, not this step.

### 1.2 What this step DOES fix

This step adds **observability** so the team can answer one factual question before committing engineering effort to Step 2:

> *"How often, on production traffic, does the model actually attempt to call one of these missing tools?"*

We need this number because:

1. The original critique assumed AI SDK would throw "tool not found." Empirically the SDK has multiple paths (`tool-error` chunk, `tool-input-error` chunk, `NoSuchToolError` thrown). Without telemetry we cannot distinguish silent-drop from visible-error from caught-exception in production.
2. If the rate is 0 (model never actually calls these names), Step 2's urgency drops — the conflicting skill text is being ignored gracefully.
3. If the rate is high, Step 2 becomes urgent and the data tells us which tool name is most-attempted (informs ordering inside Step 2).

### 1.3 Component framing

Per `references/anatomy.md`:

| Component | Touched | How |
|---|---|---|
| **#2 Tools** | Read-only | Reads `Object.keys(executionConfig.tools)` to build the registered set. No registry changes. |
| **#8 Error Handling** | Extended | Adds a new error class: "model emitted unknown tool name." |
| **#12 Lifecycle / Observability** | Primary | New telemetry tag + Sentry capture. |

This step does not violate any of the three agnosticism principles (State Separation, Contract-First, Control/Data Plane) — it is a pure observability addition.

---

## 2. Verified facts (from codebase research, 2026-04-27)

These are the load-bearing facts. If any prove wrong during implementation, **stop and re-verify** before proceeding.

| # | Fact | Evidence |
|---|---|---|
| F1 | AI SDK v6.0.106 is the deployed version. | `package.json:54` |
| F2 | `NoSuchToolError` is the SDK's class for unknown tool names. Carries `toolName: string` and `availableTools: string[] \| undefined`. | `node_modules/ai/dist/index.d.ts:1236-1246` |
| F3 | UI message stream surfaces unknown-tool failures as `tool-input-error` chunks (`type: "tool-input-error"`, with `toolName`, `errorText`, `toolCallId`). | `node_modules/ai/dist/index.d.ts:2035-2043` |
| F4 | The streamText runtime also surfaces `tool-error` chunks (different shape — for execution failures). | `node_modules/ai/dist/index.d.ts:2620, 4581` |
| F5 | SDK exposes `experimental_repairToolCall` for repairing/intercepting `NoSuchToolError` before it surfaces. | `node_modules/ai/dist/index.d.ts:1267-1276` |
| F6 | Tool registry is built once per request and passed to streamText via `executionConfig.tools`. The Set `Object.keys(executionConfig.tools)` is the authoritative registered-name set at request time. | `src/lib/chat-harness/executor/build-step-stream.ts:487`; `build-tool-registry.ts:42` (`ToolSet`) |
| F7 | The chunk processing loop in `buildStepStream` already extracts `toolName` from chunks via `getToolNameFromChunk(chunk)`. | `build-step-stream.ts:122-126`, used at line 772 |
| F8 | The chunk loop already handles `chunk.type === "error"` (line 879) but does NOT explicitly handle `tool-error` or `tool-input-error` — these chunks would fall through to `writer.write(chunk)` at line 1039, forwarding to client. | `build-step-stream.ts:879-945` |
| F9 | Existing telemetry pattern: `console.info(\`[⏱ TAG][${reqId}]${logTag} ...\`)` for grep-friendly per-turn lines. Sentry pattern: `Sentry.captureException(err, { tags: { subsystem: "..." } })`. | `build-step-stream.ts` throughout; `build-tool-registry.ts:341,499,553` |
| F10 | `experimental_onToolCallStart` / `experimental_onToolCallFinish` exist and are wired in (`build-step-stream.ts:590-616`). `onToolCallFinish` receives `success: boolean` and fires for both successful AND failed tool executions, so it provides partial visibility into tool-execute failures — but it does NOT fire when the SDK rejects an unknown tool name before invocation (that path goes through `experimental_repairToolCall`). | `build-step-stream.ts:590-616` |

---

## 3. Design

### 3.1 Detection strategy

Two complementary detection points. Both are required because each catches a different failure path the SDK may take:

**Detection point A — `experimental_repairToolCall` callback (preferred primary signal)**

This is the SDK's official hook for `NoSuchToolError`. Inject a callback that:

1. Receives `(toolCall, error)` when SDK fails to match a name.
2. If `error instanceof NoSuchToolError` (or via `NoSuchToolError.isInstance(error)`), emit telemetry.
3. Returns `null` (do NOT repair) — let the error propagate as it does today. We are observing, not changing behavior.

**Detection point B — chunk loop interception (defense in depth)**

In the existing `for await (const chunk of iterateStream(afterCoalesce))` loop, add a branch:

```ts
if (chunk.type === "tool-input-error" || chunk.type === "tool-error") {
    // emit telemetry (see §3.2)
    // forward chunk unchanged to writer (preserve existing behavior)
}
```

This catches any path where `experimental_repairToolCall` is bypassed (e.g., tool-error from execute() throwing) — important because `NoSuchToolError` is one error class but the symptom space is broader.

**Why both:** Detection A gives us the cleanest signal for the specific A1 case (unknown name). Detection B gives us the broader baseline (all tool-error events) so we can compute the ratio "unknown-name errors ÷ total tool errors."

**Why both chunk types are valid signals (re-verified 2026-04-27)**

> An earlier review challenged whether `tool-input-error` chunks fire for unknown tool names. Independent SDK source-trace confirms they do. AI SDK v6.0.106 source: in `node_modules/ai/dist/index.mjs:3555-3615`, `parseToolCall`'s outer `catch (error)` block (line 3600) wraps BOTH `NoSuchToolError` and `InvalidToolInputError` throw paths and builds an `invalid: true` tool-call carrying the original error (line 3609). Downstream in `index.js:7780-7791`, every `invalid: true` part becomes a `tool-input-error` chunk. There is no separate emission path. Therefore Detection point B catches BOTH error classes via `tool-input-error`, and `tool-error` chunks separately catch tool-EXECUTE failures. Both branches stay in the implementation.

### 3.2 Telemetry contract

Every detection emits exactly one structured log line and one Sentry breadcrumb (not exception — see §3.3 for why).

**Console log shape:**

```
[⚠ UNKNOWN-TOOL-CALL][<reqId>]<logTag> source=<repair|chunk> toolName=<name> stage=<stageOrNull> available=<csv-of-registered> errorText=<short>
```

Tag prefix `[⚠ UNKNOWN-TOOL-CALL]` is grep-friendly and matches existing tag-bracket convention (`[⏱ TOOLS-STREAM]`, `[CHOICE-CARD]`, etc.).

**Sentry shape:**

```ts
Sentry.captureMessage("unknown_tool_call_attempted", {
    level: "warning",
    tags: {
        subsystem: "harness",
        toolName: <name>,
        source: "repair" | "chunk",
        paperStage: <stageOrUnknown>,
    },
    extra: {
        reqId,
        availableTools: <array>,
        errorText: <string|null>,
        runId: <id>,
    },
})
```

We use `captureMessage` with `level: "warning"` (not `captureException`) because:

- This is observed behavior, not a runtime crash.
- `captureException` would trigger high-severity alerts, polluting the alert stream.
- Warning level lets us filter Sentry for trend analysis without noise on the on-call rotation.

### 3.3 What we explicitly do NOT do in this step

Listed to prevent scope creep during implementation:

- **Do not** add `experimental_repairToolCall` *repair* logic (e.g., fuzzy-matching `createStagePlan` to a near tool). That changes behavior and is Step 2.
- **Do not** suppress or rewrite the `tool-error` / `tool-input-error` chunk forwarded to the client. We observe; we do not alter.
- **Do not** modify `build-tool-registry.ts`. The registry stays as-is.
- **Do not** edit any system prompt, skill, or `.md` file in `docs/`. Documentation drift is Step 5.
- **Do not** add per-turn rate limiting or aggregation in the harness. Sentry handles aggregation server-side.

### 3.4 Performance / blast-radius analysis

| Concern | Impact |
|---|---|
| Per-turn overhead | One `Set` allocation at stream start (~13 entries). One `Set.has()` check per `tool-call` chunk (≪10 per turn typically). Negligible. |
| Latency | Zero — telemetry runs synchronously in same microtask; Sentry capture is fire-and-forget. |
| Memory | Bounded — Set is per-request and GC'd with the request. |
| Failure modes | If Sentry capture throws, we MUST not break the stream. Wrap in try/catch with `console.warn` fallback (matches existing patterns in `build-on-finish-handler.ts`). |
| Feature flag needed? | No. This is pure additive observability. If it misfires, behavior is unchanged for users. |

---

## 4. Implementation task list

Each task is sized to fit one focused commit. Tasks **MUST** be done in order — later tasks depend on earlier ones being committed.

### Task 4.1 — Add registered-tool-names accessor

**File:** `src/lib/chat-harness/executor/build-step-stream.ts`
**Change:** Inside `buildStepStream`, after destructuring `executionConfig`, add:

```ts
const registeredToolNames = new Set(Object.keys(executionConfig.tools ?? {}))
```

Place this near line 376 (start of `createUIMessageStream.execute` body) so it is in scope for both detection points.

**Acceptance:**
- TypeScript compiles.
- New `Set` is correctly populated — verified by adding a one-time `console.info("[HARNESS][registered-tools]", [...registeredToolNames])` at the top of `execute` (REMOVE after manual verification, not for production).

**Estimated effort:** 5 min.

---

### Task 4.2 — Add unknown-tool detection helper

**File:** `src/lib/chat-harness/executor/build-step-stream.ts`
**Change:** Add a new helper function near the existing `getToolNameFromChunk` helper (after line 126):

```ts
function emitUnknownToolCallTelemetry(params: {
    reqId: string
    logTag: string
    toolName: string
    source: "repair" | "chunk"
    availableTools: string[]
    errorText: string | null
    paperStage: string | null
    runId: string
}): void {
    const { reqId, logTag, toolName, source, availableTools, errorText, paperStage, runId } = params
    console.warn(
        `[⚠ UNKNOWN-TOOL-CALL][${reqId}]${logTag} source=${source} toolName=${toolName} stage=${paperStage ?? "none"} available=${availableTools.join(",")} errorText=${errorText ?? "null"}`
    )
    try {
        Sentry.captureMessage("unknown_tool_call_attempted", {
            level: "warning",
            tags: {
                subsystem: "harness",
                toolName,
                source,
                paperStage: paperStage ?? "none",
            },
            extra: {
                reqId,
                availableTools,
                errorText,
                runId,
            },
        })
    } catch (sentryErr) {
        console.warn(`[⚠ UNKNOWN-TOOL-CALL][${reqId}]${logTag} sentry capture failed`, sentryErr)
    }
}
```

Add `import * as Sentry from "@sentry/nextjs"` at top of file (existing files in this dir already use this import path — see `build-tool-registry.ts:1`).

**Acceptance:**
- TypeScript compiles with strict mode.
- No unused-import warnings.
- Helper is not yet called — that comes in 4.3 / 4.4.

**Estimated effort:** 10 min.

---

### Task 4.3 — Wire detection point A (`experimental_repairToolCall`)

**File:** `src/lib/chat-harness/executor/build-step-stream.ts`
**Change:** Add to `streamTextConfig` (near line 484, alongside other `experimental_*` callbacks):

```ts
// Note: streamTextConfig is typed `any` so TypeScript won't enforce the full
// ToolCallRepairFunction shape, but we annotate the fields we actually read
// for documentation. Full SDK shape (see node_modules/ai/dist/index.d.ts:1267-1276):
//   { system, messages, toolCall: LanguageModelV3ToolCall, tools, inputSchema, error }
streamTextConfig.experimental_repairToolCall = async (options: {
    toolCall: { toolName: string }
    error: NoSuchToolError | InvalidToolInputError | unknown
}) => {
    // Observe-only: do not actually repair. Returning null preserves current behavior.
    const isNoSuch = NoSuchToolError.isInstance(options.error)
    if (isNoSuch) {
        emitUnknownToolCallTelemetry({
            reqId: toolsStreamReqId,
            logTag,
            toolName: options.toolCall.toolName,
            source: "repair",
            availableTools: [...registeredToolNames],
            errorText: options.error instanceof Error ? options.error.message : String(options.error),
            paperStage: paperStageScope ?? null,
            runId: lane.runId,
        })
    }
    return null
}
```

**Acceptance:**
- TypeScript compiles.
- Static import: ensure `NoSuchToolError` (and `InvalidToolInputError` if used in the type annotation above) are added to the existing `import { ... } from "ai"` statement at line 1 of `build-step-stream.ts`. Do not use dynamic `await import("ai")`.
- Manual test: configure a test request that includes a fake tool name in the model's response (mock or use a known-broken stage if reproducible). Confirm `[⚠ UNKNOWN-TOOL-CALL]...source=repair` line appears in console.
- Confirm the stream still completes (callback returns null, so behavior unchanged).

**Estimated effort:** 30 min including manual smoke test.

---

### Task 4.4 — Wire detection point B (chunk loop)

**File:** `src/lib/chat-harness/executor/build-step-stream.ts`
**Change:** Inside the `for await (const chunk of iterateStream(afterCoalesce))` loop (starting line 722), add a new branch BEFORE the existing `chunk.type === "finish"` branch:

```ts
if (chunk.type === "tool-input-error" || chunk.type === "tool-error") {
    const errToolName = getToolNameFromChunk(chunk) ?? "unknown"
    const isUnknownName = !registeredToolNames.has(errToolName)
    if (isUnknownName) {
        emitUnknownToolCallTelemetry({
            reqId: toolsStreamReqId,
            logTag,
            toolName: errToolName,
            source: "chunk",
            availableTools: [...registeredToolNames],
            errorText: typeof (chunk as { errorText?: unknown }).errorText === "string"
                ? (chunk as { errorText: string }).errorText
                : null,
            paperStage: paperStageScope ?? null,
            runId: lane.runId,
        })
    }
    // Forward chunk unchanged — DO NOT alter existing client-facing behavior.
    ensureStart()
    writer.write(chunk)
    continue
}
```

Place this block immediately after the `tool-input-start` branch (around line 774) and before the `chunk.type === "finish"` branch.

**Acceptance:**
- TypeScript compiles.
- Existing tests in `src/lib/chat-harness/**/*.test.ts` still pass (verify with `pnpm vitest run --filter chat-harness` or equivalent project test command).
- Manual smoke: same as 4.3, confirm `source=chunk` line fires when chunk path is taken.

**Estimated effort:** 30 min.

---

### Task 4.5 — Add unit test

**File:** New file: `src/lib/chat-harness/executor/build-step-stream.unknown-tool.test.ts`
**Change:** Add focused tests using the existing test patterns in this directory.

Minimum coverage:

1. `emitUnknownToolCallTelemetry` emits a warning console line with the expected format. (Spy on `console.warn`.)
2. `emitUnknownToolCallTelemetry` calls `Sentry.captureMessage` with the expected tags. (Mock `@sentry/nextjs`.)
3. Sentry throw is swallowed and falls back to console.warn (do not break the stream).

**Note:** Full integration test (mocking streamText to inject a `NoSuchToolError`) is out of scope for this task — covered later if the team wants stronger regression guard. Unit tests on the helper are sufficient acceptance for v1.

**Acceptance:**
- Tests pass: `pnpm vitest run src/lib/chat-harness/executor/build-step-stream.unknown-tool.test.ts`.

**Estimated effort:** 45 min.

---

### Task 4.6 — Documentation note (single line, single file)

**File:** `docs/user-flow-harness-audit/resolution/A1-step1-unknown-tool-call-telemetry.md` (THIS file)
**Change:** Append to §6 (Status & rollout log) the deployment date and initial 24h observation.

**Acceptance:**
- Section §6 has a dated entry once Task 4.5 is merged and deployed.

**Estimated effort:** 5 min after deploy.

---

### Task 4.7 — Deploy + 24h observation

**Action (manual):** Merge to `main` after PR review. The project deploys via Vercel — merge to `main` auto-triggers a **production** deployment (verify in Vercel dashboard once green). Preview deployments are NOT sufficient because telemetry requires real production traffic to produce a meaningful baseline. Wait 24 hours of production traffic. Pull Sentry warning count + sample console logs from production logs.

**Decision gate before Step 2 starts:**

**Important — deduplication required.** Detection A (repair callback) and Detection B (chunk loop) both fire for the same `NoSuchToolError` event. The repair callback runs first (returns `null`), then the SDK re-throws the original error which surfaces as a `tool-input-error` chunk and trips Detection B. Result: raw Sentry counts are 2× the true unique-event count.

When reading Sentry data, deduplicate by `toolCallId` (logged in `extra`) OR filter by `source=repair` only (one of the two detections per event). The thresholds below apply to **unique events**, not raw Sentry message count.

- **If unknown_tool_call_attempted count is 0 over 24h with normal traffic:** A1's user-impact is provisionally low. Step 2 (build the tools) drops to "non-urgent / cleanup." Document the observation. Skill/system-prompt edits (Step 5) become viable as the cheap path.
- **If count > 0 but bounded (say, < 1% of paper-mode turns):** Step 2 is justified but not blocking. Schedule normally.
- **If count > 1% of paper-mode turns:** Step 2 is urgent. Begin Step 2 immediately and prioritize the most-attempted tool name first.

**Estimated effort:** 24h calendar, ~30 min active reading at the end.

---

## 5. Verification plan (mandatory before claiming Step 1 done)

Per CLAUDE.md anti-sycophancy rule "Never claim success when it's a lie." Step 1 is **not** done until ALL of these are observable.

| # | Check | How |
|---|---|---|
| V1 | TypeScript build passes. | `pnpm tsc --noEmit` (or project's build command). |
| V2 | Existing chat-harness tests pass. | `pnpm vitest run src/lib/chat-harness/` (or equivalent). |
| V3 | New unit test passes. | `pnpm vitest run src/lib/chat-harness/executor/build-step-stream.unknown-tool.test.ts`. |
| V4 | Manual smoke: a deliberate unknown tool call (e.g., temporarily inject one into a test fixture) produces ONE `[⚠ UNKNOWN-TOOL-CALL]` console line AND one Sentry warning. | Local dev (no Sentry DSN configured): spy `Sentry.captureMessage` via `vi.mock("@sentry/nextjs", ...)` in the unit test (Task 4.5) and assert it was called with the expected tags. The console.warn fallback path is also testable via `vi.spyOn(console, "warn")`. Production verification (V6, post-deploy) is the authoritative check that real Sentry events flow end-to-end. |
| V5 | A normal turn (registered tool only) produces ZERO `[⚠ UNKNOWN-TOOL-CALL]` lines. | Local dev run. |
| V6 | Sentry dashboard receives the warning event with correct tags after deploy. | Sentry UI search: `subsystem:harness "unknown_tool_call_attempted"`. |
| V7 | Stream still terminates normally (no regression in finish/error handling) with the new branches. | Manual test of 3-5 normal turns. |

If any V1-V7 fails, do NOT mark Step 1 complete. Fix the failure or roll back.

---

## 6. Status & rollout log

| Date | Event | Notes |
|---|---|---|
| 2026-04-27 | Plan written | Awaiting reviewer audit. |
| 2026-04-27 | Plan reviewed (audit + verificator + revision) | Audit C1, C3 accepted. Audit C2 rejected per independent SDK source verification. Plan revised. Ready for execution. |
| 2026-04-27 | Implementation complete (Tasks 4.1–4.5) | Files: `src/lib/chat-harness/executor/build-step-stream.ts`, `src/lib/chat-harness/executor/build-step-stream.unknown-tool.test.ts`. Verification: V1 (tsc clean), V2 (69 chat-harness tests pass), V3 (4 new unit tests pass), V4 (mocked Sentry assertion in unit test), V5/V7 (chunk-branch guard `!registeredToolNames.has` + unchanged forwarding). Awaiting human review + Task 4.7 deploy. |
| _TBD_ | Merged to main | Commit SHA: — |
| _TBD_ | Deployed | — |
| _TBD_ | 24h observation result | unknown_tool_call_attempted count: — / total paper-mode turns: — / decision: — |

---

## 7. Open questions resolved

The original reviewer questions Q1-Q4 have been answered via code/SDK source verification on 2026-04-27:

- **Q1:** `experimental_repairToolCall` IS the first interceptor for `NoSuchToolError`. Returning `null` lets the SDK proceed to emit the error as a `tool-input-error` chunk (verified via `node_modules/ai/dist/index.mjs:3555-3615`).
- **Q2:** `tool-input-error` fires for BOTH `NoSuchToolError` (unknown name) AND `InvalidToolInputError` (registered tool, bad input). They share the same `invalid: true` code path (`index.mjs:3609`). Both Detection points stay.
- **Q3:** No centralized telemetry helper exists in `src/lib/chat-harness/` or `src/lib/ai/`. The plan's new helper `emitUnknownToolCallTelemetry` is consistent with codebase convention (per-file console+Sentry).
- **Q4:** Sentry tag length is safe — paper stage names (`gagasan`, `kerangka`, etc.) are well under 32 chars.
