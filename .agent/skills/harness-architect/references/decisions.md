# Architectural Decisions, REST Objectives, and Design Principles

This file is the canonical decision framework. Use it in build Step 3 (make decisions explicitly with reversal triggers) and critique Step 3-4 (interrogate implicit decisions, score REST objectives).

## Mental models that anchor the decisions

Before listing decisions, name the models the literature uses to frame them. These compress otherwise long arguments and let you cite back to source thinking.

- **Horse and Reins.** Equation: `AI Agent = SOTA Model (Wild Horse) + Harness (Control System) = Elite Performer`. Decisions about harness thickness, scoping, and verification are decisions about *how tight* the reins should be. Loose reins waste model capability; tight reins waste model autonomy.

- **Three Levels of Engineering.** Prompt → Context → Harness. Most "AI quality" problems are misclassified at the prompt or context level when they're actually harness level. Before tuning prompts, ask whether the problem is structural.

- **Cognitive Loop × Context Efficiency 2D matrix.** Two axes describing where an agent operates:

```
                      Context Efficiency
                Inefficient          Efficient
              (manual / point-fed)   (sandboxed / auto-injected)
              ────────────────────────────────────────────────────
   ReAct      │ low-leverage        │ moderate                    │
   (passive)  │ chatbot             │ batch automation            │
              │                     │                             │
   Proactive  │ blocked by I/O      │ HIGH-LEVERAGE               │
   Plan&Reflect │ ceiling           │ production agent            │
              ────────────────────────────────────────────────────
```

The maturity of your harness directly determines whether an agent can climb from the inefficient/passive lower quadrants into the high-efficiency, proactive upper-right.

- **Co-evolution.** Models are now post-trained with specific harnesses in the loop. Claude Code's model learned to use the specific harness it was trained with. Changing tool implementations can degrade performance because of this tight coupling. Rule of thumb: re-evaluate harness thickness every model upgrade.

## The eight architectural decisions

Every harness makes these choices, whether explicitly or by accident. Implicit choices are technical debt with compound interest.

For each decision: state the choice, the rationale, and the **reversal trigger** — the observable condition that would invalidate the choice.

### 1. Single-agent vs multi-agent

**Default:** Single-agent first. Both Anthropic and OpenAI guidance converge here for *single-context-window* work.

**Cost of multi-agent:** Extra LLM calls for routing, context loss at handoffs, cascading failures, harder debugging.

**Reversal trigger:** Observable evidence that a single agent fails on either:
- Tool overload — more than ~10 overlapping tools degrade selection quality
- Domain split — clearly separate task domains where one agent's expertise interferes with another's

**Open question for long-horizon work:** Per Anthropic's published research, whether single general-purpose vs specialized multi-agent (testing / QA / cleanup) wins across many context windows is *unsettled*. For Decision §8 = multi-context-window, treat single-agent-first as a starting hypothesis, not a settled answer.

**Anti-trigger:** "It feels cleaner with multi-agent" is not a trigger.

### 2. ReAct vs Plan-and-Execute

**ReAct (= TAO loop):** Interleaves reasoning and action at every step. Each tool result reshapes the next decision.
- Upside: maximum flexibility, recovers gracefully from surprises
- Downside: high per-step cost, no upfront commitment to a plan
- When right: open-ended exploration, debugging, research

**Plan-and-Execute:** Plans the full sequence first, then executes (with re-planning on failure).
- Upside: lower per-step cost, parallelizable execution, predictable outputs
- Downside: brittle when reality diverges from plan
- When right: known task shapes, batch workloads, latency-sensitive paths

**Documented evidence:** Plan-and-Execute reports up to 3.6× speedup over sequential ReAct on benchmarks like LLMCompiler.

**Default for production:** Plan-and-Execute with exception-triggered re-planning. Reach for pure ReAct only when planning is impossible (e.g., open-domain agents).

**Reversal trigger:** Re-planning rate exceeds 30% of runs (plan quality is too low — investigate planner) OR re-planning rate is exactly 0% (no surprises happen — task is over-specified, ReAct overhead is wasted).

### 3. Context window management strategy

**Five production approaches**, often combined:

| Approach | Mechanism | Best for |
|---|---|---|
| Time-based clearing | drop messages older than N turns | chat-style sessions |
| Conversation summarization | LLM-summarize old turns into compact form | long sessions with persistent themes |
| Observation masking | hide stale tool outputs, keep tool calls | tool-heavy workflows |
| Structured note-taking | agent writes scratchpad to disk | multi-session tasks |
| Subagent delegation | offload exploration, return condensed summary | research, codebase exploration |

**Documented evidence:** Aggressive context engineering (e.g., the ACON line of research) achieves 26-54% token reduction at 95%+ accuracy by prioritizing reasoning traces over raw tool outputs.

**Default:** Observation masking + structured note-taking. Add summarization when sessions cross ~80% of context window.

**Critical caveat:** None of these strategies, including all of them combined, is sufficient when the *task* itself spans multiple context windows. Compaction loses precise mid-implementation state. For multi-window tasks, this decision must be paired with Decision §8.

**Reversal trigger:** Token cost per task exceeds budget by >2× → tighten reduction rules. Quality drops on long sessions → loosen reduction (you're throwing away signal).

### 4. Verification loop design

**Computational verification** (tests, linters, type checkers) — deterministic ground truth, free.

**Inferential verification** (LLM-as-judge) — catches semantic issues, adds latency and cost.

**Visual verification** (screenshots, rendered output, browser automation) — catches presentation issues invisible to other modes. **Mandatory for UI work** — models pass unit tests and ship features broken in the browser.

**Framing — guides vs sensors:**
- **Guides** (feedforward) — steer the model before action (e.g., schema constraints, tool descriptions)
- **Sensors** (feedback) — observe after action (e.g., test runs, rendering checks)

A harness needs both. Sensors without guides means catching errors after they happen. Guides without sensors means hoping the steering worked.

**Default:** Computational verification on every state-changing tool call. LLM-as-judge sampled on N% of outputs for quality drift detection. **Browser automation (e.g., Puppeteer MCP) when output is visual** — and exercise the feature *as a human user would*, not just unit tests or `curl`.

**Reversal trigger:** End-to-end success rate plateaus → add another verification mode. Verification cost exceeds 30% of total compute → cut LLM-as-judge frequency.

### 5. Permission and safety architecture (incl. sandboxing)

**Permissive vs restrictive posture:**

| Posture | Upside | Downside | When right |
|---|---|---|---|
| Permissive | Fast, low friction | High blast radius on mistakes | Trusted internal users, reversible ops, dev environments |
| Restrictive | Minimal blast radius | Slow, frustrating, drives bypass | Untrusted contexts, irreversible ops, production data |

**Three-stage canonical pattern:**
1. Trust establishment at project/session load
2. Permission check before each tool call (via Policy Gateway — see anatomy §9)
3. Explicit user confirmation for high-risk operations

**Sandbox levels** (named taxonomy from the literature):

| Level | Mechanism | Cost | Best for |
|---|---|---|---|
| **L1: Process-level isolation** | chroot, Linux namespaces, seccomp-bpf | Lowest; shares kernel | Trusted internal tools |
| **L2: Container isolation** | Docker, containerd | Mature, industry standard | Most tool execution |
| **L3: MicroVMs** | Firecracker | Independent virtual kernels | Multi-tenant, untrusted code |
| **L4: Full VMs** | KVM/QEMU | Maximum security, highest cost | Most sensitive tasks |

**Default:** L2 (Containers) + hardened kernel + read-only root filesystem. Introduce L3 (MicroVMs) as a bolstered sandbox for untrusted code or high-sensitivity data. L4 only when L3 is provably insufficient.

**Resource resilience guardrails** (mandatory once any production traffic exists):
- Budgets and quotas — tokens, API calls, CPU time per task/tenant
- Timeout control — strict timeouts on every network call and tool execution
- Retry strategies — backoff for transient errors, fail fast on permanent errors
- Circuit breakers — trip on repeated dependency failures to prevent cascading
- Graceful degradation — fall back to "weak but safe" mode when critical capability fails (e.g., from "executable code" to "read-only suggestions")

**Default permission split:** Restrictive for irreversible operations and external network/data. Permissive for read-only and within-sandbox operations.

**Reversal trigger:** Users find ways to bypass approval → approval is too coarse, split high/low risk. Approval-fatigue causes blanket-approval clicks → narrow what triggers approval. Sandbox L2 escape attempts observed → upgrade to L3.

### 6. Tool scoping strategy

**Documented evidence:** More tools usually means worse performance. Vercel removed 80% of tools from v0 and got better results. Claude Code achieves ~95% context reduction via lazy loading.

**Two strategies:**
- **Eager exposure:** all tools in every prompt. Simple, expensive, hurts selection.
- **Lazy exposure:** expose minimum tool set needed for current step (categorical grouping, namespaces, just-in-time registration).

**Default:** Lazy exposure once total tool count exceeds ~10. Below that, eager is fine.

**Reversal trigger:** Tool selection accuracy drops below acceptable threshold → tighten scoping. Latency spikes from registration overhead → loosen scoping.

### 7. Harness thickness

How much logic lives in the harness versus delegated to the model.

**Thin harness:** Trust the model. Minimal scaffolding. Bet on model improvements making complexity obsolete. (Anthropic's posture; Manus rebuilds five times getting thinner each iteration.)

**Thick harness:** Explicit control flow, graph-based orchestration, hand-designed routing. Bet on engineering rigor over model autonomy. (Graph-based frameworks.)

**Future-proofing test:** *if performance scales up with more powerful models without adding harness complexity, the design is sound.* If a new model release requires harness changes to benefit, the harness is too thick.

**Co-evolution caveat:** because models are post-trained with specific harnesses in the loop, swapping tool implementations can degrade quality even when the new tools are objectively better. Re-evaluate after every model upgrade.

**Default:** Thin where the model is competent, thick where the model is unreliable. Re-evaluate every model upgrade — capabilities that required scaffolding in version N often work natively in N+1.

**Reversal trigger:** Adding harness logic improves quality → too thin. New model release does not improve agent quality → too thick (the harness is the bottleneck).

### 8. Single-context-window vs multi-context-window agent

This is its own decision because the architectural implications cascade — a multi-window agent needs Component 13 (continuity layer), Decision §3 with the long-running caveat, Decision §1 in *open-question* mode, and verification (Decision §4) that includes end-to-end browser/automation testing.

**Default:** Build single-context-window. Tasks that genuinely cannot fit into one window are rare; many "long" tasks shrink dramatically with better context engineering.

**Reversal trigger:** Verified evidence the *minimum useful unit of work* exceeds available context — not just that you ran out of context once with bad context engineering. Examples: building a non-trivial app from a high-level spec ("build a clone of X"); multi-day research / data analysis; tasks requiring observed system behavior over hours.

**When triggered, the move is structural:**
- Add Component 13 with the Initializer + Coding Agent pattern (see anatomy.md). **Note on naming:** "Initializer Agent" and "Coding Agent" are *roles*, not separate harnesses. Per source-#3 footnote, they share the same SDK, the same tools, the same system prompt — only the initial user prompt differs. Do not implement them as two distinct runtimes.
- Add scaffolding artifacts (init.sh, progress file, JSON feature list, git history as durable state)
- Mandate the getting-up-to-speed ritual at every session start
- Mandate clean-state-at-session-end discipline
- Verification (Decision §4) must include end-to-end browser automation if output is visual

**Anti-pattern:** Treating compaction (Decision §3) as the answer to multi-window work. It's necessary but not sufficient. Compaction loses precise mid-implementation state; the next session starts confused.

**Open sub-decision (per Anthropic Future Work):** for the Coding Agent role, single general-purpose vs specialized multi-agent is unsettled. Start single-agent and split only if observed failures are domain-specific (e.g., test agent forgetting test conventions while implementing features).

## REST objectives

Production harnesses anchor on four objectives. Treat each as a scorecard line, not a checkbox.

### Reliability

**Definition:** Stable, continuous service under expected and unexpected inputs, environmental shifts, internal faults.

**Key requirements:**
- **Fault recovery** — automatic resume from checkpoints after interruption
- **Operation idempotency** — critical writes safe to retry without state corruption
- **Behavioral consistency** — predictable behavior under same inputs

**Score signals:** crash-free session rate, retry success rate, replay equivalence rate.

### Efficiency

**Definition:** Effective use of compute, storage, network while meeting functional and reliability needs.

**Key requirements:**
- **Resource control** — explicit budgets for tokens, API calls, compute time
- **Low-latency response** — meaningful feedback fast in interactive scenarios
- **High throughput** — batch capacity per unit time

**Score signals:** tokens per task, p50/p95 latency, tasks per minute per worker.

### Security

**Definition:** Protect system and data from unauthorized access, use, destruction. Non-negotiable for autonomous agents.

**Key requirements:**
- **Least privilege** — minimum permissions per sub-task
- **Sandboxed execution** — untrusted code in isolated environment (see Decision §5 sandbox levels)
- **I/O filtering** — prompt injection defense, sensitive data leak prevention, harmful content prevention (centralized at Policy Gateway)

**Score signals:** policy denial rate, sandbox escape attempts, PII leak incidents.

### Traceability

**Definition:** Sufficient logs, metrics, traces for developers and operators to understand internal state, decisions, history.

**Key requirements:**
- **End-to-end tracing** — clear call chain from request to result
- **Explainable decisions** — attribution record for every critical decision
- **Auditable state** — full system state at any historical point queryable

**Score signals:** trace coverage %, decision attribution coverage %, mean time to root cause.

## Six design principles

Apply these as constraints during design and as audit criteria during critique. The three "agnosticism principles" cited in SKILL.md (State Separation, Contract-First, Control/Data Plane split) are the *necessary subset* of the six below for model-agnostic design — every agnosticism principle is a design principle, but not every design principle is required for agnosticism.

1. **Design for Failure.** Treat exceptions and failures as the norm. Every component supports fault tolerance, retries, graceful degradation.

2. **Contract-First.** Define all interactions through explicit, machine-readable contracts (schemas, APIs, events). The foundation for modularity and evolution. Without contracts, every change is a guess about downstream impact.

3. **Secure by Default.** Security is the starting point, not a bolt-on. Apply least privilege, zero trust, defense-in-depth from day one.

4. **Separation of Concerns (Decision vs Execution).** Decouple "deciding what to do" (planning) from "how to do it" (execution) both logically and physically. Planning lives in the model + control plane. Execution lives in tools + data plane. Mixing them produces brittle systems.

5. **Everything is Measurable.** Every behavior, decision, and resource use must be quantifiable. Without measurement, there is no path to optimization.

6. **Data-Driven Evolution.** Treat every agent run as a learning opportunity. Closed loop of data collection → labeling → feedback → improvement is the only path to long-term intelligent growth.

## Three core constraints

These are hard physics; the design principles exist to address them.

1. **Stochastic LLM core.** Raw output is non-deterministic. The harness imposes deterministic constraints around it.

2. **Finite token window vs infinite world state.** The harness must establish efficient bidirectional mapping between unbounded external state and bounded model context.

3. **Stateless model, stateful agent.** Cross-turn coherence requires external state. The model is a CPU; the harness is the memory hierarchy.

## How to make decisions stick

A decision is durable when three things are documented:

1. **The choice** — what you picked
2. **The rationale** — why this choice given current constraints
3. **The reversal trigger** — what observation would make you reconsider

Decisions without reversal triggers become fossilized. They survive long after the conditions that produced them.

## Mission statement

Across all three sources, one phrase recurs: the goal of harness engineering is **stopping the model from making the same mistake twice.** Every component, every decision, every verification gate exists to make a class of failure structurally impossible — not to apologize for it after the fact.
