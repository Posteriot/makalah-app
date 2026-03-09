# Design Document: web-search-quality Skill

## Overview

Adaptasi Anthropic skill concept untuk Makalah AI. Skill ini menguatkan Gemini 2.5 Flash dalam memproses hasil web search dari Perplexity/Grok — evaluasi sumber via natural language, narasi sekelas peneliti profesional, dan validasi integritas referensi.

**This is NOT a Claude Code skill.** This is a server-side knowledge layer injected into Gemini's compose phase via Next.js API route.

## Origin

Adapted from Anthropic's "The Complete Guide to Building Skills for Claude" (`.references/skills/resources.anthropic.com.md`). Key Anthropic principles adopted:
- Skill = folder with SKILL.md (instructions) + scripts/ (deterministic validation) + references/ (data)
- "Give tools and freedom instead of forcing them into rigid, hand-designed workflows" — Boris Cherny
- Progressive disclosure — SKILL.md is the single source of truth for instructions

Key adaptation difference: Anthropic skills are read by Claude via Bash. Our skills are parsed by server code and injected into Gemini's prompt. The philosophy is the same, the execution mechanism differs.

## What This Skill Does

Strengthens Gemini 2.5 Flash when composing responses from Perplexity/Grok web search results:
1. **Blocklist enforcement** — SKILL.md tells Gemini which domains to never cite (natural language, not code)
2. **Source credibility guidance** — teaches Gemini to evaluate primary data, authorship, methodology
3. **Professional research narration** — not just link collection, but researcher-grade analysis
4. **Reference integrity** — prevent URL fabrication, validate claimed sources exist
5. **Stage-specific guidance** — different depth expectations per paper workflow stage

## What This Skill Does NOT Do

- Does NOT filter sources programmatically (no scoring, no tier classification, no dedup)
- Does NOT change how Perplexity/Grok search (Phase 1 stays the same)
- Does NOT handle paper workflow concerns (when search is allowed/blocked — see `future-paper-workflow-skill-notes.md`)
- Does NOT handle mode switching (PAPER_TOOLS_ONLY, function tools mode)

## Architecture Constraint

**ALL instructions in SKILL.md MUST be written in English.** Model's native language is English — instructions in English minimize ambiguity and maximize accuracy. Indonesian is for user-facing output only. See `architecture-constraints.md`.

## Evolution: From Complex Pipeline to Skill-Based

### Previous Architecture (removed)
```
Perplexity → normalize → score by domain tier → enrich titles →
filter unreachable → dedup by final URL → Gemini
```
Problems:
- 6-step pipeline lost 50% of sources (12 → 6 in production)
- `enrichSourcesWithFetchedTitles` replaced URLs with redirect finals, causing false dedup
- Timeout 2500ms dropped academic sources
- Domain tier scoring was opinionated and rigid (killed valid niche sources)
- Every pipeline step = potential source loss

### Current Architecture (simplified)
```
Perplexity/Grok → normalize citations → pass ALL to Gemini + SKILL.md
```
- Zero programmatic filtering
- Blocklist via SKILL.md natural language
- Source evaluation delegated to Gemini's intelligence
- Result: 14/14 sources preserved, zero blocked domains cited

## Execution Flow

```
┌─────────────────────────────────────────────────┐
│ PHASE 1: Search (Perplexity/Grok)               │
│ Search model retrieves broadly, no constraints   │
│ System prompt: minimal, no blocklist             │
│ User message: augmented with diversity hints     │
│ Output: raw sources + raw text                   │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ PIPELINE: Normalize only                         │
│ normalizeCitations() → URL/title cleanup         │
│ No scoring, no filtering, no enrichment          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ PHASE 2: Gemini Compose (strengthened by skill)  │
│                                                  │
│ Inputs:                                          │
│ ├── System prompt (persona, tone)                │
│ ├── SKILL.md instructions:                       │
│ │   ├── BLOCKED DOMAINS (natural language)       │
│ │   ├── RESEARCH SOURCE STRATEGY                 │
│ │   ├── RESPONSE COMPOSITION                     │
│ │   ├── REFERENCE INTEGRITY                      │
│ │   └── STAGE CONTEXT (stage-specific guidance)  │
│ ├── Search results context (all sources + text)  │
│ └── User conversation                            │
│                                                  │
│ Gemini evaluates, filters, and composes response │
│                                                  │
│ Tool calls → check-references.ts validates URLs  │
└─────────────────────────────────────────────────┘
```

## Folder Structure

```
src/lib/ai/skills/
├── web-search-quality/
│   ├── SKILL.md                  # Instructions for Gemini (English only)
│   │                             # Sections: BLOCKED DOMAINS, RESEARCH SOURCE STRATEGY,
│   │                             # RESPONSE COMPOSITION, REFERENCE INTEGRITY, STAGE CONTEXT
│   ├── scripts/
│   │   ├── score-sources.ts      # Simplified — blocklist only (legacy, not called from pipeline)
│   │   └── check-references.ts   # URL integrity validation (POST-COMPOSE)
│   ├── references/
│   │   └── domain-tiers.ts       # Simplified to blocked/pass only
│   └── index.ts                  # Entry point: parse SKILL.md, expose interface
├── types.ts                      # Shared types (SkillContext, ValidationResult, etc.)
└── index.ts                      # Registry: getSearchSkill(), composeSkillInstructions()
```

## SKILL.md Sections

### `## BLOCKED DOMAINS`
Natural language blocklist. Lists domains Gemini must never cite (wikipedia, blogspot, medium, quora, reddit, etc.) with rationale explaining WHY they're blocked. This replaces the programmatic `isBlockedSourceDomain()` filter.

### `## RESEARCH SOURCE STRATEGY`
Teaches Gemini source evaluation:
- Evaluate credibility by substance (primary data, authorship, methodology), not domain name
- Match source type to purpose (factual → primary data, trends → news, theory → academic)
- Build narrative FROM sources, not just attach links
- Diversification: mix data sources, news, expert analysis

### `## RESPONSE COMPOSITION`
Researcher persona and depth expectations:
- Analyze, synthesize, opine, recommend, engage
- Every major point needs: claim → evidence → analysis → implications
- Use ALL available sources, minimum 5 actively cited
- Organize by theme, not by source

### `## REFERENCE INTEGRITY`
Citation quality rules:
- Integration not decoration (explain WHY source matters)
- Source honesty (only cite actual search results)
- Claim-source alignment (match source type to claim type)
- When to request more sources

### `## STAGE CONTEXT`
Stage-specific guidance for paper workflow:
- `gagasan`: landscape mapping, 3-5 diverse sources
- `topik`: topic refinement, 5+ sources
- `tinjauan_literatur`: depth + comprehensiveness, 5+ academic
- `pendahuluan`: problem framing, primary data + academic grounding
- `metodologi`: justify approach with precedent
- `diskusi`: cross-reference findings with literature
- `default`: thorough research for chat mode

## Key Supporting Files

### `src/lib/ai/search-system-prompt.ts`
Minimal system prompt for Perplexity/Grok. No blocklist — search models retrieve freely. Also exports `augmentUserMessageForSearch()` which appends diversity hints to user message.

### `src/lib/ai/blocked-domains.ts`
Canonical blocklist array + `isBlockedSourceDomain()` helper. Exists as shared reference but NOT called in the search pipeline. SKILL.md references these same domains in natural language.

### `src/lib/ai/search-results-context.ts`
Builds search results context string for Gemini. Includes source list + raw search text from Perplexity/Grok. `searchText` parameter ensures Gemini gets actual search findings, not just URL lists.

## SKILL.md Parsing Strategy

- **Parse once, cache in-memory** — SKILL.md does not change at runtime
- **`gray-matter`** for YAML frontmatter parsing (common in Next.js ecosystem)
- **Section splitting** by `## ` headers into sections Map
- **Stage guidance** by `### ` sub-headers within STAGE CONTEXT section
- **No file watcher** — server restart on SKILL.md changes (acceptable)

## Telemetry

Search skill telemetry tracked in `webSearchSkillLogs` (Convex):
- `sourcesPassed`: number of sources passed to Gemini (all sources, no programmatic filter)
- `sourcesBlocked`: hardcoded 0 (blocklist enforcement via SKILL.md, not code)
- `searchSkillAction`: "passed" or "all-blocked"

## Future Extensibility

Once this pattern is proven effective, the same architecture applies to other tools:
- Each new skill = new folder in `src/lib/ai/skills/`
- Top-level `index.ts` registry discovers and exposes skills
- route.ts consumption pattern stays the same: `getXxxSkill().method()`
