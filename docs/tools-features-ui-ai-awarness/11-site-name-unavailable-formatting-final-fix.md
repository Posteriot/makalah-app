# Report 11: Site Name Unavailable Formatting — Final Fix

Date: 2026-04-09
Session: 2
Triggered by: Codex review — runtime retest showing siteName formatting still contaminated with domain

---

## What is already fixed

1. **Exact-source URL variant matching** — galley URL now resolves to stored article source via URL specificity tiebreaker (report 10, confirmed by Codex runtime retest).
2. **Search blocking on force-inspect** — `searchRequired=false` when force-inspect resolved (confirmed by runtime log).
3. **Exact-source reuse** — system correctly reuses stored exact source instead of re-searching.

## Exact remaining bug

Model output for siteName metadata:
```
Site Name: Tidak tersedia ... journal.unpas.ac.id
```

Domain commentary is still visually attached to the unavailable metadata field despite prior instruction patches.

## Root cause

**Two-layer failure:**

### Layer 1: Force-inspect note not injected during `pending_validation`

`shouldApplyDeterministicExactSourceRouting` (`route.ts:2826-2832`) is `false` when `stageStatus === "pending_validation"`:

```typescript
const shouldApplyDeterministicExactSourceRouting =
    !enableWebSearch &&
    !shouldForceGetCurrentPaperState &&
    !shouldForceSubmitValidation &&
    paperSession?.stageStatus !== "pending_validation" &&  // ← blocks it
    paperSession?.stageStatus !== "revision" &&
    availableExactSources.length > 0
```

When this is false, `buildDeterministicExactSourcePrepareStep` is never called. The force-inspect system note (which contains metadata discipline instructions) is never injected into messages. The `toolChoice: { type: "tool" }` constraint is never applied.

But search IS blocked earlier (`route.ts:2307-2314`) because the force-inspect resolution check runs before the routing guard.

**Result:** Model gets search blocked + no force-inspect discipline note + source inventory with URLs → answers from available context → appends domain to siteName.

### Layer 2: EXACT_SOURCE_INSPECTION_RULES wording had a loophole

The prior rule said: "Do NOT append ... to the same metadata field. If the user explicitly asks about the URL/domain separately, answer outside the metadata field block."

The model interpreted "answer outside the metadata field block" as permission to add domain commentary on a separate line or as trailing text after the metadata list — still visually attached to the metadata answer.

## This also explains the missing inspectSourceDocument logs

Codex observed that `[EXACT-SOURCE] inspectSourceDocument START/END` logs were missing from runtime output. This is NOT a logging bug.

**Root cause:** The `inspectSourceDocument` tool was never called. The `prepareStep` that forces `toolChoice: { type: "tool", toolName: "inspectSourceDocument" }` was not applied because `shouldApplyDeterministicExactSourceRouting` was false (pending_validation). Without the forced tool call, the model just answered from context without invoking the tool.

The logging at `paper-tools.ts:565` and `paper-tools.ts:628` only fires when the tool's `execute` function runs. Since the tool was never called, no logs were produced.

## Files changed

### Code changes

| File | Change |
|------|--------|
| `src/app/api/chat/route.ts` (primary path, ~line 2838) | When force-inspect resolved but full routing skipped (pending_validation), still inject the discipline note via `buildDeterministicExactSourcePrepareStep().messages`. Only prepareStep/maxToolSteps remain undefined. |
| `src/app/api/chat/route.ts` (fallback path, ~line 3752) | Same change for fallback model path. |
| `src/lib/ai/exact-source-guardrails.ts` (`buildDeterministicExactSourceForceInspectNote`) | Added STRICT METADATA OUTPUT block: "Do not mention domain, hostname, or URL anywhere in the metadata answer — not on the same line, not on a following line, not as trailing text, not in parentheses." |
| `src/lib/ai/exact-source-guardrails.ts` (`EXACT_SOURCE_INSPECTION_RULES`) | Replaced loophole wording ("answer outside the metadata field block") with absolute rule: "omit domain/hostname/URL commentary entirely — not on the same line, not on a following line, not as trailing text, not in parentheses." |

### Instruction changes

| File | Change |
|------|--------|
| `01-gagasan-skill.md` | EXACT METADATA DISCIPLINE: "do NOT append domain, hostname, URL commentary, or parenthetical explanation on the same metadata line" (unchanged from report 10) |
| `05-pendahuluan-skill.md` | Same |
| `06-tinjauan-literatur-skill.md` | Same |
| `09-diskusi-skill.md` | Same |
| `12-daftar-pustaka-skill.md` | Same |

Note: the 5 skill files were already patched in report 10. This report only tightened the code-layer guardrails and the route.ts injection path.

## Fix type

**Both code and instruction.**

| Fix | Type | Deterministic? |
|-----|------|----------------|
| Force-inspect note injection during pending_validation | Code | Yes — note is always injected when resolution is force-inspect |
| STRICT METADATA OUTPUT in force-inspect note | Instruction | No — probabilistic |
| EXACT_SOURCE_INSPECTION_RULES absolute wording | Instruction | No — probabilistic |

## Verification evidence

- TypeScript: `npx tsc --noEmit` — clean
- Tests: 28/28 pass
- Skills deployed to dev DB wary-ferret-59 (14/14 pass, dry-run clean)
- Runtime behavior NOT yet retested — user must rerun the OJS article metadata test

## Residual limitations

1. **Instruction-layer rules remain probabilistic.** The model may still occasionally include domain commentary despite the absolute wording. The code fix (injecting the note during pending_validation) ensures the model at least SEES the discipline instruction, but cannot guarantee compliance.

2. **prepareStep still not applied during pending_validation.** The tool call is not FORCED — only the note is injected. The model may choose not to call `inspectSourceDocument` and answer from context. This is by design to avoid conflict with `revisionChainEnforcer`, but means the tool execution is not guaranteed during pending_validation.

3. **Source inventory URLs remain visible.** The model still sees URLs in `SOURCE INVENTORY` context. The discipline rules tell it not to use them for metadata answers, but the information is present. A more drastic fix would be stripping URLs from source inventory during force-inspect, but this would break other legitimate uses.
