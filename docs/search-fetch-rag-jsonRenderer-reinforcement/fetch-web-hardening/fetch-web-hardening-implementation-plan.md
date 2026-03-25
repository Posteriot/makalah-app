# FetchWeb Hardening Implementation Plan

Tanggal: 2026-03-25

## Goal

Kurangi latency dan failure waste di `FetchWeb` tanpa menambah scoring/filtering pintar di pipeline.

Target utama:

- failure reason jadi terukur, bukan semua jatuh ke `empty/null`
- URL non-HTML atau high-risk academic host tidak lagi diperlakukan seperti artikel HTML biasa
- batch `FetchWeb` tidak terus disandera `~5s` oleh URL yang dari awal kecil peluang suksesnya
- verified source count naik untuk search akademik

## Evidence

Dari runtime log terbaru:

- success rate bisa jatuh ke `3/6`, `1/7`, atau `1/6`
- batch `FetchWeb PRIMARY` tetap mentok `~5s`
- banyak URL gagal berasal dari:
  - PDF / download path
  - DOI / academic publisher landing page
  - `ResearchGate`
  - `Wiley`
  - `arXiv`
  - proxy/redirect URL yang lolos sampai fetch

Kesimpulan:

- bottleneck Phase 1.5 bukan cuma provider search
- `content-fetcher.ts` terlalu HTML-centric
- satu jalur `fetch -> response.text() -> Readability` untuk semua URL sekarang terlalu mahal dan terlalu rapuh

## Scope

File utama:

- `src/lib/ai/web-search/content-fetcher.ts`
- `__tests__/content-fetcher.test.ts`

File konsumsi:

- `src/lib/ai/web-search/orchestrator.ts`

## Non-Goals

- tidak menambah scoring kualitas konten
- tidak menambah ranking/filtering sumber berbasis “kepintaran” hardcoded
- tidak mengubah router search
- tidak mengubah compose flow
- tidak mengubah RAG ingest flow

## Design Principles

1. Tools tetap simple executors.
2. Hardening boleh berbasis transport/type routing, bukan quality judgment.
3. Klasifikasi URL hanya untuk memilih fetch strategy, bukan untuk memutus “sumber bagus vs buruk”.
4. Failure harus punya reason yang jelas agar log dan tuning berikutnya tidak buta.

## Current Problems

### Problem 1 — Single HTML path for all URLs

`fetchAndParse()` sekarang memperlakukan semua URL seolah halaman artikel HTML:

- `fetch`
- `response.text()`
- `parseHTML`
- `Readability`
- `turndown`

Padahal banyak URL search result adalah:

- PDF
- download endpoint
- DOI resolver / publisher landing page
- anti-bot / cookie wall
- academic archive page yang tidak cocok untuk `Readability`

### Problem 2 — Uniform timeout policy

Semua URL sekarang efektif punya timeout yang sama:

- `DEFAULT_TIMEOUT_MS = 5000`
- orchestrator juga memanggil `fetchPageContent(..., { timeoutMs: 5000 })`

Akibatnya:

- URL yang hampir pasti gagal tetap makan `~5s`
- batch latency mengikuti slowest failure

### Problem 3 — Failure reason collapsed

Saat ini kegagalan banyak berakhir sebagai:

- `empty/null content`
- `null`

Padahal kita perlu membedakan:

- `timeout`
- `http_non_ok`
- `pdf_unsupported`
- `readability_empty`
- `content_too_short`
- `fetch_error`
- `proxy_unresolved`

### Problem 4 — Tavily fallback terlalu terlambat

Fallback baru jalan setelah seluruh primary batch selesai.

Itu terlalu lambat untuk URL yang dari awal memang lebih cocok:

- Tavily-first
- atau fail-fast

## Implementation Order

### Step 1 — Structured Failure Result

Refactor `fetchAndParse()` agar return structured result, bukan `FetchParseResult | null`.

Bentuk minimal:

```ts
type FetchParseOutcome =
  | {
      ok: true
      resolvedUrl: string
      content: string
      rawTitle: string | null
      title: string | null
      author: string | null
      publishedAt: string | null
      siteName: string | null
      documentKind: "html" | "pdf" | "unknown"
      exactMetadataAvailable: boolean
      paragraphs: FetchedParagraph[] | null
      documentText: string | null
    }
  | {
      ok: false
      resolvedUrl: string
      documentKind: "html" | "pdf" | "unknown"
      reason:
        | "timeout"
        | "fetch_error"
        | "http_non_ok"
        | "pdf_unsupported"
        | "readability_empty"
        | "content_too_short"
        | "proxy_unresolved"
      statusCode?: number
      contentType?: string | null
    }
```

Acceptance:

- log `FetchWeb PRIMARY ... ✗` sudah menyebut reason yang spesifik
- no more silent collapse ke `empty/null` untuk semua kasus

### Step 2 — URL/Route Classification

Tambahkan helper kecil:

```ts
type FetchRouteKind =
  | "html_standard"
  | "pdf_or_download"
  | "academic_wall_risk"
  | "proxy_or_redirect_like"
```

Contoh sinyal aman:

- hostname:
  - `researchgate.net`
  - `onlinelibrary.wiley.com`
  - `arxiv.org`
  - `doi.org`
  - `vertexaisearch.cloud.google.com`
- pathname:
  - `.pdf`
  - `/pdf/`
  - `/article/download/`
  - `/doi/`
  - `/publication/`

Catatan:

- ini bukan quality filter
- ini hanya memilih strategy fetch

### Step 3 — Strategy Branch per Route Kind

Implement branch minimal:

- `html_standard`
  - tetap `fetch + Readability`

- `pdf_or_download`
  - jangan paksa HTML Readability
  - return fail-fast `pdf_unsupported` bila belum ada parser PDF
  - kalau `tavilyApiKey` ada, kandidat untuk Tavily-first

- `academic_wall_risk`
  - timeout lebih pendek
  - kandidat Tavily-first atau Tavily-after-short-fail

- `proxy_or_redirect_like`
  - kalau masih proxy mentah sampai fetcher, fail-fast dengan `proxy_unresolved`

Acceptance:

- URL non-HTML tidak lagi menghabiskan full HTML path tanpa alasan
- log menunjukkan route kind + failure reason

### Step 4 — Timeout Policy Split

Tambahkan timeout policy per route kind:

- `html_standard`: `5000ms`
- `pdf_or_download`: `1200-2000ms`
- `academic_wall_risk`: `1500-2500ms`
- `proxy_or_redirect_like`: `<=1000ms` atau fail-fast tanpa fetch

Catatan:

- angka final boleh dituning setelah runtime test
- yang penting bukan satu timeout untuk semua

### Step 5 — Strategic Tavily Use

Naikkan Tavily dari pure fallback menjadi strategy option.

Urutan yang disarankan:

- `html_standard`:
  - primary fetch dulu
  - Tavily fallback jika gagal

- `pdf_or_download`:
  - Tavily-first jika API key tersedia
  - atau fail-fast jika Tavily disabled

- `academic_wall_risk`:
  - short primary attempt lalu Tavily
  - atau langsung Tavily-first untuk host yang konsisten buruk

Tujuan:

- jangan buang 5 detik pada URL yang dari awal sangat kecil peluang lolos Readability

### Step 6 — Logging Upgrade

Perkaya log `FetchWeb` dengan:

- `requestId`
- `routeKind`
- `reason`
- `statusCode` jika ada
- `contentType` jika ada

Contoh:

```ts
[⏱ LATENCY] [chat-...] FetchWeb PRIMARY [2/7] ✗ 1488ms https://... route=academic_wall_risk reason=http_non_ok status=403 contentType=text/html
```

## Test Plan

Tambahkan test ke `__tests__/content-fetcher.test.ts`:

1. PDF URL -> classified as `pdf_or_download`
2. DOI / Wiley / ResearchGate / arXiv URL -> classified as `academic_wall_risk`
3. `http_non_ok` -> reason preserved
4. timeout -> reason preserved
5. Tavily-first route tidak menunggu primary 5 detik dulu
6. `html_standard` tetap memakai jalur lama dan test existing tetap lolos

## Suggested Delivery Batches

### Batch A — Safe observability and routing

- structured failure result
- route classifier
- enriched logging
- tests for classification and failure reasons

Risk: rendah

### Batch B — Strategy and timeout changes

- timeout split
- fail-fast proxy/PDF path
- Tavily-first untuk route tertentu

Risk: sedang

### Batch C — Host tuning

- tambah host/path rules berdasarkan runtime evidence
- tune timeout numbers

Risk: sedang

## Acceptance Criteria

1. Log `FetchWeb` tidak lagi mendominasi dengan reason generik `empty/null content`.
2. URL PDF/download/academic wall bisa dibedakan secara eksplisit di log.
3. Untuk sample akademik bermasalah, batch `FetchWeb` tidak lagi selalu terjebak `~5s` hanya karena satu kelas URL yang memang kecil peluang suksesnya.
4. Existing HTML extraction tests tetap pass.
5. Tidak ada scoring/filtering kualitas baru di pipeline.

## Recommended First Patch

Kalau mau paling aman dan tetap impactful, mulai dari:

1. Step 1 — structured failure result
2. Step 2 — route classifier
3. Step 6 — logging upgrade

Itu memberi observability yang jauh lebih tajam tanpa langsung mengubah strategy fetch yang lebih invasif.
