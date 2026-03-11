# Chat Workspace Panel Overlay Governance

## Ringkasan

- Scope: mengganti entry `Kelola Percakapan` dari halaman penuh menjadi `workspace panel` kanan di dalam halaman chat.
- Goal: menjaga konteks kerja tetap di `/chat/*`, sambil menyediakan panel manajemen penuh untuk percakapan.
- Constraint utama: panel harus mengikuti pola panel kanan/artifact yang sudah ada, tetap punya tombol close `x`, dan fondasinya reusable untuk modul masa depan seperti `paper-session-extended`, `attachments-list`, dan `knowledge-base`.

## Latar Belakang

Versi halaman penuh untuk `Workspace Manager` sudah terbukti terlalu berat untuk state produk saat ini. Modul yang benar-benar aktif baru `Kelola Percakapan`, sehingga perpindahan ke halaman terpisah terasa memutus konteks chat dan menambah chrome yang tidak perlu.

Kebutuhan yang sudah divalidasi:

- `Kelola Percakapan` tidak keluar dari halaman chat.
- Kemunculan harus memakai pola panel kanan seperti artifact, bukan membangun mekanisme UI baru dari nol.
- Panel harus bisa di-close melalui tombol `x` eksplisit.
- Jika artifact sedang aktif lalu `Kelola Percakapan` dibuka, artifact harus kembali terlihat saat panel ditutup.
- Panel harus fokus pada operasi manajemen percakapan, bukan memperluas fungsi navigasi sidebar.
- Daftar aksi harus mengedepankan ikon dan pola inbox seperti Gmail.
- Fondasi arsitektur panel harus reusable untuk fitur lain di masa depan.

## Keputusan Produk

### Arah yang Dipilih

Gunakan `workspace panel` kanan di dalam shell chat sebagai rumah `Kelola Percakapan`.

Makna UX-nya:

- halaman utama tetap chat
- panel kanan menjadi workspace kontekstual sekunder
- artifact dan `Kelola Percakapan` berbagi slot viewport kanan yang sama
- hanya satu konten panel kanan yang aktif dalam satu waktu

### Arah yang Ditolak

- Halaman penuh `/chat/workspace-manager` sebagai entry utama UI
  Alasan: terlalu berat untuk modul yang baru satu dan memutus konteks chat.
- Panel kanan kedua yang hidup berdampingan dengan artifact
  Alasan: merusak layout, menyempitkan area chat, dan menambah state yang rapuh.
- Mode pasif yang menonaktifkan area chat saat panel aktif
  Alasan: menambah kompleksitas, berpotensi memunculkan bug baru, dan tidak sesuai pola VS Code yang dijadikan referensi.

## Prinsip UX

### Tetap Kontekstual

`Kelola Percakapan` hadir sebagai workspace samping, bukan perpindahan area kerja. Chat utama tetap aktif, composer tetap hidup, dan user tetap merasa berada di konteks yang sama.

### Satu Viewport Kanan

Panel kanan hanya punya satu viewport aktif dalam satu waktu. Artifact dan `Kelola Percakapan` tidak ditampilkan berdampingan.

### Restore State

Jika artifact sedang aktif ketika `Kelola Percakapan` dibuka, artifact tidak dibuang. Panel manager hanya mengambil alih viewport kanan sementara. Saat ditutup, artifact sebelumnya muncul kembali.

### Fokus Manajemen, Bukan Navigasi

Panel ini tidak boleh berubah menjadi sidebar versi panjang. Fungsi utamanya adalah operasi manajemen: select, delete satu, delete beberapa, delete semua.

## Arsitektur Panel Kanan

### Model State

Panel kanan harus dikendalikan oleh satu sumber kebenaran mode viewport, misalnya:

- `null`
- `artifact`
- `conversation-manager`
- `paper-session-extended`
- `attachments-list`
- `knowledge-base`

Mode selain `artifact` dan `conversation-manager` belum aktif di fase ini, tetapi fondasinya harus siap.

### Aturan Lebar Panel

`Kelola Percakapan` tidak memakai lebar statis baru yang terpisah dari sistem chat.

Aturannya:

- panel memakai slot viewport kanan yang sama seperti artifact
- lebar panel bersifat fleksibel mengikuti mekanisme panel kanan chat
- panel tetap boleh di-resize jika sistem panel kanan saat ini mendukung resize
- clamp lebar panel harus tetap tunduk pada batas minimum area chat sebagai area utama

Prinsipnya: area chat adalah constraint utama, sedangkan `Kelola Percakapan` menumpang pada aturan lebar panel kanan yang sudah ada.

### Perilaku Restore

- Saat `conversation-manager` dibuka ketika artifact aktif, artifact context disimpan.
- Saat `conversation-manager` ditutup, viewport kanan memulihkan state artifact yang tadi aktif.
- Jika sebelumnya tidak ada panel aktif, close mengembalikan chat ke kondisi tanpa panel kanan.
- Jika selama manager terbuka ada permintaan baru untuk membuka artifact, manager ditutup dan artifact baru mengambil alih viewport kanan.

## Trigger dan Interaksi

### Entry Point

Trigger tetap berada di area kontrol `Riwayat` pada shell chat.

### Open dan Close

- klik trigger membuka panel kanan `Kelola Percakapan`
- panel punya tombol close `x` eksplisit
- `Esc` menutup panel mengikuti pola sheet/panel kanan yang sudah ada

### Hubungan dengan Artifact

- `Kelola Percakapan` memakai pola interaksi panel kanan/artifact yang sudah ada
- secara UX ia seperti layer sementara di atas artifact
- secara teknis tidak wajib benar-benar menumpuk dua layer hidup bersamaan, selama perilaku restore tetap sama

## Struktur UI Panel

### Header

- judul `Kelola Percakapan`
- tombol close `x` di kanan atas

Tidak perlu subheading panjang, banner besar, atau shell halaman mandiri.

### Body

- toolbar ringkas di atas daftar
- daftar seluruh percakapan milik user terautentikasi yang sedang aktif, dengan paginasi server-side
- area aksi destruktif yang jelas

### Footer

- kontrol paginasi
- ringkasan `menampilkan x-y dari total`

## Pola Daftar

Pola daftar harus mengikuti rasa inbox seperti Gmail, bukan tabel dashboard dan bukan list navigasi sidebar.

Struktur toolbar atas:

- checkbox utama untuk `select all` pada halaman aktif
- ikon `hapus pilihan`
- aksi destruktif tingkat tinggi dipisah untuk `hapus semua`

Perilaku checkbox utama:

- selalu tampil
- saat dicentang, seluruh item pada halaman aktif otomatis terseleksi
- selection tetap bisa dikurangi manual per item
- state checkbox utama harus mendukung `checked`, `indeterminate`, dan `unchecked`

Struktur item:

- checkbox per item
- judul percakapan
- metadata waktu ringkas
- ikon `trash` untuk hapus satu item

Aturan penting:

- row tidak menjadi entry navigasi utama
- klik row tidak diposisikan sebagai buka percakapan
- identitas panel tetap sebagai manajer, bukan navigator

## Aksi Destruktif

### Hapus Satu

- tersedia lewat ikon `trash` per item

### Hapus Pilihan

- ikon bulk delete selalu terlihat di toolbar
- saat belum ada selection, ikon tetap tampil tetapi disabled
- aksi hanya berlaku untuk halaman aktif

### Hapus Semua

- tetap ada sebagai aksi terpisah
- tidak disetarakan level visualnya dengan bulk delete biasa
- wajib konfirmasi keras
- dialog harus menampilkan jumlah total yang akan dihapus
- wajib friction tambahan, misalnya ketik `HAPUS`

## Data dan Sinkronisasi

### Sidebar Kiri

- sidebar tetap menampilkan maksimal 50 percakapan terbaru
- sidebar tetap menjadi quick navigation
- sidebar bukan sumber data untuk panel manager

### Header Riwayat

Header `Riwayat` harus transparan:

- `displayedCount` tetap berasal dari jumlah item yang dimuat di sidebar
- `totalCount` berasal dari query total terpisah
- format menampilkan `displayedCount dari totalCount`

### Workspace Panel Data

Panel `Kelola Percakapan` memakai query paginasi server-side khusus, berbeda dari query sidebar.

Mutation yang dipakai:

- hapus satu
- hapus pilihan
- hapus semua

Single source of truth tetap di Convex, sehingga:

- delete dari panel otomatis menyinkronkan sidebar
- create conversation dari chat otomatis menyinkronkan total panel
- jika percakapan aktif terhapus, redirect aman ke `/chat`
- panel tidak membuat sumber state daftar kedua di luar alur data chat yang sudah ada

## Constraint Visual

Panel wajib patuh ke konvensi token halaman chat di `src/app/globals-new.css`.

Wajib:

- memakai token `--chat-*`
- menjaga bahasa visual chat-native
- memakai ikon-led actions yang ringan dan presisi
- mempertahankan rasa panel artifact, bukan dashboard penuh

Dilarang:

- amber
- token visual `core`
- banner halaman penuh
- card summary dekoratif yang tidak membantu aksi utama

## Reusability

`Kelola Percakapan` adalah fase pertama, bukan tujuan akhir arsitektur panel kanan.

Fondasi panel harus reusable untuk:

- `paper-session-extended`
- `attachments-list`
- `knowledge-base`

Bagian yang harus reusable:

- mode orchestration panel kanan
- header shell panel
- close behavior
- restore previous panel state
- viewport slot kanan

Bagian yang tetap spesifik modul:

- body content
- data query
- aksi utama

Prinsipnya: fondasi generic secukupnya, UI fase awal tetap fokus satu modul.

## Testing yang Wajib

- membuka `Kelola Percakapan` dari header `Riwayat` memunculkan panel kanan
- tombol close `x` menutup panel
- `Esc` menutup panel
- artifact dipulihkan setelah manager ditutup bila sebelumnya aktif
- checkbox utama memilih seluruh item pada halaman aktif
- selection bisa dikurangi manual setelah `select all`
- state `checked`, `indeterminate`, dan `unchecked` pada checkbox utama bekerja benar
- ikon `hapus pilihan` selalu terlihat dan disabled saat belum ada selection
- `hapus satu`, `hapus pilihan`, dan `hapus semua` sinkron ke sidebar
- jika percakapan aktif terhapus, redirect aman ke `/chat`
- lebar panel tetap tunduk pada batas minimum area chat

## Scope Fase Ini

Masuk fase ini:

- trigger panel `Kelola Percakapan` dari header `Riwayat`
- panel kanan reusable dengan mode `conversation-manager`
- pola inbox ala Gmail untuk seleksi dan delete
- restore artifact setelah panel ditutup
- transparansi hitungan `displayedCount dari totalCount`

Tidak masuk fase ini:

- UI multi-menu `Workspace Manager`
- overview page
- route penuh sebagai entry utama
- `Paper`, `Lampiran`, `Knowledge Base` sebagai modul aktif
- cross-page selection
- fitur restore atau trash bin
