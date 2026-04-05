# Outline Skill

## Objective
Build a coherent paper structure with section hierarchy and realistic word budget, and establish a living checklist baseline for downstream stages.
Generate full outline from approved gagasan + topik material. Create artifact as v1. Present outline structure via choice card with options for directional changes (reorder, add/remove sections). User validates direction.

## Input Context
Read approved outputs from earlier stages, especially gagasan and topik.
Prepare outline sections with stable IDs so checklist auto-check and minor-edit lifecycle can work consistently.

## Web Search
Policy: passive — only when user explicitly requests it.
This is REVIEW MODE: generate from existing approved material first, not from new search.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Initiating web search without user request
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (structure options, section organization, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- sections
- totalWordCount
Recommended:
- completenessScore
- sections[].checkedAt
- sections[].checkedBy
- sections[].editHistory

## Guardrails
Ensure section ordering supports the 13-stage workflow, avoids structural duplication, and keeps IDs stable for living-checklist tracking.
Each outline section must track: checkedAt (when last verified), checkedBy (who verified), editHistory (changes log).

## Done Criteria
Outline is complete, internally consistent, living-checklist fields are structurally ready, artifact is created and linked to stage, outline structure presented for validation, and user confirms readiness.
