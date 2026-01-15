# Web Search (Google Search) - Technical Reference

Dokumentasi lengkap tentang implementasi Web Search dengan `google_search` provider-defined tool di Makalah App.

## Daftar Isi

1. [Overview](#overview)
2. [Rationale](#rationale)
3. [Architecture](#architecture)
4. [Web Search Router](#web-search-router)
5. [Google Search Tool](#google-search-tool)
6. [Grounding Metadata](#grounding-metadata)
7. [Citations Processing](#citations-processing)
8. [UI Components](#ui-components)
9. [Database Schema](#database-schema)
10. [Configuration](#configuration)
11. [URL Processing](#url-processing)
12. [Error Handling](#error-handling)
13. [Paper Workflow Integration](#paper-workflow-integration)
14. [Troubleshooting](#troubleshooting)

---

## Overview

Web Search adalah fitur yang memungkinkan AI mencari informasi terbaru dari internet menggunakan `google_search` provider-defined tool dari Google (via `@ai-sdk/google`). Hasil pencarian disertai inline citations `[1], [2]` yang bisa di-hover untuk melihat sumber.

### Key Features

- **Provider-Defined Tool**: Menggunakan `google_search` dari `@ai-sdk/google`
- **Automatic Router (Stage-Aware)**: Router mempertimbangkan stage, konfirmasi, dan evidence dari `stageData`
- **Grounding Metadata**: Ekstrak URL dan posisi teks dari Google response
- **Inline Citations**: Marker `[1], [2]` dengan hover card yang menampilkan sumber
- **Streaming Custom Data**: `data-search`, `data-cited-text`, `data-cited-sources` untuk UI real-time
- **URL Enrichment**: Fetch metadata (title, date) dari setiap URL
- **Tool Guard**: Jika `google_search` gagal diinisialisasi, web search dipaksa off
- **Fallback Chip**: Jika sumber ada tapi marker sitasi tidak ada, UI tetap tampilkan chip sumber

### Critical Constraint

**AI SDK tidak bisa mix provider-defined tools dengan function tools dalam 1 request.**

Artinya:
- Web search mode → HANYA `google_search` yang tersedia
- Normal mode → HANYA function tools (`createArtifact`, `updateArtifact`, `renameConversationTitle`, paper tools)

Router memutuskan SEKALI per request.

---

## Rationale

### Mengapa Provider-Defined Tool?

1. **Native Integration**: `google_search` terintegrasi langsung dengan provider Google
2. **Grounding Support**: Google menyediakan metadata tentang posisi dan sumber
3. **Quality Results**: Hasil pencarian berkualitas tinggi dari Google Search
4. **Tanpa API Search Terpisah**: Di mode utama cukup pakai key Gateway; kalau pakai provider Google langsung, butuh `GOOGLE_GENERATIVE_AI_API_KEY` (lihat `src/lib/ai/streaming.ts`)

### Mengapa Router?

1. **Efficiency**: Tidak semua pertanyaan butuh web search
2. **Cost**: Web search lebih mahal (token + latency)
3. **Relevance**: Router memastikan search hanya saat dibutuhkan
4. **Tool Separation**: Karena constraint tidak bisa mix tools

### Mengapa Inline Citations?

1. **Credibility**: User bisa verify informasi dari sumber
2. **Academic Standard**: Sesuai dengan konteks penulisan makalah
3. **User Experience**: Hover card lebih engaging dari list biasa
4. **Persistence**: Citations disimpan ke database untuk replay

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEB SEARCH ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

User sends message
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   POST /api/chat                                                             │
│                                                                             │
│   1. Authenticate user                                                       │
│   2. Parse messages                                                          │
│   3. Get Convex user ID                                                      │
│   4. Build system prompt + file context                                      │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   WEB SEARCH ROUTER (decideWebSearchMode)                                    │
│                                                                             │
│   Input: Last 8 messages                                                     │
│   Model: getGatewayModel() (aiProviderConfigs)                              │
│   Temperature: 0.2 (deterministic)                                           │
│                                                                             │
│   Output: { enableWebSearch: boolean, confidence: number, reason: string }  │
│   Guard: stagePolicy + konfirmasi (<= 400) + searchAlreadyDone (stageData)  │
│   Fallback: retry + parse JSON + explicit search saat router gagal          │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌────┴────┐
    │ Router  │
    │ Result  │
    └────┬────┘
         │
    ┌────┴────────────────────────────────────┐
    │                                         │
    ▼                                         ▼
enableWebSearch = true              enableWebSearch = false
    │                                         │
    ▼                                         ▼
┌─────────────────────┐             ┌─────────────────────┐
│ Web Search Mode     │             │ Normal Mode         │
│                     │             │                     │
│ tools = {           │             │ tools = {           │
│   google_search     │             │   createArtifact,   │
│ }                   │             │   renameTitle,      │
│                     │             │   ...paperTools     │
│ + System note:      │             │ }                   │
│   web search rules  │             │                     │
└─────────────────────┘             └─────────────────────┘
    │                                         │
    ▼                                         ▼
┌─────────────────────┐             ┌─────────────────────┐
│ streamText() with   │             │ streamText() with   │
│ createUIMessage-    │             │ onFinish callback   │
│ Stream()            │             │                     │
│                     │             │ Save to Convex      │
│ Custom data parts:  │             │ (sources opsional   │
│ - data-search       │             │ kalau ada grounding │
│ - data-cited-text   │             │ metadata)           │
│ - data-cited-sources│             └─────────────────────┘
└─────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   GROUNDING METADATA EXTRACTION                                              │
│                                                                             │
│   From: result.providerMetadata.google.groundingMetadata                    │
│                                                                             │
│   Extract:                                                                   │
│   - groundingChunks[].web.uri → Source URLs                                 │
│   - groundingChunks[].web.title → Source titles                             │
│   - groundingSupports[].segment.endIndex → Text positions                   │
│   - groundingSupports[].groundingChunkIndices → Which sources support text  │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   URL ENRICHMENT (Parallel Fetch)                                            │
│                                                                             │
│   Concurrency: 4                                                             │
│   Timeout: 2500ms per URL                                                    │
│                                                                             │
│   For each URL:                                                              │
│   1. Unwrap Google proxy URLs                                                │
│   2. Fetch HTML                                                              │
│   3. Extract og:title, published date                                        │
│   4. Canonicalize URL (remove utm params)                                    │
│   5. Deduplicate by canonical URL                                            │
│   6. Filter low-value URLs (homepage, tag pages)                             │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   INLINE CITATION INSERTION                                                  │
│                                                                             │
│   For each groundingSupport:                                                 │
│   1. Find text position (endIndex)                                          │
│   2. Find nearest sentence boundary (. ? ! \n)                              │
│   3. Map chunk indices to citation numbers [1], [2]                         │
│   4. Insert markers at sentence end                                          │
│                                                                             │
│   Result: "Menurut data terbaru, harga emas naik 5%. [1]"                   │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   STREAM TO CLIENT                                                           │
│                                                                             │
│   Parts:                                                                     │
│   1. data-search { status: "searching" } → Show "Mencari..."                │
│   2. text-delta chunks → Stream text                                         │
│   3. data-cited-text { text: "..." } → Text with [1], [2]                   │
│   4. data-cited-sources { sources: [...] } → Source metadata (opsional)     │
│   5. data-search { status: "done/off/error" } → Tutup indikator             │
│   6. finish → Complete                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   SAVE TO CONVEX                                                             │
│                                                                             │
│   messages.createMessage({                                                   │
│     conversationId,                                                          │
│     role: "assistant",                                                       │
│     content: textWithInlineCitations,                                        │
│     sources: [{ url, title, publishedAt }, ...] (opsional)                  │
│   })                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   CLIENT RENDERING                                                           │
│                                                                             │
│   MessageBubble:                                                             │
│   1. extractCitedText() → Get text from data-cited-text                     │
│   2. extractCitedSources() → Get sources from data-cited-sources            │
│   3. extractSearchStatus() → Get status from data-search                    │
│                                                                             │
│   MarkdownRenderer:                                                          │
│   1. Parse markdown                                                          │
│   2. Find [1], [2] patterns                                                  │
│   3. Render InlineCitationChip for each                                      │
│                                                                             │
│   InlineCitationChip:                                                        │
│   - Desktop: HoverCard with carousel                                         │
│   - Mobile: Sheet (bottom drawer) with carousel                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Streaming Data (createUIMessageStream)

Saat `enableWebSearch = true`, respons dibungkus `createUIMessageStream()`:

- **Status awal**: kirim `data-search` dengan `status: "searching"` sebelum token teks.
- **Deteksi sumber**: kalau ada chunk `source-url`, `hasAnySource` jadi true.
- **Akhir stream**:
  - `finish` → status jadi `done` kalau ada sumber, atau `off` kalau tidak ada.
  - hitung sitasi → kirim `data-cited-text` (selalu) + `data-cited-sources` (jika ada).
  - simpan message lewat `saveAssistantMessage()` dengan teks yang sudah disisipi marker `[n]`.
- **Error/abort**: status jadi `error` (atau `off` saat abort tanpa sumber), lalu chunk diteruskan.

Saat `enableWebSearch = false`, `result.toUIMessageStreamResponse()` dipakai langsung, dan `onFinish` tetap menyimpan pesan (sources opsional jika ada grounding metadata).

---

## Web Search Router

### Location

`src/app/api/chat/route.ts` lines 485-619

### Purpose

Router memutuskan apakah request memerlukan web search berdasarkan konteks pesan.

**PENTING (Update 2026-01-15):** Untuk **ACTIVE stages** di paper mode, logika deterministic bypass LLM router sepenuhnya. Lihat section [3-Layer Protection for ACTIVE Stages](#3-layer-protection-for-active-stages).

### Logic

```typescript
const decideWebSearchMode = async (options: {
    model: unknown
    recentMessages: unknown[]
    isPaperMode: boolean
    currentStage: PaperStageId | "completed" | undefined | null
    stagePolicy: "active" | "passive" | "none"
    searchAlreadyDone: boolean
    isUserConfirmation: boolean
}): Promise<{ enableWebSearch: boolean; confidence: number; reason: string }>
```

### ACTIVE Stage Override (Update 2026-01-15)

**Sebelum LLM router dipanggil**, ada check untuk ACTIVE stages:

```typescript
// ACTIVE stage bypass - deterministic logic
if (stagePolicy === "active" && paperSession && !forcePaperToolsMode) {
    // Use 3-layer deterministic protection (see below)
    // LLM router NOT called for ACTIVE stages
}
```

Jika stage adalah ACTIVE, logika deterministik langsung menentukan `enableWebSearch` tanpa memanggil LLM router. Ini mencegah non-deterministic behavior di mana AI dijanjikan search tapi tidak dapat tool.

### Early-Return Guards (PASSIVE/NONE Stages)

Untuk **PASSIVE dan NONE stages**, sebelum memanggil router LLM ada 2 early-return guards:

```typescript
// Guard 1: User confirmation → prefer paper tools
if (options.isUserConfirmation && options.isPaperMode) {
    return {
        enableWebSearch: false,
        confidence: 0.95,
        reason: "user_confirmation_prefer_paper_tools"
    }
}

// Guard 2: Search already done → prefer paper tools
if (options.searchAlreadyDone && options.isPaperMode) {
    return {
        enableWebSearch: false,
        confidence: 0.9,
        reason: "search_already_done_prefer_paper_tools"
    }
}
```

**Helper Functions:**

```typescript
// Detect explicit search request (regex list)
const isExplicitSearchRequest = (text: string): boolean
// Patterns: cari, mencari, search, pencarian, google, internet, tautan, link, url, referensi, literatur, sumber, data terbaru, berita terbaru

// Detect if previous turns have search results (stageData + pesan)
const hasPreviousSearchResults = (msgs: unknown[], session: { currentStage?: string; stageData?: Record<string, unknown> } | null): boolean
// Prioritas: stageData (referensi/sitasi) → fallback ke pola pesan [1], "berdasarkan hasil pencarian", APA

// Detect if user is confirming/approving
const isUserConfirmationMessage = (text: string): boolean
// Batas panjang <= 400 karakter, dan false jika terdeteksi explicit search
```

### Router Prompt

```
Anda adalah "router" yang memutuskan apakah jawaban untuk user WAJIB memakai
pencarian web (tool google_search).

Tujuan:
- enableWebSearch = true HANYA jika:
  (A) user meminta cek internet/pencarian secara eksplisit di pesan TERAKHIR, ATAU
  (B) pertanyaan butuh data faktual terbaru/real-time sehingga tanpa internet
      berisiko salah.
- Jika user sudah punya data/referensi dari diskusi sebelumnya dan tidak meminta
  pencarian baru, set false.
- Default ke false untuk memungkinkan AI memproses/menyimpan data.

Output: JSON { enableWebSearch: boolean, confidence: number, reason: string }
```

**Paper Mode Context (ditambahkan saat `isPaperMode = true`):**

```
KONTEKS PENTING - PAPER MODE AKTIF:
Current stage: {currentStage}
Stage policy: {ACTIVE|PASSIVE|NONE}

Aturan stage policy:
- PASSIVE: enableWebSearch hanya jika user EKSPLISIT minta search.
- ACTIVE: enableWebSearch boleh true jika user minta search atau model butuh data faktual.

Catatan tambahan:
- Referensi dan data faktual HARUS dari web search.
- Set false jika user meminta simpan/approve hasil yang sudah ada,
  ATAU semua data sudah tersedia dari pencarian sebelumnya.
```

### Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Temperature | 0.2 | Deterministic output |
| Input | Last 8 messages | Recent context |
| Output | JSON object | Parsed with fallback |

Catatan: `enableWebSearch` baru aktif kalau tool `google_search` berhasil diinisialisasi (router output AND tool tersedia).

### Stage Policy Clamp

Setelah router memutuskan, keputusan dikunci ulang oleh aturan:
- `stagePolicyAllowsSearch` (ACTIVE/PASSIVE/NONE)
- `explicitSearchRequest`
- `forcePaperToolsMode` (paper intent terdeteksi tapi sesi belum dibuat → web search dipaksa off)

**Catatan:** Untuk ACTIVE stages, clamp ini TIDAK relevan karena logika deterministic sudah bypass router.

---

## 3-Layer Protection for ACTIVE Stages

> **Update 2026-01-15**: Fitur ini menggantikan LLM router untuk ACTIVE stages.

### Problem Statement

Di stage ACTIVE (gagasan, topik, dll), AI sering tidak mendapat `google_search` tool meskipun task membutuhkan research. Root causes:
1. LLM router return `enableWebSearch: false` secara **non-deterministic**
2. User confirmation patterns tidak cover semua bahasa gaul Indonesia
3. AI bisa "lupa" tugasnya butuh search
4. Tidak ada system note ketika search disabled → AI janji search tapi tidak bisa

### Solution: Deterministic 3-Layer Protection

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BULLETPROOF SEARCH DECISION                      │
├─────────────────────────────────────────────────────────────────────┤
│  1. Task-based: Check stageData completion (referensi fields)       │
│  2. Intent-based: Check AI's previous promise to search             │
│  3. Language-based: Check explicit save/submit patterns             │
└─────────────────────────────────────────────────────────────────────┘
```

### Helper File

`src/lib/ai/paper-search-helpers.ts` (NEW)

```typescript
// Stage research requirements - defines what data each ACTIVE stage needs
export const STAGE_RESEARCH_REQUIREMENTS: Partial<Record<PaperStageId, {
    requiredField: string
    minCount: number
    description: string
}>> = {
    gagasan: { requiredField: "referensiAwal", minCount: 2, ... },
    topik: { requiredField: "referensiPendukung", minCount: 3, ... },
    tinjauan_literatur: { requiredField: "referensi", minCount: 5, ... },
    pendahuluan: { requiredField: "sitasiAPA", minCount: 2, ... },
    diskusi: { requiredField: "sitasiTambahan", minCount: 2, ... },
}

// Helper functions
export const isStageResearchIncomplete = (stageData, stage) => ...
export const aiIndicatedSearchIntent = (previousAIMessage) => ...
export const isExplicitSaveSubmitRequest = (text) => ...
export const getLastAssistantMessage = (messages) => ...

// System notes
export const PAPER_TOOLS_ONLY_NOTE = `...`
export const getResearchIncompleteNote = (stage, requirement) => `...`
```

### Decision Logic (route.ts)

```typescript
if (stagePolicy === "active" && paperSession && !forcePaperToolsMode) {
    // Layer 1: Task-based - check if research is incomplete
    const { incomplete, requirement } = isStageResearchIncomplete(
        paperSession.stageData, currentStage
    )

    // Layer 2: Intent-based - check if AI promised to search
    const lastAssistantMsg = getLastAssistantMessage(modelMessages)
    const aiPromisedSearch = lastAssistantMsg ? aiIndicatedSearchIntent(lastAssistantMsg) : false

    // Layer 3: Language-based - check explicit save/submit
    const userWantsToSave = isExplicitSaveSubmitRequest(lastUserContent)

    // Decision logic (100% deterministic)
    if (incomplete) {
        enableWebSearch = true
        reason = "research_incomplete"
    } else if (aiPromisedSearch) {
        enableWebSearch = true
        reason = "ai_promised_search"
    } else if (userWantsToSave) {
        enableWebSearch = false
        reason = "explicit_save_request"
    } else {
        enableWebSearch = true  // Default for ACTIVE stage
        reason = "active_stage_default"
    }
}
```

### Decision Priority Table

| Priority | Condition | enableWebSearch | Reason |
|----------|-----------|-----------------|--------|
| 1 | Research incomplete (`stageData` kosong) | `true` | `research_incomplete` |
| 2 | AI promised to search | `true` | `ai_promised_search` |
| 3 | User explicit save/submit | `false` | `explicit_save_request` |
| 4 | Default ACTIVE stage | `true` | `active_stage_default` |

### System Notes Injection

**When search disabled in paper mode:**
```
MODE PAPER TOOLS (TANPA WEB SEARCH)

CONSTRAINT TEKNIS:
- Tool google_search TIDAK TERSEDIA di turn ini.
- JANGAN berjanji akan mencari referensi/literatur.
...
```

**When research incomplete:**
```
PERHATIAN: TAHAP "GAGASAN" BELUM LENGKAP

STATUS: Butuh minimal 2 referensi awal untuk mendukung kelayakan ide

INSTRUKSI WAJIB:
1. Gunakan tool google_search untuk mencari referensi yang relevan
...
```

### Console Logging

```javascript
console.log(`[SearchDecision] ACTIVE stage override: ${activeStageSearchReason}`)
```

### Guarantee

Di ACTIVE stages, search akan **SELALU enabled** kecuali:
- Research sudah complete DAN user explicitly minta save/submit

### Fallback Behavior

1. Structured output gagal → retry 2x → fallback `generateText` + parse JSON manual
2. Jika tetap gagal, `reason` jadi `router_invalid_json_shape` / `router_json_parse_failed`
3. Saat router gagal, sistem tetap bisa mengaktifkan web search jika user meminta eksplisit

### Debugging Logs

```javascript
console.log("[WebSearchRouter] Decision:", {
    enableWebSearch,
    confidence,
    reason,
    currentStage,
    stagePolicy,
    stagePolicyAllowsSearch,
    explicitSearchRequest,
    explicitSearchFallback,
    forcePaperToolsMode,
    searchAlreadyDone,
    isUserConfirmation,
    shouldForceSubmitValidation,
    finalEnableWebSearch,
})
```

---

## Google Search Tool

### Location

`src/lib/ai/streaming.ts` lines 210-233

### Implementation

```typescript
export async function getGoogleSearchTool() {
  try {
    const { google } = await import("@ai-sdk/google")

    // Native Google Search tool from the provider (provider-defined tool factory)
    const toolFactory = google.tools?.googleSearch

    if (!toolFactory) {
      return null
    }

    // Factory function - must be called to get tool instance
    if (typeof toolFactory === "function") {
      return toolFactory({})
    }

    return toolFactory
  } catch (error) {
    console.error("[Streaming] Failed to load Google Search tool:", error)
    return null
  }
}
```

### Tool Type

`google_search` adalah **provider-defined tool**, bukan function tool biasa:
- Tidak memiliki `execute` handler
- Dijalankan oleh provider (Google) secara internal
- Mengembalikan hasil via `groundingMetadata`

Jika inisialisasi tool gagal, `getGoogleSearchTool()` mengembalikan `null` dan router mematikan web search untuk request tersebut.

### System Note untuk Web Search Mode

Ketika web search enabled, sistem menambahkan note khusus:

```
⚠️ MODE PENCARIAN WEB AKTIF - BACA INI DENGAN TELITI!

CONSTRAINT TEKNIS PENTING:
- Dalam mode ini, HANYA tool "google_search" yang tersedia.
- Tool lain (createArtifact, updateArtifact, updateStageData, submitStageForValidation, renameConversationTitle) TIDAK TERSEDIA dan TIDAK BISA dipanggil.
- Jika mencoba memanggil tool selain google_search, panggilan akan GAGAL.

YANG HARUS DILAKUKAN DI TURN INI:
1) Lakukan pencarian dengan google_search jika diperlukan
2) Rangkum temuan dari pencarian
3) Akhiri respons di sini - jangan simpan data / buat artifact

YANG HARUS DILAKUKAN DI TURN BERIKUTNYA:
- Baru di turn berikutnya boleh simpan draf (updateStageData) atau buat artifact (createArtifact)

TIPS PENCARIAN:
- Hindari halaman listing/tag/homepage sebagai sumber utama
- Utamakan URL artikel/siaran pers yang spesifik
- Tulis klaim faktual secara ringkas per kalimat
```

---

## Grounding Metadata

### Source

`result.providerMetadata.google.groundingMetadata`

### Structure

```typescript
type GroundingMetadata = {
  webSearchQueries?: string[]          // Queries yang digunakan Google
  searchEntryPoint?: {
    renderedContent?: string           // HTML snippet (not used)
  }
  groundingChunks?: Array<{
    web?: {
      uri?: string                     // Source URL
      title?: string                   // Source title (often incomplete)
    }
  }>
  groundingSupports?: Array<{
    segment?: {
      text?: string                    // Supported text segment
      endIndex?: number                // Position in response text
    }
    groundingChunkIndices?: number[]   // Which chunks support this text
    confidenceScores?: number[]        // Confidence per chunk
  }>
}
```

### Extraction Process

1. **Try stream metadata first**: `lastProviderMetadata` dari loop chunk
2. **Fallback ke result**: `result.providerMetadata` dengan timeout 8s
3. **Pilih metadata terbaik**: `hasGroundingMetadata()` untuk validasi
4. **Ekstrak data**: `getGroundingChunks()` + `getGroundingSupports()`
5. **Filter chunk**: jika `groundingSupports` ada, pakai `groundingChunkIndices` untuk menentukan chunk yang dipakai

### Example

```json
{
  "google": {
    "groundingMetadata": {
      "webSearchQueries": ["harga emas hari ini 2024"],
      "groundingChunks": [
        {
          "web": {
            "uri": "https://example.com/harga-emas",
            "title": "Harga Emas Terbaru"
          }
        }
      ],
      "groundingSupports": [
        {
          "segment": { "endIndex": 150 },
          "groundingChunkIndices": [0]
        }
      ]
    }
  }
}
```

---

## Citations Processing

### Flow

```
groundingMetadata
       │
       ▼
┌──────────────────┐
│ Extract Chunks   │ → Get URIs and titles
└──────────────────┘
       │
       ▼
┌───────────────────────────┐
│ Filter by Supports (ops.) │ → Pakai groundingChunkIndices jika ada
└───────────────────────────┘
       │
       ▼
┌──────────────────┐
│ Normalize URLs   │ → Unwrap proxy, clean params
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Enrich Metadata  │ → Fetch og:title, date
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Deduplicate      │ → By canonical URL
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Filter Low-Value │ → Remove homepage, tag pages
└──────────────────┘
       │
       ▼
┌──────────────────┐
│ Insert Markers   │ → [1], [2] at sentence ends
└──────────────────┘
```

Catatan: kalau `groundingSupports` tersedia, chunk yang dipakai dipersempit ke `groundingChunkIndices`. Kalau tidak ada supports, semua chunk dipakai sebagai kandidat.

### URL Normalization

Location: `src/lib/citations/apaWeb.ts`

```typescript
export function normalizeWebSearchUrl(rawUrl: string): string
```

- Unwrap Google proxy URLs (`vertexaisearch.cloud.google.com`)
- Parse URL dari query params (`url`, `u`, `q`, `target`, etc.)
- Return clean URL

### URL Enrichment

Location: `src/lib/citations/webTitle.ts`

```typescript
export async function enrichSourcesWithFetchedTitles<T>(
  sources: T[],
  options?: { concurrency?: number; timeoutMs?: number }
): Promise<T[]>
```

Process per URL:
1. Fetch HTML (GET with redirect follow)
2. Extract `og:title`, `twitter:title`, or `<title>`
3. Extract `article:published_time` or JSON-LD `datePublished`
4. Clean up site suffix from title
5. Return enriched metadata

### Inline Citation Insertion

Location: `src/app/api/chat/route.ts` lines 1219-1286

```typescript
const insertInlineCitations = (
    inputText: string,
    items: SourceWithChunk[],
    groundingSupports: GroundingSupport[] | undefined
) => string
```

Algorithm:
1. Build map: chunk index → citation number
2. For each grounding support:
   - Get endIndex from segment
   - Find nearest sentence boundary (`. ? ! \n`)
   - Collect citation numbers for that position
3. Insert markers dari belakang ke depan (posisi aman)
4. Skip kalau marker sudah ada di ekor kalimat (dedupe)

---

## UI Components

### MessageBubble

Location: `src/components/chat/MessageBubble.tsx`

Extracts data from UIMessage parts:

```typescript
const extractSearchStatus = (uiMessage: UIMessage): SearchStatus | null
const extractCitedText = (uiMessage: UIMessage): string | null
const extractCitedSources = (uiMessage: UIMessage): CitationSource[] | null
```

Prioritas data:
- `citedText` dipakai kalau ada, kalau tidak fallback ke `content`
- `sources` dipilih dari `data-cited-sources` → `annotations.sources` → `message.sources`

Rendering order:
1. Tool state indicators (non-search)
2. Content (MarkdownRenderer with sources)
3. SearchStatusIndicator
4. Search tool indicators
5. Artifact indicators
6. SourcesIndicator
7. QuickActions

### SearchStatusIndicator

Location: `src/components/chat/SearchStatusIndicator.tsx`

States:
- `searching` → "Mencari..." dengan animated globe
- `error` → "Pencarian gagal" dengan error icon
- `done` / `off` → Hidden

### ToolStateIndicator

Location: `src/components/chat/ToolStateIndicator.tsx`

Peran:
- Menampilkan state tool selama streaming (`input-streaming`, `input-available`, `error`)
- Untuk `google_search`, indikator hanya muncul kalau event tool memang terkirim (provider-defined tool kadang tidak mengirim event tool)

### MarkdownRenderer

Location: `src/components/chat/MarkdownRenderer.tsx`

Citation detection (line 286):

```typescript
const citationMatch = restFromCursor.match(/^\[(\d+(?:\s*,\s*\d+)*)\]/)
```

When found:
1. Parse numbers: `[1,2]` → `[1, 2]`
2. Map to sources by index (1-based)
3. Render `InlineCitationChip` with selected sources

Fallback:
- Kalau `sources` ada tapi marker `[n]` tidak ada, `MarkdownRenderer` menambahkan chip sumber tambahan.

### InlineCitationChip

Location: `src/components/chat/InlineCitationChip.tsx`

Responsive behavior:
- **Desktop**: HoverCard with carousel
- **Mobile**: Sheet (bottom drawer) with carousel

Carousel shows:
- Title
- URL (hostname only)
- Published date (Indonesian format)

### SourcesIndicator

Location: `src/components/chat/SourcesIndicator.tsx`

Collapsible list showing all sources:
- "X sumber ditemukan" header
- Expandable list with 5 items initially
- "Tampilkan X lainnya" button

---

## Database Schema

### Messages Table (sources field)

Location: `convex/schema.ts` lines 50-66

```typescript
messages: defineTable({
    // ... other fields ...
    sources: v.optional(v.array(v.object({
      url: v.string(),
      title: v.string(),
      publishedAt: v.optional(v.number()),
    }))),
})
```

### Messages Mutation (createMessage)

Location: `convex/messages.ts` lines 52-85

`createMessage` menerima `sources` opsional dan menyimpan ke tabel `messages`, lalu update `lastMessageAt` pada conversation.

### CitationSource Type (Frontend)

```typescript
type CitationSource = {
  url: string
  title: string
  publishedAt?: number | null
}
```

### SourceWithChunk Type (Internal Processing)

```typescript
type SourceWithChunk = {
  url: string
  title: string
  publishedAt?: number | null
  chunkIndices: number[]  // For mapping to grounding supports
}
```

---

## Configuration

### Constants

| Setting | Value | Location | Description |
|---------|-------|----------|-------------|
| URL fetch concurrency | 4 | webTitle.ts:374 | Parallel URL fetches |
| URL fetch timeout | 2500ms | webTitle.ts:375 | Per-URL timeout |
| Provider metadata timeout | 8000ms | route.ts:1292-1296 | Fallback wait |
| Step count limit | 1 (web search), 5 (normal) | route.ts:967-969 | Max tool steps |
| Router temperature | 0.2 | route.ts:565, 588 | Deterministic routing |
| Streaming temperature | from `aiProviderConfigs` | route.ts:368-374 | `providerSettings.temperature` |

### Environment Variables

```bash
# Required untuk Web Search
VERCEL_AI_GATEWAY_API_KEY=xxx    # Primary (auto-aliased to AI_GATEWAY_API_KEY)
# atau
AI_GATEWAY_API_KEY=xxx           # Alternative name

# Optional (fallback - tidak punya web search)
OPENROUTER_API_KEY=xxx

# Optional (kalau pakai provider Google langsung, bukan Gateway)
GOOGLE_GENERATIVE_AI_API_KEY=xxx
```

---

## URL Processing

### Proxy Detection

```typescript
const isVertexProxyUrl = (raw: string) => {
  const host = new URL(raw).hostname.toLowerCase()
  return host === "vertexaisearch.cloud.google.com" ||
         host.startsWith("vertexaisearch.cloud.google.")
}
```

### Low-Value URL Detection

```typescript
const isLowValueCitationUrl = (raw: string) => boolean
```

Patterns:
- Homepage only (`/`)
- Tag/topic pages (`/tag/`, `/tags/`, `/topik/`)
- Generic listing (`/berita/`, `/news/`, `/articles/`)
- Google search results page

### URL Canonicalization

```typescript
const canonicalizeCitationUrl = (raw: string) => string
```

Process:
- Remove `utm_*` query params
- Remove hash fragment
- Remove trailing slash

### Deduplication Logic

Priority when duplicate canonical URLs found:
1. Prefer non-proxy over proxy URLs
2. Keep URL with `publishedAt` if available
3. Merge `chunkIndices` for inline citation mapping

### Filtering Priority

```
If has high-value URLs:
  → Filter out ALL proxy and low-value URLs

Else if has non-proxy URLs:
  → Filter out proxy URLs only

Else:
  → Keep all (better than nothing)
```

---

## Error Handling

### Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| Google Search tool fails to load | `getGoogleSearchTool()` null → `enableWebSearch` dipaksa false |
| Router JSON parse error | `enableWebSearch` false, kecuali ada explicit search request |
| Provider metadata timeout (8s) | Use stream metadata if available |
| Citation computation errors | Log error, continue without citations |
| URL enrichment fails | Use original URL and title |
| Single URL fetch fails | Continue with other URLs |

### Search Status States

| State | UI Display | Condition |
|-------|------------|-----------|
| `searching` | "Mencari..." + animated globe | At stream start |
| `done` | Hidden | Ada `source-url` di stream, lalu finish |
| `off` | Hidden | Tidak ada `source-url`, lalu finish |
| `error` | "Pencarian gagal" + error icon | Stream error |

### Console Logging

Key log points:

```javascript
// Router decision
console.log("[WebSearchRouter] Decision:", { enableWebSearch, confidence, reason })

// Tool configuration
console.log("[Chat API] Gateway Tools Configured:", { webSearchModeEnabled, ... })

// Google Search tool load failure
console.error("[Streaming] Failed to load Google Search tool:", error)

// Inline citations compute error
console.error("[Chat API] Failed to compute inline citations:", err)
```

---

## Paper Workflow Integration

### Stage Policy (Source of Truth)

Policy per stage ditentukan lewat `ACTIVE_SEARCH_STAGES` dan `PASSIVE_SEARCH_STAGES`:

**ACTIVE (deterministic 3-layer protection):**
- `gagasan`, `topik`, `pendahuluan`, `tinjauan_literatur`, `metodologi`, `diskusi`
- **Update 2026-01-15:** ACTIVE stages bypass LLM router, pakai logika deterministic
- Search default ON kecuali explicit save/submit request

**PASSIVE (LLM router decides):**
- `outline`, `abstrak`, `hasil`, `kesimpulan`, `daftar_pustaka`, `lampiran`, `judul`
- LLM router masih digunakan untuk PASSIVE stages
- Search hanya jika user eksplisit minta

### Key Difference: ACTIVE vs PASSIVE

| Aspect | ACTIVE Stage | PASSIVE Stage |
|--------|--------------|---------------|
| Decision method | 3-layer deterministic | LLM router |
| Default search | ON | OFF |
| File reference | `paper-search-helpers.ts` | `decideWebSearchMode()` |
| System note | Auto-injected | None |

Catatan:
- Di prompt stage tertentu, ada instruksi tambahan (mis. `gagasan`/`topik` mewajibkan `google_search` untuk referensi).
- Detail instruksi per stage ada di file prompt (lihat daftar di bawah).

### CATATAN MODE TOOL (Multi-Turn Pattern)

Semua stage punya reminder ini di prompt:

```
CATATAN MODE TOOL:
- Jika Kamu pakai google_search, jangan panggil updateStageData/createArtifact/
  submitStageForValidation di turn yang sama.
- Selesaikan pencarian + rangkum temuan dulu, baru simpan draf di turn berikutnya.
```

Ini karena AI SDK constraint: provider-defined tools (`google_search`) tidak bisa dicampur dengan function tools dalam 1 request.

### KOLABORASI PROAKTIF

Blok "KOLABORASI PROAKTIF (WAJIB)" ada di semua prompt stage. Rujuk ke file prompt masing-masing untuk teks lengkap.

### Dialog-First Principles

1. **DIALOG dulu, bukan monolog** - Tanya user sebelum generate
2. **Web search jika diperlukan** - Gunakan sesuai mode (AKTIF/PASIF)
3. **ITERASI sampai matang** - Jangan langsung submit, diskusi dulu
4. **KOLABORASI PROAKTIF** - Berikan rekomendasi, bukan hanya pertanyaan

### Stage System Prompts

Paper stage instructions ada di:
- `src/lib/ai/paper-stages/foundation.ts` - Gagasan, Topik
- `src/lib/ai/paper-stages/finalization.ts` - Outline, Daftar Pustaka, Lampiran, Judul
- `src/lib/ai/paper-stages/core.ts` - Abstrak, Pendahuluan, Tinjauan Literatur, Metodologi
- `src/lib/ai/paper-stages/results.ts` - Hasil, Diskusi, Kesimpulan

---

## Troubleshooting

### Web search tidak aktif

1. **Cek router decision**: Lihat console log `[WebSearchRouter] Decision`
2. **Cek tool initialization**: Lihat `[Streaming] Google Search Tool initialized`
3. **Pastikan Gateway API key**: `VERCEL_AI_GATEWAY_API_KEY` atau `AI_GATEWAY_API_KEY`

### Citations tidak muncul

1. **Cek grounding metadata**: Lihat `[InlineCitations] Grounding present`
2. **Cek chunks/supports**: Pastikan `chunks` dan `supports` bukan 0
3. **Cek provider metadata**: Timeout mungkin terjadi (8s)
4. **Cek console errors**: `[Chat API] Failed to compute inline citations`

### URL proxy tidak ter-unwrap

1. **Cek normalizeWebSearchUrl()**: Log URL sebelum dan sesudah
2. **Cek query params**: Pastikan `url`, `u`, `q` ada di proxy URL

### Search status stuck di "Mencari..."

1. **Stream error**: Cek network tab untuk error
2. **Provider timeout**: groundingMetadata mungkin tidak tersedia
3. **Client disconnect**: Refresh page

### Enrichment lambat

1. **Reduce concurrency**: Default 4, bisa dikurangi
2. **Reduce timeout**: Default 2500ms per URL
3. **Check network**: Some URLs may be slow/blocked

### Sources tidak tersimpan

1. **Cek saveAssistantMessage()**: Pastikan dipanggil dengan sources
2. **Cek Convex mutation**: `api.messages.createMessage` dengan field sources
3. **Cek sources format**: Array of `{ url, title, publishedAt? }`

### Paper mode stuck di search mode (updateStageData gagal)

**Gejala:**
- Agent terus melakukan search tapi tidak bisa `updateStageData` atau `createArtifact`
- Error: "kesalahan teknis pada pemanggilan tool"
- Agent mengulang-ulang respons yang sama

**Root Cause (Fixed 2026-01-15):**
- LLM router return `enableWebSearch: false` secara non-deterministic
- AI janji search tapi tidak dapat tool

**Solusi (3-Layer Protection):**
Untuk ACTIVE stages, logika deterministic menggantikan LLM router:
1. Cek log `[SearchDecision] ACTIVE stage override: ...`
2. Pastikan `activeStageSearchReason` sesuai ekspektasi
3. Jika masih stuck, cek `isExplicitSaveSubmitRequest()` patterns

**Console logs untuk debug:**
```javascript
// ACTIVE stage
console.log(`[SearchDecision] ACTIVE stage override: ${activeStageSearchReason}`)

// PASSIVE stage (masih pakai LLM router)
console.log("[WebSearchRouter] Decision:", { enableWebSearch, reason, ... })
```

**Expected behavior setelah fix (ACTIVE stages):**
- Default: `enableWebSearch=true` (search selalu available)
- User bilang "simpan"/"submit" → `enableWebSearch=false` → paper tools tersedia
- Research incomplete → system note injected → AI dipaksa search

### AI janji search tapi tidak melakukan (ACTIVE stage)

**Gejala:**
- AI bilang "Izinkan saya mencari referensi..." tapi tidak ada tool call
- Terjadi di ACTIVE stage (gagasan, topik, dll)

**Root Cause (Fixed 2026-01-15):**
- LLM router non-deterministic → `enableWebSearch: false`
- AI tidak tahu `google_search` tidak tersedia

**Solusi:**
3-layer protection dengan intent detection:
```typescript
const aiPromisedSearch = aiIndicatedSearchIntent(lastAssistantMsg)
if (aiPromisedSearch) {
    enableWebSearch = true
    reason = "ai_promised_search"
}
```

**Patterns yang dideteksi:**
- "Izinkan saya mencari..."
- "Saya akan mencari..."
- "Mari kita cari..."
- "...akan saya carikan..."

**File reference:** `src/lib/ai/paper-search-helpers.ts` → `aiIndicatedSearchIntent()`

---

## Related Documentation

- **CLAUDE.md**: Section "Web Search Constraint"
- **Files Index**: `.references/search-web/files-index.md`
- **AI SDK Citations**: `.references/ai-sdk-inline-citations/`
- **Spec**: `.development/specs/2025-12-16-web-search-grounding/`
- **Paper Search Helpers**: `src/lib/ai/paper-search-helpers.ts` (3-layer protection)
- **Knowledge Base**: `.development/knowledge-base/override-active-stages/research.md`

---

*Last updated: 2026-01-15*
*Updated: 3-layer deterministic protection untuk ACTIVE stages, bypass LLM router*
*Previous: 2026-01-14 - Router stage-aware + explicit search gating, searchAlreadyDone dari stageData*
