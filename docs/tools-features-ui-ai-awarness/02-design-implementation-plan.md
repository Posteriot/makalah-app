# Design & Implementation Plan: AI Model Awareness Patches

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`
Based on: `01-research-report.md` v2 (Codex-approved)
Revision: v2 (post-audit by Codex)

---

## Design Decisions (answers to report questions)

### Q1: Exact source tools — which skill files?

**Decision:** Add to 5 skill files where source verification matters, not all 14.

- `01-gagasan-skill.md` — active search stage, needs source verification
- `05-pendahuluan-skill.md` — cites sources for background claims
- `06-tinjauan-literatur-skill.md` — heaviest search stage, full guidance
- `09-diskusi-skill.md` — cross-references findings with literature
- `12-daftar-pustaka-skill.md` — verifies sources before compiling

Rationale: Other stages (topik, outline, abstrak, metodologi, hasil, kesimpulan, pembaruan_abstrak, lampiran, judul) do not directly handle source verification. Adding tools there would be noise. The web-search-quality SKILL.md still covers ad-hoc usage when its injection condition is met.

### Q2: readArtifact — which skill files?

**Decision:** Add to all 14 skill files.

Rationale: Every stage may need to reference a previous stage's artifact content. The injected artifact summaries are truncated ("Context compression active: max 5 refs, max 5 citations, detailed summary only for last 3 completed stages"). readArtifact is the only way to get full content from older stages. The instruction is a single line — negligible prompt bloat.

### Q3: Duplicate SKILL.md guidance or reference it?

**Decision:** Do NOT duplicate the full VERBATIM QUOTING TOOLS section from web-search-quality/SKILL.md. Instead, add concise stage-level instructions that describe WHEN to use each tool, with one-line descriptions. The detailed HOW (exact input format, edge cases) lives in the tool descriptions and SKILL.md.

Rationale: Stage skills should tell the model "use inspectSourceDocument to verify source quality before citing" — not repeat the full parameter docs. This avoids duplication drift.

### Q4: Process/status UI awareness — system prompt or paper-mode-prompt?

**Decision:** System prompt.

Rationale: Processing indicators (UnifiedProcessCard, thinking loader, ToolStateIndicator) appear in ALL conversations, not just paper sessions. The behavioral adjustment ("do not narrate what UI already shows") applies universally. Paper-mode-prompt would miss non-paper chat.

### Q5: Artifact tab/editor — actively mention or adjust behavior?

**Decision:** Adjust behavior, do not actively promote.

The model should know tabs and inline editor exist so it can:
- Say "review in the artifact panel" (not "review in the side panel") — acknowledges panel
- Not repeat small changes in chat when user can see diff in editor
- Reference "the previous artifact tab" when multiple artifacts exist

The model should NOT proactively say "you can edit the artifact directly" unless user asks how to make changes. The updateArtifact tool remains the primary revision path.

Note: Inline editing is only available for editable artifacts in the original conversation context. Artifacts viewed from other conversations show a read-only banner. The model does not need to know this distinction — it only uses updateArtifact anyway.

### Q6: Dirty state warning — model awareness needed?

**Decision:** No additional awareness needed.

The existing `DIRTY CONTEXT: true/false` injection in paper-mode-prompt.ts already handles this. The model has explicit instructions for when DIRTY CONTEXT = true. Adding UI-level dirty state warning awareness would be redundant.

### Q7: Where does each instruction belong?

| Instruction | Layer | Rationale |
|-------------|-------|-----------|
| Process/status UI awareness | system-prompt.md | Always active, all conversations |
| Artifact system enrichment (tabs, editor boundary) | system-prompt.md | Always active, artifacts exist outside paper mode |
| Source panel (verification, citation rendering) | system-prompt.md | Always active when sources exist |
| Exact source tools (inspect/quote/search) | Stage skill files (5 files) | Only relevant during specific paper stages |
| readArtifact | Stage skill files (all 14) | Only relevant during paper mode |
| PaperValidationPanel enrichment | paper-mode-prompt.ts | Only relevant during paper mode, already has validation context |
| compileDaftarPustaka preview guidance | Stage skill files (targeted) | Stage-specific behavioral addition |
| ChoiceTextarea custom input awareness | choice-yaml-prompt.ts | Part of choice card visual language system |
| readArtifact language fix | route.ts code | Code-level policy compliance |

### Q8: How to avoid prompt bloat?

Three constraints:
1. System prompt additions: compress to ~150 words (roughly 200 tokens). Every sentence must earn its place.
2. Per-skill tool additions capped at ~80 tokens (3-5 lines per tool block)
3. paper-mode-prompt additions capped at ~60 tokens (2-3 lines)

### Q9: "AWARENESS-ONLY" designation?

**Decision:** Yes, for ReasoningTracePanel only.

The model should know the user sees a reasoning timeline but should NOT reference it in output ("as you can see in my reasoning trace..."). All other UI awareness items have a behavioral adjustment attached. ReasoningTracePanel is pure observability — the model cannot control it and should not mention it. This designation is reflected in the system prompt patch text.

---

## Implementation Plan

### Phase 1: System Prompt Patch (system-prompt.md)

**Goal:** G4 (reduce redundant narration), G5 (artifact system), G6 (source system)

**Location:** After the existing `ARTIFACT GUIDELINES` section (after line 88), add new section:

```
## USER INTERFACE AWARENESS

The user's interface shows real-time feedback alongside your chat responses. Adjust your output to complement what they see — do not duplicate it.

ARTIFACT PANEL:
- Artifacts open in a tabbed side panel — users switch between artifacts from different stages via tabs.
- Users can edit artifact content directly in the panel (for editable artifacts in the original conversation) and can copy or export via a toolbar.
- After creating or updating an artifact, direct the user to review it in the artifact panel. Do NOT repeat artifact content in chat.
- For revisions, always use the updateArtifact tool. Only mention direct editing if the user asks how to make changes themselves.

SOURCE PANEL:
- Users see a source panel showing: title, site name, favicon, publication date, and verification status (verified_content, unverified_link, or unavailable).
- In artifacts, citation markers like [1] render as clickable host-links (e.g., example.com) that open the source. Do NOT explain what each citation links to unless asked.

PROCESSING INDICATORS (awareness-only — do not reference in output):
- Users see real-time tool execution status, a reasoning timeline, a thinking animation, and task progress indicators.
- Do NOT narrate processing steps. Avoid "I am now creating the artifact", "processing your request", "please wait". The UI shows this. Focus chat text on content and decisions.
```

**Word count:** ~155 words. **Token estimate:** ~210 tokens.

### Phase 2: Stage Skill Patches (14 skill files)

**Goal:** G1 (exact source tools), G2 (readArtifact)

#### 2A: readArtifact — add to ALL 14 skill files

**Location:** In each skill's `## Function Tools > Allowed:` list, add as last allowed item:

```
- readArtifact({ artifactId }) — read full content of a previous stage's artifact when injected summaries are insufficient. Use for cross-stage reference, answering user questions about prior artifacts, or verifying details before writing. Artifact IDs are available from stage data context.
```

**Files:** 01 through 14, all skill files.

#### 2B: Exact source tools — add to 5 skill files

**Location:** In each skill's `## Function Tools > Allowed:` list, add after compileDaftarPustaka:

For `01-gagasan-skill.md` and `06-tinjauan-literatur-skill.md` (active search stages):
```
- inspectSourceDocument({ sourceId }) — verify exact source metadata (title, author, date) and paragraph content before citing. Use after web search to confirm source quality.
- quoteFromSource({ sourceId, query }) — retrieve relevant passages from a specific stored source. Use when user asks for a quote or when you need a supporting passage.
- searchAcrossSources({ query }) — semantic search across all stored sources in this conversation. Use to find evidence for a claim across multiple references.
```

For `05-pendahuluan-skill.md`, `09-diskusi-skill.md`, and `12-daftar-pustaka-skill.md` (source-referencing stages):
```
- inspectSourceDocument({ sourceId }) — verify exact source metadata before citing. Use when referencing stored sources from earlier stages.
- quoteFromSource({ sourceId, query }) — retrieve relevant passages from a specific stored source.
- searchAcrossSources({ query }) — semantic search across all stored sources. Use to find cross-reference evidence.
```

The difference: active search stages get "after web search" context. Source-referencing stages get "from earlier stages" context.

### Phase 3: Paper-Mode-Prompt Patch (paper-mode-prompt.ts)

**Goal:** G7 partial (PaperValidationPanel awareness)

**Location:** Append to the prompt string returned by `getPaperModeSystemPrompt()` in `src/lib/ai/paper-mode-prompt.ts`, inside the template literal at line 338 (before the closing backtick). This keeps it within the single paper-mode system message that is injected via `route.ts:792`.

**Patch text to append:**

```
PAPER VALIDATION PANEL:
- After submitStageForValidation, the user sees a panel with "Setujui & Lanjutkan" (approve) and "Revisi" (revise) buttons.
- If user clicks "Revisi", they type feedback in a dedicated textarea. This feedback arrives as their next chat message.
- Do NOT ask "would you like to approve or revise?" — the panel already presents this choice.
```

**Token estimate:** ~55 tokens.

### Phase 4: Code-Level Fix (route.ts)

**Goal:** G3 (language policy violation)

**Location:** `src/app/api/chat/route.ts` lines 1891-1904

**Change:** Translate readArtifact tool description and inputSchema `.describe()` from Indonesian to English:

Current (Indonesian):
```
description: `Baca isi lengkap sebuah artifact berdasarkan ID-nya. Gunakan tool ini jika perlu merujuk konten artifact secara utuh (bukan hanya summary singkat di system prompt).

USE THIS TOOL WHEN:
✓ Perlu membaca ulang artifact dari stage sebelumnya sebagai rujukan
✓ User bertanya tentang isi spesifik sebuah artifact
✓ Perlu mengecek konten lengkap sebelum menulis revisi atau stage berikutnya
✓ Perlu memverifikasi detail yang mungkin ter-truncate di summary

Tool ini mengembalikan: title, type, version, content lengkap, dan sources (jika ada).
Artifact ID bisa didapat dari ARTIFACT SUMMARY di system prompt atau dari getCurrentPaperState().`
```

New (English):
```
description: `Read the full content of an artifact by its ID. Use this tool when you need to reference complete artifact content rather than the truncated summaries in the system prompt.

USE THIS TOOL WHEN:
✓ You need to re-read a previous stage's artifact as reference material
✓ The user asks about specific content within an artifact
✓ You need to check full content before writing a revision or the next stage
✓ You need to verify details that may be truncated in the artifact summary

Returns: title, type, version, full content, and sources (if any).
Artifact IDs are available from ARTIFACT SUMMARY in the system prompt or from getCurrentPaperState().`
```

Also fix `.describe()` on line 1903-1904:
- Current: `"ID artifact yang ingin dibaca."`
- New: `"The artifact ID to read."`

### Phase 5: G7 Remaining — compileDaftarPustaka Preview Guidance + ChoiceTextarea Awareness

**Goal:** G7 (optimize partially-aware features — remaining items)

#### 5A: compileDaftarPustaka proactive preview guidance

**Location:** Add one line to `## Guardrails` section in 4 skill files where cross-stage reference audit is most valuable:
- `06-tinjauan-literatur-skill.md` — heavy citation stage
- `08-hasil-skill.md` — references from methodology and literature
- `09-diskusi-skill.md` — cross-references multiple prior stages
- `11-pembaruan-abstrak-skill.md` — revises abstract against all stages

**Patch text:**
```
Proactive bibliography check: Consider calling compileDaftarPustaka({ mode: "preview" }) to audit reference consistency before finalizing this stage's artifact, especially when citing sources from multiple prior stages.
```

#### 5B: ChoiceTextarea custom input awareness

**Location:** In `src/lib/json-render/choice-yaml-prompt.ts`, add to the RULES section (after the existing bullet about state):

**Patch text:**
```
- The ChoiceTextarea field allows users to type a custom response instead of selecting a predefined option. The submitted customText is delivered alongside the selectedOptionId. If a choice card benefits from a free-text alternative (e.g., "suggest your own topic"), include a ChoiceTextarea element and reference its value in the submit action via { "$state": "/selection/customText" }.
```

### Phase 6: Code-Level Verify (paper-tools.ts)

**Goal:** G8 (zero contradictions)

**Action:** Verify that tool descriptions for inspectSourceDocument (line 542), quoteFromSource (line 630), and searchAcrossSources (line 674) do not contradict the stage-level instructions added in Phase 2.

Specific checks:
- inspectSourceDocument description says "Do not use this tool for semantic search or relevance matching" — stage instructions must not suggest using it for semantic search ✓ (stage instructions say "verify exact source metadata")
- quoteFromSource description says semantic chunk search — stage instructions must not frame it as exact paragraph lookup ✓ (stage instructions say "retrieve relevant passages")
- searchAcrossSources description says "finding relevant passages" — stage instructions say "semantic search" ✓ (consistent)

**Expected outcome:** No edits needed. Document verification result.

### Phase 7: Verify choice-yaml-prompt.ts consistency

**Goal:** G8 (zero contradictions)

**Action:** Verify that CHOICE_YAML_SYSTEM_PROMPT does not contradict any new instructions after Phase 5B addition. Specific checks:
- Hard boundary rule ("NEVER create a choice card that offers approve/validasi") consistent with PaperValidationPanel awareness in Phase 3 ✓
- ChoiceTextarea addition in Phase 5B consistent with existing state/submit structure ✓

**Expected outcome:** No contradictions beyond the Phase 5B addition itself.

---

## Execution Order

| Step | Phase | Files | Dependencies |
|------|-------|-------|-------------|
| 1 | Phase 4 | route.ts | None — language fix, independent |
| 2 | Phase 1 | system-prompt.md | None — independent |
| 3 | Phase 2A | 14 skill files (readArtifact) | None — independent |
| 4 | Phase 2B | 5 skill files (exact source tools) | None — independent |
| 5 | Phase 3 | paper-mode-prompt.ts | None — independent |
| 6 | Phase 5A | 4 skill files (compileDaftarPustaka preview) | None — independent |
| 7 | Phase 5B | choice-yaml-prompt.ts | None — independent |
| 8 | Phase 6 | paper-tools.ts | After steps 3-4 — verify consistency |
| 9 | Phase 7 | choice-yaml-prompt.ts | After step 7 — verify consistency |

Steps 1-7 are independent and can be executed in parallel.
Steps 8-9 are verification-only and depend on patches being applied first.

---

## Verification Checklist

After all patches applied:

- [ ] `system-prompt.md` has USER INTERFACE AWARENESS section (~210 tokens, ~155 words)
- [ ] All 14 skill files have readArtifact in Allowed tools list
- [ ] 5 skill files (01, 05, 06, 09, 12) have exact source tools in Allowed list
- [ ] 4 skill files (06, 08, 09, 11) have compileDaftarPustaka preview guidance in Guardrails
- [ ] `choice-yaml-prompt.ts` has ChoiceTextarea custom input awareness in RULES
- [ ] `route.ts` readArtifact description is fully English — no Indonesian model-facing text
- [ ] `route.ts` readArtifact `.describe()` is English
- [ ] `paper-mode-prompt.ts` appends PaperValidationPanel awareness to paper mode prompt string
- [ ] `paper-tools.ts` tool descriptions do not contradict stage-level instructions
- [ ] `choice-yaml-prompt.ts` hard boundary rule consistent with PaperValidationPanel awareness
- [ ] No new instructions written in Indonesian (language policy)
- [ ] System prompt patch text accurately describes UI behavior (tabs, host-link citations, verification status)
- [ ] No instruction tells model to actively reference ReasoningTracePanel or processing indicators in output
- [ ] Artifact edit awareness includes "for editable artifacts in original conversation" caveat

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| System prompt bloat degrades model attention | Low — ~210 tokens | Compressed wording, every sentence earns its place |
| Exact source tool instructions cause model to over-use inspect/quote | Medium | Instructions say "use after web search" / "use when referencing stored sources" — not "always use" |
| readArtifact in all 14 skills causes unnecessary tool calls | Low | Instruction says "when injected summaries are insufficient" — conditional |
| PaperValidationPanel awareness causes model to stop explaining validation flow | Low | Instruction says "do NOT ask would you like to approve" — still directs user to panel |
| Language fix in route.ts breaks tool behavior | None — description-only change | Only text changes, no logic change |
| compileDaftarPustaka preview guidance causes over-auditing | Low | Guidance says "consider calling" — suggestive, not mandatory |
| ChoiceTextarea awareness causes model to always add free-text field | Low | Guidance says "if a choice card benefits from" — conditional |
