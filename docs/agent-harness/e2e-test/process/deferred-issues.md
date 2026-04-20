# Deferred Issues — E2E Testing

Issues yang ditabung untuk di-investigasi/patch di sesi terpisah setelah ada cukup data.

## 1. Tavily Fallback — RESOLVED (bukan masalah sistemik)

- **Ditemukan di:** Stage 1 (gagasan), round 1
- **Update round 3:** Tavily 6/7 sukses. Kegagalan di round 1 (0/3) disebabkan URL spesifik yang memang non-scrapeable, bukan masalah integrasi Tavily.
- **Status:** CLOSED — monitor pasif saja

## 2. Google Grounding 0 Citations — Intermittent

- **Ditemukan di:** Stage 1 (gagasan), round 2 dan round 3
- **Status:** OPEN — diagnostic logging added, menunggu data dari failure berikutnya
- **Update 2026-04-20:** Investigasi mendalam dilakukan. Handoff sebelumnya menyebut "model tidak consistently call google_search tool." Ternyata salah — log menunjukkan model return **empty response** (0 chars text, 0 metadata keys), bukan "skip search."

### Yang sudah disingkirkan
1. ~~Rate limiting~~ — usage 21/10K RPD (0.2%)
2. ~~SDK version mismatch~~ — sama `3.0.34` di main dan agent-harness
3. ~~Model ID format salah~~ — DB value `gemini-2.5-flash` → `models/gemini-2.5-flash` (benar)
4. ~~MODE_DYNAMIC/dynamicThreshold~~ — SDK **mengabaikan** parameter ini untuk Gemini 2.0+ (hardcode `{ googleSearch: {} }` di line 700 `@ai-sdk/google/dist/index.js`)
5. ~~retrieverMaxTokens~~ — sama 4096 di kedua branch
6. ~~Message format~~ — test standalone multi-turn berhasil 35 sources
7. ~~API key~~ — test standalone pakai key yang sama, berhasil

### Test results
- Test standalone (direct call): 19 sources (single-turn), 35 sources (multi-turn)
- Test UI (test-8): GG berhasil — 42 groundingChunks, 20 citations
- Kegagalan intermittent, tidak bisa diprediksi

### Diagnostic log ditambahkan
Di `orchestrator.ts`, saat GG return 0 citations sekarang log: `finishReason`, `usageSnapshot` (input/output tokens), `responseHeaders`, `modelId`, `hasApiKey`, `apiKeyPrefix`, `messageCount`, `messageRoles`, `lastUserMsgChars`, `samplingOptions`, `textPreview`.

### Next step
Tunggu GG gagal lagi. Diagnostic log akan otomatis capture data untuk determine root cause (thinking budget exhaustion, silent API error, atau transient issue).

## 3. FetchWeb Timeout untuk Domain Jurnal — FIXED

- **Ditemukan di:** Stage 1 (gagasan), round 2 dan round 3
- **Status:** FIXED (2026-04-20)
- **Koreksi:** Handoff bilang spesifik `.ac.id`. Log test-7 membuktikan mixed TLD — `.ac.id`, `.id`, `.org` semua bisa timeout. Sementara `stkipsubang.ac.id` justru berhasil (1349ms).
- **Fix:** Tambah route kind `journal_direct_tavily` di `content-fetcher.ts`. Domain jurnal (hostname mengandung `journal`/`jurnal`/`ejournal`, atau TLD `.ac.id`/`.sch.id`) → skip primary fetch 5s, langsung Tavily.
- **Impact:** Hemat ~5s per URL jurnal yang sebelumnya timeout di primary fetch.
- **Files:** `src/lib/ai/web-search/content-fetcher.ts`, `src/lib/ai/web-search/reference-presentation.ts`

## 4. Latency & Robustness (dari Round 2)

### Item 1: Query/result delivery latency 20-53s — OPEN
Pipeline sequential. Fix opsi: streaming status indicators (UX) atau parallel Phase 1 + 1.5 (complex). Terkait Issue 2.

### Item 2: Stream gap 16.7s — NOT A BUG
Model thinking time. Inherent behavior, tidak bisa difix.

### Item 3: submitStageForValidation before artifact ready — LOW PRIORITY
Auto-rescue handles it. Bekerja sebagaimana mestinya.

### Item 4: Recovery leakage — ALREADY FIXED
`sanitizeChoiceOutcome()` + `streamContentOverrideRef` sudah handle.

### Item 5: Artifact ordering verdict=reversed — OPEN (low priority)
Artifact tool completes sebelum text stream closes. Butuh client-side compensation. UX polish.

### Item 6: Skeleton flicker — FIXED
- **Status:** FIXED (2026-04-20)
- **Root cause:** `isAwaitingAssistantStart` stays `true` jika auto-send tidak fire. Hanya di-reset saat `status === "submitted"|"streaming"|"error"`, tidak saat `"ready"` (by design).
- **Fix:** Tambah `useEffect` yang reset flag saat conversation loaded dan messages ada.
- **File:** `src/components/chat/ChatWindow.tsx`

### Item 7: Plan task count shift — NOT A BUG
Model refines plan mid-turn. Expected behavior.

---

*File ini akan di-update seiring e2e testing berlanjut.*
