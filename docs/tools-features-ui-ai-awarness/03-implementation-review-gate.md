# Implementation Review Gate: AI Model Awareness Patches

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`
Plan: `02-design-implementation-plan.md` v2 (Codex-approved)
Status: **Implementation complete — ready for review**

---

## Execution Summary

All 9 phases from the approved plan have been executed. 7 phases produced file changes, 2 phases were verification-only (no changes needed). Three minor deviations were identified and documented below (1 during initial implementation, 2 post-review fixes).

**Total files changed:** 20
- 1 system prompt file
- 14 stage skill files
- 1 paper-mode-prompt.ts
- 1 route.ts
- 1 choice-yaml-prompt.ts
- 2 verification-only (paper-tools.ts, choice-yaml-prompt.ts post-patch)

---

## Phase-by-Phase Implementation

### Phase 4: Fix readArtifact language policy in route.ts ✅

**File:** `src/app/api/chat/route.ts`
**Changes:**
- Lines 1892-1901: Translated readArtifact tool `description` from Indonesian to English
- Line 1904: Translated `.describe()` string from `"ID artifact yang ingin dibaca."` to `"The artifact ID to read."`
- Line 1908: Translated error message from `"artifactId tidak boleh kosong."` to `"artifactId must not be empty."` (deviation — see below)

**Verification:** Re-read lines 1891-1908 to confirm all model-facing text is now English.

### Phase 1: Patch system-prompt.md with UI awareness ✅

**File:** `.references/system-prompt-skills-active/updated-4/system-prompt.md`
**Changes:**
- Added `## USER INTERFACE AWARENESS` section after ARTIFACT GUIDELINES (after line 88)
- Three subsections: ARTIFACT PANEL, SOURCE PANEL, PROCESSING INDICATORS
- Normalized existing citation wording (line 114) from "inline citation [1], [2] to function" to "citation markers like [1], [2] to render as clickable host-links" — resolves internal contradiction with new SOURCE PANEL section
- Updated line 88 from "side panel" to "artifact panel" for consistency with new section
- ~155 words / ~210 tokens

**Verification:** Re-read lines 85-115 to confirm correct placement and content accuracy.

### Phase 2A: Add readArtifact to 14 skill files ✅

**Files:** All 14 files in `.references/system-prompt-skills-active/updated-4/` (01 through 14)
**Changes:** Added readArtifact as last Allowed item in Function Tools section of each file.
**Verification:** `grep -c readArtifact` across all 14 files — exactly 1 occurrence per file, 14 total.

### Phase 2B: Add exact source tools to 5 skill files ✅

**Files:**
- `01-gagasan-skill.md` — active search variant (3 tools with "after web search" context)
- `06-tinjauan-literatur-skill.md` — active search variant
- `05-pendahuluan-skill.md` — source-referencing variant (3 tools with "from earlier stages" context)
- `09-diskusi-skill.md` — source-referencing variant
- `12-daftar-pustaka-skill.md` — source-referencing variant

**Changes:** Added inspectSourceDocument, quoteFromSource, searchAcrossSources after compileDaftarPustaka in Allowed list.
**Verification:** `grep -c inspectSourceDocument` — exactly 5 files, matching plan targets.

### Phase 3: Patch paper-mode-prompt.ts ✅

**File:** `src/lib/ai/paper-mode-prompt.ts`
**Changes:** Appended PAPER VALIDATION PANEL awareness block (3 bullet points) to the prompt template literal, between APA citation rules and `${stageInstructions}` injection point. All text in English — UI button labels described generically as "approve and revise buttons" without quoting Indonesian label text.
**Verification:** Re-read lines 388-396 to confirm correct placement and English-only content.

### Phase 5A: Add compileDaftarPustaka preview guidance to 4 skills ✅

**Files:**
- `06-tinjauan-literatur-skill.md` — added to Guardrails section
- `08-hasil-skill.md` — added to Guardrails section
- `09-diskusi-skill.md` — added to Guardrails section
- `11-pembaruan-abstrak-skill.md` — added to Guardrails section

**Changes:** Added "Proactive bibliography check" guidance line.
**Verification:** `grep -c "Proactive bibliography check"` — exactly 4 files.

### Phase 5B: Patch choice-yaml-prompt.ts for ChoiceTextarea ✅

**File:** `src/lib/json-render/choice-yaml-prompt.ts`
**Changes:** Added ChoiceTextarea awareness rule after "Option IDs should be kebab-case and descriptive" in RULES section.
**Verification:** Re-read lines 107-109 to confirm correct placement.

### Phase 6: Verify paper-tools.ts consistency ✅

**File:** `src/lib/ai/paper-tools.ts` — VERIFY ONLY, no edits.
**Findings:**
- inspectSourceDocument (line 544): "exact source document... Do not use for semantic search" — **consistent** with stage instructions "verify exact source metadata"
- quoteFromSource (line 632): "semantic chunks... relevant passage" — **consistent** with stage instructions "retrieve relevant passages"
- searchAcrossSources (line 676): "finding relevant passages across multiple references" — **consistent** with stage instructions "semantic search across all stored sources"

**Result:** No contradictions found. No edits needed.

### Phase 7: Verify choice-yaml-prompt.ts consistency ✅

**File:** `src/lib/json-render/choice-yaml-prompt.ts` — VERIFY post-Phase 5B.
**Findings:**
- Hard boundary (lines 126-136) "PaperValidationPanel exists for stage approval" — **consistent** with Phase 3 addition
- Phase 3 "Do NOT ask would you like to approve or revise" — **reinforces** hard boundary
- Phase 5B ChoiceTextarea — documents existing YAML template behavior, **consistent** with existing spec

**Result:** No contradictions found.

---

## File Inventory

### Instruction layer (reference files — to deploy to DB)

| File | Change type | Lines affected |
|------|------------|---------------|
| `system-prompt.md` | ADD section + edit line 88 | +18 lines (UI awareness section), 1 line edit ("side panel" → "artifact panel") |
| `01-gagasan-skill.md` | ADD 4 items to Allowed | +4 lines (3 exact source + 1 readArtifact) |
| `02-topik-skill.md` | ADD 1 item to Allowed | +1 line (readArtifact) |
| `03-outline-skill.md` | ADD 1 item to Allowed | +1 line (readArtifact) |
| `04-abstrak-skill.md` | ADD 1 item to Allowed | +1 line (readArtifact) |
| `05-pendahuluan-skill.md` | ADD 4 items to Allowed | +4 lines (3 exact source + 1 readArtifact) |
| `06-tinjauan-literatur-skill.md` | ADD 4 items to Allowed + 1 guardrail | +5 lines |
| `07-metodologi-skill.md` | ADD 1 item to Allowed | +1 line (readArtifact) |
| `08-hasil-skill.md` | ADD 1 item + 1 guardrail | +2 lines |
| `09-diskusi-skill.md` | ADD 4 items to Allowed + 1 guardrail | +5 lines |
| `10-kesimpulan-skill.md` | ADD 1 item to Allowed | +1 line (readArtifact) |
| `11-pembaruan-abstrak-skill.md` | ADD 1 item + 1 guardrail | +2 lines |
| `12-daftar-pustaka-skill.md` | ADD 4 items to Allowed | +4 lines (3 exact source + 1 readArtifact) |
| `13-lampiran-skill.md` | ADD 1 item to Allowed | +1 line (readArtifact) |
| `14-judul-skill.md` | ADD 1 item to Allowed | +1 line (readArtifact) |

### Code layer

| File | Change type | Lines affected |
|------|------------|---------------|
| `src/app/api/chat/route.ts` | EDIT | Lines 1892-1908: description + .describe() + error message translated to English |
| `src/lib/ai/paper-mode-prompt.ts` | ADD | Lines 391-394: PaperValidationPanel awareness block (3 bullets) |
| `src/lib/json-render/choice-yaml-prompt.ts` | ADD | Line 108: ChoiceTextarea awareness rule |
| `src/lib/ai/paper-tools.ts` | VERIFY ONLY | No changes — consistency confirmed |

---

## Verification Evidence

| Check | Result |
|-------|--------|
| readArtifact in 14 skill files | ✅ grep confirms 14 occurrences across 14 files |
| inspectSourceDocument in 5 skill files | ✅ grep confirms 5 occurrences across 5 files (01, 05, 06, 09, 12) |
| Proactive bibliography check in 4 skill files | ✅ grep confirms 4 occurrences across 4 files (06, 08, 09, 11) |
| readArtifact description in route.ts is English | ✅ re-read lines 1892-1904 — no Indonesian text |
| readArtifact .describe() in route.ts is English | ✅ line 1904: "The artifact ID to read." |
| readArtifact error message in route.ts is English | ✅ line 1908: "artifactId must not be empty." |
| system-prompt.md has UI AWARENESS section | ✅ lines 90-106 |
| paper-mode-prompt.ts has PAPER VALIDATION PANEL | ✅ lines 391-394 |
| choice-yaml-prompt.ts has ChoiceTextarea rule | ✅ line 108 |
| paper-tools.ts consistency with stage instructions | ✅ all 3 tools verified — no contradictions |
| choice-yaml-prompt.ts consistency post-patch | ✅ hard boundary + new rule — no contradictions |
| No Indonesian in new model-facing instructions | ✅ all additions in English (post-review: removed quoted Indonesian UI labels from paper-mode-prompt patch) |
| No instruction references ReasoningTracePanel in output | ✅ "awareness-only" tag in PROCESSING INDICATORS |
| Artifact edit caveat present | ✅ "for editable artifacts in the original conversation" in system prompt |

---

## Deviations from Plan

### Deviation 1: Additional error message translation in route.ts (minor, within scope)

**Plan said:** Translate readArtifact `description` and `.describe()` from Indonesian to English.
**Actual:** Also translated the error message at line 1908 from `"artifactId tidak boleh kosong."` to `"artifactId must not be empty."`.
**Reason:** This is model-facing text (the model reads tool error responses to understand what went wrong). Leaving it in Indonesian while translating description and .describe() would be inconsistent with MODEL INSTRUCTION LANGUAGE POLICY.
**Risk:** None — error message is text-only, no logic change.

### Deviation 2: Removed Indonesian UI labels from paper-mode-prompt patch (post-review fix)

**Plan said:** PaperValidationPanel awareness text includes `"Setujui & Lanjutkan" (approve)` and `"Revisi" (revise)`.
**Actual:** Changed to `approve and revise buttons` without quoting Indonesian labels.
**Reason:** Codex review identified this as a language policy violation — model-facing instructions must be full English. Quoting Indonesian UI labels in a system prompt constitutes Indonesian in model-facing instructions.
**Risk:** None — the model does not need to know the exact Indonesian button text to understand the validation panel flow.

### Deviation 3: Normalized existing citation wording in system-prompt.md (post-review fix)

**Plan said:** Only add new UI AWARENESS section; existing SOURCES AND CITATIONS section unchanged.
**Actual:** Also edited line 114 from `"inline citation [1], [2] to function in the artifact viewer"` to `"citation markers like [1], [2] to render as clickable host-links in the artifact viewer"`.
**Reason:** Codex review identified an internal contradiction — new section says citations render as host-links, old section says they "function" as [1], [2] in the viewer. Normalizing the old wording resolves the contradiction.
**Risk:** None — the old wording was vague ("to function"), the new wording is more accurate to actual rendering behavior.

---

## Risks / Open Questions

1. **System prompt token budget:** The UI AWARENESS section adds ~210 tokens. This is within the revised estimate but should be monitored if the system prompt grows further in future branches.
2. **Exact source tools adoption:** The model may not immediately use inspectSourceDocument/quoteFromSource/searchAcrossSources proactively even with instructions, since it was trained without them in skills. Monitor via telemetry whether tool usage increases after deploy.
3. **compileDaftarPustaka preview over-use:** The "Consider calling" phrasing is suggestive, not mandatory. If model over-audits, change to "when you have reason to believe references may be inconsistent."

---

## Ready for Review

All patches are applied. Verification evidence is documented above. No unresolved blockers.

**Next steps:**
1. Codex reviews this report + diffs
2. If approved: user deploys instruction layer to dev DB (wary-ferret-59)
3. Test in dev environment
4. If passing: deploy to prod DB (basic-oriole-337)

---

## Diff / Evidence Pointers

To review all changes at once:

```bash
# Instruction layer changes (reference files)
git diff -- ".references/system-prompt-skills-active/updated-4/"

# Code layer changes
git diff -- "src/app/api/chat/route.ts" "src/lib/ai/paper-mode-prompt.ts" "src/lib/json-render/choice-yaml-prompt.ts"
```

Individual file verification:
- `system-prompt.md` lines 88-106: UI AWARENESS section
- `route.ts` lines 1891-1908: readArtifact English translation
- `paper-mode-prompt.ts` lines 391-394: PaperValidationPanel awareness
- `choice-yaml-prompt.ts` line 108: ChoiceTextarea rule
- Any skill file, Function Tools > Allowed section: readArtifact (all 14) and exact source tools (5 of 14)
- Skill files 06, 08, 09, 11 Guardrails section: compileDaftarPustaka preview guidance
