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
- Smoke tests T2-T11 with real file uploads (route.ts is not currently unit-tested; smoke tests are the primary verification path)
- Regression test T9 (`npx vitest run`) to confirm no existing tests regress
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

**Specific values (initial operating point, not a proven optimum):**
- `MAX_FILE_CONTEXT_CHARS_PER_FILE`: `6000` → `80000` (13.3x increase)
- `MAX_FILE_CONTEXT_CHARS_TOTAL`: `20000` → `240000` (12x increase)

**Rationale (estimates, not hard math):**
- Rough char-to-token ratio: ~4 chars/token for English prose, potentially higher for noisy PDF extraction or Indonesian text. Estimates below use 4 chars/token as a baseline — actual token counts may vary ±20%.
- 80,000 chars ≈ **~20,000 tokens estimated** ≈ roughly 25-30 pages of typical academic prose. Fits most complete journal articles.
- 240,000 chars ≈ **~60,000 tokens estimated** ≈ roughly 3 full reference papers. Handles typical multi-source comparison workflows.
- ~60,000 tokens is approximately 7.5% of 800,000 token budget threshold — leaves substantial headroom for conversation, system prompts, and response generation.
- Gemini 2.5 Flash window is 1,000,000 tokens. Estimated 60K tokens is well within practical attention quality range.
- Files exceeding 80,000 chars get a truncation marker and the model is instructed to use `quoteFromSource` or `searchAcrossSources` (already available in every skill's tool list).
- **These are initial operating points.** Post-deployment monitoring (D5) should inform whether values should be tuned up or down. If cost or latency metrics degrade, lower the limits. If users report truncation issues on typical academic content, raise them.

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

#### A5. Verify no stale references remain to old variable names (updated 2026-04-10)

After A3, A4, and A6 are applied, run BOTH grep commands below. Both must return zero matches before considering Change Group A complete.

**Checklist:**

1. [ ] `grep -rn "attachmentFirstResponseInstruction" src/` → expect zero matches
   - This variable was renamed to `attachmentAwarenessInstruction` in A3
2. [ ] `grep -rn "shouldForceAttachmentFirstResponse" src/` → expect zero matches
   - This variable was removed in A3; its role is now split between `hasAttachedFiles` and `isFirstTurnWithAttachment`
   - The telemetry field source at `route.ts:635` is updated in A6 to use `isFirstTurnWithAttachment`

If either grep returns any matches, update those references before proceeding. Do not skip this check — A6 exists specifically because the first round of this plan missed the telemetry reference.

#### A6. Update attachment telemetry field reference (added in response to Codex audit 2026-04-10)

**Location:** `src/app/api/chat/route.ts:635`

**Problem:** Telemetry payload references `shouldForceAttachmentFirstResponse` — a variable removed by A3. Without this update, the code won't compile and A5's grep check also won't match the intent.

**Before:**
```typescript
attachmentFirstResponseForced: shouldForceAttachmentFirstResponse,
```

**After:**
```typescript
// Field name kept for telemetry schema compatibility. Semantic updated 2026-04-10:
// previously meant "forced first-response review instruction fired",
// now means "first-turn attachment acknowledgment directive fired".
attachmentFirstResponseForced: isFirstTurnWithAttachment,
```

**Rationale:**
- Preserve the telemetry field name to avoid breaking downstream dashboards, aggregates, or queries
- Update the value source to closest-matching new variable (`isFirstTurnWithAttachment`)
- Document the semantic shift inline so future readers see it

**Grep verification after A6:** `grep -rn shouldForceAttachmentFirstResponse src/` should return zero matches.

#### A7. Emit omitted-files notice when total budget cap is hit (added in response to Codex audit 2026-04-10)

**Location:** `src/app/api/chat/route.ts:560-563` (and loop body downstream)

**Problem:** Current code uses `break` when `totalCharsUsed >= MAX_FILE_CONTEXT_CHARS_TOTAL`, exiting the loop before the 5th/6th/etc. file name is added to `fileContext`. Model has no way to know those files exist. This violates the "attachment awareness is unconditional" mandate for multi-file scenarios.

**Before:**
```typescript
for (const file of files) {
    const isImageFile = file.type?.startsWith("image/")
    if (isImageFile) {
        imageFileCount += 1
        continue
    }

    docFileCount += 1

    // Check if we've exceeded total limit (paper mode only)
    if (isPaperModeForFiles && totalCharsUsed >= MAX_FILE_CONTEXT_CHARS_TOTAL) {
        break
    }

    fileContext += `[File: ${file.name}]\n`
    // ... extraction status handling ...
}
```

**After:**
```typescript
const omittedFileNames: string[] = []
for (const file of files) {
    const isImageFile = file.type?.startsWith("image/")
    if (isImageFile) {
        imageFileCount += 1
        continue
    }

    docFileCount += 1

    // Check if we've exceeded total limit (paper mode only)
    // Track omitted files instead of silently breaking (2026-04-10 fix)
    if (isPaperModeForFiles && totalCharsUsed >= MAX_FILE_CONTEXT_CHARS_TOTAL) {
        omittedFileNames.push(file.name)
        continue
    }

    fileContext += `[File: ${file.name}]\n`
    // ... extraction status handling ...
}

// After loop: emit omitted-files notice so the model knows additional files exist
if (omittedFileNames.length > 0) {
    fileContext += `\n⚠️ Additional file(s) omitted from File Context due to total budget limit: ${omittedFileNames.join(", ")}. Full content accessible via quoteFromSource or searchAcrossSources tools when user asks about them.\n\n`
}
```

**Rationale:**
- Changes `break` to `continue` so all files are traversed and counted
- Tracks omitted file names in a local array
- Emits a single notice after the loop listing all omitted files
- Model can now tell user: "You uploaded N files, I can fully see M of them, the rest (file names) are accessible via tools"
- `docFileCount` still reflects all doc files correctly — the counter increments before the budget check

**Edge case (corrected 2026-04-10 per Codex Round 2):** The per-file limit (`MAX_FILE_CONTEXT_CHARS_PER_FILE = 80000`) applies BEFORE the total-budget check in the loop body. So a first 500K-char file does NOT skip injection entirely — it gets truncated to 80K chars (via A2 logic), receives the truncation marker, and gets injected into `fileContext`. The total-budget check then updates `totalCharsUsed` to 80000. For subsequent files, if `totalCharsUsed + next file size >= 240000`, the next file gets pushed to `omittedFileNames` via the A7 continue path.

Concrete example:
- File 1: 500K chars → truncated to 80K → injected with truncation marker → `totalCharsUsed = 80000`
- File 2: 100K chars → truncated to 80K → injected with truncation marker → `totalCharsUsed = 160000`
- File 3: 100K chars → truncated to 80K → injected with truncation marker → `totalCharsUsed = 240000`
- File 4: 50K chars → total budget check fires → pushed to `omittedFileNames`, continue
- File 5: 30K chars → total budget check fires → pushed to `omittedFileNames`, continue
- After loop: omitted-files notice appended listing File 4 and File 5

Edge case where `fileContext` contains ONLY the notice: never occurs with the current control flow, because the first file is always attempted injection before the budget check can fail. Even a single 10MB file gets its 80K-char slice injected.

**Telemetry semantic note:** `docContextChars` (tracked at `route.ts:589`) only counts the injected file text from `textToAdd`, NOT the length of the truncation marker (A2) or the omitted-files notice (A7). Post-fix, telemetry slightly under-reports total prompt growth from file context. This is intentional — the counter tracks file content volume specifically, not surrounding framing text. If precise prompt-size observability is needed, add a separate `fileContextTotalChars = fileContext.length` measurement alongside `docContextChars`. This is out of scope for the current fix but flagged for future consideration.

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

#### C1. Add attachment mention to "Input Context" section in each skill (ADDITIVE ONLY — updated 2026-04-10 in response to Codex audit)

**Rule:** This change is **strictly additive**. Do NOT replace or rewrite any existing Input Context content. Different skills have different Input Context bodies — some reference validator-required fields (e.g., `checkedAt`/`checkedBy`/`editHistory` in outline, "living outline" in post-outline stages). Wholesale replacement would violate:
- `outline_living_checklist_missing` validator rule (outline skill only, `stage-skill-validator.ts:226-234`)
- `post_outline_context_missing` validator rule (11 post-outline stages, `stage-skill-validator.ts:236-257`)

**Transformation rule per skill file:**

Keep the existing `## Input Context` section body **verbatim**. Append ONE new paragraph at the end of the section, separated by a blank line:

```
Additionally, read any attached files shown as "File Context" in system messages and integrate them with the other inputs listed above. Attached files are first-class context alongside user messages and stage data.
```

**Example — `01-gagasan-skill.md` BEFORE:**
```markdown
## Input Context
Read the latest user message, current stage data, recent web search references, and any prior approved stage summaries.
```

**Example — `01-gagasan-skill.md` AFTER:**
```markdown
## Input Context
Read the latest user message, current stage data, recent web search references, and any prior approved stage summaries.

Additionally, read any attached files shown as "File Context" in system messages and integrate them with the other inputs listed above. Attached files are first-class context alongside user messages and stage data.
```

**Example — `03-outline-skill.md` BEFORE (preserved verbatim to show validator fields stay intact):**

Whatever existing text references `checkedAt`/`checkedBy`/`editHistory` (for outline-specific validator check) remains untouched. The append happens at the END of the existing section body.

**Example — post-outline stages (abstrak, pendahuluan, etc.):**

Whatever existing text references "living outline" or similar context (for post-outline validator check) remains untouched. The append happens at the END of the existing section body.

**Verification after each edit:**
1. Diff the file against its previous state — the only addition should be the new paragraph and its preceding blank line
2. Confirm original stage-specific validator-required text still exists (search for `checkedAt` in outline, search for `living outline` in post-outline stages)
3. Run `validateStageSkillContent` mentally — all 10 checks should still pass

**Rationale:** Makes attachment presence explicit in the skill's declared input surface without touching validator-required content. Stops implicit exclusion while preserving all stage-specific semantics.

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

### T1. Route-level changes are not unit tested (verified 2026-04-10)

**No new unit tests.** `src/app/api/chat/route.ts` is not currently unit-tested in the repo. The changes in Change Group A are integration-level. Verification for A1-A7 happens exclusively via smoke tests T2-T11 and regression suite T9.

**This replaces the earlier overstated claim of "unit test coverage" in Scope and DoD.** See updated Scope and Definition of Done sections below.

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

### T7. Smoke test: Multiple files total budget (updated 2026-04-10)

**Setup:** Same as T2. Requires A7 (omitted-files notice code) to be applied.

**Test:**
1. Upload 5 files, each 60,000 chars
2. Expected total: 300,000 chars, but MAX_FILE_CONTEXT_CHARS_TOTAL = 240,000

**Expected (after A7 applied):**
- First 4 files fit fully (~240,000 chars total)
- 5th file omitted from direct File Context
- File Context ends with `⚠️ Additional file(s) omitted from File Context due to total budget limit: [filename5]. Full content accessible via quoteFromSource or searchAcrossSources tools when user asks about them.`
- Model's acknowledgment lists ALL 5 files by name (4 with summaries from direct context, 1 with "accessible via tools" mention)
- `docFileCount` telemetry shows 5, not 4

**Pre-A7 behavior (should NOT happen after fix):**
- 5th file silently missing from File Context
- Model unaware of 5th file existence
- `docFileCount` shows 5 (counter increments before break), but there is no mention of file #5

**Fail conditions:**
- File Context missing the omitted-files notice
- Model mentions only 4 files
- `docFileCount` != 5

### T11. Observation test (NON-BLOCKING): New file attached mid-conversation (added 2026-04-10, classification updated in response to Codex Round 2)

**Classification:** This is an **observation/monitoring test**, NOT a success criterion. T11 is explicitly excluded from the Definition of Done. Its purpose is to measure behavior against the known limitation documented in Risk 7f — it does not gate execution.

**Rationale for non-blocking classification:** The user mandate is unconditional attachment awareness. If the model fails to adequately acknowledge a mid-conversation upload, that IS a bug against the mandate. However, the code fix in Change Group A does not include "new file detection per turn" state tracking (Risk 7f). Asserting T11 as a success criterion would claim the fix solves a problem it doesn't fully solve. Instead, T11 observes the residual limitation so a follow-up fix can be scoped if needed.

**Setup:** Open new conversation in paper mode, stage=gagasan. Do NOT upload a file yet.

**Test:**
1. Send message: "Gue mau diskusi topik dulu sebelum lampirkan dokumen." (turn 1, no file)
2. Receive model response (turn 1 assistant)
3. Send message: "Oke, nih gue lampirkan." + upload PDF (turn 2, fresh file)
4. Receive model response (turn 2 assistant)

**What T11 measures (observation data only):**

- Does the turn 2 response mention the newly uploaded PDF by name? (yes/no)
- Does the turn 2 response summarize the PDF content? (yes/no)
- Does the turn 2 response integrate PDF content into the answer? (yes/no)

**Recording:** Log the results in `docs/normalizer-typeScript/t11-observation-log-YYYY-MM-DD.md` after each test run. This creates an evidence trail for the Risk 7f follow-up decision.

**Repetition protocol:** Run the T11 scenario **at least 5 independent attempts** (fresh conversations each time) to get a meaningful signal. Record each attempt's results in the observation log.

**If T11 shows the limitation is severe** (e.g., 3 or more of 5 attempts — i.e., >50% — show the model ignoring the new file entirely), flag this as a blocker for the user to decide whether to scope a follow-up fix (new file detection per turn) before shipping or ship with the limitation documented in release notes.

**T11 is NOT in Definition of Done.** T2-T10 are the success gate. T11 is reference data only.

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

### T10. Skill file diff verification (updated 2026-04-10)

**Action:** For each of the 14 skills, extract the `## Attachment Handling` section body using a block extractor, then diff pairwise.

**Block extraction using awk:**
```bash
awk '/^## Attachment Handling$/,/^## /' 01-gagasan-skill.md | sed '$d' > /tmp/attach-01.txt
awk '/^## Attachment Handling$/,/^## /' 02-topik-skill.md | sed '$d' > /tmp/attach-02.txt
diff /tmp/attach-01.txt /tmp/attach-02.txt
```

The `sed '$d'` strips the trailing "## " line that marks the start of the next section.

**Alternative using Node/Python parser:** Parse each skill file as markdown, locate the `## Attachment Handling` heading, extract all content until the next `## ` heading at the same level. Compare extracted blocks directly.

**Expected:** Core 6-step content is byte-identical across all 14 skills. Only optional stage-specific framing (C3, appended to step 2) may differ. If C3 is not used, the extracted blocks must be byte-identical across all 14.

**Why not `grep -A 6`:** If a skill adds line wrapping or C3 stage-specific framing that extends the section beyond 6 lines, `-A 6` would miss differences. Block extraction is robust to content length variations.

## Deployment Plan

### D1. Pre-deployment verification and snapshot

1. All code changes committed to `normalizer-typeScript` branch
2. Skill files updated in `.references/system-prompt-skills-active/updated-4/`
3. Smoke tests T2-T8 pass on local dev server; T11 executed and results logged to observation log (T11 is non-blocking observation, not a success gate)
4. Regression test T9 passes
5. Skill diff verification T10 passes
6. Codex audit of this fix plan completed and any findings addressed

#### D1.5. Pre-deployment snapshot (mandatory — added 2026-04-10 in response to Codex audit)

Before executing D2, create a full backup snapshot of the current active state of all 14 stage skills plus the active system prompt. This snapshot is the rollback source for R2 and R4.

**Snapshot storage location:** `snapshots/pre-deployment-YYYY-MM-DD-HHMMSS.json` in the worktree root (create `snapshots/` directory if it does not exist). File name uses deployment start timestamp for traceability.

**Snapshot content structure:**
```json
{
  "timestamp": "2026-04-10T15:30:00.000Z",
  "sourceDatabase": "wary-ferret-59",
  "stageSkills": [
    {
      "stageScope": "gagasan",
      "skillId": "gagasan-skill",
      "activeVersion": 7,
      "activeContent": "...(full markdown content)...",
      "name": "...",
      "description": "...",
      "allowedTools": [...]
    },
    // ... 13 more entries, one per stage
  ],
  "systemPrompt": {
    "promptId": "...",
    "version": 3,
    "name": "...",
    "content": "...(full system prompt text)...",
    "description": "..."
  }
}
```

**Snapshot creation procedure:**

1. For each of 14 stage scopes, call `stageSkills.getActiveByStage({ stageScope })` and capture:
   - `skillId`, `version`, `content`, `name` (from skill catalog), `description`, `allowedTools`
2. Call `systemPrompts.getActiveSystemPrompt()` and capture the full record
3. Write the combined JSON to the snapshot file
4. Verify the snapshot file is non-empty and contains all 14 skills + 1 system prompt

**Snapshot verification before proceeding to D2:**

- File exists at expected path
- JSON parses without errors
- `stageSkills` array has exactly 14 entries
- Every `stageScope` in STAGE_SCOPE_VALUES is present
- Every `activeContent` field is non-empty string
- `systemPrompt.content` is non-empty string

**If snapshot verification fails, do NOT proceed to D2.** Fix the snapshot creation issue first.

**Same snapshot procedure applies before D4 (prod deployment).** Create a separate snapshot file named `snapshots/pre-deployment-prod-YYYY-MM-DD-HHMMSS.json` targeting `basic-oriole-337`.

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
   - Side effect: Demotes previous active version to `"published"` status (NOT archived — verified at `convex/stageSkills.ts:493-498`), runs validator again, sets target as `"active"`. Now runtime `getActiveByStage` returns the new version. Previous version remains in version history as `"published"` and can be re-activated via rollback flow.

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

### R4. Full rollback (if multiple issues compound) — updated 2026-04-10

**Trigger:** Multiple issues from R1, R2, R3 simultaneously, OR a critical user-facing regression that cannot be isolated to a single layer.

**Precondition:** D1.5 snapshot file exists and is valid. If no snapshot exists, R4 is not executable — in that case, apply R1, R2, R3 individually and accept partial rollback.

**Steps:**

1. **Locate the snapshot file:** `snapshots/pre-deployment-YYYY-MM-DD-HHMMSS.json` (for dev) or `snapshots/pre-deployment-prod-YYYY-MM-DD-HHMMSS.json` (for prod).

2. **Restore all 14 stage skills from snapshot** — for each `entry` in `snapshot.stageSkills`:
   - Call `const { version: draftVersion } = await stageSkills.createOrUpdateDraft({ requestorUserId, stageScope: entry.stageScope, name: entry.name, description: entry.description, contentBody: entry.activeContent, changeNote: "Rollback to pre-deployment snapshot [timestamp]", allowedTools: entry.allowedTools })` → returns new draft version number in `draftVersion`
   - Call `await stageSkills.publishVersion({ requestorUserId, skillId: entry.skillId, version: draftVersion })` → publishes the draft
   - Call `await stageSkills.activateVersion({ requestorUserId, skillId: entry.skillId, version: draftVersion })` → activates the restored version
   - Wait for success response before proceeding to next entry
   - If any step fails for this entry, log the failed `entry.skillId` and CONTINUE with remaining entries (best-effort restore; partial rollback is better than none)

3. **Restore system prompt from snapshot:**
   - Call `systemPrompts.getActiveSystemPrompt()` to get current (broken) active prompt ID
   - Call `systemPrompts.updateSystemPrompt({ requestorUserId, promptId: currentActiveId, content: snapshot.systemPrompt.content, description: "Rollback to pre-deployment snapshot [timestamp]" })` → creates a new version with snapshot content that is automatically active via inherit rule

4. **Revert code deployment:**
   - Revert the merge commit on main that introduced Change Group A
   - Push the revert
   - Vercel redeploys automatically with reverted code

5. **Verify rollback completeness:**
   - For each `entry` in `snapshot.stageSkills`: call `stageSkills.getActiveByStage({ stageScope: entry.stageScope })` and diff the returned `content` field against `entry.activeContent` — expect byte-identical match per entry
   - Call `systemPrompts.getActiveSystemPrompt()` and diff the returned `content` field against `snapshot.systemPrompt.content` — expect byte-identical match
   - Record any entries where diff fails (these are restore failures that need manual remediation)
   - Run smoke test T2 — should exhibit the original bug (because we reverted the fix), confirming rollback worked end-to-end

6. **Document the rollback:**
   - Create `docs/normalizer-typeScript/rollback-log-YYYY-MM-DD.md`
   - Record: trigger reason, snapshot file used, skills restored, skills that failed to restore (if any), final verification results
   - Plan a corrected fix based on what went wrong

**Sequencing note on atomicity:** The 14-skill restore is NOT a single transaction. If the rollback is interrupted mid-sequence (e.g., network failure at skill 7 of 14), the database is left in a mixed state. To recover from mid-rollback failure, re-run R4 from step 1 — the snapshot is idempotent source of truth. Document partial restore state in the rollback log.

## Definition of Done

**Code (Change Group A):**
- [ ] A1 applied (raised file context limits)
- [ ] A2 applied (truncation marker)
- [ ] A3 applied (unconditional attachment directive)
- [ ] A4 applied (fullMessagesBase variable rename)
- [ ] A5 grep check returns zero matches for `attachmentFirstResponseInstruction` and `shouldForceAttachmentFirstResponse`
- [ ] A6 applied (telemetry field source updated to `isFirstTurnWithAttachment`)
- [ ] A7 applied (omitted-files notice emitted after loop)
- [ ] `npx tsc --noEmit` shows zero errors
- [ ] `npx vitest run` shows same pass/fail baseline as pre-fix (except the 3 pre-existing failures in `reference-presentation.test.ts`). Note: route.ts is not unit-tested; verification happens via smoke tests.

**Content (Change Groups B and C):**
- [ ] `system-prompt.md` B1 update applied
- [ ] All 14 skill files have C1 applied ADDITIVELY (new paragraph appended to Input Context section, existing content preserved verbatim)
- [ ] All 14 skill files have C2 applied (new Attachment Handling section inserted between Input Context and Web Search)
- [ ] Outline skill (`03-outline-skill.md`) still contains `checkedAt`/`checkedBy`/`editHistory` references after C1+C2
- [ ] Post-outline skills (04 through 14) still contain "living outline" or equivalent references after C1+C2
- [ ] T10 skill diff verification passes

**Smoke tests (success gate):**
- [ ] T2 passes (paper mode short prompt)
- [ ] T3 passes (paper mode long prompt)
- [ ] T4 passes (non-paper mode)
- [ ] T5 passes (subsequent turn)
- [ ] T6 passes (large file truncation)
- [ ] T7 passes (multiple files budget with omitted-files notice)
- [ ] T8 passes (no attachment regression)

**Observation tests (not blocking, recorded for Risk 7f follow-up decision):**
- [ ] T11 executed and results logged to `docs/normalizer-typeScript/t11-observation-log-YYYY-MM-DD.md`
- [ ] If T11 shows severe limitation (>50% runs ignore new file), flag to user for follow-up scope decision before shipping

**Deployment:**
- [ ] D1.5 pre-deployment snapshot created and verified (dev)
- [ ] D2 complete (dev DB `wary-ferret-59`) — all 14 skills + system prompt active and diff-verified
- [ ] D3 complete (branch merged, code in prod via Vercel)
- [ ] D1.5 pre-deployment snapshot created and verified (prod)
- [ ] D4 complete (prod DB `basic-oriole-337`) — all 14 skills + system prompt active and diff-verified
- [ ] D5 24h monitoring shows no regressions

**Audit:**
- [ ] Codex audit of this plan completed with verdict of APPROVE or APPROVE-WITH-CHANGES
- [ ] All Codex critical and important findings addressed
- [ ] Codex audit of implementation commits completed
- [ ] Codex final pre-push audit completed

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

### Risk 7a: Mixed-stage runtime risk during sequential 14-skill deployment (added 2026-04-10)

**Description:** D2 deploys 14 stage skills sequentially, not as an atomic transaction. If the deployment process is interrupted after skill 5 of 14 (e.g., network failure, Convex timeout, manual kill), the environment is left in a mixed state: 5 stages run the new Attachment Handling directive, 9 stages run the old content.

**Probability:** Low-medium. Convex mutations are individually atomic, but the sequence is not.

**Impact:** Users on different stages see inconsistent behavior — some stages acknowledge attachments, others ignore them.

**Mitigation:**
- Document deployment progress in a progress file (e.g., `snapshots/deployment-progress-YYYY-MM-DD.json`) tracking which skills have completed draft→publish→activate cycle
- If deployment interrupts, resume from last successful skill by reading progress file
- After all 14 complete, run `stageSkills.runPreActivationDryRun` (verified available at `convex/stageSkills.ts:988`) — this query iterates all 14 stages and validates latest drafts against whitelist rules, returning pass/fail per stage. Use it as an automated sanity check before declaring D2 complete.
- Additionally, run manual `getActiveByStage` content diff against local skill files to catch content-level divergence that the validator alone won't catch (e.g., wrong version activated)
- If mid-deployment interruption cannot be resumed, execute R4 to restore snapshot state
- Treat the full D2 sequence as "one deployment event" — do not ship to users until all 14 stages are verified

### Risk 7b: Omitted-file invisibility under total budget overflow (resolved by A7)

**Description:** Before A7, when `totalCharsUsed >= MAX_FILE_CONTEXT_CHARS_TOTAL`, the loop broke without emitting any notice. Files beyond the budget disappeared silently from the model's context. User could upload 5 files, and the model would never know file #5 existed.

**Status:** **Addressed by Change A7** (omitted-files notice). After A7 is applied, the model receives an explicit list of omitted file names and is instructed to use `quoteFromSource` or `searchAcrossSources` tools for their content.

**Residual risk:** The notice relies on the model following the instruction. If the model ignores the notice and pretends file #5 doesn't exist, T7 would catch this. Low residual risk because the notice text is explicit and mentions tools.

### Risk 7c: Telemetry semantic drift on `attachmentFirstResponseForced` (resolved by A6)

**Description:** The telemetry field `attachmentFirstResponseForced` at `route.ts:635` previously meant "forced first-response review instruction fired" (the old `shouldForceAttachmentFirstResponse` boolean). After A3, the variable is removed and the semantic changes. Without A6, downstream dashboards and aggregates that consume this field would either break or silently drift.

**Status:** **Addressed by Change A6** (inline documentation + value source update to `isFirstTurnWithAttachment`). Field name preserved for schema compatibility.

**Residual risk:** Dashboards that rely on the old semantic definition ("forced directive") may show lower/different counts after the fix. Low residual risk — the semantic shift is documented inline.

### Risk 7d: Code/content deployment skew (added 2026-04-10)

**Description:** The fix has two deployment layers: Vercel code deploy (Change Group A) and Convex content deploy (Change Group B + C). If they are deployed out of sync, users temporarily see:
- **Scenario 1:** New code + old skills = code raises limits and adds directive, but skills still say "dialog first" without attachment handling → partial fix
- **Scenario 2:** New skills + old code = skills instruct attachment acknowledgment, but code still has the `!paperModePrompt` guard preventing the directive from firing → skills update is no-op until code deploys

**Probability:** Medium. Vercel and Convex deploys are not transactionally linked.

**Impact:** Brief window of inconsistent user experience. Worst case: confusing behavior for minutes to hours between the two deploy steps.

**Mitigation:**
- Sequence: deploy code first (D3), wait for Vercel to finish and propagate, THEN deploy content to Convex prod (D4)
- Rationale for ordering: new code with old skills is a graceful partial fix (at least the code-level directive fires); new skills with old code is silently broken
- Announce deploy window in team channel to avoid user confusion
- Monitor both layers during the transition window via Vercel dashboard and Convex logs

### Risk 7e: Over-anchoring on stale attachments during topic pivots (added 2026-04-10)

**Description:** With unconditional attachment awareness firing every turn, the "subsequent-turn" instruction tells the model to "integrate file content when relevant." If the user pivots topics mid-conversation (e.g., uploads a paper, discusses it for 10 turns, then asks an unrelated question), the model may over-anchor on the old file and try to connect it to the new topic.

**Probability:** Medium in long conversations with multiple topic shifts.

**Impact:** Responses feel forced or irrelevant when user has moved on from the attached file's subject.

**Mitigation:**
- The "subsequent-turn" instruction wording uses "when relevant" as a qualifier, giving the model permission to ignore the file when the user's current question is unrelated
- Monitor post-deployment user feedback for "model keeps bringing up the old PDF" complaints
- If this becomes a pattern, add a "topic relevance check" to the subsequent-turn instruction (e.g., "Only reference file content when the current user question or task is related to the file's subject")

### Risk 7g: Rollback-script drift risk (added 2026-04-10 in response to Codex Round 2)

**Description:** R4 now contains pseudo-executable restore steps with concrete field references (e.g., `entry.activeContent`, `entry.stageScope`). If those field paths drift from the actual snapshot JSON structure produced by D1.5 — for example, a typo or a snapshot format update that's not reflected in R4 — then R4 will silently fail or restore wrong content during an actual disaster. This creates false confidence around disaster recovery.

The first round of this plan already caught one such bug: R4 referenced `snapshot.activeContent` instead of `entry.activeContent` during loop iteration. Codex caught it. Future drift is possible.

**Probability:** Low-medium. Happens when snapshot JSON structure changes or rollback step is updated out of sync with D1.5.

**Impact:** In an actual rollback scenario, the restore fails to execute or restores wrong data, leaving the system broken with no clean recovery path.

**This is a plan-executability risk, not a product/runtime risk.** It affects the reliability of the rollback document itself.

**Mitigation:**
- Before the next Codex audit cycle that includes R4 modifications, verify R4 field references match the D1.5 snapshot JSON structure byte-for-byte
- During actual execution of D1.5 (snapshot creation), dump the generated JSON to the worktree and visually inspect one entry against R4's expected field paths before proceeding with deployment
- Consider replacing the pseudo-code in R4 with a runnable script committed alongside the plan (out of scope for this fix, but flagged for future consideration)
- If R4 pseudo-code fails during an actual rollback, fall back to manual Convex dashboard restoration using the snapshot JSON as the source of truth for content

### Risk 7f: The `userMessageCount <= 1` branching is imperfect (was Risk 7 before 2026-04-10)

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

## Appendix B: Commit Structure (updated 2026-04-10)

Proposed commit sequence for clean git history:

1. `feat(chat): raise file context limits to 80K/240K chars with truncation marker` — Change Group A1, A2
2. `feat(chat): emit omitted-files notice when total budget cap is hit` — Change Group A7
3. `fix(chat): remove conditional gating of attachment awareness directive` — Change Group A3, A4, A5, A6
4. `docs(system-prompt): strengthen attachment awareness directive` — Change Group B
5. `docs(skills): add attachment handling section to all 14 paper stage skills (additive)` — Change Group C (single commit for consistency, explicitly additive per C1 transformation rule)
6. `chore(deploy): update dev database wary-ferret-59 with new skills and system prompt` — deployment marker commit (captures deployment timestamp and snapshot file reference)

Each commit should reference this plan document: `Refs: docs/normalizer-typeScript/attachment-awareness-comprehensive-fix-plan.md`

**Sequencing rationale:**
- A1+A2 first: low-risk constant changes, builds successfully on its own
- A7 second: adds omitted-files logic that depends on A1+A2 constants being in place
- A3+A4+A5+A6 together: coherent rename + telemetry update, must ship as one commit to avoid broken build
- B and C separate from A: content changes have different review cycle and deploy to Convex separately
- C as single commit: 14 skill files updated together preserves atomic content change in git history

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

**Codex Audit Round 1 response log (2026-04-10):**

Codex returned BLOCK verdict with 1 critical, 5 important, 3 minor findings plus 5 missing risks. All findings verified against codebase. Plan revised as follows:

| Codex finding | Severity | Resolution |
|---|---|---|
| C1 replacement-style would delete validator-required fields (outline lifecycle, post-outline context) | Critical | Rewrote C1 as strictly additive — appends new paragraph to existing Input Context, preserves all existing text verbatim |
| A3/A4 incomplete — `route.ts:635` telemetry reference breaks build | Important | Added A6 (update telemetry field source to `isFirstTurnWithAttachment`, preserve field name for schema compatibility) |
| T7 expectation does not match current `break` behavior | Important | Added A7 (emit omitted-files notice) AND updated T7 to match new expected behavior |
| D2 misstates `activateVersion` as "archives" previous active | Important | Corrected to "demotes to published" with file:line evidence (`convex/stageSkills.ts:493-498`) |
| R4 snapshot never defined | Important | Added D1.5 pre-deployment snapshot step with explicit file path, JSON structure, creation procedure, and verification. Rewrote R4 to use the snapshot concretely. |
| Unit test claim contradicts T1 content | Important | Removed "unit test coverage" from Scope. Rewrote T1 to state clearly that route is not unit-tested. Updated DoD accordingly. |
| T10 grep -A 6 is brittle | Minor | Updated T10 to use awk block extraction |
| Char-to-token math presented as hard conversion | Minor | Labeled as estimate (±20%) in Decision 3 rationale |
| `docContextChars` doesn't track marker length | Minor | Added telemetry semantic note to A7 section |
| Missing risk: mixed-stage runtime deployment | Missing risk | Added Risk 7a |
| Missing risk: omitted-file invisibility | Missing risk | Added Risk 7b (marked resolved by A7) |
| Missing risk: telemetry semantic drift | Missing risk | Added Risk 7c (marked resolved by A6) |
| Missing risk: code/content deploy skew | Missing risk | Added Risk 7d with mitigation sequencing |
| Missing risk: over-anchoring on stale attachments | Missing risk | Added Risk 7e |

All 14 findings addressed in this document revision. Plan is ready for Round 2 audit.

**Codex Audit Round 2 response log (2026-04-10):**

Codex returned APPROVE-WITH-CHANGES — 0 critical, 2 important, 3 minor findings, 1 new risk. All findings verified against the current plan text. Resolutions:

| Round 2 finding | Severity | Resolution |
|---|---|---|
| R4 step 2 uses `snapshot.activeContent` inside iteration over `snapshot.stageSkills` — wrong field path | Important | Rewrote R4 step 2 and step 5 to use `entry.activeContent`, `entry.stageScope`, `entry.name`, `entry.description`, `entry.allowedTools`, `entry.skillId` consistently. Added concrete example of per-entry restore loop. |
| T11 "partial pass acceptable" contradicts user mandate of unconditional awareness and softens success bar | Important | Reclassified T11 as observation/monitoring test, NOT a success criterion. Removed from DoD success gate. Added T11 observation logging requirement to a separate non-blocking DoD section. Added flag-to-user clause if T11 shows severe limitation (>50% runs ignore new file). |
| A7 edge case description claimed "500K file → only notice" but actual control flow truncates first then checks budget | Minor | Rewrote edge case section with concrete per-file walkthrough showing that per-file limit applies BEFORE budget check, so first file always gets injected (truncated if needed). Added explicit note: "Edge case where fileContext contains ONLY the notice: never occurs with current control flow." |
| `runPreActivationDryRun` said "(if available)" but it exists at `convex/stageSkills.ts:988` | Minor | Removed "if available" qualifier. Documented explicit recommendation to use `runPreActivationDryRun` as automated sanity check after D2 completes, with manual `getActiveByStage` diff as complementary check for content-level divergence. |
| A5 heading says "old variable name" singular but checks 2 names | Minor | Rewrote A5 as explicit checklist with 2 grep commands (`attachmentFirstResponseInstruction` and `shouldForceAttachmentFirstResponse`), each with zero-match expectation and rationale. |
| Rollback-script drift risk (new) | New risk | Added Risk 7g documenting plan-executability risk specific to pseudo-executable R4 steps. Includes mitigation: verify field references before deploy, dump JSON during D1.5 for visual inspection, consider runnable script in future fix. |

All 5 findings + 1 new risk addressed in this revision. Plan ready for Round 3 audit.

**Codex Audit Round 3 response log (2026-04-10):**

Codex returned APPROVE — 0 critical, 0 important, 3 minor findings only. Go verdict. All 3 minor nits addressed as quick cleanups:

| Round 3 finding | Severity | Resolution |
|---|---|---|
| D1 pre-deploy verification line says "T2-T11 pass" but T11 is non-blocking observation | Minor | Changed wording to "T2-T8 pass, T11 executed and logged" |
| R4 step 2 uses placeholder `<new draft version from previous call>` — named pseudo-variable cleaner | Minor | Replaced with `const { version: draftVersion } = await stageSkills.createOrUpdateDraft(...)` pattern |
| T11 ">50% of test runs" threshold implies repeated runs but minimum count not prescribed | Minor | Added explicit "Repetition protocol: Run the T11 scenario at least 5 independent attempts" and clarified ">50%" as "3 or more of 5 attempts" |

Plan fully approved for execution phase. Commit `0c3f2b95` captured these minor cleanups.

**Codex Audit Round 4 response log (2026-04-10):**

First audit of actual code commits (Change Group A). Commits `290047b2`, `38262dc4`, `31e4a913`. Codex returned APPROVE-WITH-CHANGES — 0 critical, 0 important, 3 minor findings (all optional cleanups). "Go" verdict for Change Group B.

| Round 4 finding | Severity | Resolution |
|---|---|---|
| Omitted-files notice can grow arbitrarily with many omitted files | Minor | Acknowledged as future operational improvement. Not blocking — noted for potential follow-up to cap notice length. |
| Telemetry field name `attachmentFirstResponseForced` still reads like forcing gate after A6 semantic shift; potential future rename to `attachmentFirstTurnBranchSelected` | Minor | Acknowledged as future schema migration. No downstream consumers currently affected. |
| Inline comments around new directive + budget logic getting dense | Minor | Acknowledged — readability watch for future attachment-logic landings in this block. |

Verification results: all 5 behavioral correctness checks PASS, 2 telemetry semantic checks PASS, 3 regression risk checks PASS (D.12 and D.13 PARTIAL as acknowledged limitations), 2 pre-execution readiness checks PASS. Plan approved for Change Group B (Commit 4 + Commit 5).

**Codex Audit Round 5 response log (2026-04-10):**

Audit of content commits (Change Group B + C). Commits `d9590804` (system-prompt.md) and `79e6f8d9` (14 skill files). Codex returned **APPROVE with ZERO findings**. Go verdict for D1.5 snapshot + D2 deployment.

| Section | Result |
|---|---|
| A.1-A.5 Content correctness (B1 block + C1 additive + C2 uniform) | All PASS |
| B.6-B.14 Validator compliance (9 validator checks) | All PASS |
| C.15-C.17 Structural integrity (diff scope, no C3, 11-pembaruan structure) | All PASS |
| D.18-D.20 Pre-deployment readiness | All PASS |
| New risks | None |

Content commits entered the execution phase cleanly. No plan revision needed for Round 5.

**Codex Audit Round 6 response log (2026-04-10):**

Audit of dev deployment evidence (D1.5 snapshot + D2 deploy scripts + smoke tests + T11 log). Commit `6f2cc73e` (deployment tooling + artifacts). Codex returned APPROVE-WITH-CHANGES — 0 critical, 3 important, 2 minor findings, 2 new risks.

| Round 6 finding | Severity | Resolution |
|---|---|---|
| `runPreActivationDryRun` validates latest_published candidate (just-demoted previous active), not newly active version — progress JSON's `verification.dryRun` field semantically misleading | Important | Added "Verification layer semantics" section to dev verification doc separating Layer 1 (authoritative readback diff at `scripts/deploy-attachment-awareness-dev.mjs:128-140`) from Layer 2 (secondary dry run with candidate resolution bug documented). Actual deployment correctness unchanged — readback diff is authoritative. |
| T9 framing "matches pre-existing baseline" too strong without baseline artifact link | Important | Replaced with verifiable claim: `git log` command showing zero commits in branch for `reference-presentation.test.ts` and `reference-presentation.ts`. Failure signature `Promise {}` is a property of files this branch does not modify. |
| T11 attempt 1 log claimed `summarize_content=YES` but evidence snippet had no summary quote | Important | Downgraded attempt 1 to `UNVERIFIED` in observation log table. Added correction note. Recalculated totals from 5/5 to 4/5 summarization. Severe limitation threshold unchanged (threshold requires ≥3 ignoring entirely, which never happened). |
| Snapshot verifier only checks count + non-empty content, doesn't validate rollback-critical fields (skillId, name, description, allowedTools, promptId, version) | Minor | Acknowledged as future improvement to `create-convex-snapshot.mjs`. Current snapshot file is sufficient for rollback (Codex confirmed fields are actually present). Not blocking. |
| Deploy script hardcodes ADMIN_ID and is not idempotent for rerun with same content | Minor | Acknowledged as future improvement. For the specific deploy performed, not a problem. Not blocking. |
| New risk: deployment-progress false security on rerun (verification.complete could mean published valid, not active valid) | New risk | Implicitly addressed via verification layer semantics clarification — future deployment scripts should restructure progress JSON. |
| New risk: evidence drift risk if baseline claims stay without concrete pointers | New risk | Addressed via T9 verifiable claim format. Future audits should require link-to-artifact for baseline claims. |

All 3 important findings addressed in commit `2d8b7518`. Minor findings documented as future work.

**Codex Audit Round 7 response log (2026-04-10):**

Pre-push final review combined with Audit 6 resolution verification. Codex returned APPROVE-WITH-CHANGES — 0 critical, 3 important, 0 minor findings, 1 new risk.

| Round 7 finding | Severity | Resolution |
|---|---|---|
| T11 correction not fully propagated — stale `5/5` line still present in dev verification doc readiness summary | Important | Updated the readiness summary line to match the corrected totals: `5/5` acknowledgment, `4/5` confirmed summary with attempt 1 unverified, `5/5` integration, severe limitation threshold NOT TRIGGERED |
| Appendix C audit trail incomplete — only Rounds 1-2 logged, Rounds 3-6 missing | Important | Added explicit audit round logs for Rounds 3, 4, 5, 6, and 7 (this entry) to Appendix C. Each round has a finding/resolution table. |
| Branch-specific instruction files (AGENTS.md, CLAUDE.md, SCOPE.md) in merge diff would leak worktree-only scope into main | Important | Reverted AGENTS.md and CLAUDE.md to merge-base state (removes the normalizer-typeScript EXPANDED SCOPE blocks I added). Emptied SCOPE.md back to its 0-byte pre-branch state. Preserved the session scope history content in a new branch-local file `docs/normalizer-typeScript/session-scope-history.md` for audit trail continuity. |
| New risk: merging AGENTS.md and CLAUDE.md as-is would leave stale branch-specific operational instructions in main | New risk | Directly addressed by the revert above. No residual risk after Round 7 resolution. |

All 3 important findings addressed in Round 7 resolution commit. Plan and branch ready for push/PR/merge pending Codex re-audit.

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
