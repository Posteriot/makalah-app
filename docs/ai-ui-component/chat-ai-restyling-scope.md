# Chat AI UI Restyling Scope

## Ringkasan
Dokumen ini mendefinisikan scope UI/component yang akan di-restyling khusus untuk area chat AI non-artifact dan non-refrasa. Fokusnya adalah elemen yang muncul saat interaksi berjalan (submitted, streaming, waiting, error, validation), termasuk indikator tool, status pencarian, reasoning flow, composer context tray, dan panel validasi paper.

## Scope Final Yang Di-Restyling
1. ChatWindow interaksi utama: pending lane, quota warning banner, error overlay, status flow.
2. MessageBubble dinamis: tool indicators, search status, sources, quick actions, edit state.
3. ChatProcessStatusBar + ReasoningActivityPanel + ReasoningTracePanel.
4. ChatInput + FileUploadButton + context tray + stop generating button.
5. PaperValidationPanel (approve/revise) + RewindConfirmationDialog.

## Tambahan Komponen Yang Kini Tercatat Eksplisit
- Trigger detail reasoning dari `ChatProcessStatusBar` saat proses selesai, yang membuka panel kanan/bawah "proses berpikir model".
- Fallback indikator proses assistant (`assistant_response`) saat stream berjalan tetapi tidak ada sinyal tool/search.
- Keputusan status `ready/completed` pada `ChatProcessStatusBar`: dipertahankan (tidak diubah visual utamanya) agar konsisten dengan affordance panel reasoning.

## Detail Per Scope

### 1) ChatWindow Interaksi Utama
- **File utama**: `src/components/chat/ChatWindow.tsx`
- **Peran**: Orkestrator render area message + input + status flow proses AI.
- **UI/component di dalam scope ini**:
  - `PendingAssistantLaneIndicator`
    - Loader lane berbentuk orb + progress line.
    - Muncul saat assistant masih pending dan belum ada final message assistant.
  - Loading skeleton history
    - Muncul saat `isHistoryLoading` atau `isConversationLoading` dan message list masih kosong.
  - Empty state starter
    - `TemplateGrid` untuk starter prompt saat message kosong.
  - Message list virtualized
    - `Virtuoso` sebagai container list message.
    - Row khusus `pending-indicator` saat stream belum masuk ke bubble assistant terakhir.
  - Error overlay
    - Banner error bawah area message saat `error` dari `useChat`.
    - Tombol retry memanggil `handleRegenerate()`.
  - `QuotaWarningBanner`
    - Banner billing warning/depleted di bawah top bar chat.
    - Muncul adaptif berdasarkan tier:
      - Gratis/Pro: warning saat kuota tinggi, depleted saat kuota habis.
      - BPP: warning/critical saat kredit menipis, depleted saat kredit habis.
    - CTA mengarah ke halaman subscription (`/subscription/overview`, `/subscription/upgrade`, `/subscription/plans`) sesuai konteks.
  - Process state machine (internal visual state)
    - `processUi.status`: `submitted` | `streaming` | `ready` | `error` | `stopped`.
    - `processUi.progress`, `elapsedSeconds`, timer interval/hide logic.
  - Footer validation trigger
    - `PaperValidationPanel` dirender sebelum input saat `isPaperMode && stageStatus === "pending_validation" && status !== "streaming"`.
- **Dependensi penting**:
  - `useChat` (`@ai-sdk/react`)
  - `useMessages` (history)
  - `usePaperSession`
  - `Virtuoso`
  - `sonner` toast
- **Constraint/edge case**:
  - Pending indicator punya dua posisi render: standalone row atau sebelum bubble assistant terakhir.
  - Auto-scroll behavior beda saat generating vs ready.
  - Starter prompt auto-send pakai `sessionStorage` payload per conversation.

### 2) MessageBubble Dinamis
- **File utama**: `src/components/chat/MessageBubble.tsx`
- **Peran**: Renderer bubble user/assistant dengan semua blok dinamis per-message.
- **UI/component di dalam scope ini**:
  - User bubble edit state
    - Tombol edit (dengan permission + tooltip reason).
    - Inline textarea edit.
    - Tombol `Batal` / `Kirim`.
  - Attachment chips pada message user
    - Badge file/image + nama + size.
    - Inline image preview untuk part `file` bertipe image.
  - Process indicator slot di atas konten assistant
    - `ToolStateIndicator` untuk status tool-call.
    - `SearchStatusIndicator` untuk status data-search.
    - Fallback `ToolStateIndicator` (`assistant_response`) jika stream sedang jalan tapi tidak ada signal tool/search.
    - Style `SearchStatusIndicator` disejajarkan dengan style `ToolStateIndicator` untuk konteks `google_search`.
  - Konten markdown
    - Render via `MarkdownRenderer`.
    - Mendukung normalization untuk legacy inline citations.
  - Sources block
    - `SourcesIndicator` sebagai collapsible daftar referensi.
  - Quick actions block
    - `QuickActions` (copy response).
  - Auto user action cards
    - Render khusus untuk format `[Approved: ...]` dan `[Revisi untuk ...]`.
- **Dependensi penting**:
  - `ToolStateIndicator`
  - `SearchStatusIndicator`
  - `SourcesIndicator`
  - `QuickActions`
  - `MarkdownRenderer`
  - parser util citations (`formatParagraphEndCitations`, `extractLegacySourcesFromText`)
- **Constraint/edge case**:
  - Tool errors low-signal (`unknown`, `undefined`, dll) disembunyikan jika konten assistant sudah renderable.
  - Tool state completed bisa dipertahankan sementara saat `persistProcessIndicators` untuk mencegah flicker.
  - Extract sumber bisa dari beberapa jalur: `data-cited-sources`, annotations, property sources, fallback legacy extractor.

### 3) Process Status + Reasoning Panels
- **File utama**:
  - `src/components/chat/ChatProcessStatusBar.tsx`
  - `src/components/chat/ReasoningActivityPanel.tsx`
  - `src/components/chat/ReasoningTracePanel.tsx`
- **Peran**: Menampilkan progress naratif proses AI dan detail langkah reasoning.
- **UI/component di dalam scope ini**:
  - `ChatProcessStatusBar`
    - Mode processing: headline + thinking dots + progress bar + persen.
    - Mode completed/error: label durasi proses + affordance "Lihat proses berpikir model" untuk membuka panel detail.
  - `ReasoningActivityPanel`
    - Sheet (desktop: right, mobile: bottom).
    - Container untuk timeline reasoning.
  - `ReasoningTracePanel`
    - Timeline step-by-step (dot + connector line).
    - Tone visual berdasarkan status step (`pending/running/done/skipped/error`).
    - Detail bawah label dari `thought` atau `meta` (sourceCount, toolName, stage, mode, note).
- **Dependensi penting**:
  - `Sheet` UI primitives
  - step type `ReasoningTraceStep`
  - util `cn`
- **Constraint/edge case**:
  - Panel only membuka kalau ada steps (`hasSteps`).
  - Ada mode “transparent” yang menyembunyikan template labels jika sudah ada thought non-template.

### 4) Composer: ChatInput + Upload + Context Tray + Stop
- **File utama**:
  - `src/components/chat/ChatInput.tsx`
  - `src/components/chat/FileUploadButton.tsx`
- **Peran**: Area input utama untuk mengirim prompt + mengelola context attachments.
- **UI/component di dalam scope ini**:
  - Desktop composer
    - Textarea auto-resize.
    - Send/Stop button area.
  - Mobile composer 3 state
    - Collapsed placeholder.
    - Expanded inline textarea.
    - Fullscreen overlay composer.
  - Context tray
    - Tombol `+ Konteks` (`FileUploadButton`).
    - Chips file context aktif.
    - Remove per-file.
    - Clear all context (`Trash`).
  - Send button states
    - State normal: tombol `Send`.
    - State generating: tombol `Pause` sebagai stop generating (`onStop`).
  - `FileUploadButton` behavior
    - Validasi tipe + ukuran file.
    - Upload ke Convex storage.
    - Spinner upload.
    - Image -> data URL callback untuk multimodal.
    - Dokumen non-image trigger `/api/extract-file` secara async.
- **Dependensi penting**:
  - `FileUploadButton` memakai mutation Convex (`generateUploadUrl`, `createFile`)
  - `Tooltip`
  - util attached file helpers
- **Constraint/edge case**:
  - `isGenerating` mengubah aksi primary button dari submit jadi stop.
  - Context tray tetap render pada mode desktop, mobile inline, dan mobile fullscreen.
  - Input kosong disable tombol send.

### 5) Paper Validation + Rewind Confirmation
- **File utama**:
  - `src/components/paper/PaperValidationPanel.tsx`
  - `src/components/paper/RewindConfirmationDialog.tsx`
- **Peran**: UI approval loop user untuk stage paper dan konfirmasi rewind.
- **UI/component di dalam scope ini**:
  - `PaperValidationPanel`
    - Header stage + deskripsi validasi.
    - Warning strip saat state `isDirty`.
    - Tombol aksi `Revisi` dan `Setujui`.
    - Form revisi (textarea + submit feedback) saat mode revisi aktif.
  - `RewindConfirmationDialog`
    - Dialog konfirmasi kembali ke stage sebelumnya.
    - Warning impact tentang invalidation artifact/stage progress.
    - Tombol `Batal` dan action confirm dengan loading state.
- **Dependensi penting**:
  - `Button`, `Textarea`
  - `AlertDialog`
  - constants stage label (`getStageLabel`)
  - `sonner` toast (dipicu dari parent flow)
- **Constraint/edge case**:
  - Panel validasi hanya muncul pada status stage `pending_validation`.
  - Rewind dialog hanya aktif jika `targetStage` tersedia.

## Event Stream Yang Menggerakkan UI Interaktif
- `data-search`
  - Sumber status pencarian (`searching`, `done`, `off`, `error`) yang dikonsumsi bubble.
- `data-cited-text`
  - Text final dengan inline citation formatting.
- `data-cited-sources`
  - Daftar sources terstruktur untuk panel sources.
- `data-reasoning-thought`
  - Delta pemikiran reasoning untuk headline/proses.
- Tool parts dari AI SDK (`tool-*`)
  - Dipakai untuk `ToolStateIndicator` dan artifact signal extraction (artifact signal tidak termasuk scope restyling ini).

## Mapping Nama Tool Yang Relevan Ke UI Indicator
- `google_search`
- `startPaperSession`
- `getCurrentPaperState`
- `updateStageData`
- `compileDaftarPustaka`
- `submitStageForValidation`
- `createArtifact`
- `updateArtifact`
- `renameConversationTitle`

## Out Of Scope (Tidak Di-Restyling Pada Dokumen Ini)
- Seluruh panel/flow artifact dan refrasa:
  - `ArtifactPanel`
  - `MobileArtifactViewer`
  - `MobileRefrasaViewer`
  - `MobilePaperSessionsSheet`
  - seluruh `src/components/refrasa/**`
- Catatan:
  - `ArtifactIndicator` bisa tetap muncul sebagai bagian bubble assistant, tapi keputusan visual restyling artifact card mengikuti area artifact (bukan fokus dokumen ini).

## Checklist Done Restyling (Interaksi Chat Area)
- [x] `PendingAssistantLaneIndicator`: orb diubah ke amber 600 + garis ekor diganti titik-titik animasi.
- [x] `SearchStatusIndicator`: tampilan disamakan dengan pola UI `ToolStateIndicator` untuk konteks pencarian.
- [x] Teks status pencarian diperbarui menjadi `Pencarian internet...` dan label `Pencarian web`.
- [x] Efek shimmer aktif untuk `Pencarian internet...` dan `Pencarian web` (highlight kontras slate 50).
- [x] `ToolStateIndicator` paper tools ditampilkan lengkap untuk alur:
  - `Memulai sesi paper`
  - `Mengambil status sesi paper`
  - `Menyimpan progres tahapan`
  - `Mengirim validasi tahapan`
  - `Mengomplisasi daftar pustaka`
- [x] Prefix kata `Memproses` dihapus dari copy indikator tool agar tidak repetitif.
- [x] Teks fallback `assistant_response` diubah menjadi `Respons agen`.
- [x] Efek shimmer aktif untuk seluruh teks indikator paper tools di atas + `Respons agen`.
- [x] `ChatProcessStatusBar` progress fill diberi efek shimmer dengan highlight teal 200 di bagian yang bergerak.
- [x] Kontras teks headline/progress pada status proses dinaikkan agar lebih terbaca.
- [x] Status `ready/completed` dicatat sebagai **tidak jadi di-restyling** (visual utama dipertahankan).
- [x] Trigger panel "proses berpikir model" saat proses selesai dipertahankan sebagai bagian flow interaksi.
- [x] Seluruh kode pemaksaan tampilan komponen interaksi sudah dicabut; visibility kembali ke state normal (hanya muncul saat interaksi relevan).
- [x] `RewindConfirmationDialog` desktop direstyling: copy baru, warning panel slate, tombol validasi konsisten, dan border panel disesuaikan.
- [x] `RewindConfirmationDialog` mobile direstyling: heading left+inline icon, body copy left-aligned, warning icon sejajar baris pertama, sizing tombol dioptimalkan untuk touch.
- [x] Mode preview khusus `RewindConfirmationDialog` sudah dicabut; dialog kembali hanya muncul saat ada interaksi rewind.
- [ ] `QuotaWarningBanner` sudah masuk scope interaksi chat, tetapi visualnya **belum** direstyling pada batch ini.

## Daftar File Terkait
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/ToolStateIndicator.tsx`
- `src/components/chat/SearchStatusIndicator.tsx`
- `src/components/chat/SourcesIndicator.tsx`
- `src/components/chat/QuickActions.tsx`
- `src/components/chat/ChatProcessStatusBar.tsx`
- `src/components/chat/ReasoningActivityPanel.tsx`
- `src/components/chat/ReasoningTracePanel.tsx`
- `src/components/chat/QuotaWarningBanner.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/FileUploadButton.tsx`
- `src/components/paper/PaperValidationPanel.tsx`
- `src/components/paper/RewindConfirmationDialog.tsx`
- `src/app/api/chat/route.ts`
