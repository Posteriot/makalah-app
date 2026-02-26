# Context Compaction — Integration Plan

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    chat/route.ts                          │
│                                                           │
│  ① Load messages from DB (existing)                       │
│  ② Build fullMessagesBase (existing)                      │
│     └─ Paper mode: now includes paperMemoryDigest (NEW)   │
│  ③ Estimate total tokens (existing context-budget.ts)     │
│  ④ ── NEW ── Compaction Layer                             │
│     │  if tokens > 85%:                                   │
│     │    P1: stripChitchat(messages)                      │
│     │    re-estimate → still > 85%?                       │
│     │    P2: compactOldestStages(session) [paper only]    │
│     │    re-estimate → still > 85%?                       │
│     │    P3: llmSummarize(oldestMessages)                 │
│     │    re-estimate → still > 85%?                       │
│     │    P4: compactRecentStages(session) [paper only]    │
│     │                                                     │
│  ⑤ Context Budget Check — 80% brute prune (existing)      │
│  ⑥ streamText (existing)                                  │
└──────────────────────────────────────────────────────────┘
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/ai/context-compaction.ts` | Core compaction logic: `runCompactionChain()`, `stripChitchat()`, `compactStageMessages()`, `llmSummarize()` |
| `src/lib/ai/compaction-prompts.ts` | LLM summarization prompt templates (paper mid-stage + general chat) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/ai/paper-mode-prompt.ts` | Add `formatMemoryDigest()`, inject `paperMemoryDigest` into system prompt |
| `src/app/api/chat/route.ts` | Insert compaction layer between token estimation (step ③) and brute prune (step ⑤) |
| `convex/paperSessions.ts` | Record `stageMessageBoundaries` in `approveStage` mutation |
| `convex/schema.ts` | Add `stageMessageBoundaries` field to `paperSessions` table |
| `src/lib/ai/context-budget.ts` | Export `COMPACTION_TRIGGER = 0.85` constant |

## Files NOT Changed

| File | Reason |
|------|--------|
| `src/lib/ai/paper-stages/formatStageData.ts` | Already optimal, P4 shrinks window dynamically without modifying this file |
| `src/lib/ai/paper-tools.ts` | AI tools unaffected |
| `src/lib/ai/paper-search-helpers.ts` | Search decisions unaffected |
| `convex/messages.ts` | Messages table untouched — messages remain intact in DB |
| All UI components | Zero visible change for user |

## Schema Change

In `convex/schema.ts`, add to `paperSessions` table:

```typescript
stageMessageBoundaries: v.optional(v.array(v.object({
  stage: v.string(),
  firstMessageId: v.string(),
  lastMessageId: v.string(),
  messageCount: v.number(),
}))),
```

This records which messages belong to which stage. Populated during `approveStage`. No migration needed — field is optional and additive.

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Compaction chain still > 85% after P4 | P5 brute prune handles it (existing, unchanged) |
| LLM summarization fail (P3) | Skip P3, continue to P4 → P5 |
| User rewind stage | `stageMessageBoundaries` remains valid — compaction re-evaluates at runtime |
| Very short session (< 85%) | Nothing happens — full context preserved |
| Admin changes context window at runtime | Threshold auto-recalculates from `getContextWindow()` |
| General chat (no paper session) | P2/P4 skipped, only P1 + P3 + P5 apply |
| Paper session resume after long pause | `paperMemoryDigest` + `stageData` provide recovery context |
| User edit message in compacted range | Not possible — paper edit rules block editing > 2 turns back |
| General chat: user deletes message | Summary may be stale — harmless, recomputed next request |
| Short stage (< 5 messages) | Boundary recorded, but exclusion saves minimal tokens — chain moves to next priority |

## Rollout Strategy

### Phase 1: paperMemoryDigest Activation (Quick Win)

**Zero risk, immediate value.**

1. Modify `paper-mode-prompt.ts` to inject `paperMemoryDigest`
2. No schema change needed — data already populated
3. Provides "memory anchor" for AI across stages
4. Can ship independently before full compaction

### Phase 2: Compaction Infrastructure

1. Add `stageMessageBoundaries` to schema
2. Record boundaries in `approveStage` mutation
3. Create `context-compaction.ts` with `runCompactionChain()`
4. Create `compaction-prompts.ts` for LLM summarization templates
5. Export `COMPACTION_TRIGGER` from `context-budget.ts`

### Phase 3: Integration

1. Wire compaction layer into `chat/route.ts`
2. Add console logging for compaction events (for monitoring)
3. Test with synthetic long conversations

### Phase 4: Monitoring & Tuning

1. Monitor compaction frequency in production logs
2. Tune thresholds if needed (85% trigger, P1 char limits, P3 message count)
3. Consider adding compaction metrics to admin panel

## Observability

All compaction events logged to console with `[Context Compaction]` prefix:

```
[Context Compaction] Triggered: 111,000 tokens (87% of 128K)
[Context Compaction] P1: Stripped 12 chitchat messages → 108,500 tokens (85%)
[Context Compaction] Complete: resolved at P1
```

Or for deeper compaction:

```
[Context Compaction] Triggered: 117,800 tokens (92% of 128K)
[Context Compaction] P1: Stripped 8 messages → 115,000 tokens (90%)
[Context Compaction] P2: Compacted stage gagasan (18 msgs) → 112,000 tokens (87.5%)
[Context Compaction] P2: Compacted stage topik (17 msgs) → 108,000 tokens (84%)
[Context Compaction] Complete: resolved at P2 (2 stages compacted)
```

## LLM Summarization Details (P3)

### Model
Gemini 2.5 Flash via existing Gateway (`getGatewayModel("flash")`)

### Prompt Template (Paper Mid-Stage)
```
Ringkas diskusi berikut jadi 3-5 bullet points dalam bahasa Indonesia.
Fokus pada:
- Keputusan yang disepakati user dan AI
- Referensi atau data yang dibahas
- Request user yang belum diselesaikan
- Perubahan/revisi yang diminta

Konteks: Tahap paper "{stageName}" sedang berlangsung.
Max 500 karakter total.
```

### Prompt Template (General Chat)
```
Ringkas percakapan berikut jadi 3-7 bullet points dalam bahasa Indonesia.
Fokus pada:
- Topik utama yang dibahas
- Keputusan atau kesepakatan
- File yang di-upload atau dibahas
- Request yang belum selesai

Max 500 karakter total.
```

### Fallback
If LLM call fails (timeout, rate limit, error):
- Skip P3 entirely
- Log warning: `[Context Compaction] P3 LLM summarization failed: {error}. Skipping.`
- Continue to P4/P5
- No user-facing degradation

### Cost Estimate
- Per call: ~1,100-2,125 tokens (~$0.0004)
- Per paper session (worst case 3-4 triggers): ~$0.001 (~Rp 20)
- Per general chat trigger: ~$0.0004
- Negligible impact on billing
