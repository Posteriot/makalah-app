Konteks Fitur Naskah

  Dokumen ini merangkum pemahaman dari percakapan di .worktrees\naskah-feature\docs\naskah-feature\chat.txt. Isinya bukan keputusan implementasi final
  seluruh sistem, tapi keputusan konsep yang sudah mengerucut dari diskusi tersebut dan bisa dipakai sebagai baseline konteks untuk iterasi berikutnya.

  Ringkasan Inti

  Fitur yang sedang dibahas pada dasarnya adalah naskah: sebuah workspace terpisah dari artifact biasa untuk menampilkan paper utuh hasil kompilasi dari
  artifact-artifact yang sudah final atau tervalidasi. Arah akhirnya bukan editor baru, tetapi preview paper akademik utuh yang read-only pada fase awal,
  lengkap dengan layout A4, estimasi pagination, dan export PDF/DOCX.

  Istilah awal yang dipakai dalam percakapan adalah dokumen utama, tetapi arah konsep di ujung diskusi jelas mengerucut ke naskah sebagai workspace khusus
  yang terpisah dari artifact biasa. Jadi untuk konteks berjalan, yang lebih tepat dipakai sebagai istilah kerja adalah naskah, sambil tetap sadar bahwa di
  percakapan istilah awalnya memang dokumen utama.

  Tujuan Produk

  Tujuan fitur ini adalah menutup gap penting di flow yang ada sekarang: user bisa menghasilkan dan memvalidasi artifact per stage, tetapi belum punya
  tempat untuk melihat keseluruhan paper sebagai satu naskah utuh selama proses berlangsung.

  Fitur naskah dimaksudkan agar user bisa:

  - melihat paper utuh hasil gabungan konten yang sudah final/validated
  - melihat hasil paper dalam format yang mendekati dokumen akademik nyata
  - memahami kira-kira berapa halaman hasil paper tersebut
  - mengekspor hasilnya ke PDF atau DOCX

  Dengan kata lain, artifact melayani kerja modular per bagian, sedangkan naskah melayani pembacaan holistik paper sebagai satu kesatuan.

  Cakupan Area Produk Yang Dibahas

  Percakapan secara eksplisit memposisikan diskusi ini pada tiga area:

  - chat window
  - artifact
  - validation panel

  Artinya, fitur naskah bukan dibahas sebagai halaman terisolasi yang berdiri sendiri, tetapi sebagai bagian dari ekosistem kerja yang sudah ada di halaman
  chat. Jadi penilaiannya sejak awal memang terkait bagaimana ia hidup berdampingan dengan workflow chat, review artifact, dan approval per stage.

  Gagasan Awal Yang Diajukan

  Ide awal user adalah menambahkan fitur yang:

  - tampil dan bekerja seperti MS Word atau Google Docs
  - berisi kumpulan konten yang dicopy/diambil dari artifact yang sudah tervalidasi atau final
  - bisa dipakai untuk melihat keseluruhan paper
  - menampilkan paper jadi dalam format A4 dan spasi 1,5
  - membantu user mengetahui jumlah halaman hasil paper
  - memungkinkan edit manual
  - bisa diunduh sebagai PDF atau DOCX

  Jadi premis awalnya cukup ambisius: bukan cuma preview paper, tapi sempat dibayangkan sebagai editor final paper juga.

  Evaluasi Awal Terhadap Ide

  Respon awal di percakapan menyatakan bahwa ide ini layak dan punya nilai produk kuat. Alasannya karena memang ada kebutuhan nyata: user butuh melihat
  paper utuh, bukan cuma artifact terpisah per tahap.

  Namun, sejak awal juga ditegaskan bahwa struktur sistem saat ini belum dirancang untuk satu naskah komposit lintas stage. Workflow yang ada masih sangat
  artifact/stage oriented. Ini penting karena sejak titik ini arah diskusi bukan sekadar “fiturnya bagus atau tidak”, tapi “fitur ini bisa masuk dengan
  sehat ke arsitektur yang sekarang atau tidak”.

  Fondasi Teknis Yang Sudah Ada

  Percakapan menilai bahwa fondasi teknis dasar untuk fitur ini sebenarnya sudah tersedia, yaitu:

  - library editor sudah ada lewat TipTap
  - export DOCX dan PDF A4 secara server-side sudah ada
  - compiler paper dari stageData juga sudah ada

  Maknanya: sistem belum punya fitur naskah, tapi tidak mulai dari nol. Sudah ada bahan dasar yang bisa dipakai untuk menyusun preview paper dan export.

  Gap Teknis Yang Diidentifikasi

  Walaupun fondasinya ada, percakapan menandai beberapa gap besar:

  - export saat ini hanya valid untuk session yang completed
  - tombol DOCX/PDF di artifact viewer secara praktis belum export benar, masih download .md
  - compiler export mengambil data dari stageData, bukan dari hasil edit manual di dokumen/naskah baru

  Gap ini penting karena menunjukkan bahwa “preview paper utuh” relatif lebih dekat ke sistem yang ada, sedangkan “editor paper final yang bisa diedit
  manual lalu diexport” langsung membuka masalah model data dan source of truth.

  Opsi Desain Yang Sempat Dipertimbangkan

  Percakapan sempat mengurai tiga pendekatan:

  1. compiled preview only
  2. editable main document, one-way sync from approved stages
  3. bi-directional sync

  Pada titik awal diskusi, opsi yang direkomendasikan sempat condong ke dokumen editable dengan sinkronisasi satu arah dari stage approved. Artinya, konten
  approved masuk ke dokumen gabungan, lalu user boleh mengedit manual di sana.

  Tetapi rekomendasi ini belum final. Seiring diskusi lanjut, model ini diuji terhadap masalah sinkronisasi dan compliance.

  Masalah Paling Penting Yang Muncul: Compliance

  Pertanyaan paling penting dari user adalah: kalau area paper utuh itu diedit, berarti dia tidak lagi compliant dengan artifact?

  Di sinilah diskusi bergeser dari “bisa dibuat atau tidak” ke “siapa source of truth sebenarnya”.

  Jawaban di percakapan mengakui secara langsung:

  - iya, kalau hasil gabungan itu diedit manual, dia tidak lagi 100% compliant dengan artifact sumber

  Dari sini lahir insight kunci:

  - kalau user bebas edit di area paper utuh, maka sinkronisasi dengan artifact jadi sulit
  - kalau tetap dipaksa compliant, edit manual harus dilarang atau sangat dibatasi
  - kalau perubahan dari area paper utuh harus di-apply-back ke artifact, kompleksitas conflict akan tinggi

  Ini menjadi titik balik utama dalam arah desain.

  Arah Sinkronisasi Yang Dinilai Paling Masuk Akal

  Setelah user menolak ide apply back dan menyatakan bahwa justru lebih mudah kalau artifact yang diedit lalu hasil gabungan menyesuaikan, percakapan
  mengerucut ke model yang lebih masuk akal:

  - artifact -> naskah

  Bukan:

  - naskah -> artifact
  - atau sinkronisasi dua arah

  Makna keputusan ini:

  - artifact tetap jadi unit kerja utama
  - artifact tetap jadi source of truth
  - hasil gabungan paper cukup menjadi compiled view dari artifact-artifact yang relevan

  Ini secara drastis menurunkan kompleksitas desain.

  Keputusan Konsep Yang Akhirnya Dipilih

  Setelah membahas compliance dan arah sinkronisasi, diskusi mengarah ke keputusan konseptual berikut:

  - artifact tetap menjadi tempat edit
  - area paper utuh tidak editable dulu pada fase awal
  - area paper utuh itu hanya berfungsi untuk melihat hasil naskah lengkap
  - area tersebut tetap harus menampilkan format akademik yang relevan
  - area tersebut harus menunjukkan pagination/estimasi halaman
  - area tersebut menjadi basis export PDF/DOCX

  Ini berarti ide awal “mirip Word/Google Docs yang editable” diturunkan menjadi fase awal yang lebih sempit, lebih realistis, dan lebih bersih:
  preview naskah read-only yang compiled dari artifact

  Makna Read-Only Di Fase Awal

  Keputusan read-only bukan berarti editing final ditolak selamanya, tapi berarti:

  - fase awal diprioritaskan untuk menyelesaikan model source of truth dan sinkronisasi dasar
  - editing tetap dipusatkan di artifact
  - naskah berfungsi sebagai presentasi terkompilasi dari isi final, bukan tempat authoring utama

  Jadi read-only di sini adalah strategi pengurangan kompleksitas, bukan penolakan mutlak terhadap kemungkinan editing di masa depan.

  Penegasan Penting Soal Renderer

  Ada klarifikasi teknis yang sangat penting dalam percakapan:
  user menyebut kemungkinan markdown renderer yang compliant dengan format akademik. Tetapi jawaban di percakapan menegaskan bahwa markdown renderer biasa
  tidak cukup.

  Yang dibutuhkan sebenarnya adalah:

  - paginated A4 preview
  - style rules khusus akademik
  - mapping heading, paragraf, tabel, kutipan, daftar pustaka, spacing, dan struktur lain ke format paper

  Jadi bentuk teknis yang dibahas bukan:

  - render markdown apa adanya

  Melainkan:

  - render naskah akademik hasil kompilasi dari artifact content dengan aturan tampilan paper

  Ini penting sebagai guardrail implementasi. Kalau nanti iterasi produk menyebut “renderer naskah”, yang dimaksud bukan sekadar komponen markdown preview
  generik.

  Posisi Fitur Naskah Dalam Mental Model UX

  Percakapan sangat jelas membedakan fungsi artifact dan naskah.

  Artifact workspace:

  - modular
  - per bagian/per stage
  - tempat kerja, review, dan edit isi

  Naskah workspace:

  - holistik
  - melihat paper utuh
  - fokus pada presentasi dalam format akademik
  - bukan tempat produksi utama konten pada fase awal

  Pemisahan mental model ini dianggap penting agar user tidak bingung antara:

  - blok konten modular
  - naskah final utuh

  Keputusan UX Yang Mengunci Bentuk Fitur

  Di bagian akhir percakapan, user menyatakan bahwa ia ingin ini menjadi mode/workspace terpisah dari artifact biasa.

  Jawaban di percakapan menegaskan bahwa ini adalah pilihan yang lebih tepat daripada menjadikannya tab baru di area artifact.

  Alasan yang diberikan:

  - artifact workspace tetap modular
  - naskah workspace bersifat holistik
  - mental model user jadi lebih jelas
  - secara teknis lebih bersih daripada memaksa panel artifact yang sekarang menjadi viewer paper penuh

  Jadi salah satu keputusan terkuat dari percakapan ini adalah:
  naskah harus hadir sebagai workspace/mode terpisah, bukan tab tambahan di artifact panel

  Definisi Konseptual Fitur Naskah Setelah Diskusi

  Kalau disusun sebagai definisi kerja, maka naskah pada hasil diskusi ini adalah:

  Sebuah workspace terpisah dari artifact biasa yang menampilkan paper akademik utuh hasil kompilasi dari artifact yang sudah final/validated, bersifat
  read-only pada fase awal, auto-update mengikuti perubahan artifact yang relevan, menampilkan pagination/estimasi halaman, dan menjadi basis export PDF/
  DOCX.

  Definisi ini paling setia dengan arah akhir percakapan.

  Source Of Truth Yang Disepakati

  Percakapan secara implisit dan eksplisit mengunci ini:

  - artifact final/validated adalah sumber isi
  - naskah adalah compiled presentation dari sumber tersebut

  Ini berarti:

  - kebenaran isi tidak berpindah ke naskah
  - validasi tetap berakar pada artifact/stage
  - naskah bukan authority baru untuk content editing pada fase awal

  Implikasi Ke Validation Panel

  Walaupun tidak dibedah implementasinya secara rinci, percakapan memberi posisi yang jelas:

  - validation panel tetap fokus pada approve/revisi per stage
  - validation panel tidak dibebani urusan formatting akhir naskah

  Jadi keberadaan naskah tidak dimaksudkan menggantikan flow validasi yang ada. Ia berada di atas hasil validasi tersebut sebagai presentasi gabungan.

  Implikasi Ke Chat Window

  Percakapan juga mempertahankan peran chat window:

  - chat tetap jadi tempat diskusi dan approval
  - naskah bukan pengganti chat
  - naskah adalah workspace tambahan/terpisah untuk melihat hasil utuh

  Artinya, naskah tidak memindahkan pusat interaksi ke editor, tetapi menambah lapisan pembacaan paper secara menyeluruh.

  Implikasi Ke Artifact

  Artifact tetap diposisikan sebagai:

  - output per tahap
  - unit yang bisa diedit
  - sumber data yang dipakai untuk membangun naskah

  Ini penting karena seluruh kesimpulan percakapan justru lahir dari keputusan untuk mempertahankan artifact sebagai pusat authoring modular.

  Ekspektasi Terhadap Pagination

  Percakapan memberi catatan yang sehat soal halaman:

  - jumlah halaman di preview web sebaiknya dianggap estimasi yang sangat dekat
  - jangan diasumsikan otomatis 100% identik dengan Word/PDF final kecuali preview engine sangat diketatkan mengikuti engine export

  Ini penting untuk dokumentasi konteks, supaya iterasi berikutnya tidak membuat klaim berlebihan soal akurasi page count di UI web.

  Risiko Utama Yang Sudah Teridentifikasi

  Risiko yang muncul dalam percakapan:

  - kalau suatu saat naskah dibuat editable, akan ada konflik sinkronisasi
  - struktur artifact belum tentu selalu cukup rapi untuk dipetakan otomatis ke bagian naskah
  - preview halaman web tidak otomatis identik dengan hasil export final
  - pengalaman editor Word-like penuh akan menambah effort frontend secara signifikan

  Walaupun sebagian risiko ini berhubungan dengan pendekatan editable yang akhirnya ditunda, daftar ini tetap penting sebagai konteks karena menunjukkan
  kenapa keputusan read-only di fase awal dianggap paling waras.

  Evolusi Keputusan Dalam Percakapan

  Agar mudah dipakai pada iterasi berikutnya, evolusi berpikir di percakapan bisa diringkas begini:

  1. Ide awal: buat area paper utuh yang mirip Word/Docs dan editable.
  2. Evaluasi awal: idenya layak, fondasi teknis dasar ada.
  3. Konflik muncul: kalau editable, compliance dengan artifact jadi bermasalah.
  4. Apply-back dinilai terlalu rumit.
  5. Arah sinkronisasi yang lebih sehat adalah dari artifact ke hasil gabungan.
  6. Karena itu, fase awal terbaik adalah membuat naskah sebagai compiled preview yang read-only.
  7. Bentuk UX terbaiknya adalah workspace terpisah dari artifact biasa.

  Urutan ini penting karena menjelaskan kenapa keputusan akhirnya tidak sama dengan ide awal.

  Keputusan Yang Sudah Cukup Kuat Dari Percakapan

  Hal-hal yang bisa dianggap sudah cukup kuat sebagai konteks kerja:

  - fitur yang dibahas adalah naskah
  - naskah berfungsi untuk melihat paper utuh hasil kompilasi artifact final/validated
  - source of truth tetap di artifact
  - editing tetap di artifact pada fase awal
  - naskah read-only pada fase awal
  - naskah harus memakai preview akademik A4, bukan markdown viewer biasa
  - naskah perlu menunjukkan estimasi/pagination halaman
  - naskah menjadi basis export PDF/DOCX
  - naskah harus hadir sebagai mode/workspace terpisah dari artifact biasa

  Hal Yang Masih Belum Diputuskan

  Di akhir percakapan, ada satu pertanyaan yang belum terjawab:

  - apakah workspace naskah dibuka berdampingan dengan chat
  - atau menggantikan workspace artifact saat mode naskah aktif

  Jadi ini adalah salah satu unresolved decision yang penting untuk iterasi UX berikutnya.

  Asumsi Yang Harus Dijaga

  Ada beberapa hal yang sebaiknya diperlakukan sebagai asumsi kerja, bukan fakta final:

  - istilah dokumen utama adalah label awal diskusi, sedangkan istilah kerja yang lebih tepat untuk arah akhir adalah naskah
  - editable naskah belum dipilih untuk fase awal, tapi bukan berarti mustahil untuk fase berikutnya
  - akurasi pagination web ke output final belum boleh diasumsikan sempurna