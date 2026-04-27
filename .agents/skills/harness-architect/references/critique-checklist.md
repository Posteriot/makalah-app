# Harness Critique Checklist

This file is the audit playbook. Use it in critique mode to map symptoms to root causes, count agnosticism leaks, and produce an ordered remediation plan.

## Symptom → component → likely root cause

When a user reports an agent defect, locate the responsible component(s). Multi-component defects reveal architectural gaps, not bugs.

| Symptom | Primary component(s) | Likely root cause |
|---|---|---|
| Agent forgets earlier steps | 3 Memory, 4 Context Mgmt | No tiered memory; or compaction throws away decisions |
| Agent re-discovers same conclusions repeatedly | 4 Context Mgmt, 7 State | Compaction strips reasoning traces; state not persisted |
| Tool calls fail silently | 6 Output Parsing, 8 Error Handling | Errors swallowed, not returned as observations |
| Tool calls succeed but wrong tool chosen | 2 Tools, 4 Context Mgmt | Tool overload (>10 overlapping); descriptions unclear |
| Agent responds to questions instead of acting | 1 Loop, 6 Output Parsing | Loop terminates on text without checking tool intent |
| Long sessions get slow | 4 Context Mgmt, 12 Lifecycle | No compaction; no token budget |
| Long sessions get expensive | 4 Context Mgmt, 12 Lifecycle | Same as above + no per-task budget |
| Agent claims success when output is wrong | 10 Verification | No verification loop; or verification only at end |
| Agent ignores user-defined rules | 5 Prompt Construction, 9 Guardrails | Priority stack unclear; or rules in user-level vs system-level |
| Agent leaks data | 9 Guardrails, 12 Lifecycle | No I/O filtering; no audit logging to detect leaks |
| Agent gets stuck in loops | 1 Loop, 8 Error Handling | No max-turn limit; transient errors retried infinitely |
| Long-running task can't resume after crash | 7 State, 12 Lifecycle | No checkpointing; not idempotent |
| Output format inconsistent | 6 Output Parsing | No schema enforcement; relying on prose conventions |
| Provider swap breaks behavior | (architectural) | Provider name leaked outside model adapter |
| Multi-agent setup slower than single-agent | 11 Subagents | Premature multi-agent; routing overhead exceeds benefit |
| Permissions feel both annoying AND unsafe | 9 Guardrails, decision §5 | Wrong permission granularity; split risk levels |
| Agent runs out of context mid-task; next session starts confused | 13 Continuity, decision §8 | Long-running task without Initializer/Coding split; relying on compaction alone (insufficient per source #3) |
| Later agent declares premature victory while features remain unbuilt | 13 Continuity | No persistent feature inventory; agent has no way to know what's still missing — this is **not** a verification gap, it's a session-boundary gap |
| Agent wastes turns figuring out how to run the app every session | 13 Continuity | No `init.sh` or equivalent boot script |
| Agent marks features `passes: true` but they're broken in the browser | 10 Verification, 13 Continuity | Unit-test-only verification; no end-to-end browser automation (e.g., Puppeteer MCP); for UI work this is mandatory |
| Feature list / progress notes get overwritten by the agent | 13 Continuity | Markdown-formatted feature list; switch to JSON (model is empirically less likely to overwrite JSON) |
| Each session re-discovers prior decisions | 13 Continuity, 7 State | No progress file or git history is being read at session start; getting-up-to-speed ritual missing |

## Agnosticism leak audit

Run these three scans on any harness claiming to be model-agnostic. Count instances; each instance is a finding.

### Scan 1: State Separation violations

**What to look for:**
- State referenced via "remember that...", "as we established earlier..." in prompts (state stored in conversation history is fine; state stored *only* there is the violation)
- Memory of facts, preferences, or progress encoded in system prompts at runtime (vs loaded from external store)
- Tool implementations that read/write to model "memory" rather than to a Context State Manager

**How to measure:** Count code paths where cross-turn state is loaded from the model's context-only memory rather than from a controlled external store.

**Severity:** Each violation forces provider lock-in (different providers have different memory semantics) and breaks pause/resume.

### Scan 2: Contract-First violations

**What to look for:**
- Tool definitions using SDK-specific decorators (e.g., `@some_provider.function_tool`) in business logic files
- Tool argument extraction using SDK-specific parsers in non-adapter code
- Schema definitions duplicated across provider adapters (vs defined once in a contract layer)

**How to measure:** Count tool definitions outside the adapter layer that import from a specific provider SDK.

**Severity:** Each violation makes provider swap a code rewrite, not a config change.

### Scan 3: Control/Data Plane leaks

**What to look for:**
- Provider name (e.g., "openai", "anthropic", "vertex") appearing in files that are not the model adapter
- Provider-specific HTTP error codes handled in the orchestration loop
- Provider-specific token counting in context management

**How to measure:** Grep for provider names across the codebase. Subtract adapter-layer occurrences. Remaining count = leaks.

**Severity:** Each leak couples your runtime to a vendor's release cycle.

### Reporting the findings

```
Agnosticism leak inventory:
  State Separation:    {N} violations across {M} files
  Contract-First:      {N} violations across {M} files
  Control/Data Plane:  {N} leaks across {M} files

Top three remediation candidates (by leverage):
  1. [file:line] — [violation type] — [estimated effort]
  2. ...
  3. ...
```

## Implicit decision audit

For each of the 8 decisions in `decisions.md`, determine the harness's *actual* choice and whether it was deliberate.

**Procedure for each decision:**

1. State the choice the codebase implements (read the code; do not infer from docs).
2. Search for design docs, ADRs, or commit messages explaining the choice.
3. Mark as **deliberate** (documented + rationale present) or **implicit** (no documentation, choice made by default).
4. For implicit choices: state the cost — what would have been done differently if the decision were made consciously.

**Output table:**

| # | Decision | Actual choice | Status | Cost of being implicit |
|---|---|---|---|---|
| 1 | Single vs multi-agent | ... | implicit/deliberate | ... |
| 2 | ReAct vs Plan-and-Execute | ... | ... | ... |
| 3 | Context strategy | ... | ... | ... |
| 4 | Verification design | ... | ... | ... |
| 5 | Permission model | ... | ... | ... |
| 6 | Tool scoping | ... | ... | ... |
| 7 | Harness thickness | ... | ... | ... |

Implicit decisions are the highest-leverage critique targets. Each one is a place where the architect skipped a choice and let defaults fill in — which means the design is fragile to changes in those defaults.

## REST scorecard

Score each REST objective on its key requirements. Use a simple scale:

- **0** = not implemented
- **1** = partial / fragile
- **2** = solid

| Objective | Requirement | Score | Evidence |
|---|---|---|---|
| Reliability | Fault recovery (checkpointing, resume) | | |
| Reliability | Operation idempotency | | |
| Reliability | Behavioral consistency | | |
| Efficiency | Resource control (budgets) | | |
| Efficiency | Low-latency response | | |
| Efficiency | High throughput | | |
| Security | Least privilege | | |
| Security | Sandboxed execution | | |
| Security | I/O filtering | | |
| Traceability | End-to-end tracing | | |
| Traceability | Explainable decisions | | |
| Traceability | Auditable state | | |

Zero scores in Security or Reliability are critical findings. Zero scores in Traceability mean every other finding is hard to verify — fix Traceability first.

## Six-principles audit

For each principle in `decisions.md`, answer with evidence:

1. **Design for Failure** — Does every component support fault tolerance, retries, graceful degradation? List components missing this.
2. **Contract-First** — Are all interactions schema-defined? List interactions defined only by code conventions.
3. **Secure by Default** — Is least privilege the default? List places where defaults are permissive.
4. **Separation of Concerns** — Are decision and execution separated? List places where the model executes directly without a planning step, or where execution drives planning.
5. **Everything is Measurable** — Are critical decisions and resource use measured? List unmeasured paths.
6. **Data-Driven Evolution** — Is there a closed loop from production data back into improvements? Describe the loop or note its absence.

## Remediation plan format

Critique without remediation is not a deliverable. Output:

```
Remediation plan (ordered by leverage / risk-adjusted impact):

1. [Change description]
   - Layer touched: control plane / data plane / contracts / [component #]
   - Risk: low / medium / high (with one-line justification)
   - REST objectives improved: Reliability / Efficiency / Security / Traceability
   - Rough effort: hours / days / weeks
   - Reversal trigger if this change turns out wrong: ...

2. ...

Recommended first change: #N
Rationale: [why this one before the others — usually highest impact at lowest risk, OR a precondition that unblocks the rest]
```

Do not deliver more than 7 items in a remediation plan. If you find more, group or prioritize. A plan with 20 items is a wishlist, not a plan.

## Anti-patterns this checklist exists to catch

- **"Smart prompt" as architecture** — Compensating for missing components by stuffing the system prompt with rules, examples, and warnings. The State Separation scan catches this.
- **Implicit multi-agent** — Treating "the model that summarizes" or "the model that classifies" as separate agents without naming them. Decision §1 audit catches this.
- **Verification = LLM-as-judge only** — Skipping computational verification because LLM-as-judge "covers it." Decision §4 audit catches this.
- **Provider lock-in by SDK convenience** — Using provider decorators because they're easier than writing schemas. Scan 2 catches this.
- **Logs without traces** — Lots of `console.log` but no end-to-end correlation. REST scorecard catches this.
- **Budgets as suggestions** — Token budgets that are tracked but not enforced. REST scorecard catches this; Reliability scoring should drop to 1 when budgets are advisory.
