# Paper Workflow Revisi (13 Tahap, Outline di Awal) - Indeks File

Rujukan cepat buat lo soal lokasi file alur penulisan paper terbaru. Semua ngikutin `STAGE_ORDER` 13 tahap (outline di tahap 3).

## Lompat Cepat

| Kategori | Jumlah | Isi |
|----------|--------|-----|
| [Backend (Convex)](#backend-convex) | 5 | skema, mutation, tipe, konstanta, artifact rewind |
| [Logika AI](#logika-ai) | 4 | tool, prompt, intent, pengingat |
| [Instruksi Tahap](#instruksi-tahap) | 6 | instruksi per kelompok tahap |
| [Tipe Bersama](#tipe-bersama) | 1 | tipe bersama untuk stageData |
| [Sistem Ekspor](#sistem-ekspor) | 6 | route API, builder, utilitas |
| [Komponen React](#komponen-react) | 9 | komponen UI |
| [Hooks](#hooks) | 1 | usePaperSession |
| [Halaman](#halaman) | 1 | dashboard papers |
| [Titik Integrasi](#titik-integrasi) | 2 | API chat, UI chat |
| **Total** | **35** | |

---

## Backend (Convex)

```
convex/
├── artifacts.ts                  # Rewind: invalidated artifacts (query + mutation)
├── paperSessions.ts              # CRUD mutation & kueri
├── paperSessions/
│   ├── constants.ts              # STAGE_ORDER, getNextStage(), getPreviousStage(), getStageLabel(), getStageNumber()
│   └── types.ts                  # Validator skema Convex untuk stage data
└── schema.ts                     # Definisi tabel paperSessions
```

### Ekspor Kunci dari paperSessions.ts

**Kueri:**
- `getById({ sessionId })`
- `getByConversation({ conversationId })`
- `getByUser({ userId })`
- `getByUserWithFilter({ userId, status?, includeArchived?, sortBy? })`
- `getSessionWithConversation({ sessionId })`

**Mutasi:**
- `create({ userId, conversationId, initialIdea? })`
- `updateStageData({ sessionId, stage, data })`
- `markStageAsDirty({ sessionId })`
- `submitForValidation({ sessionId })`
- `approveStage({ sessionId, userId })`
- `requestRevision({ sessionId, userId, feedback })`
- `archiveSession({ sessionId, userId })`
- `unarchiveSession({ sessionId, userId })`
- `deleteSession({ sessionId, userId })`
- `syncPaperTitle({ sessionId, userId })`
- `updatePaperTitle({ sessionId, userId, title })`
- `rewindToStage({ sessionId, userId, targetStage })` — **Baru 2026-01-11** (rewind feature)

**Kueri Tambahan (Rewind):**
- `getRewindHistory({ sessionId })` — riwayat rewind untuk session

### Ekspor Kunci dari artifacts.ts (Rewind)

- `getInvalidatedByConversation({ conversationId, userId })`
- `clearInvalidation({ artifactId, userId })`

**Catatan kompatibilitas:**
- `LegacyPaperStageId` masih menerima `"elaborasi"` buat data lama.
- `STAGE_ORDER` hanya 13 tahap dan **tidak** memuat `elaborasi`.

---

## Logika AI

```
src/lib/ai/
├── paper-tools.ts                # createPaperTools() - pembuat tool paper
├── paper-mode-prompt.ts          # getPaperModeSystemPrompt() - injeksi prompt
├── paper-intent-detector.ts      # hasPaperWritingIntent() - deteksi intent
└── paper-workflow-reminder.ts    # konstanta PAPER_WORKFLOW_REMINDER
```

### Fungsi Kunci

| File | Fungsi | Deskripsi |
|------|--------|-----------|
| paper-tools.ts | `createPaperTools({ userId, conversationId })` | Mengembalikan 4 tool alur kerja paper |
| paper-mode-prompt.ts | `getPaperModeSystemPrompt(conversationId)` | Mengembalikan string prompt atau "" |
| paper-intent-detector.ts | `hasPaperWritingIntent(message)` | Boolean deteksi intent |
| paper-intent-detector.ts | `detectPaperIntent(message)` | Detail hasil deteksi |

### Update 2026-01-11: updateStageData AUTO-STAGE (Option B Fix)

**paper-tools.ts:**
- `updateStageData` sekarang **tanpa parameter `stage`** — auto-fetch dari `session.currentStage`
- `ringkasan` sekarang **WAJIB** di schema Zod (bukan optional)
- Mencegah bug "Cannot update X while in Y" karena AI tidak bisa salah specify stage

**Perubahan signature:**
```typescript
// LAMA: AI bisa salah specify stage
updateStageData({ stage, data })

// BARU: Stage otomatis dari session
updateStageData({ ringkasan, data? })
```

**Catatan:** Backend mutation masih menerima `stage` parameter, tapi AI tool sekarang auto-fetch.

### Update 2026-01-09: initialIdea Optional + Reminder Tegas

**paper-tools.ts:**
- `startPaperSession.initialIdea` sekarang **opsional** (`z.string().optional()`)
- AI bisa panggil tool tanpa harus punya topik dari user
- Skenario: "Mulai menulis paper" → tool dipanggil tanpa initialIdea

**paper-workflow-reminder.ts:**
- Reminder dipertegas dengan instruksi visual yang lebih mencolok
- Contoh perilaku SALAH vs BENAR ditambahkan
- AI diarahkan untuk SEGERA panggil tool, JANGAN tanya topik dulu

**Referensi detail:** `.references/initial-idea-worklow/implementation-report.md`

**Catatan tool di chat route:**
- `src/app/api/chat/route.ts` memilih salah satu set tool per request: `google_search` **atau** tool paper.
- `src/app/api/chat/route.ts` force `submitStageForValidation` saat user konfirmasi + ringkasan tersedia (toolChoice).

---

## Instruksi Tahap

```
src/lib/ai/paper-stages/
├── index.ts                      # getStageInstructions() router, re-exports
├── formatStageData.ts            # formatStageData() helper, ringkasan + daftar cek
├── foundation.ts                 # Tahap 1-2: gagasan, topik
├── core.ts                       # Tahap 4-7: abstrak, pendahuluan, tinjauan_literatur, metodologi
├── results.ts                    # Tahap 8-10: hasil, diskusi, kesimpulan
└── finalization.ts               # Tahap 3 + 11-13: outline, daftar_pustaka, lampiran, judul
```

### Pemetaan Tahap (13 Tahap)

| No | Stage ID | File |
|----|----------|------|
| 1 | gagasan | foundation.ts |
| 2 | topik | foundation.ts |
| 3 | outline | finalization.ts |
| 4 | abstrak | core.ts |
| 5 | pendahuluan | core.ts |
| 6 | tinjauan_literatur | core.ts |
| 7 | metodologi | core.ts |
| 8 | hasil | results.ts |
| 9 | diskusi | results.ts |
| 10 | kesimpulan | results.ts |
| 11 | daftar_pustaka | finalization.ts |
| 12 | lampiran | finalization.ts |
| 13 | judul | finalization.ts |

---

### Catatan Artifact (Gagasan + Topik)

- `foundation.ts` untuk stage `gagasan` dan `topik` sekarang mewajibkan `createArtifact` sebagai output final yang disepakati.
- `createArtifact` dicantumkan di bagian ALUR dan TOOLS pada `GAGASAN_INSTRUCTIONS` dan `TOPIK_INSTRUCTIONS`.

## Tipe Bersama

```
src/lib/paper/
└── stage-types.ts                # Antarmuka TypeScript stage data (AI + ekspor)
```

---

## Sistem Ekspor

```
src/app/api/export/
├── word/
│   └── route.ts                  # POST /api/export/word
└── pdf/
    └── route.ts                  # POST /api/export/pdf

src/lib/export/
├── content-compiler.ts           # compilePaperContent() - stageData → dokumen
├── validation.ts                 # validateSessionForExport(), getExportableContent()
├── word-builder.ts               # buildWordDocument(), generateWordStream()
└── pdf-builder.ts                # buildPDFContent(), generatePDFStream()
```

### Library Ekspor

| Format | Library | Package |
|--------|---------|---------|
| Word (.docx) | `docx` | docx@^9.5.1 |
| PDF | `pdfkit` | pdfkit@^0.17.2 |

---

## Komponen React

```
src/components/paper/
├── index.ts                      # Ekspor gabungan
├── PaperStageProgress.tsx        # Bar progres 13 tahap
├── RewindConfirmationDialog.tsx  # Dialog konfirmasi rewind
├── PaperValidationPanel.tsx      # Panel setujui/revisi
├── PaperSessionBadge.tsx         # Badge sidebar ("x/13")
├── PaperSessionCard.tsx          # Kartu sesi + aksi
├── PaperSessionsContainer.tsx    # Pembungkus state
├── PaperSessionsList.tsx         # Daftar dengan filter/sort
└── PaperSessionsEmpty.tsx        # Tampilan kosong CTA
```

### Props Ringkas

```typescript
// PaperStageProgress
{ currentStage: string, stageStatus: string, stageData?: Record<string, StageDataEntry>, onRewindRequest?: (targetStage: PaperStageId) => void, isRewindPending?: boolean }

// PaperValidationPanel
{ stageLabel: string, onApprove: () => Promise<void>, onRevise: (feedback: string) => Promise<void>, isLoading?: boolean }

// PaperSessionBadge
{ stageNumber: number, totalStages?: number, className?: string }

// PaperSessionCard
{ session: Doc<"paperSessions">, userId: Id<"users"> }
```

---

## Hooks

```
src/lib/hooks/
└── usePaperSession.ts            # Paper session hook
```

### Tipe Kembalian usePaperSession

```typescript
{
    session: PaperSession | null | undefined;
    isPaperMode: boolean;
    currentStage: PaperStageId | "completed";
    stageStatus: string | undefined;
    stageLabel: string;
    stageNumber: number;
    stageData: Record<string, StageDataEntry>;  // Baru 2026-01-11
    approveStage: (userId: Id<"users">) => Promise<void>;
    requestRevision: (userId: Id<"users">, feedback: string) => Promise<void>;
    updateStageData: (stage: string, data: object) => Promise<void>;
    isLoading: boolean;
    // Rewind functions (Baru 2026-01-11)
    rewindToStage: (userId: Id<"users">, targetStage: PaperStageId) => Promise<void>;
    getStageStartIndex: (messages: PermissionMessage[]) => number;
    checkMessageInCurrentStage: (messageCreatedAt: number) => boolean;
    // Sync functions
    markStageAsDirty: () => void;
}
```

---

## Halaman

```
src/app/(dashboard)/dashboard/papers/
└── page.tsx                      # /dashboard/papers
```

---

## Titik Integrasi

```
src/app/api/chat/
└── route.ts                      # Injeksi prompt + tool

src/components/chat/
├── ChatWindow.tsx                # PaperStageProgress, PaperValidationPanel (approx 530 lines)
│   ├── line 41-51               # usePaperSession hook
│   ├── line 283                 # markStageAsDirty() saat edit message
│   ├── line 396-402             # PaperStageProgress rendering
│   └── line 479-495             # PaperValidationPanel rendering
└── ChatSidebar.tsx               # PaperSessionBadge
```

---

## Pola Pencarian

```bash
# Cari file terkait alur kerja paper
rg "paperSession|paper-tools|paper-mode-prompt|paper-stages" src convex --type ts --type tsx

# Cari urutan tahap
rg "STAGE_ORDER" convex --type ts --type tsx

# Cari instruksi tahap
rg "INSTRUCTIONS" src/lib/ai/paper-stages --type ts
```

---

*Last updated: 2026-01-14*
*Updated: Rewind feature mutations (`rewindToStage`, `getRewindHistory`) + artifact invalidation (`getInvalidatedByConversation`, `clearInvalidation`)*
*Updated: `updateStageData` AI tool AUTO-STAGE (Option B fix), `ringkasan` wajib*
*Updated: `usePaperSession` hook dengan rewind functions*
*Previous: ChatWindow line numbers (507 lines), titik integrasi lebih detail*
*Previous: 2026-01-09 - initialIdea Optional + Reminder Tegas*
