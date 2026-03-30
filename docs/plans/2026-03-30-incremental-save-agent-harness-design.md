# Incremental Save Agent Harness Design (v1)

> Harness-driven incremental draft saves for paper-mode stages.
> v1 scope: gagasan + topik only. No auto-submit. No global schema changes.

## Principle

**Harness controls timing, model controls content.** The harness decides *when* and
*which field* to save. The model decides the *content* of that field. A per-turn
system note gives the model context so it generates meaningful output.

## Decisions (from brainstorming + review)

| Decision | Choice | Why |
|----------|--------|-----|
| Narration style | Mix — natural discussion, harness saves incrementally | A too noisy, B loses transparency, C natural |
| Save granularity | Strict per-field — one `saveStageDraft` per turn | Whole point is incremental visibility |
| Enforcement trigger | Every function-tools turn — check next empty field | Trigger-based reliable, conditional fragile, lazy permissive |
| Draft vs mature save | **Separate tool: `saveStageDraft`** — `updateStageData` stays strict | Preserves existing contract across all 14 stages |
| ringkasan | **Unchanged** — required in `updateStageData`, absent from `saveStageDraft` | No global blast radius |
| Prompt changes | Minimal — remove "save after mature", add "system will prompt" | Prompt-only has ~50% compliance; harness enforces |
| Artifact + submit | **User-initiated** — no auto-submit in v1 | Preserves explicit approval contract per foundation.ts |
| Stage scope | **gagasan + topik only** in v1 | Other stages have complex fields (array, enum, nested) needing richer metadata |

## Architecture

### Flow (gagasan example)

```
Turn 1 (search): referensiAwal auto-persist → 1/4
Turn 2 (func-tools): harness force saveStageDraft(ideKasar) → 2/4, model free text
Turn 3 (func-tools): harness force saveStageDraft(analisis) → 3/4, model free text
Turn 4 (func-tools): harness force saveStageDraft(angle) → 4/4, model free text
Turn N (user-initiated): model calls updateStageData(ringkasan + all) + createArtifact
Turn N+1 (user confirms): submitStageForValidation
```

### prepareStep Priority Chain

```
1. Exact source routing      (highest — safety critical)
2. Sync request              (getCurrentPaperState)
3. Save/submit intent        (user explicitly asks)
4. Incremental save  ← NEW   (harness-driven per-field draft save)
5. Default undefined          (model decides)
```

## New Tool: `saveStageDraft`

### Semantics

| Aspect | `saveStageDraft` (NEW) | `updateStageData` (UNCHANGED) |
|--------|------------------------|-------------------------------|
| Purpose | Draft checkpoint — one field per call | Mature save — all fields + ringkasan |
| ringkasan | Not in schema | Required (as today) |
| Invoked by | Harness via prepareStep only | Model, after discussion matures |
| Backend | Reuses `paperSessions.updateStageData` mutation | Same as today |
| Prompt mention | **Not mentioned** in stage instructions | Documented in stage instructions |
| Scope | gagasan + topik only (v1) | All 14 stages |
| Access control | **Hard-gated** — execute-time flag blocks calls outside incremental mode | Always available |

### Hard-Gate Mechanism

`saveStageDraft` is registered in the global tools object (required by streamText API),
but is **functionally gated** via an execute-time flag:

```typescript
// In route.ts, before createPaperTools():
const draftSaveGate = { active: false }

// Passed to createPaperTools() via context:
...createPaperTools({ ..., draftSaveGate })

// Inside saveStageDraft.execute():
if (!draftSaveGate.active) {
    return { success: false, error: "saveStageDraft only available during incremental save mode." }
}

// After incrementalSaveConfig is computed:
if (incrementalSaveConfig) {
    draftSaveGate.active = true
}
```

**Why execute-time gate instead of conditional inclusion:**
- `tools` registry is built (~line 1770) before `incrementalSaveConfig` is computed (~line 2207)
- Restructuring tool build order would require major refactor
- Execute-time gate is per-request (route handler runs fresh), no stale state risk
- Defense-in-depth: even if model bypasses `activeTools` restriction, execute blocks

**When incremental step IS active**, harness also constrains via prepareStep:
- `activeTools: ["saveStageDraft"]` — only this tool visible
- `toolChoice: { type: "tool", toolName: "saveStageDraft" }` — forced call
- Next step immediately sets `toolChoice: "none"` — model cannot call twice

### Schema

```typescript
const DRAFT_SAVE_ALLOWED_FIELDS = {
  gagasan: ["ideKasar", "analisis", "angle"] as const,
  topik: ["definitif", "angleSpesifik", "argumentasiKebaruan", "researchGap"] as const,
} as const

saveStageDraft: tool({
    description:
        "Save a single draft field for the current stage. "
        + "System-driven incremental checkpoint — do not call unless instructed by the system.",
    inputSchema: z.object({
        field: z.enum([
            "ideKasar", "analisis", "angle",
            "definitif", "angleSpesifik", "argumentasiKebaruan", "researchGap",
        ]),
        value: z.string().min(1),
    }),
    execute: async ({ field, value }) => {
        // 1. Check gate — reject if not in incremental mode
        // 2. Fetch session, get currentStage
        // 3. Validate field allowed for this stage via isAllowedDraftField()
        // 4. Call paperSessions.updateStageData mutation with { [field]: value }
        // 5. Filter "Ringkasan not provided." warning (exact prefix match)
        // 6. Pass through all other warnings (unknown keys, URL validation)
    }
})
```

### Shared Helpers (`draft-save-fields.ts`)

```typescript
export function isDraftSaveSupportedStage(stage: string): boolean
export function isAllowedDraftField(stage: string, field: string): boolean
export function getDraftSaveAllowedFields(stage: string): readonly string[]
```

Used by both `paper-tools.ts` (saveStageDraft validation) and
`incremental-save-harness.ts` (stage support guard).

### Warning Filter (`paper-tools-draft-save.ts`)

Backend always returns `"Ringkasan not provided. This stage CANNOT be approved..."` on
saves without ringkasan (paperSessions.ts:738-741). For `saveStageDraft`, this is
expected noise. Filter by exact prefix `startsWith("Ringkasan not provided.")`.
Other warnings (unknown keys, URL validation) pass through.

## Core Function: `buildIncrementalSavePrepareStep()`

### Location: `incremental-save-harness.ts`

### Signature

```typescript
function buildIncrementalSavePrepareStep(opts: {
  currentStage: string
  stageData: Record<string, unknown>
  stageStatus: string
  enableWebSearch: boolean
}): IncrementalSaveConfig | undefined
```

### Decision Tree

```
1. Guard: enableWebSearch === true? → return undefined
2. Guard: stageStatus !== "drafting"? → return undefined
3. Guard: !isDraftSaveSupportedStage(currentStage)? → return undefined
4. Get task definitions for currentStage from task-derivation.ts
5. Get current stageData fields
6. Find FIRST incomplete field (skip auto-persist fields)
7. No incomplete field? → return undefined
8. Return incremental config:
     step 0: force saveStageDraft, activeTools: ["saveStageDraft"]
     step 1: toolChoice "none", activeTools: []
     maxToolSteps: 2
```

### Auto-Persist Field Skip

```typescript
const AUTO_PERSIST_FIELDS: Record<string, string[]> = {
  gagasan: ["referensiAwal"],
  topik: ["referensiPendukung"],
}
```

### System Note

Per-turn note injected into messages (same pattern as `getFunctionToolsModeNote`):

```
══════════════════════════════════════════════════════════════
MODE: INCREMENTAL_SAVE | Field: ideKasar
INSTRUCTION: Save your "ideKasar" (Eksplorasi ide) now using saveStageDraft.
Base it on the discussion and references so far.
If discussion hasn't covered this yet, provide your best draft
based on available references.
══════════════════════════════════════════════════════════════
```

## Changes Per Layer

| Layer | File | Change |
|-------|------|--------|
| Shared helpers | `draft-save-fields.ts` (new) | `isDraftSaveSupportedStage()`, `isAllowedDraftField()`, `getDraftSaveAllowedFields()` |
| Warning filter | `paper-tools-draft-save.ts` (new) | `filterDraftSaveWarnings()` |
| New tool | `paper-tools.ts` | Add `saveStageDraft` to `createPaperTools()` return object, with gate |
| Tool context | `paper-tools.ts` | Accept `draftSaveGate` in context parameter |
| Harness logic | `incremental-save-harness.ts` (new) | `buildIncrementalSavePrepareStep()` |
| Route integration | `route.ts` | Create gate, pass to createPaperTools, build config, inject note, wire prepareStep/stopWhen (primary + fallback), activate gate |
| Prompt | `paper-mode-prompt.ts` | Remove "save after mature", add "system will prompt incremental save" |
| Tool schema | `paper-tools.ts` (`updateStageData`) | **No change** |
| Stage instructions | `foundation.ts` | **No change** |
| Submit flow | `route.ts` | **No change** |
| Convex backend | `paperSessions.ts` | **No change** |
| UI | No change | UnifiedProcessCard auto-reflects stageData via subscription |

## Integration in route.ts

```typescript
// 1. Create gate BEFORE tools are built (~line 1768)
const draftSaveGate = { active: false }

// 2. Pass gate to createPaperTools (~line 1770)
...createPaperTools({ ..., draftSaveGate })

// 3. Build config AFTER search router (~line 2207)
const incrementalSaveConfig = (
  !enableWebSearch && paperModePrompt
  && !shouldForceGetCurrentPaperState && !shouldForceSubmitValidation
  && paperSession
)
  ? buildIncrementalSavePrepareStep({ ... })
  : undefined

// 4. Activate gate
if (incrementalSaveConfig) {
    draftSaveGate.active = true
}

// 5. Inject system note into messages (non-search branch)
// 6. Wire prepareStep priority chain (primary + fallback providers)
```

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User hasn't discussed field yet | Model generates best draft from referensi; draft save, user can revise via discussion |
| Model generates garbage | No quality gate by design (tools = simple executors); field gets overwritten on next draft or mature save |
| Exact source routing active | Priority chain: exact source wins, incremental skipped this turn |
| User explicitly asks save/submit | shouldForceSubmitValidation wins in priority chain |
| Stage is not gagasan/topik | isDraftSaveSupportedStage returns false, harness returns undefined |
| All fields complete, not submitted | Returns undefined; model proceeds to mature save naturally |
| Model tries saveStageDraft with wrong field | isAllowedDraftField rejects with error |
| Model calls saveStageDraft outside incremental mode | **Hard-gated**: execute-time flag returns error |
| Model calls saveStageDraft in search turn | Gate inactive + enableWebSearch prevents harness activation |

## What This Design Does NOT Do (v1 boundaries)

- Does NOT change `updateStageData` schema (ringkasan stays required)
- Does NOT auto-submit (approval remains user-initiated)
- Does NOT cover stages beyond gagasan/topik
- Does NOT change stage instructions in foundation.ts
- Does NOT add ordering semantics to task-derivation.ts (ordering lives in harness only)

## Terminology

This design implements an **agent harness** pattern — specifically the **loop control**
and **per-step context engineering** aspects. The harness (`buildIncrementalSavePrepareStep`)
controls tool dispatch timing; the model (via prompt context) controls content quality.

Reference: Anthropic "Effective harnesses for long-running agents" (2025).
