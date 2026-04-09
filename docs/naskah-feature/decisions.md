# Naskah Feature Decisions

## Purpose

Dokumen ini menyimpan keputusan kerja yang bisa berubah seiring iterasi fitur `naskah`.
Isinya mencakup keputusan aktif, arah yang ditolak atau ditunda, pertanyaan terbuka, dan log perubahan keputusan.

Untuk konteks yang lebih stabil, lihat `docs/naskah-feature/context.md`.

## Current Active Direction

Status saat ini berdasarkan percakapan:
- fitur dipahami sebagai `naskah`
- `naskah` adalah compiled paper workspace
- `naskah` mengambil isi dari artifact final/validated
- `artifact` tetap menjadi source of truth
- edit tetap dilakukan di artifact pada fase awal
- `naskah` read-only pada fase awal
- `naskah` hadir sebagai halaman fullscreen terpisah dari workspace chat/artifact

## Active Decisions

### D-001: Artifact Tetap Menjadi Source Of Truth

Status: active

Keputusan:
- isi utama tetap berakar pada artifact
- `naskah` tidak menjadi authority baru untuk authoring pada fase awal

Alasan:
- lebih konsisten dengan struktur sistem sekarang
- lebih aman untuk menjaga compliance
- menghindari konflik sinkronisasi yang tidak perlu di fase awal

### D-002: Edit Tetap Terjadi Di Artifact Pada Fase Awal

Status: active

Keputusan:
- user tetap mengedit konten di artifact
- `naskah` tidak menjadi tempat edit utama di fase awal

Alasan:
- menjaga source of truth tetap jelas
- menahan kompleksitas sinkronisasi
- cocok dengan flow stage-based yang sudah ada

### D-003: Naskah Bersifat Read-Only Pada Fase Awal

Status: active

Keputusan:
- `naskah` hanya dipakai untuk melihat hasil paper utuh
- edit manual di `naskah` tidak dibuka pada fase awal

Alasan:
- menghindari divergensi dari artifact
- menurunkan risiko compliance mismatch
- memudahkan penyusunan sinkronisasi satu arah

### D-004: Arah Sinkronisasi Adalah Artifact Ke Naskah

Status: active

Keputusan:
- perubahan pada artifact yang relevan harus tercermin ke `naskah`

Tidak dipilih:
- `naskah -> artifact`
- bi-directional sync

Alasan:
- lebih sederhana
- lebih masuk akal dibanding apply-back
- lebih bersih secara arsitektur

### D-005: Naskah Harus Menjadi Halaman Terpisah Fullscreen

Status: active

Keputusan:
- `naskah` tidak diletakkan sebagai tab biasa di artifact panel
- `naskah` tidak menjadi panel berdampingan di halaman chat
- `naskah` diposisikan sebagai halaman tersendiri fullscreen
- akses ke `naskah` dilakukan lewat tombol `Naskah` di topbar halaman chat

Alasan:
- memberi ruang maksimal untuk preview A4 dan pagination
- memisahkan mental model workspace produksi dan workspace pembacaan naskah utuh
- lebih bersih daripada memaksa artifact workspace menjadi full paper viewer

### D-006: Naskah Bukan Markdown Preview Biasa

Status: active

Keputusan:
- `naskah` harus tampil sebagai preview naskah akademik
- renderer harus mendukung layout paper, bukan sekadar markdown rendering generik

Alasan:
- kebutuhan user adalah preview paper utuh dalam format akademik
- markdown renderer biasa tidak cukup untuk memenuhi kebutuhan tersebut

### D-007: Naskah Harus Mendukung Estimasi Halaman Dan Export

Status: active

Keputusan:
- `naskah` harus menampilkan pagination atau estimasi jumlah halaman
- `naskah` harus menjadi basis export PDF/DOCX

Alasan:
- ini inti value produk yang dibahas user sejak awal
- membantu user melihat bentuk akhir paper secara lebih nyata

### D-008: Tombol Naskah Muncul Setelah Abstrak Tervalidasi

Status: active

Keputusan:
- tombol `Naskah` di topbar halaman chat hanya muncul ketika `naskah` sudah tergenerate
- `naskah` mulai dianggap tergenerate ketika stage `abstrak` sudah tervalidasi

Alasan:
- ada ambang yang jelas kapan paper utuh sudah cukup layak untuk mulai dilihat
- kemunculan entry point tidak terlalu dini
- selaras dengan logika bahwa `naskah` bergantung pada artifact yang sudah tervalidasi

### D-009: Update Naskah Bersifat Manual Dengan Indikator

Status: active

Keputusan:
- halaman `naskah` tidak auto-refresh langsung saat ada artifact relevan yang berubah atau tervalidasi
- sistem menampilkan indikator `update` di halaman `naskah`
- tombol `Naskah` di topbar halaman chat juga menampilkan notifikasi visual saat ada update naskah yang belum dimuat
- user harus melakukan aksi klik untuk memuat versi terbaru naskah

Alasan:
- mencegah isi naskah berubah diam-diam saat user sedang membaca
- menjaga kontrol tetap di tangan user
- memberi pola status yang konsisten dengan affordance notifikasi kecil di UI topbar

### D-010: Naskah Hanya Menampilkan Section Yang Sudah Tervalidasi

Status: active

Keputusan:
- saat `naskah` pertama kali tersedia setelah `abstrak` tervalidasi, yang tampil hanya section `abstrak`
- section lain yang belum tervalidasi tidak ditampilkan
- tidak ada placeholder atau kerangka kosong untuk section yang belum tersedia
- seiring makin banyak section tervalidasi, isi dan halaman `naskah` bertambah secara bertahap

Alasan:
- lebih jujur terhadap progres nyata dokumen
- lebih sesuai dengan ekspektasi bahwa abstrak awalnya bisa berdiri sebagai satu halaman sendiri
- menghindari kesan paper “palsu lengkap” padahal sebagian besar section belum tervalidasi

### D-011: Urutan Naskah Mengikuti Struktur Paper Final

Status: active

Keputusan:
- urutan section di `naskah` tetap mengikuti urutan paper akademik final
- hanya section yang sudah tervalidasi yang ditampilkan
- section yang belum tervalidasi tidak ditampilkan dan tidak membuat placeholder posisi kosong

Alasan:
- menjaga konsistensi mental model paper utuh
- hasil bertahap tetap bergerak menuju struktur final yang sama
- menghindari urutan yang kacau karena mengikuti waktu validasi

### D-012: Naskah Tetap Dibuka Normal Saat Masih Bertumbuh

Status: active

Keputusan:
- saat `naskah` baru tersedia dan isinya belum lengkap, halaman `Naskah` tetap dibuka seperti halaman normal
- halaman menampilkan keterangan bahwa `naskah` masih bertumbuh atau belum lengkap
- tidak ada intro screen atau state transisi terpisah sebelum masuk ke halaman utama naskah

Alasan:
- user langsung melihat hasil nyata, meskipun masih awal
- pengalaman tetap sederhana
- status perkembangan naskah tetap dikomunikasikan secara jujur

### D-013: Naskah Menampilkan Daftar Section Yang Sudah Masuk

Status: active

Keputusan:
- halaman `Naskah` menampilkan daftar section yang sudah masuk ke naskah
- halaman tidak perlu menampilkan daftar section yang belum masuk
- daftar ini berfungsi sebagai informasi progres yang ringan, bukan dashboard status penuh

Alasan:
- membantu user memahami isi naskah saat ini
- cukup informatif tanpa menambah kompleksitas berlebih
- menghindari penekanan berlebihan pada kekosongan section yang belum tersedia

### D-014: Daftar Section Berfungsi Sebagai Navigasi Cepat

Status: active

Keputusan:
- daftar section yang sudah masuk ke `naskah` juga dipakai sebagai navigasi cepat
- user dapat memakai daftar tersebut untuk melompat ke section yang relevan di dalam halaman `Naskah`

Alasan:
- makin berguna saat naskah bertambah panjang
- menyatukan fungsi orientasi isi dan navigasi dalam satu elemen UI
- tetap ringan tanpa harus menambah komponen navigasi terpisah

### D-015: Export Tersedia Sejak Naskah Ada, Dengan Label Parsial

Status: active

Keputusan:
- export PDF/DOCX tersedia sejak `naskah` pertama kali tersedia
- jika `naskah` belum lengkap, UI harus memberi label atau penanda bahwa hasil export masih parsial

Alasan:
- user tetap bisa memanfaatkan hasil awal
- konsisten dengan model naskah yang bertumbuh secara bertahap
- tetap jujur terhadap status kelengkapan dokumen

### D-016: Revisi Section Menggantikan Versi Naskah Sebelumnya

Status: active

Keputusan:
- jika section yang sudah masuk ke `naskah` direvisi lalu tervalidasi ulang, versi section di `naskah` digantikan penuh oleh versi tervalidasi terbaru
- `naskah` tidak menyimpan riwayat versi section sebagai bagian dari pengalaman fase awal
- pergantian ini mengikuti mekanisme refresh manual yang sudah dipilih

Alasan:
- konsisten dengan artifact sebagai source of truth
- lebih sederhana daripada menambah versioning atau merge flow di level naskah
- cocok untuk fase awal yang fokus pada preview terkompilasi

### D-017: Status Naskah Bertumbuh Menggunakan Pola Gabungan

Status: active

Keputusan:
- komunikasi status bahwa `naskah` belum lengkap menggunakan pola gabungan
- UI menampilkan status singkat yang jelas
- UI juga menampilkan penjelasan halus yang memberi konteks bahwa naskah akan terus bertambah seiring validasi section baru

Alasan:
- lebih jelas daripada pesan yang terlalu halus
- tetap terasa ramah dan tidak terlalu keras
- cocok untuk pengalaman naskah yang memang bertumbuh bertahap

### D-018: Navigasi Ke Naskah Tidak Otomatis Memuat Update Pending

Status: active

Keputusan:
- jika tombol `Naskah` di topbar menunjukkan ada update pending lalu user mengkliknya, sistem tetap hanya membuka halaman `Naskah`
- update terbaru tidak otomatis dimuat saat navigasi
- indikator update ditampilkan di dalam halaman `Naskah`, dan user memutuskan kapan memuatnya

Alasan:
- konsisten dengan prinsip refresh manual
- mencegah perubahan isi terjadi diam-diam saat perpindahan halaman
- menjaga kontrol tetap di tangan user

### D-019: Chat Dan Naskah Dipindahkan Lewat Tombol Kontekstual Di Topbar

Status: active

Keputusan:
- perpindahan antara `Chat` dan `Naskah` dilakukan lewat tombol kontekstual di topbar
- di halaman `Chat`, yang tampil adalah tombol `Naskah`
- di halaman `Naskah`, yang tampil adalah tombol `Chat`
- `Naskah` tidak diperlakukan sebagai halaman anak yang kembali lewat tombol back lokal

Alasan:
- paling konsisten dengan posisi `Naskah` sebagai halaman mandiri
- menghindari tampilan janggal seperti tombol `Chat` di halaman `Chat`
- tetap memberi navigasi yang jelas tanpa membuat topbar terasa berat

### D-020: Daftar Section Naskah Berada Di Sidebar Kiri

Status: active

Keputusan:
- daftar section yang sudah masuk ke `naskah` ditempatkan di sidebar kiri
- sidebar kiri juga berfungsi sebagai navigasi cepat antar section

Alasan:
- paling natural untuk dokumen yang akan makin panjang
- menjaga area utama tetap fokus pada preview paper
- selaras dengan pola pembacaan dokumen panjang yang umum

### D-021: Area Utama Naskah Fokus Ke Satu Kolom Preview

Status: active

Keputusan:
- area utama halaman `Naskah` berfokus pada satu kolom preview paper di tengah
- fase awal tidak memakai panel metadata kanan atau layout studio yang lebih bebas

Alasan:
- menjaga fokus baca
- paling sesuai untuk preview paper akademik
- menghindari UI yang terlalu ramai pada fase awal

### D-022: Naskah Menggunakan Page Break Visual Antar Halaman A4

Status: active

Keputusan:
- preview `Naskah` ditampilkan sebagai dokumen paged
- antar halaman A4 memiliki page break visual yang jelas
- fase awal tidak memakai continuous scroll murni sebagai bentuk utama preview

Alasan:
- selaras dengan value utama fitur, yaitu melihat bentuk paper secara nyata
- memudahkan user memahami panjang dokumen dan komposisi halaman
- lebih dekat ke mental model dokumen akademik cetak/export

### D-023: Header Naskah Memuat Elemen Status Dan Aksi Utama

Status: active

Keputusan:
- header halaman `Naskah` memuat judul `Naskah`
- header memuat status bertumbuh atau parsial
- header memuat indikator update
- header memuat aksi export

Alasan:
- seluruh informasi dan aksi utama naskah terkumpul di area yang mudah ditemukan
- konsisten dengan keputusan bahwa naskah adalah halaman mandiri
- mengurangi kebutuhan user mencari status dan aksi di area lain

### D-024: Header Menampilkan Naskah Dan Judul Paper Aktif

Status: active

Keputusan:
- header halaman menampilkan identitas fitur `Naskah`
- header juga menampilkan judul paper aktif yang sedang dibuka

Alasan:
- menjaga identitas fitur tetap jelas
- memberi konteks paper yang sedang dilihat tanpa membuat user menebak
- lebih informatif daripada hanya menampilkan salah satunya

### D-025: Sidebar Naskah Menggunakan Nama Section Akademik Final

Status: active

Keputusan:
- nama section yang tampil di sidebar `Naskah` mengikuti nama section akademik final
- sidebar tidak memakai nama stage internal sistem

Alasan:
- menjaga `Naskah` terasa seperti paper, bukan panel workflow internal
- lebih natural bagi user saat membaca hasil dokumen
- konsisten dengan mental model paper utuh

### D-026: Klik Sidebar Melompat Ke Awal Section

Status: active

Keputusan:
- ketika user mengklik section di sidebar `Naskah`, viewport melompat ke awal section tersebut
- fase awal tidak menyimpan posisi baca terakhir per section
- fase awal tidak membuka sub-navigation sebelum melakukan lompatan

Alasan:
- paling sederhana dan mudah diprediksi
- cukup kuat untuk kebutuhan navigasi awal
- menghindari state tambahan yang belum perlu

### D-027: Sidebar Menyorot Section Aktif Saat Scroll

Status: active

Keputusan:
- sidebar kiri `Naskah` menyorot section yang sedang aktif di viewport saat user scroll
- sidebar berfungsi bukan hanya sebagai daftar navigasi klik, tetapi juga sebagai penunjuk posisi baca saat ini

Alasan:
- membuat orientasi dokumen panjang lebih mudah
- meningkatkan kegunaan sidebar tanpa menambah interaksi baru yang rumit
- konsisten dengan pola outline dokumen yang umum

### D-028: Section Yang Berubah Diberi Highlight Sementara Setelah Refresh

Status: active

Keputusan:
- setelah user memuat update di halaman `Naskah`, section yang berubah diberi highlight sementara
- highlight ini berfungsi sebagai umpan balik visual pasca-refresh
- fase awal tidak memakai badge permanen `updated` pada sidebar sebagai indikator utama

Alasan:
- paling jelas bagi user
- memberi konfirmasi bahwa refresh memang membawa perubahan
- tidak menambah noise status permanen di UI

### D-029: Indikator Update Naskah Berbentuk Banner Tipis Dengan CTA

Status: active

Keputusan:
- indikator update utama di halaman `Naskah` berbentuk banner tipis di area header
- banner ini memuat aksi utama `Update`
- fase awal tidak memakai toast persisten atau status bar kecil sebagai bentuk utama indikator update

Alasan:
- paling jelas untuk aksi yang penting
- stabil dan mudah ditemukan
- cocok dengan refresh yang harus disengaja user

### D-030: Status Bertumbuh Dan Parsial Digabung Menjadi Satu Status Utama

Status: active

Keputusan:
- status bahwa `naskah` masih bertumbuh dan status bahwa export masih parsial diperlakukan sebagai satu status utama yang sama
- UI tidak perlu memisahkan dua status yang maknanya sangat berdekatan

Alasan:
- lebih ringkas
- mengurangi noise status di header dan export area
- lebih mudah dipahami user sebagai satu kondisi dokumen yang belum lengkap

### D-031: Notifikasi Update Pada Tombol Naskah Berupa Titik Kecil

Status: active

Keputusan:
- notifikasi update pada tombol `Naskah` di halaman `Chat` ditampilkan sebagai titik kecil
- fase awal tidak memakai badge teks `update`
- fase awal tidak memakai badge angka jumlah update

Alasan:
- paling ringan secara visual
- konsisten dengan referensi affordance kecil yang sudah dibahas
- tidak membuat topbar terasa ramai

### D-032: Status Utama Naskah Ditampilkan Sebagai Badge Dan Info Text

Status: active

Keputusan:
- status utama di header `Naskah` ditampilkan sebagai kombinasi badge kecil dan info text pendek
- pola ini dipakai untuk menyampaikan bahwa naskah masih bertumbuh atau masih parsial

Alasan:
- paling sesuai dengan keputusan sebelumnya bahwa status perlu singkat sekaligus tetap memberi penjelasan halus
- lebih jelas daripada hanya badge atau hanya teks
- tetap ringan secara visual untuk header

### D-033: Info Text Status Naskah Lebih Menekankan Progres

Status: active

Keputusan:
- info text pendek pada status utama `Naskah` menggunakan nada kombinasi
- pesan tetap mengakui bahwa naskah belum lengkap
- tetapi penekanan utamanya ada pada progres bahwa naskah akan terus bertambah seiring section tervalidasi

Alasan:
- lebih konstruktif
- selaras dengan sifat naskah yang memang bertumbuh bertahap
- tetap jujur tanpa terdengar terlalu negatif

### D-034: Jumlah Halaman Ditampilkan Di Header Naskah

Status: active

Keputusan:
- jumlah halaman `Naskah` ditampilkan di header
- fase awal tidak perlu menampilkan jumlah halaman sebagai elemen terpisah dekat area preview

Alasan:
- jumlah halaman adalah informasi level dokumen
- paling konsisten jika dikelompokkan bersama status dan aksi utama di header
- menjaga area preview tetap fokus pada isi paper

### D-035: Copy Jumlah Halaman Menggunakan Label Estimasi

Status: active

Keputusan:
- jumlah halaman di header ditampilkan dengan copy `Estimasi X halaman`
- jumlah halaman tidak dikomunikasikan sebagai angka absolut tanpa konteks

Alasan:
- konsisten dengan keputusan bahwa preview web tidak identik 100% dengan hasil export final
- mencegah ekspektasi berlebihan terhadap akurasi page count
- lebih jujur secara produk

### D-036: Export Menggunakan Satu Tombol Dengan Dropdown Format

Status: active

Keputusan:
- aksi export di header `Naskah` menggunakan satu tombol `Export`
- pilihan format seperti `PDF` dan `DOCX` ditampilkan melalui dropdown
- fase awal tidak memakai dua tombol format terpisah di header

Alasan:
- lebih rapi di header yang sudah memuat banyak elemen penting
- menjaga kepadatan UI tetap terkendali
- tetap jelas untuk user karena format tersedia langsung dari dropdown

### D-037: Dropdown Export Tetap Menggunakan Label Format Simpel

Status: active

Keputusan:
- opsi di dropdown export tetap ditulis simpel, misalnya `PDF` dan `DOCX`
- status parsial tidak diulang di masing-masing opsi format
- informasi bahwa naskah masih parsial cukup dikomunikasikan melalui status utama di header

Alasan:
- mencegah pengulangan status yang tidak perlu
- menjaga dropdown tetap bersih
- konsisten dengan keputusan bahwa status utama dokumen berada di header

### D-038: Setiap Section Masuk Ke Naskah Hanya Setelah Tervalidasi

Status: active

Keputusan:
- setiap section selain `abstrak` hanya boleh masuk ke `naskah` setelah section tersebut tervalidasi
- `naskah` tidak mengambil section yang baru dianggap final secara informal tetapi belum tervalidasi

Alasan:
- paling konsisten dengan artifact tervalidasi sebagai dasar pertumbuhan naskah
- menjaga kejelasan source of truth
- mencegah naskah memuat isi yang statusnya belum cukup kuat

### D-039: Stage Internal Dipetakan Ke Struktur Section Akademik

Status: active

Keputusan:
- tidak semua stage internal yang tervalidasi otomatis tampil sebagai section tersendiri di `naskah`
- kemunculan section di `naskah` ditentukan oleh mapping ke struktur section akademik final

Alasan:
- menjaga `naskah` tetap terasa seperti paper akademik, bukan cerminan mentah workflow internal
- memberi ruang untuk stage yang sifatnya pendukung tanpa harus muncul sebagai section final
- konsisten dengan keputusan bahwa sidebar dan isi naskah memakai nama section akademik

### D-040: Abstrak Diupdate Oleh Pembaruan Abstrak

Status: active

Keputusan:
- section `Abstrak` tetap tampil sebagai satu section tunggal di `naskah`
- saat stage `abstrak` tervalidasi, `naskah` memakai abstrak versi awal
- saat stage `pembaruan_abstrak` tervalidasi, isi section `Abstrak` diganti dengan versi pembaruan
- `pembaruan_abstrak` tidak tampil sebagai section akademik terpisah

Alasan:
- menjaga struktur `naskah` tetap natural sebagai paper final
- memungkinkan abstrak muncul lebih awal tanpa menunggu pembaruan akhir
- konsisten dengan logika sistem export yang memang memprioritaskan `pembaruan_abstrak` atas `abstrak`

### D-041: Judul Dokumen Menggunakan Working Title Dari Topik Lalu Diupdate Oleh Judul Final

Status: active

Keputusan:
- header dokumen `Naskah` boleh memakai `working title` dari stage `topik`
- saat stage `judul` tervalidasi, judul dokumen diperbarui ke `judul` final/terpilih
- stage `judul` tidak menjadi section isi tersendiri di `naskah`

Alasan:
- memberi identitas dokumen lebih awal
- tetap memungkinkan peralihan ke judul final di tahap akhir
- lebih selaras dengan pengalaman membaca dokumen utuh daripada membiarkan judul kosong terlalu lama

### D-042: Working Title Mulai Dipakai Saat Naskah Pertama Kali Muncul

Status: active

Keputusan:
- `working title` dari stage `topik` mulai dipakai ketika `naskah` pertama kali muncul setelah `abstrak` tervalidasi
- pada kondisi awal ini, halaman pertama memuat judul kerja dokumen
- section `Abstrak` dimulai di halaman kedua

Alasan:
- konsisten dengan keputusan bahwa `naskah` baru tersedia setelah `abstrak` tervalidasi
- memberi struktur dokumen yang terasa lebih formal sejak awal
- membuat judul dokumen sudah hadir saat user pertama kali membuka `naskah`

### D-043: Halaman Pertama Naskah Hanya Berisi Judul

Status: active

Keputusan:
- pada fase awal, halaman pertama `naskah` hanya berisi judul dokumen
- halaman pertama tidak memuat metadata tambahan
- halaman pertama tidak memuat teaser atau ringkasan abstrak

Alasan:
- paling bersih secara visual
- konsisten dengan keputusan bahwa `Abstrak` mulai di halaman kedua
- menghindari keramaian yang belum perlu pada halaman pembuka

### D-044: Judul Final Menggantikan Working Title Sepenuhnya

Status: active

Keputusan:
- saat stage `judul` tervalidasi, judul final menggantikan working title sepenuhnya di halaman pertama
- working title lama tidak perlu tetap ditampilkan di UI naskah fase awal

Alasan:
- konsisten dengan prinsip bahwa versi final tervalidasi menggantikan versi kerja
- menjaga tampilan dokumen tetap bersih
- menghindari kebingungan antara judul kerja dan judul final

### D-045: Halaman Judul Menggunakan Tata Letak Cover Sederhana

Status: active

Keputusan:
- judul di halaman pertama `naskah` ditampilkan besar dan center
- tampilan halaman pertama mengikuti pola cover sederhana

Alasan:
- paling sesuai untuk halaman yang hanya berisi judul
- memberi kesan dokumen yang lebih formal
- memanfaatkan halaman pembuka dengan cara yang paling bersih

### D-046: Halaman Kedua Dimulai Dengan Heading Abstrak

Status: active

Keputusan:
- halaman kedua `naskah` langsung memulai section `Abstrak`
- section ini diawali heading `Abstrak` yang jelas di atas isi

Alasan:
- paling konsisten dengan struktur section akademik
- memudahkan orientasi user saat berpindah dari halaman judul ke isi dokumen
- jadi pola dasar yang bisa diikuti section lain

### D-047: Section Besar Berikutnya Wajib Mulai Di Halaman Baru

Status: active

Keputusan:
- setelah section `Abstrak`, section besar berikutnya seperti `Pendahuluan` wajib dimulai di halaman baru
- fase awal tidak membiarkan section besar berikutnya langsung meneruskan sisa ruang halaman sebelumnya

Alasan:
- memberi struktur dokumen yang lebih formal
- membuat perpindahan antar section utama terasa jelas
- lebih konsisten dengan ekspektasi user terhadap naskah akademik yang rapi

### D-048: Semua Section Utama Wajib Mulai Di Halaman Baru

Status: active

Keputusan:
- aturan mulai di halaman baru berlaku untuk semua section utama dalam `naskah`
- fase awal tidak membedakan aturan page break antar section utama

Alasan:
- paling konsisten
- paling mudah dijadikan aturan layout awal
- menghasilkan struktur dokumen yang lebih rapi dan mudah diprediksi

### D-049: Daftar Pustaka Diperlakukan Sebagai Section Biasa

Status: active

Keputusan:
- `Daftar Pustaka` tampil sebagai section biasa di sidebar `Naskah`
- `Daftar Pustaka` tidak diberi perlakuan visual khusus di sidebar pada fase awal

Alasan:
- paling konsisten dengan struktur paper final
- menjaga sidebar tetap sederhana
- menghindari pengecualian UI yang belum perlu

### D-050: Lampiran Diperlakukan Sebagai Section Biasa Jika Tersedia

Status: active

Keputusan:
- `Lampiran` tampil sebagai section biasa di sidebar dan dokumen jika ada isi yang tervalidasi
- `Lampiran` tidak muncul jika belum tersedia

Alasan:
- konsisten dengan struktur paper final
- tetap jujur terhadap ketersediaan konten
- menjaga aturan kemunculan section tetap seragam

### D-051: Gagasan, Topik, Dan Outline Tidak Muncul Di Naskah

Status: active

Keputusan:
- `gagasan`, `topik`, dan `outline` tidak muncul sebagai section di dokumen `Naskah`
- `gagasan`, `topik`, dan `outline` juga tidak muncul sebagai item di sidebar `Naskah`
- pengecualian hanya pada kontribusi tidak langsung `topik` sebagai sumber working title

Alasan:
- menjaga `Naskah` murni terasa sebagai paper final
- mencegah kebocoran struktur workflow internal ke pengalaman membaca dokumen
- konsisten dengan mapping akademik yang sudah dipilih

### D-052: Sidebar Naskah Dimulai Dari Halaman Judul

Status: active

Keputusan:
- item pertama di sidebar `Naskah` adalah `Halaman Judul`
- setelah itu sidebar mengikuti urutan section final yang sudah disepakati
- label yang dipakai untuk item pertama tersebut adalah `Halaman Judul`

Alasan:
- konsisten dengan struktur dokumen yang sekarang memasukkan halaman judul sebagai bagian nyata dari naskah
- menjaga navigasi sidebar selaras dengan urutan baca dokumen
- menghindari diskoneksi antara halaman pertama dokumen dan outline sidebar

### D-053: Halaman Judul Menggunakan Pola Highlight Sidebar Yang Sama

Status: active

Keputusan:
- item `Halaman Judul` di sidebar memakai pola highlight aktif yang sama seperti section lain
- fase awal tidak memberi gaya khusus yang membedakan item ini dari item navigasi lainnya

Alasan:
- menjaga konsistensi visual sidebar
- membuat `Halaman Judul` terasa sebagai bagian normal dari struktur naskah
- menghindari pengecualian UI yang tidak perlu

### D-056: Badge Status Utama Naskah Menggunakan Copy Bertumbuh

Status: active

Keputusan:
- badge status utama di header `Naskah` memakai copy `Bertumbuh`

Alasan:
- paling selaras dengan arah pengalaman yang menekankan progres
- tidak terasa seperti warning keras
- lebih sesuai dengan model naskah yang berkembang bertahap

### D-057: Info Text Status Naskah Menggunakan Copy Progresif

Status: active

Keputusan:
- info text pendek di header `Naskah` memakai copy `Naskah sedang bertumbuh seiring section tervalidasi.`

Alasan:
- paling selaras dengan badge `Bertumbuh`
- jelas tanpa terasa terlalu negatif
- konsisten dengan arah komunikasi yang menekankan progres

### D-058: Header Naskah Menggunakan Susunan Dua Baris

Status: active

Keputusan:
- header `Naskah` memakai susunan dua baris
- baris pertama memuat identitas `Naskah` dan judul paper
- baris kedua memuat badge status, info text, dan `Estimasi X halaman`
- area aksi berada di sisi kanan header

Alasan:
- hirarki informasi lebih jelas
- cocok dengan banyaknya elemen status yang perlu tampil
- tetap rapi dan mudah dipindai

### D-059: Label Naskah Tampil Kecil Di Atas Judul Paper

Status: active

Keputusan:
- pada baris pertama header, label `Naskah` tampil kecil di atas judul paper

Alasan:
- paling cocok dengan susunan dua baris yang sudah dipilih
- menjaga hirarki visual antara identitas fitur dan judul dokumen
- membuat judul paper tetap menjadi fokus utama

### D-054: Section Ditahan Jika Artifact Belum Cukup Rapi Untuk Dikompilasi

Status: active

Keputusan:
- jika artifact yang sudah tervalidasi belum cukup rapi untuk dikompilasi menjadi section `Naskah`, section tersebut ditahan dulu
- section itu tidak dimasukkan ke `Naskah` sampai memenuhi syarat kompilasi yang layak
- fase awal tidak menampilkan hasil kompilasi apa adanya jika kualitas strukturnya belum memadai

Alasan:
- menjaga `Naskah` tetap terasa seperti paper yang rapi
- lebih konsisten dengan positioning `Naskah` sebagai compiled academic view
- menghindari tampilan section yang secara visual atau struktural masih berantakan

### D-055: Preview Web Ditargetkan Sangat Dekat Dengan Export Final

Status: active

Keputusan:
- pada fase awal, preview web `Naskah` ditargetkan sangat dekat dengan hasil export final
- sistem tidak menjanjikan bahwa preview web identik 100% dengan Word/PDF final
- komunikasi ke user tetap memakai bahasa estimasi untuk pagination

Alasan:
- menjaga value utama fitur sebagai preview paper yang terasa nyata
- menghindari janji presisi absolut yang belum realistis
- tetap memberi target kualitas yang tinggi untuk pengalaman preview

### O-015: Copy Final Untuk Badge Dan Info Text Status Naskah

Status: resolved

Jawaban:
- copy badge status: `Bertumbuh`
- copy info text pendek: `Naskah sedang bertumbuh seiring section tervalidasi.`

### O-017: Label Opsi Format Di Dropdown Export

Status: resolved

Jawaban:
- opsi format tetap ditulis simpel sebagai `PDF` dan `DOCX`
- status parsial cukup dikomunikasikan melalui header

### O-016: Format Teks Jumlah Halaman Di Header

Status: resolved

Jawaban:
- jumlah halaman ditampilkan sebagai `Estimasi X halaman`

### O-012: Bentuk Penyajian Elemen Header Naskah

Status: resolved

Jawaban:
- header memakai susunan dua baris
- baris pertama memuat identitas `Naskah` dan judul paper
- baris kedua memuat badge status, info text, dan estimasi halaman
- area aksi berada di sisi kanan
- `Naskah` tampil sebagai label kecil di atas judul paper

### O-013: Mapping Stage Internal Ke Nama Section Akademik

Status: resolved

Jawaban:
- `gagasan` tidak muncul di `Naskah`
- `topik` tidak muncul sebagai section, tetapi dapat menyumbang `working title`
- `outline` tidak muncul di `Naskah`
- `abstrak` menjadi section `Abstrak`
- `pendahuluan` menjadi section `Pendahuluan`
- `tinjauan_literatur` menjadi section `Tinjauan Literatur`
- `metodologi` menjadi section `Metodologi`
- `hasil` menjadi section `Hasil`
- `diskusi` menjadi section `Diskusi`
- `kesimpulan` menjadi section `Kesimpulan`
- `pembaruan_abstrak` memperbarui section `Abstrak`, bukan menjadi section baru
- `daftar_pustaka` menjadi section `Daftar Pustaka`
- `lampiran` menjadi section `Lampiran` jika tersedia
- `judul` tidak menjadi section, tetapi memperbarui judul dokumen

### O-014: Apakah Sidebar Perlu Menunjukkan Section Aktif Saat Scroll

Status: resolved

Jawaban:
- sidebar menyorot section yang sedang aktif di viewport saat user scroll

### O-006: Bentuk Keterangan Bahwa Naskah Masih Bertumbuh

Status: resolved

Jawaban:
- keterangan bahwa `Naskah` masih bertumbuh ditampilkan di header
- bentuknya berupa kombinasi badge status `Bertumbuh` dan info text `Naskah sedang bertumbuh seiring section tervalidasi.`
- daftar section tetap tampil sebagai navigasi di sidebar kiri, bukan sebagai panel status terpisah

### O-007: Bentuk Label Export Parsial

Status: resolved

Jawaban:
- status parsial export digabung dengan status umum bahwa naskah masih bertumbuh

### O-008: Bagaimana Mengomunikasikan Perubahan Setelah Refresh

Status: resolved

Jawaban:
- setelah user memuat update, section yang berubah diberi highlight sementara

### O-009: Bentuk UI Status Bertumbuh

Status: resolved

Jawaban:
- status utama ditampilkan di header sebagai kombinasi badge kecil dan info text pendek

### O-010: Bentuk UI Indikator Update Di Halaman Naskah

Status: resolved

Jawaban:
- indikator update berbentuk banner tipis di area header
- CTA refresh `Update` ditempatkan di indikator yang sama

### O-011: Bentuk Notifikasi Update Pada Tombol Naskah Di Topbar Chat

Status: resolved

Jawaban:
- notifikasi update pada tombol `Naskah` ditampilkan sebagai titik kecil

## Deferred Or Rejected Directions

### R-001: Naskah Editable Sejak Awal

Status: deferred

Tidak dipilih untuk fase awal karena:
- memicu konflik sinkronisasi
- memunculkan masalah compliance terhadap artifact
- membutuhkan model data tambahan untuk hasil edit manual

Catatan:
- arah ini belum ditutup selamanya
- bisa dibuka lagi di fase berikutnya jika memang layak

### R-002: Apply-Back Dari Naskah Ke Artifact

Status: rejected

Tidak dipilih karena:
- terlalu rumit
- berisiko tinggi menimbulkan conflict logic
- tidak bersih sebagai alur utama

### R-003: Bi-Directional Sync

Status: rejected

Tidak dipilih karena:
- kompleksitas tinggi
- tidak sebanding dengan kebutuhan fase awal
- memperkeruh source of truth

## Open Questions

### O-001: Layout Workspace Saat Naskah Aktif

Status: resolved

Jawaban:
- `naskah` dibuka sebagai halaman fullscreen terpisah
- aksesnya lewat tombol `Naskah` di topbar halaman chat

### O-002: Kriteria Artifact Yang Masuk Ke Naskah

Status: resolved

Jawaban:
- sebuah section masuk ke `naskah` hanya setelah tervalidasi

### O-003: Fallback Saat Struktur Artifact Tidak Bersih

Status: resolved

Jawaban:
- section ditahan dulu dan tidak masuk ke `Naskah` sampai artifact cukup rapi untuk dikompilasi

### O-004: Target Kedekatan Preview Terhadap Export Final

Status: resolved

Jawaban:
- preview web ditargetkan sangat dekat dengan hasil export final
- pagination tetap dikomunikasikan sebagai estimasi, bukan jaminan identik

### O-005: Bentuk Aksi Refresh Naskah

Status: resolved

Jawaban:
- aksi refresh dilakukan lewat banner tipis di area header
- CTA utamanya memakai copy `Update`
- setelah refresh, section yang berubah diberi highlight sementara

## Decision Update Rule

Perbarui `decisions.md` jika:
- ada keputusan baru
- ada keputusan aktif yang dibatalkan atau diganti
- ada open question yang sudah terjawab
- ada arah yang awalnya ditunda lalu diaktifkan

Saat memperbarui keputusan:
- pertahankan ID keputusan
- ubah status jika perlu
- tambahkan alasan perubahan di change log

## Change Log

### 2026-04-09

- Dokumen keputusan awal dibuat dari hasil pemisahan konteks stabil dan keputusan iteratif
- Keputusan aktif dicatat: artifact sebagai source of truth, naskah read-only pada fase awal, sinkronisasi artifact ke naskah, dan naskah sebagai workspace terpisah
- Diperbarui: naskah diposisikan sebagai halaman fullscreen terpisah, bukan layout berdampingan
- Diperbarui: tombol `Naskah` muncul saat `abstrak` sudah tervalidasi dan naskah dianggap mulai tergenerate
- Diperbarui: naskah memakai indikator update dan refresh manual; topbar `Naskah` juga menampilkan notifikasi update pending
- Diperbarui: naskah hanya menampilkan section yang sudah tervalidasi tanpa placeholder untuk section yang belum ada
- Diperbarui: urutan section naskah mengikuti struktur paper final, bukan urutan validasi
- Diperbarui: naskah tetap dibuka sebagai halaman normal walau belum lengkap, dengan keterangan bahwa naskah masih bertumbuh
- Diperbarui: halaman naskah menampilkan daftar section yang sudah masuk, tanpa daftar section yang belum masuk
- Diperbarui: daftar section yang sudah masuk juga dipakai sebagai navigasi cepat di halaman naskah
- Diperbarui: export tersedia sejak naskah pertama kali ada, dengan penanda bahwa hasil masih parsial jika belum lengkap
- Diperbarui: section yang direvisi dan tervalidasi ulang menggantikan versi naskah sebelumnya
- Diperbarui: status naskah bertumbuh memakai pola gabungan antara status singkat dan penjelasan halus
- Diperbarui: navigasi ke halaman naskah tidak otomatis memuat update pending
- Diperbarui: perpindahan antara Chat dan Naskah memakai tombol kontekstual di topbar, bukan dua tab yang tampil bersamaan
- Diperbarui: daftar section naskah ditempatkan di sidebar kiri
- Diperbarui: preview naskah memakai page break visual yang jelas antar halaman A4
- Diperbarui: header naskah memuat judul, status bertumbuh/parsial, indikator update, dan aksi export
- Diperbarui: header naskah menampilkan label fitur `Naskah` dan judul paper aktif
- Diperbarui: sidebar naskah menggunakan nama section akademik final, bukan nama stage internal
- Diperbarui: klik section di sidebar membawa user ke awal section tersebut
- Diperbarui: sidebar naskah menyorot section yang aktif saat user scroll
- Diperbarui: section yang berubah diberi highlight sementara setelah refresh
- Diperbarui: indikator update naskah berbentuk banner tipis di area header dengan tombol `Update`
- Diperbarui: status bertumbuh naskah dan status parsial export digabung menjadi satu status utama
- Diperbarui: notifikasi update pada tombol `Naskah` di halaman `Chat` menggunakan titik kecil
- Diperbarui: status utama naskah di header memakai kombinasi badge kecil dan info text pendek
- Diperbarui: info text status naskah lebih menekankan progres pertumbuhan sambil tetap jujur bahwa dokumen belum lengkap
- Diperbarui: jumlah halaman naskah ditampilkan di header
- Diperbarui: jumlah halaman di header menggunakan copy `Estimasi X halaman`
- Diperbarui: export di header menggunakan satu tombol `Export` dengan dropdown format
- Diperbarui: dropdown export tetap memakai label format simpel, tanpa mengulang status parsial
- Diperbarui: setiap section masuk ke naskah hanya setelah tervalidasi
- Diperbarui: stage internal dipetakan ke struktur section akademik, bukan otomatis semua menjadi section naskah
- Diperbarui: abstrak awal tetap tampil lalu diganti oleh pembaruan abstrak saat tervalidasi
- Diperbarui: judul dokumen memakai working title dari topik lalu diganti oleh judul final saat tervalidasi
- Diperbarui: saat naskah pertama muncul, working title tampil di halaman pertama dan abstrak mulai di halaman kedua
- Diperbarui: halaman pertama naskah pada fase awal hanya berisi judul dokumen
- Diperbarui: judul final menggantikan working title sepenuhnya saat tervalidasi
- Diperbarui: halaman pertama naskah memakai tata letak cover sederhana dengan judul besar dan center
- Diperbarui: halaman kedua dimulai dengan heading `Abstrak`
- Diperbarui: section besar berikutnya seperti `Pendahuluan` wajib dimulai di halaman baru
- Diperbarui: semua section utama naskah wajib mulai di halaman baru
- Diperbarui: `Daftar Pustaka` diperlakukan sebagai section biasa di sidebar dan dokumen
- Diperbarui: `Lampiran` diperlakukan sebagai section biasa jika tersedia dan tervalidasi
- Diperbarui: `gagasan`, `topik`, dan `outline` sama sekali tidak muncul di sidebar atau isi `Naskah`
- Diperbarui: sidebar `Naskah` dimulai dari item `Halaman Judul`
- Diperbarui: label item pertama di sidebar ditetapkan sebagai `Halaman Judul`
- Diperbarui: `Halaman Judul` memakai pola highlight sidebar yang sama seperti section lain
- Diperbarui: section ditahan jika artifact tervalidasi belum cukup rapi untuk dikompilasi ke `Naskah`
- Diperbarui: preview web `Naskah` ditargetkan sangat dekat dengan export final, tetapi tidak dijanjikan identik
- Diperbarui: badge status utama `Naskah` memakai copy `Bertumbuh`
- Diperbarui: info text status `Naskah` memakai copy `Naskah sedang bertumbuh seiring section tervalidasi.`
- Diperbarui: header `Naskah` memakai susunan dua baris dengan area aksi di sisi kanan
- Diperbarui: label `Naskah` tampil kecil di atas judul paper pada baris pertama header
