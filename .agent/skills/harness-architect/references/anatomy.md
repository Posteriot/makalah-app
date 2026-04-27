# Harness Anatomy: 13 Components and the Unified Loop

This file is the canonical component map. Use it in build Step 2 (decide thickness per component) and critique Step 1 (map defects to components).

## Positioning: three levels of engineering

Three concentric levels surround the model. The harness encompasses all three.

- **Prompt engineering** — crafts the instructions the model receives
- **Context engineering** — manages what the model sees and when
- **Harness engineering** — encompasses both, plus the entire application infrastructure: tool orchestration, state persistence, error recovery, verification loops, safety enforcement, lifecycle management

The harness is **not** a wrapper around a prompt. It is the complete system that makes autonomous agent behavior possible.

## Foundational mental models (cite these by name)

The harness literature repeatedly invokes a small set of named analogies. Use them when reasoning about a system; they compress otherwise long explanations.

- **"If you're not the model, you're the harness."** (Vivek Trivedy, LangChain.) The harness/agent boundary. The agent is the emergent goal-directed behavior the user interacts with; the harness is the machinery producing that behavior. When someone says "I built an agent," they built a harness and pointed it at a model.

- **Von Neumann architecture / Scaffolded LLMs.** (Beren Millidge, "Scaffolded LLMs as Natural Language Computers", 2023.) A raw LLM is a CPU with no RAM, no disk, no I/O. The context window serves as RAM (fast but limited). External databases function as disk storage (large but slow). Tool integrations act as device drivers. The harness is the operating system. As Millidge wrote: *"We have reinvented the Von Neumann architecture."*

- **Horse and Reins.** (Mitchell Hashimoto, popularized in 2026.) The model is a powerful but directionless "wild horse." The harness is the reins used to constrain, guide, and correct its behavior. Compact equation: **AI Agent = SOTA Model (Wild Horse) + Harness (Control System) = An Elite Performer.**

- **Scaffolding (construction metaphor).** Construction scaffolding is temporary infrastructure enabling workers to build a structure they couldn't reach otherwise — and is removed when the building is complete. As models improve, harness complexity should decrease. Manus was rebuilt five times in six months, each rewrite removing complexity. **Future-proofing test:** *if performance scales up with more powerful models without adding harness complexity, the design is sound.*

- **The harness is the product.** Two products using identical models can have wildly different performance based solely on harness design. Documented evidence: LangChain changed only the infrastructure wrapping their LLM (same model, same weights) and jumped from outside the top 30 to rank 5 on TerminalBench 2.0. A separate research line hit 76.4% pass rate by having an LLM optimize the infrastructure itself.

## The unified loop (four equivalent framings)

The literature names the same machinery four different ways. They map cleanly. Use whichever framing your audience knows; do not pretend one is canonical.

| Framing | Stages | Source |
|---|---|---|
| **TAO** (Thought-Action-Observation) | Thought → Action → Observation | The original ReAct framing |
| **ReAct** | Reason → Act → Observe → repeat | Same as TAO, named after the paper |
| **REPL** (engineering perspective) | Read → Eval → Print → Loop | Hashimoto's "deterministic shell" framing |
| **PPAF** (cognitive perspective) | Perception → Planning → Action → Feedback/Reflection | Production-oriented framing; **Reflection is distinct from Feedback** |
| **OTA** (operational perspective) | Observe → Think → Act | The §5.2 framing in the harness engineering literature |

### Mapping across framings

| TAO/ReAct | REPL | PPAF | OTA |
|---|---|---|---|
| (input) | Read | Perception | Observe |
| Thought | Eval (model call) | Planning | Think |
| Action | Eval (tool dispatch) + Print | Action + Feedback | Act |
| Observation → next | Loop | Reflection → next | (next Observe) |

### REPL details (engineering specifics)

- **Read** — Context Manager translates external state + memory into structured prompt. Engineering rigor on the perception phase.
- **Eval** — Call Interceptor catches model intent (function calls), routes to executors with timeouts, resource quotas, error handling.
- **Print** — Feedback Assembler captures tool output (success or exception) as a structured observation, re-injected into context.
- **Loop** — Continues until termination (goal hit or condition fired). The fundamental engine driving the PPAF/OTA cognitive process.

The harness is a deterministic shell wrapping a non-deterministic brain. Every component below exists to keep the deterministic part deterministic.

## The 13 components

Components 1-12 are the production harness baseline (Anthropic / OpenAI / LangChain synthesis). Component 13 is the multi-context-window continuity layer — required whenever a task spans more than a single context window.

### 1. Orchestration loop

**Role:** Implements the TAO/REPL/PPAF/OTA cycle. Mechanically a `while` loop.

**Key insight:** The loop should be "dumb." All intelligence lives in the model. Complexity in the loop itself is a smell — it means the model's job is shifted into orchestration code.

**Failure modes:** Loops branching on model output content (rather than tool-call presence) hard-code model behavior into the runtime. Loops without explicit termination conditions hang.

**Minimum implementation:** One function: `run(initial_prompt) -> final_response`. Branch only on: tool-call present? error? max-turns reached?

### 2. Tools

**Role:** The agent's hands. Defined as JSON Schema (name, description, parameter types) injected into the model's context.

**Lifecycle per tool call:** registration → schema validation → argument extraction → permission check → sandboxed execution → result capture → observation formatting.

**Failure modes:** Too many tools degrade model performance — exposing more than ~10 overlapping tools measurably hurts selection quality. Solutions: lazy loading, categorical grouping, tool-namespacing.

**Tool categories worth having:** file/data ops, search, execution, network/web, code intelligence, subagent spawning. Not every harness needs all six.

### 3. Memory

**Role:** State that persists beyond the current context window.

**Tiered model:**
- Short-term: conversation history within a single session
- Mid-term: per-project files (e.g., the project's CLAUDE.md/AGENTS.md/etc. equivalent — a configurable instruction file)
- Long-term: searchable transcripts and auto-summarized memory

**Critical principle:** The agent must treat its own memory as a hint, not as ground truth. Always verify against current state before acting on a remembered fact.

**Failure modes:** Memory loaded eagerly bloats context. Memory treated as ground truth causes hallucinated state ("the file is at X" when X was renamed three commits ago).

### 4. Context management

**Role:** Decide what the model sees and when. The bottleneck for planning quality.

**Documented problem:** Model performance degrades 30%+ when key content is in mid-window positions ("Lost in the Middle"). Even million-token windows degrade on instruction-following as fill grows.

**Production strategies:**
- Compaction — summarize history when approaching limits, preserving decisions and unresolved issues
- Observation masking — hide stale tool outputs while keeping tool calls visible
- Just-in-time retrieval — keep lightweight identifiers, load detail on demand
- Subagent delegation — subagents explore widely, return condensed (1-2k token) summaries

**Goal restated:** the smallest possible set of high-signal tokens that maximizes likelihood of the desired outcome.

**Critical caveat:** Compaction alone is **not sufficient** for tasks spanning multiple context windows. When context exhausts mid-task, even perfect compaction loses the precise state of in-flight work. Multi-window tasks require Component 13 (continuity layer) on top of compaction.

**Failure modes:** No compaction → first failure at context exhaustion. Compaction without preserving decisions → agent loops re-discovering the same conclusions. **Reliance on compaction alone for long-running work** → next session starts with garbled summary and wastes turns reconstructing state.

### 5. Prompt construction

**Role:** Assemble what the model sees at each step from a hierarchical priority stack.

**Typical priority order (highest to lowest):**
1. Server-controlled system message
2. Tool definitions
3. Developer instructions
4. User instructions (cascading from project files)
5. Conversation history

**Failure modes:** Mixing priority levels (e.g., user instruction overriding server policy) breaks safety contracts. No size limits per level → context exhaustion driven by lower-priority content.

### 6. Output parsing

**Role:** Convert model output into a structured action.

**Modern path:** Native tool calling — model returns structured `tool_calls` objects. Loop checks: tool calls present → execute and continue; absent → final answer.

**Legacy/fallback path:** Free-text parsing with retry-on-error — feed the original prompt + failed completion + parsing error back to the model.

**Failure modes:** Brittle JSON deserialization without retry → first malformed output crashes the agent. No type-mismatch handling → silent acceptance of wrong types.

### 7. State management

**Role:** Persist the agent's working state across steps and sessions.

**Approaches in the wild:**
- Typed state dictionaries flowing through graph nodes, with reducer-merged updates and checkpointing at step boundaries (graph-based frameworks)
- SDK-managed sessions backed by SQLite/Redis (object-store frameworks)
- Server-side conversation IDs (lightweight chaining)
- **Filesystem-as-state — git commits as checkpoints, progress files as scratchpads** (CLI/coding harnesses; required for Component 13)

**Mandatory principle (State Separation):** the LLM is a stateless CPU. Cross-turn state lives in an external store the harness controls. The model reads state via context assembly, writes state via tool calls — never via prompt-stuffed memory.

**Failure modes:** State held only in conversation history → cannot pause/resume. State held in model "memory" → impossible to debug, audit, or migrate providers.

### 8. Error handling

**Role:** Distinguish error classes and respond appropriately.

**Compounding math:** 99% per-step success × 10 steps ≈ 90.4% end-to-end. Errors compound fast.

**Four error classes:**
- Transient — retry with backoff
- LLM-recoverable — return error as observation; let the model adjust
- User-fixable — interrupt for human input
- Unexpected — bubble up for debugging

**Practical defaults:** cap retries at two. Return all tool errors as structured results inside the loop — never throw out of the loop on a tool failure.

**Failure modes:** Treating all errors as transient → infinite retry storms. Treating all errors as fatal → 90% success rate ceiling.

### 9. Guardrails and safety

**Role:** Enforce policy independently of model reasoning.

**Three checkpoints:**
- Input guardrails — run on first agent in a chain
- Output guardrails — run on final output
- Tool guardrails — run on every tool invocation

**Architectural seam — the Policy Gateway.** A named component sitting between Planner and Execution that validates every action:
- **Permissions** — RBAC/ABAC checks for resource authorization
- **Data filtering** — PII and secret detection on inputs and return values
- **Injection defense** — pattern detection for malicious prompt patterns or command stitching
- **Audit logging** — "who did what, when, with what result" for post-mortems and compliance

The Policy Gateway is the *single chokepoint* for safety. Policy in prompts is bypassable; policy in code at this seam is not.

**Architectural principle:** Separate permission enforcement from model reasoning. The model decides what to attempt; the tool system decides what is allowed.

**Failure modes:** Prompt-only guardrails ("don't do X") are bypassable. Tripwire-less guardrails log violations but allow them to proceed. No Policy Gateway → permissions scattered across tools, impossible to audit consistently.

### 10. Verification loops

**Role:** Catch failures before they compound. The single biggest quality lever.

**Three approaches:**
- **Rules-based** — tests, linters, type checkers (deterministic ground truth)
- **Visual** — screenshots for UI tasks (e.g., Puppeteer MCP for web apps)
- **LLM-as-judge** — separate evaluator subagent (catches semantic issues, adds latency)

**Documented impact:** Giving the model a way to verify its work improves quality 2-3×.

**Critical for web/UI work:** end-to-end verification *as a human user would* — not just unit tests or `curl` against a dev server. Models will pass unit tests and still ship a feature that's broken in the browser. Browser automation closes this gap.

**Failure modes:** No verification → the model marks its own homework. Verification only at the end → failures cascade through every intermediate step before being detected. Unit-test-only verification → passes the test, breaks in production.

### 11. Subagent orchestration

**Role:** Delegate bounded subtasks to isolated agent instances.

**Execution models:**
- Fork — byte-identical copy of parent context
- Teammate — separate execution context with mailbox-style communication
- Worktree — own isolated workspace (filesystem branch)
- Tools-as-agents — specialist invoked as a tool, returns condensed result
- Handoffs — specialist takes full control of the conversation

**Default rule:** maximize a single agent first. Multi-agent adds overhead (extra LLM calls for routing, context loss at handoff). Split only when tool overload exceeds ~10 overlapping tools or domains are clearly separate.

**Open question for long-horizon work:** Whether a single general-purpose agent or specialized multi-agent (testing agent + QA agent + cleanup agent) wins across many context windows is *unsettled* per current Anthropic research. Single-agent-first remains the safe default; multi-agent for long-horizon is a live experiment.

**Failure modes:** Subagent context not isolated → parent and child fight over shared state. Handoffs with no shared protocol → information lost at the boundary.

### 12. Lifecycle and governance

**Role:** Resource control, observability, evolution. Mandatory once production traffic exists.

**Components:**
- Budgets and quotas — tokens, API calls, CPU time per task/tenant
- Timeouts — strict limits on every network call and tool execution
- Circuit breakers — trip on repeated dependency failures
- Graceful degradation — fall back to "weak but safe" mode when critical capability fails
- Audit logging — who did what, when, with what result
- Metrics — success rate, instruction-following rate, latency, token consumption, policy denial rate
- Evaluation suite — closed loop of data collection, labeling, regression testing

**Failure modes:** No budgets → cost surprises. No circuit breakers → cascading failures. No evaluation → improvements are vibes-based.

### 13. Multi-context-window continuity

**Role:** Bridge the gap between coding sessions when a task cannot complete in one context window. Required for any task lasting hours or days.

**Why it's its own component (not a sub-case of Memory or State):** the failure modes are categorically different and the solution is structural, not just storage.

**The long-running agent problem.** Agents work in discrete sessions; each new session begins with no memory of what came before. Imagine a software project staffed by engineers working in shifts, where each new engineer arrives with no memory of the previous shift. Compaction alone does not solve this — even perfect compaction loses precise state mid-implementation.

**Two characteristic failure patterns** (pattern-match these in diagnose mode):

| Pattern | What it looks like | Root cause |
|---|---|---|
| **One-shot exhaustion** | Agent attempts to build entire app at once; runs out of context mid-implementation; next session starts with feature half-implemented and undocumented; spends substantial time guessing at what happened | No incremental discipline; no scaffolding directing one-feature-per-session work |
| **Premature victory** | Later agent looks around, sees that progress has been made, declares the job done | No persistent feature inventory; agent has no way to know what is still missing |

**The two-fold solution: Initializer Agent + Coding Agent.**

Per Anthropic's published pattern (Justin Young et al.), use **two prompts** against the same SDK / tools / system prompt — only the initial user prompt differs:

1. **Initializer Agent** (runs once, on the first session) — sets up the environment so that all later sessions can resume cleanly:
   - `init.sh` script that runs the development server / test harness
   - `claude-progress.txt` (or equivalent) — append-only log of what each session did
   - `feature_list.json` — comprehensive expansion of the user's prompt into testable end-to-end features (200+ for a clone of a non-trivial app), each with `{description, steps, passes: false}`
   - Initial git commit showing the scaffolded files

2. **Coding Agent** (runs every subsequent session) — makes incremental progress while leaving the environment in a clean state:
   - One feature per session
   - Edit `feature_list.json` only by changing `passes: false → true` (with strong-worded instructions like "It is unacceptable to remove or edit tests")
   - Commit with descriptive messages
   - Append to progress file

**Why JSON for the feature list (not Markdown):** the model is empirically less likely to inappropriately change or overwrite JSON files than Markdown.

**The "getting up to speed" ritual** (mandatory at the start of every Coding Agent session):

```
1. pwd                                  — confirm working directory
2. read claude-progress.txt             — see what was done
3. read feature_list.json               — see what is still failing
4. git log --oneline -20                — confirm progress against history
5. run init.sh                          — start the dev server / harness
6. browser/end-to-end smoke test        — verify the app is not broken before adding features
7. choose highest-priority failing feature → implement
```

This ritual prevents the agent from immediately implementing a new feature on top of broken state. If the smoke test fails, fix the regression first.

**Clean-state-at-session-end discipline.** "Clean state" = mergeable to main: no major bugs, orderly and well-documented, a developer could begin work on a new feature without first cleaning up an unrelated mess. Enforce via session-end commit + progress write.

**End-to-end testing as a human user would.** Models will mark features `passes: true` on the basis of unit tests or `curl` checks while the feature is broken in the browser. For UI work, the only reliable verification is browser automation (e.g., Puppeteer MCP) exercising the feature as a user would. Known limitations: vision can miss native browser modals (alerts, confirms); features relying on these tend to be buggier as a result — flag them.

**Failure-mode → component-13-behavior mapping:**

| Failure mode | Initializer behavior | Coding agent behavior |
|---|---|---|
| Premature "done" claim | Build feature_list.json | Read feature list at session start; pick one |
| Bugs / undocumented progress | Initial git repo + progress notes | Read progress at start; smoke-test; commit + write at end |
| Marking features done untested | Build feature_list.json | Self-verify via end-to-end test before flipping `passes` |
| Wasting time figuring out how to run app | Write init.sh | Run init.sh at session start |

**Scope caveat (per Anthropic's "Future work").** This pattern is optimized for full-stack web app development. Generalization to scientific research, financial modeling, and other long-horizon tasks is plausible but unproven. Adopt the *structure* (initializer + coding + scaffolded artifacts + getting-up-to-speed ritual + clean-state) and adapt the *artifacts* to the domain.

**Failure modes:** No init.sh → every session wastes turns figuring out how to run the system. No progress file → every session re-discovers prior decisions. Markdown feature list → model overwrites it. Skipping smoke test → new feature built on broken state. End-of-session without commit → next session has no recovery point.

## How components interact in one full cycle

1. **Prompt assembly** (5 + 4 + 3) — system prompt + tool schemas + memory files + history + current input. Important context goes at start and end.
2. **Model inference** (data plane) — assembled prompt to model API; output is text and/or tool calls.
3. **Output classification** (6) — tool calls present? handoff requested? plain text answer?
4. **Tool execution** (2 + 9 + 11) — validate, permission-check (Policy Gateway), execute (parallel for read-only, serial for mutating), capture result.
5. **Result packaging** (8 + 4) — format observation; errors caught and wrapped, not thrown.
6. **Context update** (4 + 7) — append observation to history; trigger compaction if near limit; persist state.
7. **Verification** (10) — optionally run verifier (rules-based / visual / LLM-as-judge).
8. **Loop** (1) — return to Step 1 unless a termination condition fires.

For multi-context-window tasks, **session boundaries** wrap this cycle: the getting-up-to-speed ritual (13) runs before Step 1 of the first cycle in a session, and the clean-state-end ritual (13) runs after the last cycle.

Termination conditions (all checked every iteration): no-tool-call response, max turns exceeded, token budget exhausted, guardrail tripwire, user interrupt, safety refusal.

## Component thickness defaults

| Goal class | Required components | Defer / scale to need |
|---|---|---|
| Single-task, stateless | 1, 2, 5, 6, 8 | 3, 4, 7, 9, 10, 11, 12, 13 |
| Single-task, stateful | + 3, 7 | 4, 9, 10, 11, 12, 13 |
| Multi-step autonomous (single context window) | + 4, 9, 10 | 11, 12, 13 |
| Production multi-tenant | + 11, 12 | 13 |
| **Long-running (multi context window)** | **+ 13** (and verification 10 must include end-to-end) | — (all required) |

Treat this as a starting point, not a recipe. Every "defer" must have a trigger condition that promotes it to "required."
