# Paper Stage Skill Migration Analysis

## Context

The web search domain proved that Skills pattern (SKILL.md → natural language instructions → LLM reasoning) outperforms hardcoded pipelines. Paper stages are the primary candidate for the same migration.

## Current State: Hardcoded Instructions

Paper stage behavior is currently defined as TypeScript template literal strings:

```
src/lib/ai/paper-stages/
├── index.ts              # Router: getStageInstructions(stage)
├── foundation.ts         # Stages 1-2 (Gagasan, Topik)
├── core.ts               # Stages 4-7 (Abstrak, Pendahuluan, Tinjauan Literatur, Metodologi)
├── results.ts            # Stages 8-10 (Hasil, Diskusi, Kesimpulan)
├── finalization.ts       # Stages 3,11-14 (Outline, Pembaruan Abstrak, Daftar Pustaka, Lampiran, Judul)
└── formatStageData.ts    # Context formatter (stageData → prompt injection)
```

Supporting files:
- `src/lib/ai/paper-search-helpers.ts` — 3-layer search decision logic + system notes
- `src/lib/ai/paper-mode-prompt.ts` — Paper mode system prompt injection
- `src/lib/ai/paper-workflow-reminder.ts` — Injected workflow reminders

### What Currently Lives in Code That Should Be Skill Knowledge

| Current Location | Content | Why It's a Skill Concern |
|-----------------|---------|--------------------------|
| `paper-stages/foundation.ts` | Dialog-first instructions, exploration scope, citation requirements | Teaches LLM HOW to behave — knowledge, not execution |
| `paper-stages/core.ts` | Anti-hallucination enforcement, APA citation rules, content structure | Quality judgment instructions — same category as SKILL.md |
| `paper-stages/results.ts` | "No new data in Diskusi" rule, synthesis guidance | Domain knowledge about academic writing |
| `paper-search-helpers.ts` → `PAPER_TOOLS_ONLY_NOTE` | "Search tools unavailable, don't promise to search" | Mode awareness instruction — should be in skill context |
| `paper-search-helpers.ts` → `getResearchIncompleteNote()` | "Stage X needs more references before proceeding" | Research completeness guidance — LLM should judge this |
| `paper-search-helpers.ts` → `getFunctionToolsModeNote()` | "Search done, now use function tools" | Mode transition instruction |

### What Should Stay in Code

| Current Location | Content | Why It's Code |
|-----------------|---------|---------------|
| `formatStageData.ts` | Format stageData into prompt context | Deterministic transform (data → text), no judgment |
| `paper-search-helpers.ts` → `isStageResearchIncomplete()` | Check field counts | Could become skill guidance, but safe as helper |
| `paper-tools.ts` | Tool definitions (startPaperSession, updateStageData) | Simple executors — tools layer |
| `paper-stages/index.ts` | Stage routing | Dispatch logic — workflow layer |

## Migration Target: Paper Workflow Skill

### Proposed Structure

```
src/lib/ai/skills/
├── web-search-quality/          # Existing — search domain
│   ├── SKILL.md
│   ├── index.ts
│   └── ...
└── paper-workflow/              # New — paper stage domain
    ├── SKILL.md                 # Core paper writing knowledge
    ├── stages/
    │   ├── foundation.md        # Gagasan + Topik stage guidance
    │   ├── core.md              # Abstrak through Metodologi
    │   ├── results.md           # Hasil, Diskusi, Kesimpulan
    │   └── finalization.md      # Outline, bibliography, title
    └── index.ts                 # composePaperSkillInstructions(context)
```

### What SKILL.md Would Contain

**Universal rules** (apply to all stages):
- Dialog-first principles (ask, propose options, get feedback)
- Anti-hallucination enforcement (all facts from search or Phase 1 sources)
- Mandatory ringkasan requirement (max 280 chars)
- APA citation format rules
- Web search mode separation (search and function tools in different turns)
- Collaborative proactivity (never bare questions, always offer 2-3 options)

**Stage-specific guidance** (in `stages/*.md`):
- Exploration scope per stage
- Minimum reference requirements (as guidance, not hard gates)
- Output structure expectations
- Stage-specific anti-patterns to avoid

### What Changes

| Before (Hardcoded) | After (Skill) |
|---------------------|----------------|
| `PAPER_TOOLS_ONLY_NOTE` string in TypeScript | Section in SKILL.md: "When search tools are unavailable..." |
| `getResearchIncompleteNote(stage, req)` with hardcoded field/count | Stage guidance in SKILL.md: "Before proceeding, ensure adequate references..." |
| Anti-hallucination template literals repeated across stages | Single section in SKILL.md referenced by all stages |
| Instruction changes require code deployment | Instruction changes = edit SKILL.md, no deployment |

### What Stays the Same

- `formatStageData.ts` — deterministic data formatting (not knowledge)
- `paper-tools.ts` — tool definitions (simple executors)
- `paper-stages/index.ts` — routing (can dispatch to skill instead of hardcoded strings)
- Stage progression logic in route.ts — workflow control (not knowledge)

## Migration Principles

When migrating paper stages to Skills pattern, follow the same principles proven in web search:

### 1. Don't Replicate the Hardcoded Logic in Natural Language

Wrong approach: translating `isStageResearchIncomplete()` field-by-field into SKILL.md.

Right approach: explain the research completeness CRITERIA and let LLM judge. The LLM can assess whether "3 supporting references about the topic" is sufficient better than a `count >= 3` check, because it can evaluate reference quality and relevance.

### 2. Keep formatStageData as Code

`formatStageData.ts` is a deterministic transform: it takes structured stageData and formats it as prompt context. This is the code pipeline layer — normalize format, pass ALL data to LLM. Don't move this into a skill.

### 3. Merge Repeated Instructions

Current paper-stages files repeat identical blocks (anti-hallucination, dialog-first, ringkasan requirement) across every stage. SKILL.md eliminates this — universal rules stated once, stage-specific guidance in separate files.

### 4. System Notes Become Skill Context

`PAPER_TOOLS_ONLY_NOTE`, `getResearchIncompleteNote()`, `getFunctionToolsModeNote()` are currently hardcoded strings injected based on deterministic checks. In the skill model:
- The check logic stays in code (workflow concern: WHEN to inject)
- The instruction content moves to SKILL.md (knowledge concern: WHAT to inject)

### 5. Gradual Migration

Don't rewrite everything at once. Start with one concern:

**Recommended first migration:** Anti-hallucination + citation rules
- Currently duplicated across all stage files
- Natural fit for a single SKILL.md section
- Low risk — doesn't change workflow logic
- Immediately reduces code duplication

**Second migration:** Stage-specific guidance
- Move stage instructions from TypeScript to `stages/*.md`
- `composePaperSkillInstructions(context)` selects and assembles relevant sections
- Follows same pattern as `composeSkillInstructions()` in web-search-quality

**Third migration:** System notes
- Move note content to SKILL.md sections
- Keep deterministic checks as triggers in code
- `getResearchIncompleteNote()` becomes "read this section of SKILL.md" instead of returning a hardcoded string

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| LLM ignores stage guidance in SKILL.md | Same risk exists with hardcoded strings — SKILL.md proven effective in web search domain |
| Research completeness judgment too lenient | Keep `isStageResearchIncomplete()` as safety net alongside skill guidance |
| Migration breaks paper workflow | Gradual migration — one concern at a time, test each step |
| Stage instructions too long for SKILL.md | Split into `stages/*.md` files, compose only relevant sections per request |

## References

- `README.md` — Tools + Skills principles and evidence
- `architecture-constraints.md` — Technical constraints
- `web-search-quality-skill-design.md` — Proven skill architecture to follow
- `.references/programatic-tools-calling/` — Anthropic's evidence for LLM reasoning > pipelines
- `.references/skills/` — Anthropic's skill design guide
