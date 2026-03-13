# Chat Page UX Design Enforcement

Dokumen ini adalah handoff utama untuk branch `chat-page-ux-design-enforcement`.

README ini sudah diselaraskan dengan implementasi aktual branch ini. Arah lama yang berbasis `workspace panel` kanan untuk `Kelola Percakapan` dan `Sesi Paper` sudah dibatalkan. Arsitektur yang berlaku sekarang adalah sidebar tree terintegrasi.

## Ringkasan Branch

- Branch aktif: `chat-page-ux-design-enforcement`
- Worktree aktif: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement`
- Fokus branch: penegakan UI/UX halaman chat dengan pusat perubahan pada activity bar, sidebar, riwayat percakapan, top bar, viewer artifact/refrasa, dan alur data pendukungnya
- Hasil utama branch ini:
  - activity bar chat disederhanakan
  - sidebar `Riwayat` diubah menjadi tree ala explorer
  - sesi paper aktif tidak lagi hidup sebagai sidebar/panel terpisah
  - panel kanan dikembalikan hanya untuk viewer `artifact` dan `refrasa`
  - `Linimasa Progres` tetap dipertahankan sebagai panel terpisah
  - mode kelola percakapan dipindah ke dalam sidebar `Riwayat`
  - data loading, cleanup cascade, dan kontrol akses Convex ikut diperkuat

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

- dipicu dari icon header `Riwayat`
- saat aktif, icon header berubah dari `settings` menjadi `close`
- toolbar list menjadi compact:
  - checkbox utama
  - angka jumlah terseleksi
  - satu icon `hapus`

Semantics checkbox utama:

- checkbox utama = semua percakapan user
- bukan hanya semua item yang sedang tampil

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

#### G. Data flow, cleanup, dan security

Sudah aktif:

- pagination conversation berbasis cursor
- sidebar tree scoped fetch untuk conversation yang tampil
- cleanup conversation cascade termasuk blob storage file
- hardening access control artifact
- dead query dan dead surface manager lama sudah dihapus

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

### Composer desktop

- `src/components/chat/ChatInput.tsx`

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

### 4. Delete harus tetap jujur

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
  design doc composer desktop
- `input/2026-03-11-desktop-chat-input-inline-context-autogrow-rollout-plan.md`
  implementation plan composer desktop

## Titik Lanjut yang Masuk Akal

Kalau branch ini dilanjutkan lagi, titik lanjut yang paling logis sekarang adalah:

1. polish mikro tambahan di tree sidebar dan manage mode
2. audit UX mobile agar menyusul arsitektur desktop yang baru
3. audit performa / cost query lebih lanjut untuk user dengan histori sangat besar
4. integrasi kelak dengan `Knowledge Base` tanpa menghidupkan lagi panel kanan manager lama

Untuk memulai sesi baru dengan aman:

1. baca README ini dulu
2. baca design + implementation plan di `chat-session-sidebar/`
3. baru sentuh kode
