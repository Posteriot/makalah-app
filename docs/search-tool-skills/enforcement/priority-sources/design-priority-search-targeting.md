# Design: Priority Search Targeting

> **Branch**: `search-tool-skills-v2`
> **Date**: 2026-03-14
> **Status**: Approved

---

## 1. Problem Statement

Search results are too random. Retrievers (Perplexity/Grok/Google Grounding) return arbitrary sources, often missing authoritative ones that should appear:

- **Academic databases**: Google Scholar, Scopus, ResearchGate, SINTA, Garuda — rarely appear
- **Indonesian university repositories**: UI, UGM, ITB, UIN, Unair — almost never cited
- **Reputable Indonesian media**: Kompas, Tempo, Republika — even for Indonesian topics, Kompas never appears

## 2. User Intent

> "Prioritas sebagai rujukan model, bukan pengikat absolut."

- **NOT a blocklist** — do not restrict other sources
- **NOT a hard requirement** — do not fail search if priority sources are missing
- **PRIORITY** — nudge retrievers to include these sources, but let the model judge relevance
- **Guidance** — hints, not rigid rules
- **Universal** — applies to paper mode AND chat mode, every search flow that enters `executeWebSearch()`

**CREDO**: "AI works better when you give tools and freedom instead of forcing them into rigid, hand-designed workflows — because general learning systems scale better."

## 3. Architecture Decision — Approach C (Dual Layer)

Natural language guidance at two injection points. No code filters, no API-level restrictions.

### Why Not `search_domain_filter` (Perplexity API)

Evaluated and rejected:

- `search_domain_filter` operates in **allowlist mode** (ONLY these domains) or **denylist mode** (exclude these domains). There is NO priority mode.
- Allowlist = restriction of everything else. This directly contradicts user intent ("BUKAN blocklist").
- Documented bugs: empty citations, results leaking outside allowlist.
- Max 20 domains — tight and rigid.
- Requires migration from OpenRouter to direct Perplexity API — cost with no benefit for this use case.
- Violates CREDO: "rigid, hand-designed workflows."

### Why Not SKILL.md Only

- Compose phase can only prefer sources that were already retrieved.
- If the retriever never finds priority sources, SKILL.md guidance has no effect.

### Why Not Retriever Hint Only

- No intelligence at compose phase to prefer priority sources when available.
- All sources treated equally during synthesis.

### Chosen Approach: Dual Layer

**Layer 1 — Retriever Phase (User Message Hint)**
- Extend existing hint in `augmentUserMessageForSearch()` with priority source names.
- Context-free — no parameters for isPaperMode/stage. Retriever casts a wider net; stage intelligence belongs in compose phase.
- Works across all retrievers: Perplexity/Grok (user message = search query basis, direct influence), Google Grounding (indirect influence via conversation context).
- Zero changes to orchestrator.ts, types.ts, or retriever files.

**Layer 2 — Compose Phase (SKILL.md)**
- New section `## PRIORITY SOURCES` in SKILL.md with category-based guidance.
- Stage-aware enrichment in existing `## STAGE CONTEXT` subsections for all 6 active search stages.
- Passive stages (8) + chat mode covered via `### default` fallback.
- Load new section in `getInstructions()` in index.ts.

### Constraints Honored

| Constraint | How |
|-----------|-----|
| Tools = simple executors | Retrievers untouched — no filtering, scoring, or judgment added |
| Skills provide intelligence | SKILL.md = where priority judgment lives |
| Minimize code between tool output and LLM input | No new pipeline steps — just extended hint string + skill section |
| All model instructions in English | Both hint and SKILL.md section in English |
| CREDO: freedom over rigidity | Natural language guidance, not filters or restrictions |

## 4. Implementation Detail

### 4A. `src/lib/ai/search-system-prompt.ts` — Extend hint string

Current hint in `augmentUserMessageForSearch()`:

```
[Search broadly. Cite at least 10 sources from many different domains.
 Include both domestic and international sources.
 Do not over-rely on any single domain.]
```

New hint:

```
[Search broadly. Cite at least 10 sources from many different domains.
 Include both domestic and international sources.
 Do not over-rely on any single domain.
 When relevant, prioritize including sources from:
 academic databases (Google Scholar, Scopus, ResearchGate, SINTA, Garuda),
 Indonesian university repositories (UI, UGM, ITB, UIN, Unair),
 and reputable Indonesian media (Kompas, Tempo, Republika).
 These are preferred sources — do not exclude other credible sources.]
```

No signature, parameter, or logic changes. String extension only.

### 4B. `src/lib/ai/skills/web-search-quality/SKILL.md` — New section

Position: between `## BLOCKED DOMAINS` and `## RESEARCH SOURCE STRATEGY`.

```markdown
## PRIORITY SOURCES

The following source categories are preferred when available in search results.
This is guidance, not a hard requirement — do not exclude other credible sources,
and do not force these sources if they are not relevant to the query.

### Academic & Research Databases
Google Scholar, Scopus, ResearchGate, SINTA (sinta.kemdikbud.go.id),
Garuda (garuda.kemdikbud.go.id) — prioritize for empirical data,
peer-reviewed findings, and literature mapping.

### Indonesian University Repositories
UI (lib.ui.ac.id), UGM (etd.repository.ugm.ac.id),
ITB (digilib.itb.ac.id), UIN, Unair — prioritize for
Indonesian-context research, theses, and local empirical studies.

### Reputable Indonesian Media
Kompas, Tempo, Republika — prioritize for current events,
policy analysis, and Indonesian socio-cultural context.

### How to Apply
- When multiple sources cover the same claim, prefer priority sources
  over generic or lesser-known sources.
- Priority sources that provide PRIMARY DATA are stronger than
  priority sources that only aggregate.
- If NO priority sources appear in search results, proceed normally
  with available sources — do not mention their absence to the user.
- In paper mode, weight academic sources higher; in chat mode,
  weight media and current-event sources appropriately.
```

### 4C. `src/lib/ai/skills/web-search-quality/SKILL.md` — Enrich STAGE CONTEXT

Each of the 6 active search stages gets 1-2 sentences referencing priority sources:

| Stage | Addition |
|-------|----------|
| `gagasan` | Leverage priority academic databases and reputable media to map the research landscape broadly. |
| `topik` | Use priority academic databases and university repositories to assess where the literature is dense vs sparse. |
| `tinjauan_literatur` | Heavily leverage priority academic databases (Scopus, Google Scholar, SINTA) and Indonesian university repositories for comprehensive literature coverage. |
| `pendahuluan` | Use priority academic databases for theoretical grounding and reputable media for establishing real-world problem significance. |
| `metodologi` | Use priority academic databases to find methodological precedent and similar study designs. |
| `diskusi` | Cross-reference findings using priority academic databases and reputable media for contextual analysis. |
| `default` | When priority sources are available in search results, prefer them over generic sources while maintaining source diversity. |

### 4D. `src/lib/ai/skills/web-search-quality/index.ts` — Load new section

Add in `getInstructions()`, before `researchStrategy`:

```typescript
const prioritySources = parsed.sections.get("PRIORITY SOURCES")
if (prioritySources) {
  parts.push(`## PRIORITY SOURCES\n\n${prioritySources}`)
}
```

### 4E. Tests

1. **New:** `__tests__/search-system-prompt.test.ts` — verify hint string contains priority source names (Google Scholar, Scopus, SINTA, Kompas, etc.)
2. **Update:** `__tests__/skills/web-search-quality-index.test.ts` — verify `PRIORITY SOURCES` section present in `getInstructions()` output

## 5. Files Changed

| File | Change | Type |
|------|--------|------|
| `src/lib/ai/search-system-prompt.ts` | Extend hint (+4 lines) | Code |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | New section + enrich stages (~35 lines) | Content |
| `src/lib/ai/skills/web-search-quality/index.ts` | Load new section (+4 lines) | Code |
| `__tests__/search-system-prompt.test.ts` | New test file | Test |
| `__tests__/skills/web-search-quality-index.test.ts` | Add assertion for PRIORITY SOURCES | Test |

**Total code change:** ~8 lines TypeScript. Rest is content + tests.

## 6. Effectiveness Estimate

### Per-layer breakdown

**Layer 1 (Retriever Hint):**
- Perplexity/Grok: 65-75% chance priority sources appear in results (up from ~20-30%)
- Google Grounding: 35-45% (indirect influence)

**Layer 2 (SKILL.md):**
- 85-90% compliance when priority sources are available in results

### Combined

| Scenario | Without | With | Improvement |
|----------|---------|------|-------------|
| Priority source in output (Perplexity) | ~20% | ~60% | ~3x |
| Priority source in output (Google Grounding) | ~12% | ~35% | ~3x |
| Priority source preferred when available | ~50% | ~87% | ~1.7x |

### Why not 90%+

1. **Index coverage outside our control** — SINTA, Garuda, UI/UGM repositories may not be deeply indexed by Perplexity.
2. **Natural language hints are probabilistic** — nudge, not command.
3. **Query specificity matters** — irrelevant priority sources are correctly ignored.

## 7. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hint too long, dilutes search quality | Low | Only +4 lines, existing precedent |
| SKILL.md section not loaded | Low | Explicit loading in code, covered by test |
| Priority sources force irrelevant citations | Low | "do not force if not relevant" in both layers |
| Zero improvement for niche queries | Medium | Expected — this is guidance, not magic |

## 8. Scope Boundaries

**In scope:**
- Extend retriever hint string
- New SKILL.md section + stage enrichment
- Load new section in index.ts
- Tests for both layers

**Out of scope:**
- Retriever code changes (perplexity.ts, grok.ts, google-grounding.ts)
- Orchestrator changes (orchestrator.ts)
- Type changes (types.ts)
- API migration (OpenRouter → direct Perplexity)
- Programmatic domain filtering
