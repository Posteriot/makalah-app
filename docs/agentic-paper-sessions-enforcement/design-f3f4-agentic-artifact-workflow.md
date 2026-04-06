# Design — F3+F4: Agentic Flow + Artifact as Workspace

> Branch: `feature/paper-sessions-enforcement`
> Date: 2026-04-03
> Depends on: F1 (completed), F2 (completed)
> Source: findings.md § F3, § F4

---

## Why combined

F3 (make agent autonomous for review-mode stages) and F4 (direct output to artifact, not chat) are designed as one unit because:

- F3 without F4 → autonomous agent dumps long drafts in chat (worse than current behavior)
- F4 without F3 → artifact-first but agent still asks permission at every step (no improvement)
- Both are instruction-only changes to the same files and same EXPECTED FLOW blocks

---

## Problem

Two intertwined behaviors:

1. **Agent asks permission at every step.** Every stage has "Ask: What do you think?" and "Draft X, then ask for feedback" patterns. Review-mode stages (post-gagasan/topik) should be autonomous: generate draft, present for review, done. No permission loop.

2. **Artifact is created last, not first.** EXPECTED FLOW blocks say "discuss → draft in chat → iterate → save → createArtifact at end." Artifact should be the WORKING DRAFT created early, not a final copy at the end. Versioning via `updateArtifact` (v1 → v2 → v3) already works — instructions just don't direct the model to use it this way.

## What F2 already addressed

F2 changed `paper-mode-prompt.ts:289`:
```
DISCUSS FIRST only for gagasan and topik.
In review-mode stages, draft directly from existing material and present for review.
```

And `paper-mode-prompt.ts:303`:
```
Artifact is the reviewed stage output.
```

These are general rules. But the **per-stage instructions still contradict them** — every EXPECTED FLOW and PROACTIVE COLLABORATION block still says discuss/ask/iterate/save-last. The general rule sets direction, but per-stage instructions are what the model follows turn-by-turn.

---

## Verified current state (post-F2)

### Patterns that must change

**CORE PRINCIPLES "DIALOG-FIRST" patterns** across multiple files — enforce discussion-before-drafting in stages that should be autonomous:
- core.ts:7 — file comment "MAINTAIN DIALOG-FIRST"
- core.ts:410 — metodologi "DIALOG-FIRST APPROACH"
- results.ts:7 — file comment "MAINTAIN DIALOG-FIRST"
- results.ts:26 — hasil "DIALOG-FIRST, DATA FIRST" (keep — needs user data)
- finalization.ts:7 — file comment "MAINTAIN DIALOG-FIRST"
- finalization.ts:51,162,306,431,562 — per-stage "DIALOG-FIRST" entries (keep for interactive stages: lampiran, judul, outline)

**Hardcoded discussion prompts in EXPECTED FLOW** — Indonesian text that enforces discussion loop:
- pembaruan_abstrak:90 — `DISCUSSION: "Ini perubahan yang saya usulkan. Setuju?"`
- lampiran:357 — `DISCUSSION: "Selain ini, ada lagi yang ingin Anda masukkan?"` (keep — interactive)
- judul:491 — `DISCUSSION: "Dari 5 opsi ini, mana yang paling cocok..."` (replace with choice card)
- outline:619 — `DISCUSSION with user: "Ini struktur outline-nya, bagaimana menurut Anda?"` (replace with artifact presentation)

**"Save progress with updateStageData() after discussion is mature"** — general rule in paper-mode-prompt.ts:300. Reinforces discussion-first save timing. Should be mode-aware.

**14 PROACTIVE COLLABORATION blocks** across all stage files — all say "Draft X, then ask for feedback":
- foundation.ts: gagasan (line 48), topik (line 183)
- core.ts: abstrak (line 44), pendahuluan (line 175), tinjauan_literatur (line 308), metodologi (line 430)
- results.ts: hasil (line 48), diskusi (line 175), kesimpulan (line 295)
- finalization.ts: pembaruan_abstrak (line 56), daftar_pustaka (line 192), lampiran (line 325), judul (line 455), outline (line 583)

**14 EXPECTED FLOW blocks** — all end with "Save (updateStageData) + createArtifact" as last step:
- Artifact comes at the end of the flow, after discussion
- No stage says "createArtifact early as v1"

**"Ask: What do you think?" / "ask for feedback"** — 11 occurrences in review-mode stages that should be autonomous.

**`submitStageForValidation() ONLY after user EXPLICITLY confirms`** — universal rule in paper-mode-prompt.ts:306. Should be conditional: discussion stages require explicit confirmation, review-mode stages can auto-present for validation after draft is complete.

**`createArtifact` instruction in general rules** (paper-mode-prompt.ts:303) — still says "Call in the SAME TURN as updateStageData, BEFORE submitStageForValidation." This implies artifact is created at the end alongside save, not early as a working draft.

### Patterns that stay

**gagasan** (Mode 1: Discussion) — permission loop is correct. User must be involved in brainstorming. Keep "ask for feedback" pattern.

**topik** (Mode 2: Derivation) — semi-autonomous. Derive from material, present options, confirm. The "ask for feedback" pattern is appropriate but should be lighter: "present derived topic for confirmation" not "iterate until satisfied."

**tinjauan_literatur** (Mode 4: Deep Search) — autonomous search + generate. After search completes, generate literature review directly to artifact. Present for review, not discussion.

---

## Design

### Behavioral model per stage mode

| Mode | Flow | Artifact timing | Permission |
|------|------|-----------------|------------|
| Mode 1 (Discussion) | Discuss → iterate → draft → artifact + save + submit to validation panel | End (after agreement) | User approves via PaperValidationPanel. No chat-based explicit confirmation — model auto-submits when artifact is created. |
| Mode 2 (Derivation) | Derive from material → present options → confirm → artifact + save | End (after confirmation) | Light confirmation (not iteration loop) |
| Mode 3 (Review) | Analyze material → present approach via choice card (if creative decision exists) → generate to artifact → present for validation | **Early** (v1 working draft) | Auto-present for validation. User approves via validation panel. |
| Mode 4 (Deep Search) | Search → analyze results → present approach via choice card → generate to artifact → present for validation | **Early** (after search + generate) | Auto-present for validation. |

### 3-tier agency model for post-gagasan stages

Not all review-mode stages have the same level of creative decision. The agent's behavior differs by tier:

| Tier | Stages | Agent behavior |
|------|--------|----------------|
| **Intelligent choice** | abstrak, pendahuluan, tinjauan_literatur, metodologi | Analyze material → present 2-3 reasoned approaches via choice card with recommendation → user picks → generate to artifact |
| **Direct generate** | diskusi, kesimpulan, pembaruan_abstrak, daftar_pustaka | Generate directly to artifact. No meaningful creative fork — output is determined by data. Present for validation. |
| **Agent-led interactive** | hasil, lampiran, judul, outline | Needs user input but agent LEADS by proposing structure/options first via choice card. User provides data into agent-proposed framework or validates agent-proposed items. Artifact created after user input. |

The model is an **intelligent author with opinions**, not a content generator. In every tier, the agent thinks first and proposes — user validates.

- **Intelligent choice:** Agent analyzes, presents reasoned approaches, user picks. Creative fork exists.
- **Direct generate:** Output data-determined. Agent executes, user validates artifact.
- **Agent-led interactive:** User input required, but agent proposes the structure/framework first. Agent leads, user fills in or validates. Examples:
  - hasil: agent proposes data-input schema based on metodologi, user provides data
  - lampiran: agent proposes appendix items based on metodologi+hasil, user validates/adds
  - outline: agent generates full outline, user validates direction
  - topik: agent derives options from gagasan, user confirms via choice card

### Key instruction changes

**1. General rules (paper-mode-prompt.ts)**

Current:
```
- MUST create artifact with createArtifact() for agreed stage output.
  Call in the SAME TURN as updateStageData, BEFORE submitStageForValidation.
```

Target:
```
- ARTIFACT WORKFLOW:
  - Discussion stages (gagasan, topik): createArtifact AFTER discussion is mature and content is agreed.
  - Review stages (all others): createArtifact EARLY as v1 working draft. Use updateArtifact for revisions (v2, v3...).
  - Call updateStageData in the SAME TURN as createArtifact/updateArtifact.
  - Chat should contain brief commentary + pointer to artifact, NOT the full draft text.
```

Current:
```
- submitStageForValidation() ONLY after user EXPLICITLY confirms satisfaction
```

Target:
```
- submitStageForValidation():
  - Discussion stages (gagasan, topik): ONLY after user EXPLICITLY confirms satisfaction.
  - Review stages (all others): Present for validation after v1 artifact is created. User approves or requests revision via the validation panel.
```

**2. Per-stage EXPECTED FLOW blocks — review-mode stages**

Current pattern (all review-mode stages):
```
Discuss with user
      ↓
Draft X
      ↓
Ask: "What do you think?"
      ↓
[Iterate until satisfied]
      ↓
Save (updateStageData) + createArtifact
      ↓
Submit after user is satisfied
```

Target pattern:
```
Review approved material from previous stages
      ↓
Generate complete draft from existing material
      ↓
createArtifact as v1 working draft + updateStageData
      ↓
Present artifact for review: brief summary of what was generated + pointer to artifact
      ↓
submitStageForValidation()
      ↓
If user requests revision → updateArtifact (v2) + updateStageData
```

**3. Per-stage PROACTIVE COLLABORATION blocks — review-mode stages**

Current: "Draft X directly, then ask for feedback"

Target: "Generate X directly to artifact as v1. Present for review — do not ask 'what do you think?' or iterate in chat. User reviews in artifact panel."

**4. PROACTIVE COLLABORATION blocks — discussion stages**

- **gagasan (Mode 1):** Keep full collaborative pattern for brainstorming. Change: after artifact is created, call `submitStageForValidation()` in the same turn — user approves via PaperValidationPanel, not via chat confirmation. This prevents the model from getting stuck between "user hasn't confirmed" and "can't make a validation card."
- **topik (Mode 2):** Keep collaborative but lighter. Replace iteration loop with "derive options, present for confirmation." Not full autonomy, not full discussion loop — semi-autonomous derivation.

**5. OUTPUT headers**

Some stages say "OUTPUT (draft AFTER discussion):" or "OUTPUT (AFTER mature discussion):". Review-mode stages should drop the "AFTER discussion" qualifier since they generate autonomously.

---

## Scope boundary — what F3+F4 does NOT change

1. **Tool schemas** — `createArtifact`, `updateArtifact`, `updateStageData`, `submitStageForValidation` stay unchanged. Infrastructure is ready.
2. **Backend logic** — no route.ts changes, no schema changes, no Convex mutations.
3. **formatStageData.ts** — F1 already made this artifact-based. No changes needed.
4. **Search behavior** — F2 already handled. F3+F4 only changes flow and artifact timing.
5. **Validation panel** — stays as-is. User clicks Approve/Revise.
6. **Choice card requirement** — stays. "EVERY response MUST end with a yaml-spec interactive card" still applies. The card content changes (from "What do you think?" options to "Review artifact / Request revision / Approve" options).
7. **F1 safety nets** — `nextAction` in `updateStageData` return (paper-tools.ts:210-212) and `missingArtifactNote` in route.ts:2168-2173 remain as fallback safety nets. They fire when model skips artifact creation — still valid behavior under F3+F4 since they catch non-compliant model behavior.
8. **F2 SEARCH TURN CONTRACT** — stays at paper-mode-prompt.ts:294-297. No conflict with F3+F4: search compose is a separate turn from artifact generation (web search and function tools cannot run in same turn).
9. **F2 STAGE MODES** — line 289 ("In review-mode stages, draft directly from existing material and present for review") stays unchanged. F3+F4 adds implementation detail via per-stage instructions, not by modifying this line.

---

## Files changed

| File | Type | Changes |
|------|------|---------|
| `src/lib/ai/paper-mode-prompt.ts` | Instruction | Rewrite artifact workflow rule + submitStageForValidation rule |
| `src/lib/ai/paper-stages/core.ts` | Instruction | Rewrite EXPECTED FLOW + PROACTIVE COLLABORATION for abstrak, pendahuluan, tinjauan_literatur, metodologi |
| `src/lib/ai/paper-stages/results.ts` | Instruction | Rewrite EXPECTED FLOW + PROACTIVE COLLABORATION for hasil, diskusi, kesimpulan |
| `src/lib/ai/paper-stages/finalization.ts` | Instruction | Rewrite EXPECTED FLOW + PROACTIVE COLLABORATION for pembaruan_abstrak, daftar_pustaka, lampiran, judul, outline |
| `src/lib/ai/paper-stages/foundation.ts` | Instruction | Topik: lighter confirmation pattern (not full iteration loop). Gagasan: no change. |

No code logic changes. All instruction rewrites inside template literal strings.

---

## Risk

1. **Model compliance — over-autonomy:** Model might skip presenting for review and just auto-submit without user seeing the artifact. Mitigation: `submitStageForValidation` still requires the validation panel flow — model can present for validation, but user must click Approve.
2. **Model compliance — under-autonomy:** Model might still ask "what do you think?" out of training bias despite instructions. Mitigation: strong negative instruction ("Do NOT ask for feedback in review-mode stages. Present artifact and submit for validation.").
3. **Chat becomes too empty:** If agent generates everything to artifact, chat has very little content. Mitigation: instruct agent to include brief summary of what was generated + key decisions, just not the full draft text.
4. **Revision loop unclear:** When user requests revision via validation panel, agent should updateArtifact (v2). Need clear instruction for this flow.
5. **Outline and hasil are special:** Outline needs user input on structure. Hasil needs user's actual data. These review-mode stages can't be fully autonomous. Mitigation: keep some discussion for these but still create artifact early.
