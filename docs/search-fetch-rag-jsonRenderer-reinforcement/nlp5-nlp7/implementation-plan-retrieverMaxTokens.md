# Implementation Plan: Set `retrieverMaxTokens` (NLP-4b)

> Priority 1 dari NLP-5/NLP-7 rekomendasi
> Tanggal: 2026-03-26
> Ref: `context.md` — verified analysis

---

## Problem Statement

Retriever Phase 1 di `orchestrator.ts` menunggu `await searchResult.text` (full text generation) sebelum extract sources. Text output retriever **hampir selalu tidak dipakai** di compose phase:

- `buildSearchResultsContext()` di `search-results-context.ts:77-85` **hanya gunakan `searchText` kalau FetchWeb gagal total** (semua source tanpa `pageContent`). Kalau ≥1 source punya `pageContent`, `searchText` di-drop entirely.
- Sources diambil dari `providerMetadata` (grounding chunks), **bukan dari text output**.
- Artinya: retriever text generation adalah waste di >90% cases (FetchWeb biasanya berhasil untuk ≥1 source).

**Edge case**: Kalau FetchWeb gagal total (semua 7 URL fail), `searchText` dipakai sebagai fallback context di compose. Cap retriever tokens = shorter fallback text di scenario ini. Ini acceptable tradeoff karena: (a) full FetchWeb failure jarang, (b) shorter retriever text tetap usable.

Saat ini `retrieverMaxTokens` **tidak di-set** dari `route.ts`. Field sudah ada di interface (`types.ts:70`), orchestrator sudah support (`orchestrator.ts:262-264`), tapi caller tidak pass value.

**JSDoc discrepancy**: `types.ts:69` says "Defaults to 4096" tapi ini misleading — code di `orchestrator.ts:264` pakai falsy check (`config.retrieverMaxTokens ? ...`), artinya kalau undefined, **no maxTokens applied at all**. Model pakai default-nya sendiri (bisa sangat tinggi). Tidak ada actual default 4096 di code. Kita yang set 4096 untuk pertama kalinya.

Tanpa cap, Gemini generate panjang tanpa batas → stream finish lebih lambat → detect 0-citation lebih lambat → fallback ke retriever berikutnya lebih lambat.

## Expected Impact

- **Success case**: Retriever text generation selesai lebih cepat → Phase 1 total berkurang ~2-5s
- **0-citation failure case (NLP-7)**: Detect failure lebih cepat → fallback ke perplexity lebih cepat → total Phase 1 berkurang
- Cross-cutting benefit: affects both NLP-5 (less time wasted before FetchWeb) and NLP-7 (faster failure detection)

## Verified Code Path

```
route.ts:785-789      samplingOptions = {
                        temperature, topP?,
                        maxTokens? ← from providerSettings (may or may not be set)
                      }
                      ↓
route.ts:2214         executeWebSearch({ ..., samplingOptions, retrieverMaxTokens: 4096 })
                      ↓
orchestrator.ts:262   retrieverSamplingOptions = {
                        ...config.samplingOptions,            // spread first (may include maxTokens)
                        ...(config.retrieverMaxTokens         // then override — takes precedence
                          ? { maxTokens: config.retrieverMaxTokens }
                          : {}),
                      }
                      ↓
orchestrator.ts:267   streamText({ model, messages, ...retrieverSamplingOptions })
                      ↓
orchestrator.ts:309   await searchResult.text   // waits for ALL text — this is what we're capping
                      ↓
orchestrator.ts:327   extractSources()          // sources from providerMetadata, not text
                      ↓
orchestrator.ts:383   cleanSearchText = searchText.replace(proxy regex, "")
                      ↓
search-results-context.ts:83  searchText ONLY used if ALL sources lack pageContent
                              (FetchWeb total failure — rare edge case)
```

**Interaksi `samplingOptions.maxTokens` vs `retrieverMaxTokens`**: `samplingOptions` di-build di `route.ts:785-789` dan bisa berisi `maxTokens` dari `providerSettings`. Spread order di `orchestrator.ts:262-264` memastikan `retrieverMaxTokens` **selalu override** `samplingOptions.maxTokens` (kalau set). Ini correct behavior — retriever butuh cap lebih ketat dari compose.

**Scope**: `retrieverMaxTokens` applies ke **semua retrievers** dalam chain (google-grounding, perplexity, grok), bukan cuma google-grounding. Impact per-retriever bisa berbeda — perplexity mungkin generate lebih pendek secara natural. Monitor log per-retriever di runtime verification.

## Risk Assessment

Comment di `orchestrator.ts:260-261`:
> "Retriever can use lower maxTokens than compose — its text output gets dropped when page content is available. But don't set too low or Gemini skips tool calls."

**Risk**: Kalau `maxTokens` terlalu rendah, Gemini mungkin tidak call `google_search` tool karena model budget allocation internal. Tool calls consume tokens — kalau cap terlalu ketat, model skip tool call entirely.

**Mitigasi**: Start dengan 4096 tokens. Ini ~3000 words — lebih dari cukup untuk tool call output + brief summary. Kalau Gemini masih skip tool calls di 4096, naikkan ke 8192. Kalau di 4096 sudah aman, bisa turunkan ke 2048 di iterasi berikutnya.

**Validation signal**: Compare log lines sebelum dan sesudah:
- `[⏱ RETRIEVER] text_ready ... chars=N` — apakah N berkurang signifikan?
- `[⏱ RETRIEVER] summary ... citations=N` — apakah citation count tetap stabil (≥15 typical)?
- `[⏱ LATENCY] Phase1 ... total=Nms` — apakah total Phase 1 berkurang?

## Implementation Steps

### Step 1: Tambah `retrieverMaxTokens: 4096` di `route.ts` call site

**File**: `src/app/api/chat/route.ts`
**Location**: Line ~2214, di dalam `executeWebSearch({...})` call

**Perubahan**: Tambah satu field ke object yang di-pass:

```typescript
return await executeWebSearch({
    requestId,
    conversationId: currentConversationId as string,
    retrieverChain,
    tavilyApiKey: process.env.TAVILY_API_KEY,
    convexToken: convexToken ?? undefined,
    messages: fullMessagesGateway,
    composeMessages: trimmedModelMessages,
    composeModel: model,
    fallbackComposeModel,
    systemPrompt,
    paperModePrompt: paperModePrompt || undefined,
    paperWorkflowReminder: paperWorkflowReminder || undefined,
    currentStage: paperStageScope ?? undefined,
    fileContext: fileContext || undefined,
    samplingOptions,
    retrieverMaxTokens: 4096,              // ← ADD THIS LINE
    reasoningTraceEnabled,
    isTransparentReasoning,
    reasoningProviderOptions: primaryReasoningProviderOptions ?? undefined,
    traceMode: getTraceModeLabel(!!paperModePrompt, true),
    requestStartedAt,
    isDraftingStage,
    onFinish: async (result) => {
        // ... existing onFinish
    },
})
```

Ini satu-satunya perubahan yang diperlukan. Tidak ada perubahan di orchestrator, types, atau content-fetcher — infrastruktur sudah lengkap.

### Step 2: Collect baseline SEBELUM deploy

**PENTING**: Sebelum apply perubahan, collect ≥3 search request logs sebagai baseline. Catat:
- `[⏱ RETRIEVER] text_ready ... chars=N` → actual char count sekarang (tanpa cap)
- `[⏱ LATENCY] Phase1 ... total=Nms` → actual Phase 1 timing
- `[⏱ RETRIEVER] summary ... citations=N` → citation count baseline

Tanpa baseline, kita tidak bisa prove improvement. Angka di bawah adalah **estimasi**, bukan data aktual.

### Step 3: Runtime verification (setelah deploy)

Compare log output sebelum vs sesudah:

**Log lines yang harus di-monitor** (per retriever — cap affects semua, bukan cuma google-grounding):
```
[⏱ RETRIEVER][reqId] text_ready name=<retriever> t=<ms> chars=<N>
[⏱ RETRIEVER][reqId] summary name=<retriever> ... citations=<N>
[⏱ LATENCY][reqId] Phase1 retriever="<name>" textGen=<ms> ... citations=<N> text=<chars>chars
```

**Expected direction** (estimates, verify against actual baseline):
- `chars` turun (text output dibatasi oleh maxTokens)
- `textGen` timing turun (less output = stream finish faster)
- `citations` stabil (≥15 typical untuk google-grounding, varies untuk lainnya)

**Red flags yang harus dipantau**:
1. `citations=0` rate naik signifikan → maxTokens terlalu rendah, Gemini skip tool call
2. `text_ready chars=` sangat rendah (< 500) → model mungkin truncated mid-response
3. Compose quality turun saat FetchWeb gagal total → `searchText` fallback terlalu pendek (rare edge case)
4. Perplexity/grok citation count drop → cap terlalu ketat untuk retriever non-Google

### Step 4: Iterate based on data

- Kalau citations stable dan Phase 1 turun: coba turunkan ke 2048
- Kalau citations drop (any retriever): naikkan ke 8192
- Kalau perplexity/grok terpengaruh tapi google-grounding tidak: pertimbangkan per-retriever cap (butuh refactor `retrieverMaxTokens` → per-chain-entry config)
- Kalau tidak ada perubahan timing: masalahnya bukan output length tapi API latency inherent (TTFB dominan, bukan token generation)

## Tidak termasuk dalam scope

- Perubahan di orchestrator.ts — sudah support `retrieverMaxTokens`
- Perubahan di types.ts — field sudah ada
- Perubahan di content-fetcher.ts — tidak terkait
- Perubahan timeout atau proxy filtering — itu Priority 2 dan 3

## Audit Trail

Dokumen ini di-audit terhadap `context.md` pada 2026-03-26. Gaps yang ditemukan dan di-patch:

1. **"Text di-drop" terlalu absolut** → Patched: `searchText` dipakai sebagai fallback kalau FetchWeb gagal total. Cap aman karena full FetchWeb failure jarang.
2. **`samplingOptions` bisa sudah berisi `maxTokens`** → Patched: Verified spread order di orchestrator — `retrieverMaxTokens` selalu override. Aman.
3. **JSDoc "Defaults to 4096" misleading** → Patched: Code tidak implement default. Kalau undefined, no cap applied. Kita yang set 4096 untuk pertama kalinya.
4. **Cap affects semua retrievers** → Patched: Added note bahwa perplexity/grok juga terpengaruh. Monitor per-retriever.
5. **Expected log output speculative** → Patched: Added Step 2 (collect baseline). Angka di Step 3 adalah estimasi, bukan data.

## Checklist

- [ ] Collect baseline logs (≥3 search requests) SEBELUM perubahan
- [ ] Tambah `retrieverMaxTokens: 4096` di `route.ts:~2214`
- [ ] Runtime test: compare Phase 1 timing sebelum/sesudah (per retriever)
- [ ] Monitor 0-citation rate — harus stabil (semua retrievers)
- [ ] Monitor compose quality saat FetchWeb gagal total — edge case
- [ ] Dokumentasikan hasil di doc terpisah
