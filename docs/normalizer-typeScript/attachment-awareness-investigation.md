# Attachment Awareness Investigation Report

**Date:** 2026-04-10
**Investigator:** Claude Code + 5-agent parallel investigation team
**Scope:** Read-only. No code changes pending user validation.
**Status:** Complete — awaiting user validation before fix

## Problem Statement

User uploads a PDF then sends a chat message. The model ignores the PDF content and follows a generic brainstorming flow dictated by the current paper stage skill. Only after the user explicitly protests ("kamu nggak membaca dokumennya?") does the model acknowledge and read the attachment.

**User mandate:** Attachment awareness must be unconditional. It must not depend on prompt phrasing, turn count, paper mode state, or skill instruction priorities.

**Test evidence:** `screenshots/test-2/` — PDF `31_Identifikasi+Pengaruh+Penggunaan+Chat-GPT.pdf` ignored in Turn 1 with prompt "Berangkat dari ide saja, ayo kita bahas." Acknowledged in Turn 2 after user protest.

## Initial Hypotheses vs Verified Reality

| Hypothesis | Verdict | Evidence |
|---|---|---|
| H1: RAG retrieval gated by search router | **PARTIAL** — retrieval is gated, but not where I thought | See §3 |
| H2: File chunks never surface because search router says NO-SEARCH | **WRONG** — file content reaches model via different path | See §2 |
| H3: Skill instructions override attachment awareness | **CORRECT** — this is the actual root cause | See §4 |
| H4: There's a keyword-based "read document" detector | **WRONG** — no such detector exists | See §5 |

## Architecture: Two Independent Content Paths

The codebase has **two parallel paths** for attachment content. They do not share state.

### Path 1: Direct `extractedText` Injection (ALWAYS ACTIVE)

**Location:** `src/app/api/chat/route.ts:515-600`

```
Upload → files.extractedText (full text) → chat route fetches → fileContext string → system message
```

- Fetches `files.extractedText` via `api.files.getFilesByIds`
- Builds `fileContext` string from full extracted text
- Polls up to 8 seconds for pending extractions
- Applies paper mode limits: 6000 chars/file, 20000 chars total
- Injects as system message at `route.ts:799-801` — **unconditional when files exist**

**Crucially:** This path is NOT gated by the search router. It runs every turn when `effectiveFileIds.length > 0`.

### Path 2: RAG Chunk Retrieval (MANUAL TOOL-BASED)

**Location:** `convex/sourceChunks.ts:88-133`, `src/lib/ai/paper-tools.ts:637-734`

```
Upload → rag-ingest → sourceChunks table (chunks+embeddings) → ONLY accessible via manual tools
```

- Content is chunked and embedded into `sourceChunks`
- Retrieval happens via `searchByEmbedding` action
- **ONLY called by model tool invocations:** `quoteFromSource` or `searchAcrossSources`
- Never automatically retrieved per turn
- Not gated by search router, but requires explicit model action to trigger

**Key insight:** The user's initial hypothesis (RAG gated by search router) was wrong. RAG chunks exist but are accessed via model tool calls, not automatic retrieval. Separately, file `extractedText` IS always injected.

## The Actual Root Cause: Instruction Conflict in Paper Mode

**File content WAS in the system prompt during Turn 1.** The PDF's first 6000 chars were injected via Path 1. The model had access to the content.

**The model ignored it because of instruction priority in paper mode.**

### Evidence Chain

**Evidence 1: File context was injected in Turn 1**

`src/app/api/chat/route.ts:799-801`:
```ts
...(fileContext
    ? [{ role: "system" as const, content: `File Context:\n\n${fileContext}` }]
    : []),
```

This runs unconditionally when `fileContext` is non-empty. Terminal log line 29 confirms the file was processed and ingested, and extraction was successful. Direct injection happened.

**Evidence 2: The "must read file first" directive was EXPLICITLY DISABLED in paper mode**

`src/app/api/chat/route.ts:492-500`:
```ts
const shouldForceAttachmentFirstResponse =
    effectiveFileIds.length > 0 &&
    requestedAttachmentMode === "explicit" &&
    !paperModePrompt &&                          // ← HARD DISABLE IN PAPER MODE
    userMessageCount <= 1 &&
    normalizedLastUserContent.length <= 64
const attachmentFirstResponseInstruction = shouldForceAttachmentFirstResponse
    ? "Pengguna baru saja melampirkan file secara eksplisit. Jawaban pertama WAJIB langsung mengulas isi file terlampir. DILARANG membuka dengan perkenalan umum, profil asisten, atau daftar kemampuan. Kalimat pertama harus langsung menjelaskan inti isi dokumen yang dilampirkan."
    : ""
```

The `!paperModePrompt` condition means: **if the user is in any paper stage (gagasan, kerangka, isi, etc.), this "must review file first" instruction will NEVER fire.** The model gets the file content as passive context but zero directive to use it.

**Evidence 3: The gagasan skill actively instructs the model to IGNORE context and run its own dialog**

`src/lib/ai/paper-stages/foundation.ts:23-39` (fallback gagasan instructions):
```
1. THIS IS A DIALOG, NOT A MONOLOGUE
   - Do NOT immediately generate full output upon receiving the user's idea
   - Ask clarifying questions first to understand context and motivation
   - Discuss and explore TOGETHER before drafting

2. ALL REFERENCES AND FACTUAL DATA MUST COME FROM WEB SEARCH
   - ALL references in output MUST come from web search — NEVER fabricate
   - ALL factual data (statistics, numbers, specific facts) MUST come from web search — NEVER invent
   ...
```

`docs/skill-per-stage/skills/gagasan-skill/SKILL.md` Input Context section:
```
Read the latest user message, current stage data, recent web search references,
and any prior approved stage summaries.
```

**Attachments are not mentioned.** The skill's "Input Context" defines what the model should read — and uploaded files are absent from this list.

**Evidence 4: Injection order places file context BEFORE skill instructions are actionable**

`src/app/api/chat/route.ts:791-804`:
```ts
const fullMessagesBase = [
    { role: "system", content: systemPrompt },                         // 1. Base
    ...(paperModePrompt ? [{ content: paperModePrompt }] : []),       // 2. Paper mode + skill
    ...(paperWorkflowReminder ? [{ content: paperWorkflowReminder }] : []),
    ...(fileContext ? [{ content: `File Context:\n\n${fileContext}` }] : []),  // 3. File context
    ...(attachmentFirstResponseInstruction ? [...] : []),              // 4. NEVER in paper mode
    ...
]
```

`paperModePrompt` (with gagasan-skill inside) comes at position 2. `fileContext` comes at position 3. The skill instruction is processed earlier in the system prompt and dominates the model's interpretation of what to do next.

### How Turn 1 and Turn 2 Actually Differ

**Turn 1:**
- File context: **present** (6000 chars of PDF in system message)
- `attachmentFirstResponseInstruction`: **empty** (disabled by `!paperModePrompt`)
- Gagasan skill: active, says "dialog first, ask clarifying questions, do not immediately generate output"
- User message: "Berangkat dari ide saja, ayo kita bahas" (short, no explicit reference to file)
- **Model decision:** Follow the only active directive (gagasan skill) → enter generic brainstorming, treat file as passive background

**Turn 2:**
- File context: **still present** (same 6000 chars)
- `attachmentFirstResponseInstruction`: **still empty** (paper mode hasn't changed)
- Gagasan skill: still active, still says "dialog first"
- User message: "Ihs, kamu nggak membaca dokumennya?" — **explicit user clarification request**
- **Model decision:** The user's message itself acts as the "clarifying question" the skill demanded. The model now has explicit permission to deviate and read the file that was always there.

**Nothing changed in the code path. What changed is the user's message explicitly authorized the model to use the file context.**

## Conflicting Design Intentions

There are three pieces of code that conflict:

| Code | Intent |
|---|---|
| `route.ts:799-801` | "Always surface file content to the model" |
| `route.ts:495` (`!paperModePrompt`) | "Don't force file-first behavior in paper mode — let skill drive the flow" |
| `gagasan-skill` Input Context | "Model should read: user message, stage data, web refs, prior summaries" (attachments absent) |

The design sequence was likely:

1. Someone built file context injection to always-on
2. Someone added `attachmentFirstResponseInstruction` for deterministic file-first behavior on short prompts
3. Someone disabled it in paper mode because paper mode has its own dialog paradigm
4. Nobody updated paper stage skills to handle attachments

The result: **in paper mode, attachments are silently present but silently ignored.**

## Related Finding: RAG Retrieval Is Not Automatic

This is separate from the main bug but was surfaced during investigation and deserves flagging.

**Finding:** RAG chunks in `sourceChunks` are NEVER automatically retrieved. They are only accessed when the model calls `quoteFromSource()` or `searchAcrossSources()` tools.

**Implication:** Even if a 200-page PDF gets chunked into 100 embeddings, those embeddings are irrelevant unless the model decides to use the retrieval tools. For short files that fit in 6000 chars, Path 1 (direct injection) handles everything. For large files that get truncated, the RAG chunks become the only way to access content beyond the 6000-char budget — and the model must explicitly retrieve them.

**Relevance to the reported bug:** For the test case (PDF was 38928 chars, truncated to 6000 in Path 1), only the first ~15% of the document was actually in the system prompt. Even if the model obeyed "read file first," it would only see a fraction. The rest is in RAG chunks that the model never retrieved because the skill didn't instruct it to.

## Recommended Fix Options

All options presume the user's mandate: **attachment awareness must be unconditional in paper mode too**.

### Option A: Deterministic code fix (single source of truth)

**Change:** Remove `!paperModePrompt` from line 495. Rewrite `attachmentFirstResponseInstruction` text to be paper-mode-aware.

**New instruction text (proposed):**
```
User just attached file(s). Before following any stage workflow, your first response MUST briefly acknowledge each file by name and summarize its core content in 2-4 sentences. Only AFTER the acknowledgment can you proceed with stage-specific dialog (clarifying questions, brainstorming, etc.). This is mandatory and overrides any skill instruction that says "dialog first" — file acknowledgment comes before dialog.
```

**Also:** Drop or relax `userMessageCount <= 1` condition so the instruction fires on any turn where new files are attached (not just the first-ever turn).

**Also:** Drop `normalizedLastUserContent.length <= 64` — user should get file awareness regardless of prompt length.

**Also:** Consider dropping `requestedAttachmentMode === "explicit"` — if the file is in `effectiveFileIds`, the model should be aware of it regardless of how the attachment was resolved.

**Pros:**
- Deterministic — code-level guarantee, not probabilistic
- Single source of truth
- Works regardless of which skill is active
- No skill file updates needed

**Cons:**
- Overrides paper mode's dialog-first paradigm for the first response
- Requires user to accept that file acknowledgment comes before any stage dialog
- `paperModePrompt` check was added for a reason — removing it may affect other scenarios not tested here

### Option B: Skill-level update (probabilistic, distributed)

**Change:** Update each paper stage skill (`gagasan-skill`, `kerangka-skill`, etc.) to explicitly include attachment handling in "Input Context" and "Guardrails."

**Example addition to `gagasan-skill.md`:**
```markdown
## Input Context
Read the latest user message, **any attached files (shown in File Context section)**, current stage data, recent web search references, and any prior approved stage summaries.

## Attachment Handling
If File Context is present in system messages:
1. First response MUST acknowledge each attached file by name
2. Briefly summarize what the file contains (2-4 sentences per file)
3. Connect the file content to the stage objective (for gagasan: how does this file relate to the research direction?)
4. THEN proceed with stage dialog
```

**Pros:**
- Keeps paper mode's dialog paradigm intact for non-attachment cases
- Skill-level, so it's domain-aware (gagasan handles files differently from kerangka)
- No code changes

**Cons:**
- **Probabilistic** — relies on model following instructions, not deterministic
- Needs to be repeated in every paper stage skill (maintenance burden)
- Doesn't fix the underlying architectural gap
- Skills live in Convex database, so updates require admin action

### Option C: Combined (Option A + Option B)

**Belt and suspenders.** Do both the code fix AND the skill update. Code fix provides deterministic guarantee. Skill update provides domain-appropriate handling for each stage.

**Pros:**
- Deterministic floor (code) + domain-appropriate ceiling (skills)
- Even if future skill updates break the probabilistic path, code guarantee holds
- Aligns with user's prior feedback about "instruction vs deterministic" (memory: feedback_instruction_vs_deterministic.md)

**Cons:**
- More work than either alone
- Two places to maintain

### Recommendation: **Option C (Combined)**

Rationale based on user's stated principles:
1. User's mandate: "attachment awareness must be unconditional" — this strongly suggests deterministic fix (Option A)
2. User's existing memory feedback: "Always state upfront which fixes are deterministic (code) vs probabilistic (instruction). Never imply instruction = certainty." — supports not relying on skill updates alone
3. User's product-centric framing: the goal is user-facing behavior, not just code structure — supports fixing at multiple layers

Option A alone risks breaking paper mode's dialog paradigm in ways we haven't fully mapped. Option B alone is probabilistic. Option C minimizes both risks.

## Open Questions (Need User Decision Before Fix)

1. **Scope of the fix:** Should this fix apply to ALL paper stages, or only `gagasan`? The bug was reported in gagasan, but the `!paperModePrompt` condition affects all stages equally.

2. **`userMessageCount` limit:** Should the "must acknowledge file" instruction fire on EVERY turn where there's an attached file, or only the first turn after a NEW file is attached? The latter is more user-friendly but requires tracking "which files are new since last turn."

3. **Large file handling:** The test file (38928 chars) was truncated to 6000 in paper mode. Should we:
   - (a) Leave truncation as-is (model gets first 6000 chars)
   - (b) Increase the per-file limit for paper mode
   - (c) Add automatic RAG retrieval when a file is truncated (so the model can access the rest via tools)
   - (d) Something else

4. **Skill update authority:** Skills live in Convex database (`stageSkills` table). Who has permission to update them? Does the fix require admin intervention or can Claude Code write skill updates through Convex mutations?

5. **Paper mode "dialog first" philosophy:** The `!paperModePrompt` exclusion exists because someone wanted paper mode to drive dialog-first behavior. Is that philosophy still correct, or should attachment acknowledgment override it? (User mandate says yes, but we should confirm the original design intent isn't being violated by the fix.)

## Files Touched During Investigation (Read-Only)

- `src/app/api/chat/route.ts` — attachment detection, context building, injection
- `src/lib/chat/effective-file-ids.ts` — file ID resolution logic
- `src/lib/ai/paper-mode-prompt.ts` — paper mode prompt assembly
- `src/lib/ai/stage-skill-resolver.ts` — skill loading and resolution
- `src/lib/ai/paper-stages/foundation.ts` — fallback gagasan instructions
- `docs/skill-per-stage/skills/gagasan-skill/SKILL.md` — active gagasan skill content
- `convex/schema.ts` — files and sourceChunks table schemas
- `convex/files.ts` — file query and mutation functions
- `convex/sourceChunks.ts` — RAG retrieval action
- `src/lib/ai/paper-tools.ts` — `quoteFromSource` and `searchAcrossSources` tools
- `src/lib/ai/rag-ingest.ts` — RAG ingestion pipeline

## Summary for User Validation

**What I verified:**
1. File content IS injected into system prompt unconditionally when files exist (Path 1)
2. RAG chunks exist but are only accessed via manual tool calls (Path 2)
3. The "must read file first" directive is EXPLICITLY DISABLED in paper mode at `route.ts:495`
4. The `gagasan-skill` and fallback gagasan instructions actively tell the model "dialog first, don't immediately generate" — and don't mention attachments
5. Turn 1 vs Turn 2 difference is NOT a code branch change — same paths run in both. Turn 2 works because the user's message itself grants permission to deviate

**What is NOT the cause:**
1. Search router decision (NO-SEARCH) — does not gate file context injection
2. RAG retrieval being conditional — file content reaches model via Path 1, not RAG
3. Keyword detection of "dokumen"/"baca" — no such detector exists
4. File extraction failure — extraction succeeded, file content was in the prompt

**The core design conflict:**
- Code always injects file content (unconditional)
- Code explicitly disables "use file first" directive in paper mode
- Skill instructions override any implicit attention to file context with "dialog first" directive
- Result: file content is silently present but silently ignored

**Recommended path forward:** Option C (combined code + skill fix) with 5 open questions for user decision before implementation.

## Next Steps

**No code changes until user validates this report.**

After validation:
1. User decides answers to the 5 open questions
2. Claude Code writes a fix plan based on answers
3. Fix plan gets validated before execution
4. Implementation follows subagent-driven development workflow
