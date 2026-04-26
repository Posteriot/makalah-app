---
name: makalah-durable-harness
description: "Use when working on the durable-agent-harness branch, when the user asks to audit / rebuild / harden the Makalah harness for durability, or whenever scope involves Reliability, Efficiency, Security, Traceability of the agent runtime. Encodes the Makalah-specific durability rubric (REST framework + 12-component anatomy + Control Plane vs Domain Actions mapping) grounded in the White Book references at docs/what-is-makalah/06-agent-harness/ and docs/what-is-makalah/references/agent-harness/. Provides phase ordering (load → audit → gap → spec → tasks → implement) so audit always precedes rebuild and durability foundation precedes feature work."
---

# Makalah Durable Harness

This skill orchestrates audit and rebuild of the Makalah AI agent harness toward **durability** as defined in the White Book. It is grounded in the canonical references already in the repo — it does not duplicate their content. Read the live docs every time; they are the authority.

## When this skill fires

- Working on the `durable-agent-harness` branch (or any branch whose `SCOPE.md` mentions durable harness, reliability, resumability, idempotency, traceability of the agent runtime).
- User asks to audit current harness state, or rebuild any harness component for durability.
- User asks "is this durable?" / "apakah ini durable?" / "harness-nya gimana sekarang?" about Makalah.
- Before designing changes that touch: orchestration loop, state persistence, tool dispatch, context management, error recovery, runtime enforcers, observability.
- Before writing any spec or task list whose subject is the harness.

Do NOT use this skill for:
- Generic feature work that doesn't touch harness durability.
- Single-file bug fixes.
- UI/styling tasks.

## Hard prerequisites

Before invoking this skill, you MUST have already:

1. Invoked `branch-scope` — read `SCOPE.md` so you know the boundary of work on this branch.
2. Invoked `makalah-whitebook` — loaded White Book entry context.
3. Read these three reference files in order (they are the rubric source):
   - `docs/what-is-makalah/references/agent-harness/anatomy/anatomy-agent-harness.md` — 12-component production harness anatomy.
   - `docs/what-is-makalah/references/agent-harness/harness-engineering-guid.md` — REST framework, Control/Data Plane, Six Design Principles.
   - `docs/what-is-makalah/references/agent-harness/control-plane-domain-action.md` — Makalah-specific Control Plane vs Domain Actions vs Backend Contracts mapping.

If any of those is unread, STOP and read them first. The rubric below is meaningless without them.

## Durability rubric (the audit criteria)

The four pillars of a durable harness, per the engineering guide. **For each pillar, the audit must produce evidence (file path / line / observed behavior) — not opinion.**

### R — Reliability
- **Fault Recovery:** Can a run resume from checkpoint after an interrupt (SIGKILL, network failure, server restart)? Where is the checkpoint?
- **Operation Idempotency:** Can critical writes (artifact create/update, stage transitions, payment events) be retried safely without state corruption? What guard prevents double-apply?
- **Behavioral Consistency:** Same inputs → same outputs across retries? What deterministic anchor enforces this?

### E — Efficiency
- **Resource Control:** Token budget, API call budget, compute time budget — explicit limits per stage / per tenant / per task?
- **Low-Latency Response:** Time-to-first-action measured? Streaming feedback path verified?
- **High Throughput:** Batch / parallelism patterns where applicable?

### S — Security
- **Least Privilege:** Each tool / stage / role granted only what's needed? RBAC / Convex guards enforce at write time?
- **Sandboxed Execution:** Where do untrusted inputs run? What level of isolation (process / container / microVM / VM)?
- **I/O Filtering:** Prompt injection defense? PII / secret detection on tool input/output? Webhook signature verification?

### T — Traceability
- **End-to-End Tracing:** Every step from user request → final result has a traceable call chain?
- **Explainable Decisions:** Each critical decision (tool choice, stage transition, validation outcome) has an attribution record?
- **Auditable State:** Complete state at any historical point queryable? Run / step / event tables provide replay?

For each pillar, also map findings against the **12-component anatomy** (see `anatomy-agent-harness.md`):
1. Orchestration Loop · 2. Tools · 3. Memory · 4. Context Management · 5. Prompt Construction · 6. Output Parsing · 7. State Management · 8. Error Handling · 9. Guardrails & Safety · 10. Verification Loops · 11. Subagent Orchestration · 12. (implicit) Observability.

And the **Control Plane vs Domain Actions** boundary (see `control-plane-domain-action.md`): is the layer separation clean, or is harness-owned logic leaking into model-triggered tools / vice versa?

## Six design principles (the rebuild constraints)

When rebuilding any component, validate against the engineering-guide principles:

1. **Design for Failure** — exceptions are the norm. Every component supports fault tolerance, retries, graceful degradation.
2. **Contract-First** — explicit machine-readable schemas / APIs / events. No implicit contracts.
3. **Secure by Default** — least privilege, zero trust, defense-in-depth as starting point, not bolt-on.
4. **Separation of Concerns (Decision vs Execution)** — planning decoupled from execution, logically and physically.
5. **Everything is Measurable** — every behavior, decision, resource is quantifiable.
6. **Data-Driven Evolution** — closed loop of collection / labeling / feedback. Each run is a learning opportunity.

State Separation Principle (non-negotiable per engineering guide):
> The LLM is a stateless compute unit (a "CPU"). All state requiring cross-turn consistency must be offloaded to an external Context State Manager / persistence engine controlled by the harness. The anti-pattern: forcing the LLM to maintain complex state via prompt engineering.

## Phase order (do not skip, do not reorder)

### Phase 0 — Load context
Re-read SCOPE.md, the three reference files (anatomy, engineering-guid, control-plane), the current `06-agent-harness/` index + sub-files. Do NOT proceed to Phase 1 until this is done.

### Phase 1 — Audit current state
Verify each claim in `06-agent-harness/01-06.md` against `src/` aktual. The doc is "forensically audited" but reality drifts — check.
- For each component (orchestration loop, tool dispatch, context, safety, persistence) read the doc, then open the cited source file, then verify the doc's claim matches the code.
- Mark each claim: ✅ accurate / ⚠️ partial / ❌ stale / 🆕 doc missing claim that exists in code.
- Output: per-claim verification log.

### Phase 2 — Gap analysis
Build a matrix: **REST pillar × 12 component**, status = solid / partial / absent / divergent. Each cell cites evidence (file:line) from Phase 1. Empty cells are not allowed — write "n/a (justification)" if a cell genuinely doesn't apply.

Gap matrix is the input to Phase 3. Without it, spec writing is guesswork.

### Phase 3 — Spec
Write a rebuild spec for the gaps identified in Phase 2. Spec must include:
- Target state (per pillar, per component).
- Constraints from the Six Design Principles + State Separation Principle.
- Backwards-compatibility / migration path for existing data (Convex tables, in-flight runs).
- Out-of-scope explicit list.

If you have `agent-os:write-spec` or similar installed, use it as the writing helper. The spec content is what matters; the tool is replaceable.

### Phase 4 — Task breakdown
Decompose spec into executable tasks. Each task:
- Touches one durability pillar primarily (avoid mixing R + S in one PR).
- Has explicit acceptance criteria tied to evidence (test, observable behavior, verification command).
- Is ordered by dependency (persistence layer before resume logic; contract before consumer).

If you have `agent-os:create-tasks` or `superpowers:writing-plans`, use them. If not, write the task list manually following the structure above.

### Phase 5 — Implement
Execute tasks one at a time. For each task:
- Read relevant source.
- Make change.
- Run verification (test / observable behavior / lint as applicable).
- Commit small. Do NOT bundle multiple pillars in one commit.

If you have `agent-os:implement-tasks` or `superpowers:executing-plans`, use them. Otherwise execute manually with TodoWrite for tracking.

After each task: re-check the gap matrix cell. Mark resolved or note remaining gap.

## Anti-patterns (do NOT do)

- ❌ Skip Phase 1 audit. Rebuilding without verifying current state = building on assumed foundation. The "06-agent-harness/" docs are not ground truth — code is.
- ❌ Bundle pillars in one PR. Reliability fix + Security fix in one commit = hard to review, hard to revert. One pillar per commit minimum.
- ❌ Force LLM to maintain state via prompt. Anti-pattern explicit in engineering guide. State goes to external store.
- ❌ Add features during durability rebuild. Scope discipline — durability work first, features after foundation solid.
- ❌ Quote anatomy / engineering-guid from memory. Re-read each phase. Concepts evolve.
- ❌ Ignore Control Plane vs Domain Actions boundary. If audit finds harness-owned logic in a model-triggered tool, that's a finding, not a stylistic preference.
- ❌ Skip evidence in audit findings. "I think X is broken" is not a finding. "File `path/file.ts:123` does Y, doc claims Z, divergent" is a finding.
- ❌ Treat absent observability as "low priority." Traceability is one of four REST pillars — equal weight to Reliability.

## Checkpoints (forced gates)

Before transitioning between phases, verify:

- **Phase 0 → 1:** Three reference files read in current session? `06-agent-harness/` index read? SCOPE.md read?
- **Phase 1 → 2:** Per-claim verification log produced? Each component verified?
- **Phase 2 → 3:** Gap matrix complete (no empty cells)? Each cell has evidence?
- **Phase 3 → 4:** Spec includes target state per pillar? Migration path defined? Out-of-scope list explicit?
- **Phase 4 → 5:** Tasks ordered by dependency? Each task has acceptance criteria?

If a checkpoint fails, do not advance. Go back and complete.

## Output expectation

When invoking this skill, your responses must:
- Cite source files for every claim ("From `02-orchestration-loop.md` line N: …" or "Code at `src/lib/.../file.ts:123`: …").
- State which phase you are in.
- Show the rubric cell being addressed (e.g., "Reliability × Component #7 State Management").
- Do not assert without evidence.

If you find code/doc divergence: trust code for current behavior, flag divergence explicitly, do NOT auto-edit White Book files. White Book updates need user approval per `makalah-whitebook` skill rules.

## Relationship to other skills

- `branch-scope` (prerequisite, every session) — bounds the work.
- `makalah-whitebook` (prerequisite, every session) — provides general codebase context.
- `debater-anti-sycophancy` — runs throughout. Audit findings must be debated, not narrated. User pushback must be verified, not absorbed.
- `agent-os:write-spec / create-tasks / implement-tasks` — optional helpers for Phase 3-5 if installed.
- `superpowers:writing-plans / executing-plans` — alternative to agent-os.
- `voltagent-qa-sec:architect-reviewer` — optional second-opinion at gap-matrix boundary.

The phase order and rubric are non-negotiable; the helper skills are interchangeable.
