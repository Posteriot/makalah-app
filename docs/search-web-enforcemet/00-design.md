# Search Web Enforcement - Design Document

> Date: 2026-03-03
> Scope: Penguatan ketersediaan `google_search` setelah upgrade AI SDK v6
> Fokus: Hindari silent downgrade ke non-search saat kebutuhan data faktual mewajibkan riset web

---

## 1. Problem Statement

Saat ini alur utama chat punya titik rapuh berikut:

1. `src/lib/ai/streaming.ts` (`getGoogleSearchTool`) return `null` kalau init tool gagal.
2. `src/app/api/chat/route.ts` mengubah itu jadi `wrappedGoogleSearchTool ?? null`, lalu banyak keputusan pakai `!!wrappedGoogleSearchTool`.
3. Akibatnya, ketika tool unavailable, sistem bisa turun diam-diam ke mode non-search walau prompt membutuhkan data faktual.
4. Dampak user-facing:
- model terlihat pasif (tidak riset)
- sitasi URL hilang atau tidak konsisten
- risiko halusinasi meningkat pada stage gagasan/riset

## 2. Goals

1. Memastikan kebutuhan riset faktual tidak pernah diam-diam jatuh ke non-search.
2. Memisahkan jelas antara:
- `search dibutuhkan` (policy/intent)
- `search engine tersedia` (capability/runtime)
3. Menyediakan fallback deterministik kalau `google_search` primary unavailable.
4. Menambahkan observability (telemetry + reason code) agar root-cause cepat dilacak.

## 3. Non-Goals

1. Tidak mengganti policy stage 13 tahap makalah.
2. Tidak menambah heuristik regex baru untuk menentukan factuality.
3. Tidak mengubah provider utama (tetap Gemini 2.5 Flash via Vercel AI Gateway).

## 4. Architecture Decision

### 4.1 Capability Contract untuk Tool Search

Buat kontrak typed untuk inisialisasi tool, mengganti pola `null` ambigu:

- `ready`: tool siap dipakai.
- `unavailable`: tool tidak siap + reason code eksplisit (`import_failed`, `factory_missing`, `factory_init_failed`).

Dengan ini, route tidak lagi menebak dari truthy/falsy value.

### 4.2 Search Execution Mode (Deterministik)

Tambahkan resolver mode eksekusi search:

- `primary_google_search`: kebutuhan search ada + tool primary siap.
- `fallback_online_search`: kebutuhan search ada + tool primary unavailable + fallback online search aktif.
- `blocked_unavailable`: kebutuhan search ada tapi tidak ada mesin search yang bisa dipakai.
- `off`: search memang tidak dibutuhkan.

Ini memaksa alur eksplisit, bukan implicit downgrade.

### 4.3 Fail-Closed untuk Klaim Faktual

Jika `search dibutuhkan` namun semua engine unavailable:

1. Jangan generate jawaban faktual tanpa sumber.
2. Kirim status UI `data-search: error` + pesan yang jelas.
3. Catat telemetry reason (`search_required_but_unavailable`).

### 4.4 Telemetry + Debuggability

Gunakan `fallbackReason` yang sudah ada untuk reason code terstandar:

- `google_search_tool_import_failed`
- `google_search_tool_factory_missing`
- `websearch_primary_tool_unavailable_fallback_online`
- `search_required_but_unavailable`

Dengan ini, dashboard telemetry bisa menunjukkan apakah problem ada di init tool, routing, atau fallback config.

## 5. Data Contract/UI Contract

Perluasan part `data-search`:

- sekarang: `{ status }`
- target: `{ status, message?, reasonCode? }`

`SearchStatusIndicator` sudah support `message`, jadi cukup wiring parser di `MessageBubble` agar user lihat penyebab kegagalan search secara spesifik.

## 6. Compatibility dengan AI SDK v6

Rancangan kompatibel dengan `ai@6` karena:

1. Tetap memakai `streamText`, `prepareStep`, `stopWhen`, `toolChoice` API yang valid di v6.
2. Tidak bergantung pada API deprecated.
3. Perubahan fokus pada orchestration + error handling tool availability, bukan pada perubahan provider API surface.

## 7. Risks and Mitigations

1. Risiko: fallback loop tidak diinginkan.
- Mitigasi: resolver mode hanya memberi satu jalur final (`primary`/`fallback`/`blocked`), bukan retry tak terbatas.

2. Risiko: noise telemetry.
- Mitigasi: reason code dibatasi enum kecil dan konsisten.

3. Risiko: regress pada stage non-factual.
- Mitigasi: mode `off` tetap mempertahankan behavior lama untuk prompt non-factual.

## 8. Acceptance Criteria

1. Tidak ada lagi silent downgrade dari `search required` ke jawaban tanpa riset.
2. Pada kegagalan init tool primary, sistem otomatis pilih fallback online search bila tersedia.
3. Bila seluruh search engine unavailable, user dapat error status yang eksplisit (bukan jawaban halusinatif).
4. Telemetry menyimpan reason code yang cukup untuk debugging tanpa reproduksi manual.
5. Flow ini tetap berjalan di AI SDK v6 tanpa incompatibility API.
