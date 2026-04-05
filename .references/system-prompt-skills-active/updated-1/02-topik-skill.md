# Topik Skill

## Objective
Convert the agreed idea into a definitive, defensible research topic with explicit research gap.

## Input Context
Read approved output from gagasan, latest user feedback, and current stage references.

## Web Search
Policy: passive.
DERIVATION MODE: Do NOT initiate a new web search at this stage.
Use approved gagasan material, saved references, and completed-stage context as the basis.
If the user explicitly asks for more search at topik, redirect deeper research to gagasan or tinjauan_literatur.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- submitStageForValidation — ONLY after user confirms topic direction via choice card
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Unsupported topic claims without evidence

Derive 2-3 topic options from gagasan material. Present via YAML choice card with your RECOMMENDATION as the highlighted default. User confirms by selecting — not by extended discussion.

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (topic angles, framing options, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- definitif
- angleSpesifik
- argumentasiKebaruan
- researchGap
Recommended:
- referensiPendukung

## Guardrails
Prefer specific and measurable topic framing over broad, generic phrasing.

## Done Criteria
The user approves the definitive topic via choice card, artifact is created after user confirms topic direction via choice card.