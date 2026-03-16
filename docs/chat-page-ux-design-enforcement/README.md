# Chat Page UX Design Enforcement

Dokumen ini adalah handoff utama untuk branch `chat-page-ux-design-enforcement`.

README ini sudah diselaraskan dengan implementasi aktual branch ini. Arah lama yang berbasis `workspace panel` kanan untuk `Kelola Percakapan` dan `Sesi Paper` sudah dibatalkan. Arsitektur yang berlaku sekarang adalah sidebar tree terintegrasi.

## Ringkasan Branch

- Branch aktif: `chat-page-ux-design-enforcement`
- Worktree aktif: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement`
- Fokus branch: penegakan UI/UX halaman chat dengan pusat perubahan pada activity bar, sidebar, riwayat percakapan, top bar, viewer artifact/refrasa, sources sheet, dan alur data pendukungnya
- Hasil utama branch ini:
  - activity bar chat disederhanakan
  - sidebar `Riwayat` diubah menjadi tree ala explorer
  - sesi paper aktif tidak lagi hidup sebagai sidebar/panel terpisah
  - panel kanan dikembalikan hanya untuk viewer `artifact` dan `refrasa`
  - `Linimasa Progres` tetap dipertahankan sebagai panel terpisah
  - mode kelola percakapan dipindah ke dalam sidebar `Riwayat`
  - sources/rujukan diubah dari inline dropdown menjadi right sheet dengan enriched cards
  - data loading, cleanup cascade, dan kontrol akses Convex ikut diperkuat

## Status Merge Final

- Implementasi utama branch ini sudah masuk ke `main` lewat PR `#109`
- Merge commit final: `ac07b39439290e0a31e4114842c982d22f149e08`
- Remote branch `chat-page-ux-design-enforcement` dan `origin/main` sudah disinkronkan ke commit yang sama
- README ini dipertahankan sebagai catatan handoff final setelah sinkronisasi branch selesai

## Keputusan Arsitektur yang Sudah Dikunci

### 1. Workspace panel percakapan dan sesi paper dibatalkan

Panel kanan tidak lagi dipakai untuk:

- `Kelola Percakapan`
- `Sesi Paper Lainnya`

Panel kanan sekarang hanya dipakai untuk:

- viewer `artifact`
- viewer `refrasa`

Implikasinya:

- navigasi workspace utama ada di sidebar kiri
- panel kanan kembali menjadi viewer konten, bukan manager
- docs lama `workspace-panel/*` sudah dihapus dari branch ini

### 2. Sidebar `Riwayat Percakapan` menjadi workspace tree utama

Model relasi UI yang dipakai sekarang:

- `Riwayat Percakapan` = root workspace
- child langsung di bawah percakapan = latest file `artifact` dan `refrasa`
- tidak ada node tengah `Sesi Paper`
- `Linimasa Progres` tetap hidup sendiri di activity bar/sidebar panel terpisah

Aturan tree:

- percakapan aktif yang punya child dapat auto-expand
- collapse manual harus dihormati saat pindah panel atau refresh
- child file hanya menampilkan latest version
- child file bisa dibuka langsung ke viewer artifact/refrasa di panel kanan

### 3. Delete berakar ke conversation

Semantics yang berlaku sekarang:

- delete satu, many, atau all tetap berarti delete berbasis conversation
- ketika conversation dihapus, subtree paper terkait ikut terhapus:
  - `paperSession`
  - `artifact`
  - `refrasa`
  - attachment/file records terkait
- cleanup empty conversation juga sudah memakai cascade yang sama

### 4. Riwayat memakai pagination `20 + autoload`

Aturan loading yang aktif:

- render awal: 20 percakapan
- berikutnya: autoload per 20 saat scroll
- pagination sudah berbasis cursor Convex, bukan slice client semu
- sidebar tree hanya mengambil data paper untuk conversation IDs yang sedang tampil

### 5. Top bar artifact bukan toggle lagi

Area artifact di top bar tidak lagi berfungsi sebagai expand/collapse toggle.

Sekarang dia adalah indikator pasif:

- icon file
- count file
- state kosong redup
- state terisi aktif

### 6. Mode kelola percakapan dipadatkan

Mode kelola di `Riwayat` sekarang:

- dipicu dari icon `Settings` (h-5 w-5) di header `Riwayat`
- saat aktif, icon header berubah dari `Settings` menjadi `Xmark` (close)
- header Riwayat di-render dari `SidebarChatHistory` untuk kedua mode (manage dan non-manage), bukan dari `ChatSidebar` — ini menjamin posisi vertikal "Riwayat" stabil saat toggle mode
- badge di header menunjukkan konteks berbeda per mode:
  - non-manage: jumlah pagination (contoh: `14` atau `14 dari 20`)
  - manage: jumlah terseleksi dari total (contoh: `3 dari 14`)
- toolbar select-all compact:
  - checkbox select-all (struktur identik dengan item: `-mt-[1px] h-[1.12rem] w-[1.12rem]`)
  - icon `hapus` (h-[1.12rem] w-[1.12rem], icon h-3.5)
  - angka jumlah terseleksi dihapus dari action bar (redundan dengan badge header)

Semantics checkbox utama:

- checkbox utama = semua percakapan user
- bukan hanya semua item yang sedang tampil

### 7. Layout spacing manage mode

Spacing vertikal di manage mode diatur supaya semua gap antar section sama:

- button "Percakapan Baru" wrapper: `px-3 pb-3 pt-3`
- manage container: `px-3 pt-3 md:pt-0 flex flex-col` dengan `border-b`
- Riwayat row: `pb-3` (gap ke select-all row)
- select-all row: `pb-3` (gap ke border)
- item percakapan: `py-3` (gap dari border ke konten)
- semua icon button di manage header: `h-5 w-5` (20px) supaya tidak inflate row height
- select-all row menggunakan `items-start` dan struktur kolom identik dengan item percakapan untuk alignment checkbox vertikal

## Status Implementasi Saat Ini

### Sudah Selesai

#### A. Activity bar dan shell chat

Sudah aktif:

- activity bar chat fokus ke `Riwayat Percakapan` dan `Linimasa Progres`
- tab/sidebar `Sesi Paper` sudah dihapus
- panel kanan hanya memuat artifact/refrasa viewer
- layout shell chat sudah bersih dari mode panel kanan lama

#### B. Sidebar `Riwayat Percakapan`

Sudah aktif:

- tree ala explorer
- parent percakapan dengan pembeda visual:
  - punya file = folder solid
  - tanpa file = folder outline
- child latest files flat di bawah percakapan
- connector tree dan connector tone sudah dipoles
- state expand aktif persisten lintas refresh/remount
- mode kelola compact dengan checkbox utama + delete tunggal
- exact total count saat manage mode aktif
- header Riwayat di-render dari `SidebarChatHistory` untuk kedua mode — posisi stabil saat toggle
- badge header menunjukkan selection count di manage mode (`3 dari 14`)
- angka redundan di action bar dihapus
- spacing vertikal manage mode disamakan (pb-3/py-3)
- button wrapper px-3 sejajar dengan header
- select-all row struktur identik item row untuk alignment checkbox

#### C. Sesi paper dan file paper

Sudah aktif:

- child `artifact` dan `refrasa` hidup di bawah percakapan
- sesi paper tidak lagi menjadi subsystem sidebar/panel yang terpisah
- active conversation menjadi pusat konteks paper

#### D. Linimasa progres

Sudah aktif:

- tetap menjadi panel activity bar terpisah
- tidak digabung ke tree workspace
- tipografi dan hierarchy visualnya sudah dipoles

#### E. Top bar

Sudah aktif:

- indikator file pasif menggantikan toggle artifact lama
- state icon/count sudah disesuaikan untuk light/dark mode

#### F. Artifact / refrasa viewer

Sudah aktif:

- panel kanan hanya untuk viewer
- orphan artifact tetap bisa dibuka
- deep-link artifact dibersihkan
- state tab artifact dirapikan
- kontrol akses artifact diperketat ke auth user yang benar

#### H. Table rendering di chat bubble

Sudah aktif:

- font standardization: Geist Sans untuk semua konten tabel (headers + cells), Geist Mono hanya untuk URL/link
- vertical dividers antar kolom (header dan body)
- rounded corners via `overflow-hidden` wrapper
- per-table copy toolbar: icon + "Text" (tab-separated plain text) dan icon + "Markdown" (raw markdown table)
- `stripInlineMarkdown()` utility untuk strip formatting sebelum copy plain text
- responsive card fallback: tabel 4+ kolom otomatis switch ke card layout di container < 480px (via `ResizeObserver`)
- URL truncation di cell tabel: `max-width: 200px`, ellipsis, hover untuk expand
- card layout: kolom pertama jadi judul card, sisanya jadi key-value pairs dengan vertical divider

Komponen internal baru di `MarkdownRenderer.tsx`:

- `ChatTable` — wrapper dengan ResizeObserver, toggle antara table dan card mode
- `ChatTableCards` — card layout untuk tiap row saat narrow
- `TableCopyToolbar` — toolbar copy di bawah tabel

File terkait:

- `src/components/chat/MarkdownRenderer.tsx`
- `src/components/chat/MarkdownRenderer.table.test.tsx` (25 tests)
- `src/app/globals-new.css` (URL truncation CSS)

Design doc: `docs/superpowers/specs/2026-03-15-table-rendering-improvement-design.md`

#### J. Sources right sheet (rujukan sebagai sidebar)

Sudah aktif:

- sources/rujukan di chat message tidak lagi tampil sebagai inline collapsible dropdown
- klik "MENEMUKAN X RUJUKAN" sekarang membuka right sheet (desktop) atau bottom sheet (mobile)
- sheet menampilkan enriched source cards: favicon, clean domain name, judul bold clickable, tanggal publikasi (jika ada)
- header sheet: "Rujukan" + "X sumber ditemukan"
- mutual exclusive dengan Proses (reasoning) sheet — buka satu otomatis tutup yang lain
- `SourcesIndicator` tetap dual-mode: sheet mode di `MessageBubble`, inline collapsible di `ArtifactViewer`/`FullsizeArtifactModal`
- chevron responsif di trigger button: right chevron (desktop, sheet dari kanan), down chevron (mobile, sheet dari bawah)
- `ChatProcessStatusBar` sekarang mendukung controlled mode (`isPanelOpen`/`onPanelOpenChange`) untuk koordinasi mutual exclusive
- state `activeSheet` di-lift ke `ChatWindow` sebagai single source of truth

Komponen baru:

- `src/components/chat/SourcesPanel.tsx` — sheet component mirroring `ReasoningActivityPanel` pattern

File yang dimodifikasi:

- `src/components/chat/SourcesIndicator.tsx` — dual-mode (sheet button atau inline collapsible)
- `src/components/chat/MessageBubble.tsx` — threading `onOpenSources` callback
- `src/components/chat/ChatWindow.tsx` — `activeSheet` state, render `SourcesPanel`, wire mutual exclusivity
- `src/components/chat/ChatProcessStatusBar.tsx` — externalized panel open state

Design doc: `docs/plans/2026-03-16-sources-right-sheet-design.md`
Implementation plan: `docs/plans/2026-03-16-sources-right-sheet-implementation.md`

#### G. Data flow, cleanup, dan security

Sudah aktif:

- pagination conversation berbasis cursor
- sidebar tree scoped fetch untuk conversation yang tampil
- cleanup conversation cascade termasuk blob storage file
- hardening access control artifact
- dead query dan dead surface manager lama sudah dihapus

#### I. Composer mobile dan header sidebar mobile

Sudah aktif:

- composer mobile chat tidak lagi memakai mode inline context button yang berubah-ubah
- composer mobile sekarang selalu memakai layout dua baris stabil seperti desktop:
  - tray konteks di baris atas
  - separator
  - area input + aksi kirim/fullscreen di baris bawah
- textarea mobile tetap satu instance saat isi bertambah ke multiline
- safe-area bawah untuk composer mobile sudah diatur eksplisit
- densitas vertikal composer mobile sudah dirapatkan supaya tidak terasa terlalu tinggi saat keyboard terbuka
- fullscreen composer mobile punya safe-area top/bottom sendiri karena hidup sebagai overlay `fixed`
- header sidebar mobile sudah memakai slot kiri dan kanan simetris, sehingga tabs `Riwayat | Linimasa` benar-benar center secara optik terhadap header penuh

### Sudah Dihapus dari Branch Ini

- route / halaman penuh workspace manager lama
- panel kanan `conversation-manager`
- panel kanan `paper-sessions-manager`
- activity bar/sidebar `Sesi Paper`
- docs lama `workspace-panel/*`
- file dan test mati dari arsitektur panel kanan lama

## File Kode Utama yang Perlu Dipahami

### Shell dan navigasi chat

- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/shell/ActivityBar.tsx`
- `src/components/chat/shell/TopBar.tsx`

### Sidebar tree riwayat

- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- `src/lib/hooks/useConversations.ts`
- `convex/conversations.ts`
- `convex/paperSessions.ts`
- `convex/artifacts.ts`

### Viewer artifact dan routing artifact

- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatContainer.tsx`
- `src/lib/hooks/useArtifactTabs.ts`

### Progress timeline

- `src/components/chat/sidebar/SidebarProgress.tsx`

### Composer chat

- `src/components/chat/ChatInput.tsx`

### Header sidebar mobile

- `src/components/chat/layout/ChatLayout.tsx`

## File Test yang Menjadi Bukti Regresi

### Sidebar tree dan shell chat

- `src/components/chat/sidebar/SidebarChatHistory.tree.test.tsx`
- `src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`
- `__tests__/chat/sidebar-history-count.test.tsx`

### Artifact routing dan viewer

- `src/components/chat/ArtifactPanel.test.tsx`
- `src/components/chat/ArtifactViewer.test.tsx`
- `src/components/chat/ChatWindow.artifact-source-focus.test.tsx`
- `src/lib/hooks/useArtifactTabs.test.ts`

### Convex data lifecycle dan security

- `convex/conversations.cleanup-empty.test.ts`
- `convex/conversations.count.test.ts`
- `convex/conversations.delete-all.test.ts`
- `convex/conversations.bulk-delete.test.ts`
- `convex/artifacts.list-by-conversation.test.ts`

### Composer mobile dan header sidebar mobile

- `src/components/chat/ChatInput.mobile-layout.test.tsx`
- `src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`

## Commit Penting untuk Menelusuri Progres

Urutan commit yang paling relevan terhadap bentuk akhir branch ini:

- `dc60b254` `Docs: define chat session sidebar tree architecture`
- `1a72bafc` `Refine chat session sidebar tree`
- `45986bac` `Polish chat session sidebar tree UI`
- `82e1a569` `Remove deprecated workspace panel files`
- `6c9c1946` `Refine chat artifact indicators`
- `b8b4fe41` `Tighten active conversation spacing`
- `02c9f220` `Polish chat sidebar tree details`
- `af6f7ffd` `Persist chat history tree expansion state`
- `0fe0f067` `Remove dead workspace manager code`
- `39795062` `Fix chat sidebar data loading and cleanup`
- `1db78a72` `Clean up artifact tab state and copy`
- `de7d0b6e` `Harden artifact access controls`
- `0520d4c3` `Fix conversation cleanup and pagination flow`
- `f3baaf5f` `Refine conversation management controls`
- `fb99e310` `Refine conversation selection semantics and remove superseded workspace docs`
- `01de530c` `Align chat tree chevron color`
- `ba16ec50` `Fix chat mobile cleanup and stabilize build fonts`
- `d88c9ed9` `Tighten manage mode header-to-list spacing in chat sidebar`
- `30c75816` `Unify manage mode layout: consistent spacing, selection badge, aligned elements`

### Composer mobile dan header sidebar mobile

- `9b7e89a9` `Refine mobile chat composer layout`
- `05bafb0c` `Center mobile sidebar header tabs`

### Table rendering

- `e1929432` `feat: add stripInlineMarkdown utility for table copy`
- `596679ce` `feat: improve table styling — sans-serif fonts, vertical dividers, rounded corners`
- `5f988d1b` `feat: add per-table copy toolbar (plain text + markdown)`
- `dfcc7ae1` `feat: add responsive card fallback for wide tables on narrow screens`
- `8bc26efb` `fix: table overflow and URL truncation not working`
- `4827250a` `feat: add copy icons and rename table copy buttons`

### Sources right sheet

- `18d39abb` `feat(chat): add SourcesPanel sheet component`
- `d75208cd` `feat(chat): add dual-mode to SourcesIndicator (sheet or collapsible)`
- `fad00ec5` `feat(chat): thread onOpenSources callback through MessageBubble`
- `c3981633` `feat(chat): wire mutual exclusive sheet state for Sources and Proses panels`
- `1d1a65fa` `fix(chat): add right chevron to sources button as sheet affordance`
- `8fb222c4` `fix(chat): responsive chevron direction on sources button`
- `b4ac5b8b` `refactor(chat): remove dead domain fallback in SourceCard`

## Constraint Visual dan UX yang Wajib Dipatuhi

### 1. Halaman chat wajib tunduk ke token `--chat-*`

Perubahan di `/chat/*` tidak boleh bocor ke idiom visual dashboard/admin.

Yang harus dijaga:

- warna, hover, border, scrollbar, dan background tunduk ke token chat
- tidak menambah global header/footer ke area chat
- chevron, checkbox, tree connector, dan indicator file mengikuti bahasa visual chat

### 2. Sidebar adalah workspace utama

Jangan menghidupkan lagi manager terpisah di panel kanan untuk conversation atau paper session.

Kalau ada fitur manajemen baru, titik masuk utamanya harus dievaluasi terhadap:

- `Riwayat Percakapan`
- `Linimasa Progres`
- viewer artifact di kanan

### 3. Tree harus tetap ringan

Aturan yang sudah divalidasi:

- child file latest-only
- jangan menambah level tengah `Sesi Paper`
- jangan membuat parent row menjadi kartu info yang berat

### 4. Sheet kanan bersifat mutual exclusive

Aturan yang berlaku:

- hanya satu sheet yang boleh terbuka pada satu waktu (Proses ATAU Rujukan, tidak keduanya)
- state dikontrol terpusat di `ChatWindow` via `activeSheet`
- sheet baru yang ditambahkan harus ikut mekanisme `activeSheet` yang sama
- desktop: sheet muncul dari kanan (`side="right"`)
- mobile: sheet muncul dari bawah (`side="bottom"`)
- pattern referensi: `ReasoningActivityPanel` dan `SourcesPanel`

### 5. Delete harus tetap jujur

Delete di sidebar harus selalu dipahami sebagai delete conversation subtree, bukan delete file parsial.

## Catatan Operasional Convex

Masalah yang sudah pernah terjadi dan sudah ditangani di branch ini:

- pagination semu mentok di 50
- sidebar tree menunggu semua artifact user
- cleanup conversation tidak ikut cascade
- query artifact mempercayai `userId` dari client

Status sekarang:

- pagination cursor-based sudah aktif
- scoped fetch sudah aktif
- delete cascade sudah aktif
- hardening auth artifact sudah aktif

Kalau ada anomali Convex baru, cek dulu:

1. codegen terbaru sudah jalan
2. function Convex aktif sesuai branch ini
3. consumer frontend tidak lagi memanggil surface lama yang sudah dihapus

## Struktur Folder Docs Saat Ini

- `README.md`
  handoff utama branch ini
- `chat-session-sidebar/2026-03-12-chat-session-sidebar-tree-design-v1.md`
  design doc final untuk arsitektur sidebar tree
- `chat-session-sidebar/2026-03-12-chat-session-sidebar-tree-implementation-plan-v1.md`
  implementation plan final untuk sidebar tree
- `input/2026-03-11-desktop-chat-input-inline-context-autogrow-design.md`
  design doc composer desktop lama, sudah tidak mewakili implementasi mobile terbaru
- `input/2026-03-11-desktop-chat-input-inline-context-autogrow-rollout-plan.md`
  implementation plan composer desktop lama, sudah tidak mewakili implementasi mobile terbaru
- `2026-03-15-chat-visual-rendering-handoff.md`
  context handoff untuk visual rendering di chat (markdown renderer, message bubble, dll)
- `../superpowers/specs/2026-03-15-table-rendering-improvement-design.md`
  design spec table rendering improvement
- `../superpowers/plans/2026-03-15-table-rendering-improvement.md`
  implementation plan table rendering improvement
- `../plans/2026-03-16-sources-right-sheet-design.md`
  design doc sources right sheet (rujukan sebagai sidebar)
- `../plans/2026-03-16-sources-right-sheet-implementation.md`
  implementation plan sources right sheet

## Titik Lanjut yang Masuk Akal

Kalau branch ini dilanjutkan lagi, titik lanjut yang paling logis sekarang adalah:

1. verifikasi visual spacing manage mode di berbagai viewport (desktop narrow, tablet)
2. audit minor UX mobile lanjutan untuk polish, bukan lagi perubahan arsitektur composer/header
3. audit performa / cost query lebih lanjut untuk user dengan histori sangat besar
4. integrasi kelak dengan `Knowledge Base` tanpa menghidupkan lagi panel kanan manager lama
5. enrichment lanjutan sources sheet (snippet/deskripsi dari source, thumbnail) — butuh perubahan data pipeline
6. sheet ketiga (jika ada) harus ikut mekanisme `activeSheet` mutual exclusive di `ChatWindow`

Untuk memulai sesi baru dengan aman:

1. baca README ini dulu
2. baca design + implementation plan di `chat-session-sidebar/`
3. baru sentuh kode
