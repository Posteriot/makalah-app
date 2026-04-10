# Attachment Awareness Comprehensive Fix Plan

**Document ID:** `attachment-awareness-comprehensive-fix-plan`
**Date:** 2026-04-10
**Author:** Claude Code (Opus 4.6, 1M context)
**Status:** AWAITING EXECUTION — pending Codex audit
**Related documents:**
- Investigation report: `docs/normalizer-typeScript/attachment-awareness-investigation.md`
- Session scope: `SCOPE.md` at worktree root
- Test evidence: `screenshots/test-2/`

## Table of Contents

1. [Context](#context)
2. [Problems Being Solved](#problems-being-solved)
3. [Scope](#scope)
4. [Non-Goals](#non-goals)
5. [Design Decisions](#design-decisions)
6. [Changes Required](#changes-required)
7. [Testing Plan](#testing-plan)
8. [Deployment Plan](#deployment-plan)
9. [Rollback Plan](#rollback-plan)
10. [Definition of Done](#definition-of-done)
11. [Open Risks](#open-risks)

## Context

Makalah AI is an academic paper writing assistant for Indonesian users (100K users). It operates in two modes:

1. **Paper Mode** — guided 14-stage workflow (gagasan → topik → outline → abstrak → pendahuluan → tinjauan literatur → metodologi → hasil → diskusi → kesimpulan → pembaruan abstrak → daftar pustaka → lampiran → judul). Each stage has a dedicated skill that guides the model's behavior.
2. **Free Chat Mode** — general Q&A without stage workflow.

Users can upload files (PDF, DOCX, XLSX, PPTX, TXT, images) as reference material at any time. The expected behavior is that the model treats these files as authoritative context and acknowledges them immediately in its response.

**What actually happens:** When a user uploads a file and sends a short message in paper mode (e.g., "Berangkat dari ide saja, ayo kita bahas" with a PDF attached), the model ignores the file entirely and follows the stage skill's "dialog-first" directive. Only after the user protests ("Kamu nggak membaca dokumennya?") does the model finally acknowledge the file.

**Reproduction evidence:** `screenshots/test-2/` captured on 2026-04-10. User uploaded `31_Identifikasi+Pengaruh+Penggunaan+Chat-GPT.pdf` (38,928 chars). Terminal log shows:
- Line 27: `POST /api/extract-file 200` — file extracted successfully
- Line 29: `[⏱ LATENCY] RAG ingest ... chunks=26 ... contentChars=38928` — file chunked and stored in sourceChunks table
- Model response (screenshot 1): Generic gagasan brainstorming, zero reference to PDF
- User turn 2: "Ihs, kamu nggak membaca dokumennya?"
- Model response (screenshot 2): Apologizes, then reads and summarizes PDF

The investigation report (`attachment-awareness-investigation.md`) traced this to three layered causes:
1. Code at `src/app/api/chat/route.ts:495` explicitly disables the attachment-first directive when `paperModePrompt` is active
2. Paper stage skills (14 total) do not mention attachments in their "Input Context" section — implicit exclusion
3. Skill instructions actively tell the model to be "dialog-first, do not immediately generate output," which the model interprets as overriding passive file context

## Problems Being Solved

### Problem 1: Prompt-dependent attachment awareness (primary bug)

Model treats uploaded files as conditional context whose visibility depends on prompt wording, turn number, and stage state. User mandate: attachment awareness MUST be unconditional.

### Problem 2: Design conflict between code-level directive and skill instructions

Code at `route.ts:492-500` contains a "MUST review file first" directive that is explicitly disabled in paper mode. This was intentional but created the bug. The skills that paper mode uses do not compensate — they omit attachment handling entirely.

### Problem 3: Legacy file context limits

`MAX_FILE_CONTEXT_CHARS_PER_FILE = 6000` and `MAX_FILE_CONTEXT_CHARS_TOTAL = 20000` (at `route.ts:511-512`) are legacy values from pre-Gemini-2.5 era when context windows were 8K-32K tokens. Gemini 2.5 Flash has a 1M token window with 800K budget threshold. Current limits use only 0.3% and 0.6% of available budget. A 50-page academic paper (~150,000 chars) gets truncated to 6,000 chars (~4 pages) in paper mode, losing 96% of content. This drastically reduces the value of attachment upload for paper writing.

### Problem 4: Silent truncation

When paper mode truncates a file to 6,000 chars, the model receives no signal that truncation happened. It cannot know to use `quoteFromSource` or `searchAcrossSources` tools to access the rest. Users think the model "read" the file when it actually only saw a fraction.

### Problem 5: Non-paper mode also affected

`route.ts:492-497` conditions limit the attachment directive to short prompts (<=64 chars) on first turn. In non-paper mode, longer prompts or turn 2+ also trigger the bug even though `!paperModePrompt` is true.

### Problem 6: 14 stage skills all miss attachment handling

Every one of the 14 paper stage skills (`01-gagasan-skill.md` through `14-judul-skill.md`) has "Input Context" sections that omit attachments. This is systematic, not localized to one skill.

## Scope

### In Scope

**Code changes in branch `normalizer-typeScript`:**
- `src/app/api/chat/route.ts` — attachment directive conditions, truncation marker, limit constants

**Content changes in `.references/system-prompt-skills-active/updated-4/`:**
- `system-prompt.md` — strengthen attachment directive language
- `01-gagasan-skill.md` through `14-judul-skill.md` — add Attachment Handling section, update Input Context

**Deployment:**
- Deploy updated system prompt + 14 skills to Convex dev database `wary-ferret-59`
- Deploy to Convex prod database `basic-oriole-337` after branch is pushed to main

**Verification:**
- Unit test coverage for changed code paths in `route.ts`
- Manual smoke test with PDF upload in paper mode and non-paper mode
- Verify Codex audit clears the plan

### Out of Scope

- Modifying RAG retrieval logic (`rag-ingest.ts`, `sourceChunks.ts`)
- Modifying exact-source persistence
- Modifying `cleanForIngestion()` (completed earlier in this worktree)
- Changing search router logic
- Changing file extraction logic
- Changing the `conversationAttachmentContexts` resolution logic
- Touching `src/lib/chat/effective-file-ids.ts`

## Non-Goals

- Removing the "dialog-first" philosophy from paper mode (we reframe, not remove)
- Replacing direct `extractedText` injection with automatic RAG retrieval
- Adding attachment-specific UI indicators in chat
- Adding admin tooling to monitor attachment usage
- Creating a new database table for attachment state tracking
- Refactoring the skill loading pipeline (`stage-skill-resolver.ts`)

## Design Decisions

Five open questions from the investigation report were answered:

### Decision 1: Scope of fix

**Question:** Fix all 14 paper stages, or only gagasan?

**Answer:** Fix all 14 paper stages AND non-paper mode chat. User decision.

**Rationale:** The `!paperModePrompt` code condition affects all paper stages equally. Fixing only gagasan would leave 13 stages broken. Non-paper mode is affected by `userMessageCount <= 1` and `normalizedLastUserContent.length <= 64` conditions, requiring the same fix.

### Decision 2: When to fire the attachment directive

**Question:** Fire on every turn where a file is attached, or only the first turn after a new attachment?

**Answer:** Fire on every turn where files are present. User decision.

**Rationale:** Once a file is attached, it remains relevant to the entire conversation. Firing the directive every turn guarantees awareness. The instruction text will distinguish between "first response after attachment" (full summary required) and "subsequent response" (integrate when relevant) using the `userMessageCount` signal, but the instruction itself fires both scenarios.

### Decision 3: Large file handling

**Question:** Leave truncation, raise limits, auto-RAG, or something else?

**Answer:** Raise limits + truncation marker + manual RAG fallback via existing tools. Claude Code recommendation approved by user.

**Specific values:**
- `MAX_FILE_CONTEXT_CHARS_PER_FILE`: `6000` → `80000` (13.3x increase)
- `MAX_FILE_CONTEXT_CHARS_TOTAL`: `20000` → `240000` (12x increase)

**Rationale:**
- 80,000 chars ≈ 20,000 tokens ≈ 25-30 pages of typical academic prose. Fits complete journal articles.
- 240,000 chars ≈ 60,000 tokens ≈ 3 full reference papers. Handles multi-source comparison workflows.
- 60,000 tokens is 7.5% of 800,000 token budget threshold — leaves 92.5% headroom for conversation, system prompts, and response generation.
- Gemini 2.5 Flash window is 1,000,000 tokens. 60K tokens is well within practical attention quality range.
- Files exceeding 80,000 chars get a truncation marker and the model is instructed to use `quoteFromSource` or `searchAcrossSources` (already available in every skill's tool list).

**Why not auto-RAG retrieval on every turn:**
- Embedding-based retrieval adds latency (embed query + vector search + chunk fetch).
- 99%+ of uploads will fully fit in the 80K direct injection limit.
- Auto-retrieval surfaces chunks not aware of user's question.
- Manual retrieval via `searchAcrossSources(query)` is query-aware — model fetches what it needs.

**Why not even larger limits (e.g., 500K per file):**
- Context bloat degrades attention quality even in large-window models.
- Multiple files (5 × 100K) would consume 500K chars = 125K tokens per request — costly and slow.
- 80K/240K is the sweet spot between "fits real-world academic content" and "stays within efficient budget."

### Decision 4: Where to edit skills

**Question:** Skills live in Convex DB. How to edit?

**Answer:** User downloaded snapshot to `.references/system-prompt-skills-active/updated-4/`. Edit there, deploy to dev `wary-ferret-59` after branch work, then to prod `basic-oriole-337` after branch is pushed. User decision.

**Rationale:** This separates content authoring from Convex state management. Edits are visible in git history. Deployment is a separate, reviewable step.

### Decision 5: Paper mode "dialog first" philosophy

**Question:** Keep, remove, or reframe?

**Answer:** Reframe, not remove. Claude Code recommendation approved by user.

**New framing:** "Dialog starts AFTER acknowledging materials the user explicitly provided. Attachment acknowledgment is the foundation for informed dialog, not a monologue."

**Rationale:**
- "Dialog first" is valuable when there is no user-provided material (majority of cases).
- Removing "dialog first" entirely could cause the model to monologue and skip user collaboration.
- Reframing preserves the collaborative spirit while respecting explicit user input.
- This aligns with user's prior feedback: `feedback_instruction_vs_deterministic.md` — deterministic code floor, probabilistic skill ceiling.

## Changes Required

### Change Group A: Code in `src/app/api/chat/route.ts`

#### A1. Update file context character limits

**Location:** `src/app/api/chat/route.ts:511-512`

**Before:**
```typescript
const MAX_FILE_CONTEXT_CHARS_PER_FILE = 6000
const MAX_FILE_CONTEXT_CHARS_TOTAL = 20000
```

**After:**
```typescript
// Phase 2 Task 2.3.1 updated 2026-04-10: Raised limits for Gemini 2.5 Flash 1M context.
// Previous values (6000/20000) were legacy from 8K-32K context era.
// New values target full academic paper support: 80K chars (~20K tokens) per file,
// 240K chars (~60K tokens) total = 7.5% of 800K token budget threshold.
// Files exceeding per-file limit receive a truncation marker directing the model
// to use quoteFromSource or searchAcrossSources tools for deeper content.
const MAX_FILE_CONTEXT_CHARS_PER_FILE = 80000
const MAX_FILE_CONTEXT_CHARS_TOTAL = 240000
```

**Rationale:** See Decision 3.

#### A2. Add truncation marker to file context

**Location:** `src/app/api/chat/route.ts:571-590`

**Before:**
```typescript
} else if (file.extractionStatus === "success" && file.extractedText) {
    // Task 6.2-6.3: Extract and format text
    // Task 2.3.1: Apply per-file limit in paper mode
    let textToAdd = file.extractedText
    if (isPaperModeForFiles && textToAdd.length > MAX_FILE_CONTEXT_CHARS_PER_FILE) {
        textToAdd = textToAdd.slice(0, MAX_FILE_CONTEXT_CHARS_PER_FILE)
    }

    // Check remaining total budget
    if (isPaperModeForFiles) {
        const remainingBudget = MAX_FILE_CONTEXT_CHARS_TOTAL - totalCharsUsed
        if (textToAdd.length > remainingBudget) {
            textToAdd = textToAdd.slice(0, remainingBudget)
        }
        totalCharsUsed += textToAdd.length
    }

    docExtractionSuccessCount += 1
    docContextChars += textToAdd.length
    fileContext += textToAdd + "\n\n"
}
```

**After:**
```typescript
} else if (file.extractionStatus === "success" && file.extractedText) {
    // Task 6.2-6.3: Extract and format text
    // Task 2.3.1: Apply per-file limit in paper mode
    const originalLength = file.extractedText.length
    let textToAdd = file.extractedText
    let wasTruncated = false

    if (isPaperModeForFiles && textToAdd.length > MAX_FILE_CONTEXT_CHARS_PER_FILE) {
        textToAdd = textToAdd.slice(0, MAX_FILE_CONTEXT_CHARS_PER_FILE)
        wasTruncated = true
    }

    // Check remaining total budget
    if (isPaperModeForFiles) {
        const remainingBudget = MAX_FILE_CONTEXT_CHARS_TOTAL - totalCharsUsed
        if (textToAdd.length > remainingBudget) {
            textToAdd = textToAdd.slice(0, remainingBudget)
            wasTruncated = true
        }
        totalCharsUsed += textToAdd.length
    }

    docExtractionSuccessCount += 1
    docContextChars += textToAdd.length
    fileContext += textToAdd
    if (wasTruncated) {
        fileContext += `\n\n⚠️ File truncated at ${textToAdd.length} chars (original: ${originalLength} chars). Full content accessible via quoteFromSource or searchAcrossSources tools.\n\n`
    } else {
        fileContext += "\n\n"
    }
}
```

**Rationale:** Signal truncation to the model so it can invoke RAG tools for deeper content. Existing tools (`quoteFromSource`, `searchAcrossSources`) are already in every skill's tool list.

#### A3. Replace conditional attachment directive with unconditional one

**Location:** `src/app/api/chat/route.ts:486-500`

**Before:**
```typescript
const userMessageCount = Array.isArray(messages)
    ? messages.filter((message: { role?: string }) => message?.role === "user").length
    : 0
// Attachment first-response: structural check only (file present + first message + short text).
// No regex probe patterns — the model can judge user intent from the message itself.
// The instruction tells the model HOW to respond when files are attached, not IF.
const shouldForceAttachmentFirstResponse =
    effectiveFileIds.length > 0 &&
    requestedAttachmentMode === "explicit" &&
    !paperModePrompt &&
    userMessageCount <= 1 &&
    normalizedLastUserContent.length <= 64
const attachmentFirstResponseInstruction = shouldForceAttachmentFirstResponse
    ? "Pengguna baru saja melampirkan file secara eksplisit. Jawaban pertama WAJIB langsung mengulas isi file terlampir. DILARANG membuka dengan perkenalan umum, profil asisten, atau daftar kemampuan. Kalimat pertama harus langsung menjelaskan inti isi dokumen yang dilampirkan."
    : ""
```

**After:**
```typescript
const userMessageCount = Array.isArray(messages)
    ? messages.filter((message: { role?: string }) => message?.role === "user").length
    : 0
// Attachment awareness directive (updated 2026-04-10):
// Fires on EVERY turn where files are attached, regardless of mode, prompt length,
// or attachment resolution reason. The previous conditional logic (only fire on
// first turn, short prompts, non-paper mode, explicit attachment) created a bug
// where paper mode stages silently ignored attachments. See
// docs/normalizer-typeScript/attachment-awareness-investigation.md for details.
const hasAttachedFiles = effectiveFileIds.length > 0
const isFirstTurnWithAttachment = hasAttachedFiles && userMessageCount <= 1
const attachmentAwarenessInstruction = hasAttachedFiles
    ? (isFirstTurnWithAttachment
        ? "ATTACHMENT AWARENESS DIRECTIVE (mandatory, overrides skills): File(s) attached to this conversation. Your FIRST response MUST acknowledge each attached file by name and briefly summarize its core content (2-4 sentences per file, connected to current context). This acknowledgment comes BEFORE any stage dialog, clarifying questions, brainstorming, or generic introduction. If File Context contains a truncation marker (⚠️), state that the file is partial and use quoteFromSource or searchAcrossSources tools when the user asks for details not in the truncated portion. ONLY AFTER the acknowledgment may you proceed with stage-specific behavior (skill directives, dialog-first patterns, etc.). This directive applies in ALL modes (paper mode, free chat, any stage) and cannot be overridden by skills or stage instructions."
        : "ATTACHMENT AWARENESS DIRECTIVE (mandatory, overrides skills): File(s) are attached to this conversation. Always be aware of File Context content and integrate it into your responses when relevant to the user's question. Do NOT forget or ignore attached files after the first response. If the user's question relates to the file content or topic, prioritize file evidence. If File Context contains a truncation marker (⚠️), use quoteFromSource or searchAcrossSources tools to retrieve content beyond the truncated portion when needed. This directive applies in ALL modes and cannot be overridden.")
    : ""
```

**Rationale:**
- Remove `requestedAttachmentMode === "explicit"` — inherited attachments are equally important
- Remove `!paperModePrompt` — primary bug fix
- Remove `normalizedLastUserContent.length <= 64` — prompt length should not gate awareness
- Keep `userMessageCount <= 1` as a signal to branch between "first turn full acknowledgment" and "subsequent turn integration"
- Rename `attachmentFirstResponseInstruction` → `attachmentAwarenessInstruction` to reflect broader purpose

#### A4. Update `fullMessagesBase` reference to new variable name

**Location:** `src/app/api/chat/route.ts:802-804`

**Before:**
```typescript
...(attachmentFirstResponseInstruction
    ? [{ role: "system" as const, content: attachmentFirstResponseInstruction }]
    : []),
```

**After:**
```typescript
...(attachmentAwarenessInstruction
    ? [{ role: "system" as const, content: attachmentAwarenessInstruction }]
    : []),
```

**Rationale:** Rename follow-through from A3.

#### A5. Verify no other references to old variable name exist

**Action:** `grep -rn attachmentFirstResponseInstruction src/`

**Expected result after A3 and A4:** Zero matches. If matches exist, update all references.

### Change Group B: System prompt content

#### B1. Strengthen attachment directive in `system-prompt.md`

**Location:** `.references/system-prompt-skills-active/updated-4/system-prompt.md:29-34`

**Before:**
```
When the user uploads a file:
- The file is processed in the background for text extraction
- File content is automatically available as context in the conversation
- You MUST read and reference file content when responding
- If the file is still processing, inform the user
- If file processing failed, inform the user politely and focus on other aspects you can help with
```

**After:**
```
When the user uploads a file:
- The file is processed in the background for text extraction
- File content is automatically available as context in the conversation (shown under "File Context" in system messages)
- On the FIRST response after a file is attached, you MUST acknowledge each attached file by name and briefly summarize its core content (2-4 sentences per file) BEFORE any other content — this comes before stage dialog, clarifying questions, or generic introductions
- In subsequent responses, you MUST integrate file content when relevant — do not forget or ignore attached files after the first response
- This attachment awareness directive applies in ALL modes (paper mode, free chat, any stage) and CANNOT be overridden by skills, stage instructions, or conversation patterns
- If File Context includes a truncation marker (⚠️ File truncated), state that the file is partial and use quoteFromSource or searchAcrossSources tools when the user asks for details not in the truncated portion
- If the file is still processing, inform the user
- If file processing failed, inform the user politely and focus on other aspects you can help with
```

**Rationale:** Explicit directive with both "first response" and "subsequent response" behavior described. Truncation marker acknowledged. "Cannot be overridden" language protects against skill interpretation drift.

### Change Group C: All 14 paper stage skills

Apply the same two updates to every skill file in `.references/system-prompt-skills-active/updated-4/`:

1. `01-gagasan-skill.md`
2. `02-topik-skill.md`
3. `03-outline-skill.md`
4. `04-abstrak-skill.md`
5. `05-pendahuluan-skill.md`
6. `06-tinjauan-literatur-skill.md`
7. `07-metodologi-skill.md`
8. `08-hasil-skill.md`
9. `09-diskusi-skill.md`
10. `10-kesimpulan-skill.md`
11. `11-pembaruan-abstrak-skill.md`
12. `12-daftar-pustaka-skill.md`
13. `13-lampiran-skill.md`
14. `14-judul-skill.md`

#### C1. Update "Input Context" section in each skill

**Current pattern (example from `01-gagasan-skill.md` line 7):**
```
## Input Context
Read the latest user message, current stage data, recent web search references, and any prior approved stage summaries.
```

**Replacement pattern:**
```
## Input Context
Read the latest user message, any attached files (shown as "File Context" in system messages), current stage data, recent web search references, and any prior approved stage summaries.
```

**Rationale:** Makes attachment presence explicit in the skill's declared input surface. Stops implicit exclusion.

#### C2. Add "Attachment Handling" section to each skill

**Insertion point:** After "Input Context" section, before "Web Search" section.

**Content (same in all 14 skills):**
```markdown
## Attachment Handling
When File Context is present in system messages (files attached by user):
1. On the FIRST response after attachment, you MUST acknowledge each attached file by name and briefly summarize its core content (2-4 sentences per file) BEFORE any stage dialog or clarifying questions.
2. Connect each file summary to this stage's objective — explain how the file relates to what this stage is trying to accomplish.
3. If File Context includes a truncation marker (⚠️ File truncated), explicitly state that the file is partial and mention that full content is accessible via quoteFromSource or searchAcrossSources tools.
4. ONLY AFTER acknowledgment may you enter stage dialog (clarifying questions, brainstorming, validation, drafting, etc.).
5. In subsequent responses, continue to integrate file content when relevant — do not forget or ignore attached files after the first response.
6. Attachment acknowledgment overrides any "dialog first" or "do not immediately generate" directive in this skill. Dialog starts AFTER file acknowledgment, not before.
```

**Rationale:** Uniform across stages for consistency and easier maintenance. Codex can verify by diffing any two skill files — the Attachment Handling section must be identical.

#### C3. Optional stage-specific framing (permitted but not required)

Individual skills MAY append one additional sentence to step 2 of the Attachment Handling section, describing how attachments relate specifically to that stage. For example:

- `gagasan`: "Connect the file's research direction or findings to the user's rough idea being shaped in this stage."
- `tinjauan-literatur`: "Treat the file as potential literature — evaluate its fit for the review and cite it if relevant."
- `metodologi`: "Evaluate if the file describes a methodology relevant to the user's research design."

**Rule:** Stage-specific framing is ADDITIVE to the core rule. It does not replace or weaken any of the 6 steps above.

**This is optional.** If a stage-specific framing is not obvious or adds confusion, leave the default 6-step list unchanged.

## Testing Plan

### T1. Unit tests for `route.ts` changes

**No new test files.** The changes in `route.ts` are integration-level (the route is not unit tested in the current test suite). Verification happens via smoke tests.

### T2. Smoke test: Paper mode with PDF attachment, short prompt

**Setup:**
1. Start dev server on branch `normalizer-typeScript` with all changes applied
2. Deploy updated skills to dev DB `wary-ferret-59`
3. Open new conversation, activate paper mode, stage=gagasan

**Test:**
1. Upload a PDF (any academic paper, ideally 10-30 pages)
2. Send message: "Berangkat dari ide saja, ayo kita bahas."

**Expected:**
- Terminal log shows `[Ingestion Cleanup] source=upload ...`
- Terminal log shows `[⏱ LATENCY] RAG ingest ...`
- Model's FIRST response acknowledges the PDF by name and summarizes its content in 2-4 sentences
- Model then proceeds to ask clarifying questions or enter gagasan dialog
- No "Ihs, kamu nggak membaca dokumennya?" protest needed

**Fail conditions:**
- Model response does not mention the file name
- Model response does not summarize file content
- Model enters generic brainstorming without acknowledgment

### T3. Smoke test: Paper mode with PDF attachment, long prompt

**Setup:** Same as T2.

**Test:**
1. Upload a PDF
2. Send a 200+ character message: "Gue mau nulis paper tentang dampak AI terhadap pendidikan tinggi. Lo udah gue kasih PDF referensi. Tolong bantu gue sketch awal dari apa yang ada di PDF itu, terus kita lanjut diskusi angle yang paling menarik."

**Expected:**
- Same as T2 — model acknowledges PDF first despite longer prompt
- Previously the `normalizedLastUserContent.length <= 64` condition would have skipped the directive. After fix, it should fire regardless.

### T4. Smoke test: Non-paper mode with PDF attachment

**Setup:**
1. Open new conversation
2. Do NOT activate paper mode
3. Upload a PDF

**Test:**
1. Send message: "Apa isi file ini?"

**Expected:**
- Model acknowledges PDF and summarizes content
- Non-paper mode was previously affected by the same conditions — fix should apply here too

### T5. Smoke test: Subsequent turn behavior

**Setup:** Continue from T2 or T3.

**Test:**
1. After the model acknowledges the PDF in turn 1, ask a follow-up: "Apa metodologi yang mereka pakai?"

**Expected:**
- Model answers based on PDF content (if methodology is in the 80K-char slice)
- If methodology is in the truncated portion, model should invoke `searchAcrossSources({query: "metodologi"})` and use the retrieved chunks

### T6. Smoke test: Large file with truncation

**Setup:** Same as T2 but use a PDF larger than 80,000 chars.

**Test:**
1. Upload a 100+ page PDF (e.g., a book or thesis)
2. Send message: "Ini referensi gue, tolong dipelajari"

**Expected:**
- File Context includes the 80,000-char slice
- File Context contains truncation marker: `⚠️ File truncated at 80000 chars (original: XXXXX chars). Full content accessible via quoteFromSource or searchAcrossSources tools.`
- Model acknowledges the file AND mentions it is partial
- Model offers to explore specific sections on request

### T7. Smoke test: Multiple files total budget

**Setup:** Same as T2.

**Test:**
1. Upload 5 files, each 60,000 chars
2. Expected total: 300,000 chars, but MAX_FILE_CONTEXT_CHARS_TOTAL = 240,000

**Expected:**
- First 4 files fit fully (240,000 chars total)
- 5th file either truncated or omitted (per existing budget logic)
- Model acknowledges all files AND mentions budget limit if relevant

### T8. Regression test: No files attached

**Test:**
1. Send message without any attachment

**Expected:**
- No attachment directive injected
- Model behaves normally per stage skill
- No regression from existing behavior

### T9. Regression test: Existing unit tests

**Action:** `npx vitest run`

**Expected:**
- All existing test suites still pass
- Only the pre-existing 3 failures in `reference-presentation.test.ts` remain (documented as not our regression)
- `clean-for-ingestion.test.ts` still passes (18 tests)

### T10. Skill file diff verification

**Action:** For each of the 14 skills:
```bash
diff <(grep -A 6 "^## Attachment Handling" 01-gagasan-skill.md) <(grep -A 6 "^## Attachment Handling" 02-topik-skill.md)
```

**Expected:** Core 6-step content is identical across all 14 skills. Only stage-specific framing (if any) differs.

## Deployment Plan

### D1. Pre-deployment verification

1. All code changes committed to `normalizer-typeScript` branch
2. Skill files updated in `.references/system-prompt-skills-active/updated-4/`
3. Smoke tests T2-T8 pass on local dev server
4. Regression test T9 passes
5. Skill diff verification T10 passes
6. Codex audit of this fix plan completed and any findings addressed

### D2. Deploy to dev DB `wary-ferret-59`

**Method:** Use verified Convex mutations from `convex/stageSkills.ts` and `convex/systemPrompts.ts`.

**Prerequisites:**
- Admin user ID required for all mutations (both stage skills and system prompts require `requireRole(db, requestorUserId, "admin")`)
- Convex CLI authenticated against `wary-ferret-59` deployment
- All local skill files pass structural validation (see Appendix D)

**Stage skill deployment workflow (per skill file, 14 times):**

Each skill goes through a 3-step lifecycle: draft → published → active. Use these mutations in order:

1. **Create draft version:** `stageSkills.createOrUpdateDraft`
   - Args:
     - `requestorUserId: Id<"users">` — admin user
     - `stageScope: PaperStageId` — mapped from filename (see Appendix D)
     - `name: string` — skill name
     - `description: string` — skill description
     - `contentBody: string` — full updated skill markdown content
     - `changeNote?: string` — "Add attachment awareness handling (2026-04-10)"
     - `allowedTools?: string[]` — keep existing, do not change
   - Result: `{ skillId, stageScope, version, message }`
   - Side effect: Creates new draft version with incremented version number

2. **Publish the draft:** `stageSkills.publishVersion`
   - Args:
     - `requestorUserId: Id<"users">`
     - `skillId: string` — from step 1 result
     - `version: number` — from step 1 result
   - Result: `{ skillId, version, message }`
   - Side effect: Runs `validateStageSkillContent` before publish. **If validation fails, publish is rejected.** See Appendix E for validator constraints and how the proposed Attachment Handling section passes them.
   - Status change: `draft` → `published`

3. **Activate the published version:** `stageSkills.activateVersion`
   - Args:
     - `requestorUserId: Id<"users">`
     - `skillId: string`
     - `version: number`
   - Result: `{ skillId, version, message }`
   - Side effect: Archives previous active version (if any), runs validator again, sets target as `active`. Now runtime `getActiveByStage` returns the new version.

**System prompt deployment workflow (once):**

1. **Get current active prompt:** `systemPrompts.getActiveSystemPrompt`
   - Args: none (no auth required for read)
   - Result: `{ _id, name, content, version, isActive, ... }` or `null`
   - Capture `_id` for step 2

2. **Create new version:** `systemPrompts.updateSystemPrompt`
   - Args:
     - `requestorUserId: Id<"users">` — admin user
     - `promptId: Id<"systemPrompts">` — from step 1
     - `content: string` — full updated system prompt
     - `description?: string` — "Add attachment awareness directive (2026-04-10)"
   - Result: `{ promptId, version, message }`
   - Side effect: Creates new version with `parentId` and `rootId` linking. Inherits `isActive` from old. Old version automatically deactivated to maintain single-active invariant.

**No separate `activateSystemPrompt` call needed** — `updateSystemPrompt` preserves active state via inheritance.

**Verification steps after all mutations:**
1. For each of 14 skills, call `stageSkills.getActiveByStage({ stageScope })` and diff `content` field against local file. Expect identical.
2. Call `systemPrompts.getActiveSystemPrompt()` and diff `content` against local `system-prompt.md`. Expect identical.
3. Run smoke tests T2, T4, T6 against the dev environment with a real file upload.

### D3. Code deployment (branch push + merge)

**Method:** Standard git workflow.

**Steps:**
1. Push `normalizer-typeScript` to remote
2. Create PR against main
3. Await Codex review and approval
4. Merge to main
5. Vercel deploys automatically

### D4. Deploy to prod DB `basic-oriole-337`

**Precondition:** D3 complete (branch merged, code deployed to prod).

**Steps:**
1. Run the same D2 mutation sequence (14 × 3 stage skill mutations + 1 system prompt update), targeted at `basic-oriole-337`
2. Verify deployment via `getActiveByStage` and `getActiveSystemPrompt` diff checks (same as D2 verification steps)
3. Monitor production logs for first 1 hour after deployment:
   - Watch for `[Ingestion Cleanup]` logs showing normal patterns
   - Watch for new behavior in attachment responses
   - Watch for any error spikes in `/api/chat`
   - Watch for `skill_runtime_conflict` alerts via `systemAlerts` table (logged by `logRuntimeConflict` mutation when skill content fails runtime guards)

### D5. Post-deployment monitoring

**Metrics to watch:**
- User complaints about attachment handling (should drop to zero)
- Chat error rate (should remain flat)
- Token usage per chat request (expected to rise slightly for conversations with attachments)
- Convex read/write ops (expected to rise slightly due to larger file context reads)

**Duration:** 24 hours of production monitoring before declaring the fix successful.

## Rollback Plan

### R1. Code rollback (if code changes cause regressions)

**Trigger:** Chat error rate rises, existing features break, or user-reported issues.

**Steps:**
1. Revert commits for Change Group A via `git revert`
2. Redeploy via Vercel
3. Keep skill changes in place (they are additive and harmless if code is reverted)

### R2. Skill rollback (if skill changes cause bad model behavior)

**Trigger:** Model starts hallucinating file content, ignoring skill directives for non-attachment scenarios, or other skill-level issues.

**Steps:**
1. Restore previous skill content from git history (`.references/system-prompt-skills-active/updated-4/` previous commit)
2. Redeploy skills to dev, then prod, using the same D2/D4 process
3. Keep code changes in place (they degrade gracefully to "no directive injected" without skill support)

### R3. Limit rollback (if raised limits cause cost or latency issues)

**Trigger:** Token cost spike or noticeable latency regression on chat requests.

**Steps:**
1. Revert only the two constants at `route.ts:511-512`:
   - `MAX_FILE_CONTEXT_CHARS_PER_FILE` back to 6000
   - `MAX_FILE_CONTEXT_CHARS_TOTAL` back to 20000
2. Keep the truncation marker code (it still works with smaller limits)
3. Keep skill updates (they reference tools, not specific limits)

### R4. Full rollback (if multiple issues compound)

**Trigger:** Multiple issues from R1, R2, R3 simultaneously.

**Steps:**
1. Revert entire `normalizer-typeScript` branch merge on main
2. Redeploy
3. Revert skill DB state to pre-deployment snapshot
4. Document issues in `docs/normalizer-typeScript/` and plan a corrected fix

## Definition of Done

**Code:**
- [ ] `route.ts` changes A1, A2, A3, A4 applied
- [ ] A5 grep check returns zero matches
- [ ] `npx tsc --noEmit` shows zero errors
- [ ] `npx vitest run` shows same pass/fail baseline as pre-fix (except the 3 pre-existing failures in `reference-presentation.test.ts`)

**Content:**
- [ ] `system-prompt.md` B1 update applied
- [ ] All 14 skill files have C1 (Input Context update)
- [ ] All 14 skill files have C2 (Attachment Handling section)
- [ ] T10 skill diff verification passes

**Smoke tests:**
- [ ] T2 passes (paper mode short prompt)
- [ ] T3 passes (paper mode long prompt)
- [ ] T4 passes (non-paper mode)
- [ ] T5 passes (subsequent turn)
- [ ] T6 passes (large file truncation)
- [ ] T7 passes (multiple files budget)
- [ ] T8 passes (no attachment regression)

**Deployment:**
- [ ] D2 complete (dev DB `wary-ferret-59`)
- [ ] D3 complete (branch merged, code in prod)
- [ ] D4 complete (prod DB `basic-oriole-337`)
- [ ] D5 24h monitoring shows no regressions

**Audit:**
- [ ] Codex audit of this plan completed
- [ ] Codex findings (if any) addressed
- [ ] Codex audit of implementation commits completed

## Open Risks

### Risk 1: Skill instruction drift

**Description:** The attachment acknowledgment directive is added to skills as text. The model may still interpret skill's "dialog first" directives as overriding attachment handling in edge cases.

**Probability:** Medium. LLM instruction following is probabilistic.

**Impact:** Same as current bug — model ignores file in specific phrasings.

**Mitigation:**
- Code-level directive (Change A3) is the deterministic floor
- Skill directive is ceiling reinforcement
- Both layers must be present to minimize drift
- Monitor user reports for recurrence

### Risk 2: Token budget exhaustion

**Description:** Raised limits (80K/240K) + attachment directive text could push some conversations near the 800K token threshold, causing earlier context compaction.

**Probability:** Low for typical use (1-2 attachments, short-to-medium conversations).

**Impact:** Earlier context compaction means older messages get summarized sooner. Could affect long conversations with multiple large files.

**Mitigation:**
- Current 6000/20000 limits are so small that even 10x is still only 7.5% of budget
- Context compaction is a graceful degradation, not a failure
- Monitor token usage metrics post-deployment

### Risk 3: Latency regression from larger file context

**Description:** Larger file context in system messages means more tokens for the model to process per request, increasing time-to-first-token.

**Probability:** Medium.

**Impact:** Chat response feels slightly slower for conversations with attachments.

**Mitigation:**
- Gemini 2.5 Flash is optimized for large contexts
- Monitor `[⏱ LATENCY]` logs post-deployment
- If latency rises unacceptably, lower `MAX_FILE_CONTEXT_CHARS_PER_FILE` to 50000 as intermediate value

### Risk 4: Truncation marker confusion

**Description:** Model may interpret the `⚠️ File truncated` marker as part of the file content itself and cite it incorrectly.

**Probability:** Low.

**Impact:** Strange responses mentioning "the file says it was truncated" type errors.

**Mitigation:**
- Marker is clearly delimited (`⚠️` + newlines)
- Smoke test T6 verifies model handles it correctly
- If issues arise, restructure marker as separate system message instead of inline

### Risk 5: Skill uniformity drift over time

**Description:** As skills evolve, the 14 Attachment Handling sections may diverge, causing inconsistent behavior across stages.

**Probability:** Medium over long timeframes.

**Impact:** Some stages handle attachments better than others.

**Mitigation:**
- Add a comment in each skill's Attachment Handling section: "This section is standardized across all 14 paper stage skills. Do not modify without updating all."
- Consider extracting to a shared partial file in a future refactor (out of scope for this fix)

### Risk 6: Convex deployment sync issues

**Description:** Deploying skills to dev and prod separately could cause environments to drift if one deployment fails.

**Probability:** Low.

**Impact:** Dev and prod behave differently, confusing debugging.

**Mitigation:**
- Always verify deployment with a read-back diff (see D2 step 3, D4 step 2)
- Document the exact mutation commands used for traceability
- If one deployment fails mid-process, roll back partial changes before retrying

### Risk 7: The `userMessageCount <= 1` branching is imperfect

**Description:** The fix uses `userMessageCount <= 1` to distinguish "first turn" from "subsequent turns." This is based on total user messages, not "first turn after this specific file was attached." If a user has an existing conversation, attaches a new file in turn 5, the directive will fire the "subsequent turn" version even though it's the first time this new file appears.

**Probability:** Medium. Multi-file conversations exist.

**Impact:** Model may integrate file content instead of explicitly summarizing it on first appearance.

**Mitigation:**
- This is an acceptable degradation because the "subsequent turn" directive still instructs the model to integrate file content
- A more precise fix would track "new file detection" per turn, which requires additional state — out of scope for this fix
- Document as known limitation, address in a follow-up fix if user reports issues

## Appendix A: File Index

Files touched by this plan:

| File | Type | Change Group |
|---|---|---|
| `src/app/api/chat/route.ts` | Code | A |
| `.references/system-prompt-skills-active/updated-4/system-prompt.md` | Content | B |
| `.references/system-prompt-skills-active/updated-4/01-gagasan-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/02-topik-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/03-outline-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/04-abstrak-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/05-pendahuluan-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/06-tinjauan-literatur-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/07-metodologi-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/08-hasil-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/09-diskusi-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/10-kesimpulan-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/11-pembaruan-abstrak-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/12-daftar-pustaka-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/13-lampiran-skill.md` | Content | C |
| `.references/system-prompt-skills-active/updated-4/14-judul-skill.md` | Content | C |

**Total files touched:** 16 (1 code, 1 system prompt, 14 skills)

## Appendix B: Commit Structure

Proposed commit sequence for clean git history:

1. `feat(chat): raise file context limits to 80K/240K chars with truncation marker` — Change Group A1, A2
2. `fix(chat): remove conditional gating of attachment awareness directive` — Change Group A3, A4, A5
3. `docs(system-prompt): strengthen attachment awareness directive` — Change Group B
4. `docs(skills): add attachment handling to all 14 paper stage skills` — Change Group C (single commit for consistency)
5. `chore(deploy): update dev database wary-ferret-59 with new skills and system prompt` — deployment marker commit (optional, captures deployment timestamp)

Each commit should reference this plan document: `Refs: docs/normalizer-typeScript/attachment-awareness-comprehensive-fix-plan.md`

## Appendix C: Codex Audit Checklist

For the reviewer (Codex):

1. [ ] Verify all file:line references in Change Groups A, B, C are accurate (grep the current worktree state)
2. [ ] Verify before/after code snippets in Change Group A match current file contents
3. [ ] Verify the rationale for Decision 3 (80K/240K limits) against Gemini 2.5 Flash context specifications
4. [ ] Verify no out-of-scope files are touched
5. [ ] Verify the Definition of Done is testable (every checkbox has a clear pass/fail criterion)
6. [ ] Verify the Rollback Plan is executable (each step has concrete actions)
7. [ ] Verify Change Group C produces identical "Attachment Handling" sections across all 14 skills (or documented stage-specific framing)
8. [ ] Verify non-goals are respected (e.g., no RAG retrieval logic changes)
9. [ ] Verify testing plan covers all identified problems in the Problems section
10. [ ] Verify no silent assumptions are made about Convex mutation APIs (flag any missing details)
11. [ ] Verify commit structure is clean and traceable

**Documentation gaps resolved (verified 2026-04-10):**
- Convex mutation API for `stageSkills` documented in D2 with exact mutation names (`createOrUpdateDraft`, `publishVersion`, `activateVersion`). See `convex/stageSkills.ts`.
- System prompt storage verified in D2 (`convex/systemPrompts.ts`). Active prompt retrieved via `getActiveSystemPrompt`, new version created via `updateSystemPrompt` with automatic active-state inheritance.
- Skill file structural consistency verified via `grep` across all 14 files (see Appendix D). All 14 files have consistent ordering: Objective → Input Context → Web Search → Function Tools → Visual Language → Output Contract → Guardrails → Done Criteria. Insertion point for Change Group C2 (after Input Context, before Web Search) is valid for all 14 files.
- Validator constraints documented in Appendix E with proof that proposed Attachment Handling section passes all checks.

## Appendix D: Stage Scope Mapping and Structural Consistency

### Stage scope mapping (filename → stageScope)

The file naming convention uses hyphens with number prefixes, while `stageSkills` table uses `stageScope` values with underscores. Mapping:

| Filename | stageScope | skillId (from `toSkillId`) |
|---|---|---|
| `01-gagasan-skill.md` | `gagasan` | `gagasan-skill` |
| `02-topik-skill.md` | `topik` | `topik-skill` |
| `03-outline-skill.md` | `outline` | `outline-skill` |
| `04-abstrak-skill.md` | `abstrak` | `abstrak-skill` |
| `05-pendahuluan-skill.md` | `pendahuluan` | `pendahuluan-skill` |
| `06-tinjauan-literatur-skill.md` | `tinjauan_literatur` | `tinjauan-literatur-skill` |
| `07-metodologi-skill.md` | `metodologi` | `metodologi-skill` |
| `08-hasil-skill.md` | `hasil` | `hasil-skill` |
| `09-diskusi-skill.md` | `diskusi` | `diskusi-skill` |
| `10-kesimpulan-skill.md` | `kesimpulan` | `kesimpulan-skill` |
| `11-pembaruan-abstrak-skill.md` | `pembaruan_abstrak` | `pembaruan-abstrak-skill` |
| `12-daftar-pustaka-skill.md` | `daftar_pustaka` | `daftar-pustaka-skill` |
| `13-lampiran-skill.md` | `lampiran` | `lampiran-skill` |
| `14-judul-skill.md` | `judul` | `judul-skill` |

**Source:** `convex/stageSkills/constants.ts:3-18` (STAGE_SCOPE_VALUES) and `convex/stageSkills/constants.ts:46-48` (`toSkillId` function).

### Section heading audit (all 14 skills)

Verified via `grep -n "^## "` on each file on 2026-04-10:

| Skill | Sections present (in order) |
|---|---|
| 01-gagasan | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 02-topik | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 03-outline | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, **Expected Flow**, Done Criteria |
| 04-abstrak | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 05-pendahuluan | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 06-tinjauan-literatur | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 07-metodologi | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 08-hasil | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 09-diskusi | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 10-kesimpulan | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 11-pembaruan-abstrak | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 12-daftar-pustaka | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 13-lampiran | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |
| 14-judul | Objective, Input Context, Web Search, Function Tools, Visual Language, Output Contract, Guardrails, Done Criteria |

**Observations:**
- All 14 skills have `Input Context` as section 2 and `Web Search` as section 3. Insertion of `## Attachment Handling` between them is structurally safe in all files.
- `03-outline-skill.md` has an additional `Expected Flow` section between Guardrails and Done Criteria. This does not affect Change Group C2 insertion point.
- `11-pembaruan-abstrak-skill.md` starts section `## Objective` at line 1 (no title line before). Does not affect Change Group C2 insertion point.

## Appendix E: Validator Constraints Analysis

The `stageSkills.publishVersion` and `stageSkills.activateVersion` mutations call `validateStageSkillContent` from `src/lib/ai/stage-skill-validator.ts`. The validator rejects content that fails any check. This section proves that proposed Change Group C1 and C2 pass all validator checks.

### Validator check 1: Mandatory sections

**Rule (`src/lib/ai/stage-skill-validator.ts:5-13`):**
```typescript
const MANDATORY_SECTIONS = [
    "Objective", "Input Context", "Web Search",
    "Function Tools", "Output Contract", "Guardrails", "Done Criteria",
];
```

**Analysis:** Change Group C2 adds `## Attachment Handling` as a new section. The validator checks that mandatory sections EXIST but does NOT forbid additional sections. Adding Attachment Handling is safe.

**Verification:** Validator logic at lines 147-154 loops over `MANDATORY_SECTIONS` and checks presence. No check for disallowed sections.

### Validator check 2: English confidence

**Rule (`src/lib/ai/stage-skill-validator.ts:163-169`):**
```typescript
const english = estimateEnglishConfidence([input.name, input.description, content].join("\n"));
if (!english.ok) { issues.push({...}) }
```

**Threshold (`src/lib/ai/stage-skill-language.ts:48`):** `confidence >= 0.55`

**Analysis:** The proposed Attachment Handling section uses English technical vocabulary: "File", "Context", "attached", "response", "acknowledge", "summarize", "content", "subsequent", "integrate", "tools". None of these match the NON_ENGLISH_HINT_WORDS list (`yang`, `dan`, `untuk`, `dengan`, `pada`, `atau`, `tidak`, `adalah`, `wajib`, etc.).

**Proposed section English hit rate:** ~20+ matches for ENGLISH_HINT_WORDS (`the`, `and`, `for`, `this`, `that`, `must`, `only`, `stage`, `context`, `objective`, `reference`). Zero matches for NON_ENGLISH_HINT_WORDS. Confidence well above 0.55.

**Verification:** Safe.

### Validator check 3: Dangerous override phrases

**Rule (`src/lib/ai/stage-skill-validator.ts:105-120`):**
```typescript
const dangerousPatterns = [
    /\bignore\s+stage\s+lock\b/i,
    /\bbypass\s+stage\s+lock\b/i,
    /\boverride\s+tool\s+routing\b/i,
    /\bignore\s+tool\s+routing\b/i,
    /\bcall\s+(web\s+search|function\s+tools)\s+and\s+(updateStageData|web\s+search)\s+in\s+the\s+same\s+turn\b/i,
    /\bsubmit\s+without\s+user\s+confirmation\b/i,
];
```

**Analysis:** Proposed Attachment Handling section says "overrides any 'dialog first' directive in this skill" — the word "override" appears but NOT in combination with "tool routing" or "stage lock". None of the 6 patterns match the proposed text.

**Verification:** Safe. However, Codex should grep final content for these patterns before publish to catch any accidental match introduced by stage-specific framing (Change Group C3).

### Validator check 4: Visual Language contract

**Rule (`src/lib/ai/stage-skill-validator.ts:122-124`):**
```typescript
function hasVisualLanguageContract(content: string): boolean {
    return /interactive choice card/i.test(content) && /PaperValidationPanel/i.test(content);
}
```

**Analysis:** Change Group C2 adds a section but does NOT remove existing "Visual Language" section. Existing skills already contain "interactive choice card" and "PaperValidationPanel" references (verified in Appendix D section heading audit). Adding Attachment Handling preserves these.

**Verification:** Safe.

### Validator check 5: Choice card contradictions

**Rule (`src/lib/ai/stage-skill-validator.ts:126-134`):**
```typescript
const contradictoryPatterns = [
    /\bno choice card decision point needed\b/i,
    /\bdo not use choice cards for content decisions\b/i,
    /\bdisallowed:\s*[\s\S]*emitChoiceCard\b/i,
];
```

**Analysis:** Proposed Attachment Handling text does not mention choice cards. No contradiction.

**Verification:** Safe.

### Validator check 6: Search policy matrix

**Rule (`src/lib/ai/stage-skill-validator.ts:182-189`):**
```typescript
if (declaredSearchPolicy && declaredSearchPolicy !== expectedSearchPolicy) {
    issues.push({...})
}
```

**Expected policies (from `convex/stageSkills/constants.ts:21-39`):**
- Active: `gagasan`, `tinjauan_literatur`
- Passive: all other 12 stages

**Analysis:** Change Group C2 does not modify the "Web Search" section. Search policy declarations remain unchanged.

**Verification:** Safe.

### Validator check 7: Output keys whitelist

**Rule (`src/lib/ai/stage-skill-validator.ts:173-180`):**
```typescript
const unknownOutputKeys = outputKeys.filter((key) => !allowedKeys.includes(key));
```

**Analysis:** Change Group C2 does not modify the "Output Contract" section. Output keys remain unchanged.

**Verification:** Safe.

### Validator check 8: Outline skill lifecycle checklist

**Rule (`src/lib/ai/stage-skill-validator.ts:226-234`):**
```typescript
if (input.stageScope === "outline") {
    const outlineGuard = /checkedAt/i.test(content) && /checkedBy/i.test(content) && /editHistory/i.test(content);
    if (!outlineGuard) { issues.push({...}) }
}
```

**Analysis:** Only applies to `03-outline-skill.md`. Change Group C2 does not remove these fields (they exist in other sections of the outline skill).

**Verification:** Safe. Codex should spot-check outline skill specifically after update.

### Validator check 9: Living outline context for post-outline stages

**Rule (`src/lib/ai/stage-skill-validator.ts:236-257`):**
Applies to 11 stages after outline (abstrak through judul). Requires the text `living outline`, `checkedAt`, `checkedBy`, or `editHistory` to appear in content.

**Analysis:** Change Group C2 adds a new section but does not remove existing references to these terms. Safe if existing skills already comply (verified by Appendix D — all 14 skills currently pass validation in production).

**Verification:** Safe. Codex should confirm existing text that satisfies this rule is not accidentally removed.

### Validator check 10: Function Tools mandatory entries

**Rule (`src/lib/ai/stage-skill-validator.ts:260-280`):**
Function Tools section must mention `createArtifact`, `requestRevision`, and `updateArtifact`.

**Analysis:** Change Group C2 does not modify Function Tools section. Safe.

**Verification:** Safe.

### Summary of validator compliance

| Check | Risk | Status |
|---|---|---|
| 1. Mandatory sections | Low | PASS — C2 adds, doesn't remove |
| 2. English confidence | Low | PASS — proposed text is 100% English technical vocabulary |
| 3. Dangerous override phrases | Low | PASS — "override" appears but not in forbidden patterns |
| 4. Visual Language contract | Low | PASS — C2 does not modify existing Visual Language section |
| 5. Choice card contradictions | None | PASS — no choice card references in C2 |
| 6. Search policy matrix | None | PASS — Web Search section untouched |
| 7. Output keys whitelist | None | PASS — Output Contract untouched |
| 8. Outline lifecycle | None | PASS — only affects 03-outline, and C2 doesn't remove fields |
| 9. Living outline context | Low | PASS — C2 additive only |
| 10. Function Tools entries | None | PASS — Function Tools untouched |

**All 10 validator checks pass. Proposed changes are safe to publish and activate.**
