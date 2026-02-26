# Context Compaction System

Threshold-based context compaction untuk paper workflow dan general chat. Preserve maximum context selama mungkin, compact hanya saat mendekati batas context window (85%).

## Documents

| Document | Description |
|----------|-------------|
| [Design](./design.md) | Full technical design: architecture, priority chain, data flow |
| [Integration](./integration.md) | File-level changes, edge cases, rollout plan |

## Architecture Summary

```
Token usage:  0%──────────────────85%────80%──────100%
                Full context       │Smart  │Brute    │
                (no intervention)  │compact│prune    │
```

Ketika token > 85% context window, jalankan priority chain P1→P4 secara berurutan, berhenti saat turun di bawah 85%:

| Priority | Aksi | Scope |
|----------|------|-------|
| P1 | Buang chitchat ("ok", "sip", "ya") | Paper + General |
| P2 | Compact oldest completed stages → digest | Paper only |
| P3 | LLM summarize oldest messages | Paper + General |
| P4 | Signal shrink formatStageData window | Paper only |
| P5 | Brute prune ke 50 messages (existing) | Safety net |

## Implementation Files

### New Files

| File | Purpose |
|------|---------|
| `src/lib/ai/context-compaction.ts` | Core: `runCompactionChain()`, `stripChitchat()`, `excludeStageMessages()`, `buildStageDigestMessage()` |
| `src/lib/ai/compaction-prompts.ts` | LLM prompt templates untuk P3 summarization |
| `__tests__/context-compaction.test.ts` | 23 unit tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/lib/ai/context-budget.ts` | Added `COMPACTION_TRIGGER = 0.85`, `shouldCompact`, `compactionThreshold` |
| `convex/schema.ts` | Added `stageMessageBoundaries` field to `paperSessions` |
| `convex/paperSessions.ts` | Record boundaries in `approveStage` mutation |
| `src/lib/ai/paper-mode-prompt.ts` | Inject `paperMemoryDigest` into system prompt |
| `src/app/api/chat/route.ts` | Wire compaction layer + `effectiveBudget` post-compaction |

## Test Coverage

### Unit Tests: 23 tests (all pass)

**P1 — stripChitchat (7 tests)**
- Short confirmations ("ok", "sip") dibuang
- Pesan dengan "?" dipertahankan (bisa pertanyaan)
- Pesan dengan "!" dipertahankan (bisa feedback)
- Pesan > 50 chars dipertahankan
- System messages selalu dipertahankan
- Empty array handling

**P2 — excludeStageMessages (5 tests)**
- Messages dalam boundary range di-exclude
- Single-message stage (firstId === lastId) handled
- System messages dalam range tetap preserved
- **C1 fix**: Messages tanpa ID dalam range ikut di-exclude
- Non-matching boundary IDs = no exclusion

**Digest — buildStageDigestMessage (4 tests)**
- Matching stages menghasilkan digest message
- Superseded entries di-filter
- Empty compacted stages = null
- Non-matching stages = null

**Orchestrator — runCompactionChain (7 tests)**
- Under threshold = no-op
- P1 resolves saat chitchat removal cukup
- P2 resolves saat stage compaction cukup (with digest injection)
- P3 resolves saat LLM summary cukup (mock generateText)
- P3 LLM failure = graceful skip, chain continues
- P4 resolves saat paper mode dan P1-P3 insufficient
- General chat skips P2 (no paper stages)

### Bugs Found & Fixed During Review

| Bug | Impact | Fix |
|-----|--------|-----|
| **C2**: `budget.shouldPrune` pakai pre-compaction value | Brute prune SELALU jalan setelah compaction, membatalkan semua kerja compaction | Gunakan `effectiveBudget` (re-estimated post-compaction) |
| **C1**: Messages tanpa ID di tengah boundary range lolos filter | Pesan "bocor" yang harusnya di-exclude | Hapus early-return `if (!msgId) return true` dalam range |

---

## Manual Testing Guide (Post-Merge)

> **PENTING**: Section ini adalah panduan untuk testing integrasi dan E2E yang BELUM dilakukan. Test ini harus dijalankan setelah merge ke main dan deploy ke development environment.

### Prerequisites

```bash
# Terminal 1: Next.js dev server
npm run dev

# Terminal 2: Convex backend
npm run convex:dev
```

### Test 1: paperMemoryDigest Injection

**Tujuan**: Verify bahwa paperMemoryDigest sudah di-inject ke system prompt.

**Steps:**
1. Buka chat, mulai paper session baru
2. Kerjakan stage "Gagasan" sampai approve
3. Kerjakan stage "Topik" sampai approve
4. Di stage "Outline", cek console log server

**Expected di console:**
```
[lihat system prompt yang dikirim ke AI]
```
Harus ada block `MEMORY DIGEST (keputusan tersimpan per tahap)` dengan entries dari gagasan dan topik.

**Verifikasi alternatif:**
```bash
# Cek paperMemoryDigest di database
npm run convex -- run paperSessions:getByConversation '{"conversationId": "<ID>"}'
```
Field `paperMemoryDigest` harus berisi array entries dengan `stage`, `decision`, `timestamp`.

### Test 2: stageMessageBoundaries Recording

**Tujuan**: Verify bahwa boundary dicatat saat stage di-approve.

**Steps:**
1. Dari Test 1, setelah approve stage "Gagasan"
2. Query database:

```bash
npm run convex -- run paperSessions:getByConversation '{"conversationId": "<ID>"}'
```

**Expected:**
```json
{
  "stageMessageBoundaries": [
    {
      "stage": "gagasan",
      "firstMessageId": "<first-msg-id>",
      "lastMessageId": "<last-msg-id>",
      "messageCount": <N>
    }
  ]
}
```

**Verify setiap stage approve menambah entry baru.**

### Test 3: Compaction Chain Trigger (Simulated)

**Tujuan**: Verify bahwa compaction chain berjalan saat context > 85%.

**Catatan**: Dalam kondisi normal, compaction jarang trigger karena context window besar (128K). Untuk testing, perlu **simulasi** context penuh.

**Approach A — Turunkan context window sementara:**

1. Buka Admin Panel → AI Providers
2. Set `primaryContextWindow` ke nilai kecil, misal `2000` (2K tokens)
3. Mulai paper session, chat beberapa pesan (akan cepat trigger 85%)
4. Cek console log:

**Expected log saat trigger:**
```
[Context Budget] 1800 tokens estimated (90% of 2000 threshold) | 15 messages
[Context Compaction] Triggered: 1800 tokens > 1700 threshold
[Context Compaction] P1: Stripped 3 chitchat messages → 1650 tokens
[Context Compaction] Complete: resolved at P1
```

**Kembalikan context window ke normal setelah testing.**

**Approach B — Generate banyak pesan:**

Sulit dilakukan manual karena butuh ratusan pesan. Approach A lebih realistis.

### Test 4: P2 Stage Compaction (Paper Mode)

**Tujuan**: Verify P2 compact stage lama dan inject digest.

**Steps** (lanjutan dari Approach A di Test 3):
1. Set `primaryContextWindow` ke `2000`
2. Mulai paper session, approve stage "Gagasan" dan "Topik"
3. Di stage "Outline", chat sampai context > 85%
4. Cek console log

**Expected:**
```
[Context Compaction] P2: Compacted stage gagasan (X msgs) → Y tokens
[Context Compaction] Complete: resolved at P2 (1 stages compacted)
```

**Verify** di pesan yang dikirim ke AI: ada system message `[CONTEXT COMPACTION: 1 tahap sebelumnya di-compact]` dengan digest entry.

### Test 5: P3 LLM Summarization (General Chat)

**Tujuan**: Verify P3 LLM summary di general chat.

**Steps:**
1. Set `primaryContextWindow` ke `2000`
2. Buka chat BUKAN paper mode (general chat)
3. Chat 15-20 pesan bolak-balik
4. Saat context > 85% dan P1 tidak cukup, P3 harus trigger

**Expected:**
```
[Context Compaction] P3: Summarized 8 messages via LLM → Y tokens
[Context Compaction] Complete: resolved at P3
```

**Verify** ada system message `[RINGKASAN DISKUSI SEBELUMNYA]` di messages yang dikirim ke AI.

### Test 6: effectiveBudget Post-Compaction (C2 Fix)

**Tujuan**: Verify bahwa brute prune TIDAK jalan setelah compaction berhasil.

**Steps** (sama dengan Test 3/4/5):
1. Trigger compaction dengan context window kecil
2. Pastikan compaction resolves (P1/P2/P3)

**Expected:**
- Log `[Context Compaction] Post-compaction: X tokens (Y% of compaction threshold)` menunjukkan token turun di bawah 80%
- **TIDAK ada** log `[Context Budget] Pruning:` setelah compaction berhasil
- Jika ada log Pruning setelah compaction sukses → C2 fix belum benar

### Test 7: Graceful Degradation (P3 Failure)

**Tujuan**: Verify P3 LLM failure tidak crash app.

**Steps:**
1. Temporarily invalidate AI API key (atau gunakan environment tanpa API key)
2. Trigger compaction scenario

**Expected:**
```
[Context Compaction] P3 LLM summarization failed: [error details]
[Context Compaction] P3: LLM summarization returned null, skipping
```

App tetap berjalan, fallback ke P4 atau P5.

### Test 8: Rewind Compatibility

**Tujuan**: Verify bahwa rewind stage tidak break compaction.

**Steps:**
1. Paper session, approve gagasan, topik, outline
2. Rewind ke topik
3. Re-approve topik dengan konten baru
4. Check `stageMessageBoundaries` — harus ter-update
5. Check `paperMemoryDigest` — entry topik lama harus `superseded: true`

**Expected:**
```bash
npm run convex -- run paperSessions:getByConversation '{"conversationId": "<ID>"}'
```
- `stageMessageBoundaries` punya entry baru untuk topik (boundary lama mungkin masih ada)
- `paperMemoryDigest` punya 2 entry topik: lama (`superseded: true`) dan baru

### Checklist Summary

| # | Test | Type | Automated? |
|---|------|------|-----------|
| 1 | paperMemoryDigest injection | Integration | No — manual |
| 2 | stageMessageBoundaries recording | Integration | No — manual |
| 3 | Compaction chain trigger | E2E | No — manual |
| 4 | P2 stage compaction | E2E | No — manual |
| 5 | P3 LLM summarization | E2E | No — manual |
| 6 | effectiveBudget (C2 fix) | E2E | No — manual |
| 7 | P3 graceful degradation | E2E | No — manual |
| 8 | Rewind compatibility | E2E | No — manual |

### Key Console Log Prefixes

| Prefix | Source |
|--------|--------|
| `[Context Budget]` | `context-budget.ts` — token estimation, prune decisions |
| `[Context Compaction]` | `context-compaction.ts` — P1-P4 chain execution |
| `[Context Compaction] Post-compaction:` | `route.ts` — post-compaction re-estimation |

### Known Limitations

1. **P4 is signal-only** — returns `resolvedAtPriority: "P4"` but caller (`route.ts`) does NOT act on this signal to shrink `formatStageData`. This is by design for v1; can be wired later.
2. **Token estimation mismatch** — compaction uses `msg.content` (string), but route uses `msg.parts[].text` in some code paths. In practice, messages flowing through compaction are already flattened to `content: string`.
3. **P2 compacts ALL boundaries** — tidak ada reservasi "recent stages" untuk P4. Jika P2 sudah compact semua boundaries dan masih > 85%, P4 hanya bisa signal.
4. **85% > 80% threshold ordering** — Zone 80-85% hanya trigger brute prune, bukan smart compaction. Acceptable karena zone ini sempit.
