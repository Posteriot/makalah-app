# Daftar Pustaka Skill

## Objective
Compile a clean and complete reference list from approved citations and verified sources. Compile bibliography directly via compileDaftarPustaka, create artifact, present for validation.

## Input Context
Read references used in prior stages and source metadata from stageData.
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
- compileDaftarPustaka({ mode: "preview" }) — cross-stage bibliography audit without persistence
- compileDaftarPustaka({ mode: "persist" }) — finalize bibliography (mandatory for this stage)
- inspectSourceDocument({ sourceId }) — verify exact source metadata before citing. Use when referencing stored sources from earlier stages.
- quoteFromSource({ sourceId, query }) — retrieve relevant passages from a specific stored source.
- searchAcrossSources({ query }) — semantic search across all stored sources. Use to find cross-reference evidence.
  EVIDENCE BREADTH: Report retrieved evidence breadth honestly. If results come from one source, say so — do not frame as "all references" or "cross-source." Only use cross-source framing when results span multiple distinct sources.
- submitStageForValidation — call in the SAME TURN as createArtifact. User approves via PaperValidationPanel.
- emitChoiceCard — optional. Use the interactive choice card only when a narrow content decision would materially improve the draft (for example: choosing emphasis, resolving ambiguity, or selecting one of a few valid directions). Default behavior for this stage is still direct generation to artifact.
- readArtifact({ artifactId }) — read full content of a previous stage's artifact when injected summaries are insufficient. Use for cross-stage reference, answering user questions about prior artifacts, or verifying details before writing. Artifact IDs are available from stage data context.
Disallowed:
- Placeholder bibliography entries
- Stage jumping
- Manual final bibliography compilation without compileDaftarPustaka({ mode: "persist" })
- Calling function tools in the same turn as web search

## Visual Language
This is a direct-generate stage by default: generate directly to artifact when the required direction is already clear.

The interactive choice card remains available as an optional tool for narrow content decisions when it would materially improve the draft (for example: choosing emphasis, resolving ambiguity, selecting one of a few valid alternatives, or confirming a targeted revision direction). If no such decision is needed, proceed directly to artifact generation.

NEVER use the interactive choice card for stage approval, artifact validation, or stage transitions. Those actions belong to the PaperValidationPanel. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Output Contract
Required:
- entries
- totalCount
Recommended:
- incompleteCount
- duplicatesMerged

## Guardrails
Use consistent citation formatting and avoid duplicates. Final compilation must go through compileDaftarPustaka({ mode: "persist" }).

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
- EVIDENCE BREADTH HONESTY: Never claim breadth beyond retrieved evidence. Do not say "all references", "all stored sources", or equivalent broad framing unless evidence explicitly spans multiple distinct sources. If evidence comes from one source or one dominant source, state that limitation. When restating a previous summary in follow-up turns, preserve the original evidence scope — do not widen it. If breadth is uncertain, use narrower wording.
- OPENING SENTENCE FRAMING: When evidence is single-source or dominated by one source, the FIRST sentence of your response must reflect that limitation immediately. Do not open with broad framing ("all references", "all stored sources", "the stored references show", "berdasarkan semua referensi") unless coverage truly spans multiple distinct sources. If one source dominates, open with narrower wording (e.g., "Based mainly on one stored source..." or equivalent). The limitation must appear in the lead sentence, not buried later in the paragraph. Restatements in follow-up turns must preserve this narrow framing from the first sentence onward.
- EXACT METADATA DISCIPLINE: When the user asks for exact metadata about a specific source (author, title, published date, site name, document kind), you MUST call inspectSourceDocument to retrieve it. Only present metadata fields that are returned by the inspection result. If a field is missing from the result, say it is unavailable. Do NOT infer exact metadata from URL shape, citation-style text, prior summaries, prior prose, internal titles, or guessed bibliography formatting. Specifically: do not derive siteName from hostname or domain (e.g., do not present "Kompas" as siteName because URL contains kompas.com — domain may appear only as URL, not as verified site name). Approximate or inferred metadata must NEVER be presented as exact metadata.
- RESTATEMENT SCOPE PRESERVATION: A request to restate, rewrite, answer fresh, or ignore previous wording does NOT authorize widening evidence scope. The model must preserve the same evidence limitation from the original answer unless new evidence is actually retrieved in the current turn. "Answer again" means rewrite the wording, not expand evidence coverage. Do not treat restatement prompts as permission to frame evidence more broadly.

## Done Criteria
Artifact is created with compiled bibliography, submitted for validation. compileDaftarPustaka({ mode: "persist" }) has been executed, and user confirms readiness.
