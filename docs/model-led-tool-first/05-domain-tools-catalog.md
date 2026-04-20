# Domain Tools Catalog

## Purpose

This document defines the target domain tool surface for the model-led, tool-first architecture.

It includes:

- existing tools to preserve
- existing backend actions to expose as tools
- new tools to add
- tool design intent

## Design Principles

1. Tools represent explicit domain actions.
2. Tools return clear success or failure results.
3. Tools do not hide complex choreography.
4. Backend mutations remain the source of legality.
5. Tools may guide the model through clear results, but should not silently rescue domain mistakes.

## Core Read Tools

### `getCurrentPaperState`

Status:

- already exists in `src/lib/ai/paper-tools.ts`

Purpose:

- retrieve current session state, stage, status, and progress context

Why it matters:

- the model should inspect before acting

### `getStageCapabilities`

Status:

- new

Purpose:

- expose the currently legal and illegal actions for the active paper state

Suggested output:

- `allowedActions`
- `blockedActions`
- `notes`
- `requiresHumanApproval`

Why it matters:

- this is the best replacement for hidden enforcer knowledge

### `readArtifact`

Status:

- already present in the tool surface

Purpose:

- inspect current artifact content before revision or reasoning

### `inspectStoredSources`

Status:

- new

Purpose:

- inspect stored search results, source inventory, and exact source availability

Why it matters:

- reduces search-specific hidden routing behavior

## Search and Evidence Tools

### `searchReferences`

Status:

- new as a first-class explicit chat tool

Purpose:

- run a search workflow for user-facing evidence gathering

Notes:

- the harness may still own cost controls, tracing, and persistence
- but from the model perspective this should be an explicit domain capability

### `compileDaftarPustaka`

Status:

- already exists in backend and tool surface

Purpose:

- compile references across stages

Notes:

- preserve as a domain tool
- keep legality in backend

## Stage Progress Tools

### `updateStageData`

Status:

- already exists

Purpose:

- persist structured draft progress for the active stage

Target posture:

- keep as core domain tool
- simplify wrapper logic
- move legality and rescue concerns to backend contract design

## Artifact Tools

### `createArtifact`

Status:

- already exists

Purpose:

- create the initial artifact for the active stage outcome

Target posture:

- preserve as first-class domain tool
- simplify wrapper-level business choreography

### `updateArtifact`

Status:

- already exists

Purpose:

- create new artifact versions or revisions

Target posture:

- preserve as first-class domain tool
- depend on backend legality around revision state and artifact existence

### `rollbackArtifactVersion`

Status:

- should be exposed from artifact/version domain backend

Purpose:

- rollback an artifact to a prior version without rewinding the entire paper stage timeline

Why it matters:

- stage rewind and artifact rollback are different operations and should remain distinct

## Validation Lifecycle Tools

### `submitStageForValidation`

Status:

- already exists in system behavior

Purpose:

- submit current stage output for human approval or revision

Target posture:

- keep as explicit domain action
- do not force via hidden enforcers

### `requestRevision`

Status:

- backend exists

Purpose:

- transition a pending validation stage to revision

Target posture:

- explicit model-selected action
- remove dependence on hidden rescue paths

### `unapproveStage`

Status:

- backend exists

Purpose:

- revert an approval decision when product rules allow it

Why it matters:

- validation lifecycle should be complete and explicit

## Choice and Workflow Reset Tools

### `emitChoiceCard`

Status:

- conceptually present today

Purpose:

- surface structured content decisions to the user

Important boundary:

- content decisions belong here
- stage approval decisions do not

### `cancelChoiceDecision`

Status:

- backend exists

Purpose:

- cancel a previously committed choice decision
- restore stage state according to backend rules

### `rewindToStage`

Status:

- backend exists

Purpose:

- move workflow back to an earlier validated stage

### `resolvePendingDecision`

Status:

- optional future tool, not initial priority

Purpose:

- explicitly resolve paused human checkpoints if product flow eventually requires it

## Priority Classification

### Priority 1

- `getStageCapabilities`
- `searchReferences`
- `cancelChoiceDecision`
- `unapproveStage`
- `rewindToStage`

### Priority 2

- `inspectStoredSources`
- `rollbackArtifactVersion`

### Priority 3

- `resolvePendingDecision`

## Mapping to Backend Sources

| Tool | Current Backend Source |
| --- | --- |
| `getCurrentPaperState` | `paperSessions.getByConversation` |
| `updateStageData` | `paperSessions.updateStageData` |
| `compileDaftarPustaka` | `paperSessions.compileDaftarPustaka` |
| `requestRevision` | `paperSessions.requestRevision` |
| `cancelChoiceDecision` | `paperSessions.cancelChoiceDecision` |
| `unapproveStage` | `paperSessions.unapproveStage` |
| `rewindToStage` | `paperSessions.rewindToStage` |
| `rollbackArtifactVersion` | `stageSkills.rollbackVersion` or related artifact domain mutation |

## Best Recommendation

The first new tool to build should be `getStageCapabilities`.

Why:

- it gives the model explicit state-aware action knowledge
- it allows enforcer removal to start safely
- it reduces dependence on hidden policy choreography
