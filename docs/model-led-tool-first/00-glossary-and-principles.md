# Model-Led Tool-First: Glossary and Principles

## Purpose

This folder documents a proposed architectural shift for makalahapp's chat and paper workflow runtime:

- from a harness that often directs the model through domain sequences
- to a model-led, tool-first runtime where the model selects domain actions
- while backend contracts and the harness preserve workflow legality, safety, persistence, and auditability

This glossary establishes stable terms used by every document in this directory.

## Core Terms

### Model-led

The model is the primary decision maker for domain actions inside a turn.

The model should decide:

- whether to read state
- whether to search
- whether to emit a choice card
- whether to save structured stage data
- whether to create or update an artifact
- whether to request revision
- whether to submit for validation
- whether to rewind or rollback

The model should not decide:

- HTTP request acceptance
- authentication or authorization
- run ownership
- pause and resume infrastructure
- event persistence
- raw instruction precedence assembly
- what sandbox and approval rules are physically enforced

### Tool-first

Domain behavior is expressed as explicit tools instead of hidden harness choreography.

Examples:

- `updateStageData`
- `createArtifact`
- `updateArtifact`
- `requestRevision`
- `submitStageForValidation`
- `cancelChoiceDecision`
- `rewindToStage`
- `searchReferences`

Tool-first does not mean "everything is a tool."

### Control plane

The harness layer that owns runtime infrastructure and system law around a run.

Examples:

- request acceptance
- run creation and ownership
- context assembly
- pause and resume
- event and step persistence
- verification
- mapping runtime outcomes to HTTP and UI stream responses

The control plane should be thin, explicit, and auditable.

### Domain action

A user-meaningful workflow operation that changes or inspects paper workflow state.

Examples:

- save stage progress
- create draft artifact
- request revision
- cancel a choice decision
- submit a stage for validation
- rewind the workflow

Domain actions should generally be tools.

### Backend guard

A deterministic server-side legality check enforced by Convex mutation or query contracts.

Examples:

- reject `requestRevision` unless stage status is `pending_validation`
- reject `rewindToStage` if target stage is invalid
- reject artifact mutation in illegal lifecycle states

Backend guards preserve correctness even when the model chooses the wrong action.

### Policy layer

A harness layer that constrains or annotates execution before or during a step.

In the current architecture this includes:

- boundary classification
- prepare-step composition
- domain enforcers
- forced tool sequencing

The target architecture keeps only runtime-level policy in this layer and removes domain choreography from it.

### Verification

Deterministic post-action checks that validate whether a step outcome is complete, legal, or blocked.

Verification remains a harness responsibility even in a model-led architecture.

### Pause and resume

Harness-level mechanics used when human input is needed or a pending decision blocks progress.

These are not domain tools.

### State machine

The legal workflow transition rules of the paper session.

The state machine belongs to backend contracts and persistence, not to prompt prose or tool wrappers.

## Architecture Principles

### 1. The model chooses domain actions

The harness should stop deciding "the next tool" for domain behavior whenever a backend-validated tool can represent that decision directly.

### 2. The harness keeps runtime law

The harness must still own:

- request lifecycle
- persistence
- observability
- verification
- pause and resume
- context assembly

### 3. Backend contracts stay hard

Workflow legality must be enforced by backend mutations and queries, not by model obedience alone.

### 4. Tools are simple executors

Tools may normalize inputs, call backend actions, and surface explicit results.

Tools should not hide complex recovery behavior or hidden orchestration unless that behavior is clearly represented in their result contract.

### 5. Prompts describe goals and contracts, not hidden choreography

Prompt text should state:

- current state
- allowed actions
- disallowed actions
- success criteria

Prompt text should avoid acting like a shadow state machine.

### 6. Errors should teach the model

When the model picks an illegal action, the system should prefer explicit backend rejection or clear tool result feedback over silent rescue.

### 7. Observability remains mandatory

A thinner harness must still be easier to audit, not harder.

## Decision Test

When deciding whether something belongs in the harness, a tool, or the backend, use this test:

1. Is it runtime infrastructure rather than business behavior?
   If yes, keep it in the harness.
2. Is it a user-meaningful domain action?
   If yes, make it a tool.
3. Is it a legality rule on state transitions or data shape?
   If yes, enforce it in the backend.

## Canonical Goal

The target runtime is:

- model-led in choosing domain actions
- tool-first in representing domain behavior
- backend-guarded in legality
- harness-thin in orchestration
- verification-driven in completion
