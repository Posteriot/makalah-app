# Paper Sessions Workspace Panel Handoff

Dokumen ini adalah handoff untuk pekerjaan berikutnya di branch/worktree `chat-page-ux-design-enforcement` setelah worktree ini disamakan kembali 1:1 dengan `main` lokal.

Fokus pekerjaan berikutnya:

- memindahkan daftar `Sesi Lainnya` pada sidebar sesi paper ke `workspace panel` kanan
- menambahkan icon/button settings pada header `Sesi Paper` sebagai trigger pembuka panel itu
- membangun panel sesi paper secara mandiri, terpisah dari panel `Kelola Percakapan`

Dokumen ini sengaja tidak membahas ulang `Kelola Percakapan` secara penuh. Yang relevan dari panel itu hanya pola arsitektur panel kanan dan trigger-nya.

## Target UX yang Sudah Dikunci

### 1. `Sesi Lainnya` keluar dari sidebar

Sidebar sesi paper saat ini masih memuat dua area sekaligus:

- sesi paper aktif untuk percakapan sekarang
- daftar `Sesi Lainnya`

Target berikutnya:

- sidebar hanya fokus ke sesi paper aktif pada percakapan sekarang
- daftar `Sesi Lainnya` dipindahkan ke workspace panel kanan

Artinya, sidebar sesi paper tidak lagi menjadi list panjang semua sesi paper user.

### 2. Header `Sesi Paper` punya trigger settings

Header `Sesi Paper` harus diberi icon/button settings yang menjadi affordance pembuka workspace panel sesi paper.

Tujuan trigger ini sama seperti pada `Riwayat` percakapan:

- memberi jalan masuk ke area manajemen/daftar lengkap
- menjaga sidebar tetap fokus ke konteks aktif

### 3. Panel sesi paper harus mandiri

Ini poin terpenting.

Panel baru untuk sesi paper:

- bukan bagian dari `Kelola Percakapan`
- bukan submenu atau tab di `ConversationManagerPanel`
- bukan reuse isi panel percakapan yang diubah labelnya

Yang benar:

- panel sesi paper adalah mode panel kanan yang berbeda
- punya komponen sendiri
- punya state mode sendiri
- punya header sendiri
- punya daftar sesi sendiri

Secara arsitektur, panel ini boleh mengikuti kerangka `WorkspacePanelShell`, tetapi kontennya harus berdiri sendiri.

## Referensi UI yang Dimaksud

Screenshot yang jadi acuan:

- `.worktrees/chat-page-ux-design-enforcement/screenshots/Screen Shot 2026-03-11 at 20.27.15.png`
  Menunjukkan area `Sesi Lainnya` yang sekarang masih hidup di sidebar.
- `.worktrees/chat-page-ux-design-enforcement/screenshots/Screen Shot 2026-03-11 at 20.28.57.png`
  Menunjukkan header `Sesi Paper` yang perlu diberi trigger settings.

Makna desain dari dua screenshot itu:

- masalah utamanya bukan styling kecil, tetapi penempatan responsibility UI
- sidebar terlalu berat karena memuat sesi aktif dan sesi lain sekaligus
- daftar sesi lain lebih cocok menjadi panel kanan, sama seperti riwayat percakapan sudah dipindahkan sebelumnya

## Kondisi Kode Saat Ini di `main`

### Sidebar paper sessions masih memuat `Sesi Lainnya`

File utama:

- `src/components/chat/sidebar/SidebarPaperSessions.tsx`

Hal yang perlu dipahami:

- komponen ini query `usePaperSession(currentConversationId)` untuk sesi aktif
- komponen ini juga query `api.paperSessions.getByUser` untuk seluruh sesi user
- `otherSessions` dibangun dengan mengecualikan sesi aktif
- `renderOtherSessions()` saat ini merender section `Sesi Lainnya`
- section itu dipakai di beberapa state render:
  - initial state tanpa conversation aktif
  - state tanpa paper session aktif
  - state dengan paper session aktif

Ini berarti migrasi `Sesi Lainnya` ke panel kanan tidak cukup hanya menghapus satu blok JSX. Ada beberapa cabang render yang harus dibereskan.

### Arsitektur panel kanan saat ini baru mengenal `conversation-manager`

File utama:

- `src/components/chat/layout/ChatLayout.tsx`

State penting saat ini:

- `workspacePanelMode` hanya punya union `"conversation-manager" | null`
- `activeRightPanelMode` saat ini hanya membedakan:
  - `conversation-manager`
  - `artifact`
  - `null`

Implikasinya:

- untuk panel sesi paper, `workspacePanelMode` harus diperluas
- jangan mengakali dengan boolean terpisah yang hidup sendiri di luar orkestrasi panel kanan

Mode target yang masuk akal:

- `"conversation-manager"`
- `"paper-sessions-manager"`
- `null`

Artifact tetap diperlakukan sebagai mode viewport kanan tersendiri, seperti sekarang.

### Shell panel reusable sudah ada

File:

- `src/components/chat/workspace-panel/WorkspacePanelShell.tsx`

Komponen ini sudah menangani:

- header panel
- icon settings
- close `x`
- body scroll area

Untuk panel sesi paper baru, pendekatan terbaik adalah:

- reuse shell ini
- isi panel dibuat komponen baru

Jangan menempelkan logic sesi paper ke `ConversationManagerPanel.tsx`.

### Panel percakapan yang sudah ada hanya jadi referensi pola

File:

- `src/components/chat/workspace-panel/ConversationManagerPanel.tsx`
- `src/components/chat/workspace-manager/ConversationManagerTable.tsx`

Yang bisa dipanen:

- pola mode panel kanan
- pola open/close
- pola restore artifact saat panel ditutup
- pola mobile sheet untuk viewport kecil

Yang tidak boleh dicampur:

- semantics `Kelola Percakapan`
- data flow percakapan
- destructive actions yang spesifik percakapan

## Desain Target yang Direkomendasikan

### Sidebar `Sesi Paper`

Setelah migrasi:

- header `Sesi Paper`
- sublabel `Folder Artifak · N sesi`
- icon/button settings di sisi kanan header
- hanya tampilkan sesi paper aktif milik percakapan sekarang
- artifact di dalam sesi aktif tetap bisa diexpand/collapse seperti sekarang

Yang harus hilang dari sidebar:

- section `Sesi Lainnya`

### Workspace panel baru: sesi paper

Panel kanan baru sebaiknya bernama operasional:

- `Panel Sesi Paper`

Tidak harus menjadi label produk final, tetapi cukup jelas sebagai nama kerja implementasi.

Isi panel:

- daftar seluruh paper session milik user
- fokus utama: navigasi dan pemilihan sesi
- bukan panel destruktif berat seperti `Kelola Percakapan`

Daftar minimal data per item:

- judul sesi
- stage saat ini
- jumlah artifak
- status aktif/nonaktif terhadap percakapan sekarang

Rekomendasi UX:

- item list bisa dipakai untuk pindah ke conversation terkait sesi paper itu
- karena berbeda dari panel percakapan, panel ini lebih dekat ke navigator/workspace switcher, bukan manager delete

### Hubungan dengan artifact

Panel sesi paper ini tetap hidup di slot viewport kanan yang sama.

Perilaku yang paling konsisten:

- saat panel sesi paper dibuka ketika artifact aktif, artifact disembunyikan sementara
- saat panel ditutup, artifact yang sebelumnya aktif bisa muncul lagi

Ini sama dengan pola `Kelola Percakapan`, tetapi implementasinya tetap harus menjadi mode panel yang terpisah.

## Scope Implementasi yang Direkomendasikan

### Masuk scope

- tambah trigger settings pada header `Sesi Paper`
- perluas `workspacePanelMode` di `ChatLayout`
- buat panel baru khusus sesi paper
- pindahkan `Sesi Lainnya` dari sidebar ke panel baru
- pertahankan sesi aktif di sidebar
- tetap jaga restore artifact saat panel ditutup

### Jangan masuk scope dulu

- bulk delete paper session
- rename session dari panel baru
- filter/sort kompleks
- pencarian session
- merge panel sesi paper ke panel percakapan

Alasannya sederhana: target berikutnya adalah memindahkan responsibility UI, bukan membangun paper session manager besar sekaligus.

## Risiko Teknis yang Harus Diwaspadai

### 1. Tiga state render di `SidebarPaperSessions`

`SidebarPaperSessions.tsx` sekarang punya beberapa branch render besar:

- tanpa conversation aktif
- loading
- tanpa paper session aktif
- dengan paper session aktif

Kalau migrasi `Sesi Lainnya` dilakukan setengah-setengah, sangat mudah ada satu cabang render yang masih memunculkan daftar lama.

### 2. Auto-expand logic sesi aktif

Komponen ini punya state:

- `expandedFolderId`
- `lastSyncedSessionId`

Logic auto-expand untuk sesi aktif sekarang masih bercampur dengan keberadaan `otherSessions`.

Saat `Sesi Lainnya` dipindahkan keluar, pastikan logic expand sesi aktif tidak ikut rusak.

### 3. Mobile behavior

Saat ini ada `MobilePaperSessionsSheet` di:

- `src/components/chat/mobile/MobilePaperSessionsSheet.tsx`

Untuk sesi berikutnya, keputusan paling aman:

- fokus desktop dulu
- mobile cukup dipetakan sebagai dampak lanjutan, bukan wajib di batch pertama

Kalau mobile ikut disentuh tanpa fokus yang jelas, ruang regressions-nya naik.

## File Utama yang Harus Dibaca di Sesi Berikutnya

### Wajib

- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/workspace-panel/WorkspacePanelShell.tsx`
- `src/components/chat/workspace-panel/ConversationManagerPanel.tsx`
- `src/lib/hooks/usePaperSession.ts`
- `convex/paperSessions.ts`

### Konteks tambahan

- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/mobile/MobilePaperSessionsSheet.tsx`
- `src/components/paper/PaperSessionBadge.tsx`

## Rekomendasi Pendekatan Implementasi

Pendekatan terbaik untuk sesi berikutnya:

1. perlakukan pekerjaan ini sebagai evolusi arsitektur panel kanan, bukan sekadar pemindahan blok JSX
2. tambah mode baru panel kanan untuk sesi paper
3. buat komponen baru yang berdiri sendiri, misalnya:
   - `PaperSessionsManagerPanel.tsx`
4. gunakan `WorkspacePanelShell`
5. refactor `SidebarPaperSessions.tsx` agar hanya menangani sesi aktif

Kalau implementasi nanti hanya menambah popup kecil atau accordion baru di sidebar, itu arah yang salah. Kebutuhan user sudah jelas: `Sesi Lainnya` harus keluar dari sidebar dan pindah ke workspace panel.

## Definisi Selesai untuk Batch Berikutnya

Batch ini bisa dianggap selesai kalau:

- sidebar `Sesi Paper` tidak lagi merender `Sesi Lainnya`
- header `Sesi Paper` punya trigger settings yang jelas
- trigger itu membuka panel kanan mandiri untuk sesi paper
- panel itu tidak menempel pada `Kelola Percakapan`
- panel kanan sesi paper bisa ditutup
- artifact yang sebelumnya aktif tetap pulih saat panel ditutup

## Catatan Penting untuk Sesi Berikutnya

- Worktree ini saat handoff dibuat sudah disamakan lagi 1:1 dengan `main` lokal
- Jadi jangan mengandalkan history eksperimen lama yang pernah ada di branch ini
- Gunakan dokumen ini sebagai titik masuk baru
- Kalau perlu menulis design doc + rollout plan formal sebelum coding, dokumen ini bisa dijadikan seed context awal
