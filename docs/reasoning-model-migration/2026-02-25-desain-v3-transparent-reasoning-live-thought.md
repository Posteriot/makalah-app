# Desain V3: Transparent Reasoning (Live Thought Stream)

Tanggal: 25 Februari 2026
Status: Draft Desain V3 (menggantikan V2)
Scope: Reasoning pipeline + UI di chat runtime (worktree `feature/paper-prompt-compression`)

Dokumen terkait:
- [Desain V2](./2026-02-25-desain-v2-conversational-curated-trace.md) (superseded)
- [Desain V1](./2026-02-25-desain-visible-reasoning-curated-trace.md) (superseded)

---

## 1) Latar Masalah (Mengapa V3)

V2 memperbaiki visual dari status-card ke timeline naratif, tapi konten reasoning masih **template statis**:

| Aspek | V2 (Saat Ini) | Masalah |
|-------|---------------|---------|
| Status bar | "Sedang menyusun jawaban final..." | Template, bukan pikiran model |
| Panel step label | "Memahami kebutuhan user" | Hardcoded di `STEP_LABELS` |
| Panel step detail | "Mode chat normal aktif" | Template dari `meta.note` |

User melihat proses yang **terasa scripted**, bukan AI yang benar-benar berpikir. Ini merusak trust — UI berjanji "visible reasoning" tapi yang ditampilkan cuma checklist templat.

**Benchmark**: ChatGPT "Thinking" panel dan Claude Code reasoning menampilkan pikiran model yang **aktual dan dinamis** — setiap turn berbeda karena memang berasal dari proses berpikir yang berbeda.

---

## 2) Objective V3

1. Tampilkan **pikiran asli model** di UI, bukan template.
2. Progressive: pikiran muncul **real-time** saat model berpikir, bukan setelah selesai.
3. Structured: setelah selesai, pikiran dipetakan ke timeline step (dot + vertical line).
4. Persistent: trace final (dengan reasoning ringkas) tersimpan dan bisa dibuka ulang.
5. Tetap kompatibel dengan paper workflow, web search, dan tool-calling.

---

## 3) Perubahan Prinsip dari V2

| Prinsip V2 | Prinsip V3 | Alasan |
|------------|------------|--------|
| "No raw CoT" — pikiran model dilarang tampil | **Transparent reasoning** — pikiran model HARUS tampil | Trust user lebih kuat dengan transparansi asli |
| Template-based curated trace | **Live thought capture** — konten dari model | Template terasa fake |
| Headline = template kalimat aktif | Headline = **kalimat terakhir dari pikiran model** | Dinamis, berubah tiap turn |
| Step detail = `meta.note` statis | Step detail = **ringkasan reasoning per step** (1-2 kalimat) | Kontekstual |

**Safety tetap dijaga** melalui sanitasi server-side (bukan pemblokiran total).

---

## 4) Arsitektur Pipeline

### 4.1 Data Flow

```
User message
  |
  v
[streamText] — providerOptions: { google: { thinkingConfig: { includeThoughts: true } } }
  |
  |-- reasoning-delta chunks ──> Server: accumulate + emit data-reasoning-thought ──> Client: live thought display
  |
  |-- text-delta chunks ──────> Server: forward as normal text ──> Client: response text
  |
  |-- finish ─────────────────> Server: segment reasoning → curated steps ──> Client: structured timeline
  |                             Server: persist trace snapshot to DB
  v
Response complete
```

### 4.2 Dua Fase Per Turn

**Fase 1 — Thinking (reasoning-delta aktif)**
- Server menerima `reasoning-delta` chunks dari `result.fullStream`
- Setiap chunk langsung di-emit ke client sebagai `data-reasoning-thought` event
- Client menampilkan teks pikiran secara progressive di status bar area
- Buffer reasoning terakumulasi di server

**Fase 2 — Responding (text-delta aktif)**
- Reasoning selesai, `text-delta` mulai datang
- Server memproses accumulated reasoning:
  - Sanitasi (hapus referensi system prompt, credential-like patterns)
  - Segmentasi ke curated steps (1-2 kalimat per step)
- Emit `data-reasoning-trace` events dengan konten dinamis
- Forward `text-delta` ke client seperti biasa
- Pada `finish`, persist trace ke DB

### 4.3 Komponen yang Berubah

| File | Perubahan |
|------|-----------|
| `src/lib/ai/streaming.ts` | `includeThoughts: false` → `true` |
| `src/app/api/chat/route.ts` | Iterate `fullStream` (bukan `toUIMessageStream`), intercept reasoning-delta, emit custom events |
| `src/lib/ai/curated-trace.ts` | Hapus `STEP_LABELS` template. Tambah method `populateFromReasoning(text)` yang segment reasoning text ke steps |
| `src/components/chat/ChatWindow.tsx` | Handle `data-reasoning-thought` parts, accumulate untuk display |
| `src/components/chat/ChatProcessStatusBar.tsx` | Tampilkan live thought text saat Fase 1 |
| `src/components/chat/ReasoningTracePanel.tsx` | Step detail menampilkan `thought` field (reasoning asli) |

---

## 5) Kontrak Data Baru

### 5.1 Event: `data-reasoning-thought` (BARU)

Dikirim progressive selama Fase 1 (model berpikir):

```ts
{
  type: "data-reasoning-thought"
  id: string            // unique per chunk
  data: {
    traceId: string     // trace ID turn ini
    delta: string       // potongan teks reasoning (incremental)
    ts: number          // timestamp
  }
}
```

### 5.2 Event: `data-reasoning-trace` (DIMODIFIKASI)

Dikirim setelah Fase 1 selesai, dengan konten dinamis:

```ts
{
  type: "data-reasoning-trace"
  id: string
  data: {
    traceId: string
    stepKey: CuratedTraceStepKey
    label: string         // DINAMIS: derived dari reasoning (bukan template)
    status: CuratedTraceStepStatus
    progress: number
    ts: number
    meta?: {
      thought?: string    // BARU: 1-2 kalimat reasoning asli untuk step ini
      note?: string       // konteks teknis (tool name, source count, dll)
      sourceCount?: number
      toolName?: string
      stage?: string
      mode?: "normal" | "paper" | "websearch"
    }
  }
}
```

### 5.3 Persistence: `reasoningTrace` (DIMODIFIKASI)

```ts
{
  version: 2            // bump dari 1
  headline: string      // derived dari reasoning, bukan template
  traceMode: "transparent"  // ganti dari "curated"
  completedAt: number
  steps: Array<{
    stepKey: CuratedTraceStepKey
    label: string       // dinamis
    status: CuratedTraceStepStatus
    progress?: number
    ts: number
    thought?: string    // BARU: reasoning ringkas per step (max 200 chars)
    meta?: CuratedTraceMeta
  }>
}
```

---

## 6) Algoritma Segmentasi Reasoning

Setelah Fase 1, server punya full reasoning text. Perlu dipecah ke 6 curated steps.

### 6.1 Pendekatan: Keyword-Based Segmentation

Setiap step punya keyword affinity:

| Step | Keywords (dalam reasoning) |
|------|---------------------------|
| `intent-analysis` | "user", "ingin", "minta", "butuh", "pertanyaan", "maksud" |
| `paper-context-check` | "paper", "sesi", "stage", "tahap", "workflow", "makalah" |
| `search-decision` | "cari", "search", "web", "referensi", "sumber", "internet" |
| `source-validation` | "validasi", "sumber", "kredibel", "sitasi", "jurnal" |
| `tool-action` | "tool", "function", "panggil", "jalankan", "aksi" |
| `response-compose` | "jawab", "susun", "tulis", "respons", "sampaikan" |

### 6.2 Algoritma

```
1. Split reasoning text menjadi kalimat-kalimat
2. Untuk setiap kalimat, hitung keyword match score per step
3. Assign kalimat ke step dengan score tertinggi
4. Untuk setiap step, ambil 1-2 kalimat teratas sebagai `thought`
5. Untuk step tanpa match, gunakan fallback generik kontekstual
6. Generate `label` dari kalimat pertama thought (truncate 80 chars)
```

### 6.3 Fallback

Jika reasoning terlalu pendek atau keyword match gagal:
- Gunakan seluruh reasoning text sebagai `thought` untuk `intent-analysis`
- Step lain mendapat label kontekstual (bukan template, tapi derived dari mode/stage)

---

## 7) Interaction Model UI

### 7.1 Fase 1 — Model Berpikir

**Status bar:**
```
[live thought text yang terus bertambah...]                    ██████░░░░ 34%
```
- Teks pikiran model muncul progressive, scroll horizontal jika panjang
- Satu baris, truncate di akhir jika melebihi lebar
- Progress bar teal tetap berjalan di bawah
- Klikable: buka panel untuk lihat full thought stream

**Panel (jika dibuka saat Fase 1):**
- Teks reasoning muncul streaming, kayak ChatGPT "Thinking" panel
- Belum ada timeline step — hanya flowing monologue text
- Font: Geist Sans, warna muted-foreground

### 7.2 Fase 2 — Model Merespons

**Status bar:**
- Progress bar lanjut sampai 100%
- Teks berubah ke label step yang sedang aktif (dari reasoning)

### 7.3 Fase 3 — Selesai

**Status bar:**
```
Memproses 1m 23d  >
```
- ChatGPT style, muted, klikable

**Panel (jika dibuka):**
- Header "Proses"
- Timeline dot + vertical line dengan 6 steps
- Setiap step: label dinamis + thought detail (1-2 kalimat dari reasoning)
- Transisi smooth dari flowing monologue → structured timeline

---

## 8) Safety & Sanitasi

### 8.1 Server-Side Sanitasi

Sebelum emit `data-reasoning-thought` ke client:

1. **Strip system prompt references**: Hapus kalimat yang mengandung "system prompt", "instruksi", "CLAUDE.md"
2. **Strip credential patterns**: Regex untuk API keys, tokens, secrets
3. **Length limit**: Max 500 chars per thought chunk, max 200 chars per step thought
4. **Allowlist bahasa**: Hanya forward kalimat dalam bahasa Indonesia/Inggris natural
5. **Strip internal tool names**: Ganti nama internal function dengan label user-friendly

### 8.2 Apa yang TIDAK Diblokir

- Pikiran model tentang user intent: "User mau diskusi paper..." ✅
- Analisis konteks: "Belum ada sesi paper aktif..." ✅
- Keputusan: "Gue rasa perlu cari referensi dulu..." ✅
- Refleksi: "Jawaban ini perlu lebih spesifik..." ✅

### 8.3 Apa yang Diblokir

- Referensi system prompt / instruksi internal ❌
- Credential / API key / secret ❌
- Raw JSON / code blocks dari tool internals ❌

---

## 9) Backward Compatibility

### 9.1 Version Migration

- `reasoningTrace.version === 1` (V2 data): Render seperti sekarang — label template, no thought field
- `reasoningTrace.version === 2` (V3 data): Render dengan thought field, label dinamis
- Client code harus handle kedua versi

### 9.2 Fallback saat Reasoning Kosong

Jika model tidak menghasilkan reasoning (budget habis, model non-reasoning):
- Fallback ke template kontekstual (bukan V2 hardcoded, tapi derived dari konteks request)
- Steps tetap muncul, tapi tanpa thought field

### 9.3 Admin Config

Existing admin config `reasoningTraceMode` diperluas:
- `"curated"` → V2 behavior (template, backward compat)
- `"transparent"` → V3 behavior (live thought stream)

---

## 10) Responsiveness

Sama dengan V2:
1. Desktop (>= md): panel side drawer kanan
2. Mobile (< md): bottom sheet
3. Status bar inline di semua breakpoint
4. Live thought text truncate single-line di mobile

---

## 11) Acceptance Criteria V3

1. Status bar menampilkan **pikiran asli model** saat processing, bukan template
2. Pikiran muncul **progressive** (real-time streaming), bukan setelah selesai
3. Panel menampilkan **timeline step dengan reasoning per step** (1-2 kalimat)
4. Step label dan detail **berbeda setiap turn** (dinamis, bukan hardcoded)
5. Reasoning yang mengandung info sensitif **tersanitasi** sebelum sampai client
6. Trace final **persistent** dan bisa dibuka ulang dari histori
7. **Backward compatible** dengan data V2 existing
8. Paper mode + websearch mode tetap berfungsi tanpa regression
