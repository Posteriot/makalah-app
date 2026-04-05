# Outline Skill

## Objective
Build a coherent paper structure with section hierarchy and realistic word budget, and establish a living checklist baseline for downstream stages.

## Input Context
Read approved outputs from earlier stages, especially gagasan and topik.
Prepare outline sections with stable IDs so checklist auto-check and minor-edit lifecycle can work consistently.

## Web Search
Policy: passive — only when user explicitly requests it.
Do not initiate search on your own. If user asks you to search, express your intent clearly (e.g., "I will search for references about X").
Then ASK the user to confirm — search runs on the NEXT user turn.
Do NOT say "please wait" — the user MUST send a message for search to execute.
IMPORTANT: Web search and function tools cannot run in the same turn.
Do not fabricate references — if evidence is needed, ask user whether to search.

## Function Tools
Allowed:
- updateStageData — save stage progress (ringkasan required)
- createArtifact — create stage output artifact
- submitStageForValidation — submit for user approval (only after explicit user confirmation)
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Initiating web search without user request
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submission is forbidden when ringkasan is missing

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (structure options, section organization, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- sections
- totalWordCount
- completenessScore
- sections[].checkedAt
- sections[].checkedBy
- sections[].editHistory

## Guardrails
Ensure section ordering supports the 13-stage workflow, avoids structural duplication, and keeps IDs stable for living-checklist tracking.

## Done Criteria
Outline is complete, internally consistent, living-checklist fields are structurally ready, ringkasan is stored, and user confirms readiness.
