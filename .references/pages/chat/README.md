# Dokumentasi Halaman Chat

## Cakupan
- Gue fokus ke halaman chat di `src/app/chat` dan semua komponen UI yang dipakai langsung di halaman chat.
- Yang gue masukin: komponen di `src/components/chat`, komponen pendukung dari `src/components/paper`, `src/components/refrasa`, dan `src/components/ai-elements/inline-citation.tsx`, plus primitif UI dari `src/components/ui` yang kepake.

## Titik masuk halaman
- `src/app/chat/page.tsx` - `auth()` + redirect, render `ChatContainer` dengan `conversationId={null}`.
- `src/app/chat/[conversationId]/page.tsx` - `auth()` + redirect, ambil `conversationId` dari params, render `ChatContainer`.

## Struktur UI utama (alur render)
- `ChatContainer`
  - Sidebar desktop: `ChatSidebar`
  - Sidebar mobile: `Sheet` -> `ChatSidebar`
  - Area chat: `ChatWindow`
  - Panel artifact: `ArtifactPanel` -> `ArtifactViewer` + `ArtifactList`

## Detail area chat (`ChatWindow`)
- Header mobile (tombol menu).
- `PaperStageProgress` + `RewindConfirmationDialog`.
- Area pesan:
  - Kondisi kosong: teks "Mulai percakapan baru..." + tombol "Mulai Menulis Paper".
  - Daftar pesan: `Virtuoso` -> `MessageBubble`.
  - Bagian bawah daftar: `PaperValidationPanel`, `ThinkingIndicator`.
  - Lapisan error: teks "Gagal mengirim pesan." + tombol "Coba Lagi".
- Input bawah: `ChatInput` + `FileUploadButton`.

## Detail bubble pesan (`MessageBubble`)
- Label peran (`message.role`) + tombol edit (ikon pensil, title "Edit").
- Lampiran dengan label "Attachment".
- Indikator tool: `ToolStateIndicator`, `SearchStatusIndicator`.
- Render konten: `MarkdownRenderer` + `InlineCitationChip`.
- Indikator artifact: `ArtifactIndicator`.
- Daftar sumber: `SourcesIndicator`.
- Aksi cepat: `QuickActions` ("Copy", "Insert", "Save").

## Detail panel artifact (`ArtifactPanel`)
- Mode tertutup: tombol jumlah artifact di sisi kanan.
- Mode terbuka:
  - `ArtifactViewer` (aksi: "Edit", "Unduh", "Salin", "Refrasa", "Riwayat").
  - `ArtifactList` (filter: "Semua", "Code", "Outline", "Section", "Tabel", "Sitasi", "Formula").

## UI Refrasa (dipakai di ArtifactViewer)
- `RefrasaButton`, `RefrasaConfirmDialog`, `RefrasaIssueItem`, `RefrasaLoadingIndicator`.

## UI sitasi inline
- `InlineCitationChip` (tampilan desktop dengan hover card + tampilan mobile dengan sheet).
- `InlineCitation*` dari `src/components/ai-elements/inline-citation.tsx`.

## UI primitif yang kepake
`button`, `input`, `textarea`, `skeleton`, `badge`, `card`, `sheet`, `dialog`, `alert-dialog`, `alert`, `tooltip`, `context-menu`, `select`, `collapsible`, `hover-card`, `carousel`.

## File indeks
- Detail file per komponen ada di `./files-index.md`.
