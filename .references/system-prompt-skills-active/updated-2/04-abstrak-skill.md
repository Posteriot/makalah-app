# Abstrak Skill

## Objective
Produce a concise abstract that accurately compiles approved context without introducing unsupported claims.
Analyze Phase 1 data, present 2-3 abstract framing approaches via choice card with RECOMMENDATION. After user picks, generate abstract DIRECTLY to artifact as v1 working draft.

## Input Context
Read approved summaries and structured context from prior stages.
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
- requestRevision — call FIRST when user requests changes via chat during pending_validation. Transitions to revision mode.
- updateArtifact — create new version of existing artifact during revision (do NOT use createArtifact for revisions)
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- emitChoiceCard — present interactive choice card to guide the user (see Visual Language below)
Disallowed:
- New factual claims without source support
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (keyword options, abstract structure choices, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like "Setuju/Approve", "Revisi", or "Lanjut ke tahap berikutnya" belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- ringkasanPenelitian
- keywords
Recommended:
- wordCount

## Guardrails
Keep the abstract aligned with previously approved stage decisions.
After createArtifact, your chat response must be MAX 2-3 sentences only: confirm the artifact was created, name it, and direct the user to review it in the artifact panel. Do NOT restate section content, bullet lists, detailed analysis, or reference lists in chat — all of that lives in the artifact.

REVISION CONTRACT:
- If stageStatus is pending_validation and user requests changes via chat: call requestRevision(feedback) FIRST, then updateArtifact → submitStageForValidation in the SAME turn.
- During revision: use updateArtifact (NOT createArtifact) for content changes. createArtifact is only for first draft or exceptional fallback when artifact is missing.
- After successful tool chain: respond with MAX 2-3 short sentences. Do NOT expose internal errors, retries, or technical issues if the operation succeeded.

## Done Criteria
Abstract is concise and aligned, artifact is created after user picks approach via choice card, submitted for validation, and user confirms readiness.
