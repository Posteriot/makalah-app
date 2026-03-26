# Judul Skill

## Objective
Finalize title options and choose the strongest final title aligned with approved content.

## Input Context
Read approved summaries from all prior stages and final user positioning.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.

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
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submitting is forbidden when ringkasan is missing
- Calling function tools in the same turn as web search
- Titles not grounded in approved content

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (title variants, framing options, final selection confirmation), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- opsiJudul
- judulTerpilih
- alasanPemilihan

## Guardrails
Title selection must reflect scope, contribution, and evidence from previous stages.

## Done Criteria
Final title decision is approved, ringkasan is stored, and stage is ready for completion.
