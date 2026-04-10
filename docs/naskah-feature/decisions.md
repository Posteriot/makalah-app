# Naskah Feature Decisions

## Purpose

Dokumen ini menyimpan keputusan kerja yang dipakai sebagai rujukan arsitektur dan implementasi fitur `naskah`.
Isinya mencakup keputusan aktif, arah yang ditolak atau ditunda, pertanyaan terbuka, dan log perubahan keputusan.
Setiap keputusan harus dibaca berdampingan dengan kondisi codebase yang sudah diverifikasi.

Untuk konteks yang lebih stabil, lihat `docs/naskah-feature/context.md`.

## Current Active Direction

Status saat ini berdasarkan audit codebase:
- `naskah` diposisikan sebagai compiled paper workspace read-only pada fase awal
- authoring tetap dilakukan di artifact
- pipeline export existing masih berbasis `stageData` dan masih dibatasi untuk session `completed`
- `stageData` saat ini adalah layer koordinasi workflow, bukan compiled naskah state
- state khusus `naskah` seperti availability, `update pending`, compiled snapshot, dan viewed revision sudah ada
- entry point, topbar behavior, route khusus `Naskah`, dan refresh manual fase 1 sudah ada di codebase
- `validatedAt` adalah fondasi paling nyata untuk pertumbuhan section yang tervalidasi
- keputusan fase 1 sekarang terutama menyisakan gap export, bukan gap route atau snapshot state

## Active Decisions

### D-001: Artifact Tetap Menjadi Source Of Truth

Status: active

Keputusan:
- isi `Naskah` bersumber dari artifact tervalidasi sebagai authority authoring
- `stageData` dipakai sebagai layer koordinasi untuk referensi artifact, bukan sebagai isi dokumen final
- untuk fase 1, compiler `Naskah` membaca content artifact yang direferensikan oleh `stageData`, bukan membangun authoring baru dari state `Naskah`
- keputusan ini tidak boleh menciptakan source of truth kedua yang berdiri sendiri di luar artifact

Alasan:
- lebih konsisten dengan struktur sistem sekarang
- lebih aman untuk menjaga compliance
- menghindari konflik sinkronisasi yang tidak perlu di fase awal

### D-002: Edit Tetap Terjadi Di Artifact Pada Fase Awal

Status: active

Keputusan:
- user tetap mengedit konten di artifact
- `naskah` tidak menjadi tempat edit utama di fase awal
- perubahan di artifact baru tercermin ke `Naskah` setelah artifact itu tervalidasi ulang lewat penanda `validatedAt`
- selama belum tervalidasi ulang, `Naskah` tetap memakai versi tervalidasi terakhir

Alasan:
- menjaga source of truth tetap jelas
- menahan kompleksitas sinkronisasi
- cocok dengan flow stage-based yang sudah ada

### D-003: Naskah Bersifat Read-Only Pada Fase Awal

Status: active

Keputusan:
- `naskah` hanya dipakai untuk melihat hasil paper utuh
- edit manual di `naskah` tidak dibuka pada fase awal
- fase ini belum membuka loop edit balik dari `naskah` ke artifact

Alasan:
- menghindari divergensi dari artifact
- menurunkan risiko compliance mismatch
- memudahkan penyusunan sinkronisasi satu arah

### D-004: Arah Sinkronisasi Adalah Artifact Ke Naskah

Status: active

Keputusan:
- perubahan pada artifact yang relevan harus tercermin ke `naskah`
- sinkronisasi hanya satu arah dari artifact ke `naskah`
- `naskah` tidak menjadi sumber perubahan balik ke artifact
- perubahan yang belum tervalidasi hanya menjadi kandidat update dan belum boleh mengganti isi `Naskah`

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
- `Naskah` fase 1 harus tampil sebagai preview naskah akademik read-only dengan layout paper, pagination A4, dan urutan section final
- renderer harus mendukung layout paper, bukan sekadar markdown rendering generik
- preview web dan export final diperlakukan sebagai dua renderer yang bisa berdekatan tapi tidak identik pada detail pagination
- fase 1 tidak membuka editing, markdown rendering generik, atau continuous-scroll-only sebagai bentuk utama

Alasan:
- kebutuhan user adalah preview paper utuh dalam format akademik
- markdown renderer biasa tidak cukup untuk memenuhi kebutuhan tersebut

### D-007: Pagination Adalah Concern Fase 1; Export Mengikuti Jalur Terpisah

Status: active

Keputusan:
- pagination atau estimasi jumlah halaman adalah concern preview
- export PDF/DOCX adalah concern terpisah yang memakai compiled content yang sama
- untuk fase 1, export `Naskah` ditahan sampai jalur export khusus tersedia
- export existing yang completed-only tidak dipakai sebagai jalan parsial untuk `Naskah`

Alasan:
- ini inti value produk yang dibahas user sejak awal
- membantu user melihat bentuk akhir paper secara lebih nyata

### D-008: Tombol Naskah Muncul Setelah Abstrak Tervalidasi

Status: active

Keputusan:
- tombol `Naskah` di topbar halaman chat hanya muncul ketika `Naskah` sudah dianggap tersedia
- `Naskah` dianggap tersedia ketika `abstrak` sudah tervalidasi dan compiler dapat membentuk minimal compiled content dari artifact tervalidasi

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
- `update pending` berarti compiled revision terbaru berbeda dengan revision yang terakhir dimuat user
- `isDirty` yang ada sekarang tidak cukup untuk semantik itu karena `isDirty` hanya menandai perubahan workflow, bukan perbandingan compiled snapshot

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
- eligibilitas section ditentukan oleh dua syarat: stage yang relevan sudah tervalidasi dan compiler berhasil membentuk section yang layak tampil

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
- compiler yang dipakai harus sudah memetakan stage internal ke urutan section final, bukan sekadar mengikuti urutan data mentah

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
- daftar ini bergantung pada output compiler yang sudah menghasilkan section final yang benar-benar eligible tampil

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

### D-015: Export Parsial Ditahan Sampai Jalur Khusus Tersedia

Status: deferred

Keputusan:
- export PDF/DOCX untuk `naskah` belum dianggap tersedia di codebase sekarang
- jika keputusan ini diaktifkan, UI harus memberi label atau penanda bahwa hasil export masih parsial
- aktivasi keputusan ini membutuhkan jalur export `naskah` yang tidak bergantung pada pipeline completed-only saat ini

Alasan:
- secara produk, export parsial tetap masuk akal untuk `Naskah`
- secara implementasi, status ini ditahan karena backend export existing masih completed-only
- keputusan ini akan diaktifkan ulang setelah jalur export `Naskah` dan model snapshot tersedia

### D-016: Revisi Section Menggantikan Versi Naskah Sebelumnya

Status: active

Keputusan:
- jika section yang sudah masuk ke `naskah` direvisi lalu tervalidasi ulang, versi section di `naskah` digantikan penuh oleh versi tervalidasi terbaru
- `naskah` tidak menyimpan riwayat versi section sebagai bagian dari pengalaman fase awal
- pergantian ini mengikuti mekanisme refresh manual yang sudah dipilih
- revisi artifact yang belum tervalidasi ulang tidak mengganti isi `Naskah`, tetapi boleh menjadi dasar munculnya `update pending` setelah compiled revision baru tersedia

Alasan:
- konsisten dengan artifact sebagai source of truth
- lebih sederhana daripada menambah versioning atau merge flow di level naskah
- cocok untuk fase awal yang fokus pada preview terkompilasi

## Presentation Decisions

Kelompok keputusan berikut terutama mengatur struktur UI, layout, copy, dan affordance presentasi `Naskah`.
Keputusan-keputusan ini tidak boleh dibaca sebagai bukti bahwa state backend, route, atau shell pendukungnya sudah tersedia di codebase saat ini.

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
- ini mengandaikan route hierarchy antar halaman saudara dengan shared shell behavior di level topbar, bukan relasi parent-child lokal

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
- detail copy dan layout status diatur di keputusan turunan berikutnya

Alasan:
- seluruh informasi dan aksi utama naskah terkumpul di area yang mudah ditemukan
- konsisten dengan keputusan bahwa naskah adalah halaman mandiri
- mengurangi kebutuhan user mencari status dan aksi di area lain

### D-024: Header Menampilkan Naskah Dan Judul Paper Aktif

Status: active

Keputusan:
- header halaman menampilkan identitas fitur `Naskah`
- header juga menampilkan judul paper aktif yang sedang dibuka
- judul aktif tetap bergantung pada mekanisme title resolution yang ada, bukan state baru yang terpisah

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
- banner ini hanya masuk akal kalau ada compiled revision yang bisa dimuat ulang secara eksplisit

Alasan:
- paling jelas untuk aksi yang penting
- stabil dan mudah ditemukan
- cocok dengan refresh yang harus disengaja user

### D-030: Status Bertumbuh Dan Parsial Digabung Menjadi Satu Status Utama

Status: active

Keputusan:
- status bahwa `naskah` masih bertumbuh dan status bahwa export masih parsial diperlakukan sebagai satu status utama yang sama
- UI tidak perlu memisahkan dua status yang maknanya sangat berdekatan
- untuk fase 1, penggabungan ini dipakai hanya pada state yang memang sudah punya dasar data

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
- badge dan info text harus dibaca sebagai satu status utama, bukan dua status terpisah

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
- angka ini harus dikomunikasikan sebagai estimasi, bukan kepastian final

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
- penggabungan ini hanya valid setelah jalur export `Naskah` benar-benar tersedia

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

## Compilation Decisions

Kelompok keputusan berikut mengatur bagaimana stage tervalidasi dipetakan menjadi section `Naskah`.

### D-038: Setiap Section Masuk Ke Naskah Hanya Setelah Tervalidasi

Status: active

Keputusan:
- setiap section selain `abstrak` hanya boleh masuk ke `naskah` setelah section tersebut tervalidasi
- `naskah` tidak mengambil section yang baru dianggap final secara informal tetapi belum tervalidasi
- section yang tervalidasi tetap bisa ditahan kalau struktur artifact belum cukup rapi untuk kompilasi
- compiler membaca artifact tervalidasi yang direferensikan oleh `stageData`
- jika artifact yang semula tervalidasi kemudian invalidated oleh rewind, section terkait keluar lagi dari kandidat `Naskah` sampai ada validasi baru

Alasan:
- paling konsisten dengan artifact tervalidasi sebagai dasar pertumbuhan naskah
- menjaga kejelasan source of truth
- mencegah naskah memuat isi yang statusnya belum cukup kuat

### D-039: Stage Internal Dipetakan Ke Struktur Section Akademik

Status: active

Keputusan:
- tidak semua stage internal yang tervalidasi otomatis tampil sebagai section tersendiri di `naskah`
- kemunculan section di `naskah` ditentukan oleh mapping ke struktur section akademik final
- mapping ini harus tetap selaras dengan compiler yang dipakai, bukan cuma label UI

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
- jika judul final belum tersedia, working title tetap jadi fallback sampai ada keputusan final

Alasan:
- memberi identitas dokumen lebih awal
- tetap memungkinkan peralihan ke judul final di tahap akhir
- lebih selaras dengan pengalaman membaca dokumen utuh daripada membiarkan judul kosong terlalu lama

## Layout Decisions

Kelompok keputusan berikut mengatur bentuk layout dokumen dan outline `Naskah`.
Seluruhnya harus dibaca sebagai target layout preview web, bukan janji bahwa hasilnya akan identik 100% dengan export final.

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

### D-054: Section Ditahan Jika Artifact Belum Cukup Rapi Untuk Dikompilasi

Status: active

Keputusan:
- jika artifact yang sudah tervalidasi belum cukup rapi untuk dikompilasi menjadi section `Naskah`, section tersebut ditahan dulu
- section itu tidak dimasukkan ke `Naskah` sampai memenuhi syarat kompilasi yang layak
- fase awal tidak menampilkan hasil kompilasi apa adanya jika kualitas strukturnya belum memadai
- penilaian layak atau tidaknya kompilasi harus deterministik di level compiler guard, bukan judgment manual yang kabur
- "cukup rapi" berarti section punya content wajib yang sudah tervalidasi, heading valid, dan bisa dirender tanpa placeholder atau structural error yang membuat layout paper pecah

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
- preview web dan export final boleh memakai renderer yang berbeda selama hasilnya konsisten pada urutan section, semantics layout, dan copy status
- target ini adalah target kualitas, bukan kontrak pixel-perfect atau page-perfect

Alasan:
- menjaga value utama fitur sebagai preview paper yang terasa nyata
- menghindari janji presisi absolut yang belum realistis
- tetap memberi target kualitas yang tinggi untuk pengalaman preview

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

### O-015: Copy Final Untuk Badge Dan Info Text Status Naskah

Status: resolved with implementation dependency

Jawaban:
- copy badge status: `Bertumbuh`
- copy info text pendek: `Naskah sedang bertumbuh seiring section tervalidasi.`
- catatan: ini valid sebagai copy, tetapi belum otomatis berarti state update atau snapshot sudah ada di codebase

### O-017: Label Opsi Format Di Dropdown Export

Status: resolved with implementation dependency

Jawaban:
- opsi format tetap ditulis simpel sebagai `PDF` dan `DOCX`
- status parsial cukup dikomunikasikan melalui header
- catatan: label ini hanya aman kalau export `Naskah` sudah benar-benar tersedia

### O-016: Format Teks Jumlah Halaman Di Header

Status: resolved

Jawaban:
- jumlah halaman ditampilkan sebagai `Estimasi X halaman`
- catatan: angka ini tetap estimasi, bukan kepastian final

### O-012: Bentuk Penyajian Elemen Header Naskah

Status: resolved with implementation dependency

Jawaban:
- header memakai susunan dua baris
- baris pertama memuat identitas `Naskah` dan judul paper
- baris kedua memuat badge status, info text, dan estimasi halaman
- area aksi berada di sisi kanan
- `Naskah` tampil sebagai label kecil di atas judul paper
- catatan: ini adalah target layout, bukan bukti bahwa komponen header sudah ada di codebase

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
- catatan: mapping ini harus dibaca bersama compiler, bukan hanya sebagai label UI

### O-014: Apakah Sidebar Perlu Menunjukkan Section Aktif Saat Scroll

Status: resolved with implementation dependency

Jawaban:
- sidebar menyorot section yang sedang aktif di viewport saat user scroll
- catatan: keputusan ini mengandaikan sidebar outline sudah ada

### O-006: Bentuk Keterangan Bahwa Naskah Masih Bertumbuh

Status: resolved with implementation dependency

Jawaban:
- keterangan bahwa `Naskah` masih bertumbuh ditampilkan di header
- bentuknya berupa kombinasi badge status `Bertumbuh` dan info text `Naskah sedang bertumbuh seiring section tervalidasi.`
- daftar section tetap tampil sebagai navigasi di sidebar kiri, bukan sebagai panel status terpisah
- catatan: ini valid pada level intent, tetapi belum didukung state update yang eksplisit di codebase

### O-007: Bentuk Label Export Parsial

Status: resolved with implementation dependency

Jawaban:
- status parsial export digabung dengan status umum bahwa naskah masih bertumbuh
- catatan: ini menunggu jalur export parsial yang berbeda dari completed-only export sekarang

### O-008: Bagaimana Mengomunikasikan Perubahan Setelah Refresh

Status: resolved with implementation dependency

Jawaban:
- setelah user memuat update, section yang berubah diberi highlight sementara
- catatan: ini membutuhkan compiled snapshot yang bisa dibandingkan sebelum dan sesudah refresh

### O-009: Bentuk UI Status Bertumbuh

Status: resolved with implementation dependency

Jawaban:
- status utama ditampilkan di header sebagai kombinasi badge kecil dan info text pendek
- catatan: keputusan UI ini bergantung pada state dokumen yang eksplisit

### O-010: Bentuk UI Indikator Update Di Halaman Naskah

Status: resolved with implementation dependency

Jawaban:
- indikator update berbentuk banner tipis di area header
- CTA refresh `Update` ditempatkan di indikator yang sama

### O-011: Bentuk Notifikasi Update Pada Tombol Naskah Di Topbar Chat

Status: resolved with implementation dependency

Jawaban:
- notifikasi update pada tombol `Naskah` ditampilkan sebagai titik kecil

## Deferred Or Rejected Directions

### R-001: Naskah Editable Sejak Awal

Status: deferred

Tidak dipilih untuk fase awal karena:
- memicu konflik sinkronisasi
- memunculkan masalah compliance terhadap artifact
- membutuhkan model data tambahan untuk hasil edit manual
- model sinkronisasi `Naskah` ke artifact juga belum ada, jadi risiko divergensinya masih terlalu tinggi

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
- jika sebuah keputusan sudah tidak selaras dengan codebase, tandai statusnya secara eksplisit sebagai `deferred`, `blocked by architecture`, atau revisi lain yang setara

## Change Log

### 2026-04-09

- Dokumen keputusan awal dibentuk dari pemisahan konteks stabil dan keputusan iteratif untuk fitur `Naskah`.
- Arah utama yang dicatat pada batch awal: `Naskah` sebagai workspace read-only terpisah, bertumbuh dari section tervalidasi, memakai struktur paper final, dan memiliki presentasi paper-oriented dengan sidebar, header status, dan preview paged.
- Batch ini juga memuat keputusan awal tentang mapping stage ke section akademik, title page, status bertumbuh, refresh manual, dan arah export parsial sebelum seluruhnya diuji ulang ke codebase.

### 2026-04-10

- Dokumen keputusan direvisi agar selaras dengan audit codebase terbaru
- Diperjelas: source compile fase 1 `Naskah` dibaca dari artifact tervalidasi yang direferensikan oleh `stageData`, bukan dari `stageData` sebagai isi final
- Diperjelas: update pending didefinisikan sebagai mismatch compiled revision terbaru vs revision yang terakhir dimuat user
- Diperjelas: export existing masih completed-only dan belum mendukung export parsial untuk `Naskah`
- Ditutup: state khusus `Naskah` seperti availability, compiled snapshot, viewed revision, dan `update pending` sudah diimplementasikan untuk fase 1
- Ditutup: topbar, route `Naskah`, manual refresh, dan highlight pasca-refresh sudah diimplementasikan untuk fase 1
- Diperjelas: `validatedAt` adalah fondasi paling nyata untuk pertumbuhan section
- Diperjelas: compile guard `cukup rapi` harus deterministik dan menolak placeholder atau structural error
- Diperbarui: beberapa keputusan UI dan export ditandai dengan dependency atau diturunkan menjadi deferred bila belum supported oleh arsitektur sekarang
