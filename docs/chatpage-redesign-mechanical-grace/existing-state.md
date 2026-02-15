# Chat Page Existing State - Baseline Aktual

Dokumen ini adalah baseline **kondisi kode saat ini** untuk redesign chat page, dengan fokus utama ke section/panel artifact dan area yang memengaruhi artifact flow.

## 1) Tujuan Dokumen
- Menyediakan peta file nyata (bukan asumsi).
- Menangkap kondisi styling saat ini dari kode di `main` lokal.
- Menentukan area prioritas redesign untuk artifact panel dan dependensinya.
- Menghapus konten lama yang tidak lagi relevan (claim branch lama, screenshot lama, scoring subjektif tanpa alat ukur).

## 2) Scope Audit yang Dipakai

### `src/app/chat/`
- `src/app/chat/layout.tsx`
- `src/app/chat/page.tsx`
- `src/app/chat/[conversationId]/page.tsx`

### `src/components/chat/`
- `src/components/chat/ArtifactEditor.tsx`
- `src/components/chat/ArtifactIndicator.tsx`
- `src/components/chat/ArtifactList.tsx`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/ChatContainer.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/ChatMiniFooter.tsx`
- `src/components/chat/ChatProcessStatusBar.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/FileUploadButton.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/InlineCitationChip.tsx`
- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/QuickActions.tsx`
- `src/components/chat/QuotaWarningBanner.tsx`
- `src/components/chat/SearchStatusIndicator.tsx`
- `src/components/chat/SourcesIndicator.tsx`
- `src/components/chat/ThinkingIndicator.tsx`
- `src/components/chat/ToolStateIndicator.tsx`
- `src/components/chat/VersionHistoryDialog.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/layout/PanelResizer.tsx`
- `src/components/chat/layout/useResizer.ts`
- `src/components/chat/messages/TemplateGrid.tsx`
- `src/components/chat/shell/ActivityBar.tsx`
- `src/components/chat/shell/NotificationDropdown.tsx`
- `src/components/chat/shell/TopBar.tsx`
- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/sidebar/SidebarProgress.tsx`

## 3) Peta Arsitektur Singkat (Current State)

### Entry route
- `/chat` dan `/chat/[conversationId]` masuk ke `ChatContainer`.
- `src/app/chat/layout.tsx` berfungsi sebagai wrapper visual route (`min-h-screen bg-background text-foreground`).

### Orkestrasi utama
- `ChatContainer` menggabungkan:
  - `ChatLayout` (shell + sidebar + panel grid)
  - `ChatWindow` (message flow)
  - `ArtifactPanel` (viewer panel kanan)
- State tab artifact dikelola oleh `useArtifactTabs`.
- Panel artifact dianggap “open” saat ada minimal 1 tab artifact aktif.

### Alur artifact end-to-end
1. AI mengeluarkan `tool-createArtifact` di `MessageBubble`.
2. `MessageBubble` render `ArtifactIndicator`.
3. Klik indicator memanggil `onArtifactSelect` -> membuka tab di `ChatContainer`.
4. `ArtifactPanel` menampilkan `ArtifactTabs` + `ArtifactToolbar` + `ArtifactViewer`.
5. `ArtifactViewer` menangani content, version switch, edit, refrasa, invalidation banner.
6. `FullsizeArtifactModal` memberi mode fullscreen/edit lanjutan.
7. `SidebarPaperSessions` juga bisa memilih artifact dan membuka panel kanan.

## 4) Baseline Styling Aktual (Fakta Kode)

### 4.1 Pola yang sudah baik
- Struktur panel artifact inti sudah modular:
  - `ArtifactPanel` (container)
  - `ArtifactTabs` (tab strip)
  - `ArtifactToolbar` (actions + metadata)
  - `ArtifactViewer` (content)
- Banyak penggunaan utility semantic (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`) terutama pada komponen artifact inti.
- Primitive UI konsisten di banyak bagian (Button/Badge/Tooltip/Dropdown/Sheet/Dialog).

### 4.2 Pola masalah yang masih dominan
- Hardcoded warna masih luas pada shell + sidebar + state indicators.
- Banyak pasangan `slate-*` + `dark:slate-*` manual, sehingga konsistensi theme bergantung patch per komponen.
- Beberapa komponen artifact-related masih pakai signal color hardcoded (`sky`, `emerald`, `amber`, `rose`) bukan token semantic konsisten lintas mode.
- Beberapa radius masih generic (`rounded-lg`, `rounded-md`, `rounded-sm`) pada area yang seharusnya bisa diseragamkan.

## 5) Fokus Prioritas: Artifact Panel dan Area Terkait

### 5.1 Tier 1 - Core artifact panel

### `src/components/chat/ArtifactPanel.tsx`
- Kondisi: struktur bersih, semantic surface `bg-card` + `border-border/50`, sudah layak jadi baseline.
- Catatan: bukan sumber utama inkonsistensi visual saat ini.

### `src/components/chat/ArtifactTabs.tsx`
- Kondisi: rapi dan relatif konsisten.
- Catatan minor: tetap perlu cek final alignment radius/border dengan standar page lain.

### `src/components/chat/ArtifactToolbar.tsx`
- Kondisi: sudah selaras dengan model dokumen editor:
  - metadata konteks dipisah dari action,
  - grouping aksi prioritas jelas,
  - mode responsif desktop/mobile konsisten.
- Aksi unduh sudah diseragamkan ke pola dropdown `Download` dengan pilihan ekstensi (`DOCX/PDF/TXT`).

### `src/components/chat/ArtifactViewer.tsx`
- Kondisi: mode baca/edit sudah terstruktur sebagai dua mode kerja yang jelas.
- Header viewer sudah memuat konteks versi/final/invalidation secara berlapis.
- Source area dan refrasa flow sudah konsisten dengan lifecycle artifact terbaru.
- Rendering ordered-list markdown sudah ditata ulang agar marker nomor dan isi list lurus vertikal, termasuk baris lanjutan dalam item yang sama.

### `src/components/chat/FullsizeArtifactModal.tsx`
- Kondisi: sudah berfungsi sebagai workspace artifact utama (bukan sekadar versi besar panel).
- Mode fullscreen sekarang benar-benar fit viewport (`100dvh` x full-width, tanpa border radius).
- Close safety untuk ESC/backdrop/close/minimize tetap guarded terhadap unsaved edit.
- Kontrol close header disederhanakan: tombol `X` redundant dihapus, menyisakan satu aksi `Tutup fullscreen`.
- Focus order/focus trap fullscreen sudah ditambahkan untuk operability keyboard.
- Area sumber di fullscreen menampilkan dropdown `Artifak lainnya` agar perpindahan antar artifak satu sesi lebih cepat.

### `src/components/chat/ArtifactEditor.tsx`
- Kondisi: status kerja (`dirty`, `saving`) dan hierarchy aksi `Batal/Simpan` sudah jelas.

### `src/components/chat/VersionHistoryDialog.tsx`
- Kondisi: sudah berbentuk timeline evolusi versi dengan state `Terbaru` dan `Dilihat`.
- Perilaku pilih versi konsisten dengan version selector di viewer (select + close dialog).

### `src/components/chat/ArtifactIndicator.tsx`
- Kondisi: sudah membedakan status lifecycle `Baru` vs `Revisi` dan menampilkan konteks versi.
- CTA keyboard/screen reader sudah eksplisit.

### 5.2 Tier 2 - Entry points yang memengaruhi artifact UX

### `src/components/chat/MessageBubble.tsx`
- Komponen ini adalah jalur tampilan `ArtifactIndicator` dan status tool/search.
- Sudah membaca dua jalur lifecycle artifact: `tool-createArtifact` dan `tool-updateArtifact`.
- Urutan blok assistant sudah dipertegas: artifact output -> sources -> quick actions.

### `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- Source pemilihan artifact dari sidebar.
- Isu “selected palsu” sudah ditutup via sinkronisasi `activeArtifactId`.
- Item list sekarang lebih cepat discan (title/type/version/final|revisi + status panel artifact).

### `src/components/chat/sidebar/SidebarProgress.tsx`
- Rewind UX penting untuk invalidation artifact.
- Progress bar + milestone states masih heavily hardcoded (`emerald`, `amber`, `slate`).

### `src/components/chat/shell/TopBar.tsx`
- Tombol panel artifact ada di sini.
- Toggle panel artifact sekarang icon-only (tanpa label teks), dengan 3 state visual:
  - tertutup (`slate-200`),
  - terbuka (`slate-50`),
  - off/tanpa artifak (`slate-400`).
- Badge jumlah artifak diposisikan di pojok kanan-bawah icon toggle.
- Badge status teks terpisah (`PANEL TERBUKA/TERTUTUP`) sudah dihapus untuk menghindari redundansi.

### 5.3 Tier 3 - Komponen chat lain yang ikut memengaruhi persepsi visual
- `ChatLayout`, `ChatSidebar`, `ActivityBar`, `PanelResizer`, `ChatInput`, `TemplateGrid`, `QuotaWarningBanner`, `SearchStatusIndicator`, `ToolStateIndicator`, `SourcesIndicator`, `NotificationDropdown`, `ChatProcessStatusBar`.
- Pola umum: style sudah rapi secara struktur, tapi color token belum konsisten karena masih bercampur semantic + hardcoded palette.
- `InlineCitationChip`/preview sitasi sekarang memakai positioning yang mencegah popup kepotong viewport bawah (auto-flip, clamp kiri-kanan, dan scroll internal).

## 6) File yang Sifatnya Non-UI/Wrapper (Bukan Target Styling Langsung)
- `src/app/chat/page.tsx`
- `src/app/chat/[conversationId]/page.tsx`
- `src/app/chat/layout.tsx` (wrapper visual route)
- `src/components/chat/ChatContainer.tsx` (orchestrator state)
- `src/components/chat/layout/useResizer.ts`

## 7) Ringkasan Realitas Saat Ini
- Artifact system sudah matang di sisi struktur komponen dan flow interaksi.
- Batch redesign artifact A-F sudah menutup area utama lifecycle artifact end-to-end.
- Remaining hotspot visual lintas chat page saat ini lebih banyak di komponen non-core artifact (contoh: `SidebarProgress` dan sebagian shell global yang masih campuran semantic/hardcoded).

## 8) Catatan Cleanup Dokumen Lama
Dokumen versi ini sengaja menghapus:
- claim branch lama/deprecated context yang tidak lagi jadi sumber kebenaran,
- daftar screenshot historis,
- compliance score numerik subjektif tanpa tooling/objective rubric,
- klaim “fully compliant” yang tidak konsisten dengan kode aktual.
