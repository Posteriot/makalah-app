# Context Compaction — Technical Design

## Problem Statement

Paper workflow spans 13 stages with potentially 100+ conversation messages. As context grows, risk of hallucination and inconsistency increases. Current mitigation (brute prune to 50 messages at 80% threshold) loses critical context without summarization.

Additionally, `paperMemoryDigest` field exists in DB and is populated on stage approval but is **never injected into AI prompts** — wasted investment.

## Design Principle

**Preserve maximum context for as long as possible. Compact only when approaching context window limits.**

```
0%────────────────────85%───────80%─────────100%
   Full context         │Compact  │Brute      │Window
   (no intervention)    │(smart)  │prune      │limit
                        │         │(existing) │
```

## Scope

- **Paper workflow**: 13-stage guided academic paper writing
- **General chat**: Non-paper conversations

## Current State Audit

### What's Working
1. **formatStageData** — smart windowing: last 3 completed stages get `ringkasanDetail`, rest get 280-char `ringkasan`. Cap 5 refs + 5 citations per stage.
2. **Context Budget Monitor** (`context-budget.ts`) — prunes to 50 messages when >80% threshold. Brute-force: no summarization.
3. **paperMemoryDigest** — schema exists, populated on stage approve (200 char per stage decision), but **never injected into prompts**.

### What's Not Working
| Problem | Impact | Worst at Stage |
|---------|--------|----------------|
| Message history grows monotonically | 100+ messages before pruning | Stage 10+ (Kesimpulan, Daftar Pustaka) |
| Pruning = brute cut | Loses critical early-stage discussions | Stage 8+ |
| Irrelevant chitchat stays in context | Token waste | All stages |
| Cross-stage context loss after prune | AI loses "why" behind Phase 1-2 decisions | Phase 4-5 |
| paperMemoryDigest unused | Already built but not leveraged | All |

### Token Budget Reality Check

Typical paper session at stage 10+:

| Component | Chars | Tokens (÷4) |
|-----------|------:|------------:|
| System prompts (base + paper mode) | ~10K | ~2,500 |
| Stage instructions | ~5K | ~1,250 |
| formatStageData (10 completed stages) | ~8K | ~2,000 |
| Artifacts (10 sections × 500 char cap) | ~5K | ~1,250 |
| Conversation messages (150 msgs × 500 char avg) | ~75K | ~18,750 |
| Web refs + citations | ~3K | ~750 |
| **TOTAL (worst case)** | **~106K** | **~26,500** |

With Gemini 2.5 Flash (1M context) this is ~2.6% usage. With 128K default window, ~20%.

**In most sessions, compaction will NOT trigger.** This is intentional — full context = best quality.

---

## Threshold Configuration

```typescript
COMPACTION_TRIGGER = 0.85  // 85% of context window
BRUTE_PRUNE_TRIGGER = 0.80 // existing safety net (no change)
```

- Configurable via `aiProviderConfigs` (same pattern as `primaryContextWindow`)
- 15% headroom after compaction = enough for 1-2 more exchange rounds before re-trigger
- Existing 80% brute prune remains as last-resort safety net

---

## Compaction Priority Chain

When estimated tokens > 85% of context window, run priorities **sequentially**. Stop as soon as tokens drop below 85%.

```
┌─────────────────────────────────────────────┐
│         COMPACTION PRIORITY CHAIN            │
│                                              │
│  P1: Strip chitchat messages                 │
│      ↓ still > 85%?                          │
│  P2: Compact oldest completed stages         │
│      ↓ still > 85%?                          │
│  P3: LLM summarize mid-conversation          │
│      ↓ still > 85%?                          │
│  P4: Compact recent completed stages         │
│      ↓ still > 85%?                          │
│  P5: Brute prune (existing, 80% threshold)   │
└─────────────────────────────────────────────┘
```

Each priority re-estimates tokens after execution.

### P1: Strip Chitchat Messages

**Applies to:** Paper mode + General chat

Remove low-information user messages from context:
- User messages < 15 chars that are NOT questions and NOT commands
- Keep assistant responses (they contain substance)
- Only strip user-side confirmations ("ok", "ya", "lanjut", etc.)

```typescript
function isChitchat(msg: Message): boolean {
  if (msg.role !== "user") return false
  if (msg.content.length > 50) return false
  const text = msg.content.trim().toLowerCase()
  return text.length < 15 && !text.includes("?") && !text.includes("!")
}
```

**Estimated savings:** ~5-15% message count

### P2: Compact Oldest Completed Stages (Paper Only)

**Applies to:** Paper mode only

For **oldest completed stages** (from beginning, not recent):
- Exclude raw conversation messages belonging to that stage
- Replace with `paperMemoryDigest` entry (200 char per stage)

**Requires** `stageMessageBoundaries` — new field in `paperSessions`:

```typescript
stageMessageBoundaries: v.optional(v.array(v.object({
  stage: v.string(),
  firstMessageId: v.string(),
  lastMessageId: v.string(),
  messageCount: v.number(),
})))
```

Populated during `approveStage` mutation.

**Process:**
1. Sort completed stages oldest → newest
2. Exclude messages from oldest stage
3. Re-estimate tokens → still > 85%? Exclude next oldest stage
4. Stop when < 85%

**Estimated savings:** ~5K-10K chars per stage excluded

### P3: LLM Summarize Mid-Conversation

**Applies to:** Paper mode (current stage messages) + General chat

When P1-P2 insufficient (paper) or P1 insufficient (general chat):
- Take oldest N messages from remaining conversation
- LLM summarize via Gemini Flash → 3-5 bullet points (Indonesian)
- Replace with 1 system message `[RINGKASAN DISKUSI SEBELUMNYA]`

**Paper mode:** Summarize oldest messages **within current stage only** (completed stage messages already handled by P2)

**General chat:** Summarize oldest 20 messages from entire conversation

**Token cost per call:**
- Input: ~1,000-2,000 tokens (messages to summarize)
- Output: ~50-125 tokens (summary bullets)
- Total: ~1,100-2,125 tokens (~$0.0004)
- Frequency: rare — only when context genuinely full

**Fallback:** If LLM call fails → skip P3, continue to P4/P5

### P4: Compact Recent Completed Stages (Paper Only)

**Applies to:** Paper mode only

Same as P2 but now compact **more recent** stages. Last resort before brute prune.

Additionally, shrink `formatStageData` window:
- Normal: last 3 stages get `ringkasanDetail` (1000 char each)
- P4 active: **all** stages get `ringkasan` only (280 char each)

### P5: Brute Prune (Existing)

**Applies to:** All — existing code, unchanged

Keep last 50 messages, discard rest. Already implemented in `context-budget.ts`. Remains as final safety net.

---

## paperMemoryDigest Activation

Independent of compaction — always injected into prompt.

### Current State
- Schema exists in `paperSessions` table
- Populated on `approveStage`: 200-char `ringkasan` per stage
- Entries marked `superseded: true` on rewind
- **Never injected into AI prompts**

### Proposed Change

In `getPaperModeSystemPrompt()`, inject digest block:

```typescript
function formatMemoryDigest(digest: PaperMemoryEntry[]): string {
  if (!digest || digest.length === 0) return ""

  const entries = digest
    .filter(d => !d.superseded)
    .map(d => `- ${getStageLabel(d.stage)}: ${d.decision}`)
    .join("\n")

  return `MEMORY DIGEST (keputusan tersimpan per tahap):\n${entries}`
}
```

**When visible in prompt:** Always — even without compaction active. ~2.6K char max (200 char × 13 stages). Provides "memory anchor" that prevents AI inconsistency across stages.

**Quick win:** This can be shipped independently before the full compaction system.

---

## Data Flow Examples

### Paper Mode — Stage 8 (Hasil), Context Under 85%

```
Messages in DB: [msg1...msg150]
Estimated tokens: ~26,500 (20% of 128K)

→ Under 85% threshold
→ NO compaction triggered
→ Full context preserved + paperMemoryDigest injected
→ Best possible quality
```

### Paper Mode — Stage 10, Heavy Discussion, Context at 87%

```
Messages in DB: [msg1...msg220]
stageMessageBoundaries:
  gagasan:    msg1-msg18
  topik:      msg19-msg35
  outline:    msg36-msg48
  ...
  diskusi:    msg170-msg195
  kesimpulan: msg196-msg220 (current)

Estimated tokens: ~111,000 (87% of 128K) → TRIGGER

P1: Strip chitchat → removes 12 "ok"/"ya" messages → ~108,500 tokens (85%) → STOP

Result: Full context minus 12 chitchat messages. Quality barely affected.
```

### Paper Mode — Extreme Case, Context at 92%

```
Estimated tokens: ~117,800 (92% of 128K) → TRIGGER

P1: Strip chitchat → ~115,000 tokens (90%) → still > 85%
P2: Compact gagasan (msg1-msg18) → ~112,000 tokens (87.5%) → still > 85%
P2: Compact topik (msg19-msg35) → ~108,000 tokens (84%) → STOP

Result: Stages 1-2 replaced by paperMemoryDigest entries.
Stages 3+ still have full messages. Current stage untouched.
```

### General Chat — 80 Messages, Context at 86%

```
Messages in DB: [msg1...msg80]
Not paper mode → P2/P4 skipped

P1: Strip chitchat → removes 6 messages → ~84% → STOP

Result: 74 messages, minor chitchat removed.
```

### General Chat — 120 Messages, Context at 91%

```
P1: Strip chitchat → ~88% → still > 85%
P3: LLM summarize oldest 20 messages → 1 summary system message → ~82% → STOP

Result: 1 summary + 94 recent messages.
```
