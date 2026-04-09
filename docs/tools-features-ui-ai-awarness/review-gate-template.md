# Review Gate Report Template: Tools, Features & UI Awareness Implementation

Date: YYYY-MM-DD
Branch: `tools-features-ui-ai-awarness`
Executor: Claude Code
Reference plan: `docs/tools-features-ui-ai-awarness/02-design-implementation-plan.md`
Reference research: `docs/tools-features-ui-ai-awarness/01-research-report.md`

---

## 1. Execution Summary

Briefly state what was implemented and whether all planned phases were completed.

- Overall status: `completed` / `partial` / `blocked`
- Phases completed:
- Phases not completed:
- Primary blocker (if any):

## 2. Phase-by-Phase Implementation

Document the actual work done for each phase from the implementation plan.

### Phase 1 — System Prompt Patch

- Files changed:
- Exact section added/updated:
- Final wording summary:
- Any deviation from plan:

### Phase 2A — readArtifact in 14 Skill Files

- Files changed:
- Exact wording used:
- Any stage-specific variation:
- Any deviation from plan:

### Phase 2B — Exact Source Tools in 5 Skill Files

- Files changed:
- Exact wording used:
- Difference between active-search stages vs source-referencing stages:
- Any deviation from plan:

### Phase 3 — Paper Mode Prompt Patch

- Files changed:
- Exact insertion point:
- Final wording summary:
- Any deviation from plan:

### Phase 4 — `route.ts` Language Policy Fix

- Files changed:
- Original wording replaced:
- Final English wording:
- Confirmation no behavior logic changed:

### Phase 5A — `compileDaftarPustaka` Preview Guidance

- Files changed:
- Exact wording used:
- Why these stages were selected:

### Phase 5B — `ChoiceTextarea` Awareness

- Files changed:
- Exact wording used:
- Insertion point inside existing rules:

### Phase 6 — `paper-tools.ts` Verification

- Files verified:
- Contradictions found: `none` / describe
- Edits required: `yes` / `no`
- Evidence:

### Phase 7 — `choice-yaml-prompt.ts` Consistency Verification

- Files verified:
- Contradictions found: `none` / describe
- Edits required: `yes` / `no`
- Evidence:

## 3. File Inventory

List every file actually modified.

| File | Type of change | Related phase |
|------|----------------|---------------|
| `path/to/file` | add / edit / verify-only | Phase X |

## 4. Verification Evidence

Show concrete evidence, not claims.

### 4A. Language Policy

- Confirm all new model-facing instructions are in English.
- Confirm no Indonesian was introduced in system prompt, skill files, tool descriptions, or prompt patches.
- Commands / checks used:
- Result:

### 4B. Cross-Layer Consistency

- System prompt vs skill files:
- Skill files vs tool descriptions:
- Paper mode prompt vs choice card boundary:
- Commands / checks used:
- Result:

### 4C. Scope Compliance

Confirm implementation stayed within the 6 awareness categories in `SCOPE.md`.

- In-scope items covered:
- Out-of-scope items intentionally not changed:
- Any scope drift:

### 4D. Runtime-Behavior Accuracy

For each UI/tool awareness patch, confirm it matches real code behavior.

- Artifact system:
- Source system:
- PaperValidationPanel:
- Process/status UI:
- Exact source tools:
- readArtifact:

## 5. Deviations From Plan

Record every intentional deviation from `02-design-implementation-plan.md`.

| Planned item | Actual outcome | Reason |
|--------------|----------------|--------|
| example | example | example |

If there were no deviations, write: `No deviations.`

## 6. Risks and Open Questions

List only real residual risks after implementation.

- Risk 1:
- Risk 2:
- Open question 1:

## 7. Ready for Review

State exactly what Codex should audit next.

- Review target:
- Priority files:
- Suggested audit order:
- Claimed completion status:

## 8. Diff / Evidence Pointers

Provide precise pointers for the reviewer.

- Relevant diff / commit:
- Key files with line ranges to inspect:
- Verification commands already run:
