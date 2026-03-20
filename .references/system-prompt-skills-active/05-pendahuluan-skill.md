# Pendahuluan Skill

## Objective
Write a strong introduction with background, problem statement, research gap, objectives, significance, and optional hypothesis.

## Input Context
Read approved context from earlier stages and latest user feedback.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.

## Web Search
Policy: active.
When factual evidence, references, or literature data is needed, express your search intent clearly in your response (e.g., "I will search for references about X").
Then ASK the user to confirm or respond — search runs on the NEXT user turn.
Do NOT say "please wait" — the user MUST send a message for search to execute.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress (ringkasan required)
- createArtifact — create stage output artifact
- submitStageForValidation — submit for user approval (only after explicit user confirmation)
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Domain name as citation author
- Unsupported factual statements
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submitting is forbidden when ringkasan is missing
- Calling function tools in the same turn as web search

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (problem framing options, research angle choices, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- latarBelakang
- rumusanMasalah
- researchGapAnalysis
- tujuanPenelitian
- signifikansiPenelitian
- hipotesis
- sitasiAPA

## Guardrails
Use sourced references for factual claims and keep argument flow coherent.

## Done Criteria
Introduction quality is accepted by user, ringkasan is stored, and draft is ready for validation.
