# Research Report: AI Model Awareness of Tools, Features & UI

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`
Phase: Deep research — findings, questions, files, goals
Revision: v2 (post-audit by Codex)

---

## 1. Problems to Solve

The MOKA model has **information asymmetry** with its own runtime environment. It only knows what its instructions (system prompt + skill files + tool descriptions + injected context) tell it. Four categories of gaps exist, plus adjacent observations:

### 1A. Exact source tools: missing from paper system prompt + 14 stage skill files

Three exact source tools are defined in `paper-tools.ts`, provisioned in `route.ts`, and documented in `web-search-quality/SKILL.md:195-208` (VERBATIM QUOTING TOOLS section). However, they are **not mentioned in `system-prompt.md` or any of the 14 stage skill files** that govern paper-writing behavior.

This means: the model receives guidance for these tools only when the web-search-quality skill is injected (via `composeSkillInstructions` when recent sources exist). During paper-writing stages, where exact source verification is most critical, the model has **no stage-level instruction** for when and how to use them.

| Tool | What it does | Existing guidance location |
|------|-------------|--------------------------|
| `inspectSourceDocument` | Inspect exact source metadata (title, author, date, siteName) + exact paragraph lookup | `SKILL.md:199-206`, `paper-tools.ts:542-544` |
| `quoteFromSource` | Semantic chunk search within a single source for relevant passages | `SKILL.md:208` (brief mention), `paper-tools.ts:630-632` |
| `searchAcrossSources` | Semantic cross-source retrieval across all conversation sources | `paper-tools.ts:674-676` |

**Gap:** Stage skill files (01-14) do not list these tools in their Function Tools section. Model cannot use them proactively during paper stages unless web-search-quality skill happens to be injected.

### 1B. readArtifact: partial placement, not absence

`readArtifact` is defined in `route.ts:1891-1901` with detailed behavioral guidance ("USE THIS TOOL WHEN" with 4 use cases). It is also referenced in completed-stage instructions (`paper-stages/index.ts:93-100`) for informational follow-ups and revision requests.

**Gap:** readArtifact is not mentioned in the 14 stage skill files' Function Tools sections. During active paper-writing stages (not completed), the model may not know it can use readArtifact for cross-stage reference — it relies only on injected artifact summaries, which are truncated.

**Additional issue:** readArtifact's tool description in `route.ts:1892-1904` is written in Indonesian, violating the MODEL INSTRUCTION LANGUAGE POLICY in CLAUDE.md. This requires a code edit.

### 1C. UI components the user sees but the model does not know about

The user sees real-time feedback through multiple UI components. The model is unaware of most of these:

| Component | What user sees | Awareness status |
|-----------|---------------|-----------------|
| UnifiedProcessCard | Task summary, search status, tool state (real-time) | **NOT AWARE** — model narrates processing steps user already sees |
| ChatProcessStatusBar | Current operation status bar | **NOT AWARE** — model says "sedang memproses..." redundantly |
| ToolStateIndicator | Per-tool execution state (pending/running/result/error) | **NOT AWARE** — model may narrate tool outcomes user already saw |
| ReasoningTracePanel | Timeline of reasoning steps with status | **NOT AWARE** — model unaware user sees its thinking process |
| Thinking loader (above chat input) | Loading/thinking indicator | **NOT AWARE** — model unaware user knows it's processing |
| ArtifactTabs | Multi-tab interface for multiple artifacts | **NOT AWARE** — model says "artifact is in the side panel" without tab context |
| SourcesPanel verification status | verified_content / unverified_link / unavailable per source | **NOT AWARE** — model unaware user can see source reliability |
| InlineCitationChip clickability | Citations [1], [2] are clickable, open source details | **NOT AWARE** — model explains citation links when user can just click |

### 1D. Partially aware features that need optimization

| Feature | What model already knows | What's missing |
|---------|------------------------|----------------|
| Artifact capabilities | `system-prompt.md:62` says "edit, copy, or export" | Tabbed interface detail, behavioral boundary (when to suggest direct edit vs updateArtifact tool) |
| PaperValidationPanel | Authority boundary for approve/revise is well-documented | Dirty state warning specifics, revision textarea as dedicated input |
| Source-body parity | Rule is documented | User sees verification status — model can reference this |
| compileDaftarPustaka (preview) | Mentioned in every skill as allowed | No guidance on when to proactively use it cross-stage |
| Choice card ChoiceTextarea | Exists in YAML spec | Not documented as a user interaction path for custom input |

### Adjacent observations (outside current 6-category scope)

- **PaperStageProgress** (visual 14-stage progress bar): referenced in `paper-workflow-reminder.ts:46` ("PaperStageProgress UI appears"). Not in the 6 audit categories defined in SCOPE.md. Noting for potential future work.

---

## 2. Questions to Answer

### Tools
1. Should exact source tools (inspect/quote/search) be mentioned in ALL 14 skill files, or only in search-active stages (gagasan, tinjauan_literatur) and stages that reference sources heavily (diskusi, daftar_pustaka)?
2. Should readArtifact be added to all 14 skill files or only stages where cross-stage reference is most needed (pembaruan_abstrak, diskusi, daftar_pustaka)?
3. The web-search-quality SKILL.md already has detailed guidance — should stage skills duplicate this or reference it?

### UI Awareness
4. Should process/status UI awareness (UnifiedProcessCard, thinking loader) be in the system prompt (always active) or paper-mode-prompt (paper sessions only)?
5. For artifact tab/editor awareness — should the model actively mention these capabilities to the user, or just know they exist and adjust behavior?
6. Does dirty state warning need model awareness, or is it handled sufficiently by existing DIRTY CONTEXT injection?

### Architecture
7. Where does each awareness instruction belong — system prompt, paper-mode-prompt.ts, skill files, or tool descriptions?
8. How to add awareness without bloating the system prompt to the point of attention dilution?
9. Should there be an explicit "AWARENESS-ONLY" designation for features the model should know about but NOT reference in output (e.g., ReasoningTracePanel)?

---

## 3. Files to Change

### Instruction layer (reference files — deploy to DB)

| File | Change type | What changes |
|------|------------|-------------|
| `system-prompt.md` | ADD section | UI awareness block: artifact system (tabs detail, behavioral boundary), source panel (verification status, clickable citations), processing indicators (reduce redundant narration) |
| `01-gagasan-skill.md` | ADD to Function Tools | Exact source tools instructions (inspect/quote/search) + readArtifact |
| `02-topik-skill.md` | ADD to Function Tools | readArtifact instruction |
| `03-outline-skill.md` | ADD to Function Tools | readArtifact instruction |
| `04-abstrak-skill.md` | ADD to Function Tools | readArtifact instruction |
| `05-pendahuluan-skill.md` | ADD to Function Tools | Exact source tools + readArtifact |
| `06-tinjauan-literatur-skill.md` | ADD to Function Tools | Exact source tools (full, this is the heaviest search stage) + readArtifact |
| `07-metodologi-skill.md` | ADD to Function Tools | readArtifact instruction |
| `08-hasil-skill.md` | ADD to Function Tools | readArtifact instruction |
| `09-diskusi-skill.md` | ADD to Function Tools | Exact source tools (cross-referencing literature) + readArtifact |
| `10-kesimpulan-skill.md` | ADD to Function Tools | readArtifact instruction |
| `11-pembaruan-abstrak-skill.md` | ADD to Function Tools | readArtifact instruction (cross-stage reference critical here) |
| `12-daftar-pustaka-skill.md` | ADD to Function Tools | Exact source tools (verify sources before compiling) + readArtifact |
| `13-lampiran-skill.md` | ADD to Function Tools | readArtifact instruction |
| `14-judul-skill.md` | ADD to Function Tools | readArtifact instruction |

### Code layer (source code changes)

| File | Change type | What changes |
|------|------------|-------------|
| `src/app/api/chat/route.ts` | EDIT | Fix readArtifact tool description: translate from Indonesian to English (language policy violation at lines 1892-1904). Verify tool provisioning order. |
| `src/lib/ai/paper-tools.ts` | VERIFY first; edit only if wording contradicts semantic retrieval behavior or stage-level guidance | inspectSourceDocument (line 542) and quoteFromSource (line 630) already have behavioral guidance. searchAcrossSources (line 674) description says "finding relevant passages" which is correct for semantic retrieval. Verify no contradictions with stage-level instructions added in skill files. |
| `src/lib/ai/paper-mode-prompt.ts` | ADD injection block | Paper-specific UI awareness: PaperValidationPanel details (revision textarea, dirty state context enrichment), UnifiedProcessCard awareness (model should not narrate what UI shows) |
| `src/lib/json-render/choice-yaml-prompt.ts` | VERIFY only | Choice card instructions are already detailed and complete — no changes expected |

---

## 4. Goals

### G1: Close the exact source tools gap in stage skills
The model must have stage-level instructions for inspectSourceDocument, quoteFromSource, and searchAcrossSources in relevant skill files, so it can use them proactively during paper-writing — not only when web-search-quality skill happens to be injected.

**Success metric:** Search-active stages (gagasan, tinjauan_literatur) and source-heavy stages (diskusi, daftar_pustaka) explicitly list these tools with when-to-use guidance in their Function Tools section.

### G2: Close the readArtifact placement gap
The model must have readArtifact instructions in stage skill files where cross-stage reference matters, so it can inspect previous artifacts during active writing — not only after session completion.

**Success metric:** Skill files for relevant stages mention readArtifact in their Function Tools section with when-to-use guidance.

### G3: Fix language policy violation in readArtifact
The readArtifact tool description in `route.ts:1892-1904` must be translated from Indonesian to English per MODEL INSTRUCTION LANGUAGE POLICY.

**Success metric:** readArtifact description and inputSchema `.describe()` strings are in English. No Indonesian model-facing instructions in route.ts tool definitions.

### G4: Add UI awareness to reduce redundant narration
The model must know the user sees processing indicators, tool states, and thinking status in real-time. It must stop narrating process steps in chat text that the UI already displays.

**Success metric:** System prompt or paper-mode-prompt contains processing indicator awareness that tells the model not to narrate what the UI already shows.

### G5: Enrich artifact system awareness
The model already knows artifacts can be edited/copied/exported. It needs to know about the tabbed interface and behavioral boundary (when to suggest direct edit vs use updateArtifact).

**Success metric:** System prompt artifact section adds tabs detail and behavioral boundary guidance.

### G6: Add source system awareness
The model must know about source verification status (verified_content / unverified_link / unavailable) and that inline citations [1], [2] are clickable in the UI.

**Success metric:** System prompt source section mentions verification status visibility and citation clickability.

### G7: Optimize partially-aware features
PaperValidationPanel (dirty state enrichment, textarea awareness), compileDaftarPustaka (proactive preview guidance), and ChoiceTextarea (user custom input path) need targeted additions.

**Success metric:** Paper-mode-prompt injection enriches validation panel context. Relevant skill files add compileDaftarPustaka preview guidance.

### G8: Zero contradictions across layers
System prompt, skill files, tool descriptions (code), and injected context (paper-mode-prompt) must not contradict each other after all patches are applied.

**Success metric:** Auditor cross-references all layers and finds no conflicting instructions.
