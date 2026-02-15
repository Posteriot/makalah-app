# Chat Area UI Components Inventory

> Inventaris seluruh komponen UI di area chat untuk branch `feat/chatpage-redesign-mechanical-grace`.
> Scope dokumen ini fokus ke area **prompt user + respons agent + UI tools + state proses AI**.

## Scope

Dokumen ini mencakup:
- Komponen yang selalu tampil di chat area
- Komponen yang tampil kondisional berdasarkan state (loading, error, paper mode, tool calling, search, citations)
- Komponen input (textarea, attach, send, file chips)

Dokumen ini tidak membahas detail sidebar/activity bar/artifact panel kecuali bagian yang terhubung langsung ke output chat.

## Struktur Utama Chat Area

1. `ChatWindow` sebagai orkestrator utama area chat
Path: `src/components/chat/ChatWindow.tsx`

2. `MessageBubble` sebagai renderer per pesan (user/assistant)
Path: `src/components/chat/MessageBubble.tsx`

3. `ChatInput` sebagai area input prompt
Path: `src/components/chat/ChatInput.tsx`

## Komponen Inti (Selalu Ada di Alur Chat)

1. `ChatWindow`
Fungsi:
- Menentukan state tampilan: landing, active conversation, not found
- Mengelola list pesan via `Virtuoso`
- Menyisipkan area proses AI, error overlay, dan input

2. `MessageBubble`
Fungsi:
- Render pesan user dan assistant
- Render markdown, indikator tools, sources, artifact output, quick actions
- Mendukung edit pesan user dengan permission check

3. `ChatInput`
Fungsi:
- Textarea prompt
- Tombol attach file
- Tombol send
- Menampilkan chip `File attached` untuk file yang sudah diupload

## Komponen Kondisional di Chat Area

1. `QuotaWarningBanner`
Path: `src/components/chat/QuotaWarningBanner.tsx`
Muncul saat kuota/kredit mendekati habis atau habis.

2. `TemplateGrid`
Path: `src/components/chat/messages/TemplateGrid.tsx`
Muncul saat conversation aktif tapi belum ada pesan.

3. `Skeleton` (UI loading)
Path penggunaan: `src/components/chat/ChatWindow.tsx`
Muncul saat history/loading conversation.

4. `ThinkingIndicator`
Path: `src/components/chat/ThinkingIndicator.tsx`
Muncul saat status AI `submitted`.

5. `PaperValidationPanel`
Path: `src/components/paper/PaperValidationPanel.tsx`
Muncul saat paper mode dan stage `pending_validation`.

6. Error overlay (Warning + Retry)
Path penggunaan: `src/components/chat/ChatWindow.tsx`
Muncul saat pengiriman pesan gagal.

## Komponen Di Dalam Message Bubble (Assistant/User)

1. `MarkdownRenderer`
Path: `src/components/chat/MarkdownRenderer.tsx`
Render markdown response assistant (heading, list, code, link, blockquote, dll).
Catatan aktual:
- Ordered list ditata dengan grid marker+konten agar nomor dan isi lurus vertikal.
- Baris lanjutan pada numbering diparse sebagai kelanjutan item yang sama (bukan item baru terpisah).

2. Inline sitasi melalui `InlineCitationChip`
Path: `src/components/chat/InlineCitationChip.tsx`
Muncul saat teks markdown berisi citation marker yang valid.
Preview sitasi sekarang memakai positioning adaptif supaya tidak kepotong viewport bawah dan tetap bisa diklik.

3. `ToolStateIndicator`
Path: `src/components/chat/ToolStateIndicator.tsx`
Muncul saat tool call masih proses atau error (selain output sukses).

4. `SearchStatusIndicator`
Path: `src/components/chat/SearchStatusIndicator.tsx`
Muncul saat data status search tersedia (`searching`, `done`, `error`).

5. `SourcesIndicator`
Path: `src/components/chat/SourcesIndicator.tsx`
Muncul saat response assistant punya daftar sumber/citation sources.

6. `ArtifactIndicator`
Path: `src/components/chat/ArtifactIndicator.tsx`
Muncul saat tool `createArtifact` atau `updateArtifact` sukses, lalu bisa di-click untuk buka artifact terbaru.

7. `QuickActions`
Path: `src/components/chat/QuickActions.tsx`
Saat ini berisi action copy response.

8. Edit UI untuk pesan user
Path penggunaan: `src/components/chat/MessageBubble.tsx`
Termasuk:
- tombol edit + tooltip
- textarea edit
- tombol `Batal` dan `Kirim`

9. File attachment badge pada bubble
Path penggunaan: `src/components/chat/MessageBubble.tsx`
Muncul saat message punya `fileIds` annotation.

## Komponen Input Prompt User

1. `ChatInput` container
Path: `src/components/chat/ChatInput.tsx`
Termasuk layout textarea + attach + send dalam satu ruang input.

2. `FileUploadButton`
Path: `src/components/chat/FileUploadButton.tsx`
Fungsi:
- Trigger file picker
- Upload ke Convex storage
- Trigger background extract text (`/api/extract-file`)

3. `textarea` prompt
Path penggunaan: `src/components/chat/ChatInput.tsx`
Placeholder saat ini: `Kirim percakapan...`.

4. Send button (`Send` icon)
Path penggunaan: `src/components/chat/ChatInput.tsx`
Disabled saat input kosong atau loading.

5. Uploaded file chips (`File attached`)
Path penggunaan: `src/components/chat/ChatInput.tsx`
Muncul bila ada `uploadedFileIds` sebelum submit.

## State-driven Visibility Ringkas

1. Landing (`conversationId === null`)
- Empty state welcome card
- Template cards ringan
- ChatInput tetap tampil

2. Conversation aktif (`conversationId !== null`)
- Message list (`Virtuoso`) + bubble per message
- Footer area untuk `ThinkingIndicator` dan `PaperValidationPanel` (kondisional)
- ChatInput tetap tampil

3. Not found conversation
- UI error state `Percakapan tidak ditemukan`

4. Tool/Search/Citation state
- `ToolStateIndicator`, `SearchStatusIndicator`, `SourcesIndicator`, `InlineCitationChip`
Muncul sesuai part/annotation message stream AI.

## Daftar File Terkait

- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/FileUploadButton.tsx`
- `src/components/chat/ToolStateIndicator.tsx`
- `src/components/chat/SearchStatusIndicator.tsx`
- `src/components/chat/SourcesIndicator.tsx`
- `src/components/chat/ArtifactIndicator.tsx`
- `src/components/chat/ThinkingIndicator.tsx`
- `src/components/chat/QuickActions.tsx`
- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/InlineCitationChip.tsx`
- `src/components/chat/messages/TemplateGrid.tsx`
- `src/components/chat/QuotaWarningBanner.tsx`
- `src/components/paper/PaperValidationPanel.tsx`
