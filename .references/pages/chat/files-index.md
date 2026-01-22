# Indeks File - Halaman Chat

## Halaman (rute)
- `src/app/chat/page.tsx` - `auth()` + redirect, render `ChatContainer` untuk halaman awal chat.
- `src/app/chat/[conversationId]/page.tsx` - `auth()` + redirect, render `ChatContainer` untuk chat spesifik.

## Komponen utama (src/components/chat)
- `src/components/chat/ChatContainer.tsx` - tata letak utama (sidebar, `ChatWindow`, `ArtifactPanel`).
- `src/components/chat/ChatSidebar.tsx` - daftar percakapan + tombol "New Chat" + aksi "Edit Judul"/"Hapus" + `PaperSessionBadge`.
- `src/components/chat/ChatWindow.tsx` - area pesan (Virtuoso + `MessageBubble`), `PaperStageProgress`, `PaperValidationPanel`, `ChatInput`.
- `src/components/chat/ChatInput.tsx` - input + tombol "Send message"/"Stop generating response" + `FileUploadButton`.
- `src/components/chat/FileUploadButton.tsx` - lampirkan file, unggah ke Convex, memicu ekstraksi teks.
- `src/components/chat/MessageBubble.tsx` - bubble pesan + tombol edit (title "Edit") + indikator tool/sumber/artifact.
- `src/components/chat/QuickActions.tsx` - aksi cepat: "Copy", "Insert", "Save".
- `src/components/chat/ToolStateIndicator.tsx` - status tool (termasuk `google_search`).
- `src/components/chat/SearchStatusIndicator.tsx` - status pencarian: "Mencari..." / "Pencarian gagal".
- `src/components/chat/SourcesIndicator.tsx` - daftar sumber (Collapsible).
- `src/components/chat/MarkdownRenderer.tsx` - parser markdown khusus + sitasi inline.
- `src/components/chat/InlineCitationChip.tsx` - chip sitasi inline (tampilan desktop dengan hover card + tampilan mobile dengan sheet).
- `src/components/chat/ArtifactPanel.tsx` - panel artifact (tertutup/terbuka).
- `src/components/chat/ArtifactViewer.tsx` - aksi "Edit", "Unduh", "Salin", "Refrasa", "Riwayat".
- `src/components/chat/ArtifactList.tsx` - daftar artifact + filter tipe.
- `src/components/chat/ArtifactEditor.tsx` - editor konten artifact.
- `src/components/chat/VersionHistoryDialog.tsx` - dialog riwayat versi artifact.
- `src/components/chat/ArtifactIndicator.tsx` - label "Artifact dibuat" + tombol "Lihat".
- `src/components/chat/ThinkingIndicator.tsx` - indikator “AI sedang berpikir”.

## Komponen pendukung - Paper (dipakai di chat)
- `src/components/paper/PaperStageProgress.tsx` - progress tahap + rewind.
- `src/components/paper/RewindConfirmationDialog.tsx` - dialog konfirmasi rewind.
- `src/components/paper/PaperValidationPanel.tsx` - aksi "Approve & Lanjut", "Revisi", "Kirim Feedback".
- `src/components/paper/PaperSessionBadge.tsx` - badge "{stageNumber}/{totalStages}".

## Komponen pendukung - Refrasa (dipakai di ArtifactViewer)
- `src/components/refrasa/RefrasaButton.tsx` - tombol Refrasa + tooltip.
- `src/components/refrasa/RefrasaConfirmDialog.tsx` - dialog perbandingan hasil.
- `src/components/refrasa/RefrasaIssueItem.tsx` - item isu (naturalness/style).
- `src/components/refrasa/RefrasaLoadingIndicator.tsx` - indikator loading Refrasa.

## Komponen pendukung - Sitasi inline
- `src/components/ai-elements/inline-citation.tsx` - komponen dasar sitasi inline (hover card + carousel).

## UI primitif (src/components/ui) yang kepake di chat
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/alert.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/context-menu.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/collapsible.tsx`
- `src/components/ui/hover-card.tsx`
- `src/components/ui/carousel.tsx`
