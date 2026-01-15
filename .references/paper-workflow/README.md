# Paper Workflow Revisi (13 Tahap, Outline di Awal) - Referensi Teknis

Dokumentasi ini jadi sumber kebenaran buat alur kerja paper terbaru di Makalah App. Gue tulis supaya lo bisa koreksi dan ngembangin fitur ini tanpa ambigu.

## Daftar Isi

1. [Ikhtisar](#ikhtisar)
2. [Implementasi: Native AI Tools](#implementasi-native-ai-tools)
3. [Prinsip Kerja](#prinsip-kerja)
4. [Struktur 13 Tahap](#struktur-13-tahap)
5. [Status Tahap (Mesin Status)](#status-tahap-mesin-status)
6. [Arsitektur Sistem](#arsitektur-sistem)
7. [Skema Database](#skema-database)
8. [Tool AI dan Injeksi Prompt](#tool-ai-dan-injeksi-prompt)
9. [Instruksi Tahap](#instruksi-tahap)
10. [Komponen UI](#komponen-ui)
11. [Sistem Ekspor](#sistem-ekspor)
12. [Titik Integrasi](#titik-integrasi)
13. [Kompatibilitas Data Lama](#kompatibilitas-data-lama)
14. [Rujukan File](#rujukan-file)

---

## Ikhtisar

Alur kerja ini punya **13 tahap** dengan **outline di tahap 3**, supaya semua tahap setelahnya ngikutin daftar cek outline. Alur ini **linear**, **dialog dulu**, dan wajib **validasi user** sebelum lanjut ke tahap berikutnya.

Fitur kunci:
- **13 tahap terstruktur**: `gagasan` → `topik` → `outline` → ... → `judul`
- **Dialog dulu**: diskusi dulu, baru drafting
- **Validasi manusia**: setujui/revisi per tahap
- **Ringkasan per tahap + daftar cek outline** selalu disuntik ke prompt
- **Artifact final tahap awal**: `gagasan` dan `topik` wajib pakai `createArtifact` untuk hasil yang disepakati
- **Pencarian web** via tool `google_search` kalau butuh data terbaru
- **Ekspor** Word/PDF setelah sesi selesai

---

## Implementasi: Native AI Tools

**PENTING:** Paper workflow ini diimplementasi sebagai **native AI function tools** yang terintegrasi langsung ke chat flow. Bukan skill (`/command`), bukan MCP server terpisah.

### Klasifikasi Mekanisme

| Mekanisme | Digunakan? | Keterangan |
|-----------|------------|------------|
| **Function Tools** | ✅ Ya | 4 tools untuk CRUD session |
| **System Prompt Injection** | ✅ Ya | Instruksi tahap dinamis |
| **State Machine (Database)** | ✅ Ya | Status tahap di Convex |
| **Skill (`/command`)** | ❌ Tidak | Bukan slash command |
| **MCP Server** | ❌ Tidak | Bukan server terpisah |

### Function Tools (AI SDK)

Di `src/lib/ai/paper-tools.ts`, paper workflow diimplementasi sebagai 4 function tools menggunakan `tool()` dari Vercel AI SDK:

```typescript
export const createPaperTools = (context) => {
    return {
        startPaperSession: tool({ ... }),      // Inisialisasi session baru
        getCurrentPaperState: tool({ ... }),   // Ambil state terkini
        updateStageData: tool({ ... }),        // Simpan draft data tahap
        submitStageForValidation: tool({ ... }) // Kirim untuk validasi user
    }
}
```

### Injeksi ke Chat Route

Di `src/app/api/chat/route.ts`, paper tools diinjeksi bersama tools lain:

```typescript
const tools = {
    createArtifact: tool({ ... }),
    renameConversationTitle: tool({ ... }),
    // Paper tools diinjeksi di sini
    ...createPaperTools({
        userId: userId as Id<"users">,
        conversationId: currentConversationId as Id<"conversations">,
    }),
} satisfies ToolSet
```

### Constraint: Routing Tool per Request

AI SDK tidak bisa mix provider-defined tools (`google_search`) dengan function tools dalam 1 request. Jadi per request, AI hanya punya akses ke salah satu:

```typescript
const gatewayTools: ToolSet = enableWebSearch
    ? ({ google_search: wrappedGoogleSearchTool } as unknown as ToolSet)
    : tools  // ← paper tools + createArtifact + renameConversationTitle
```

### Alur Aktivasi Paper Mode

```
User: "Mulai menulis paper" atau "Bantu nulis paper tentang AI"
          │
          ▼
┌─────────────────────────────────┐
│ 1. Intent Detection             │
│    hasPaperWritingIntent()      │
│    → true                       │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 2. Cek Session Existing         │
│    getPaperModeSystemPrompt()   │
│    → "" (belum ada session)     │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 3. Inject Reminder (tegas)      │
│    PAPER_WORKFLOW_REMINDER      │
│    "LANGSUNG panggil tool,      │
│     jangan tanya topik dulu"    │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 4. AI Panggil Tool SEGERA       │
│    startPaperSession({          │
│      initialIdea?: "..." atau   │
│      kosong jika user tidak     │
│      sebut topik                │
│    })                           │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 5. Session Created (Convex)     │
│    currentStage = "gagasan"     │
│    stageStatus = "drafting"     │
│    stageData.gagasan.ideKasar   │
│    = initialIdea || undefined   │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 6. UI: PaperStageProgress       │
│    muncul di chat window        │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 7. AI Respond + Tanya Topik     │
│    (jika initialIdea kosong)    │
│    "Sesi aktif! Apa topik yang  │
│     mau dibahas?"               │
└─────────────────────────────────┘
          │
          ▼
      [Dialog AI + User]
          │
          ▼
┌─────────────────────────────────┐
│ 8. AI Panggil Tools             │
│    updateStageData({ ... })     │
│    submitStageForValidation()   │
└─────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ 9. UI: PaperValidationPanel     │
│    User: [Setujui] / [Revisi]   │
└─────────────────────────────────┘
          │
          ▼
      [Loop ke tahap berikutnya]
```

### Kenapa Native Tools, Bukan Skill?

1. **Seamless integration** - User tidak perlu tahu ada "mode" khusus
2. **Context-aware** - AI bisa detect intent dan auto-activate
3. **Flexible** - Bisa mix dengan artifact creation dan web search (bergantian)
4. **State persistence** - Session tersimpan di database, bisa resume kapan saja

---

## Prinsip Kerja

### 1) Dialog dulu
AI wajib ngajak diskusi dulu, bukan langsung ngeluarin draf final.

### 2) Kolaborasi Proaktif (Update 2026-01-13)
AI wajib kasih rekomendasi, bukan cuma bertanya. User adalah partner, AI juga punya suara.

Setiap stage punya instruksi "KOLABORASI PROAKTIF (WAJIB)":
- JANGAN hanya bertanya tanpa memberikan rekomendasi atau opsi
- Selalu tawarkan 2-3 opsi/angle dengan REKOMENDASI mana yang TERBAIK
- Berikan langkah konkret, bukan hanya pertanyaan terbuka

**Contoh SALAH:**
```
"Mau fokus ke aspek apa dari topik ini?"
```

**Contoh BENAR:**
```
"Ada 3 angle potensial: (1) dampak psikologis - paling relevan karena gap
 literatur besar, (2) dampak akademik - data lebih mudah didapat.
 Saya rekomendasikan angle #1 karena [alasan]. Gimana menurut Kamu?"
```

### 3) Validasi wajib
Setiap tahap harus masuk status **pending_validation** sebelum user setujui. Kalau user minta revisi, status jadi **revision**.

### 4) Ringkasan WAJIB untuk Approval
Setiap tahap punya `ringkasan` yang **wajib diisi sebelum approval**. Backend akan reject approval tanpa ringkasan:

```typescript
// Guard di approveStage
if (!ringkasan || ringkasan.trim() === "") {
    throw new Error(
        "approveStage gagal: Ringkasan wajib diisi. " +
        "Gunakan updateStageData untuk menambahkan ringkasan."
    );
}
```

`submitStageForValidation` juga nge-guard `ringkasan`. Kalau kosong, submit akan error.

Ringkasan semua tahap yang sudah disetujui dirangkum ke prompt, plus daftar cek outline yang selalu tampil sebagai konteks.

### 5) Budget Konten Berbasis Outline
Saat outline punya `totalWordCount`, backend akan enforce budget konten:

- Budget chars = `totalWordCount × 6` (asumsi 5 char/word + space)
- Total konten dihitung dari akumulasi `ringkasan` (estimasi konten)
- Approval diblok jika estimasi total konten > **150%** dari budget
- Ini mencegah paper melebihi scope yang direncanakan

```typescript
if (outlineBudgetChars && totalContentChars > outlineBudgetChars * 1.5) {
    throw new Error(
        `approveStage gagal: Konten melebihi budget outline...`
    );
}
```

### 6) Linear dan konsisten
Tahap cuma boleh maju kalau tahap aktif disetujui. `updateStageData` juga hanya boleh dipakai buat `currentStage`.

---

## Struktur 13 Tahap

| No | Stage ID | Label (UI) | Fokus Utama |
|----|----------|------------|-------------|
| 1 | `gagasan` | Gagasan Paper | curah gagasan + referensi awal |
| 2 | `topik` | Penentuan Topik | topik definitif + gap riset |
| 3 | `outline` | Menyusun Outline | daftar cek struktur paper |
| 4 | `abstrak` | Penyusunan Abstrak | ringkasan penelitian + kata kunci |
| 5 | `pendahuluan` | Pendahuluan | latar belakang + rumusan masalah |
| 6 | `tinjauan_literatur` | Tinjauan Literatur | kerangka teoretis + tinjauan |
| 7 | `metodologi` | Metodologi | desain + teknik analisis |
| 8 | `hasil` | Hasil Penelitian | temuan + titik data |
| 9 | `diskusi` | Diskusi | interpretasi + implikasi |
| 10 | `kesimpulan` | Kesimpulan | ringkas hasil + saran |
| 11 | `daftar_pustaka` | Daftar Pustaka | kompilasi referensi APA |
| 12 | `lampiran` | Lampiran | opsional, bisa dinyatakan kosong |
| 13 | `judul` | Pemilihan Judul | 5 opsi + 1 judul terpilih |

---

## Status Tahap (Mesin Status)

Status yang dipakai:
- `drafting`: tahap aktif, AI sedang menyusun
- `pending_validation`: draf dikirim, tunggu setujui/revisi
- `revision`: user minta revisi, `revisionCount` bertambah
- `approved`: hanya dipakai saat alur kerja selesai (setelah `judul` disetujui)

Transisi inti:
```
drafting → pending_validation → (setujui) → drafting (tahap berikutnya)
                ↑                         ↓
                └──────── revision ←──────┘
```

### Guards pada Transisi

| Transisi | Guard | Error Message |
|----------|-------|---------------|
| `updateStageData` saat `pending_validation` | Blocked | "Minta revisi dulu jika ingin mengubah draft" |
| `updateStageData` dengan key tidak dikenal | Blocked | "updateStageData gagal: Key tidak dikenal..." |
| `submitForValidation` tanpa `ringkasan` | Blocked | "submitForValidation gagal: Ringkasan wajib diisi..." |
| `approveStage` tanpa `ringkasan` | Blocked | "Ringkasan wajib diisi" |
| `approveStage` melebihi budget | Blocked | "Konten melebihi budget outline" |

### Sync Tracking

Saat user edit/regenerate message di paper mode:
- `isDirty` flag di-set `true`
- Flag di-reset `false` saat `approveStage` berhasil

Saat tahap `judul` disetujui:
- `currentStage` → `completed`
- `stageStatus` → `approved`
- `completedAt` terisi
- `paperTitle` disalin dari `stageData.judul.judulTerpilih`

### Rewind Stage (Implementasi)

- Target stage harus sebelum `currentStage` dan maksimal 2 tahap ke belakang.
- Target stage wajib sudah pernah divalidasi (`validatedAt` ada).
- Rewind mengosongkan `validatedAt` untuk stage yang di-invalidasi, menandai `paperMemoryDigest` sebagai `superseded`, dan set `currentStage` ke target serta `stageStatus` ke `drafting`.
- Artifact dari stage yang di-invalidasi ditandai `invalidatedAt` + `invalidatedByRewindToStage`, dan audit dicatat di `rewindHistory`.

---

## Arsitektur Sistem

Garis besar alur:

```
Chat user
  │
  ▼
/api/chat/route.ts
  ├─ deteksi intent (paper-intent-detector)
  ├─ injeksi prompt (paper-mode-prompt)
  └─ tool: createPaperTools atau google_search (bergantian, tidak barengan)
  │
  ▼
Convex (paperSessions)
  ├─ create/update/submit/approve/revision
  └─ stageData + status + metadata
  │
  ▼
UI (ChatWindow)
  ├─ PaperStageProgress
  └─ PaperValidationPanel
```

---

## Skema Database

Tabel utama: `paperSessions` (di `convex/schema.ts`).

Field penting:
- `currentStage`: tahap aktif (`PaperStageId` atau `completed`)
- `stageStatus`: `drafting` | `pending_validation` | `revision` | `approved`
- `stageData`: data semua tahap (opsional per tahap)
- `paperTitle`: sinkron dari `judulTerpilih`
- `completedAt`, `archivedAt`, `createdAt`, `updatedAt`

### Field Sync & Memory (Baru 2026-01-08)

| Field | Tipe | Fungsi |
|-------|------|--------|
| `isDirty` | `boolean?` | True saat chat edited setelah stageData update |
| `paperMemoryDigest` | `array?` | Array keputusan ringkas per tahap |
| `estimatedContentChars` | `number?` | Total chars dari semua ringkasan |
| `estimatedTokenUsage` | `number?` | Estimasi tokens (chars / 4) |

### Pola umum stageData
Semua tahap punya pola umum:
- `ringkasan?: string` - **WAJIB untuk approval**
- `artifactId?: Id<"artifacts">`
- `validatedAt?: number`
- `revisionCount?: number`

Contoh field spesifik (lihat `src/lib/paper/stage-types.ts`):
- `outline.sections[]` + `totalWordCount` + `completenessScore`
- `lampiran.tidakAdaLampiran` + `alasanTidakAda`
- `judul.opsiJudul[]` + `judulTerpilih` + `alasanPemilihan`

Index utama:
- `by_conversation`
- `by_user_updated`
- `by_stage`
- `by_user_archived`

### Tabel tambahan (Rewind)
- `rewindHistory`: sessionId, userId, fromStage, toStage, invalidatedArtifactIds, invalidatedStages, createdAt
- `artifacts`: `invalidatedAt`, `invalidatedByRewindToStage`

---

## Tool AI dan Injeksi Prompt

### Tool khusus paper (createPaperTools)
1. `startPaperSession({ initialIdea? })` — **initialIdea opsional** (update 2026-01-09)
2. `getCurrentPaperState({})`
3. `updateStageData({ ringkasan, data? })` — **AUTO-STAGE: stage otomatis dari session** (update 2026-01-11)
4. `submitStageForValidation({})`

#### Detail `updateStageData` (Update 2026-01-11)

```typescript
updateStageData: tool({
    description: `Simpan progres draf data untuk tahap penulisan SAAT INI ke database.

AUTO-STAGE (PENTING!):
Tool ini OTOMATIS menyimpan ke tahap yang sedang aktif (currentStage).
Lo TIDAK PERLU dan TIDAK BISA specify stage - tool akan auto-fetch dari session.
Ini mencegah error "Cannot update X while in Y".`,
    inputSchema: z.object({
        ringkasan: z.string().max(280).describe(
            "WAJIB! Keputusan utama yang DISEPAKATI dengan user. Max 280 karakter."
        ),
        data: z.record(z.string(), z.any()).optional().describe(
            "Objek data draf lainnya (selain ringkasan)."
        ),
    }),
    // execute auto-fetches stage from session.currentStage
})
```

**Kenapa stage dihapus dari parameter?**
- **Root cause fix**: AI sering bingung panggil `updateStageData({ stage: "topik" })` padahal `currentStage` sudah `"outline"`
- **Option B solution**: Daripada validasi di tool, hapus parameter sama sekali
- **Result**: Tidak mungkin salah stage karena tool selalu fetch dari session

#### Detail `startPaperSession`

```typescript
startPaperSession: tool({
    description: `Inisialisasi sesi penulisan paper baru.

WAJIB panggil tool ini SEGERA saat user menunjukkan niat menulis paper/makalah/skripsi.

Aturan pengisian initialIdea:
- Jika user menyebutkan topik spesifik → gunakan topik tersebut
- Jika user hanya bilang "mulai menulis paper" tanpa topik → kosongkan parameter ini
- JANGAN tunggu user memberikan topik dulu, LANGSUNG panggil tool ini`,
    inputSchema: z.object({
        initialIdea: z.string().optional().describe(
            "Ide kasar, judul awal, atau topik. Opsional - jika user belum menyebutkan topik, boleh dikosongkan."
        ),
    }),
    // ...
})
```

**Skenario pengisian `initialIdea`:**

| Input User | initialIdea |
|------------|-------------|
| "Bantu nulis paper tentang AI di pendidikan" | `"AI di pendidikan"` |
| "Mulai menulis paper" | *(kosongkan)* |
| "Ayo bikin skripsi" | *(kosongkan)* |
| "Saya mau nulis makalah" | *(kosongkan)* |

### Catatan pemakaian tool
- Per request hanya satu set tool yang aktif: `google_search` **atau** tool paper.
- Saat mode pencarian web aktif, `google_search` dipakai dan tool paper tidak dipakai.
- Saat mode pencarian web tidak aktif, tool paper dipakai.
- Server akan memaksa `submitStageForValidation` saat user konfirmasi dan ringkasan sudah ada (menggunakan `toolChoice` di `src/app/api/chat/route.ts`).

### Multi-Turn Pattern untuk Web Search (Update 2026-01-13)

Karena constraint AI SDK (provider-defined tools tidak bisa dicampur dengan function tools), semua stage punya reminder:

```
CATATAN MODE TOOL:
- Jika Kamu pakai google_search, jangan panggil updateStageData/createArtifact/
  submitStageForValidation di turn yang sama.
- Selesaikan pencarian + rangkum temuan dulu, baru simpan draf di turn berikutnya.
```

### Google Search Mode per Stage (Update 2026-01-15)

Semua 13 stage punya akses ke `google_search`, tapi dengan mode berbeda:

| Stage | Mode | Decision Method | Keterangan |
|-------|------|-----------------|------------|
| Gagasan | AKTIF | 3-layer deterministic | Boleh inisiatif search untuk referensi awal |
| Topik | AKTIF | 3-layer deterministic | Boleh inisiatif search untuk research gap |
| Outline | PASIF | LLM router | Hanya jika user minta eksplisit |
| Abstrak | PASIF | LLM router | Hanya jika user minta eksplisit |
| Pendahuluan | AKTIF | 3-layer deterministic | Boleh inisiatif search untuk data/fakta |
| Tinjauan Literatur | AKTIF | 3-layer deterministic | WAJIB search untuk referensi akademik |
| Metodologi | AKTIF | 3-layer deterministic | Boleh search 1-2x untuk contoh metodologi |
| Hasil | PASIF | LLM router | Hanya jika user minta benchmark |
| Diskusi | AKTIF | 3-layer deterministic | Boleh search untuk referensi pembanding |
| Kesimpulan | PASIF | LLM router | Hanya jika user minta eksplisit |
| Daftar Pustaka | PASIF | LLM router | Hanya jika user minta verifikasi |
| Lampiran | PASIF | LLM router | Hanya jika user minta template |
| Judul | PASIF | LLM router | Hanya jika user minta inspirasi |

**Mode AKTIF (3-layer deterministic protection)**:
- Bypass LLM router sepenuhnya
- Search default ON kecuali explicit save/submit request
- File: `src/lib/ai/paper-search-helpers.ts`
- 3 layers: Task-based → Intent-based → Language-based

**Mode PASIF (LLM router)**:
- AI hanya search jika user meminta eksplisit
- Menggunakan `decideWebSearchMode()` function

### 3-Layer Protection untuk AKTIF Stages (Update 2026-01-15)

Di stage AKTIF, keputusan search 100% deterministic:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Priority 1: Task-based                                             │
│  → Cek stageData completion (referensi fields kosong?)              │
│  → Jika incomplete → FORCE search                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Priority 2: Intent-based                                           │
│  → Cek AI's previous message untuk promise to search                │
│  → Patterns: "Izinkan saya mencari...", "Saya akan cari..."         │
│  → Jika AI promised → enable search (honor promise)                 │
├─────────────────────────────────────────────────────────────────────┤
│  Priority 3: Language-based                                         │
│  → Cek user explicit save/submit patterns                           │
│  → Patterns: "simpan", "submit", "lanjut ke tahap berikutnya"       │
│  → Jika save request → disable search                               │
├─────────────────────────────────────────────────────────────────────┤
│  Default: enable search (AKTIF stage default)                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Guarantee:** Di stage AKTIF, AI SELALU punya akses `google_search` kecuali user explicitly minta save/submit.

**File reference:** `src/lib/ai/paper-search-helpers.ts`

### Research Requirements per AKTIF Stage

| Stage | Required Field | Min Count | Description |
|-------|----------------|-----------|-------------|
| gagasan | `referensiAwal` | 2 | referensi awal untuk mendukung kelayakan ide |
| topik | `referensiPendukung` | 3 | referensi pendukung untuk memperkuat topik |
| tinjauan_literatur | `referensi` | 5 | referensi untuk tinjauan literatur |
| pendahuluan | `sitasiAPA` | 2 | sitasi untuk latar belakang |
| diskusi | `sitasiTambahan` | 2 | sitasi untuk mendukung diskusi |

Jika field ini belum terpenuhi, sistem akan **force enable search** dan inject system note yang memaksa AI melakukan pencarian.

### Injeksi prompt (paper-mode-prompt)
Saat ada session aktif, sistem inject:
- Instruksi tahap aktif (`getStageInstructions(stage)`)
- Ringkasan tahap yang sudah disetujui + daftar cek outline (`formatStageData`)
- Catatan status `revision` / `pending_validation`
- Daftar artifact invalidated + instruksi wajib pakai `updateArtifact` (jika ada)

Format prompt (ringkas):
```
[PAPER WRITING MODE]
Tahap: [label] ([stage]) | Status: [status]

ARTIFACT YANG PERLU DI-UPDATE (jika ada):
[daftar artifact invalidated + instruksi updateArtifact]

ATURAN UMUM:
- Diskusi dulu
- google_search kalau perlu
- updateStageData + createArtifact
- submitStageForValidation hanya kalau user setuju

[Instruksi tahap spesifik]

KONTEKS TAHAP SELESAI & CHECKLIST:
[ringkasan + daftar cek outline]
```

### Reminder saat belum ada session (Update 2026-01-09)

Jika intent terdeteksi tapi session belum ada, `PAPER_WORKFLOW_REMINDER` akan dipakai untuk memaksa `startPaperSession` dulu.

**Reminder yang diinjeksi (`paper-workflow-reminder.ts`):**

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║ AKSI WAJIB: Panggil tool "startPaperSession" SEKARANG JUGA                    ║
║                                                                               ║
║ JANGAN tanya topik dulu. JANGAN jelaskan workflow dulu.                       ║
║ LANGSUNG panggil tool, baru setelahnya diskusi dengan user.                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Instruksi kunci dalam reminder:**
1. **SEGERA panggil tool** — jangan tanya topik dulu
2. **initialIdea opsional** — boleh dikosongkan jika user tidak sebut topik
3. **Tool call → THEN respond** — urutan yang benar

**Contoh perilaku AI yang SALAH vs BENAR:**

| Perilaku | Status |
|----------|--------|
| "Bisakah Anda berikan topik yang ingin dibahas?" *(tanpa panggil tool)* | ❌ SALAH |
| `startPaperSession({})` → "Sesi aktif! Apa topik yang mau dibahas?" | ✅ BENAR |

Pengecualian di reminder:
- User eksplisit bilang "jangan pakai workflow" / "langsung saja"
- User hanya minta penjelasan konsep atau template/format

---

## Instruksi Tahap

Lokasi file instruksi:
- `foundation.ts` → tahap 1-2
- `finalization.ts` → tahap 3 + 11-13
- `core.ts` → tahap 4-7
- `results.ts` → tahap 8-10
- `index.ts` → router `getStageInstructions(stage)`

Catatan implementasi:
- Outline ada di tahap 3 dan jadi daftar cek utama untuk semua tahap setelahnya.
- Semua tahap 4-13 didorong sebagai elaborasi per bagian berdasarkan outline.
- Di `finalization.ts`, beberapa instruksi masih menyebut "elaborasi" sebagai konteks, tapi **bukan** stage terpisah di `STAGE_ORDER`.
- Di `foundation.ts`, stage `gagasan` dan `topik` menuliskan output final via `createArtifact`.

---

## Komponen UI

Komponen utama:
- `PaperStageProgress`: bar progres 13 tahap + opsi rewind (butuh `stageData` + `onRewindRequest`)
- `PaperValidationPanel`: panel setujui/revisi
- `PaperSessionBadge`: badge jumlah tahap (x/13)
- `RewindConfirmationDialog`: dialog konfirmasi sebelum rewind

Hook utama:
- `usePaperSession`: ambil session, `stageStatus`, `stageLabel`, `stageNumber`, dan aksi setujui/revisi/update/rewind.

---

## Sistem Ekspor

Endpoint:
- `POST /api/export/word`
- `POST /api/export/pdf`

Alur ekspor:
1. Validasi session (pemilik, tidak diarsipkan, status selesai)
2. `content-compiler.ts` menyusun struktur
3. `word-builder.ts` / `pdf-builder.ts` membuat file

Struktur dokumen mengikuti urutan isi umum:
- Judul
- Abstrak + kata kunci
- Pendahuluan
- Tinjauan Literatur
- Metodologi
- Hasil
- Diskusi
- Kesimpulan
- Daftar Pustaka
- Lampiran

---

## Titik Integrasi

File utama:
- `src/app/api/chat/route.ts` → injeksi prompt + tool
- `src/components/chat/ChatWindow.tsx` (approx 530 lines) → progres + panel validasi
  - line 41-51: `usePaperSession` hook integration
  - line 283: `markStageAsDirty()` saat user edit message
  - line 396-402: `PaperStageProgress` rendering
  - line 505-514: `PaperValidationPanel` rendering
- `src/components/chat/ChatSidebar.tsx` → badge tahap

---

## Kompatibilitas Data Lama

`getStageLabel()` masih menerima `"elaborasi"` lewat `LegacyPaperStageId` untuk sesi lama, tapi `STAGE_ORDER` sudah **13 tahap** tanpa elaborasi.

---

## Rujukan File

Buat daftar file lengkap, lihat:
- `.references/paper-workflow/files-index.md`

File kunci untuk search decision:
- `src/lib/ai/paper-search-helpers.ts` — 3-layer deterministic protection untuk AKTIF stages
- `src/app/api/chat/route.ts` — ACTIVE stage override logic
- `.references/search-web/README.md` — dokumentasi lengkap web search

---

*Last updated: 2026-01-15*
*Updated: 3-layer deterministic protection untuk AKTIF stages, bypass LLM router*
*Previous: 2026-01-14 - KOLABORASI PROAKTIF wajib di semua 13 stage*
*Previous: 2026-01-13 - google_search tersedia di semua stage dengan mode AKTIF/PASIF*
*Previous: 2026-01-11 - `updateStageData` AUTO-STAGE, `ringkasan` WAJIB*
*Previous: 2026-01-09 - initialIdea optional, reminder lebih tegas*

**Referensi detail Rewind Stage**
Detail teknis lengkap ada di:
- `.references/paper-validation-panel/rewind-stage-proposal.md` untuk proposal lengkap
- `.development/specs/2026-01-11-paper-workflow-rewind/` untuk implementasi detail
