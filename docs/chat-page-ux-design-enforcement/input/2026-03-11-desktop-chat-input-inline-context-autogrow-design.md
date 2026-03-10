# Desktop Chat Input Inline Context Autogrow Design

## Ringkasan

- Scope: merombak composer desktop chat agar mengikuti mental model composer mobile yang sudah dianggap benar.
- Goal: menghemat ruang vertikal di area chat desktop tanpa mengurangi fungsi konteks, upload file, clear context, submit, dan stop generating.
- Constraint utama: mobile tidak diubah, desktop harus terasa seperti versi lebih lebar dari pola mobile, tetap patuh ke token chat di `src/app/globals-new.css`.

## Latar Belakang

Composer desktop saat ini masih memakai struktur lama:

- textarea minimum tiga baris
- tray konteks tampil sebagai blok besar di dalam card
- tinggi composer cepat membesar meskipun input masih kosong

Sementara itu, versi mobile sudah lebih dekat ke perilaku yang diinginkan:

- kosong terlihat satu baris
- lebih hemat ruang
- interaksi terasa lebih ringan

Kebutuhan yang sudah divalidasi:

- perubahan hanya untuk desktop
- desktop harus meniru perilaku mobile, tetapi dengan lebar lebih panjang
- empty state desktop harus satu baris
- saat mulai mengetik, textarea tumbuh otomatis hingga maksimum lima baris
- input chat maksimum `8000` karakter
- tombol konteks harus hadir inline di baris atas dengan separator
- area konteks tidak boleh kembali menjadi tray besar
- ketika item konteks banyak, daftar konteks harus scroll horizontal dengan scrollbar tipis
- saat textarea mencapai lima baris dan perlu scroll internal, scrollbar vertical juga harus tipis
- desktop tidak perlu tombol expand atau fullscreen

## Keputusan Produk

### Arah yang Dipilih

Desktop composer diharmonisasi ke mental model mobile, bukan dipoles setengah-setengah dari layout desktop lama.

Maknanya:

- mobile tetap seperti sekarang
- desktop memakai struktur dua baris ringan
- composer kosong terasa ringkas
- konteks tampil sebagai strip inline
- textarea desktop hanya tumbuh saat benar-benar dipakai

### Arah yang Ditolak

- mempertahankan grid composer desktop lama lalu hanya menurunkan tinggi default
  Alasan: hasilnya tetap membawa tray konteks besar dan struktur visual lama.
- menambahkan tombol expand/fullscreen ke desktop
  Alasan: tidak dibutuhkan dan hanya menambah chrome.
- membiarkan konteks wrap ke banyak baris
  Alasan: bertentangan dengan tujuan hemat ruang vertikal.

## Prinsip UX

### Desktop Meniru Mobile

Desktop harus terasa sebagai versi lebih lebar dari composer mobile, bukan komponen berbeda yang kebetulan mirip.

### Hemat Tinggi, Bukan Hemat Fungsi

Fitur konteks tetap lengkap, tetapi affordance-nya dipadatkan secara visual.

### Fokus pada Input

Saat kosong, perhatian utama tetap pada ajakan mengetik. Saat aktif, composer berkembang secukupnya untuk mendukung penulisan.

### Scroll yang Halus

Scrollbar konteks dan textarea tidak boleh dominan. Keduanya harus tipis, halus, dan mengikuti token chat.

## Struktur UI Desktop

### Kontainer Utama

Composer desktop tetap berada dalam satu kontainer card chat-native.

### Baris 1: Konteks Inline

Baris atas berfungsi sebagai strip kontrol konteks.

Isi:

- tombol `+ Konteks`
- daftar konteks aktif secara inline
- aksi `hapus semua` yang ringan

Aturan:

- tidak boleh menjadi tray chip besar
- tidak boleh wrap ke banyak baris
- daftar konteks harus berada dalam strip horizontal scroll

### Separator

Di bawah strip konteks ada separator tipis statis.

Aturan:

- separator bukan scrollbar track
- separator tetap menjadi pemisah visual antarbaris

### Baris 2: Input dan Aksi Utama

Baris bawah berisi:

- textarea utama
- tombol kirim atau stop generating

Aturan:

- tombol tetap inline dalam composer
- tidak membuat baris aksi tambahan di bawah textarea

## Perilaku Textarea Desktop

### Empty State

- textarea tampil setara satu baris
- placeholder tetap jelas
- composer terlihat ringan

### Active State

- saat user mengetik, textarea tumbuh otomatis
- maksimum tinggi setara lima baris
- setelah melewati lima baris, textarea memakai scroll vertical internal

### Batas Karakter

- input chat maksimum `8000` karakter
- fase ini berfokus pada penerapan kontrak itu di layout desktop baru
- perilaku terbaik adalah mencegah input melampaui batas
- counter karakter permanen tidak diperlukan pada fase ini

## Perilaku Konteks Inline

### Strip Konteks

- strip konteks selalu hadir di desktop
- saat belum ada konteks aktif, tampil sederhana sebagai affordance
- saat ada konteks aktif, item muncul secara inline dalam strip yang sama

### Item Konteks

Setiap item tetap ringkas:

- ikon file atau gambar
- nama singkat
- ukuran kecil
- tombol remove item

### Overflow

- item konteks di-scroll horizontal
- scrollbar harus tipis dan low-contrast
- tinggi strip konteks tidak ikut membesar karena jumlah item

## Aksi dan Interaksi

### Upload Konteks

Tombol `+ Konteks` tetap berfungsi sebagai entry upload tambahan konteks.

### Hapus Item

Setiap item konteks tetap punya affordance remove per item.

### Hapus Semua Konteks

Aksi clear all tetap ada, tetapi tampil ringan dan tidak mendominasi baris konteks.

### Submit dan Stop

Perilaku submit dan stop generating harus tetap sama seperti sekarang, hanya tata letaknya yang diringkas.

## Constraint Visual

Composer wajib patuh ke sistem token chat di `src/app/globals-new.css`.

Wajib:

- memakai token `--chat-*`
- mempertahankan card dan border bahasa visual chat
- scrollbar konteks dan textarea dibuat tipis dan serasi
- placeholder, separator, dan aksi kecil mengikuti muted/foreground hierarchy chat

Dilarang:

- amber
- tray konteks besar gaya lama
- tombol fullscreen desktop
- row aksi tambahan yang memperbesar tinggi composer tanpa alasan

## Reuse Strategy

Komponen yang diubah tetap `ChatInput.tsx`.

Prinsip implementasi:

- jangan bikin composer desktop baru dari nol
- panen mental model mobile yang sudah benar
- pisahkan hanya logika yang memang perlu dibedakan antara desktop dan mobile

Yang harus dipertahankan:

- upload file
- remove file konteks
- clear all konteks
- stop generating
- submit behavior

## Testing yang Wajib

- desktop empty state tampil satu baris
- desktop textarea tumbuh saat mengetik
- desktop textarea berhenti tumbuh setelah lima baris
- chat input menolak input di atas `8000` karakter
- strip konteks tetap satu baris dan scroll horizontal
- scrollbar konteks tipis
- scrollbar textarea tipis saat overflow
- tombol `+ Konteks`, remove item, dan clear all tetap berfungsi
- send dan stop behavior tidak regress
- mobile behavior tetap tidak berubah

## Scope Fase Ini

Masuk fase ini:

- redesign desktop composer agar mengikuti pola mobile
- strip konteks inline + separator
- textarea desktop 1 line → auto-grow max 5 lines
- limit `8000` karakter
- scrollbar tipis pada strip konteks dan textarea

Tidak masuk fase ini:

- redesign mobile
- tombol fullscreen desktop
- character counter permanen
- perubahan backend atau API submit
