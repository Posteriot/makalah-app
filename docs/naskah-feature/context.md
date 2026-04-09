# Naskah Feature Context

## Purpose

Dokumen ini menyimpan konteks yang relatif stabil untuk fitur `naskah`.
Fungsinya adalah menjaga pemahaman dasar tentang masalah produk, istilah kerja, model mental, constraint, dan baseline teknis yang menjadi latar iterasi fitur ini.

Keputusan yang bisa berubah seiring iterasi tidak disimpan di dokumen ini. Untuk itu, lihat `docs/naskah-feature/decisions.md`.

## Source

Konteks awal dokumen ini berasal dari percakapan di `docs/naskah-feature/chat.txt`.

## Feature Summary

Fitur yang dibahas adalah `naskah`: workspace terpisah dari artifact biasa untuk menampilkan paper utuh hasil kompilasi dari artifact yang sudah final atau tervalidasi.

Secara umum, `naskah` dipahami sebagai:
- area untuk melihat paper utuh, bukan unit kerja modular
- lapisan presentasi hasil kompilasi, bukan pengganti artifact
- bagian dari ekosistem halaman chat, bukan fitur yang berdiri sendiri

## Problem Being Solved

Flow saat ini sudah memungkinkan user bekerja per stage melalui artifact, chat, dan validation panel. Tetapi user belum punya tempat untuk melihat keseluruhan paper sebagai satu naskah utuh selama proses berjalan.

Akibat gap ini:
- user melihat output secara modular, bukan sebagai paper penuh
- user sulit menilai bentuk akhir paper secara menyeluruh
- user belum bisa mengestimasi hasil akhir seperti panjang naskah atau jumlah halaman
- export final belum terhubung ke pengalaman melihat paper utuh selama proses

## Original Idea From Conversation

Ide awal yang diajukan dalam percakapan adalah:
- menambah fitur yang semula disebut `dokumen utama`
- tampil dan terasa seperti MS Word atau Google Docs
- berisi kumpulan konten dari artifact yang sudah tervalidasi atau final
- memungkinkan user melihat keseluruhan paper
- menampilkan format A4 dan spasi 1,5
- menunjukkan jumlah halaman
- memungkinkan edit manual
- memungkinkan download PDF atau DOCX

Seiring diskusi, konsep ini dikoreksi dan disederhanakan agar lebih sehat secara arsitektur. Hasil koreksinya dicatat di `decisions.md`.

## Working Definitions

### Naskah

Workspace terpisah untuk melihat paper akademik utuh yang sudah dikompilasi dari artifact final/validated.

### Artifact

Unit kerja modular per stage atau section yang tetap menjadi sumber kebenaran isi dan tetap menjadi tempat edit.

### Validation Panel

Area yang tetap fokus pada approve atau revisi per stage, bukan pada formatting akhir naskah.

### Chat Window

Area diskusi utama untuk percakapan, arahan, dan approval flow. Fitur `naskah` tidak menggantikan fungsi chat.

## Stable Product Model

Model mental produk yang relatif stabil dari percakapan:

### Artifact Workspace

Fungsi:
- kerja modular per bagian
- review per output stage
- edit konten

### Naskah Workspace

Fungsi:
- melihat paper utuh
- membaca hasil kompilasi lintas stage
- melihat layout akademik
- melihat pagination atau estimasi halaman
- menjadi lapisan presentasi paper penuh
- diakses sebagai halaman tersendiri fullscreen dari halaman chat saat naskah sudah tersedia
- tidak memperbarui isi secara diam-diam saat ada perubahan baru; user diberi sinyal bahwa ada update yang bisa dimuat
- tumbuh secara bertahap berdasarkan section yang sudah tervalidasi, tanpa placeholder untuk section yang belum tersedia
- urutan section tetap mengikuti struktur paper final, bukan urutan waktu validasi
- sejak awal tetap dapat dibuka sebagai halaman normal, dengan keterangan bahwa naskah masih bertumbuh jika belum lengkap
- dapat menampilkan daftar section yang sudah masuk ke naskah sebagai informasi progres yang ringan
- daftar section yang sudah masuk juga berfungsi sebagai navigasi cepat di dalam halaman naskah
- export dapat tersedia sejak naskah pertama kali ada, dengan penanda bahwa hasil masih parsial bila belum lengkap
- status pertumbuhan naskah dikomunikasikan dengan gabungan status singkat dan penjelasan halus
- daftar section dan navigasi cepat dipahami berada di sidebar kiri halaman naskah
- area utama halaman naskah dipahami fokus pada satu kolom preview paper di tengah
- preview naskah dipahami sebagai dokumen paged dengan page break visual yang jelas antar halaman A4
- header halaman naskah dipahami memuat judul, status bertumbuh/parsial, indikator update, dan aksi export
- identitas header naskah memadukan label fitur `Naskah` dengan judul paper aktif
- status kelengkapan naskah dan status parsial export dipahami sebagai satu status utama yang sama
- status utama di header naskah dipahami tampil sebagai gabungan badge kecil dan info text pendek
- nada info text status naskah lebih menekankan progres pertumbuhan, sambil tetap jujur bahwa dokumen belum lengkap
- badge status utama di header naskah dipahami memakai copy `Bertumbuh`
- info text pendek di header naskah dipahami memakai copy `Naskah sedang bertumbuh seiring section tervalidasi.`
- jumlah halaman naskah dipahami tampil di header sebagai informasi level dokumen
- jumlah halaman di header dipahami dikomunikasikan eksplisit sebagai estimasi
- aksi export di header dipahami sebagai satu tombol `Export` dengan pilihan format di dropdown
- opsi format di dropdown export dipahami tetap simpel, sementara status parsial cukup dikomunikasikan di header
- susunan header naskah dipahami dua baris: baris pertama untuk identitas `Naskah` dan judul paper, baris kedua untuk badge, info text, dan estimasi halaman, dengan area aksi di sisi kanan
- pada baris pertama header, `Naskah` dipahami tampil sebagai label kecil di atas judul paper
- perpindahan `Chat` dan `Naskah` memakai tombol kontekstual lawan-halaman, bukan dua tab yang tampil bersamaan
- notifikasi update pada tombol `Naskah` di halaman `Chat` dipahami sebagai titik kecil yang ringan
- penamaan section di sidebar naskah mengikuti nama akademik final, bukan nama stage internal sistem
- klik item section di sidebar dipahami melompat ke awal section tersebut
- sidebar naskah dapat menyorot section yang sedang aktif di viewport saat user scroll
- setelah user memuat update, section yang berubah dapat diberi highlight sementara sebagai umpan balik visual
- indikator update utama di halaman naskah dipahami sebagai banner tipis di area header dengan aksi `Update`

### Validation Flow

Validation flow tetap berorientasi pada approve atau revisi per stage. Naskah tidak mengubah peran dasar validation panel sebagai pengelola status artifact/stage.

### Chat Flow

Chat tetap menjadi area diskusi utama. Naskah tidak dimaksudkan untuk menggantikan fungsi chat sebagai pusat percakapan dan approval flow.
Navigasi ke `naskah` dipahami sebagai perpindahan ke halaman khusus melalui entry point di topbar halaman chat.
Entry point `Naskah` di topbar juga dapat menjadi tempat sinyal status update untuk naskah yang perlu dimuat ulang oleh user.
Saat user menavigasi ke `naskah`, perpindahan halaman tidak otomatis memuat update baru; indikator update ditangani dari dalam halaman naskah.
Relasi navigasi antara `Chat` dan `Naskah` dipahami sebagai perpindahan antar halaman saudara melalui tombol kontekstual di topbar.

## Source Of Truth Baseline

Baseline pemahaman dari percakapan:
- artifact per stage adalah unit isi yang paling dekat dengan kebenaran kerja
- paper utuh dibentuk dari hasil kompilasi lintas artifact yang relevan
- ketersediaan awal `naskah` bergantung pada validasi artifact yang cukup untuk mulai menyusun paper utuh
- isi `naskah` yang terlihat pada suatu waktu bergantung pada section mana yang sudah tervalidasi saat itu
- jika section yang sudah masuk direvisi dan tervalidasi ulang, isi `naskah` mengikuti versi tervalidasi terbaru
- setiap section masuk ke `naskah` hanya setelah section tersebut tervalidasi
- stage internal yang tervalidasi tidak otomatis selalu menjadi section tersendiri di `naskah`; kemunculannya ditentukan oleh mapping ke struktur akademik
- `abstrak` dapat tampil lebih awal dari stage `abstrak`, lalu diperbarui ketika `pembaruan_abstrak` tervalidasi
- judul dokumen dapat memakai `working title` dari stage `topik`, lalu diperbarui ketika `judul` tervalidasi
- saat `naskah` pertama kali muncul setelah `abstrak` tervalidasi, halaman pertama memuat judul kerja dari `topik`, dan section `Abstrak` mulai di halaman kedua
- pada fase awal, halaman pertama naskah hanya berisi judul dokumen tanpa metadata tambahan atau teaser abstrak
- saat `judul` final tervalidasi, working title di halaman pertama diganti penuh oleh judul final
- judul di halaman pertama dipahami tampil besar dan center, seperti cover sederhana
- halaman kedua dipahami langsung memulai section `Abstrak` dengan heading yang jelas di atas isi
- section besar berikutnya setelah `Abstrak`, seperti `Pendahuluan`, dipahami wajib mulai di halaman baru
- aturan halaman baru dipahami berlaku untuk semua section utama naskah
- `Daftar Pustaka` dipahami tampil sebagai section biasa di sidebar dan di dokumen
- `Lampiran` dipahami tampil sebagai section biasa jika ada isi yang tervalidasi

Detail keputusan operasional tentang source of truth aktif dicatat di `decisions.md`.

## Rendering Baseline

Percakapan menegaskan bahwa kebutuhan teknis fitur ini bukan markdown renderer biasa.

Yang dibutuhkan adalah preview naskah akademik yang:
- paginated dalam format A4
- memiliki style rules akademik
- memetakan heading, paragraf, tabel, kutipan, daftar pustaka, dan spacing ke layout paper

Dengan kata lain, bentuk teknis yang dibayangkan adalah:
- compiled academic document preview

Bukan:
- render markdown apa adanya

Mapping awal yang kini paling masuk akal untuk `naskah`:
- `gagasan`, `topik`, dan `outline` tidak muncul sebagai section atau item sidebar di `naskah`
- `topik` dapat menyumbang `working title` untuk header dokumen
- label item pertama dalam struktur navigasi `Naskah` adalah `Halaman Judul`
- item `Halaman Judul` mengikuti pola highlight aktif yang sama seperti section lain
- `abstrak` adalah section final tunggal yang mula-mula bersumber dari stage `abstrak`
- `pembaruan_abstrak` tidak menjadi section baru, tetapi memperbarui section `abstrak`
- `judul` tidak menjadi section isi, tetapi memperbarui judul dokumen menjadi versi terpilih/final

## Technical Baseline Mentioned In Conversation

Fondasi teknis yang disebut sudah ada:
- editor library melalui TipTap
- server-side export DOCX
- server-side export PDF A4
- compiler paper dari `stageData`

Gap teknis yang disebut:
- export saat ini valid untuk session completed, belum cocok untuk paper sementara saat proses berjalan
- tombol DOCX/PDF di artifact viewer belum benar-benar export final
- compiler saat ini mengambil dari `stageData`, bukan dari hasil edit manual di area paper utuh

## Constraints

Constraint yang terlihat dari percakapan:

### Arsitektur Saat Ini Masih Stage-Based

Workflow validasi saat ini masih berbasis stage, dengan relasi artifact per stage. Jadi sistem sekarang belum native untuk satu naskah komposit lintas stage.

### Artifact Viewer Belum Dirancang Sebagai Full Paper Viewer

Komponen artifact yang ada masih fokus pada artifact tunggal, bukan paper gabungan penuh.

### Struktur Artifact Bisa Tidak Cukup Rapi Untuk Kompilasi

Artifact yang sudah tervalidasi belum tentu otomatis cukup rapi untuk dimasukkan ke `Naskah`. Karena itu, `Naskah` membutuhkan guardrail kompilasi tersendiri agar hasil paper tetap terasa utuh dan bersih.

### Preview Web Tidak Otomatis Identik Dengan Export Final

Pagination di web harus diperlakukan sebagai estimasi yang sangat dekat, bukan jaminan 100% identik dengan Word/PDF final.
Target produk fase awal adalah membuat preview web sedekat mungkin dengan hasil export final, tanpa menjanjikan identitas absolut.

## Risks Baseline

Risiko dasar yang sudah tampak dari percakapan:

### Struktur Artifact Mungkin Tidak Selalu Siap Untuk Kompilasi Bersih

Artifact yang ada belum tentu selalu memiliki struktur yang rapi untuk dipetakan otomatis ke bentuk paper utuh.

### Akurasi Page Count Bisa Menjadi Ekspektasi Yang Salah

Jika UI menampilkan jumlah halaman, user bisa menganggapnya final. Padahal preview web mungkin hanya mendekati hasil export.

### Full Word-Like Editing Akan Menambah Beban Frontend

Jika nanti iterasi bergerak ke arah editor penuh, effort frontend akan meningkat signifikan.

## Maintenance Rule

Perbarui `context.md` jika ada perubahan pada:
- istilah kerja inti
- model mental produk
- constraint arsitektural utama
- baseline teknis yang menjadi pijakan lintas iterasi

Jangan pakai `context.md` untuk menyimpan keputusan sementara atau open question yang masih aktif. Simpan itu di `decisions.md`.
