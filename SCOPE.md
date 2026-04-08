# Tools, Features & UI — AI Awareness Audit

Branch: `tools-features-ui-ai-awarness`
Reference files: `.references/system-prompt-skills-active/updated-4/`
Documentation: `docs/tools-features-ui-ai-awarness/`

## Objective

Detect, analyze, verify, audit, and fix the MOKA model's awareness of all tools, features, UI components, and functions available in its runtime environment.

The model only knows what its instructions tell it. If a tool exists but the system prompt and skill files never mention it, the model behaves as if the tool does not exist. If a UI component shows information to the user but the model does not know, the model may produce output that duplicates or contradicts what the user already sees.

This branch closes those blind spots across two layers:
- **Instruction layer:** system prompt (`system-prompt.md`) + 14 stage skill files
- **Code layer:** tool descriptions (`paper-tools.ts`), injected context (`paper-mode-prompt.ts`), system message composition (`route.ts`), choice card prompt (`choice-yaml-prompt.ts`)

## Awareness Categories

### 1. Tools Per Stage

**What exists in code:**
| Tool | Defined in | Purpose |
|------|-----------|---------|
| startPaperSession | paper-tools.ts | Initialize paper writing session |
| getCurrentPaperState | paper-tools.ts | View current session status |
| updateStageData | paper-tools.ts | Save stage progress |
| submitStageForValidation | paper-tools.ts | Submit draft for user approval |
| requestRevision | paper-tools.ts | Transition to revision mode |
| createArtifact | route.ts | Create stage output artifact |
| updateArtifact | route.ts | Update existing artifact |
| readArtifact | route.ts | Read artifact content by ID |
| renameConversationTitle | route.ts | Rename conversation title |
| compileDaftarPustaka | paper-tools.ts | Cross-stage bibliography audit/finalize |
| inspectSourceDocument | paper-tools.ts | Inspect exact source document metadata + paragraphs |
| quoteFromSource | paper-tools.ts | Semantic chunk search within a source |
| searchAcrossSources | paper-tools.ts | Full-text search across all conversation sources |

**Current awareness status:**
- startPaperSession through compileDaftarPustaka: **AWARE** — mentioned in system prompt + skills
- readArtifact: **PARTIAL** — exists in route.ts, mentioned in completed session context only, no general instruction
- inspectSourceDocument: **NOT AWARE** — zero mention in system prompt or any skill file
- quoteFromSource: **NOT AWARE** — zero mention in system prompt or any skill file
- searchAcrossSources: **NOT AWARE** — zero mention in system prompt or any skill file

### 2. Artifact System

**What exists in code:**
| Component | File | What user sees |
|-----------|------|---------------|
| ArtifactViewer | ArtifactViewer.tsx | Renders artifact content with inline citations |
| ArtifactPanel | ArtifactPanel.tsx | Side panel showing active artifact |
| ArtifactEditor | ArtifactEditor.tsx | Inline editing — user can edit artifact directly |
| ArtifactToolbar | ArtifactToolbar.tsx | Copy, export, and other artifact actions |
| ArtifactTabs | ArtifactTabs.tsx | Tabbed interface for multiple artifacts |

**Current awareness status:**
- ArtifactViewer/Panel: **PARTIAL** — model knows "artifact is in the side panel" but not specifics
- ArtifactEditor: **NOT AWARE** — model does not know user can edit artifacts directly
- ArtifactToolbar: **NOT AWARE** — model does not know user can copy/export from toolbar
- ArtifactTabs: **NOT AWARE** — model does not know multi-tab interface exists

### 3. PaperValidationPanel

**What exists in code:**
| Feature | File | What user sees |
|---------|------|---------------|
| Approve button | PaperValidationPanel.tsx | "Setujui & Lanjutkan" button |
| Revise button | PaperValidationPanel.tsx | "Revisi" button |
| Revision textarea | PaperValidationPanel.tsx | Text area for revision feedback |
| Dirty state warning | PaperValidationPanel.tsx | Warning when conversation changed since save |
| Mobile responsive | PaperValidationPanel.tsx | Adapted layout for mobile |

**Current awareness status:**
- Authority boundary: **AWARE** — system prompt and skills clearly state PaperValidationPanel handles stage lifecycle
- Approve/Revise flow: **AWARE** — mentioned in system prompt and skills
- Revision textarea: **PARTIAL** — model knows revision happens but may not know user types feedback in a dedicated textarea
- Dirty state warning: **NOT AWARE** — model does not know UI shows dirty state indicator

### 4. Choice Card (JSON-Renderer YAML)

**What exists in code:**
| Component | File | What user sees |
|-----------|------|---------------|
| ChoiceCardShell | ChoiceCardShell.tsx | Container card with title and decision mode |
| ChoiceOptionButton | ChoiceOptionButton.tsx | Clickable option buttons with recommended badge |
| ChoiceTextarea | ChoiceTextarea.tsx | Text input for custom responses |
| ChoiceSubmitButton | ChoiceSubmitButton.tsx | Submit button for selection |
| decisionMode | choice-yaml-prompt.ts | exploration (keep exploring) vs commit (finalize after selection) |
| recommended badge | ChoiceOptionButton.tsx | Visual "Rekomendasi" label on best option |

**Current awareness status:**
- YAML spec syntax: **AWARE** — CHOICE_YAML_SYSTEM_PROMPT is detailed and injected during drafting stages
- decisionMode: **AWARE** — exploration vs commit documented in prompt
- Recommended badge: **AWARE** — mandatory recommendation rule documented
- Authority boundary: **AWARE** — "NEVER use choice card for stage approval" is explicit
- ChoiceTextarea: **PARTIAL** — exists in spec but not prominently documented as user interaction path

### 5. Process/Status UI

**What exists in code:**
| Component | File | What user sees |
|-----------|------|---------------|
| UnifiedProcessCard | UnifiedProcessCard.tsx | Task summary, search status, tool state — real-time |
| ChatProcessStatusBar | ChatProcessStatusBar.tsx | Status bar showing current operation |
| ToolStateIndicator | ToolStateIndicator.tsx | Individual tool execution states (pending/running/result/error) |
| ReasoningTracePanel | ReasoningTracePanel.tsx | Timeline of reasoning steps with status indicators |
| Thinking loader | (above chat input) | Loading/thinking indicator visible during model processing |

**Current awareness status:**
- UnifiedProcessCard: **NOT AWARE** — model does not know user sees real-time task progress
- ChatProcessStatusBar: **NOT AWARE** — model does not know user sees processing status
- ToolStateIndicator: **NOT AWARE** — model does not know user sees tool execution states
- ReasoningTracePanel: **NOT AWARE** — model does not know user sees reasoning visualization
- Thinking loader: **NOT AWARE** — model does not know user sees thinking indicator

**Impact of unawareness:** Model may produce redundant status updates in chat text ("sedang memproses...", "saya akan membuat artifact...") when the user already sees this in the UI.

### 6. Source System

**What exists in code:**
| Component | File | What user sees |
|-----------|------|---------------|
| SourcesPanel | SourcesPanel.tsx | Sheet panel with source metadata, favicon, verification status |
| SourcesIndicator | SourcesIndicator.tsx | Badge showing number of available sources |
| InlineCitationChip | InlineCitationChip.tsx | Clickable [1], [2] citations in artifact |
| Verification status | SourcesPanel.tsx | verified_content / unverified_link / unavailable per source |

**Current awareness status:**
- Sources in artifacts: **AWARE** — source-body parity rule documented
- Inline citations format: **AWARE** — APA format rules documented
- SourcesPanel: **PARTIAL** — model knows sources exist but not that user sees verification status
- InlineCitationChip clickability: **NOT AWARE** — model does not know citations are interactive
- Verification status: **NOT AWARE** — model does not know user sees verified/unverified/unavailable

## Files In Scope

### Instruction layer (editable working copies)
- `.references/system-prompt-skills-active/updated-4/system-prompt.md`
- `.references/system-prompt-skills-active/updated-4/01-gagasan-skill.md` through `14-judul-skill.md`

### Code layer
- `src/lib/ai/paper-tools.ts` — tool descriptions
- `src/lib/ai/paper-mode-prompt.ts` — injected context composition
- `src/app/api/chat/route.ts` — system message composition, tool provisioning
- `src/lib/json-render/choice-yaml-prompt.ts` — choice card system prompt

### Files explicitly out of scope (UI components — read-only for audit reference)
- `src/components/chat/ArtifactViewer.tsx` — read for audit, do not modify
- `src/components/chat/ArtifactPanel.tsx` — read for audit, do not modify
- `src/components/chat/UnifiedProcessCard.tsx` — read for audit, do not modify
- `src/components/paper/PaperValidationPanel.tsx` — read for audit, do not modify
- All other UI components — read for audit, do not modify

## Implementation Strategy

### Phase 1: Awareness Mapping (this document)
Document what the model knows vs does not know. **DONE.**

### Phase 2: Design Patches
For each gap, design the minimal instruction addition that:
- Tells the model what exists and what the user sees
- Guides the model to complement (not duplicate) the UI
- Does not bloat the system prompt beyond effective use

### Phase 3: Apply Patches
- System prompt patches for cross-cutting awareness (UI components, general tools)
- Skill file patches for stage-specific tool instructions (exact source tools in relevant stages)
- Code-level patches for tool descriptions and injected context

### Phase 4: Verify
- Cross-reference every instruction against actual code behavior
- Verify no contradictions between system prompt, skills, and code-level descriptions
- Verify language policy compliance (all instructions in English)

### Phase 5: Deploy
- Deploy to dev DB (wary-ferret-59) for testing
- After validation, deploy to prod DB (basic-oriole-337)

## Agent Role Assignment

- **Claude Code:** Brainstormer, planner, task creator, and executor for all implementation work on this branch.
- **Codex (OpenAI) / Review Agent:** Audit and code review. All review/audit tasks are delegated to Codex, not performed by Claude Code.

## Guardrails

1. Never add awareness instructions that contradict actual code behavior — verify first.
2. Awareness of UI components means "model knows what user sees" — not "model tries to control UI rendering."
3. Keep instruction additions minimal. Bloated prompts degrade model performance.
4. All model-facing instructions in English. Indonesian only for user-facing UI strings.
5. Exact source tools (inspect/quote/search) are the highest-priority gap — these are fully functional tools with zero instructions.
6. Process/status UI awareness should reduce redundant chat output, not add new output.
