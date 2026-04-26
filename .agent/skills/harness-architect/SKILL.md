---
name: harness-architect
description: This skill should be used when the user asks to "design an agent harness", "build a model-agnostic harness", "architect an AI agent runtime", "review my harness architecture", "audit harness design", "critique this agent system", "debug my harness", "find harness bugs from logs", "diagnose this terminal log", "investigate this browser console error", "fix this agent runtime bug", or mentions harness components (orchestration loop, control plane, context management, tool layer, verification loop, REPL container, PPAF, ReAct) or pastes terminal/browser console logs from an agent runtime. Provides a model-agnostic framework to design new harnesses, critique existing ones with concrete remediation, AND diagnose live failures from observability logs with root-cause discipline (no partial fixes), drawing on the synthesized Anthropic/OpenAI/LangChain harness anatomy and the Harness Engineering REST framework.
---

# Harness Architect

Design and critique production-grade agent harnesses without coupling to any specific model, SDK, or vendor. The skill carries two modes — **build** (greenfield architecture) and **critique** (audit existing system) — sharing the same conceptual core.

## Core premise

Three named mental models anchor every reasoning step in this skill (full treatment in `references/anatomy.md`):

- **"If you're not the model, you're the harness."** (Trivedy) — the harness/agent boundary.
- **Horse and Reins** (Hashimoto) — `AI Agent = SOTA Model + Harness = Elite Performer`. Harness decisions are about how tight the reins are.
- **Von Neumann / Scaffolded LLMs** (Millidge) — model = CPU; context window = RAM; external store = disk; tools = drivers; harness = OS.

The harness is the deterministic shell wrapping a stochastic LLM. A harness is **model-agnostic** when its boundaries are defined by **roles** (orchestration, context, persistence, verification, safety) rather than by a specific provider's API surface.

Three principles enforce agnosticism:

1. **State Separation** — Treat the LLM as a stateless CPU. All cross-turn state lives outside the model, in a Context State Manager controlled by the harness. Never push state into prompts as the system of record.
2. **Contract-First Tools** — Tools are defined by JSON Schema contracts, not by SDK-specific decorators. The serialization layer that converts contracts into provider-native tool formats (OpenAI function calls, Anthropic tool use, etc.) is the **only** model-aware seam.
3. **Control Plane / Data Plane split** — Control plane (scheduling, policy, lifecycle) is provider-blind. Data plane (model invocation, sandboxed execution) holds all provider adapters behind narrow interfaces.

If any of these three are violated, the harness is **not** agnostic regardless of how the user labels it.

## When to invoke build mode vs critique mode

| User signal | Mode |
|---|---|
| "Design / architect / build a harness for X" | **build** |
| "Audit / review / critique my harness", or pastes existing code/architecture | **critique** |
| "Compare two harness designs" | **critique** on each, then synthesize |
| "Why is my agent unreliable / slow / expensive?" | **critique** (defects map to harness layer gaps) |
| Mixed greenfield + legacy ("I have X, want to add Y") | **critique** existing first, then **build** the delta |
| User pastes terminal log, browser console, or stack trace from a running agent | **diagnose** |
| "Debug this", "fix this bug", "what's causing this error" + log evidence | **diagnose** |
| "Find what's wrong from these logs" | **diagnose** |

All three modes use the same artifact set in `references/`. The difference is direction: build moves from requirements → components; critique moves from observed defects → missing/broken components; diagnose moves from log evidence → root cause → permanent fix.

## Build mode procedure

### Step 1 — Define the agent contract before touching architecture

Pin three things on paper. Refuse to design until these exist:

1. **Goal class**: single-task (constrained, deterministic outputs) vs open-ended (multi-step, autonomous planning). This decides ReAct vs Plan-and-Execute (see `references/decisions.md` §2).
2. **Failure tolerance**: what is the acceptable end-to-end success rate? Note the compound math — 99% per-step × 10 steps ≈ 90.4% end-to-end. This sets verification thickness.
3. **Trust boundary**: who owns the runtime? Internal trusted users vs untrusted external code execution. This determines sandbox level (see `references/decisions.md` §5).

Then map the goal to the **REST objectives** (Reliability, Efficiency, Security, Traceability — see `references/decisions.md`). Any objective the user does not explicitly want should still get a default minimum, never zero.

### Step 2 — Walk the 13 components and decide thickness per component

Open `references/anatomy.md`. For each of the 13 components, decide one of:

- **Required** — must implement first
- **Deferred** — known need, schedule for v2
- **Skipped with rationale** — explicitly out of scope, document why

**Default minimum-viable harness (single-task, stateless): components 1, 2, 5, 6, 8** (loop, tools, prompt construction, output parsing, error handling). Components 3 (memory), 7 (state), 4 (context mgmt), 9 (guardrails), 10 (verification), 11 (subagents) are added per goal class — see the thickness defaults table in `anatomy.md`. Component 12 (lifecycle/governance) is mandatory once any production traffic exists.

**Component 13 (multi-context-window continuity)** is required if and only if the task spans more than one context window — see Decision §8. If triggered, it brings its own contracts (Initializer + Coding agent split, scaffolding artifacts, getting-up-to-speed ritual, clean-state-at-session-end). **Note:** Initializer and Coding are *roles using the same runtime* (same SDK, tools, system prompt — only the initial user prompt differs), not two distinct harnesses.

### Step 3 — Make the eight architectural decisions explicitly

Open `references/decisions.md`. For each of the eight decisions, write the choice + the trigger that would make you reverse it. Decisions without a reversal trigger become technical debt.

The most consequential defaults to challenge:
- **Single-agent first** (Decision §1) — multi-agent should require evidence that a single agent fails on tool overload (>10 overlapping tools) or domain split. *Caveat:* for long-horizon multi-window work (Decision §8), this default is open per Anthropic Future Work — don't overstate consensus.
- **Single-context-window** (Decision §8) — only escalate to multi-window (Component 13) when the minimum useful unit of work genuinely cannot fit in one context. Don't escalate because you ran out of context once with bad context engineering.

### Step 4 — Draw the layer map (control plane / data plane / contracts)

Produce a one-page diagram with three columns:

- **Control plane** — orchestration loop, lifecycle, policy gateway, scheduling
- **Data plane** — model adapter(s), sandboxed executors, persistence engines
- **Contracts** — tool schemas, event schemas, state schemas, observation envelope

The model adapter sits in data plane behind a single interface (`generate(prompt, tools) -> {text, tool_calls}`). Swapping providers must touch only this adapter. If anything else in the diagram references a provider name, the design is leaking.

### Step 5 — Specify the token transformation pipeline

Even minimal harnesses need this. Five stages: Collection → Ranking → Compression → Budgeting → Assembly. Document the budget in tokens per stage. Without an explicit budget, the harness will silently rely on model-specific context windows — breaking agnosticism the moment the user swaps to a smaller model.

### Step 6 — Define termination conditions and pause/resume contract

Termination is layered: no-tool-call response, max turn limit, token budget exhausted, guardrail tripwire, user interrupt, safety refusal. Pause/resume requires checkpointing at step boundaries with idempotent retry semantics — both are pre-conditions for any long-running task. Skipping this in v1 is acceptable only if the goal class is genuinely single-turn.

### Step 7 — Output the build artifact

Deliver to the user:

1. The agent contract (3 pinned items from Step 1)
2. The 13-component decision table from Step 2
3. The 8-decision table with reversal triggers from Step 3
4. The layer diagram (text/ASCII is fine)
5. The token pipeline budget
6. The termination/pause-resume contract
7. **One** explicit recommendation on which component to build first, with rationale

Never deliver a list of components without a build order. Lists without sequencing are not architectures.

## Critique mode procedure

### Step 1 — Map observed defects to harness layers

Use `references/critique-checklist.md`. For each user-reported symptom, locate the responsible component (e.g., "agent forgets earlier steps" → component 3 Memory or component 4 Context Management; "tool calls fail silently" → component 8 Error Handling or component 6 Output Parsing).

Defects that span multiple components reveal architectural gaps, not bugs.

### Step 2 — Test the three agnosticism principles

Apply the test from "Core premise" above:

- Where does cross-turn state actually live? Search for state stored in prompts or in the model's context-only memory. Each instance is a State Separation violation.
- How are tools defined? Search for SDK-specific decorators bleeding into business logic. Each instance is a Contract-First violation.
- Where does provider name appear in the codebase? Each non-adapter location is a Control/Data Plane leak.

Quantify these. "Three places leak provider name" is a finding. "Feels coupled" is not.

### Step 3 — Run the eight-decision interrogation

For each of the 8 decisions in `references/decisions.md`, ask: *what choice did the harness implicitly make, and was it deliberate?* Implicit choices are the highest-leverage critique targets — they reveal where the architect skipped a decision and let defaults fill in.

### Step 4 — Check the four REST objectives

For Reliability, Efficiency, Security, Traceability: each objective has Key Requirements in `references/decisions.md`. Score the harness on each requirement. Zero scores are critical findings; partial scores are roadmap items.

### Step 5 — Deliver the critique artifact

Output:

1. **Defect → component map** — what's broken and where
2. **Agnosticism leak inventory** — counted instances of each violation
3. **Implicit decision audit** — which of the 8 decisions were never made explicitly
4. **REST scorecard** — current state per objective
5. **Remediation plan** — ordered list, each item with: change description, layer it touches, estimated risk, expected REST objective improvement
6. **One** explicit recommendation on which remediation to do first, with rationale

Same rule as build mode: never deliver a list of issues without a fix order.

## Diagnose mode procedure

Use when the user provides terminal logs, browser console output, server traces, or stack traces from a running harness and asks "what's wrong" or "fix this." Full playbook in `references/diagnose-playbook.md` — read it before touching any log evidence.

### Step 0 — Observability gate (mandatory, blocks everything else)

Before reading the log, verify that the log is **diagnostically usable**. A log with no correlation IDs, no timestamps with sub-second precision, no component tagging, or no decision attribution is not evidence — it is noise. Run the observability gate from `references/diagnose-playbook.md` §1.

If the gate fails:
- **Stop.** Do not guess root cause from incomplete logs.
- Tell the user explicitly which observability requirements are missing.
- Recommend the minimum instrumentation required to make the next log diagnostic-grade.
- Offer to proceed in **provisional** mode (form hypotheses, mark each as unverified) only if the user accepts the risk in writing.

This gate exists because debugging from incomplete logs produces partial fixes — the exact failure mode the user asked the skill to prevent.

### Step 1 — Reconstruct the cycle

Map log entries to REPL/PPAF stages (anatomy.md) and to the 13 components. Build a timeline:

```
T+0.000ms  [comp]  Read    — context assembled (size: ...)
T+0.123ms  [comp]  Eval    — model decision: tool_call(name, args)
T+0.456ms  [comp]  Print   — tool result: ok / error(...)
T+0.789ms  [comp]  Loop    — next iteration / termination
```

Gaps in the timeline are findings. Stages that fired without their preconditions are findings. Stages that fired in the wrong order are findings.

### Step 2 — Apply the symptom→component→root cause table

Use `critique-checklist.md` symptom map. For each error/warning in the log, locate the responsible component(s). When multiple components are implicated, the root cause is usually in the component that produces the *earliest* divergence in the timeline — not the component that throws the loudest error.

### Step 3 — Run the 5-Whys against the strongest candidate

Take the most likely root cause from Step 2 and run 5-Whys (full procedure in `references/diagnose-playbook.md` §3). Stop when a Why hits one of:
- A missing component (skill returns to critique mode for that component)
- A violated invariant in the contracts (skill returns to build mode for that contract)
- A genuinely external cause (provider outage, hardware fault, network partition — outside harness scope)

If 5-Whys hits "the model just decided that" without a component-level cause, the harness is too thin in the implicated area (decision §7) and the fix is structural, not a prompt tweak.

### Step 4 — Permanent-fix gate (mandatory, blocks the fix proposal)

Before proposing any code change, the candidate fix must pass all four gates from `references/diagnose-playbook.md` §4:

1. **Root-cause gate** — does the fix address the root cause from Step 3, or only the symptom?
2. **Class-of-failure gate** — does the fix prevent the *class* of bug, or just this instance?
3. **Regression gate** — does the fix maintain or improve every related test/log signature, not just the failing one?
4. **Observability gate** — does the fix add the instrumentation that would have caught this earlier?

A fix passing only 1-2 gates is a band-aid. The skill must explicitly label band-aids as such and refuse to deliver them as the recommended solution. Band-aids are acceptable only as temporary mitigation while the permanent fix is in flight, and only when the user accepts the technical debt in writing.

### Step 5 — Deliver the diagnosis artifact

Output:

1. **Observability gate result** — passed / failed (with what's missing)
2. **Reconstructed timeline** — REPL/PPAF stages with timestamps and component tags
3. **Symptom→component map** — what failed and where
4. **5-Whys chain** — the reasoning from symptom to root cause
5. **Permanent-fix proposal** — passing all four gates, with the specific code/config change
6. **Regression check plan** — what to run/observe after the fix to confirm permanence
7. **Instrumentation delta** — any logging/metrics added so the next occurrence is detectable in <1 cycle

Same rule as build and critique modes: never deliver a fix without a verification plan.

## Anti-patterns this skill exists to prevent

- **Over-engineering v1** — Skipping Step 1 leads to building all 13 components for a task that needed 6.
- **Treating compaction as the answer to multi-window work** — Compaction (Decision §3) is necessary but not sufficient for tasks spanning multiple context windows. The correct fix is Component 13 (Initializer + Coding agent split, scaffolding artifacts, getting-up-to-speed ritual, clean-state-at-session-end).
- **Misdiagnosing premature victory as a verification gap** — Later agent declares "done" while features remain unbuilt is a Component-13 failure (no persistent feature inventory), not a verification (Component 10) bug. Adding more verification will not fix it.
- **Markdown feature list** — Feature lists in Markdown get overwritten by the model. Per source #3, JSON is empirically more durable. Default to JSON.
- **Skipping the smoke test on session start** — Implementing a new feature on top of a broken session-end state compounds the bug. Mandate the getting-up-to-speed ritual before any new work.
- **Provider lock-in by accident** — Skipping Step 4 (build) or Step 2 (critique) lets SDK conveniences leak into the control plane.
- **"Smart prompt" as architecture** — Compensating for missing components (state, verification, guardrails) by stuffing the system prompt. State Separation principle catches this.
- **Multi-agent cargo cult** — Reaching for multi-agent before proving single-agent fails. Decision §1 catches this.
- **Critique without remediation** — Listing defects with no ordered fix plan. Step 5 enforces remediation.
- **Build without sequencing** — Listing components with no build order. Step 7 enforces sequencing.
- **Diagnose without observability** — Guessing root cause from logs missing correlation IDs, timestamps, or component tags. Diagnose Step 0 (observability gate) blocks this.
- **Partial fix / band-aid** — Patching the symptom that throws the loudest error instead of the root cause. The permanent-fix gate (Diagnose Step 4) blocks this; band-aids are accepted only as labelled temporary mitigation.
- **Fixing one instance, leaving the class** — Resolving the specific log line but ignoring that the same class of bug will appear elsewhere. The class-of-failure gate blocks this.
- **Fixing without instrumenting** — Shipping a fix that does not add the logging needed to detect the next occurrence. The observability gate (#4 of permanent-fix gates) blocks this.

## Output style requirements

- Diagrams in plain text (ASCII boxes, indented trees). No external image dependencies.
- Tables for every multi-item comparison. No bullet lists where a table fits.
- Every recommendation paired with the trigger that would invalidate it. Architecture is a set of bets; the bets must be visible.
- Indonesian for chat output if the user uses Indonesian; English for any artifact embedded in code or docs (per harness model-instruction language convention — code-level text stays English so it survives provider/locale changes).

## Reference files

- **`references/anatomy.md`** — The 13 production harness components (12 baseline + Component 13 multi-context-window continuity) with role, failure modes, and the unified loop framings (TAO, REPL, PPAF, OTA). Read in build Step 2 and critique Step 1.
- **`references/decisions.md`** — Eight architectural decisions every harness makes (including §8 single-context vs multi-context-window), the REST framework (Reliability, Efficiency, Security, Traceability), and the six design principles (Design for Failure, Contract-First, Secure by Default, Separation of Concerns, Everything is Measurable, Data-Driven Evolution). Read in build Step 3 and critique Step 3-4.
- **`references/critique-checklist.md`** — Symptom → component → likely root cause table, plus the agnosticism leak audit procedure. Read in critique Step 1-2 and diagnose Step 2.
- **`references/diagnose-playbook.md`** — Observability gate, log triage from terminal/browser/server traces, REPL/PPAF timeline reconstruction, 5-Whys discipline, and the four permanent-fix gates. Read in diagnose mode (all steps).

## Skill discipline

- Refuse to begin Step 2 of build mode if Step 1 outputs are not on paper. Asking "what kind of agent" is part of the skill, not a digression.
- Refuse to deliver critique without remediation order. Issue lists are not deliverables.
- When the user pushes back ("just tell me how to build it"), state the cost of skipping the contract step (over-engineering or under-engineering, both expensive) and proceed only after the user accepts that cost in writing.
