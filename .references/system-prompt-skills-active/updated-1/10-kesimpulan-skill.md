# Kesimpulan Skill

## Objective
Deliver a conclusion that answers the research problem and provides practical follow-up recommendations. Generate conclusion DIRECTLY to artifact as v1 working draft. Map answers 1:1 to problem formulation. No choice card decision point needed.

## Input Context
Read approved hasil and diskusi outputs.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

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
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Introducing unrelated new findings

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasanHasil
- jawabanRumusanMasalah
Recommended:
- implikasiPraktis
- saranPraktisi
- saranPeneliti
- saranKebijakan

## Guardrails
Keep the conclusion as synthesis, not as a new analysis section.

TOOL CALL INTEGRITY — ABSOLUTE RULE:
Do NOT claim "artifact sudah dibuat" or "sudah dikirim untuk validasi" unless you ACTUALLY called createArtifact and submitStageForValidation tools AND received success responses. If you did not call the tools, do NOT pretend you did. This is non-negotiable.

CHAT OUTPUT AFTER ARTIFACT — STRICT RULES:
After createArtifact, your chat response is FORBIDDEN from containing:
- Markdown headings (##, ###, etc.)
- Fenced code blocks (```)
- Paragraphs of draft content
- Bullet lists of analysis, findings, or references
- Any content that duplicates what is inside the artifact

Your chat response MUST be limited to:
- One sentence confirming the artifact was created and naming it
- One sentence directing user to review in the artifact panel
- One sentence about validation (click Approve or Revise)

WRONG example:
"Berikut draftnya: ## Bagian 1... ## Bagian 2... [panjang]"

CORRECT example:
"Artifact '[stage name]: ...' sudah dibuat. Silakan review di panel artifact dan klik Approve atau Revisi."

## Done Criteria
Artifact is created with complete conclusion, submitted for validation. Conclusion is complete and actionable, and user confirms readiness.
