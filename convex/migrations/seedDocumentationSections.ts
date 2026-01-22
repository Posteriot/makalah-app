import { internalMutation } from "../_generated/server"

type DocListItem = {
  text: string
  subItems?: string[]
}

type DocList = {
  variant: "bullet" | "numbered"
  items: DocListItem[]
}

type DocBlock =
  | {
      type: "infoCard"
      title: string
      description?: string
      items: string[]
    }
  | {
      type: "ctaCards"
      items: Array<{
        title: string
        description: string
        targetSection: string
        ctaText: string
        icon?: string
      }>
    }
  | {
      type: "section"
      title: string
      description?: string
      paragraphs?: string[]
      list?: DocList
    }

type DocumentationSectionSeed = {
  slug: string
  title: string
  group: string
  order: number
  icon?: string
  headerIcon?: string
  summary?: string
  blocks: DocBlock[]
  isPublished: boolean
}

const DEFAULT_DOCUMENTATION_SECTIONS: DocumentationSectionSeed[] = [
  {
    slug: "welcome",
    title: "Selamat Datang",
    group: "Mulai",
    order: 1,
    icon: "BookOpen",
    headerIcon: "Lightbulb",
    summary:
      "Makalah AI membantu Anda menyusun makalah akademik secara end-to-end melalui percakapan yang terarah. Alur kerja mengikuti tujuh fase akademik (dari penetapan topik hingga finalisasi), dengan antarmuka yang tetap sederhana: Anda berdiskusi, AI merespons, dan progres tersimpan otomatis.",
    blocks: [
      {
        type: "infoCard",
        title: "Apa yang dapat dilakukan?",
        description: "Fokus pada kualitas isi; pemrosesan dibantu AI.",
        items: [
          "**Chat akademik** - diskusi topik, memperjelas pertanyaan riset (RQ), hingga penulisan per bagian.",
          "**Kerangka tujuh fase** - AI membantu menjaga alur kerja agar tetap terstruktur dan tidak melompat-lompat.",
          "**Pencarian web (otomatis)** - bila diperlukan dan didukung penyedia, AI menelusuri informasi eksternal yang relevan.",
        ],
      },
      {
        type: "ctaCards",
        items: [
          {
            title: "Panduan Cepat",
            description: "Mulai menyusun draf pertama dalam 5 menit.",
            targetSection: "quickstart",
            ctaText: "Mulai Sekarang",
            icon: "Zap",
          },
          {
            title: "7 Fase Penulisan",
            description: "Metode kerja yang digunakan Makalah AI.",
            targetSection: "workflow",
            ctaText: "Pelajari Lebih Lanjut",
            icon: "BookOpen",
          },
        ],
      },
    ],
    isPublished: true,
  },
  {
    slug: "installation",
    title: "Memulai",
    group: "Mulai",
    order: 2,
    icon: "Settings",
    summary:
      "Bagian ini menjelaskan alur autentikasi (auth) secara formal: cara mendaftar, cara masuk, titik masuk (\"Masuk\" di header, tombol pada kartu harga, dan tombol \"Ngobrol dengan Agen\"), serta pengalihan setelah autentikasi.",
    blocks: [
      {
        type: "section",
        title: "Ringkasan Alur",
        description:
          "Autentikasi diperlukan untuk menyimpan percakapan dan preferensi Anda.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Platform menggunakan autentikasi berbasis email dan kata sandi.",
            },
            {
              text: "Tautan verifikasi serta pemulihan kata sandi dikirim melalui email.",
            },
            {
              text: "Setelah berhasil masuk, Anda dialihkan ke halaman tujuan (Chat secara default).",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Titik Masuk Autentikasi",
        description: "Tiga cara menuju halaman autentikasi.",
        list: {
          variant: "numbered",
          items: [
            {
              text: "Tombol **Masuk** di header situs.",
              subItems: [
                "Pada halaman publik (mis. beranda, dokumentasi), sistem menambahkan parameter `redirectTo` sehingga setelah autentikasi Anda kembali ke halaman semula.",
                "Pada halaman non-publik, Anda diarahkan ke halaman autentikasi tanpa parameter tambahan.",
              ],
            },
            {
              text: "Tombol CTA pada **kartu harga** di halaman Harga.",
              subItems: [
                "Tombol mengarahkan ke halaman `/auth`. Setelah berhasil masuk, sistem akan mengarahkan Anda ke halaman Chat secara default.",
              ],
            },
            {
              text: "Tombol **Ngobrol dengan Agen** di beranda.",
              subItems: [
                "Jika Anda belum masuk, Anda diarahkan ke `/auth?redirectTo=/chat` agar setelah autentikasi langsung masuk ke Chat.",
                "Jika sudah masuk, tombol membawa Anda langsung ke halaman Chat.",
              ],
            },
          ],
        },
      },
      {
        type: "section",
        title: "Pendaftaran Akun Baru",
        description: "Registrasi dua tahap dengan verifikasi email.",
        list: {
          variant: "numbered",
          items: [
            {
              text: "Buka halaman `/auth`, lalu pilih mode Daftar (atau akses `/auth?tab=register`).",
            },
            {
              text: "Isi tahap 1: email, kata sandi, dan konfirmasi kata sandi.",
            },
            {
              text: "Isi tahap 2: nama depan, nama belakang, dan predikat (jika diminta).",
            },
            {
              text: "Setelah mengirim, sistem akan mengirim email verifikasi. Buka tautan pada email tersebut untuk mengaktifkan akun.",
            },
            {
              text: "Setelah verifikasi berhasil, kembali ke halaman `/auth` untuk masuk.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Masuk ke Akun",
        description: "Pengalihan sesudah autentikasi mengikuti parameter yang aman.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Masukkan email dan kata sandi pada halaman `/auth`. Opsi \"ingat saya\" memperpanjang sesi pada perangkat yang sama.",
            },
            {
              text: "Jika URL menyertakan `redirectTo` yang valid, sistem akan mengarahkan Anda ke alamat tersebut setelah masuk.",
            },
            {
              text: "Jika tidak ada `redirectTo`, tujuan default adalah halaman `/chat`.",
            },
            {
              text: "Jika akun belum terdaftar atau nonaktif, halaman akan menampilkan ajakan untuk mendaftar.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Pemulihan Kata Sandi",
        description: "Atur ulang kata sandi melalui tautan email.",
        list: {
          variant: "numbered",
          items: [
            {
              text: "Pada halaman `/auth`, pilih tautan \"Lupa password\".",
            },
            {
              text: "Masukkan email Anda; sistem akan mengirimkan tautan pemulihan ke kotak masuk.",
            },
            {
              text: "Buka tautan tersebut untuk membuat kata sandi baru, lalu kembali ke halaman `/auth` untuk masuk.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Keluar (Logout)",
        description: "Berakhirkan sesi dari menu profil.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Gunakan menu profil di header untuk keluar.",
            },
            {
              text: "Setelah keluar, Anda akan diarahkan ke halaman `/auth`.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Catatan Keamanan",
        description: "Praktik baik dalam menggunakan akun.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Jangan pernah membagikan kredensial di ruang publik mana pun.",
            },
            {
              text: "Gunakan perangkat pribadi dan perbarui kata sandi secara berkala.",
            },
            {
              text: "Jika mencurigai akses tidak sah, segera reset kata sandi dan keluar dari semua perangkat.",
            },
          ],
        },
      },
    ],
    isPublished: true,
  },
  {
    slug: "quickstart",
    title: "Panduan Cepat",
    group: "Mulai",
    order: 3,
    icon: "Zap",
    summary:
      "Langkah ringkas untuk beralih dari topik ke draf akademik yang siap ditinjau.",
    blocks: [
      {
        type: "section",
        title: "1) Inisialisasi percakapan",
        description: "Nyatakan tujuan, ruang lingkup, dan batasan.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Sebutkan topik, rumusan masalah/pertanyaan riset, audiens, panjang, gaya, dan metode yang diinginkan.",
            },
            {
              text: "Bila ada sumber wajib, cantumkan daftar awalnya.",
            },
            {
              text: "Contoh instruksi awal: \"Tujuan: menyusun makalah tentang X. Audiens: dosen dan mahasiswa. Gaya: Bahasa Indonesia formal. Panjang: 1200-1500 kata. Harap arahkan langkah demi langkah.\"",
            },
          ],
        },
      },
      {
        type: "section",
        title: "2) Susun dan kunci outline",
        description: "Fase perencanaan struktur.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Minta 2-3 alternatif outline beserta justifikasi setiap bagian.",
            },
            {
              text: "Revisi hingga sesuai; kunci struktur sebelum drafting.",
            },
            {
              text: "Contoh: \"Ajukan 2 alternatif outline dengan alasan, lalu rekomendasikan satu yang paling kuat.\"",
            },
          ],
        },
      },
      {
        type: "section",
        title: "3) Draft per bagian",
        description: "Tuliskan isi dengan Bahasa Indonesia formal.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Tulis per bagian (Pendahuluan -> Tinjauan Pustaka -> Metodologi -> ...) dengan target kata yang jelas.",
            },
            {
              text: "Sertakan sitasi inline berbentuk tautan markdown bila merujuk sumber.",
            },
            {
              text: "Contoh: \"Tulis Pendahuluan 500-700 kata, beri sitasi inline yang relevan, tandai klaim yang butuh data primer.\"",
            },
          ],
        },
      },
      {
        type: "section",
        title: "4) Sumber dan sitasi",
        description: "Gunakan sumber bereputasi; ringkas referensi.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Jika perlu, minta gunakan web search untuk melacak sumber terbaru (bergantung dukungan penyedia).",
            },
            {
              text: "Prioritaskan sumber bereputasi: jurnal bereview sejawat, konferensi, .gov, .edu, lembaga resmi.",
            },
            {
              text: "Tambahkan bagian \"REFERENCES\" berisi daftar: \"- [Judul/Organisasi](URL) - ringkasan satu kalimat\".",
            },
            {
              text: "Larangan sitasi fiktif: verifikasi tautan sebelum final.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "5) Integrasi, tinjau, finalisasi",
        description: "Harmonisasi gaya dan akurasi argumen.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Minta harmonisasi antarbagian agar alur logis dan konsisten.",
            },
            {
              text: "Jalankan pemeriksaan mutu: konsistensi istilah, koherensi argumen, penanda ketidakpastian, etika dan anti-plagiarisme.",
            },
            {
              text: "Finalisasi format dan siapkan paket pengumpulan (bila diperlukan).",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Tips cepat",
        description: "Mempercepat iterasi tanpa mengorbankan mutu.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Nyatakan batasan sejak awal (gaya, panjang, standar sitasi) agar hasil konsisten.",
            },
            {
              text: "Minta AI menandai klaim lemah/berisiko dan sarankan perbaikan.",
            },
            {
              text: "Bila perlu data eksternal, sebutkan: \"boleh gunakan web search dan cantumkan sumbernya\".",
            },
          ],
        },
      },
    ],
    isPublished: true,
  },
  {
    slug: "concepts",
    title: "Konsep Dasar",
    group: "Mulai",
    order: 4,
    icon: "FileText",
    summary:
      "Gambaran kerja Makalah AI dalam bahasa yang praktis untuk pengguna akhir-berpatokan pada pedoman internal, tapi fokus ke cara pakai nyata di chat.",
    blocks: [
      {
        type: "section",
        title: "Cara Kerja Singkat",
        paragraphs: [
          "Anda berinteraksi lewat chat. Satu percakapan mewakili satu pekerjaan (mis. makalah/bab). Anda menjelaskan tujuan dan batasan; AI menyarankan, menyusun, dan menulis draf sesuai arahan Anda. Progres tersimpan dan bisa dilanjutkan kapan saja.",
          "Tujuh fase penulisan (dari pendefinisian topik hingga finalisasi) dipakai sebagai pedoman agar alur tetap rapi, tanpa membatasi kebebasan chat.",
        ],
      },
      {
        type: "section",
        title: "Alur di Dalam Chat",
        paragraphs: [
          "Alur umum yang disarankan: tetapkan konteks -> minta outline -> tulis draf per bagian -> integrasi dan harmonisasi -> finalisasi. Selama proses, minta alternatif, ajukan revisi, dan pastikan keputusan kunci dicatat di percakapan.",
        ],
      },
      {
        type: "section",
        title: "Istilah Penting",
        paragraphs: [
          "Percakapan (riwayat kerja), Pesan (instruksi/hasil), Outline (kerangka), Draf (isi sementara), Sumber (referensi), Sitasi inline (tautan markdown pada kalimat), dan References (daftar ringkas di akhir).",
        ],
      },
      {
        type: "section",
        title: "Sumber dan Sitasi",
        paragraphs: [
          "Saat perlu, minta AI menggunakan web search. Utamakan jurnal bereview sejawat, konferensi bereputasi, dan domain resmi (.gov, .edu, lembaga). Dilarang sitasi palsu-verifikasi tautan sebelum final.",
          "Gunakan sitasi inline berbentuk tautan markdown dalam tanda kurung. Tambahkan bagian \"REFERENCES\" dengan format \"- [Judul/Organisasi](URL) - ringkasan satu kalimat\".",
        ],
      },
      {
        type: "section",
        title: "Peran Pengguna vs AI",
        paragraphs: [
          "AI mengeksekusi dan mengusulkan, tetapi keputusan akademik tetap pada Anda. Minta AI menandai klaim lemah/berisiko, memberi opsi perbaikan, dan menyebut ketidakpastian bila ada.",
        ],
      },
      {
        type: "section",
        title: "Penyimpanan dan Privasi",
        paragraphs: [
          "Riwayat percakapan disimpan untuk kelanjutan pekerjaan. Hindari menempatkan rahasia yang sangat sensitif di chat. Rincian lebih lanjut tersedia di bagian Keamanan Data.",
        ],
      },
      {
        type: "section",
        title: "Ke Mana Setelah Ini?",
        paragraphs: [
          "Lihat \"Memulai\" untuk autentikasi dan \"Panduan Cepat\" untuk langkah eksekusi dari topik ke draf. Butuh panduan metodologi? Buka \"7 Fase Penulisan\".",
        ],
      },
    ],
    isPublished: true,
  },
  {
    slug: "chat-agent",
    title: "Chat dengan AI",
    group: "Fitur Utama",
    order: 5,
    icon: "Users",
    summary:
      "Fokus di sini: cara kerja antarmuka chat, fitur yang tersedia, dan hal teknis yang perlu diketahui pengguna saat menulis draf.",
    blocks: [
      {
        type: "section",
        title: "Percakapan dan Riwayat",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Mulai dari menu **Chat** -> \"Percakapan Baru\", atau lanjutkan percakapan yang ada dari sidebar.",
            },
            {
              text: "Ubah judul percakapan secara inline di sidebar; gunakan kolom **Cari percakapan...** untuk memfilter.",
            },
            {
              text: "Riwayat dimuat bertahap; klik \"Muat lebih banyak\" bila perlu. Hapus percakapan lewat dialog konfirmasi.",
            },
            {
              text: "Pembuatan percakapan dipastikan sebelum pesan pertama dikirim, sehingga aman jika halaman direfresh saat streaming.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Mengirim Pesan",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Ketik pesan di area input lalu kirim. Selama streaming, tombol **Stop** tersedia untuk menghentikan respons.",
            },
            {
              text: "Gunakan **Regenerasi respons** pada balasan AI bila butuh versi alternatif, atau **Salin** untuk menyalin teks.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Lampiran File",
        description: "Anda dapat menambahkan lampiran melalui tombol tambah di toolbar input.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Maksimal 5 file, ukuran per file hingga 10MB.",
            },
            {
              text: "Tipe yang didukung: gambar (image/*), teks (text/*), PDF (.pdf), dan dokumen (.doc, .docx).",
            },
            {
              text: "Gambar akan dipratinjau; berkas lain ditampilkan sebagai kartu informasi.",
            },
            {
              text: "Peringatan: isi file tidak otomatis diproses sebagai konteks penuh. Untuk akurasi, rangkum poin penting dari file dalam pesan Anda.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Menyunting Pesan",
        description: "Pesan pengguna dapat disunting setelah terkirim.",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Aktifkan **Edit** pada pesan pengguna lalu simpan perubahan.",
            },
            {
              text: "Demi konsistensi percakapan, saat Anda menyimpan hasil edit, pesan setelahnya akan dipotong-percakapan berlanjut dari versi yang baru.",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Sumber dan Sitasi",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Jika penyedia mendukung, web search dapat berjalan otomatis untuk memperkaya jawaban.",
            },
            {
              text: "Sumber yang dipakai AI ditampilkan di bawah balasan. Tanda sitasi bisa muncul sebagai penanda (marker) yang dapat diklik.",
            },
            {
              text: "Verifikasi tautan sebelum final. Untuk format sitasi dan daftar referensi, lihat bagian \"Panduan Cepat\".",
            },
          ],
        },
      },
      {
        type: "section",
        title: "Tips Pemakaian",
        list: {
          variant: "bullet",
          items: [
            {
              text: "Gunakan satu percakapan per topik/tugas agar riwayat fokus dan mudah dilanjutkan.",
            },
            {
              text: "Jika respons terlalu panjang, minta ringkasan atau pecah per bagian untuk menjaga ritme iterasi.",
            },
            {
              text: "Jika perlu verifikasi, minta AI menandai klaim yang butuh data primer atau bukti tambahan.",
            },
          ],
        },
      },
    ],
    isPublished: true,
  },
  {
    slug: "workflow",
    title: "7 Fase Penulisan",
    group: "Fitur Utama",
    order: 6,
    icon: "Settings",
    summary:
      "Kerangka kerja ini jadi kompas percakapan, bukan pagar pembatas. Lu tetap bebas diskusi secara natural; fase membantu jaga arah dan kualitas.",
    blocks: [
      {
        type: "section",
        title: "Orientasi Alur",
        paragraphs: [
          "Sebelum Fase 1, boleh ada obrolan \"pre-topic\" untuk eksplorasi ide. Workflow formal dimulai saat topik mulai didefinisikan.",
        ],
      },
      {
        type: "section",
        title: "Fase 1 - Topic Clarification",
        list: {
          variant: "bullet",
          items: [
            { text: "Tujuan: mengubah ide kasar jadi topik riset yang fokus dan layak." },
            { text: "Yang terjadi: brainstorming, tanya-jawab terarah, challenge ide yang terlalu luas." },
            { text: "Peran AI: ajukan probing questions; sarankan fokus; tunjukkan trade-off." },
            { text: "Peran Anda: jelaskan konteks, batasan, dan tujuan akademik." },
            { text: "Output: resume keputusan fase (topik, batasan, asumsi awal)." },
          ],
        },
      },
      {
        type: "section",
        title: "Fase 2 - Evidence dan RQs Framing",
        list: {
          variant: "bullet",
          items: [
            { text: "Tujuan: kumpulkan bukti awal dan menetapkan Research Questions (RQ)." },
            { text: "Yang terjadi: identifikasi tema literatur, rumuskan RQ, dan temukan gap." },
            { text: "Peran AI: ringkas temuan, highlight gap, dan usulkan RQ terukur." },
            { text: "Peran Anda: validasi relevansi sumber dan setujui RQ." },
            { text: "Output: ringkasan bukti + daftar RQ yang disepakati." },
          ],
        },
      },
      {
        type: "section",
        title: "Fase 3 - Structure Planning (Outline)",
        list: {
          variant: "bullet",
          items: [
            { text: "Tujuan: desain outline lengkap (bagian, sub-bagian, target kata, mapping RQ -> section)." },
            { text: "Yang terjadi: iterasi struktur sampai logis dan comply standar akademik." },
            { text: "Peran AI: susun outline, set target kata, beri alasan urutan." },
            { text: "Peran Anda: review, minta revisi, lalu \"kunci\" outline." },
            { text: "Output: **Outline - LOCKED** sebagai blueprint drafting." },
          ],
        },
      },
      {
        type: "section",
        title: "Fase 4 - Content Creation",
        list: {
          variant: "bullet",
          items: [
            { text: "Tujuan: tulis prose akademik per section sesuai outline." },
            { text: "Yang terjadi: AI menulis tiap section (Bahasa Indonesia formal) dengan sitasi inline; Anda validasi sebelum lanjut." },
            { text: "Peran AI: jaga word count +/-10% dari target; pastikan alur dan sitasi konsisten." },
            { text: "Peran Anda: beri revisi, minta alternatif, dan setujui tiap section." },
            { text: "Output: draf bagian per bagian yang siap diintegrasikan." },
          ],
        },
      },
      {
        type: "section",
        title: "Fase 5 - Integration dan Citation",
        list: {
          variant: "bullet",
          items: [
            { text: "Tujuan: harmonisasi gaya dan logika, susun transisi antarbagian, dan rapikan sitasi." },
            { text: "Yang terjadi: gabungkan section, samakan istilah, cek konsistensi RQ-to-section, dan kompilasi \"REFERENCES\"." },
            { text: "Peran AI: sinkronkan nada dan struktur; tandai klaim yang butuh bukti tambahan." },
            { text: "Peran Anda: verifikasi sumber dan minta perbaikan bila ada lompatan logika." },
            { text: "Output: draf terintegrasi lengkap dengan daftar referensi." },
          ],
        },
      },
      {
        type: "section",
        title: "Fase 6 - Academic Review / Polish",
        list: {
          variant: "bullet",
          items: [
            { text: "Tujuan: quality assurance-grammar, ketepatan istilah, konsistensi heading, dan standar sitasi." },
            { text: "Yang terjadi: perapihan bahasa, penyeragaman format sitasi sesuai gaya yang diminta, dan final checks." },
            { text: "Peran AI: laporkan perubahan (edit report) dan alasan perbaikan yang signifikan." },
            { text: "Peran Anda: pilih gaya sitasi (APA/MLA/Chicago/Harvard) dan setujui hasil polish." },
            { text: "Output: naskah polished yang siap diformat akhir." },
          ],
        },
      },
      {
        type: "section",
        title: "Fase 7 - Finalization dan Packaging",
        list: {
          variant: "bullet",
          items: [
            { text: "Tujuan: memfinalkan format, memastikan kelengkapan referensi, dan menyiapkan berkas untuk pengumpulan." },
            { text: "Yang terjadi: cek akhir formatting, ringkasan kontribusi, dan daftar periksa submission." },
            { text: "Catatan implementasi: hasil akhir tersedia di percakapan; ekspor/salin sesuai kebutuhan Anda." },
            { text: "Output: dokumen final siap dikumpulkan." },
          ],
        },
      },
      {
        type: "section",
        title: "Catatan",
        paragraphs: [
          "Fase adalah pedoman; UI chat tetap bebas. Minta AI menjelaskan alasan keputusan pada tiap fase untuk memastikan akuntabilitas akademik.",
        ],
      },
    ],
    isPublished: true,
  },
  {
    slug: "security",
    title: "Keamanan Data",
    group: "Panduan Lanjutan",
    order: 7,
    icon: "ShieldCheck",
    summary:
      "Gambaran normatif praktik keamanan dan privasi yang umum pada aplikasi LLM Agent. Informasi ini bersifat ringkasan operasional; detail hukum mengacu pada Kebijakan Privasi.",
    blocks: [
      {
        type: "section",
        title: "Prinsip Umum",
        list: {
          variant: "bullet",
          items: [
            { text: "Data diproses untuk menyediakan layanan (percakapan, penyusunan draf), bukan untuk menjual informasi pengguna." },
            { text: "Minimasi data: hanya informasi yang diperlukan yang disimpan." },
            { text: "Transparansi: sumber dan sitasi ditandai agar mudah diverifikasi." },
          ],
        },
      },
      {
        type: "section",
        title: "Data yang Disimpan",
        list: {
          variant: "bullet",
          items: [
            { text: "Riwayat percakapan dan preferensi dasar akun (mis. pengaturan tampilan) disimpan untuk kelanjutan pekerjaan." },
            { text: "Lampiran file yang Anda unggah (gambar, teks, PDF, dokumen) disimpan untuk keperluan pemrosesan pada sesi terkait." },
            { text: "Log teknis terbatas dapat tercatat untuk keandalan, audit keamanan, dan pencegahan penyalahgunaan." },
          ],
        },
      },
      {
        type: "section",
        title: "Pengolahan oleh Penyedia Model",
        description:
          "Prompt dan keluaran dapat diproses oleh penyedia model (LLM provider) atau layanan web search bila fitur tersebut aktif.",
        list: {
          variant: "bullet",
          items: [
            { text: "Penyedia dapat menyimpan log terbatas untuk keselamatan/penyalahgunaan. Kebijakan pelatihan model mengikuti ketentuan penyedia yang digunakan." },
            { text: "Jangan sertakan rahasia sangat sensitif (mis. kredensial, nomor kartu, rekam medis) di dalam chat." },
            { text: "Jika perlu memasukkan data sensitif, lakukan anonimisasi (hapus identitas personal, detail yang tidak relevan)." },
          ],
        },
      },
      {
        type: "section",
        title: "Enkripsi dan Transport",
        list: {
          variant: "bullet",
          items: [
            { text: "Data dalam perjalanan dilindungi melalui koneksi terenkripsi (HTTPS/TLS)." },
            { text: "Data yang disimpan diamankan pada infrastruktur cloud standar industri dengan kontrol akses terbatas." },
          ],
        },
      },
      {
        type: "section",
        title: "Kontrol Akses",
        list: {
          variant: "bullet",
          items: [
            { text: "Akses administratif dibatasi dan diaudit. Kunci API dan rahasia disimpan sebagai variabel lingkungan, tidak ditaruh di kode." },
            { text: "Untuk penyimpanan terkelola, kebijakan keamanan database (mis. Row Level Security/RLS) digunakan untuk membatasi akses data per pengguna." },
          ],
        },
      },
      {
        type: "section",
        title: "Retensi dan Penghapusan",
        list: {
          variant: "bullet",
          items: [
            { text: "Anda dapat menghapus percakapan dari halaman Chat; penghapusan akan menghilangkan data tersebut dari tampilan pengguna." },
            { text: "Salinan cadangan dan log sistem dapat menyimpan jejak sementara sesuai praktik operasional yang wajar." },
          ],
        },
      },
      {
        type: "section",
        title: "Sesi dan Autentikasi",
        list: {
          variant: "bullet",
          items: [
            { text: "Sesi login menggunakan token yang dikelola aman; sistem dapat memperbarui token secara periodik untuk mencegah sesi kedaluwarsa tiba-tiba." },
            { text: "Keluar (logout) menutup sesi di perangkat tersebut. Hindari berbagi akun." },
          ],
        },
      },
      {
        type: "section",
        title: "Praktik yang Disarankan",
        list: {
          variant: "bullet",
          items: [
            { text: "Hindari mengunggah data personal yang tidak perlu; gunakan sampling atau ringkasan." },
            { text: "Verifikasi klaim penting dan sumber eksternal sebelum dipublikasikan." },
            { text: "Gunakan perangkat pribadi dan kata sandi yang kuat; aktifkan verifikasi email yang diminta sistem." },
          ],
        },
      },
      {
        type: "section",
        title: "Catatan",
        list: {
          variant: "bullet",
          items: [
            { text: "Ringkasan ini bukan nasihat hukum. Untuk detail pengelolaan data dan hak pengguna, lihat bagian \"Kebijakan Privasi\"." },
            { text: "Hubungi dukungan bila perlu bantuan terkait penghapusan data atau pelaporan insiden." },
          ],
        },
      },
    ],
    isPublished: true,
  },
  {
    slug: "privacy-policy",
    title: "Kebijakan Privasi (Ringkas)",
    group: "Panduan Lanjutan",
    order: 8,
    icon: "Globe",
    summary:
      "Ringkasan normatif cara kami mengumpulkan, menggunakan, menyimpan, dan membagikan data saat Anda menggunakan layanan Makalah AI. Dokumen hukum lengkap akan tersedia pada rilis publik.",
    blocks: [
      {
        type: "section",
        title: "Ruang Lingkup",
        paragraphs: [
          "Kebijakan ini berlaku untuk data yang diproses melalui situs dan layanan Makalah AI, termasuk percakapan, lampiran, pengaturan akun, dan data penggunaan.",
        ],
      },
      {
        type: "section",
        title: "Data yang Dikumpulkan",
        list: {
          variant: "bullet",
          items: [
            { text: "Data akun: alamat email dan informasi profil dasar yang Anda berikan." },
            { text: "Data percakapan: pesan, draf, dan lampiran yang Anda unggah." },
            { text: "Data penggunaan: log teknis terbatas (waktu akses, perangkat, error) untuk keandalan dan keamanan." },
            { text: "Cookie/teknologi serupa: untuk autentikasi sesi dan preferensi tampilan." },
          ],
        },
      },
      {
        type: "section",
        title: "Tujuan Penggunaan",
        list: {
          variant: "bullet",
          items: [
            { text: "Menyediakan layanan penyusunan makalah dan penyimpanan riwayat percakapan." },
            { text: "Meningkatkan keandalan, keamanan, dan pengalaman pengguna." },
            { text: "Memenuhi kewajiban hukum dan menanggapi permintaan yang sah." },
          ],
        },
      },
      {
        type: "section",
        title: "Berbagi Data",
        description: "Kami tidak menjual data pengguna. Data dapat dibagikan dengan:",
        list: {
          variant: "bullet",
          items: [
            { text: "Penyedia model dan layanan web search untuk memproses permintaan Anda; mereka dapat menyimpan log terbatas sesuai kebijakan masing-masing." },
            { text: "Penyedia infrastruktur (cloud, database, email) untuk operasional layanan." },
            { text: "Otoritas yang berwenang bila diwajibkan oleh hukum." },
          ],
        },
      },
      {
        type: "section",
        title: "Retensi",
        list: {
          variant: "bullet",
          items: [
            { text: "Riwayat percakapan dan lampiran disimpan selama akun aktif atau sampai Anda menghapusnya." },
            { text: "Cadangan dan log sistem dapat menyimpan jejak sementara untuk pemulihan bencana dan audit keamanan." },
          ],
        },
      },
      {
        type: "section",
        title: "Hak Pengguna",
        list: {
          variant: "bullet",
          items: [
            { text: "Mengakses dan memperbarui informasi akun Anda." },
            { text: "Menghapus percakapan dari halaman Chat; meminta penghapusan akun sesuai prosedur layanan." },
            { text: "Mengajukan pertanyaan terkait penggunaan data." },
          ],
        },
      },
      {
        type: "section",
        title: "Transfer Internasional",
        paragraphs: [
          "Data dapat diproses di wilayah hukum yang berbeda oleh penyedia layanan kami. Kami berupaya memastikan adanya perlindungan yang sepadan sesuai praktik industri.",
        ],
      },
      {
        type: "section",
        title: "Anak-Anak",
        paragraphs: [
          "Layanan tidak ditujukan bagi anak-anak di bawah usia yang diizinkan oleh hukum yang berlaku. Jangan kirimkan data pribadi anak.",
        ],
      },
      {
        type: "section",
        title: "Perubahan Kebijakan",
        paragraphs: [
          "Kami dapat memperbarui ringkasan ini dari waktu ke waktu. Versi terbaru akan ditampilkan di halaman ini beserta tanggal berlakunya.",
        ],
      },
      {
        type: "section",
        title: "Kontak",
        paragraphs: [
          "Untuk permintaan terkait privasi atau penghapusan data, hubungi dukungan melalui alamat yang tersedia pada aplikasi.",
        ],
      },
    ],
    isPublished: true,
  },
]

const buildSearchText = (section: DocumentationSectionSeed) => {
  const chunks: string[] = [section.title, section.summary ?? ""]

  for (const block of section.blocks) {
    if (block.type === "infoCard") {
      chunks.push(block.title, block.description ?? "", ...block.items)
      continue
    }

    if (block.type === "ctaCards") {
      for (const item of block.items) {
        chunks.push(item.title, item.description, item.ctaText)
      }
      continue
    }

    if (block.type === "section") {
      chunks.push(block.title, block.description ?? "")
      if (block.paragraphs) chunks.push(...block.paragraphs)
      if (block.list) {
        for (const item of block.list.items) {
          chunks.push(item.text)
          if (item.subItems) chunks.push(...item.subItems)
        }
      }
    }
  }

  return chunks.join(" ").replace(/\s+/g, " ").trim()
}

export const seedDocumentationSections = internalMutation({
  handler: async ({ db }) => {
    const existing = await db.query("documentationSections").first()
    if (existing) {
      return {
        success: false,
        message: "Documentation sections sudah ada. Migration dibatalkan.",
      }
    }

    const now = Date.now()
    const insertedIds: string[] = []

    for (const section of DEFAULT_DOCUMENTATION_SECTIONS) {
      const searchText = buildSearchText(section)
      const sectionId = await db.insert("documentationSections", {
        ...section,
        searchText,
        createdAt: now,
        updatedAt: now,
      })
      insertedIds.push(sectionId)
    }

    return {
      success: true,
      insertedCount: insertedIds.length,
      message: `${insertedIds.length} documentation sections berhasil dibuat.`,
    }
  },
})
