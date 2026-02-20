# Chat Feature Spec: Paper Mode and Rewind

Dokumen ini menetapkan spesifikasi runtime Paper Mode dan fitur Rewind pada halaman chat sebagai source of truth untuk maintenance, optimasi, dan konsistensi perilaku frontend-backend.

## 1. Scope

- Paper session lifecycle per conversation.
- Stage flow 13 tahap + status validasi.
- Rewind rules, invalidation behavior, dan audit trail.
- Edit permission boundary pada message di paper mode.
- Integrasi UI sidebar progress/sessions dan panel validasi.
- Integrasi API chat dengan mode paper (tool routing, search policy, auto-submit logic).

## 2. Boundary dan Komponen Utama

- Backend domain:
- `convex/paperSessions.ts`
- `convex/paperSessions/constants.ts`
- `convex/paperSessions/types.ts`
- `convex/artifacts.ts`
- AI tool + prompt orchestration:
- `src/lib/ai/paper-tools.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/paper-workflow-reminder.ts`
- `src/app/api/chat/route.ts`
- Runtime hook:
- `src/lib/hooks/usePaperSession.ts`
- UI chat integration:
- `src/components/chat/ChatWindow.tsx`
- `src/components/paper/PaperValidationPanel.tsx`
- Sidebar integration:
- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/paper/RewindConfirmationDialog.tsx`
- Permission boundary:
- `src/lib/utils/paperPermissions.ts`
- `src/components/chat/MessageBubble.tsx`

## 3. Stage Model dan Status Model

## 3.1 Stage Order (13 Tahap)

Urutan resmi dari `STAGE_ORDER`:

1. `gagasan`
2. `topik`
3. `outline`
4. `abstrak`
5. `pendahuluan`
6. `tinjauan_literatur`
7. `metodologi`
8. `hasil`
9. `diskusi`
10. `kesimpulan`
11. `daftar_pustaka`
12. `lampiran`
13. `judul`

Terminal stage:

- `completed`

## 3.2 Stage Status

Status runtime sesi paper:

- `drafting`
- `pending_validation`
- `revision`
- `approved` (dipakai saat session sudah `completed`)

## 4. Paper Session Lifecycle

## 4.1 Start Session

Trigger:

- AI tool `startPaperSession` dari `createPaperTools`.
- `paperSessions.create` membuat session jika belum ada di conversation tersebut.

Inisialisasi default:

- `currentStage = gagasan`
- `stageStatus = drafting`
- `workingTitle` diambil dari judul conversation (normalized)
- optional `initialIdea` masuk ke `stageData.gagasan.ideKasar`.

Idempotency:

- jika session untuk conversation sudah ada, mutation mengembalikan session existing (tidak buat duplikat).

## 4.2 Update Stage Data

API tool:

- `updateStageData` (AI tool) auto-fetch stage dari `session.currentStage`.
- lalu memanggil `paperSessions.updateStageData` dengan stage aktif.

Guard backend penting:

- stage harus valid dan harus sama dengan `currentStage`.
- update ditolak jika `stageStatus = pending_validation`.
- unknown key di-strip (soft reject) + dicatat ke `systemAlerts`.
- data referensi dinormalisasi.
- string field di-truncate sesuai limit internal (dengan warning).

Kontrak penting:

- `ringkasan` wajib dari sisi tool schema.
- warning dikembalikan backend bila `ringkasan` kosong atau referensi tanpa URL.

## 4.3 Submit for Validation

Mutation: `paperSessions.submitForValidation`

Guard:

- `ringkasan` tahap aktif wajib ada.

Aksi:

- `stageStatus` diubah ke `pending_validation`.

## 4.4 Approve Stage

Mutation: `paperSessions.approveStage`

Guard:

- session owner valid.
- status harus `pending_validation`.
- `ringkasan` wajib ada.
- optional budget guard terhadap outline.

Aksi:

- `validatedAt` ditulis ke stage aktif.
- `currentStage` pindah ke stage berikutnya (atau `completed`).
- `stageStatus` jadi `drafting` (atau `approved` saat selesai).
- `isDirty` di-reset ke `false`.
- `paperMemoryDigest` ditambah entry keputusan stage.
- estimasi konten/token diupdate.
- jika stage `judul` punya `judulTerpilih`, set `paperTitle` final.

## 4.5 Request Revision

Mutation: `paperSessions.requestRevision`

Aksi:

- `stageStatus = revision`
- `revisionCount` stage aktif dinaikkan.

## 4.6 Mark Stage Dirty

Mutation: `paperSessions.markStageAsDirty`

Dipanggil ketika edit/regenerate message di paper mode.

Aksi:

- set `isDirty = true`.

Tujuan:

- memberi sinyal bahwa percakapan sudah berubah dari snapshot terakhir yang disetujui.

## 5. Rewind Lifecycle

## 5.1 Rewind Rules (Backend Canonical)

Mutation: `paperSessions.rewindToStage`

Rule validasi:

- target stage harus sebelum stage saat ini.
- maksimal rewind 2 tahap ke belakang.
- target stage harus pernah divalidasi (`validatedAt` ada).

## 5.2 Rewind Effects

Saat rewind sukses:

1. tentukan daftar stage yang di-invalidate (`target` sampai sebelum `current`).
2. `validatedAt` stage-stage tersebut di-clear.
3. `paperMemoryDigest` entry stage terkait ditandai `superseded = true`.
4. artifact dari stage terdampak ditandai:
- `invalidatedAt`
- `invalidatedByRewindToStage`
5. catat audit ke tabel `rewindHistory`.
6. update session:
- `currentStage = targetStage`
- `stageStatus = drafting`

## 5.3 Rewind Side Effect di Client

`usePaperSession.rewindToStage` setelah sukses:

- mengirim system message ke conversation:
- `[Rewind ke <stage>] User kembali ke tahap ...`

Tujuan:

- memberi konteks eksplisit ke AI pada turn berikutnya.

## 5.4 Rewind UI Flow

Di `SidebarProgress`:

- stage completed yang memenuhi syarat rewind jadi clickable.
- klik stage membuka `RewindConfirmationDialog`.
- confirm memanggil `rewindToStage`.

Dialog menampilkan:

- dari stage sekarang ke stage target.
- warning bahwa artifact/keputusan stage terkait akan jadi `invalidated`.

## 6. Edit Permission Boundary (Paper Mode)

Rules di `paperPermissions.isEditAllowed`:

1. non-paper mode: edit selalu boleh.
2. hanya user message yang bisa diedit.
3. message pada stage yang sudah approved (sebelum `currentStageStartIndex`) tidak bisa diedit.
4. pada stage aktif, hanya 2 user turn terakhir yang bisa diedit.

Integrasi:

- `MessageBubble` pakai hasil permission ini untuk enable/disable tombol edit + reason tooltip.

## 7. UI Integration Contract

## 7.1 ChatWindow Integration

`ChatWindow` terhubung dengan `usePaperSession` untuk:

- `isPaperMode`
- `stageStatus`
- `approveStage`
- `requestRevision`
- `markStageAsDirty`
- `getStageStartIndex`

Behavior:

- `PaperValidationPanel` tampil hanya ketika:
- paper mode aktif
- `stageStatus = pending_validation`
- user tersedia
- chat tidak sedang streaming.
- approve/revise mengirim synthetic user message agar AI aware:
- approve: `[Approved: <stage>] ...`
- revise: `[Revisi untuk <stage>] ...`

## 7.2 SidebarProgress Integration

Menampilkan:

- progress bar stage (`stageNumber/13`).
- timeline semua stage (`completed/current/pending`).
- rewind eligibility per stage berdasar `stageData.validatedAt` + max 2 stage rule.

## 7.3 SidebarPaperSessions Integration

Menampilkan:

- sesi paper aktif untuk conversation aktif.
- judul paper resolved (`paperTitle` > `workingTitle` > conversation title).
- daftar artifact latest version per kelompok.
- badge artifact:
- `FINAL` jika tidak invalidated
- `REVISI` jika invalidated.

## 8. API Chat Integration (Paper Mode Routing)

Di `POST /api/chat`:

- jika paper session aktif:
- inject `paperModePrompt`.
- apply stage policy (`active | passive | none`) untuk keputusan websearch.
- active stage override dipakai untuk mencegah loop search yang tidak perlu.
- websearch dan function tools tetap mutually exclusive per request.

Behavior penting:

- jika intent paper terdeteksi tapi session belum ada:
- force paper tools mode agar AI memanggil `startPaperSession` dulu.
- dalam kondisi save/confirmation tertentu, backend bisa force `toolChoice = submitStageForValidation` jika syarat terpenuhi.
- hasil websearch bisa di-append otomatis ke `stageData` via `appendSearchReferences`.

## 9. Invalidation dan Artifact Consistency

- rewind tidak menghapus artifact, tapi menandai invalid.
- artifact invalid ditampilkan warning di viewer/sidebar.
- update artifact membuat versi baru yang bersih dari invalidation flag.
- `paper-mode-prompt` memasukkan daftar invalidated artifacts ke konteks AI agar AI diarahkan ke `updateArtifact`, bukan `createArtifact`.

## 10. Invariant yang Harus Dijaga

- stage order harus mengikuti `STAGE_ORDER` tunggal.
- transisi approve harus selalu lewat `pending_validation`.
- rewind limit backend tetap max 2 stage.
- edit user message pada stage approved tetap terkunci.
- perubahan pada chat (edit/regenerate) harus menandai `isDirty` di paper mode.
- invalidated artifact harus tetap terlihat sebagai status revisi sampai diperbarui.

## 11. Known Constraints Saat Ini

- `PAPER_WORKFLOW_REMINDER` masih menyebut `PaperStageProgress`, sementara runtime aktif saat ini memakai `SidebarProgress`.
- validasi rewind ada di frontend (`SidebarProgress`) dan backend (`paperSessions.rewindToStage`); backend adalah sumber kebenaran, frontend hanya pre-check UX.
- ada dua jalur update stage data:
- AI tool path auto-stage (`paper-tools.ts`)
- hook path manual stage param (`usePaperSession.updateStageData`)
- untuk konsistensi AI flow, jalur auto-stage tetap canonical.

## 12. File Referensi

- `convex/paperSessions/constants.ts`
- `convex/paperSessions/types.ts`
- `convex/paperSessions.ts`
- `convex/artifacts.ts`
- `src/lib/hooks/usePaperSession.ts`
- `src/lib/utils/paperPermissions.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/ai/paper-mode-prompt.ts`
- `src/lib/ai/paper-workflow-reminder.ts`
- `src/app/api/chat/route.ts`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/paper/PaperValidationPanel.tsx`
- `src/components/paper/RewindConfirmationDialog.tsx`
- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
