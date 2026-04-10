# Naskah Feature Context

## Purpose

Dokumen ini menyimpan konteks yang relatif stabil untuk fitur `naskah`.
Fungsinya adalah menjaga pemahaman dasar tentang masalah produk, istilah kerja, model mental, constraint, dan baseline teknis yang menjadi latar iterasi fitur ini.
Isi dokumen ini harus tetap selaras dengan codebase aktual, bukan dengan asumsi percakapan yang belum diverifikasi.

Keputusan yang bisa berubah seiring iterasi tidak disimpan di dokumen ini. Untuk itu, lihat `docs/naskah-feature/decisions.md`.

## Source

Konteks awal dokumen ini berasal dari percakapan di `docs/naskah-feature/chat.txt`, lalu diverifikasi terhadap codebase untuk memastikan istilah dan baseline teknisnya benar.

## Feature Summary

Fitur yang dibahas adalah `naskah`: workspace terpisah untuk membaca paper akademik utuh yang dikompilasi dari artifact yang sudah tervalidasi.
Pada fase awal, `naskah` diposisikan sebagai view read-only terpisah dari workspace artifact, bukan editor penuh dan bukan pengganti validation flow.

Secara umum, `naskah` dipahami sebagai:
- area untuk melihat paper utuh, bukan unit kerja modular
- lapisan presentasi hasil kompilasi, bukan pengganti artifact
- bagian dari ekosistem halaman chat, bukan fitur yang berdiri sendiri

## Problem Being Solved

Flow saat ini sudah memungkinkan user bekerja per stage melalui artifact, chat, dan validation panel. Tetapi user belum punya tempat untuk melihat keseluruhan paper sebagai satu naskah utuh selama proses berjalan.
Di sisi arsitektur, sistem juga belum memiliki compiled paper state yang eksplisit untuk pengalaman baca paper penuh yang terpisah dari artifact tunggal dan terpisah dari jalur export final.

Akibat gap ini:
- user melihat output secara modular, bukan sebagai paper penuh
- user sulit menilai bentuk akhir paper secara menyeluruh
- user belum bisa mengestimasi hasil akhir seperti panjang naskah atau jumlah halaman
- export final belum terhubung ke pengalaman melihat paper utuh selama proses

## Original Idea From Conversation

Ide awal yang diajukan dalam percakapan adalah membuat area yang semula disebut `dokumen utama`, dengan karakter seperti editor dokumen penuh untuk menampilkan paper utuh selama proses berjalan.
Elemen yang sempat muncul dalam ide awal itu antara lain:
- menambah fitur yang semula disebut `dokumen utama`
- tampil dan terasa seperti MS Word atau Google Docs
- berisi kumpulan konten dari artifact yang sudah tervalidasi atau final
- memungkinkan user melihat keseluruhan paper
- menampilkan format A4 dan spasi 1,5
- menunjukkan jumlah halaman
- memungkinkan edit manual
- memungkinkan download PDF atau DOCX

Seiring diskusi, konsep ini dikoreksi dan disederhanakan agar lebih sehat secara arsitektur. Hasil koreksinya dicatat di `decisions.md`.
Tidak semua elemen ide awal dibawa ke fase 1. Arah seperti edit manual langsung di area paper utuh dan pengalaman editor penuh diperlakukan sebagai arah lanjut, bukan baseline implementasi awal.

## Working Definitions

### Naskah

Workspace terpisah untuk melihat paper akademik utuh yang sudah dikompilasi dari artifact tervalidasi.
Pada fase awal, workspace ini read-only dan tidak menjadi tempat edit utama.

### Artifact

Unit kerja modular per stage atau section yang tetap menjadi sumber kebenaran isi dan tetap menjadi tempat edit.
Artifact dapat memiliki version chain; versi terbaru bisa menggantikan versi sebelumnya selama referensinya ikut diperbarui di session.

### Validation Panel

Area yang tetap fokus pada approve atau revisi per stage, bukan pada formatting akhir naskah.

### Chat Window

Area diskusi utama untuk percakapan, arahan, dan approval flow. Fitur `naskah` tidak menggantikan fungsi chat dan tidak mengambil alih authority workflow.

## Stable Product Model

Model mental produk yang relatif stabil setelah percakapan awal diverifikasi ke codebase:

### Artifact Workspace

Fungsi:
- kerja modular per bagian
- review per output stage
- edit konten
- menghasilkan versi artifact baru saat ada perubahan penting

### Naskah Workspace

Fungsi:
- melihat paper utuh yang tersusun dari section tervalidasi
- membaca hasil kompilasi lintas stage tanpa menampilkan placeholder untuk section yang belum tersedia
- mempertahankan urutan section sesuai struktur paper final
- menjadi lapisan presentasi paper penuh yang read-only pada fase awal
- diakses sebagai halaman tersendiri fullscreen dari halaman chat saat naskah sudah tersedia
- tidak memperbarui isi secara diam-diam saat ada perubahan baru; user perlu sinyal update yang jelas
- tumbuh bertahap mengikuti validasi section, bukan mengikuti urutan waktu validasi
- tetap bisa dibuka saat isinya belum lengkap, dengan status bahwa naskah masih bertumbuh
- dapat menampilkan daftar section yang sudah masuk sebagai informasi progres yang ringan
- daftar section yang sudah masuk juga berfungsi sebagai navigasi cepat di dalam halaman naskah
- preview naskah ditargetkan sebagai dokumen paged A4 dengan page break visual yang jelas, tetapi detail layout header, sidebar, dan copy status tetap hidup di `decisions.md`
- export dapat menjadi bagian dari pengalaman `Naskah`, tetapi readiness, status parsial, dan bentuk UI-nya bukan baseline konteks; itu keputusan implementasi

### Validation Flow

Validation flow tetap berorientasi pada approve atau revisi per stage. Naskah tidak mengubah peran dasar validation panel sebagai pengelola status artifact/stage.

### Chat Flow

Chat tetap menjadi area diskusi utama. Naskah tidak dimaksudkan untuk menggantikan fungsi chat sebagai pusat percakapan dan approval flow.
Navigasi ke `naskah` dipahami sebagai perpindahan ke halaman khusus melalui entry point di topbar halaman chat, tetapi entry point itu belum ada di codebase sekarang.
Saat user menavigasi ke `naskah`, perpindahan halaman tidak otomatis memuat update baru; indikator update ditangani dari dalam halaman naskah.
Relasi navigasi antara `Chat` dan `Naskah` dipahami sebagai perpindahan antar halaman saudara melalui tombol kontekstual di topbar.

## Source Of Truth Baseline

Baseline pemahaman dari percakapan dan audit codebase:
- artifact per stage adalah unit isi yang paling dekat dengan kebenaran kerja
- `stageData` adalah layer koordinasi session yang menyimpan referensi artifact, `validatedAt`, dan metadata lain untuk workflow stage
- paper utuh dibentuk dari hasil kompilasi lintas artifact yang relevan
- ketersediaan awal `naskah` bergantung pada validasi artifact yang cukup untuk mulai menyusun paper utuh
- isi `naskah` yang terlihat pada suatu waktu bergantung pada section mana yang sudah tervalidasi saat itu
- jika section yang sudah masuk direvisi dan tervalidasi ulang, isi `naskah` mengikuti versi tervalidasi terbaru
- setiap section masuk ke `naskah` hanya setelah section tersebut tervalidasi
- stage internal yang tervalidasi tidak otomatis selalu menjadi section tersendiri di `naskah`; kemunculannya ditentukan oleh mapping ke struktur akademik
- `abstrak` dapat tampil lebih awal dari stage `abstrak`, lalu diperbarui ketika `pembaruan_abstrak` tervalidasi
- judul dokumen dapat memakai `working title` dari stage `topik`, lalu diperbarui ketika `judul` tervalidasi
- detail layout seperti halaman judul, aturan page break, dan perlakuan visual section final adalah keputusan aktif di `decisions.md`, bukan baseline konteks
- pada codebase sekarang, compiler/export yang ada masih membaca `stageData`; itu baseline implementasi saat ini, bukan baseline ideal `Naskah`
- untuk `Naskah`, layer source of truth perlu dipahami sebagai artifact tervalidasi yang direferensikan oleh `stageData`, bukan edit manual di area paper utuh
- update pada artifact yang sudah masuk ke `Naskah` harus memicu sinyal bahwa tampilan yang sedang dibuka berpotensi outdated sampai pengguna memuat ulang

Detail keputusan operasional tentang source of truth aktif dicatat di `decisions.md`.

## Rendering Baseline

Percakapan menegaskan bahwa kebutuhan teknis fitur ini bukan markdown renderer biasa.

Yang dibutuhkan adalah preview naskah akademik yang:
- paginated dalam format A4
- memiliki style rules akademik
- memetakan heading, paragraf, tabel, kutipan, daftar pustaka, dan spacing ke layout paper

Dengan kata lain, kebutuhan teknis utamanya adalah:
- compiled academic document preview

Bukan:
- render markdown apa adanya

Untuk mewujudkannya, lapisan teknisnya perlu dibedakan:
- compiler dokumen menyusun content terstruktur dari hasil stage yang tervalidasi
- export renderer mengubah compiled content menjadi PDF atau DOCX
- web preview renderer, jika nanti ada, harus memakai layout semantics yang sama tanpa diasumsikan identik dengan hasil export

Mapping section, working title, dan struktur navigasi final untuk `Naskah` adalah keputusan operasional aktif. Karena itu, detail mapping hidup di `decisions.md`, bukan di dokumen konteks ini.

## Technical Baseline

Fondasi teknis yang benar-benar sudah ada di codebase:
- editor library melalui TipTap
- server-side export DOCX
- server-side export PDF A4
- approval flow stage dengan `validatedAt`
- session `stageData` yang menyimpan referensi artifact dan metadata stage

Aplikasi codebase yang ada tetapi belum cocok untuk `Naskah` fase awal:
- export saat ini valid hanya untuk session `completed`
- compiler paper yang ada masih membaca `stageData`
- artifact viewer yang ada belum dirancang sebagai full paper viewer

Sudah ada di codebase untuk fase 1:
- route dan topbar `Naskah` sebagai halaman saudara dari `Chat`
- compiled naskah state yang terpisah dari export state
- web paginated preview untuk paper utuh
- compiled snapshot, viewed revision, dan manual refresh `Naskah`

## Constraints

Constraint yang terlihat dari percakapan:

### Arsitektur Saat Ini Masih Stage-Based

Workflow validasi saat ini masih berbasis stage, dengan relasi artifact per stage. Jadi sistem sekarang belum native untuk satu naskah komposit lintas stage.
Karena itu, `Naskah` tidak boleh diasumsikan sudah punya compiled state tersendiri di backend.

### Artifact Viewer Belum Dirancang Sebagai Full Paper Viewer

Komponen artifact yang ada masih fokus pada artifact tunggal, bukan paper gabungan penuh.

### Export Masih Completed-Only

Jalur export yang ada masih mengharuskan session `completed` dan memblokir konten yang belum lengkap.

### Struktur Artifact Bisa Tidak Cukup Rapi Untuk Kompilasi

Artifact yang sudah tervalidasi belum tentu otomatis cukup rapi untuk dimasukkan ke `Naskah`. Karena itu, `Naskah` membutuhkan guardrail kompilasi tersendiri agar hasil paper tetap terasa utuh dan bersih.

### Preview Web Tidak Otomatis Identik Dengan Export Final

Pagination di web harus diperlakukan sebagai estimasi yang sangat dekat, bukan jaminan 100% identik dengan Word/PDF final.
Target produk fase awal adalah membuat preview web sedekat mungkin dengan hasil export final, tanpa menjanjikan identitas absolut.

### State Update Naskah Sudah Eksplisit

Codebase sekarang sudah memiliki state eksplisit untuk availability `Naskah`, `update pending`, dan compiled snapshot/revision yang dibandingkan dengan revision yang terakhir dimuat user.

## Risks Baseline

Risiko dasar yang sudah tampak dari percakapan:

### Struktur Artifact Mungkin Tidak Selalu Siap Untuk Kompilasi Bersih

Artifact yang ada belum tentu selalu memiliki struktur yang rapi untuk dipetakan otomatis ke bentuk paper utuh.

### Source Of Truth Bisa Tersamar

Kalau compiler `Naskah` masih dianggap sama dengan compiler export sekarang, user bisa mengira `stageData` adalah isi final padahal sebenarnya itu hanya layer koordinasi.

### Update Signal Bisa Palsu

Kalau belum ada compiled snapshot atau revision state, badge update dan manual refresh akan sulit dibedakan dari perubahan biasa pada session.

### Export Parsial Bisa Menyesatkan

Kalau UI menampilkan export parsial tanpa backend yang memang mendukungnya, user akan mendapat affordance yang tidak bisa dipenuhi oleh sistem.

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
- gap yang sebelumnya dianggap target ternyata sudah atau belum ada di codebase

Jangan pakai `context.md` untuk menyimpan keputusan sementara atau open question yang masih aktif. Simpan itu di `decisions.md`.
