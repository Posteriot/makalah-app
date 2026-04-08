# Fix Report: searchAcrossSources Evidence Breadth Overclaim

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`

---

## Root Cause

When `searchAcrossSources` returns chunks from only 1 unique source, the model frames its response as if evidence spans "all stored references" or "cross-source findings." This is misleading — the model overclaims breadth of evidence beyond what the retrieval actually covers.

This is not a tool execution bug. The tool correctly returns `uniqueSources=1` in its response. The problem is the model's response composition: it does not distinguish between single-source and multi-source retrieval results when wording its answer.

## Files Changed

5 stage skill files in `.references/system-prompt-skills-active/updated-4/`:

| File | Change |
|------|--------|
| `01-gagasan-skill.md` | Added EVIDENCE BREADTH rule after searchAcrossSources tool entry |
| `05-pendahuluan-skill.md` | Same |
| `06-tinjauan-literatur-skill.md` | Same |
| `09-diskusi-skill.md` | Same |
| `12-daftar-pustaka-skill.md` | Same |

These are the same 5 files that have exact source tools — the rule is placed right next to the tool it governs.

## Exact Instruction Added

Indented under the `searchAcrossSources` tool entry in each file's Function Tools > Allowed list:

```
  EVIDENCE BREADTH: Report retrieved evidence breadth honestly. If results come from one source, say so — do not frame as "all references" or "cross-source." Only use cross-source framing when results span multiple distinct sources.
```

## Why Instruction-Layer Fix Is Sufficient

1. The tool response includes `sourceId` per chunk — the model can distinguish single vs multi-source results from the retrieval output itself.
2. The overclaim is a wording/framing issue, not a data issue. The model has accurate data; it just presents it misleadingly.
3. Per CLAUDE.md architecture principle: "Skills (SKILL.md) provide intelligence. Quality judgment... and response composition rules belong in natural language skill instructions, not in code."
4. Adding code-level filtering (e.g., injecting a "breadth warning" into tool results) would violate the "tools are simple executors" principle.

## Overclaim Patterns Now Forbidden

The model must NOT use these framings when retrieval comes from a single source:
- "dari semua referensi yang tersimpan"
- "semua sumber menunjukkan"
- "berdasarkan seluruh referensi"
- "cross-source analysis reveals"
- "across all stored references"

The model MUST instead:
- State evidence comes from one source/reference when `uniqueSources=1`
- Only use "cross-source" / "across references" framing when results genuinely span multiple distinct sources
- Let the chunk `sourceId` values determine breadth, not assume breadth from tool name alone
