# Chat Session Sidebar Tree Design v1

Dokumen ini menjadi sumber kebenaran desain baru untuk area workspace chat di sidebar.

Dokumen ini menggantikan penuh arah desain sebelumnya yang memindahkan `Sesi Paper Lainnya` ke panel kanan. Setelah dokumen ini berlaku:

- panel kanan dikembalikan hanya untuk viewer `artifact` dan `refrasa`
- panel kanan `Kelola Percakapan` dibatalkan
- panel kanan `Sesi Paper` dibatalkan
- sidebar menjadi workspace utama yang mengintegrasikan `Riwayat Percakapan` dan subtree file paper
- `Linimasa Progres` tetap dipertahankan sebagai subsistem terpisah

## 1. Masalah Produk yang Diselesaikan

Arsitektur sidebar saat ini memisahkan tiga hal yang sebenarnya berelasi langsung:

- `Riwayat Percakapan`
- `Sesi Paper`
- `Linimasa Progres`

Padahal hubungan yang benar adalah:

`Riwayat Percakapan -> menciptakan -> Sesi Paper (artifact/refrasa) -> menciptakan -> Linimasa Progres`

Akibat pemisahan ini:

- `Sesi Paper` terasa seperti sistem paralel, padahal ia turunan dari percakapan
- aksi delete percakapan tidak terlihat konsekuensi subtree-nya di UI utama
- panel kanan `Sesi Paper` berisiko menjadi pengulangan navigasi yang sudah ada di kiri
- user harus menyusun sendiri relasi data antara percakapan, sesi paper, artifact, dan progress

## 2. Prinsip Desain yang Dikunci

### 2.1 Sidebar adalah workspace utama

Sidebar kiri menjadi workspace tree utama untuk chat dan file paper.

### 2.2 Panel kanan hanya viewer

Panel kanan hanya dipakai untuk:

- `artifact`
- `refrasa`

Panel kanan tidak lagi menampung navigator `Sesi Paper`.

### 2.3 Tree mengikuti mental model Explorer VS Code

Sidebar riwayat percakapan mengikuti pola tree ala file explorer:

- parent node = percakapan
- child node = latest file paper milik percakapan itu
- expand/collapse dikendalikan dengan affordance kecil yang terpisah dari label

### 2.4 Delete berakar di percakapan

Delete tetap berakar di conversation root. Jika percakapan dihapus, seluruh subtree paper ikut hilang:

- paper session
- artifact
- refrasa

User tidak dianggap dirugikan karena:

- artifact sudah punya `download`
- artifact bisa di-`copy`
- ke depan ada `Knowledge Base` untuk penyelamatan artifact lintas sesi

### 2.5 Linimasa Progres tetap hidup

`Linimasa Progres` tetap dipertahankan sebagai panel/activity bar terpisah karena fungsinya adalah reassurance/progress inspector, bukan file tree.

## 3. Model Informasi yang Baru

### 3.1 Sidebar root

Sidebar `Riwayat Percakapan` tetap menjadi pintu utama, tetapi setiap item percakapan bisa menjadi root node tree.

State per root node:

- percakapan biasa tanpa paper session
- percakapan dengan paper session
- percakapan aktif
- percakapan nonaktif

Aturan penting:

- percakapan tanpa paper session tetap tampil sebagai parent row biasa
- percakapan tanpa paper session tidak memiliki child node
- klik row percakapan tanpa paper session tetap membuka percakapan seperti perilaku sekarang

### 3.2 Subtree paper

Jika sebuah percakapan memiliki paper session aktif, child tree di bawahnya menampilkan file paper latest secara flat.

Child yang tampil:

- `artifact`
- `refrasa`

Yang tidak dipakai:

- node tengah `Sesi Paper`
- grouping tambahan `Artifak` lalu `Refrasa`
- versi historis non-latest

### 3.3 Latest-only rule

Subtree sidebar hanya menampilkan latest version untuk setiap file paper yang relevan.

Tujuannya:

- tree tetap dangkal
- sidebar tidak menjadi terlalu berat
- user melihat representasi file kerja terkini, bukan histori lengkap

Histori lengkap tetap domain viewer dan backend, bukan tree sidebar.

## 4. Struktur UI yang Direkomendasikan

### 4.1 Parent node percakapan

Setiap row percakapan menampilkan:

- chevron expand/collapse di kiri
- judul percakapan
- badge stage jika punya paper session
- timestamp relatif

Perilaku:

- klik label row membuka percakapan
- klik chevron hanya expand/collapse
- jika row tidak punya paper session, chevron tidak perlu tampil

Alasan:

- menghindari salah klik
- tetap sesuai mental model explorer
- navigasi ke percakapan tidak tercampur dengan toggle tree

### 4.2 Child node file paper

Child file ditampilkan flat di bawah parent yang di-expand.

Per item:

- icon dokumen untuk artifact
- marker `R` untuk refrasa
- judul file
- meta kecil tipe/version jika diperlukan

Aturan visual:

- child menjorok lebih dalam daripada parent
- icon sejajar dengan judul, bukan vertical-center yang terasa melayang
- hover dan active state harus konsisten dengan list explorer, bukan card

### 4.3 Auto-expand rule

Agar tree tidak liar, aturan default:

- percakapan aktif auto-expand jika punya subtree paper
- percakapan nonaktif bisa di-expand manual
- hanya satu subtree expanded pada satu waktu

Tujuannya:

- sidebar tetap ringan
- user tetap bisa eksplorasi
- tidak ada hutan node terbuka sekaligus

## 5. Delete Mode di Sidebar

Delete di sidebar diperlukan, tetapi tidak boleh selalu tampil permanen karena akan membuat sidebar padat.

### 5.1 Mode normal

Sidebar tampil bersih:

- tanpa checkbox
- tanpa action bar destruktif
- fokus pada navigasi tree

### 5.2 Mode kelola

Saat user masuk mode kelola:

- checkbox muncul per parent conversation row
- checkbox child file tidak diperlukan karena delete berakar di conversation
- header action bar kecil muncul di area `Riwayat Percakapan`

Action yang direkomendasikan:

- pilih satu
- pilih banyak
- pilih semua yang sedang tampil
- hapus terpilih
- hapus semua

### 5.3 Copy konfirmasi delete

Karena delete berakar di conversation, copy konfirmasi harus eksplisit:

`Percakapan ini akan dihapus permanen bersama sesi paper, artifact, dan refrasa terkait.`

Untuk bulk delete, copy menyesuaikan jumlah selection.

## 6. Akses Seluruh Percakapan

Sidebar tidak perlu menampilkan seluruh conversation sekaligus.

Aturan load yang direkomendasikan:

- render awal `20` conversation
- load berikutnya otomatis saat user scroll ke bawah
- pagination bersifat incremental/infinite, bukan pager manual

Tujuan:

- menjaga performa render
- seluruh conversation tetap terakses
- struktur tree tidak terasa berat sejak awal

## 7. Dampak terhadap Arsitektur Saat Ini

Dokumen ini membatalkan atau mengubah arah berikut:

### 7.1 Dibatalkan

- panel kanan `conversation-manager`
- panel kanan `paper-sessions-manager`
- tombol settings `Riwayat` untuk membuka panel kanan percakapan
- tombol settings `Sesi Paper` untuk membuka panel kanan paper
- konsep `Sesi Paper Lainnya` sebagai workspace panel mandiri
- tab/activity bar `Sesi Paper`

### 7.2 Dipertahankan

- viewer `artifact` dan `refrasa` di panel kanan
- origin-aware navigation yang berguna untuk return dari artifact viewer
- `Linimasa Progres`

### 7.3 Direfaktor

- `SidebarChatHistory` menjadi tree-aware conversation workspace
- `SidebarPaperSessions` dibubarkan atau logic-nya dipindah ke subtree conversation
- `ChatSidebar` tidak lagi merender panel `paper` sebagai tab terpisah
- `ChatSidebar` tidak lagi menyediakan affordance panel kanan untuk manajemen conversation
- `ChatSidebar` hanya menyisakan dua konteks activity bar: `Riwayat Percakapan` dan `Linimasa Progres`
- `ChatLayout` tidak lagi mengorkestrasi `paper-sessions-manager`
- `ChatLayout` tidak lagi mengorkestrasi `conversation-manager`

## 8. File Kode yang Terdampak

### Wajib

- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/shell/ActivityBar.tsx`
- `src/lib/hooks/useArtifactTabs.ts`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `convex/conversations.ts`
- `convex/paperSessions.ts`
- `convex/artifacts.ts`

### Tes yang terdampak

- desktop sidebar/chat layout tests
- paper session tree behavior tests
- delete mode tests
- artifact open-from-tree tests

## 9. Definisi Selesai

Perubahan ini dianggap selesai jika:

- activity bar/sidebar `Sesi Paper` dihapus
- `Riwayat Percakapan` berubah menjadi tree workspace
- parent row percakapan bisa expand/collapse
- child latest artifact/refrasa tampil flat di bawah parent
- panel kanan hanya dipakai untuk viewer artifact/refrasa
- delete mode di sidebar mendukung single, many, dan all
- delete percakapan menghapus subtree paper terkait
- seluruh percakapan tetap terakses incremental meski initial list dibatasi

## 10. Rekomendasi Implementasi

Perubahan ini harus diperlakukan sebagai sidebar architecture reset, bukan patch incremental kecil.

Pendekatan yang direkomendasikan:

1. hapus ketergantungan UX pada panel kanan `Sesi Paper`
2. satukan data conversation + paper session + latest artifact ke model tree sidebar
3. pindahkan affordance paper dari panel terpisah ke subtree parent conversation
4. baru setelah itu tambahkan mode kelola/delete di sidebar

Urutan ini penting. Kalau mode delete dibangun dulu sebelum tree model stabil, sidebar akan jadi padat dan rawan dirombak dua kali.
