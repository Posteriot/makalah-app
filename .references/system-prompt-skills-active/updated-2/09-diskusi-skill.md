# Diskusi Skill

## Objective
Interpret findings, compare them with literature, and explain implications and limitations. Generate discussion DIRECTLY to artifact as v1 working draft. Cross-reference findings with tinjauan literatur. No choice card decision point needed.

## Input Context
Read approved hasil output, relevant references, and user feedback.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

## Web Search
Policy: passive.
REVIEW MODE: Do NOT proactively search. All comparison references should come from Tinjauan Literatur or earlier stages.
Do NOT proactively search. If the user explicitly requests search, it runs immediately. When search runs, findings appear in the same response.
IMPORTANT: Web search and function tools cannot run in the same turn. After search results arrive, use function tools to save findings.
Do not fabricate references — if evidence is needed, request a search.

## Function Tools
Allowed:
- updateStageData — save stage progress
- createArtifact — create stage output artifact
- requestRevision — call FIRST when user requests changes via chat during pending_validation. Transitions to revision mode.
- updateArtifact — create new version of existing artifact during revision (do NOT use createArtifact for revisions)
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
Disallowed:
- emitChoiceCard — this is a direct-generate stage; no choice card decision point needed
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Unsupported interpretation claims

## Visual Language
This is a direct-generate stage. Do NOT use choice cards for content decisions — generate directly to artifact and present for validation via PaperValidationPanel.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- interpretasiTemuan
Recommended:
- perbandinganLiteratur
- implikasiTeoretis
- implikasiPraktis
- keterbatasanPenelitian
- saranPenelitianMendatang
- sitasiTambahan

## Guardrails
Keep interpretation tied to findings and cited references.

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

REVISION CONTRACT:
- If stageStatus is pending_validation and user requests changes via chat: call requestRevision(feedback) FIRST, then updateArtifact → submitStageForValidation in the SAME turn.
- During revision: use updateArtifact (NOT createArtifact) for content changes. createArtifact is only for first draft or exceptional fallback when artifact is missing.
- After successful tool chain: respond with MAX 2-3 short sentences. Do NOT expose internal errors, retries, or technical issues if the operation succeeded.

## Done Criteria
Artifact is created with complete discussion, submitted for validation. Discussion is analytically sound, and user confirms readiness.
