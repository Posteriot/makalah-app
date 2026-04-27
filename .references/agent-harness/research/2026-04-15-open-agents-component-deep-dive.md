# Open Agents Deep Dive for Makalahapp Harness

## Purpose

This document captures the deep-dive analysis of `vercel-labs/open-agents` as a production agent harness reference. The goal is to identify which parts are worth imitating for makalahapp, which parts need adaptation, and which parts should not be copied directly.

Primary references:
- Baseline concept: `.references/agent-harness/anatomy/anatomy-agent-harness.md`
- Implementation reference: `https://github.com/vercel-labs/open-agents`

## Audit Status

This document was audited against:
- `.references/agent-harness/anatomy/anatomy-agent-harness.md`
- `open-agents` source files actually cited in the analysis, including:
  - `README.md`
  - `apps/web/app/workflows/chat.ts`
  - `packages/agent/open-harness-agent.ts`
  - `packages/agent/context-management/cache-control.ts`
  - `packages/agent/tools/bash.ts`
- additional coding-agent harness references used as contrast checks:
  - `openai/codex`
    - `AGENTS.md`
    - `codex-rs/core/config.schema.json`
    - Codex docs for `AGENTS.md`, `Rules`, `MCP`, `Subagents`, `Sandbox`, and `Agent approvals & security`
  - `anthropics/claude-code`
    - `README.md`
    - Claude Code docs for `Memory`, `Permissions`, `Subagents`, `Agent teams`, and `Hooks`

Audit result:
- The document remains directionally correct.
- The strongest alignment with the anatomy baseline is in:
  - orchestration loop
  - tool layer
  - prompt construction
  - state persistence
  - subagent support
- The weaker or only partial alignment is in:
  - explicit memory architecture
  - context management depth
  - verification as a first-class runtime primitive
  - guardrail richness

The main corrections from the audit are:
- clarify that `open-agents` has persistence-backed session/runtime state and lightweight skill discovery, but not a rich explicit long-term memory subsystem comparable to the anatomy reference
- clarify that `open-agents` context management is light and provider-oriented, not a full compaction/retrieval orchestration layer
- clarify that `open-agents` guardrails exist, but the hard enforcement visible in the cited tool layer is intentionally thin
- clarify that `open-agents` prompt construction is strong, but still much flatter than the instruction layering visible in `Codex` and `Claude Code`
- clarify that `open-agents` subagent support is real, but materially lighter than the isolated-context, permission-aware delegation patterns documented by `Codex` and `Claude Code`
- clarify that `open-agents` should not be treated as the sole reference for approval policy, sandboxing, or MCP/tool-governance design

## Executive Summary

`open-agents` is a strong reference for runtime architecture, especially in how it separates:
- request handling from durable execution
- orchestration from single-step model execution
- agent control logic from sandbox execution
- tool execution from state persistence

It is not a direct domain reference for makalahapp because it is heavily optimized for a coding-agent workflow with:
- filesystem-centric tools
- shell and git execution
- sandbox lifecycle management
- PR/commit automation

For makalahapp, the correct reuse strategy is:
- imitate the harness shape
- redesign the domain workflow, artifact handling, verification semantics, and state model

The key contrast from `Codex` and `Claude Code` is important:
- `open-agents` is strongest as a runtime boundary and persistence reference
- `Codex` and `Claude Code` are stronger references for layered instructions, permission/sandbox policy, subagent isolation, and operator-facing harness controls

## High-Value Findings

### 1. Macro Loop vs Micro Loop

`open-agents` makes a strong architectural distinction:
- HTTP request starts or resumes a durable workflow
- workflow controls the multi-step loop
- the agent runtime executes one bounded reasoning/action step at a time

Relevant files:
- `apps/web/app/api/chat/route.ts`
- `apps/web/app/workflows/chat.ts`
- `packages/agent/open-harness-agent.ts`

Why this matters:
- resumability becomes practical
- request timeouts stop being the bottleneck
- debugging gets easier because orchestration is explicit

What makalahapp can reuse:
- durable orchestrator outside request lifecycle
- single-step agent runtime inside the orchestrator

### 2. Agent Is Not the Sandbox

`open-agents` correctly separates:
- the agent as decision-maker
- the sandbox as execution environment

The agent does not live inside the sandbox VM. It uses tools to interact with it.

Why this matters:
- execution environment can hibernate independently
- model/runtime decisions do not get entangled with infrastructure lifecycle
- the harness remains the control plane

What makalahapp can reuse:
- separate the agent runtime from the artifact/workspace execution layer
- avoid turning the workspace into the control plane

### 3. Persistence Is Part of the Harness, Not an Afterthought

`open-agents` contains several strong persistence patterns:
- early persistence of user messages
- persistence of assistant tool-result states before final workflow completion
- atomic active stream claiming via compare-and-set
- scoped upserts to avoid cross-chat overwrite

Relevant files:
- `apps/web/lib/db/sessions.ts`
- `apps/web/app/api/chat/_lib/persist-tool-results.ts`
- `apps/web/app/api/chat/route.ts`

Why this matters:
- refresh or device switching does not destroy state
- resumability is backed by real persistence instead of UI illusion
- race conditions are controlled

What makalahapp can reuse:
- atomic active run ownership
- scoped idempotent upserts
- eager persistence for messages and tool-result checkpoints

### 4. Thin Tools, Thick Instructions

The tools in `open-agents` are mostly simple executors:
- `read`
- `write`
- `edit`
- `grep`
- `glob`
- `bash`
- `task`
- `skill`
- `ask_user_question`

Relevant files:
- `packages/agent/tools/read.ts`
- `packages/agent/tools/write.ts`
- `packages/agent/tools/skill.ts`
- `packages/agent/tools/todo.ts`

Why this matters:
- tool logic stays deterministic
- the model, prompt, and skills remain the reasoning layer
- the harness does not hide business judgment inside code-heavy pipelines

This is strongly compatible with makalahapp's stated principle:
- tools should be simple executors
- intelligence should live in skills and instructions

### 5. Human-in-the-loop as a First-Class Mechanism

`open-agents` includes a clean `ask_user_question` pattern:
- user input is treated as a client-side tool result
- the answer is persisted
- the answer re-enters the loop as structured observation

Relevant file:
- `packages/agent/tools/ask-user-question.ts`

Why this matters:
- the harness can pause cleanly for meaningful user decisions
- user choices become part of structured execution state

What makalahapp can reuse:
- user clarification and approval as explicit workflow checkpoints
- structured result format for user answers

## Component-by-Component Assessment

### Orchestration Loop

Assessment: Strong and reusable.

Can reuse:
- durable workflow loop
- explicit step iteration
- termination handling
- pause/resume semantics

Needs redesign:
- step semantics for artifact/workflow progression instead of coding-task progression

### Tools

Assessment: Strong pattern, but domain-specific tools must be rebuilt.

Can reuse:
- thin executor design
- strong schemas
- separate mutation tools from read tools

Needs redesign:
- artifact tools
- workflow-state tools
- reference/citation tools

### Memory

Assessment: Limited as a direct reusable memory reference.

`open-agents` relies more on:
- message history
- workflow persistence
- DB state
- discovered skills

It does provide useful persistence-backed continuity, but it does not expose a rich explicit long-term memory subsystem comparable to the anatomy reference's stronger memory treatment.

Recommendation for makalahapp:
- do not copy the memory shape from `open-agents`
- build structured state and summary memory instead

### Context Management

Assessment: Good principles, limited implementation depth.

Relevant file:
- `packages/agent/context-management/cache-control.ts`

What exists:
- provider-aware cache control
- lightweight optimization for message/tool caching
- not a full context compaction, retrieval, or observation-masking system

Recommendation:
- reuse the principle of minimal context
- do not assume `open-agents` already solves long context pressure for makalahapp
- do not use `open-agents` as the ceiling for context design, because both `Codex` and `Claude Code` expose stronger patterns such as explicit auto-compaction, memory loading rules, and subagent-based context isolation

### Prompt Construction

Assessment: Very strong reference.

Relevant file:
- `packages/agent/system-prompt.ts`

Strengths:
- explicit assembly order
- model-family overlays
- clear operational instructions
- skills included as capability layer

What makalahapp can reuse:
- centralized prompt assembly
- project-specific instructions injection
- role separation between core prompt and overlay logic

Needs redesign:
- workflow-state rules
- artifact contract expectations
- stage-specific logic

Important contrast from `Codex` and `Claude Code`:
- `open-agents` shows good centralized prompt assembly, but it does not expose the same depth of instruction layering as `Codex` project docs/rules/skills/subagents or `Claude Code`'s `CLAUDE.md` plus rules and subagent prompts
- this means `open-agents` should be treated as a prompt assembly reference, not as the complete reference for instruction precedence or policy inheritance

### Output Parsing

Assessment: Adequate and reusable.

`open-agents` leans on structured tool calling and explicit finish reasons.

What makalahapp can reuse:
- structured tool-call handling
- finish reason awareness
- explicit step result interpretation by orchestrator

### State Management

Assessment: Strong and highly reusable in pattern.

Relevant file:
- `apps/web/lib/db/sessions.ts`

Strengths:
- active stream ownership
- chat/session state persistence
- idempotent write patterns
- transaction-aware updates

Needs redesign:
- workflow stage state
- artifact state
- verification state

### Error Handling

Assessment: Good foundation.

What `open-agents` does well:
- catches failures without abandoning state cleanup
- clears active stream on failure paths
- records workflow status

What makalahapp should add:
- richer error taxonomy later if needed
- domain-aware recovery behavior for invalid artifact transitions

### Guardrails and Safety

Assessment: Concept is reusable, implementation is too thin.

Relevant files:
- `packages/agent/docs/approval-system.md`
- `packages/agent/tools/bash.ts`

Current reality:
- approval system is light
- main hard enforcement visible in the cited tool layer is around obvious dangerous bash commands such as `rm -rf`

What makalahapp can reuse:
- permissions enforced by tools/harness, not by model reasoning

What makalahapp should not copy:
- the overly minimal approval heuristics
- a design that treats sandboxing and approval as secondary details

Why this correction matters:
- `Codex` makes sandbox mode and approval policy first-class runtime controls, including distinct modes, per-session overrides, MCP/tool permissions, and subagent inheritance
- `Claude Code` goes even further with explicit deny/ask/allow precedence, managed policies, hooks, and documented interaction between permissions and sandboxing
- against those references, `open-agents` is clearly a thin approval example, not a full operator-grade guardrail architecture

### Verification Loop

Assessment: Present in instruction layer, not strong enough as runtime policy.

Relevant file:
- `packages/agent/system-prompt.ts`

What exists:
- strong instruction to run verification
- preference for project-native scripts

What is missing:
- verification as first-class orchestrator primitive
- explicit state gating based on verification outcome

Recommendation:
- for makalahapp, verification must become an actual runtime component

### Subagent Orchestration

Assessment: Good, but optional for v1.

Relevant files:
- `packages/agent/tools/task.ts`
- `packages/agent/subagents/registry.ts`

Strengths:
- bounded delegation
- small registry
- summary-only return

Recommendation:
- reuse the pattern if needed later
- do not make multi-agent central in makalahapp v1
- do not mistake `open-agents` for the strongest available subagent reference

Important contrast from `Codex` and `Claude Code`:
- `Codex` documents inherited sandbox/approval policy for spawned agents, explicit thread management, and configurable custom agents
- `Claude Code` documents separate-context subagents with independent permissions and also distinguishes them from larger multi-session agent teams
- compared with those systems, `open-agents` should be read as proof that bounded delegation is useful, not as the final design for delegation depth or operator control

## What Makalahapp Should Directly Imitate

Highest-value reusable patterns:
1. Durable workflow orchestration outside request lifecycle
2. Single-step agent runtime inside the orchestrator
3. Atomic active run ownership
4. Eager persistence of messages and tool results
5. Thin tools with strong schemas
6. Human-in-the-loop as structured tool/result flow
7. Centralized prompt assembly
8. Clear separation between agent control plane and execution environment

## What Makalahapp Should Redesign

These areas should not be copied directly:
1. Memory model
2. Context compaction strategy
3. Verification semantics
4. Workflow state machine
5. Artifact state model
6. Approval and guardrail granularity
7. Any coding-agent-specific automation such as git/PR/sandbox lifecycle
8. Instruction layering and policy inheritance depth
9. Subagent isolation and delegation controls

## Final Recommendation

Use `open-agents` as the primary reference for:
- runtime architecture
- durable orchestration
- stateful execution patterns
- tool and persistence boundaries

Do not use it as the primary reference for:
- product workflow
- artifact lifecycle
- memory architecture
- completion/verification semantics
- instruction layering and rule precedence
- approval, sandbox, and policy governance
- advanced subagent control patterns

The correct adaptation strategy for makalahapp is:
- keep the harness shape
- replace the domain logic core
- borrow instruction hierarchy, permission/sandbox posture, and delegation controls from `Codex` and `Claude Code` instead of extrapolating those layers from `open-agents`
