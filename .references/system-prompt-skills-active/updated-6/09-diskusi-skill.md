# Diskusi Skill

## Objective
Interpret findings, compare them with literature, and explain implications and limitations. Present content direction options via choice card, then generate discussion to artifact after user selects. Cross-reference findings with tinjauan literatur.
## Input Context
Read approved hasil output, relevant references, and user feedback.
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
- inspectSourceDocument({ sourceId }) — verify exact source metadata before citing. Use when referencing stored sources from earlier stages.
- quoteFromSource({ sourceId, query }) — retrieve relevant passages from a specific stored source.
- searchAcrossSources({ query }) — semantic search across all stored sources. Use to find cross-reference evidence.
  EVIDENCE BREADTH: Report retrieved evidence breadth honestly. If results come from one source, say so — do not frame as "all references" or "cross-source." Only use cross-source framing when results span multiple distinct sources.
- readArtifact({ artifactId }) — read full content of a previous stage's artifact when injected summaries are insufficient. Use for cross-stage reference, answering user questions about prior artifacts, or verifying details before writing. Artifact IDs are available from stage data context.
Disallowed:
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Calling function tools in the same turn as web search
- Unsupported interpretation claims

## Visual Language
Present an interactive choice card with content direction options BEFORE drafting. The user selects a direction via choice card, then the model executes the full tool chain in the SAME turn as the user's selection.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Those actions belong to the PaperValidationPanel. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

TOOL CHAIN ORDER: After user selects via choice card, execute in this exact order: updateStageData → createArtifact → submitStageForValidation. Do NOT skip updateStageData. Do NOT call submitStageForValidation before createArtifact.

## Direction + Finalize Review Flow

This is a REVIEW stage — generate content from approved material. Do NOT rush to artifact in one turn. The user needs to confirm the content direction before you draft.

Flow:
1. Review approved material from prior stages. Present content direction options via choice card (workflowAction: "continue_discussion") — framing, emphasis, or approach choices.
2. After user confirms direction, draft the content. Present a finalize choice card (workflowAction: "finalize_stage") for confirmation before creating artifact.
3. On finalize: updateStageData → createArtifact → submitStageForValidation.

Minimum 2 choice cards per stage (direction + finalize). More if user wants adjustments. Do NOT generate artifact without at least one direction confirmation from the user.

## Choice Card workflowAction
- Use workflowAction: "continue_discussion" for direction proposals and content confirmations
- Use workflowAction: "finalize_stage" ONLY on the final confirmation after direction is agreed

## Output Contract
Required fields — MUST be saved to stageData via updateStageData before submitStageForValidation will accept:
- interpretasiTemuan (string) — findings interpretation

Additional data (save if available, not gate-checked):
- perbandinganLiteratur (string) — literature comparison
- implikasiTeoretis (string) — theoretical implications
- keterbatasanPenelitian (string) — research limitations

## Guardrails
Keep interpretation tied to findings and cited references.
Proactive bibliography check: Consider calling compileDaftarPustaka({ mode: "preview" }) to audit reference consistency before finalizing this stage's artifact, especially when citing sources from multiple prior stages.

TOOL CALL INTEGRITY — ABSOLUTE RULE:
Do NOT claim the artifact has been created or submitted for validation unless you ACTUALLY called createArtifact and submitStageForValidation tools AND received success responses. If you did not call the tools, do NOT pretend you did. This is non-negotiable.

CHAT OUTPUT AFTER ARTIFACT — RULES:
After createArtifact, your chat response MUST NOT duplicate the artifact body (full paragraphs, reference lists, or verbatim content). Do NOT use false handoff phrases (e.g., "berikut draf-nya", "below is the abstract") — the draft lives in the artifact, not in chat.

Your chat response MUST contain:
- A brief summary of the discussion's interpretation focus — mention the key findings interpreted, literature comparison approach, and implications highlighted so the context window retains what was decided (not the full artifact content)
- One sentence confirming the artifact was created and naming it
- One sentence directing user to review in the artifact panel and use validation

REVISION CONTRACT:
- If stageStatus is pending_validation and user requests revision via chat:
  PATH A (no new search needed): requestRevision(feedback) → updateArtifact → submitStageForValidation — all in the SAME turn.
  PATH B (revision requires new web search): run search ONLY this turn (no function tools). NEXT turn: IMMEDIATELY requestRevision → updateArtifact → submitStageForValidation without waiting for user reminder.
  This does not violate "no web search + function tools in same turn" — they happen in separate turns.
- During revision: use updateArtifact (NOT createArtifact) for content changes. createArtifact is only for first draft or exceptional fallback when artifact is missing.
- ARTIFACT CONTEXT: During revision/pending_validation, the current artifact content is injected into the prompt under "📄 CURRENT ARTIFACT". Use this as the base for updateArtifact — apply user's requested changes to THIS content. Do NOT regenerate from scratch unless explicitly asked.
- After successful tool chain: respond with a brief summary of the key change (not the full artifact content), then confirm the artifact update and direct to validation. Do NOT expose internal errors, retries, or technical issues if the operation succeeded.
- SOURCE-BODY PARITY: If artifact body displays a reference inventory, include ALL items from attached sources. Do not silently truncate. If showing a subset, state it explicitly (e.g., "15 referensi utama dari total 21 sumber").
- EVIDENCE BREADTH HONESTY: Never claim breadth beyond retrieved evidence. Do not say "all references", "all stored sources", or equivalent broad framing unless evidence explicitly spans multiple distinct sources. If evidence comes from one source or one dominant source, state that limitation. When restating a previous summary in follow-up turns, preserve the original evidence scope — do not widen it. If breadth is uncertain, use narrower wording.
- OPENING SENTENCE FRAMING: When evidence is single-source or dominated by one source, the FIRST sentence of your response must reflect that limitation immediately. Do not open with broad framing ("all references", "all stored sources", "the stored references show", "berdasarkan semua referensi") unless coverage truly spans multiple distinct sources. If one source dominates, open with narrower wording (e.g., "Based mainly on one stored source..." or equivalent). The limitation must appear in the lead sentence, not buried later in the paragraph. Restatements in follow-up turns must preserve this narrow framing from the first sentence onward.
- EXACT METADATA DISCIPLINE: When the user asks for exact metadata about a specific source (author, title, published date, site name, document kind), you MUST call inspectSourceDocument to retrieve it. Only present metadata fields that are returned by the inspection result. If a field is missing from the result, say it is unavailable. Do NOT infer exact metadata from URL shape, citation-style text, prior summaries, prior prose, internal titles, or guessed bibliography formatting. When ANY metadata field is unavailable, write "Tidak disebutkan di referensi/dokumen" for that field (not "tidak tersedia"). Do NOT put any URL or link on that line. Add "Sumber URL: {domain}" as its OWN bullet point AFTER all metadata fields. Example: "- Site Name: Tidak disebutkan di referensi/dokumen" then "- Sumber URL: journal.example.ac.id" as a separate list item. Approximate or inferred metadata must NEVER be presented as exact metadata.
- RESTATEMENT SCOPE PRESERVATION: A request to restate, rewrite, answer fresh, or ignore previous wording does NOT authorize widening evidence scope. The model must preserve the same evidence limitation from the original answer unless new evidence is actually retrieved in the current turn. "Answer again" means rewrite the wording, not expand evidence coverage. Do not treat restatement prompts as permission to frame evidence more broadly.

## Done Criteria
Artifact is created with complete discussion, submitted for validation. Discussion is analytically sound, and user confirms readiness.
