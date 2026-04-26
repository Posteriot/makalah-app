---
name: makalah-audit-harness
description: "Use when the user reports harness misbehavior in Makalah AI — artifact failing to generate, validation panel not appearing, model ignoring plan-spec, model over-discussing without terminating, stage transitions stuck, choice cards missing, or any stage 1-14 behavior diverging from the user-flow spec. This skill drives a user-flow-first audit methodology: the user-flow docs are the oracle for 'what SHOULD happen per stage', and the audit produces a gap report grounded in concrete evidence (file:line, screenshots, logs). It is the human-readable counterpart to makalah-durable-harness — same target system, but anchored in product behavior rather than REST/anatomy framework jargon. Use this BEFORE writing rebuild specs or task lists, so the rebuild is informed by observed gaps, not speculation."
---

# Makalah Audit Harness — User-Flow Lens

This skill audits the Makalah AI agent harness through the **user-flow lens**, not through engineering jargon. Premise: when the harness misbehaves, the fastest signal is "actual behavior diverges from what the user-flow doc says should happen". The user-flow docs are already split per stage, written in plain Indonesian, and already separate the user / model / harness perspectives — that is the audit map.

## When this skill fires

Invoke when the user reports any of:

- Artifact does not generate, generates late, or appears in the wrong stage.
- Validation panel fails to appear after artifact creation.
- Plan-spec (YAML) is not honored by the model — tasks skipped, reordered, or rewritten.
- Model over-discusses, fails to call tools, fails to mark terminal task complete.
- Choice card missing at end of response, or appears at wrong moment.
- Stage transition stuck (frozen at stage N, or skips N+1).
- General "harness feels fragile", "model won't comply", "stage X is broken".
- Before writing any rebuild spec or task list for harness work — gaps must be observed, not speculated.

Do NOT use this skill for:
- Pure UI bugs (CSS, layout) — not a harness concern.
- Single-file bugs with an obvious root cause — just fix.
- Greenfield features that do not touch the harness.

## Audit philosophy

> **The user-flow doc is the oracle.** If actual behavior does not match the user-flow doc, that is a gap. Record it, locate the cause, move on.

Do **not** start from jargon (REST, 12-component anatomy, control plane). Start from three questions, per stage:

1. **What should happen here?** (per user-flow doc)
2. **What actually happens?** (per runtime evidence + code)
3. **Where is the divergence?**

Engineering taxonomies (REST four pillars, anatomy 12 components, control-plane vs domain-action separation) are **secondary diagnostic tools**, used only after gaps are located, to classify causes for prioritization. They are not the entry point. If the final report leans on jargon to explain gaps, translate it back into product-behavior language before delivering.

## Hard prerequisites

Before running this skill, you MUST have already:

1. Invoked `branch-scope` — confirm `SCOPE.md` includes harness work.
2. Invoked `makalah-whitebook` — orient to White Book structure.
3. Read these three files, in order (they are the oracle source):
   - `docs/what-is-makalah/references/user-flow/index.md` — 14-stage map.
   - `docs/what-is-makalah/references/user-flow/user-flows-00.md` — **cross-stage mechanisms** (Plan-Spec lifecycle, choice card protocol, syncing contract, lifecycle states). This is the DNA. Memorize the structure, not the prose.
   - `docs/what-is-makalah/05-user-flow/02-core-mechanisms.md` — curated version of core mechanisms.

If any of these is unread, STOP and read them. Auditing without the user-flow oracle is guessing.

## Evidence sources per stage

For a stage-specific audit (1-14), use this matrix:

| Evidence type | Location |
|---|---|
| **Expected behavior per stage** | `docs/what-is-makalah/references/user-flow/user-flows-0X-<name>.md` |
| **Cross-stage mechanism** | `docs/what-is-makalah/references/user-flow/user-flows-00.md` |
| **Lifecycle states** | `docs/what-is-makalah/05-user-flow/03-lifecycle-states.md` |
| **Cross-stage logic** | `docs/what-is-makalah/05-user-flow/04-cross-stage-logic.md` |
| **Actual harness code path** | `src/`, `convex/` — read AFTER expected behavior is understood |
| **Runtime evidence** | Screenshots, console logs, network logs, Sentry traces, test artifacts |

## Methodology — five steps per stage

### Step 1: Extract expected behavior

For the stage reported broken (e.g., stage 5: Pendahuluan):
- Open `user-flows-05-pendahuluan.md` (and `user-flows-00.md` for shared mechanisms).
- Summarize, **per perspective**:
  - **What should the user see?** (input requested, output rendered, when choice card appears)
  - **What should the model do?** (plan-spec emitted, tools called, terminal task lifecycle)
  - **What should the harness do?** (capture, persist, render, validate, transition)

Output of Step 1 = a short paragraph per perspective. Do not copy-paste the doc.

### Step 2: Extract actual behavior

Evidence priority order:
1. **User-supplied runtime evidence** — screenshots, console logs, network panel. If the user provides these, read them yourself; do not delegate to a subagent (per `feedback_read_evidence_yourself`).
2. **Reproduction** — if feasible, run dev (`pnpm dev`) and observe. Use `chrome-devtools-mcp` or `playwright` skills if needed.
3. **Code path** — read relevant files in `src/` / `convex/`, tracing from entry point (route handler / mutation) to the complaint site.
4. **Git history** — if behavior regressed recently, `git log -p` on suspected files.

Output of Step 2 = a short paragraph "what actually happens" per the same perspective set as Step 1.

### Step 3: Record the gap

Per-gap format (this is what the user will read — keep it plain Indonesian, non-technical):

```
GAP-<stage>-<number>: <one-line summary>
  Harusnya: <short quote/paraphrase from user-flow doc + path:line>
  Aktualnya: <concrete observation + evidence: screenshot/log/code path:line>
  Dampak ke user: <what the user experiences>
  Severity: blocker | major | minor
  Classify: <internal label, optional — see Step 4>
```

Severity guide:
- **blocker** — user cannot proceed past this stage.
- **major** — user proceeds but with degraded experience or risk of data loss.
- **minor** — annoyance, no blocking impact.

If gaps exceed 5 per stage, track each as a TodoWrite item.

### Step 4: Classify cause (secondary, optional)

After all gaps are listed, optionally tag each with a cause class to drive fix prioritization. Pick the closest match — do not force every gap into a label.

Cause classes (use these labels, in plain Indonesian where the report exposes them):

- **Plan compliance** — model ignores stabilized plan-spec.
- **Tool dispatch** — required tool not called, or called at the wrong moment.
- **State persistence** — data exists in-session but lost across turns / refresh.
- **Stage transition** — guard missing, incorrect, or bypassable.
- **Prompt routing** — wrong / empty / outdated system prompt or stage skill injected.
- **Rendering pipeline** — capture and persist work, UI fails to render.
- **Stop condition** — model lacks signal to terminate discussion.
- **Idempotency** — retry / refresh corrupts state.

For deeper taxonomy (REST four pillars, anatomy 12 components, control-plane vs domain-action mapping) consult the `makalah-durable-harness` skill. **Default to the eight labels above** — they are sufficient for most audits and translatable to non-technical readers.

### Step 5: Deliver the report

The final report MUST be written in **plain Indonesian, Jakarta gue-lo register, non-technical**. The skill itself is in English (per project model-instruction policy), but its OUTPUT to the user is Indonesian. Translate every label, every cause, every recommendation into language a non-engineer can follow.

Report template:

```
# Audit Harness — Stage <X>: <nama>

## Ringkasan
<2-3 kalimat: jumlah gap, severity tertinggi, satu kalimat penyebab utama kalau sudah jelas>

## Gap yang ketemu
<list GAP entries from Step 3, sorted by severity>

## Rekomendasi (urut prioritas)
1. <highest-impact fix, with file:line to touch>
2. ...

## Yang belum diaudit
<honest disclosure — stages / aspects not yet examined>
```

Delivery rules:
- **Indonesian, non-technical.** No "REST", no "anatomy 12-component", no "control plane" in user-facing text. Translate to product-behavior language.
- **Evidence first, opinion last.** Every claim ties to a file:line or screenshot.
- **Honest disclosure.** If part of the audit is incomplete, say so. Do not claim coverage you did not deliver.
- **Pair concerns with recommendations.** (Per `feedback_stress_test_with_recommendation`.)
- **Never offer "leave it be" / "skip this" as an option.** (Per user preference recorded in MEMORY.md.)
- **One best recommendation, with reasoning.** No "up to you".

## Relationship to existing audit work

Branch `durable-agent-harness` already has phase 1-3 audit in `docs/makalah-agent-harness/phase.md`:
- Phase 1: per-claim verification (commit `0082b85e`)
- Phase 2: REST × 12-component gap matrix (commit `31ccb81a`)
- Phase 3: rebuild spec (commit `64797ba1`)

This skill **does not replace** phase 1-3. Phase 1-3 are engineering-rubric audits. This skill is the **user-flow lens** — complementary, used for:
- Re-auditing from a behavior perspective (cross-check phase 2 findings).
- Capturing new gaps that surface after phase 1-3 was written.
- Ad-hoc debug sessions when the user reports "stage X is broken".

When writing rebuild specs or task lists, **read phase 3 first** before adding new findings to avoid duplication.

## Anti-patterns (do not do)

- ❌ Start with "let me check the orchestration loop" before reading the user-flow doc — that is jargon-first.
- ❌ Use REST / 12-component labels in user-facing text. The user has explicitly said that register is unfriendly. Internal classification is fine; surface text is not.
- ❌ Summarize gaps without file:line evidence. Audit without evidence is opinion.
- ❌ Skip stages that "look OK" without checking — bugs hide in unobserved stages.
- ❌ Present "fix" vs "skip" as equally valid options. Pick one and justify.
- ❌ Edit the user-flow doc to match the code. The doc is authoritative (per the note in `references/user-flow/index.md`). If code diverges, **flag the divergence**; do not edit the doc.

## Output expectation

An audit session is complete when:
1. The full gap list for the targeted stage(s) is documented (or scope is explicitly bounded: "audit limited to stage X due to time/scope").
2. Every gap carries file:line evidence or a screenshot reference.
3. Recommendations are listed in priority order, each with a file:line target.
4. Coverage is honestly disclosed.
5. The user-facing report is in plain Indonesian, non-technical register.

If any of these is missing, the audit is not done.
