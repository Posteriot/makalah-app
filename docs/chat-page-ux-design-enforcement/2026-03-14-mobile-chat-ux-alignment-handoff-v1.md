# Mobile Chat UX Alignment Handoff

Dokumen ini adalah handoff untuk sesi berikutnya yang khusus menggarap penyesuaian mobile di branch `chat-page-ux-design-enforcement`.

Dokumen ini harus dibaca bersama:
- [README.md](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/docs/chat-page-ux-design-enforcement/README.md)

README adalah sumber kebenaran arsitektur final branch ini. Dokumen handoff ini menerjemahkan arsitektur final itu ke pekerjaan mobile yang masih tertinggal.

## Posisi Saat Ini

Desktop sudah selesai, dipoles, direview, lalu merged ke `main` lewat PR `#100`.

Arsitektur final yang sudah berlaku sekarang:
- activity bar chat hanya punya:
  - `Riwayat Percakapan`
  - `Linimasa Progres`
- sidebar `Riwayat Percakapan` adalah workspace tree utama
- `Sesi Paper` tidak lagi hidup sebagai sidebar/panel terpisah
- child file `artifact` dan `refrasa` hidup langsung di bawah percakapan
- panel kanan hanya untuk viewer `artifact/refrasa`
- mode kelola percakapan hidup di sidebar `Riwayat`

Artinya, sesi mobile berikutnya **tidak boleh** menghidupkan lagi arsitektur lama yang memisahkan `Sesi Paper` sebagai subsystem mandiri.

## Prinsip Produk yang Sudah Dikunci

Relasi produk yang berlaku:

- `Riwayat Percakapan` menciptakan `Sesi Paper (artifact/refrasa)`
- `Sesi Paper` menciptakan `Linimasa Progres`

Maknanya:
- `Sesi Paper` adalah subsistem dari percakapan
- delete conversation menghapus seluruh subtree paper terkait
- `Linimasa Progres` tetap dipertahankan karena dia meyakinkan user bahwa proses berjalan

Di desktop, relasi ini sudah diwujudkan sebagai:
- `Riwayat Percakapan` = tree utama
- child = latest file `artifact/refrasa`
- `Linimasa Progres` = panel terpisah
- panel kanan = viewer konten

Mobile sekarang harus diselaraskan ke model itu.

## Problem Utama Mobile Saat Ini

### 1. Mobile masih menyisakan model `Sesi Paper` lama

File:
- [MobilePaperSessionsSheet.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/mobile/MobilePaperSessionsSheet.tsx)
- [ChatWindow.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatWindow.tsx)

Kondisi:
- mobile masih punya `MobilePaperSessionsSheet`
- sheet ini masih menampilkan folder paper aktif terpisah dari `Riwayat Percakapan`
- dia masih query `usePaperSession(...)` dan `api.artifacts.listByConversation(...)`
- dia masih hidup dari `showPaperSessionsSheet` di `ChatWindow`

Masalahnya:
- ini bertentangan langsung dengan desktop final
- di desktop, `Sesi Paper` tidak lagi jadi panel terpisah
- kalau dibiarkan, mobile dan desktop akan punya mental model workspace yang berbeda

### 2. Mobile drawer/sidebar perlu diverifikasi terhadap tree `Riwayat`

File:
- [ChatLayout.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/layout/ChatLayout.tsx)
- [ChatSidebar.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatSidebar.tsx)
- [SidebarChatHistory.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/sidebar/SidebarChatHistory.tsx)

Kondisi:
- mobile drawer sekarang sudah merender `ChatSidebar`
- `ChatSidebar` di branch ini sudah mengikuti arsitektur baru
- tetapi behavior, density, affordance, dan ergonomi mobile untuk tree ini belum diaudit khusus

Masalahnya:
- bukan cuma soal “sudah muncul”, tapi apakah nyaman dipakai di layar sempit
- spacing, scroll, mode kelola, dan interaksi tree di mobile bisa saja belum solid

### 3. Viewer mobile artifact dan refrasa perlu dicek terhadap arsitektur final

File:
- [MobileArtifactViewer.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/mobile/MobileArtifactViewer.tsx)
- [MobileRefrasaViewer.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/mobile/MobileRefrasaViewer.tsx)
- [ArtifactViewer.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ArtifactViewer.tsx)

Kondisi:
- mobile masih punya overlay viewer sendiri
- desktop viewer sudah mengalami banyak perubahan:
  - orphan artifact tetap bisa dibuka
  - deep-link source message
  - passive status untuk source conversation yang hilang
  - rail origin-aware di desktop

Masalahnya:
- mobile viewer perlu dicek apakah masih kompatibel dengan semantics baru
- tidak otomatis berarti mobile harus menyalin rail desktop
- tapi mobile tidak boleh mempertahankan copy atau affordance yang bertentangan dengan arsitektur final

### 4. Chat input mobile perlu diaudit dalam konteks workspace baru

File:
- [ChatInput.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatInput.tsx)

Kondisi:
- `ChatInput` sudah punya mode desktop, mobile, fullscreen, context tray
- mobile input hidup di bawah struktur chat yang baru

Masalahnya:
- perlu dicek apakah penataan context tray, clear-all attachment, dan fullscreen input masih koheren dengan perubahan workspace sidebar
- jangan sampai input mobile tetap berasumsi ada subsystem `Sesi Paper` terpisah

## Batas Arsitektur yang Harus Dipatuhi

Ini harus dianggap fixed. Jangan dibatalkan lagi di sesi mobile berikutnya.

### 1. Activity bar chat tetap hanya dua item

File:
- [ActivityBar.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/shell/ActivityBar.tsx)

Yang benar:
- `Riwayat Percakapan`
- `Linimasa Progres`

Yang tidak boleh hidup lagi:
- tab/activity/sidebar `Sesi Paper`

### 2. Sidebar `Riwayat Percakapan` tetap pusat workspace

File:
- [SidebarChatHistory.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/sidebar/SidebarChatHistory.tsx)

Yang benar:
- parent = conversation
- child = latest `artifact` dan `refrasa`
- tidak ada node tengah `Sesi Paper`

### 3. Panel kanan/overlay viewer tetap hanya viewer konten

Yang benar:
- desktop panel kanan = viewer `artifact/refrasa`
- mobile overlay viewer = viewer `artifact/refrasa`

Yang tidak boleh hidup lagi:
- manager panel kanan
- sheet/panel mobile yang memperlakukan `Sesi Paper` sebagai sistem navigasi terpisah dari `Riwayat`

### 4. Linimasa Progres tetap terpisah

Yang benar:
- progress tetap ada
- progress tidak digabung ke tree file

## Keputusan Desain Mobile yang Direkomendasikan

Ini bukan implementasi final, tapi arah terbaik untuk sesi berikutnya.

### 1. Hapus `MobilePaperSessionsSheet`

Rekomendasi terbaik:
- hapus penggunaan `MobilePaperSessionsSheet` dari `ChatWindow`
- hentikan jalur `showPaperSessionsSheet`
- kalau perlu, hapus file-nya sekalian setelah semua call site aman

Alasan:
- dia mewakili arsitektur lama
- mobile harus mengikuti model `Riwayat -> child file`, bukan mempertahankan sheet paper terpisah

### 2. Jadikan mobile drawer sebagai satu-satunya entry point workspace

Rekomendasi terbaik:
- mobile drawer yang merender `ChatSidebar` menjadi sumber workspace utama
- `Riwayat` dan `Linimasa` tetap dipilih dari activity bar state yang sama

Artinya:
- user buka menu mobile
- user melihat `Riwayat` tree atau `Linimasa`
- tidak ada lagi jalur samping `Sesi Paper`

### 3. Biarkan viewer mobile tetap sebagai overlay, tapi sinkronkan semantics-nya

Rekomendasi terbaik:
- `MobileArtifactViewer` dan `MobileRefrasaViewer` tetap boleh hidup sebagai overlay mobile
- tapi copy, affordance, dan routing-nya harus dicek terhadap arsitektur final

Fokus audit:
- orphan artifact
- source conversation yang hilang
- aksi refrasa
- download/copy/delete chain

### 4. Audit `ChatInput` mobile dalam konteks baru

Rekomendasi terbaik:
- jangan redesign input dari nol
- audit apakah:
  - context tray masih nyaman
  - clear attachment tidak bentrok
  - fullscreen input tetap masuk akal
  - tidak ada copy/affordance yang masih mengasumsikan subsystem paper lama

## Scope yang Masuk

- audit dan penyesuaian mobile drawer `Riwayat`
- audit dan penyesuaian mobile `Linimasa Progres`
- penghapusan model `MobilePaperSessionsSheet`
- penyesuaian mobile artifact/refrasa viewer agar konsisten dengan arsitektur final
- audit mobile `ChatInput`
- test regresi mobile yang perlu untuk memastikan arsitektur baru aman

## Scope yang Jangan Masuk Dulu

- redesign besar desktop lagi
- mengubah arsitektur final desktop yang sudah merged
- membangun subsystem paper mobile baru yang terpisah
- menambah fitur produk baru yang tidak terkait alignment mobile
- mengubah semantics delete conversation yang sudah dikunci

## File Wajib Dibaca di Sesi Mobile Berikutnya

### Wajib

- [docs/chat-page-ux-design-enforcement/README.md](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/docs/chat-page-ux-design-enforcement/README.md)
- [src/components/chat/layout/ChatLayout.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/layout/ChatLayout.tsx)
- [src/components/chat/ChatSidebar.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatSidebar.tsx)
- [src/components/chat/sidebar/SidebarChatHistory.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/sidebar/SidebarChatHistory.tsx)
- [src/components/chat/sidebar/SidebarProgress.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/sidebar/SidebarProgress.tsx)
- [src/components/chat/shell/ActivityBar.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/shell/ActivityBar.tsx)
- [src/components/chat/shell/TopBar.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/shell/TopBar.tsx)
- [src/components/chat/ChatWindow.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatWindow.tsx)
- [src/components/chat/ChatInput.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatInput.tsx)
- [src/components/chat/mobile/MobilePaperSessionsSheet.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/mobile/MobilePaperSessionsSheet.tsx)
- [src/components/chat/mobile/MobileArtifactViewer.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/mobile/MobileArtifactViewer.tsx)
- [src/components/chat/mobile/MobileRefrasaViewer.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/mobile/MobileRefrasaViewer.tsx)
- [src/components/chat/ChatContainer.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatContainer.tsx)

### Konteks data

- [src/lib/hooks/useConversations.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/hooks/useConversations.ts)
- [src/lib/hooks/useArtifactTabs.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/hooks/useArtifactTabs.ts)
- [convex/conversations.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/convex/conversations.ts)
- [convex/artifacts.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/convex/artifacts.ts)
- [convex/paperSessions.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/convex/paperSessions.ts)

## Definisi Selesai untuk Batch Mobile Berikutnya

Batch mobile bisa dianggap selesai kalau:

- mobile tidak lagi punya subsystem `Sesi Paper` terpisah
- mobile drawer mengikuti arsitektur `Riwayat` tree + `Linimasa`
- artifact/refrasa mobile viewer tetap bekerja dan tidak bentrok dengan arsitektur baru
- input mobile tetap nyaman dan tidak menyisakan affordance lama yang keliru
- seluruh behavior mobile yang disentuh diverifikasi dengan test dan audit browser/device emulation

## Kalimat Konteks yang Bisa Dipakai untuk Memulai Sesi Baru

Kalau perlu prompt awal singkat untuk sesi baru, konteks minimumnya:

> Desktop di branch `chat-page-ux-design-enforcement` sudah final dan merged: activity bar hanya `Riwayat Percakapan` + `Linimasa Progres`, sidebar `Riwayat` adalah tree workspace utama, `Sesi Paper` terpisah sudah dibatalkan, panel kanan hanya viewer `artifact/refrasa`. Sekarang audit dan sesuaikan mobile agar patuh ke arsitektur final itu. Gunakan README dan handoff mobile ini sebagai sumber kebenaran awal.

