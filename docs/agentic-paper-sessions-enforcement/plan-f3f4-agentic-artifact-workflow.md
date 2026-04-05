# Implementation Plan — F3+F4: Agentic Flow + Artifact as Workspace

> Branch: `feature/paper-sessions-enforcement`
> Date: 2026-04-03
> Design: `design-f3f4-agentic-artifact-workflow.md`
> Depends on: F1 (completed), F2 (completed)

---

## Execution Order

All changes are instruction rewrites inside template literal strings. No TypeScript logic changes. Steps are ordered for coherence: general rules first, then per-stage.

---

### Step 1: General rules — artifact workflow + submit policy

**Goal:** Replace the artifact-at-end and universal-permission rules with mode-aware versions.

**File:** `src/lib/ai/paper-mode-prompt.ts`

**Change 1 — Artifact workflow rule (line 303):**

Find:
```
- MUST create artifact with createArtifact() for agreed stage output. Call in the SAME TURN as updateStageData, BEFORE submitStageForValidation. Include 'sources' from AVAILABLE_WEB_SOURCES if available. Artifact is the reviewed stage output.
```

Replace with:
```
- ARTIFACT WORKFLOW:
  - Discussion stages (gagasan, topik): createArtifact AFTER discussion is mature and content is agreed. Call in the SAME TURN as updateStageData.
  - Review stages (all others): createArtifact EARLY as v1 working draft in the SAME TURN as updateStageData. Use updateArtifact for revisions (v2, v3...). Chat should contain brief summary + pointer to artifact, NOT the full draft text repeated in chat.
  - Include 'sources' from AVAILABLE_WEB_SOURCES if available.
```

**Change 2 — Submit policy (line 306):**

Find:
```
- submitStageForValidation() ONLY after user EXPLICITLY confirms satisfaction
```

Replace with:
```
- submitStageForValidation():
  - Discussion stages (gagasan, topik): ONLY after user EXPLICITLY confirms satisfaction.
  - Review stages (all others): Present for validation IMMEDIATELY after v1 artifact is created. User approves or requests revision via the validation panel. Do NOT wait for explicit chat confirmation.
```

**Change 3 — Update "After discussion is mature" general rule (line 291):**

Find:
```
- After discussion is mature, write full paper content for the active stage based on agreed context
```

Replace with:
```
- Discussion stages: write full paper content AFTER discussion is mature. Review stages: generate content IMMEDIATELY from approved material and create artifact as v1 working draft.
```

**Change 4 — Update "Save progress" general rule (line 300):**

Find:
```
- Save progress with updateStageData() after discussion is mature
```

Replace with:
```
- Save progress with updateStageData() — in discussion stages: after discussion is mature; in review stages: in the SAME TURN as createArtifact (v1 generation)
```

**Verification:**
- `npx tsc --noEmit` — must pass
- Read full GENERAL RULES block to verify coherence with F2's STAGE MODES and SEARCH TURN CONTRACT

---

### Step 2: Review-mode stages — EXPECTED FLOW + PROACTIVE COLLABORATION rewrites

**Goal:** Replace discuss-iterate-save-last pattern with generate-artifact-present-for-review pattern in all review-mode stages.

This is the core of F3+F4. All changes are template literal string rewrites.

#### 2a. `core.ts` — abstrak (Tier: Intelligent Choice)

**PROACTIVE COLLABORATION (line 44-50):**

Find:
```
- Do NOT just ask questions without providing recommendations or options
- Draft an initial abstract directly, then ask for feedback — don't wait for user to write it
- Offer 3-5 keyword options with a RECOMMENDATION for which are most appropriate
- The user is a PARTNER, not the sole decision maker — you also have a voice
```

Replace with:
```
- Analyze Phase 1 data, then present 2-3 abstract framing approaches via choice card with your RECOMMENDATION and reasoning
- After user picks approach, generate the abstract DIRECTLY to artifact as v1 working draft
- Include 3-5 keyword options in the artifact
- Present the artifact for review — do NOT ask "what do you think?" or iterate in chat
- The user approves or requests revision via the validation panel
```

**EXPECTED FLOW (lines 72-84):**

Find:
```
Review Phase 1 data (Gagasan & Topik)
      ↓
Draft initial abstract (combining background, gap, objectives, & projected results)
      ↓
Ask: "What do you think of the summary? Does it represent the core of our idea?"
      ↓
Discuss keywords (offer 3-5 options)
      ↓
[Iterate until user is satisfied]
      ↓
Save 'Abstrak' (updateStageData) + createArtifact
      ↓
If user is satisfied → submitStageForValidation()
```

Replace with:
```
Review Phase 1 data (Gagasan & Topik)
      ↓
Analyze material and present 2-3 framing approaches via choice card (with recommendation)
      ↓
User picks approach via choice card
      ↓
Generate complete abstract (background, gap, objectives, projected results + keywords) based on chosen approach
      ↓
createArtifact as v1 working draft + updateStageData
      ↓
Present brief summary in chat + pointer to artifact
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

**OUTPUT header (line 87):**

Find: `OUTPUT 'ABSTRAK' (draft AFTER discussion):`
Replace with: `OUTPUT 'ABSTRAK':`

**Remove monologue prohibition (line 118):**

Find: `- ❌ Do NOT monologue — ask for feedback on every draft`
Replace with: `- ❌ Do NOT dump full draft text in chat — generate to artifact instead`

#### 2b. `core.ts` — pendahuluan (Tier: Intelligent Choice)

**PROACTIVE COLLABORATION (lines 175-180):**

Replace "Draft problem formulation and research objectives, then ask for feedback" with:
"Analyze material, then present 2-3 narrative approaches for pendahuluan via choice card with your RECOMMENDATION and reasoning. After user picks, generate DIRECTLY to artifact as v1."

**EXPECTED FLOW (lines 200-211):**

Replace with:
```
Review approved material from gagasan, topik, and previous stages
      ↓
Analyze and present 2-3 narrative approaches via choice card (e.g., inverted pyramid vs historical progression vs problem-first)
      ↓
User picks approach via choice card
      ↓
Generate complete Pendahuluan (Background, Problem, Gap, Objectives) with citations from existing material
      ↓
createArtifact as v1 working draft + updateStageData
      ↓
Present brief summary in chat + pointer to artifact
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

**OUTPUT header (line 214):**

Find: `OUTPUT 'PENDAHULUAN' (AFTER discussion):`
Replace with: `OUTPUT 'PENDAHULUAN':`

#### 2c. `core.ts` — tinjauan_literatur (Tier: Intelligent Choice)

**PROACTIVE COLLABORATION (lines 308-314):**

Replace "Propose a theoretical framework and key theories, then ask for feedback" with:
"After search completes, analyze literature and present 2-3 theoretical framework options via choice card with your RECOMMENDATION. After user picks, generate review DIRECTLY to artifact as v1."

**EXPECTED FLOW (lines 334-346):**

Replace with:
```
Compile references from Phase 1
      ↓
Proactively request deep academic search when literature is still incomplete
      ↓
Present the actual literature findings from that search
      ↓
Analyze literature and present 2-3 framework/synthesis approaches via choice card (with recommendation)
      ↓
User picks approach via choice card
      ↓
Generate complete Tinjauan Literatur (theoretical framework, review, gap analysis) based on chosen approach
      ↓
createArtifact as v1 working draft + updateStageData
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

#### 2d. `core.ts` — metodologi (Tier: Intelligent Choice)

**CORE PRINCIPLES (line 410):**

Find: `1. DIALOG-FIRST APPROACH` and the sub-items "Do NOT immediately create tables or method lists" / "Recommend an approach... first, get user input" / "Ask: Where do you plan to collect data from?"

Replace with: `1. INTELLIGENT CHOICE — ARTIFACT-FIRST` and sub-items: "Analyze research direction, present methodology options via choice card with recommendation. After user picks, generate to artifact as v1."

**PROACTIVE COLLABORATION (lines 430-435):**

Replace "Recommend a research approach with justification, then ask for feedback" with:
"Analyze research direction, then present 2-3 methodology approaches via choice card (e.g., qualitative/quantitative/mixed) with your RECOMMENDATION and justification. After user picks, generate DIRECTLY to artifact as v1."

**EXPECTED FLOW (lines 456-467):**

Replace with:
```
Review research gap & objectives from previous stages
      ↓
Analyze and present 2-3 methodology approaches via choice card (with recommendation + justification)
      ↓
User picks approach via choice card
      ↓
Generate complete Methodology (approach, design, data collection, analysis, ethics) based on chosen approach
      ↓
createArtifact as v1 working draft + updateStageData
      ↓
Present brief summary in chat + pointer to artifact
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

#### 2e. `results.ts` — hasil (Tier: Agent-led data capture)

**Note:** Hasil needs user's actual data/findings — but the agent should LEAD the data capture, not passively wait. Agent proposes data structure, input format, and presentation options first. User provides data into agent-proposed framework.

**CORE PRINCIPLES (line 26):**

Find: `1. DIALOG-FIRST, DATA FIRST`
Replace with: `1. AGENT-LED DATA CAPTURE, THEN ARTIFACT`

**File-level doc comment (line 7):**

Find: `Focus: MAINTAIN DIALOG-FIRST, utilize Phase 1-2 data.`
Replace with: `Focus: Agent-led artifact-first workflow, utilize Phase 1-2 data.`

**PROACTIVE COLLABORATION (lines 48-54):**

Replace "After user provides data, propose the best presentation method with reasoning" with:
"Based on metodologi (research design, data collection method), proactively propose a data-input structure via choice card: what findings are expected, what format fits best (narrative/tabular/mixed), what categories to organize by. User provides data into agent-proposed framework. Then generate to artifact as v1."

**EXPECTED FLOW (lines 76-88):**

Replace with:
```
Review Metodologi (research design, data collection, analysis techniques)
      ↓
Propose data-input structure via choice card: expected finding categories, presentation format options (narrative/tabular/mixed), with RECOMMENDATION
      ↓
User provides actual data/findings into agent-proposed structure
      ↓
Generate complete Results (organized by problem formulation) from user data
      ↓
createArtifact as v1 working draft + updateStageData
      ↓
Present brief summary in chat + pointer to artifact
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

#### 2f. `results.ts` — diskusi (Tier: Direct Generate)

No creative fork — interpretation is determined by data (hasil) and literature (tinjauan literatur).

**PROACTIVE COLLABORATION (lines 175-180):**

Replace "Propose finding interpretations and literature comparisons, then ask for feedback" with:
"Generate discussion DIRECTLY to artifact as v1 working draft. Cross-reference findings with tinjauan literatur. Present artifact for validation — no choice card decision point needed."

**EXPECTED FLOW (lines 200-213):**

Replace with:
```
Review Hasil + Tinjauan Literatur
      ↓
Generate complete Discussion (interpretations, literature comparison, implications, limitations)
      ↓
createArtifact as v1 working draft + updateStageData
      ↓
Present brief summary in chat (key interpretations + implications) + pointer to artifact
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

#### 2g. `results.ts` — kesimpulan (Tier: Direct Generate)

Pure synthesis from hasil+diskusi. No creative fork.

**PROACTIVE COLLABORATION (lines 295-301):**

Replace "Propose a results summary and answers to problem formulations, then ask for feedback" with:
"Generate conclusion DIRECTLY to artifact as v1 working draft. Map answers 1:1 to problem formulation. Present artifact for validation — no choice card decision point needed."

**EXPECTED FLOW (lines 321-331):**

Replace with:
```
Review Hasil + Diskusi
      ↓
Generate complete Conclusion (summary, answers to problem formulation, suggestions)
      ↓
createArtifact as v1 working draft + updateStageData
      ↓
Present brief summary in chat (key conclusions + suggestions) + pointer to artifact
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

#### 2h. `finalization.ts` — all 5 stages (Mode 3)

Apply the same pattern to pembaruan_abstrak, daftar_pustaka, lampiran, judul, outline.

**CORE PRINCIPLES — DIALOG-FIRST lines to update:**

Each finalization stage has a CORE PRINCIPLES entry that says "DIALOG-FIRST: ..." — these must be updated for autonomous stages:
- pembaruan_abstrak (line 51): Change "DIALOG-FIRST: Discuss changes before finalizing" → "REVIEW MODE: Generate updated abstract from actual data, present for review."
- daftar_pustaka (line 162): Change "DIALOG-FIRST: Review compilation results with user before finalizing" → "REVIEW MODE: Compile bibliography and present for review."
- lampiran (line 306): Change "DIALOG-FIRST: Ask user what needs to go in the appendix before drafting" → "AGENT-LED: Propose appendix items based on Metodologi and Hasil, present via choice card for user validation."
- judul (line 431): KEEP "DIALOG-FIRST: Discuss title style preferences with user" — judul already uses choice card pattern (5 options).
- outline (line 562): Change "DIALOG-FIRST: Preview the outline with user before finalizing" → "AGENT-LED: Generate full outline from approved material, present as artifact for directional validation via choice card."

**PROACTIVE COLLABORATION:** Replace "then ask for feedback" with "generate DIRECTLY to artifact as v1 working draft. Present artifact for review." (for pembaruan_abstrak and daftar_pustaka). Keep collaborative pattern for lampiran, judul, outline.

**EXPECTED FLOW:** Replace discuss-iterate-save-last pattern with artifact-first pattern for pembaruan_abstrak and daftar_pustaka:
```
Review approved material from previous stages
      ↓
Generate complete [stage content]
      ↓
createArtifact as v1 working draft + updateStageData (or compileDaftarPustaka for daftar_pustaka)
      ↓
Present brief summary in chat + pointer to artifact
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

**EXPECTED FLOW — remove hardcoded discussion prompts in autonomous stages:**

These explicit discussion lines must be removed from pembaruan_abstrak:
- pembaruan_abstrak:90 — Remove `DISCUSSION: "Ini perubahan yang saya usulkan. Setuju?"` and the `[Iterate if needed]` step

**EXPECTED FLOW — agent-led interactive stages (lampiran, judul, outline):**

These stages need user input but agent should LEAD by proposing first:

- lampiran: Agent analyzes Metodologi (instruments, questionnaires) and Hasil (additional data) → proposes appendix items via choice card with recommendation → user validates/adds → generate to artifact as v1. Remove `DISCUSSION: "Selain ini, ada lagi yang ingin Anda masukkan?"` (line 357) — replace with choice card that includes "Add custom item" option.
- judul: Already agent-led (5 options via choice card). Remove `DISCUSSION: "Dari 5 opsi ini..."` (line 491) — choice card already covers this. Keep as-is otherwise.
- outline: Agent generates full outline from approved material → createArtifact as v1 → present via choice card with options for structural changes (reorder, add/remove sections). User validates direction, NOT structure from scratch. Remove `DISCUSSION with user: "Ini struktur outline-nya, bagaimana menurut Anda?"` (line 619) — replace with artifact + directional choice card.

**Special cases:**
- **daftar_pustaka:** Keep `compileDaftarPustaka({ mode: "persist" })` in the flow. Artifact creation follows compilation.
- **File-level doc comment (line 7):** "Focus: MAINTAIN DIALOG-FIRST" — change to "Focus: artifact-first for autonomous stages, dialog for interactive stages"

#### 2i. `foundation.ts` — topik (Mode 2: Derivation)

**PROACTIVE COLLABORATION (lines 183-198):**

Replace "Always offer 2-3 title/angle options with a RECOMMENDATION" with:
"Derive 2-3 topic options from gagasan material. Present via YAML choice card with your RECOMMENDATION as the highlighted default. User confirms by selecting — not by extended discussion."

**EXPECTED FLOW:**

Find: `[Iterate until topic direction is agreed upon]`
Replace with: `Present derived options via choice card with recommendation as default`

Find: `Confirm with user`
Replace with: `User confirms topic direction via choice card selection`

Find: `If user is satisfied → submitStageForValidation()`
Replace with: `After user confirms via choice card → createArtifact + updateStageData → submitStageForValidation()`

**foundation.ts — gagasan:** Discussion pattern kept for brainstorming. One change: after artifact is created, model must call `submitStageForValidation()` in the same turn. User approves via PaperValidationPanel, not via chat. This was changed in patch `695ffd39` after Test 2 showed model consistently skipping submit when relying on chat-based explicit confirmation.

**Verification for all of Step 2:**
- `npx tsc --noEmit` — must pass
- Grep for "ask for feedback" in review-mode stages — should only appear in gagasan (foundation.ts)
- Grep for "What do you think" — should only appear in gagasan (foundation.ts)
- Grep for "createArtifact as v1" — should appear in all review-mode stage EXPECTED FLOW blocks
- Grep for "AFTER discussion" in OUTPUT headers — should only appear in gagasan and topik

---

### Step 3: Per-stage submit instructions

**Goal:** Update per-stage `submitStageForValidation` instructions to match the new flow.

**Current pattern in FUNCTION TOOLS sections:**
```
- submitStageForValidation() — ONLY after user EXPLICITLY confirms satisfaction
```
or
```
- submitStageForValidation()
```

**Target for review-mode stages:**
```
- submitStageForValidation() — present for validation after v1 artifact is created
```

**Target for discussion stages (gagasan, topik):**
Keep: `- submitStageForValidation() — ONLY after user EXPLICITLY confirms satisfaction`

Check each stage file's FUNCTION TOOLS section and update accordingly.

Currently only gagasan (foundation.ts:124) has the "ONLY after user EXPLICITLY confirms" pattern. Topik does not have it — ADD it to topik's FUNCTION TOOLS section. All other stages just list the tool without qualification — these should get the review-mode qualification ("present for validation after v1 artifact is created").

**Verification:**
- Grep for "ONLY after user EXPLICITLY confirms" — should appear in gagasan AND topik (both in foundation.ts)
- Grep for "present for validation after v1" — should appear in all review-mode stages

---

### Step 4: Regression verification

**Goal:** Verify all changes work together.

**Automated:**
- `npx vitest run` — all tests must pass
- `npx tsc --noEmit` — clean

**Grep checks:**
- "ask for feedback" in paper-stages → only in gagasan
- "What do you think" in paper-stages → only in gagasan
- "createArtifact as v1" → in all review-mode EXPECTED FLOW blocks
- "AFTER discussion" → only in gagasan/topik OUTPUT headers
- "ONLY after user EXPLICITLY confirms" → only in gagasan/topik (both in foundation.ts)
- "DIALOG-FIRST" in paper-stages → only in stages that genuinely need user input (lampiran, judul, outline, hasil). Should NOT appear in autonomous stages (abstrak, pendahuluan, tinjauan_literatur, metodologi, diskusi, kesimpulan, pembaruan_abstrak, daftar_pustaka)
- "DISCUSSION:" with hardcoded Indonesian prompts → only in lampiran (genuinely needs user input). Removed from pembaruan_abstrak. Replaced in judul (→ choice card) and outline (→ artifact presentation).
- "after discussion is mature" in paper-mode-prompt.ts → should be mode-aware, not universal

---

## Files changed — complete list

| # | File | Step | Type |
|---|------|------|------|
| 1 | `src/lib/ai/paper-mode-prompt.ts` | 1 | Instruction |
| 2 | `src/lib/ai/paper-stages/core.ts` | 2a-2d, 3 | Instruction |
| 3 | `src/lib/ai/paper-stages/results.ts` | 2e-2g, 3 | Instruction |
| 4 | `src/lib/ai/paper-stages/finalization.ts` | 2h, 3 | Instruction |
| 5 | `src/lib/ai/paper-stages/foundation.ts` | 2i, 3 | Instruction |

No code logic changes. All template literal string rewrites.

## Commit strategy

1. `feat(f3f4): rewrite general rules for artifact-first workflow and conditional submit`
2. `feat(f3f4): rewrite per-stage flows for agentic artifact-first pattern`

Step 2+3 can be one commit since they touch the same files and are tightly related.
