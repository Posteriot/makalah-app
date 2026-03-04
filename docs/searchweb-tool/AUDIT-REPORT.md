# Audit Report: Web Search Tools Pipeline

**Branch:** `search-web-tool`
**Tanggal:** 2026-03-04
**Scope:** 4 area — tool availability, search decision, reference persistence, citation render

---

## Scope 1: Ketersediaan Tool `google_search`

### Temuan

#### 1.1 — `webSearchConfig.primaryEnabled` TIDAK PERNAH DIENFORCE ❌

**File:** `src/app/api/chat/route.ts` (line 736)
**Severity:** HIGH

`getWebSearchConfig()` di `streaming.ts:133` mengembalikan `primaryEnabled` dari DB config. Value ini di-fetch di `route.ts:736` tapi **tidak pernah dibaca di manapun** dalam request handler. Admin yang men-disable primary web search via Admin Panel tidak berdampak apa-apa — `google_search` tetap dipakai kalau tool-nya available.

Hanya `fallbackEnabled` yang benar-benar dienforce (line 1891, 3012).

#### 1.2 — `initGoogleSearchTool()` failure SILENT di call site ⚠️

**File:** `src/app/api/chat/route.ts` (lines 1747–1751)
**Severity:** MEDIUM

```typescript
const googleSearchInit = await initGoogleSearchTool()
const primaryGoogleSearchReady = googleSearchInit.status === "ready"
const wrappedGoogleSearchTool = primaryGoogleSearchReady ? googleSearchInit.tool : null
```

Tidak ada `console.error` atau alert logging saat `primaryGoogleSearchReady = false`. Failure diabsorb diam-diam ke boolean flag. Wrapper `getGoogleSearchTool()` di `streaming.ts:409-419` yang punya logging justru **tidak dipanggil** — dead export.

#### 1.3 — `getWebSearchConfig()` soft-degrade tanpa alert ⚠️

**File:** `src/lib/ai/streaming.ts` (lines 133–152)
**Severity:** LOW

Saat DB config kosong, function return hardcoded defaults (`primaryEnabled: true`, `fallbackEnabled: true`) tanpa logging ke `systemAlerts`. Berbeda dengan `getProviderConfig()` yang throw error kalau config missing.

#### 1.4 — LLM router failure silently defaults ke no-search ⚠️

**File:** `src/app/api/chat/route.ts` (lines 1118–1137)
**Severity:** MEDIUM

`decideWebSearchMode()` via `generateText()` punya 2 structured-output attempts + raw text fallback. Kalau semua gagal, return `{ enableWebSearch: false }` dengan reason `router_invalid_json_shape` atau `router_json_parse_failed`. User yang bertanya factual question secara natural (tanpa trigger phrase eksplisit) diam-diam tidak dapat web search.

Partial mitigasi: `explicitSearchFallback` (line 1866) override kalau user pakai bahasa search eksplisit.

#### 1.5 — Fallback `:online` tanpa citations return `closeSearchStatus("off")` ⚠️

**File:** `src/app/api/chat/route.ts` (lines 3420–3422)
**Severity:** LOW

```typescript
const hasAnyCitations = normalizedCitations.length > 0
closeSearchStatus(hasAnyCitations ? "done" : "off")
```

Kalau OpenRouter `:online` berhasil tapi return 0 citations, UI melihat `status: "off"` — sama seperti search tidak pernah dilakukan. User tidak tahu search dicoba tapi tidak ada hasil.

#### 1.6 — Asymmetric recovery di double-failure scenario ⚠️

**File:** `src/app/api/chat/route.ts` (lines 3622–3634)
**Severity:** LOW

- Tool init failure (`SearchToolUnavailableError`) + `:online` juga fail → **hard error block** ke user
- Provider failure (bukan tool init) + `:online` juga fail → **silent degradation** ke non-search response

UX inconsistent tergantung layer mana yang fail duluan.

---

## Scope 2: Search Decision ACTIVE Stage

### Temuan

#### 2.1 — `hasRecentSourcesInDb` TIDAK stage-scoped ❌

**File:** `src/app/api/chat/route.ts` (lines 676–697, 1759)
**Severity:** CRITICAL

```typescript
const searchAlreadyDone = hasPreviousSearchResults(modelMessages, paperSession) || hasRecentSourcesInDb
```

`hasRecentSourcesInDb` cek `api.messages.getRecentSources` level **conversation**, bukan per-stage. Sources dari stage `gagasan` masih terdeteksi saat user sudah di stage `tinjauan_literatur` yang butuh 5 referensi baru. Akibatnya `searchAlreadyDone = true` di turn pertama stage baru, dan semua logic research completeness (Priority 5) di-bypass.

#### 2.2 — `searchAlreadyDone` bypass total `isStageResearchIncomplete` ❌

**File:** `src/app/api/chat/route.ts` (lines 1804–1814 vs 1833)
**Severity:** CRITICAL

Priority ordering:

| Priority | Kondisi | Perilaku |
|----------|---------|----------|
| **1** (line 1804) | `searchAlreadyDone` | Block search kecuali `isExplicitMoreSearchRequest` |
| 5 (line 1833) | `isStageResearchIncomplete` | Enable search |

Priority 1 dan 5 **mutually exclusive** — begitu `searchAlreadyDone = true`, research completeness tidak pernah dicek. Stage dengan 1 referensi (butuh 3) tetap dianggap "done".

#### 2.3 — `stageData` evidence check `> 0` vs minCount mismatch ❌

**File:** `route.ts:830-846` vs `paper-search-helpers.ts:63-68`
**Severity:** HIGH

`getSearchEvidenceFromStageData` return `true` (search done) kalau `referensiAwal.length > 0` — bahkan 1 referensi. Tapi `isStageResearchIncomplete` butuh `>= minCount` (2 untuk gagasan, 3 untuk topik, 5 untuk tinjauan_literatur). Karena Priority 1 dominates, 1 referensi = "search done" = tidak ada auto-search lagi.

#### 2.4 — `isExplicitMoreSearchRequest` terlalu sempit ⚠️

**File:** `src/lib/ai/paper-search-helpers.ts` (lines 183–199)
**Severity:** MEDIUM

Escape hatch dari `searchAlreadyDone` hanya match pattern spesifik: "cari lagi", "tambah referensi", "search again". Tidak match:
- "Butuh lebih banyak sumber"
- "Perlu referensi tambahan untuk X"
- "Cek literatur tentang X"
- "Temukan sumber mengenai X"
- "Gali lebih lanjut"

Sementara `isExplicitSearchRequest` (dipakai di non-active path) jauh lebih luas. Mismatch ini bikin user di ACTIVE stage lebih sulit trigger re-search.

#### 2.5 — False positive dari APA-style text dan numbered list ⚠️

**File:** `src/app/api/chat/route.ts` (lines 950–954, 969)
**Severity:** MEDIUM

```typescript
if (/menurut .+\(\d{4}\)/i.test(content)) return true
if (/\[\d+(?:,\s*\d+)*\]/.test(content)) return true
```

AI yang menulis "Menurut Vygotsky (1978)..." dari knowledge (tanpa web search) atau "[1] Tentukan topik..." sebagai numbered list trigger `searchAlreadyDone = true`. Tidak ada actual web search, tapi flag sudah set.

#### 2.6 — Comment vs code mismatch: "1 turn" vs `.slice(-3)` ⚠️

**File:** `src/app/api/chat/route.ts` (lines 924, 945)
**Severity:** LOW

Comment di line 924: "limited to 1 turn to avoid false positives from old stage citations". Implementasi di line 945: `.slice(-3)` (3 messages). Memperbesar window false positive.

---

## Scope 3: Layer Render Sitasi di UI

### Temuan

#### 3.1 — Silent `[N]` erasure saat sources missing ⚠️

**File:** `src/components/chat/MessageBubble.tsx` (line 576–628 di MarkdownRenderer)
**Severity:** MEDIUM

Saat `data-cited-sources` gagal tapi `data-cited-text` berhasil (text mengandung `[1]`, `[2]`), MarkdownRenderer:
1. Match `[1]` di text
2. Lookup `sources?.[0]` → `undefined` (sources kosong)
3. `selectedSources = []` → render **nothing**
4. Cursor advance melewati `[1]` → marker **hilang** dari output

User melihat text tanpa `[1]` markers dan tanpa citation chips. Tidak ada indikasi bahwa citasi pernah ada. Silent erasure.

#### 3.2 — Tidak ada error boundary/logging di citation flow ⚠️

**File:** `src/components/chat/MessageBubble.tsx` (lines 298–333)
**Severity:** LOW

Semua failure di `extractCitedText()` dan `extractCitedSources()` return `null` tanpa `console.error`. Zero observability saat citation data corrupt atau missing di client.

#### 3.3 — History reconstruction tidak include `data-cited-*` parts ⚠️

**File:** `src/components/chat/ChatWindow.tsx` (lines 957–978)
**Severity:** LOW (mitigated)

Setelah page refresh, `parts[]` hanya berisi `{ type: "text", text: msg.content }`. Tidak ada `data-cited-text` atau `data-cited-sources` part. Tapi ini **sudah ter-mitigasi** karena:
- `msg.content` sudah mengandung `[N]` markers (disimpan oleh `saveAssistantMessage` dengan `textWithInlineCitations`)
- `msg.sources` dari DB di-attach ke UIMessage via `.sources` property
- Fallback chain di line 515 menangkap `messageSources`

**Edge case:** Kalau `saveAssistantMessage` dipanggil dengan `undefined` sources (exception caught di line 2791–2793), history message punya `[N]` markers tapi no sources → silent `[N]` erasure permanen.

#### 3.4 — `data-cited-text` tanpa `data-cited-sources` = sources panel tanpa inline chips ⚠️

**Severity:** LOW

Kalau `data-cited-text` missing tapi `data-cited-sources` ada: sources panel muncul di bawah message, tapi tidak ada `[N]` chips di dalam text. User bisa lihat "ada sources" tapi tidak tahu bagian mana yang didukung.

---

## Scope 4: Persistensi Referensi Stage

### Temuan

#### 4.1 — Empty title bisa tersimpan di primary path ❌

**File:** `src/app/api/chat/route.ts` (lines 2592–2594)
**Severity:** HIGH

```typescript
const title = typeof chunk.web?.title === "string" ? chunk.web.title : normalizedUrl
```

`typeof "" === "string"` evaluates `true`, jadi empty string `""` disimpan sebagai title, bukan fallback ke URL. Path lain (`normalizeResultSource` di line 2418) sudah handle ini dengan `rawTitle.trim() || normalizedUrl`, tapi grounding chunk path tidak.

#### 4.2 — Malformed URL disimpan tanpa rejection ⚠️

**File:** `convex/paperSessions.ts` (lines 35–37)
**Severity:** MEDIUM

```typescript
} catch {
    return raw;  // MALFORMED URL: returned as-is
}
```

`normalizeUrlForDedup` dan `normalizeWebSearchUrl` sama-sama return raw string kalau URL parse fail. Tidak ada rejection di mutation level (validator hanya `v.string()`). Malformed URLs masuk ke `webSearchReferences`.

#### 4.3 — `isLowValueCitationUrl` TIDAK diapply di fallback path ❌

**File:** `src/app/api/chat/route.ts` (lines 3412–3428 vs 2665–2671)
**Severity:** HIGH

Primary path (Gateway): filter `isVertexProxyUrl` + `isLowValueCitationUrl` aktif.
Fallback path (OpenRouter): **tidak ada filter sama sekali**. Low-value URLs (tag pages, category archives, homepage-only) langsung masuk ke `appendSearchReferences`.

#### 4.4 — Non-UTM tracking params tidak di-strip untuk dedup ⚠️

**File:** `convex/paperSessions.ts` (lines 29–31)
**Severity:** MEDIUM

```typescript
if (/^utm_/i.test(key)) u.searchParams.delete(key);
```

Hanya `utm_*` params yang di-strip. `?ref=`, `?source=`, `?campaign=`, `?from=`, `?via=` survive normalization. Artikel yang sama dengan tracking params berbeda dari search runs berbeda disimpan sebagai 2 referensi terpisah.

#### 4.5 — Tidak ada snippet/abstract field di schema ⚠️

**File:** `convex/paperSessions.ts` (lines 743–747)
**Severity:** LOW

Schema hanya menyimpan `url`, `title`, `publishedAt`. Tidak ada `snippet` atau `abstract`. Quality assessment di tahap selanjutnya tidak bisa dilakukan berdasarkan konten snippet.

#### 4.6 — `isStageResearchIncomplete` purely count-based ⚠️

**File:** `src/lib/ai/paper-search-helpers.ts` (lines 53–71)
**Severity:** MEDIUM

Completeness check hanya `fieldData.length < req.minCount`. Tidak cek apakah referensi punya non-empty title, URL valid, atau domain relevan. Stage gate lolos selama count terpenuhi, meski semua referensi punya empty title dari GAP 4.1.

---

## Ringkasan Prioritas Fix

### CRITICAL (harus diperbaiki)
| # | Temuan | Scope |
|---|--------|-------|
| 2.1 | `hasRecentSourcesInDb` tidak stage-scoped — block search di stage baru | Scope 2 |
| 2.2 | `searchAlreadyDone` bypass total `isStageResearchIncomplete` | Scope 2 |

### HIGH (sangat disarankan)
| # | Temuan | Scope |
|---|--------|-------|
| 1.1 | `primaryEnabled` config tidak dienforce | Scope 1 |
| 2.3 | stageData evidence `> 0` vs minCount mismatch | Scope 2 |
| 4.1 | Empty title bisa tersimpan di grounding chunk path | Scope 4 |
| 4.3 | `isLowValueCitationUrl` tidak diapply di fallback path | Scope 4 |

### MEDIUM (perlu diperbaiki)
| # | Temuan | Scope |
|---|--------|-------|
| 1.2 | `initGoogleSearchTool()` failure silent | Scope 1 |
| 1.4 | LLM router failure defaults ke no-search | Scope 1 |
| 2.4 | `isExplicitMoreSearchRequest` terlalu sempit | Scope 2 |
| 2.5 | False positive dari APA-style text | Scope 2 |
| 3.1 | Silent `[N]` erasure saat sources missing | Scope 3 |
| 4.2 | Malformed URL disimpan tanpa rejection | Scope 4 |
| 4.4 | Non-UTM tracking params tidak di-strip | Scope 4 |
| 4.6 | Completeness check purely count-based | Scope 4 |

### LOW (nice to have)
| # | Temuan | Scope |
|---|--------|-------|
| 1.3 | `getWebSearchConfig()` soft-degrade tanpa alert | Scope 1 |
| 1.5 | Fallback tanpa citations return status "off" | Scope 1 |
| 1.6 | Asymmetric recovery di double-failure | Scope 1 |
| 2.6 | Comment vs code mismatch (1 turn vs slice -3) | Scope 2 |
| 3.2 | Tidak ada error boundary di citation flow | Scope 3 |
| 3.3 | History reconstruction edge case | Scope 3 |
| 3.4 | Sources panel tanpa inline chips | Scope 3 |
| 4.5 | Tidak ada snippet field di schema | Scope 4 |
