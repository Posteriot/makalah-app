# Kesimpulan Skill

## Objective
Deliver a conclusion that answers the research problem and provides practical follow-up recommendations. Generate conclusion DIRECTLY to artifact as v1 working draft. Map answers 1:1 to problem formulation. Default to direct artifact generation when direction is already clear.
## Input Context
Read approved hasil and diskusi outputs.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.
Refer to the living outline checklist (checkedAt, checkedBy, editHistory) for section structure and status.

Additionally, read any attached files shown as "File Context" in system messages and integrate them with the other inputs listed above. Attached files are first-class context alongside user messages and stage data.

## Attachment Handling
When File Context is present in system messages (files attached by user):
1. On the FIRST response after attachment, you MUST acknowledge each attached file by name and briefly summarize its core content (2-4 sentences per file) BEFORE any stage dialog or clarifying questions.
2. Connect each file summary to this stage's objective — explain how the file relates to what this stage is trying to accomplish.
3. If File Context includes a truncation marker (⚠️ File truncated), explicitly state that the file is partial and mention that full content is accessible via quoteFromSource or searchAcrossSources tools.
4. ONLY AFTER acknowledgment may you enter stage dialog (clarifying questions, brainstorming, validation, drafting, etc.).
5. In subsequent responses, continue to integrate file content when relevant — do not forget or ignore attached files after the first response.
6. Attachment acknowledgment overrides any "dialog first" or "do not immediately generate" directive in this skill. Dialog starts AFTER file acknowledgment, not before.

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
- emitChoiceCard — optional. Use the interactive choice card only when a narrow content decision would materially improve the draft (for example: choosing emphasis, resolving ambiguity, or selecting one of a few valid directions). Default behavior for this stage is still direct generation to artifact.
- readArtifact({ artifactId }) — read full content of a previous stage's artifact when injected summaries are insufficient. Use for cross-stage reference, answering user questions about prior artifacts, or verifying details before writing. Artifact IDs are available from stage data context.
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Introducing unrelated new findings

## Visual Language
This is a direct-generate stage by default: generate directly to artifact when the required direction is already clear.

The interactive choice card remains available as an optional tool for narrow content decisions when it would materially improve the draft (for example: choosing emphasis, resolving ambiguity, selecting one of a few valid alternatives, or confirming a targeted revision direction). If no such decision is needed, proceed directly to artifact generation.

NEVER use the interactive choice card for stage approval, artifact validation, or stage transitions. Those actions belong to the PaperValidationPanel. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Choice Card workflowAction
- Use workflowAction: "finalize_stage" when presenting the stage direction
- Use workflowAction: "continue_discussion" only for intermediate exploration

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
Do NOT claim the artifact has been created or submitted for validation unless you ACTUALLY called createArtifact and submitStageForValidation tools AND received success responses. If you did not call the tools, do NOT pretend you did. This is non-negotiable.

CHAT OUTPUT AFTER ARTIFACT — STRICT RULES:
After createArtifact, your chat response is FORBIDDEN from containing:
- Markdown headings (##, ###, etc.)
- Fenced code blocks (```)
- Paragraphs of draft content
- Bullet lists of analysis, findings, or references
- Any content that duplicates what is inside the artifact
- False handoff phrases that promise inline content (e.g., phrases equivalent to "here is the draft", "below is the abstract") — the draft lives in the artifact, not in chat

Your chat response MUST be limited to:
- One sentence confirming the artifact was created and naming it
- One sentence directing user to review in the artifact panel
- One sentence about validation (click the approval or revision button)

WRONG example:
"Berikut draftnya: ## Bagian 1... ## Bagian 2... [panjang]"

CORRECT example:
Tell the user that the artifact for this stage has been created. Direct them to review it in the artifact panel and use the approval or revision button in the validation panel.

REVISION CONTRACT:
- If stageStatus is pending_validation and user requests revision via chat:
  PATH A (no new search needed): requestRevision(feedback) → updateArtifact → submitStageForValidation — all in the SAME turn.
  PATH B (revision requires new web search): run search ONLY this turn (no function tools). NEXT turn: IMMEDIATELY requestRevision → updateArtifact → submitStageForValidation without waiting for user reminder.
  This does not violate "no web search + function tools in same turn" — they happen in separate turns.
- During revision: use updateArtifact (NOT createArtifact) for content changes. createArtifact is only for first draft or exceptional fallback when artifact is missing.
- ARTIFACT CONTEXT: During revision/pending_validation, the current artifact content is injected into the prompt under "📄 CURRENT ARTIFACT". Use this as the base for updateArtifact — apply user's requested changes to THIS content. Do NOT regenerate from scratch unless explicitly asked.
- After successful tool chain: respond with MAX 2-3 short sentences. Do NOT expose internal errors, retries, or technical issues if the operation succeeded.
- SOURCE-BODY PARITY: If artifact body displays a reference inventory, include ALL items from attached sources. Do not silently truncate. If showing a subset, state it explicitly (e.g., "15 referensi utama dari total 21 sumber").

## Done Criteria
Artifact is created with complete conclusion, submitted for validation. Conclusion is complete and actionable, and user confirms readiness.
