# Chat Feature Spec: Message Lifecycle

Dokumen ini mendefinisikan lifecycle fitur pesan di halaman chat sebagai acuan utama untuk maintenance, optimasi, dan validasi perubahan behavior.

## 1. Scope

- Route: `/chat` dan `/chat/[conversationId]`.
- Lifecycle utama:
- create/new chat
- starter prompt handoff
- kirim pesan
- streaming + status proses
- stop generate
- regenerate
- edit + truncate + resend
- upload file + extraction trigger
- render citation + source indicator

## 2. Komponen Runtime yang Terlibat

- UI Orchestrator:
- `src/components/chat/ChatWindow.tsx`
- Input + upload:
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/FileUploadButton.tsx`
- Message render:
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/InlineCitationChip.tsx`
- Status bar:
- `src/components/chat/ChatProcessStatusBar.tsx`
- Data hooks:
- `src/lib/hooks/useMessages.ts`
- `src/lib/hooks/usePaperSession.ts`
- API:
- `src/app/api/chat/route.ts`
- `src/app/api/extract-file/route.ts`
- Convex persistence:
- `convex/messages.ts`

## 3. State Ownership dan State Machine

## 3.1 Owner State di `ChatWindow`

- Input state: `input`.
- Attachment state: `uploadedFileIds`.
- Create-chat state: `isCreatingChat`.
- Process visual state: `processUi = { visible, status, progress, message }`.
- Scroll state: `isAtBottom`, `pendingScrollToBottomRef`, `wasGeneratingRef`.
- Guard state:
- `starterPromptAttemptedForConversationRef` untuk mencegah auto-send starter prompt ganda.
- `syncedConversationRef` untuk mencegah sync history berulang.

## 3.2 Status Runtime Pesan

- Status dari `useChat`: `ready | submitted | streaming | error`.
- Visual status tambahan (`processUi.status`):
- `submitted`
- `streaming`
- `ready`
- `error`
- `stopped` (khusus saat user menekan stop).

## 4. Lifecycle Entry dan Inisialisasi

## 4.1 Landing `/chat`

- `conversationId === null`:
- menampilkan `TemplateGrid`.
- `ChatInput` tetap visible di bawah.
- submit input atau klik template akan create conversation dulu, lalu redirect ke `/chat/{newId}`.

## 4.2 Conversation `/chat/[conversationId]`

- `ChatWindow` validasi format ID Convex (`^[a-z0-9]{32}$`).
- Query conversation hanya dijalankan jika auth settle.
- Guard anti false-negative:
- not found baru ditampilkan jika auth sudah settle dan query conversation hasilnya `null`.
- History load:
- `useMessages(conversationId)` mengambil pesan dari Convex.
- History disinkronkan ke `useChat` lewat `setMessages`.

## 4.3 Starter Prompt Handoff (Session Storage)

- Saat create chat dari landing dengan prompt awal:
- payload disimpan ke `sessionStorage` key `chat:pending-starter-prompt`.
- setelah redirect ke conversation baru:
- `consumePendingStarterPrompt` membaca payload jika `conversationId` cocok.
- prompt di-auto-send sekali (guard by `starterPromptAttemptedForConversationRef`).

## 5. Lifecycle New Chat

## 5.1 Dari Landing (`ChatWindow`)

1. User submit input/template saat `conversationId === null`.
2. `createConversation` mutation dipanggil.
3. Jika ada starter prompt, simpan ke session storage.
4. Redirect `router.push(/chat/{newId})`.
5. Conversation baru auto-send starter prompt setelah history siap (lihat 4.3).

## 5.2 Dari Sidebar (`ChatLayout`)

1. Tombol `Percakapan Baru` memanggil `createNewConversation`.
2. State `isCreating` mencegah double-create.
3. Setelah ID baru didapat, redirect ke `/chat/{newId}`.

## 6. Lifecycle Send Message (`UI -> API -> Convex -> UI`)

1. User submit `ChatInput`.
2. Guard submit:
- harus `input.trim()` tidak kosong.
- tidak dalam state loading/generating.
3. `sendMessage({ text: input })` dipanggil dari `useChat`.
4. `DefaultChatTransport` kirim body:
- `messages`
- `conversationId`
- `fileIds` (dari `uploadedFileIds`)
5. UI reset state lokal:
- `input = ""`
- `uploadedFileIds = []`

Server-side `POST /api/chat`:

1. Validasi auth + token Convex.
2. Resolve app `userId`.
3. Quota pre-flight check.
4. Create conversation jika `conversationId` kosong.
5. Simpan user message ke `messages`.
6. Build context:
- system prompt
- paper prompt (jika ada)
- file context (dari extraction result)
- sources context (recent sources)
7. Pilih mode tools:
- websearch mode (`google_search` only), atau
- function tools mode.
8. Stream respons ke client.
9. Saat finish:
- simpan assistant message
- simpan sources (jika ada)
- record usage billing
- optional update judul conversation.

## 7. Lifecycle Streaming dan Process Feedback

## 7.1 Visual Status Bar

- `submitted`:
- tampil `Menyiapkan respons...`, progress awal 8%.
- `streaming`:
- tampil `Agen menyusun jawaban...`, progress naik bertahap sampai 92%.
- `ready`:
- progress 100%, pesan `Respons selesai`, auto-hide 900ms.
- `stopped`:
- progress 100%, pesan `Proses dihentikan`, auto-hide 900ms.
- `error`:
- progress 100%, pesan error, auto-hide 1500ms.

## 7.2 Scroll Behavior

- Saat generate + user di bawah (`isAtBottom`), auto-scroll ke message terbaru.
- Saat transisi generating -> ready, auto-scroll hanya jika user masih di bawah.
- `pendingScrollToBottomRef` dipakai untuk aksi yang wajib scroll ke bawah (send/edit/starter prompt).

## 7.3 Message-level Process Indicator

- `MessageBubble` membaca tool parts dan data parts dari `message.parts`:
- `tool-*` untuk indikator tool progress/error.
- `data-search` untuk status pencarian.
- `data-cited-text` dan `data-cited-sources` untuk hasil sitasi inline.

## 8. Lifecycle Stop dan Regenerate

## 8.1 Stop

1. User klik tombol stop di `ChatInput` saat generating.
2. `stop()` dipanggil.
3. Flag `stoppedManuallyRef = true`.
4. Saat status kembali `ready`, process bar ditampilkan sebagai `stopped`.

## 8.2 Regenerate

1. Trigger `regenerate()` dari `useChat`.
2. Jika paper mode aktif, default behavior memanggil `markStageAsDirty()` sebelum regenerate.
3. Generate ulang respons untuk context pesan terakhir yang ada.

## 9. Lifecycle Edit + Truncate + Resend

1. User klik edit pada `MessageBubble` (hanya user message, dan lolos rule paper permission).
2. Saat save:
- `ChatWindow.handleEdit(messageId, newContent)` dipanggil.
3. Resolusi ID:
- jika ID sudah format Convex (`32-char`), pakai langsung.
- jika client-generated ID, dipetakan ke history message index yang sesuai.
4. Mutation `api.messages.editAndTruncateConversation`:
- hapus message yang diedit
- hapus semua message setelahnya.
5. Jika paper mode, stage ditandai dirty.
6. Local state dipotong sampai sebelum message yang diedit.
7. Konten edit dikirim ulang sebagai user message baru (`sendMessage`) untuk generate lanjutan.

Catatan kontrak penting:

- mutation truncate sengaja tidak patch message lama; message baru dibuat ulang oleh alur send biasa.

## 10. Lifecycle Upload File dan Context Injection

## 10.1 Upload di Client

1. User pilih file dari `FileUploadButton`.
2. Validasi:
- MIME type dalam allowlist.
- ukuran maksimal 10MB.
3. Ambil upload URL dari Convex (`files.generateUploadUrl`).
4. Upload blob ke storage URL.
5. Buat record file (`files.createFile`).
6. Trigger background extraction via `POST /api/extract-file` (fire-and-forget).
7. `onFileUploaded(fileId)` menambah `uploadedFileIds` di `ChatWindow`.

## 10.2 Extraction di Server (`/api/extract-file`)

1. Validasi auth + file ownership.
2. Ambil blob file dari Convex storage URL.
3. Route extractor berdasarkan MIME:
- TXT / PDF / DOCX / XLSX / Image OCR.
4. Update status extraction:
- sukses -> `extractionStatus = "success"` + `extractedText`
- gagal -> `extractionStatus = "failed"` + `extractionError`.

## 10.3 Pengaruh ke Chat Request

- `fileIds` terkirim di body `/api/chat`.
- API chat fetch file records dan menyuntikkan `File Context` ke system messages.
- Jika extraction masih pending/gagal, context memuat status tersebut sebagai fallback informasi.

## 11. Lifecycle Citation Render

## 11.1 Sumber Data Citation

- Primary websearch mode (Gateway):
- stream mengirim `data-search`, `data-cited-text`, `data-cited-sources`.
- Fallback websearch mode (OpenRouter `:online`):
- stream tetap mengirim `data-search`, `data-cited-text`, `data-cited-sources` dari normalization layer.

## 11.2 Resolusi Source di UI

- Prioritas source di `MessageBubble`:
1. `data-cited-sources`
2. annotation `sources`
3. properti `message.sources`

## 11.3 Render Inline Citation

- `MarkdownRenderer` parse marker `[1]`, `[2]`, `[1,2]`.
- Marker dipetakan ke index `sources` dan dirender sebagai `InlineCitationChip`.
- Jika message punya sources tapi tidak ada marker, fallback chip sumber tetap ditambahkan di block terakhir.
- Mode mobile:
- `InlineCitationChip` tampil sebagai bottom `Sheet`.
- Mode desktop:
- `InlineCitationCard` + carousel source.

## 12. Integrasi Lifecycle Paper Mode (Yang Mempengaruhi Pesan)

- `approveStage`:
- mutation jalan dulu, lalu auto-send user message sintetis: `[Approved: ...]`.
- `requestRevision`:
- mutation jalan dulu, lalu auto-send user message sintetis: `[Revisi untuk ...]`.
- Efek:
- AI tetap punya konteks eksplisit terhadap aksi approve/revisi user.
- `markStageAsDirty` dipanggil di flow regenerate/edit agar state stage konsisten.

## 13. Error Path dan Fallback

- Invalid conversation:
- UI tampilkan state `Percakapan tidak ditemukan` setelah auth settle.
- Stream error:
- `useChat.error` memunculkan error overlay + tombol `Coba Lagi` (regenerate).
- Gateway failure:
- backend fallback ke OpenRouter.
- jika websearch fallback aktif, pakai model `:online`.
- jika `:online` gagal, degrade ke fallback non-search.
- Abort stream:
- primary path mencoba menyimpan partial assistant text untuk cegah kehilangan data.

## 14. Invariant yang Harus Dijaga

- Body transport chat harus kompatibel:
- `messages`, `conversationId`, `fileIds`.
- Edit message tetap lewat satu jalur resmi:
- `editAndTruncateConversation` + resend.
- Websearch mode tetap tidak boleh campur function tools dalam request yang sama.
- `starterPrompt` hanya boleh terkonsumsi sekali per conversation ID.
- Source-citation mapping harus stabil:
- urutan sources menentukan indeks `[n]` yang dirender UI.

## 15. Known Constraints Saat Ini

- `ChatInput` textarea saat ini tidak benar-benar disabled ketika loading karena prop `disabled={isLoading && false}`.
- Indikator upload masih berbasis `alert()` untuk feedback sukses/gagal (belum terintegrasi toast standar).
- Pemetaan client-generated message ID ke Convex ID pada edit masih bergantung pada index + role matching.

## 16. File Referensi

- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/FileUploadButton.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/InlineCitationChip.tsx`
- `src/components/chat/ChatProcessStatusBar.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/lib/hooks/useMessages.ts`
- `src/lib/hooks/usePaperSession.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/extract-file/route.ts`
- `convex/messages.ts`
