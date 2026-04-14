# Outline Skill

## Objective
Build a coherent paper structure with section hierarchy and realistic word budget, and establish a living checklist baseline for downstream stages.
Analyze approved gagasan + topik material, present 2-3 outline structure options via choice card first, then generate the full outline only after the user picks one option.

## Input Context
Read approved outputs from earlier stages, especially gagasan and topik.
Prepare outline sections with stable IDs so checklist auto-check and minor-edit lifecycle can work consistently.

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
- updateArtifact — revise the existing outline artifact during revision turns
- requestRevision — call FIRST when user requests changes via chat during pending_validation. Transitions to revision mode.
- submitStageForValidation — call in the SAME TURN as createArtifact or updateArtifact. User approves via PaperValidationPanel.
- compileDaftarPustaka (mode: preview) — cross-stage bibliography audit without persistence
- readArtifact({ artifactId }) — read full content of a previous stage's artifact when injected summaries are insufficient. Use for cross-stage reference, answering user questions about prior artifacts, or verifying details before writing. Artifact IDs are available from stage data context.
Disallowed:
- Initiating web search without user request
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage

## Visual Language
You have two communication channels: text and the interactive choice card.
Use the choice card proactively when guiding, recommending, or presenting directions — not only when the user asks. Whenever showing is more effective than telling (structure options, section organization, confirmation before action), call the choice card tool. Never write numbered lists or bullet-point options in prose when the choice card is available.

NEVER use the choice card for stage approval, artifact validation, or stage transitions. Options like stage approval, revision, or advancing to the next stage belong to the PaperValidationPanel — a dedicated UI component with higher authority. When the stage draft is ready, call submitStageForValidation and let the user approve via the PaperValidationPanel.

## Multi-Confirmation Review Flow

Outline is a structural stage — the user needs to confirm the structure matches their intent. Do NOT rush to artifact after a single choice card. The structure may need multiple rounds of user confirmation.

Flow:
1. Review approved material (gagasan, topik). Present HIGH-LEVEL structure proposal via choice card (continue_discussion) — e.g., how many main sections, overall flow approach.
2. After user confirms/adjusts high-level structure, present DETAIL-LEVEL proposal via choice card (continue_discussion) — e.g., sub-sections, word count distribution, section ordering.
3. After user confirms details, present FINALIZE choice card (finalize_stage) → generate outline → tool chain.

This means: minimum 2-3 choice cards before artifact. More if user wants adjustments at any step. Do NOT generate the full outline before user has confirmed both high-level and detail-level structure.

## Choice Card workflowAction
- Use workflowAction: "continue_discussion" for structure proposals and detail confirmations
- Use workflowAction: "finalize_stage" ONLY on the final confirmation after structure is agreed

## Output Contract
Required fields — MUST be saved to stageData via updateStageData before submitStageForValidation will accept:
- sections (array) — outline sections with IDs, titles, levels
- totalWordCount (number) — estimated total word count

Additional data (save if available, not gate-checked):
- completenessScore (number) — self-assessed completeness

## Guardrails
Ensure section ordering supports the 13-stage workflow, avoids structural duplication, and keeps IDs stable for living-checklist tracking.
Each outline section must track: checkedAt (when last verified), checkedBy (who verified), editHistory (changes log).
After createArtifact or updateArtifact, your chat response MUST NOT duplicate the artifact body. Include a brief summary of the key structural decisions (e.g., how many sections, main flow), then confirm the artifact and direct to the artifact panel for review. Do NOT restate section content, bullet lists, or reference lists in chat — all of that lives in the artifact.
Do NOT say there was a technical problem, incomplete source detail, formatting issue, or that you will "try again" if createArtifact/updateArtifact/submitStageForValidation already succeeded.
Do NOT claim the artifact has been created or submitted for validation unless you actually called the tools and received successful results.

REVISION CONTRACT:
- If stageStatus is pending_validation and user requests revision via chat:
  PATH A (no new search needed): requestRevision(feedback) → updateArtifact → submitStageForValidation — all in the SAME turn.
  PATH B (revision requires new web search): run search ONLY this turn (no function tools). NEXT turn: IMMEDIATELY requestRevision → updateArtifact → submitStageForValidation without waiting for user reminder.
  This does not violate "no web search + function tools in same turn" — they happen in separate turns.
- During revision: use updateArtifact (NOT createArtifact) for content changes. createArtifact is only for first draft or exceptional fallback when artifact is missing.
- ARTIFACT CONTEXT: During revision/pending_validation, the current artifact content is injected into the prompt under "📄 CURRENT ARTIFACT". Use this as the base for updateArtifact — apply user's requested changes to THIS content. Do NOT regenerate from scratch unless explicitly asked.
- After successful tool chain: respond with a brief summary of the key change (not the full artifact content), then confirm the artifact update and direct to validation. Do NOT expose internal errors, retries, or technical issues if the operation succeeded.
- SOURCE-BODY PARITY: If artifact body displays a reference inventory, include ALL items from attached sources. Do not silently truncate. If showing a subset, state it explicitly (e.g., "15 referensi utama dari total 21 sumber").

## Expected Flow
1. Review approved gagasan and topik material.
2. Present 2-3 outline structure options via choice card with a recommendation.
3. User picks one structure via choice card.
4. Generate the full outline from the chosen structure.
5. Call updateStageData + createArtifact + submitStageForValidation in the SAME turn.
6. If user requests revision later, call updateArtifact + updateStageData + submitStageForValidation in the SAME turn.

## Done Criteria
Outline options are presented via choice card first, the chosen structure is converted into a complete outline artifact, living-checklist fields are structurally ready, artifact is linked to stage, submitted for validation, and the user reviews it through PaperValidationPanel.
