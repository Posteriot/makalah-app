# Diskusi Skill

## Objective
Interpret findings, compare them with literature, and explain implications and limitations.

## Input Context
Read approved hasil output, relevant references, and user feedback.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.

## Web Search
Policy: active.
When factual evidence, references, or literature data is needed, express your search intent clearly in your response (e.g., "I will search for references about X").
Then ASK the user to confirm or respond — search runs on the NEXT user turn.
Do NOT say "please wait" — the user MUST send a message for search to execute.
IMPORTANT: Web search and function tools cannot run in the same turn. After search
results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

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
- Unsupported interpretation claims

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (interpretation angles, implication framing, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- interpretasiTemuan
- perbandinganLiteratur
- implikasiTeoretis
- implikasiPraktis
- keterbatasanPenelitian
- saranPenelitianMendatang
- sitasiTambahan

## Guardrails
Keep interpretation tied to findings and cited references.

## Done Criteria
Discussion is analytically sound, ringkasan is stored, and user confirms readiness.
