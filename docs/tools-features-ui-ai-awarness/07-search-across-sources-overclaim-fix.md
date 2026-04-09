# Fix Report: searchAcrossSources Evidence Breadth Overclaim

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`
Revision: v4 (added exact metadata discipline + restatement scope preservation after v3 still failed on metadata inference and "answer fresh" overclaim)

---

## Root Cause

When `searchAcrossSources` returns chunks from only 1 unique source, the model frames its response as if evidence spans "all stored references" or "cross-source findings." This is misleading — the model overclaims breadth of evidence beyond what the retrieval actually covers.

This is not a tool execution bug. The tool correctly returns `sourceId` per chunk. The problem is the model's response composition: it does not distinguish between single-source and multi-source retrieval results when wording its answer.

**Additional finding (v2):** The overclaim also appears in follow-up turns when the model restates previous findings. Even after direct tool output is correctly scoped, the model widens its framing in subsequent summaries and restatements. This means the fix must govern general response composition, not just immediate tool-call output.

## Files Changed

5 stage skill files in `.references/system-prompt-skills-active/updated-4/`:

| File | Change |
|------|--------|
| `01-gagasan-skill.md` | Added tool-adjacent EVIDENCE BREADTH note + general EVIDENCE BREADTH HONESTY guardrail |
| `05-pendahuluan-skill.md` | Same |
| `06-tinjauan-literatur-skill.md` | Same |
| `09-diskusi-skill.md` | Same |
| `12-daftar-pustaka-skill.md` | Same |

## Fix Layer 1: Tool-Adjacent Note (retained from v1)

Indented under the `searchAcrossSources` tool entry in Function Tools > Allowed list:

```
  EVIDENCE BREADTH: Report retrieved evidence breadth honestly. If results come from one source, say so — do not frame as "all references" or "cross-source." Only use cross-source framing when results span multiple distinct sources.
```

**Purpose:** Catches the model right at the moment of tool usage. Effective for immediate tool-call responses.

**Why insufficient alone:** The model also overclaims when restating previous findings in follow-up turns — the tool-adjacent note is not visible in those turns because the model is composing from memory/context, not from a fresh tool call.

## Fix Layer 2: General Guardrail (added in v2)

Added to Guardrails section (after SOURCE-BODY PARITY, before Done Criteria) in all 5 files:

```
- EVIDENCE BREADTH HONESTY: Never claim breadth beyond retrieved evidence. Do not say "all references", "all stored sources", or equivalent broad framing unless evidence explicitly spans multiple distinct sources. If evidence comes from one source or one dominant source, state that limitation. When restating a previous summary in follow-up turns, preserve the original evidence scope — do not widen it. If breadth is uncertain, use narrower wording.
```

**Purpose:** Governs all response composition — not just tool-call output but also follow-up summaries, restatements, and any turn where the model refers to stored references.

**Why Guardrails section:** This section already governs response discipline (SOURCE-BODY PARITY, REVISION CONTRACT, CHAT OUTPUT AFTER ARTIFACT rules). Evidence breadth honesty is the same category — response composition integrity.

## Why Instruction-Layer Fix Is Sufficient

1. The tool response includes `sourceId` per chunk — the model can distinguish single vs multi-source results from the retrieval output itself.
2. The overclaim is a wording/framing issue, not a data issue. The model has accurate data; it just presents it misleadingly.
3. Per CLAUDE.md architecture principle: "Skills (SKILL.md) provide intelligence. Quality judgment... and response composition rules belong in natural language skill instructions, not in code."
4. Adding code-level filtering would violate the "tools are simple executors" principle.

## Overclaim Patterns Now Forbidden

The model must NOT use these framings when evidence is narrow/single-source:
- "dari semua referensi yang tersimpan"
- "semua sumber menunjukkan"
- "berdasarkan seluruh referensi"
- "referensi yang ada" (when implying completeness)
- "cross-source analysis reveals"
- "across all stored references"

The model MUST instead:
- State evidence comes from one source/reference when coverage is single-source
- Only use "cross-source" / "across references" framing when results genuinely span multiple distinct sources
- Preserve evidence scope when restating — do not widen in follow-up turns
- Use narrower wording when breadth is uncertain

---

## v3: Opening Sentence Framing Guardrail

### Why v2 Still Failed

Runtime test-5 showed that with v2's general EVIDENCE BREADTH HONESTY rule in Guardrails:
- The model sometimes acknowledged the limitation (e.g., "sebagian besar temuan berasal dari satu sumber utama") — improvement from v1
- But the **opening/summary sentence** still used broad framing ("dari semua referensi yang sudah tersimpan") before narrowing later in the paragraph
- The general rule governed overall composition but did not specifically constrain the **lead sentence**, which is the part users read first and forms their impression of evidence quality

The problem is positional: a general "don't overclaim" rule lets the model open broad and narrow later. The fix must specifically target the first sentence.

### What Was Added (Fix Layer 3)

Added OPENING SENTENCE FRAMING rule to Guardrails section in 5 skill files (01, 05, 06, 09, 12), immediately after EVIDENCE BREADTH HONESTY:

```
- OPENING SENTENCE FRAMING: When evidence is single-source or dominated by one source, the FIRST sentence of your response must reflect that limitation immediately. Do not open with broad framing ("all references", "all stored sources", "the stored references show", "berdasarkan semua referensi") unless coverage truly spans multiple distinct sources. If one source dominates, open with narrower wording (e.g., "Based mainly on one stored source..." or equivalent). The limitation must appear in the lead sentence, not buried later in the paragraph. Restatements in follow-up turns must preserve this narrow framing from the first sentence onward.
```

### Why This Is Needed Beyond General Breadth Honesty

| Layer | What it governs | Failure mode it prevents |
|-------|----------------|------------------------|
| Layer 1 (tool-adjacent) | Immediate response after searchAcrossSources call | Overclaim right after tool returns |
| Layer 2 (general guardrail) | All response composition including follow-up turns | Overclaim in restatements and summaries |
| Layer 3 (opening sentence) | First sentence / lead framing specifically | Broad opening followed by late narrowing |

Layer 3 is the most operationally specific — it tells the model exactly WHERE the limitation must appear (first sentence), not just THAT it must appear somewhere.

### Three-Layer Fix Summary (v3)

All three layers are now active in 5 skill files:
1. **Tool-adjacent** EVIDENCE BREADTH (Function Tools section) — catches at tool call moment
2. **General** EVIDENCE BREADTH HONESTY (Guardrails section) — catches across all turns
3. **Positional** OPENING SENTENCE FRAMING (Guardrails section) — catches broad-opening pattern specifically

---

## v4: Exact Metadata Discipline + Restatement Scope Preservation

### Why v3 Still Failed

Runtime test-6 exposed two regressions that v3 layers did not cover:

**Regression 1 — Exact metadata inference:** User asked for exact metadata about a specific source. Terminal log showed no `[EXACT-SOURCE] inspectSourceDocument` call. But the model answered with author name and year, acknowledging some came from "judul internal." The model inferred metadata from context (URL shape, citation-style text, prior prose) instead of calling the exact inspection tool. v1-v3 rules only governed breadth framing — they did not govern metadata sourcing discipline.

**Regression 2 — Restatement scope widening:** When user prompted "lupakan jawaban sebelumnya, jawab baru", the model treated this as permission to reframe evidence more broadly. Opening sentence reverted to "dari semua referensi yang sudah tersimpan" despite the underlying evidence being single-source. v3's OPENING SENTENCE FRAMING rule was specific to evidence scope, but did not explicitly address "answer fresh" prompts that the model interprets as license to reset framing.

### What Was Added (Fix Layers 4 & 5)

Both added to Guardrails section in 5 skill files (01, 05, 06, 09, 12), after OPENING SENTENCE FRAMING:

**Layer 4 — EXACT METADATA DISCIPLINE:**
```
- EXACT METADATA DISCIPLINE: When the user asks for exact metadata about a specific source (author, title, published date, site name, document kind), you MUST call inspectSourceDocument to retrieve it. Only present metadata fields that are returned by the inspection result. If a field is missing from the result, say it is unavailable. Do NOT infer exact metadata from URL shape, citation-style text, prior summaries, prior prose, internal titles, or guessed bibliography formatting. Approximate or inferred metadata must NEVER be presented as exact metadata.
```

**Layer 5 — RESTATEMENT SCOPE PRESERVATION:**
```
- RESTATEMENT SCOPE PRESERVATION: A request to restate, rewrite, answer fresh, or ignore previous wording does NOT authorize widening evidence scope. The model must preserve the same evidence limitation from the original answer unless new evidence is actually retrieved in the current turn. "Answer again" means rewrite the wording, not expand evidence coverage. Do not treat restatement prompts as permission to frame evidence more broadly.
```

### Why These Are Instruction-Layer, Not Code-Layer

1. **Metadata discipline:** The `inspectSourceDocument` tool already exists and works correctly. The model simply chooses not to call it when it thinks it can infer the answer. The fix is behavioral guidance, not missing tool capability.
2. **Restatement scope:** The model's follow-up restatement behavior is a response composition pattern. No code change can prevent the model from choosing broader wording — only instruction can govern this.
3. Per CLAUDE.md: "Quality judgment... and response composition rules belong in natural language skill instructions, not in code."

### Five-Layer Fix Summary

All five layers now active in 5 skill files:

| Layer | Rule name | Location | What it governs |
|-------|-----------|----------|----------------|
| 1 | EVIDENCE BREADTH | Function Tools section | Immediate tool-call output |
| 2 | EVIDENCE BREADTH HONESTY | Guardrails section | General response composition |
| 3 | OPENING SENTENCE FRAMING | Guardrails section | Lead sentence framing |
| 4 | EXACT METADATA DISCIPLINE | Guardrails section | Metadata sourcing — must use inspectSourceDocument |
| 5 | RESTATEMENT SCOPE PRESERVATION | Guardrails section | "Answer fresh" / rewrite prompts — preserve scope |
