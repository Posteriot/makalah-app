# Handoff — F2: Gagasan Belum Jadi Hub

> Branch: `feature/paper-sessions-enforcement`
> Worktree: `.worktrees/agentic-paper-sessions-enforcement`
> Previous: F1 (ringkasan removal) implemented and tested
> Date: 2026-04-03

---

## F1 Status

F1 implemented across 16 commits (`222bcc60`..`294c5fa1`). Core changes:

- `ringkasan`/`ringkasanDetail` removed from tool schemas, backend guards, context builder, stage instructions, admin UI
- Artifact is now SSOT — `formatArtifactSummaries()` is the sole source of completed stage context
- Memory digest derives from `artifact.title` (legacy fallback to ringkasan for old sessions)
- Convex validators keep `legacyRingkasanFields` for backward compat with existing DB documents
- `nextAction` field added to `updateStageData` return — guides model to call `createArtifact` after saving
- All 778 tests pass, TypeScript clean

### Known issue from F1 testing

**Phantom auto-approval:** During manual testing, `approveStage` mutation fires without user clicking the validation panel button. `console.trace` added to `handleApprove` in ChatWindow.tsx (commit `071a7059`) but browser console output not yet captured. Root cause unknown. The validation panel renders correctly (`stageStatus === "pending_validation" && status !== 'streaming'`), but something triggers `handleApprove` automatically ~2 seconds after panel appears. NOT an F1 regression — mechanism predates F1 changes. Needs browser DevTools Console trace to identify caller.

---

## F2 Scope — from findings.md

**Problem:** All 14 stages have identical search patterns. No differentiation between stages that need heavy research (gagasan, tinjauan_literatur) vs stages that should just execute from existing material.

**Goal:** Implement 4 stage modes that control search allocation:

| Mode | Stages | Search behavior |
|------|--------|----------------|
| **Mode 1: Discussion + Dual Search** | gagasan | Proactive dual search (non-academic + academic). Maximize discussion. |
| **Mode 2: Derivation** | topik | No search. Derive from gagasan material. |
| **Mode 3: Review** | abstrak, pendahuluan, metodologi, hasil, diskusi, kesimpulan, all finalization | No search. Generate from existing material, present for review. |
| **Mode 4: Deep Academic Search** | tinjauan_literatur | Proactive academic search (journals, studies, frameworks). |

**Key constraint:** Search is instruction-driven. The model cannot initiate web search via tools — it requests search in chat text, and the harness (search router) decides whether to execute. Stage instructions control whether the model asks for search.

---

## Files to modify

All changes are instruction rewrites (natural language in template literal strings). No code logic changes.

| File | Stages | Current | Target |
|------|--------|---------|--------|
| `src/lib/ai/paper-stages/foundation.ts` | gagasan | "If needed... request a web search" | Mode 1: proactive dual search |
| `src/lib/ai/paper-stages/foundation.ts` | topik | "request a web search for more specific literature" | Mode 2: no search, derivation only |
| `src/lib/ai/paper-stages/core.ts` | abstrak, pendahuluan | "Request a web search if additional supporting data is needed" | Mode 3: no search, review mode |
| `src/lib/ai/paper-stages/core.ts` | tinjauan_literatur | "Request a web search for deeper literature exploration" | Mode 4: deep academic search, proactive |
| `src/lib/ai/paper-stages/core.ts` | metodologi | No explicit search (correct) | Mode 3: confirm no search |
| `src/lib/ai/paper-stages/results.ts` | hasil, diskusi, kesimpulan | Passive/optional | Mode 3: no search |
| `src/lib/ai/paper-stages/finalization.ts` | pembaruan_abstrak, daftar_pustaka, lampiran, judul, outline | Passive | Mode 3: no search |
| `src/lib/ai/paper-mode-prompt.ts` | General rules | No mode distinction | Add mode-aware general rule |

---

## What to read first

1. **This handoff** — current state
2. `docs/agentic-paper-sessions-enforcement/findings.md` § F2 — full problem statement with evidence table and expected outcome
3. `docs/agentic-paper-sessions-enforcement/context-verified-state.md` § Section 2 — verified search instruction locations
4. `src/lib/ai/paper-stages/foundation.ts` — gagasan + topik instructions (primary targets)
5. `src/lib/ai/paper-stages/core.ts` — tinjauan_literatur instructions (Mode 4 target)

---

## Dependencies

- F1 must be complete (it is) — ringkasan removal unblocks clean instruction rewrites
- F2 defines stage roles that F3 (agentic flow) and F4 (artifact as workspace) depend on
- Do NOT start F3 before F2 is done

---

## Approach guidance

- This is purely instruction rewrite — no tool changes, no backend changes, no schema changes
- Each stage instruction is a template literal string in the paper-stages files
- The search router (`src/lib/ai/search-router.ts`) uses the model's text output to decide search — instructions that say "do not search" or "search proactively" directly control this
- Test each mode manually: start a paper session, observe whether the model requests search at the right stages
- Line numbers in findings.md are pre-F1; re-verify against current code before editing
