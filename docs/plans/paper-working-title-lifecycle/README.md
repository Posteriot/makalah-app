# Paper Working Title Lifecycle - As Built

> Dokumen ini menjelaskan implementasi aktual (as-built) fitur working title pada Paper Sessions berdasarkan kode saat ini.

## Status

- Status implementasi: selesai di codebase
- Fokus: lifecycle judul paper sementara (`workingTitle`) dan sinkronisasinya dengan judul final (`paperTitle`)
- Branch implementasi: `feat/chatpage-redesign-mechanical-grace`

---

## Scope

Yang dicakup:
- Data model `paperSessions` untuk title lifecycle
- Mutation backend untuk seed, update, sync, dan lock
- Resolver judul tunggal untuk konsistensi UI
- Integrasi UI di sidebar dan card Paper Sessions
- Migration backfill untuk data existing

Yang tidak dicakup:
- Perubahan lifecycle `conversations.title`
- Perubahan alur 13 tahap selain bagian judul
- Perubahan bisnis export, rewind, billing, dan auth flow

---

## Ringkasan Arsitektur

Implementasi saat ini memisahkan 3 domain judul:

1. `conversations.title`
- Judul percakapan chat.

2. `paperSessions.workingTitle`
- Judul kerja sementara (renameable sebelum judul final terbentuk).

3. `paperSessions.paperTitle`
- Judul final paper.

Aturan utama:
- Selama `paperTitle` belum ada, user bisa rename `workingTitle`.
- Saat `paperTitle` sudah ada, rename `workingTitle` dikunci.
- Sumber display title di UI memakai resolver tunggal agar konsisten.

---

## Data Model

File:
- `convex/schema.ts`

Implementasi:
- Tabel `paperSessions` memiliki field:
  - `workingTitle: v.optional(v.string())`
  - `paperTitle: v.optional(v.string())`

Catatan:
- `workingTitle` dan `paperTitle` sama-sama opsional untuk menjaga kompatibilitas data lama.

---

## Backend Lifecycle

File:
- `convex/paperSessions.ts`

### Konstanta dan normalisasi

Implementasi helper:
- `DEFAULT_WORKING_TITLE = "Paper Tanpa Judul"`
- `MAX_WORKING_TITLE_LENGTH = 80`
- `PLACEHOLDER_CONVERSATION_TITLES = {"Percakapan baru", "New Chat"}`
- `normalizePaperTitle()` untuk trim + collapse whitespace

### `create`

- Saat membuat paper session baru, `workingTitle` di-seed dari `conversation.title`.
- Jika title percakapan kosong/placeholder, fallback ke `"Paper Tanpa Judul"`.

### `approveStage`

- Saat stage aktif adalah `judul` dan `judulTerpilih` valid:
  - `paperTitle` di-set ke judul final (sudah dinormalisasi)
  - `workingTitle` di-set ke nilai yang sama (sinkron atomik)

### `syncPaperTitle`

- Mengambil `judulTerpilih` dari `stageData.judul`.
- Patch keduanya sekaligus:
  - `paperTitle`
  - `workingTitle`

### `updatePaperTitle`

- Update manual `paperTitle` juga langsung sinkron ke `workingTitle`.

### `updateWorkingTitle` (baru)

Args:
- `sessionId`, `userId`, `title`

Behavior:
- Validasi owner session
- Tolak jika `paperTitle` sudah ada (lock final title)
- Validasi title:
  - tidak boleh kosong
  - maksimal 80 karakter
  - normalisasi whitespace
- Jika valid, update `workingTitle`

Error lock:
- `"Judul final sudah ditetapkan. Working title tidak bisa diubah lagi."`

---

## Migration Backfill

File:
- `convex/migrations/backfillWorkingTitle.ts`

Command:
- `npx convex run "migrations/backfillWorkingTitle:backfillWorkingTitle"`

Rule backfill:
1. Jika `paperTitle` ada dan valid -> pakai `paperTitle`
2. Jika tidak, coba `conversation.title` non-placeholder
3. Jika tidak ada keduanya -> `"Paper Tanpa Judul"`

Karakteristik:
- Idempotent
- Session dengan `workingTitle` yang sudah valid akan di-skip

---

## Title Resolver (Sumber Tunggal UI)

File:
- `src/lib/paper/title-resolver.ts`

Fungsi:
- `resolvePaperDisplayTitle({ paperTitle, workingTitle, conversationTitle })`

Prioritas resolusi:
1. `paperTitle`
2. `workingTitle`
3. `conversation.title` (non-placeholder)
4. fallback `"Paper Tanpa Judul"`

Output:
- `displayTitle`
- `source` (`paperTitle` | `workingTitle` | `conversationTitle` | `fallback`)

---

## Integrasi Frontend

### 1) Sidebar Paper Sessions

File:
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`

Implementasi saat ini:
- Header copy:
  - `Sesi Paper`
  - `Folder * Artifak`
- Folder title menggunakan resolver
- Display folder title diubah ke format underscore untuk tampilan:
  - `displayTitle.replace(/\s+/g, "_")`
- Inline rename working title:
  - Enter: simpan
  - Escape: batal
  - Blur: trigger simpan
- Edit button hanya muncul jika `paperTitle` belum ada
- Error/success feedback menggunakan `sonner` toast

Catatan UI:
- Radius kotak folder title saat ini `rounded-sm` agar konsisten dengan item artifact/stage.

### 2) Sidebar Progress

File:
- `src/components/chat/sidebar/SidebarProgress.tsx`

Implementasi saat ini:
- Subtitle title paper memakai resolver yang sama
- Query `conversations.getConversation` dipakai untuk fallback resolver

### 3) Paper Session Card

File:
- `src/components/paper/PaperSessionCard.tsx`

Implementasi saat ini:
- Card title memakai resolver yang sama
- Fallback custom lama dihapus, diganti resolver tunggal

### 4) Hook integration

File:
- `src/lib/hooks/usePaperSession.ts`

Implementasi saat ini:
- expose method `updateWorkingTitle(userId, title)`
- method ini memanggil mutation `api.paperSessions.updateWorkingTitle`

---

## Guardrails yang Aktif

1. Lock rename setelah judul final
- Enforcement ada di backend (`updateWorkingTitle`) dan UI (button disembunyikan)

2. Normalisasi title
- Backend selalu menormalisasi whitespace untuk `paperTitle` dan `workingTitle`

3. Placeholder handling
- `Percakapan baru` dan `New Chat` tidak dipakai sebagai seed/fallback utama jika ada opsi lain

---

## Batasan Implementasi Saat Ini

1. Validasi panjang title (max 80) dipastikan di backend.
- UI belum menampilkan counter karakter.

2. Dokumentasi ini tidak menyatakan status eksekusi migration di environment tertentu.
- File migration sudah tersedia di repo, tetapi eksekusinya tergantung environment deployment.

---

## File Index

- `convex/schema.ts`
- `convex/paperSessions.ts`
- `convex/migrations/backfillWorkingTitle.ts`
- `src/lib/paper/title-resolver.ts`
- `src/lib/hooks/usePaperSession.ts`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/paper/PaperSessionCard.tsx`
- `docs/plans/paper-working-title-lifecycle/implementation-task-plan.md`

---

## Verification Snapshot

Snapshot validasi terakhir di branch implementasi:
- `npm run lint` lulus (1 warning existing non-blocking di `src/components/chat/ArtifactPanel.tsx`)
- `npm run build` lulus
