# Context: Verified Codebase State — Paper Sessions Enforcement

> Branch: `feature/paper-sessions-enforcement`
> Audited: 2026-04-03
> Method: Factual verification against live codebase, not git history assumptions

---

## 1. Tool Inventory — What the AI Model Can Actually Do

8 tools defined in `paper-tools.ts` (paper-specific):

| Tool | Location | Purpose |
|------|----------|---------|
| `startPaperSession` | paper-tools.ts:44 | Initialize session |
| `getCurrentPaperState` | paper-tools.ts:80 | Fetch session status |
| `updateStageData` | paper-tools.ts:101 | Save stage fields (ringkasan REQUIRED) |
| `compileDaftarPustaka` | paper-tools.ts:245 | Bibliography compilation |
| `submitStageForValidation` | paper-tools.ts:382 | Submit for user approval |
| `inspectSourceDocument` | paper-tools.ts:416 | Query indexed sources |
| `quoteFromSource` | paper-tools.ts:504 | Search within source |
| `searchAcrossSources` | paper-tools.ts:548 | Semantic search across sources |

2 tools defined in `route.ts` (artifact-specific):

| Tool | Location | Purpose |
|------|----------|---------|
| `createArtifact` | route.ts:1400 | Create NEW artifact for stage output |
| `updateArtifact` | route.ts:1554 | Update existing artifact (new version) |

**Key fact:** `createArtifact` and `updateArtifact` exist and work. They are NOT in paper-tools.ts but are injected in route.ts alongside paper tools. Both are available to the model during paper sessions.

---

## 2. Instruction Architecture — What Governs Model Behavior

### System-wide rules (paper-mode-prompt.ts:278-300)

```
GENERAL RULES:
- DISCUSS FIRST before drafting — do not immediately generate full output     ← CHAT-FIRST enforced
- EVERY response MUST end with a yaml-spec interactive card                   ← CHOICE CARD mandatory
- After discussion is mature, write full paper content                        ← DRAFT comes AFTER discussion
- MUST create artifact with createArtifact() for agreed stage output          ← ARTIFACT = FINAL OUTPUT
- submitStageForValidation() ONLY after user EXPLICITLY confirms satisfaction ← PERMISSION required
```

### Per-stage instructions (paper-stages/*.ts)

Every stage has identical structure:
1. PROACTIVE COLLABORATION (MANDATORY) block — "Draft X directly, then ask for feedback"
2. EXPECTED FLOW — linear: discuss → draft → ask → iterate → save → submit
3. WEB SEARCH block — how to trigger search
4. FUNCTION TOOLS — which tools to call
5. RINGKASAN REQUIRED warning
6. HARD PROHIBITIONS

**Pattern across ALL 14 stages:** Draft → "Ask: What do you think?" → Wait → Iterate → Save

### Where search is instructed

| Stage | Search instruction | Actual behavior |
|-------|-------------------|-----------------|
| gagasan | "request a web search for literature exploration" | Semi-optional |
| topik | "request a web search for more specific literature" (foundation.ts:219) | Semi-optional |
| pendahuluan | "Request a web search if additional supporting data is needed" | Semi-optional |
| tinjauan_literatur | "Request a web search for deeper literature exploration" (core.ts:362) | Semi-optional |
| metodologi | No explicit search instruction in flow | Passive |
| hasil → kesimpulan | No explicit search or passive | Passive |
| finalization stages | No explicit search or passive | Passive |

**All search instructions use the same pattern.** No differentiation between "dual search", "academic-only", or "no search" modes.

---

## 3. Ringkasan Pipeline — Current Data Flow

### Writing path (model → DB)

```
Model generates ringkasan (280 chars) + ringkasanDetail (1000 chars)
    ↓
updateStageData tool (paper-tools.ts:147)
    - ringkasan: z.string().max(280)         ← REQUIRED by Zod schema
    - ringkasanDetail: z.string().max(1000)  ← optional
    - data: z.record()                       ← optional additional fields
    ↓
Merged into stageData[currentStage] in Convex DB
```

### Guard path (submission)

```
submitForValidation (paperSessions.ts:979)
    ↓
Guard 1 (line 996): ringkasan must exist and not be empty   ← BLOCKS without ringkasan
    ↓
Guard 2 (line 1007): artifactId must exist                  ← BLOCKS without artifact
    ↓
Set stageStatus = "pending_validation"
```

### Reading path (DB → model context)

```
formatStageData.ts builds context for completed stages
    ↓
formatRingkasanTahapSelesai (line 177): reads data.ringkasan + data.ringkasanDetail
    ↓
Per-stage formatters (15+ occurrences): data.ringkasan → "Summary: ..."
    ↓
Injected into system prompt as completed stage context
```

```
paper-mode-prompt.ts calls formatArtifactSummaries() at line 239
    ↓
formatArtifactSummaries() defined at formatStageData.ts:761: artifactId, version, title, truncated content (500 chars)
    ↓
Injected ALONGSIDE ringkasan context (both present, redundant)
```

**Current state: ringkasan AND artifact summaries are both injected. Redundant.**

---

## 4. Task Derivation — How Progress Is Tracked

### Derivation mechanism

```
task-derivation.ts:155 — deriveTaskList(stageId, stageData)
    ↓
Checks predefined fields per stage:
    gagasan: [referensiAwal, ideKasar, analisis, angle]
    topik: [definitif, angleSpesifik, argumentasiKebaruan, researchGap, referensiPendukung]
    ... (each stage has its own field list)
    ↓
isFieldComplete(data, field) → "complete" or "pending"
    ↓
Returns TaskSummaryData
```

### Rendering

```
MessageBubble.tsx:255 — useMemo triggers on stageData change
    ↓
deriveTaskList(messageStage, stageData)
    ↓
UnifiedProcessCard.tsx renders tasks
    - NO currentStage prop (uses taskSummary.stageId internally)
    - Status: only "complete" or "pending"
```

**No mechanism to derive progress from chat content.** Only explicit `updateStageData()` calls update task progress.

---

## 5. Artifact Infrastructure

### Schema (convex/schema.ts)

- `version: v.number()` — version counter
- `parentId: v.optional(v.id("artifacts"))` — links to previous version

### Backend operations (convex/artifacts.ts)

- `create()` — version: 1, parentId: undefined
- `update()` — newVersion = oldArtifact.version + 1, parentId = old artifactId
- `getVersionHistory()` — traverses parentId chain

### Auto-link in createArtifact tool (route.ts:1520-1534)

After creating artifact, tool auto-patches stageData with `artifactId` (route.ts:1523-1535):
```typescript
await fetchMutation(api.paperSessions.updateStageData, {
    sessionId, data: { artifactId: newArtifactId }
})
```

### Artifact reminder in route.ts:2203-2206

If stage is "drafting", no artifact exists, and save/submit intent detected:
```
⚠️ ARTIFACT NOT YET CREATED for this stage. You MUST call createArtifact()...
```

**Versioning infrastructure is complete. Tools exist. But instructions drive chat-first workflow.**

---

## 6. Choice Card — Known Open Issue

`compile-choice-spec.ts:125-145`:
- `disabled: false` hardcoded on all option buttons
- No logic to disable after user confirms selection
- Confirmed still open — cards remain interactive post-confirmation

---

## 7. Problems Identified — Ready for Design Decomposition

### P1: Permission Loop (all stages post-gagasan)

**Where:** paper-mode-prompt.ts:284, 297; all stage EXPECTED FLOW blocks
**What:** "DISCUSS FIRST", "ONLY after user EXPLICITLY confirms", "Ask: What do you think?"
**Impact:** Agent cannot generate drafts autonomously. Every step requires user confirmation.
**Root cause:** System-wide rules and per-stage flows both enforce discuss-before-draft.

### P2: Chat-First Drafting

**Where:** paper-mode-prompt.ts:284 ("DISCUSS FIRST before drafting"), per-stage EXPECTED FLOW
**What:** Instructions say discuss in chat → draft in chat → create artifact at end
**Impact:** Long drafts in chat window. Artifact is just a copy of what was already in chat.
**Root cause:** Instructions + flow design. Artifact tools exist but are instructed as final-step-only.

### P3: Redundant Ringkasan

**Where:** paper-tools.ts:147 (required), paperSessions.ts:996 (guard), formatStageData.ts (15+ reads)
**What:** Model must generate artifact content + ringkasan + ringkasanDetail per stage
**Impact:** ~300-400 extra tokens per stage. Double work. Redundant with artifact content.
**Root cause:** ringkasan was designed before artifact system existed. Never refactored.

### P4: Uniform Stage Pattern

**Where:** All paper-stages/*.ts files
**What:** Every stage uses identical pattern: discuss → optional search → draft → ask → save
**Impact:** Topik has search instructions (should be derivation-only). Post-topik stages ask for discussion (should be review-mode). No stage differentiation.
**Root cause:** Stage instructions were templated from a single pattern, never specialized.

### P5: Task Progress Blind to Chat

**Where:** task-derivation.ts (field-only), MessageBubble.tsx (stageData-only trigger)
**What:** Task cards only update when `updateStageData()` is explicitly called
**Impact:** User discusses for 10 turns, task card shows no progress until model saves
**Root cause:** No mechanism to infer progress from conversation state

### P6: Choice Card Stays Interactive

**Where:** compile-choice-spec.ts:125-145
**What:** `disabled: false` hardcoded, no post-confirmation disable logic
**Impact:** User can re-click choices after confirmation, potentially causing state confusion
**Root cause:** Missing disable-after-submit implementation

---

## 8. Files Map

### Instruction layer (what to change for P1, P2, P4)
- `src/lib/ai/paper-mode-prompt.ts` — system-wide rules
- `src/lib/ai/paper-stages/foundation.ts` — gagasan + topik
- `src/lib/ai/paper-stages/core.ts` — abstrak, pendahuluan, tinjauan_literatur, metodologi
- `src/lib/ai/paper-stages/results.ts` — hasil, diskusi, kesimpulan
- `src/lib/ai/paper-stages/finalization.ts` — pembaruan_abstrak, daftar_pustaka, lampiran, judul

### Data layer (what to change for P3, P5)
- `src/lib/ai/paper-tools.ts` — updateStageData schema (ringkasan required)
- `convex/paperSessions.ts` — submitForValidation guards
- `src/lib/ai/paper-stages/formatStageData.ts` — stage context builder (ringkasan reads)
- `src/lib/paper/task-derivation.ts` — task progress derivation
- `src/lib/paper/stage-types.ts` — TypeScript type definitions

### UI layer (what to change for P6)
- `src/lib/json-render/compile-choice-spec.ts` — choice card builder
- `src/components/chat/json-renderer/components/ChoiceOptionButton.tsx` — button component
- `src/components/chat/UnifiedProcessCard.tsx` — task progress card
- `src/components/chat/MessageBubble.tsx` — task derivation trigger

### Backend layer
- `convex/artifacts.ts` — artifact CRUD + versioning
- `src/app/api/chat/route.ts` — createArtifact/updateArtifact tools, artifact reminder
