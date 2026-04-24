/* Static shared policy page mock */

const POLICY_PAGE_CONTENT = {
  privacy: {
    route: "/privacy",
    eyebrow: "/ privasi data",
    badge: "Privacy",
    title: (
      <>
        Kebijakan privasi Makalah AI untuk akses data login, dengan <em>cakupan yang dibatasi secara jelas</em>.
      </>
    ),
    description:
      "Makalah AI, yang dioperasikan oleh PT THE MANAGEMENT ASIA, menjelaskan data apa yang diakses saat Kamu memakai Masuk dengan Google, bagaimana data itu dipakai, disimpan, dibagikan, dan bagaimana penghapusan data bisa diminta.",
    updatedAt: "23 Februari 2026",
    summaryTitle: "Ringkasan privacy",
    summary: [
      "Akses Google OAuth dibatasi ke identitas dasar akun untuk autentikasi.",
      "Makalah AI tidak meminta akses ke Gmail, Drive, Calendar, Photos, atau konten pribadi Google lain.",
      "Permintaan penghapusan data dapat diajukan lewat dukungan@makalah.ai."
    ],
    sections: [
      {
        title: "Data Google yang diakses",
        paragraphs: [
          "Saat Kamu memilih Masuk dengan Google atau Daftar dengan Google, aplikasi kami hanya mengakses data identitas dasar akun Google untuk autentikasi.",
          "Makalah AI tidak meminta akses ke data Gmail, Google Drive, Google Calendar, Google Photos, atau konten pribadi Google lainnya untuk alur login ini."
        ],
        bullets: [
          "Nama akun Google (profile name)",
          "Alamat email akun Google",
          "Identifier akun Google untuk login aman (ID unik provider)",
          "Informasi profil dasar lain yang disediakan Google pada login standar, bila tersedia"
        ]
      },
      {
        title: "Penggunaan data Google",
        paragraphs: [
          "Data Google yang diakses hanya dipakai untuk menjalankan autentikasi dan pengelolaan akun di dalam sistem Makalah AI.",
          "Data Google tidak dipakai untuk dijual kepada pihak lain."
        ],
        bullets: [
          "Membuat atau menemukan akun yang sesuai di sistem Makalah AI",
          "Memverifikasi identitas pengguna saat proses login atau pendaftaran",
          "Menjaga keamanan akun, termasuk validasi sesi dan pencegahan penyalahgunaan",
          "Menjalankan fitur manajemen akun, termasuk account linking lintas metode login"
        ]
      },
      {
        title: "Berbagi data",
        paragraphs: [
          "Kami tidak menjual data Google Kamu kepada pihak ketiga.",
          "Data hanya dapat diproses oleh penyedia layanan yang kami gunakan untuk operasional aplikasi dengan tujuan yang terbatas dan relevan."
        ],
        bullets: [
          "Infrastruktur autentikasi dan database aplikasi",
          "Keamanan layanan dan pencegahan penyalahgunaan",
          "Untuk fitur terpisah seperti AI processing atau pembayaran, pemrosesan data mengikuti fungsi masing-masing layanan dan tidak memperluas scope akses Google OAuth login"
        ]
      },
      {
        title: "Penyimpanan dan perlindungan data",
        paragraphs: [
          "Kami menerapkan kontrol keamanan berlapis untuk melindungi data Kamu.",
          "Kontrol ini diarahkan untuk menjaga akses tetap sesuai kepemilikan akun dan membatasi paparan data sensitif."
        ],
        bullets: [
          "Penyimpanan data backend dengan kontrol akses berbasis kepemilikan akun",
          "Validasi autentikasi di sisi server sebelum akses data sensitif",
          "Transport data melalui koneksi aman (HTTPS)",
          "Pembatasan akses administratif sesuai peran"
        ]
      },
      {
        title: "Retensi dan penghapusan data",
        paragraphs: [
          "Data akun disimpan selama akun Kamu aktif atau selama diperlukan untuk menjalankan layanan secara sah.",
          "Data dapat dipertahankan lebih lama bila diwajibkan hukum atau untuk penanganan sengketa dan penyalahgunaan.",
          "Kamu bisa meminta penghapusan akun dan data terkait melalui email ke dukungan@makalah.ai dengan subjek email Permintaan Hapus Data dan mencantumkan email akun terdaftar untuk proses verifikasi.",
          "Setelah permintaan terverifikasi, kami memproses penghapusan data sesuai kebijakan internal dan kewajiban hukum yang berlaku."
        ]
      },
      {
        title: "Pembaruan kebijakan",
        paragraphs: [
          "Kebijakan ini dapat diperbarui untuk menyesuaikan perubahan produk, keamanan, atau regulasi.",
          "Tanggal pembaruan terbaru selalu ditampilkan di halaman ini agar perubahan bisa ditinjau dengan jelas."
        ]
      },
      {
        title: "Kontak",
        paragraphs: [
          "Untuk pertanyaan privasi atau permintaan penghapusan data, gunakan kanal kontak resmi berikut."
        ],
        bullets: [
          "Email: dukungan@makalah.ai",
          "Entitas: PT THE MANAGEMENT ASIA",
          "Alamat: Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"
        ]
      }
    ]
  },
  security: {
    route: "/security",
    eyebrow: "/ security",
    badge: "Security",
    title: (
      <>
        Keamanan data di Makalah AI dibangun dengan <em>sistem berlapis yang menjaga akses tetap terbatas</em>.
      </>
    ),
    description:
      "Makalah AI dirancang dengan prinsip bahwa data Kamu tetap milik Kamu sepenuhnya. Halaman ini merangkum bagaimana akses akun, workflow paper, file, dan transaksi dijaga dalam koridor yang aman dan transparan.",
    updatedAt: "21 Februari 2026",
    summaryTitle: "Ringkasan security",
    summary: [
      "Akses ke akun dan area kerja dibatasi hanya untuk pemilik akun.",
      "Workflow paper, file, dan lampiran dijaga lewat kontrol keamanan berlapis.",
      "Pembayaran diproses lewat Xendit tanpa menyimpan data kartu atau PIN di sistem."
    ],
    sections: [
      {
        title: "Komitmen kami terhadap keamanan data",
        paragraphs: [
          "Keamanan bukan sekadar fitur, tetapi pondasi dari Makalah AI. Kami memastikan setiap data yang diolah di dalam produk tetap privat dan terjaga.",
          "Prinsip dasarnya sederhana: akses harus terbatas pada pemilik akun, transaksi harus terlindungi, dan seluruh alur kerja AI perlu berjalan dalam koridor yang aman dan transparan."
        ]
      },
      {
        title: "Perlindungan akses akun",
        paragraphs: [
          "Akses ke akun dan riwayat riset dipagari agar hanya bisa dibuka oleh pihak yang memang berwenang.",
          "Kami juga memakai proses login tepercaya agar autentikasi tetap aman tanpa menambah beban pengelolaan password di sistem internal."
        ],
        bullets: [
          "Autentikasi ketat untuk membatasi akses ke area kerja dan riwayat riset",
          "Validasi kepemilikan di backend untuk memastikan data benar milik akun yang mengakses",
          "Login sosial tepercaya melalui Google OAuth tanpa menyimpan password di sistem kami"
        ]
      },
      {
        title: "Keamanan saat menyusun paper",
        paragraphs: [
          "Workflow paper dirancang bertahap agar proses penyusunan tetap terarah dan tidak membuka celah akses ilegal ke draf yang sedang dikerjakan.",
          "Referensi yang diambil oleh AI juga dicatat sebagai jejak kerja yang masih bisa ditinjau ulang."
        ],
        bullets: [
          "Alur kerja bertahap untuk menjaga draf tetap berada dalam koridor akses yang benar",
          "Jejak sumber dicatat agar referensi yang dipakai AI tetap bisa diverifikasi"
        ]
      },
      {
        title: "Keamanan file dan lampiran",
        paragraphs: [
          "File riset dan lampiran diperlakukan sebagai materi yang sensitif, sehingga penyimpanan dan aksesnya dibatasi sesuai izin akun Kamu.",
          "Kami juga menerapkan batas aman untuk ukuran file agar performa dan keamanan proses ekstraksi tetap terjaga."
        ],
        bullets: [
          "Upload terproteksi dengan storage terenkripsi",
          "Akses file hanya melalui izin akun yang sesuai",
          "Batas ukuran file 10MB untuk menjaga performa dan keamanan ekstraksi"
        ]
      },
      {
        title: "Standar pembayaran global",
        paragraphs: [
          "Untuk transaksi berbayar, Makalah AI memakai mitra pembayaran terverifikasi agar proses pembayaran tetap aman dan dapat diaudit.",
          "Kami tidak pernah menyimpan data kartu kredit atau PIN Kamu di sistem kami."
        ],
        bullets: [
          "Transaksi diproses melalui Xendit sebagai mitra pembayaran",
          "Setiap transaksi diverifikasi ulang dengan token unik untuk mencegah manipulasi data"
        ]
      },
      {
        title: "Apa yang bisa Kamu lakukan",
        paragraphs: [
          "Sebagian keamanan juga bergantung pada kebiasaan penggunaan. Karena itu, Kamu tetap perlu menjaga perilaku dasar yang aman saat memakai platform."
        ],
        bullets: [
          "Gunakan password yang kuat jika tidak memakai login sosial",
          "Hindari mengunggah data rahasia seperti nomor PIN ke dalam percakapan AI"
        ]
      }
    ]
  },
  terms: {
    route: "/terms",
    eyebrow: "/ syarat penggunaan",
    badge: "Terms",
    title: (
      <>
        Ketentuan layanan Makalah AI menjelaskan cara layanan ini digunakan secara <em>wajar, bertanggung jawab, dan sah</em>.
      </>
    ),
    description:
      "Dengan mengakses atau menggunakan layanan Makalah AI, Kamu dianggap setuju untuk terikat oleh ketentuan layanan ini. Makalah AI adalah platform asisten penulisan akademis berbasis AI yang dikelola oleh PT THE MANAGEMENT ASIA.",
    updatedAt: "21 Februari 2026",
    summaryTitle: "Ringkasan terms",
    summary: [
      "Layanan ini dipakai untuk membantu proses riset dan penyusunan karya tulis, bukan untuk tujuan ilegal.",
      "Output AI di akun Kamu tetap menjadi milik Kamu, sementara platform dan infrastrukturnya tetap milik Makalah AI.",
      "Ketentuan ini tunduk pada hukum Republik Indonesia."
    ],
    sections: [
      {
        title: "Ketentuan penggunaan",
        paragraphs: [
          "Layanan ini disediakan untuk membantu proses riset dan penyusunan karya tulis.",
          "Kamu setuju untuk tidak menggunakan layanan ini untuk tujuan ilegal atau untuk melanggar hak kekayaan intelektual pihak lain."
        ]
      },
      {
        title: "Lisensi dan hak kekayaan intelektual",
        paragraphs: [
          "Seluruh output yang dihasilkan AI melalui akun Kamu adalah hak milik Kamu.",
          "Di sisi lain, Makalah AI tetap memiliki hak atas infrastruktur, desain, dan algoritma sistem yang disediakan di dalam platform."
        ]
      },
      {
        title: "Batasan tanggung jawab",
        paragraphs: [
          "Meskipun AI kami dirancang untuk akurasi yang tinggi, hasil yang diberikan tetap perlu Kamu tinjau ulang.",
          "Makalah AI tidak bertanggung jawab atas kesalahan faktual, kutipan yang tidak akurat, atau konsekuensi akademis yang muncul dari penggunaan output AI tanpa verifikasi manusia."
        ]
      },
      {
        title: "Pembayaran dan pembatalan",
        paragraphs: [
          "Sebagian fitur memerlukan akses berbayar melalui mitra kami, Xendit.",
          "Pembelian bersifat final kecuali dinyatakan lain dalam kebijakan pengembalian dana kami, dan Kamu tetap bertanggung jawab menjaga keamanan akun serta informasi pembayaranmu."
        ]
      },
      {
        title: "Perubahan layanan",
        paragraphs: [
          "Kami berhak mengubah atau menghentikan bagian apa pun dari layanan sewaktu-waktu untuk peningkatan kualitas atau pemenuhan kepatuhan regulasi."
        ]
      },
      {
        title: "Hukum yang berlaku",
        paragraphs: [
          "Ketentuan ini diatur oleh hukum Republik Indonesia.",
          "Setiap perselisihan yang muncul akan diselesaikan melalui musyawarah atau melalui jalur hukum sesuai yurisdiksi yang berlaku."
        ]
      },
      {
        title: "Kontak",
        paragraphs: [
          "Untuk pertanyaan mengenai ketentuan layanan ini, gunakan kontak resmi berikut."
        ],
        bullets: [
          "Email: dukungan@makalah.ai",
          "Alamat: PT THE MANAGEMENT ASIA, Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"
        ]
      }
    ]
  }
};

const POLICY_ROUTE_TO_KEY = {
  "/privacy": "privacy",
  "/security": "security",
  "/terms": "terms"
};

const PolicySummaryCard = ({ page }) => (
  <aside className="policy-page-sidebar-card">
    <div className="policy-page-sidebar-head">
      <span className="policy-page-badge">{page.badge}</span>
      <div className="policy-page-updated">Terakhir diperbarui {page.updatedAt}</div>
    </div>
    <div className="eyebrow">{page.summaryTitle}</div>
    <ul className="policy-page-summary-list">
      {page.summary.map((item) => (
        <li key={item}>
          <span className="check"><Check /></span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </aside>
);

const PolicySection = ({ section }) => (
  <section className="policy-page-section">
    <div className="policy-page-section-body">
      <h2>{section.title}</h2>
      {section.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {section.bullets ? (
        <ul className="policy-page-bullet-list">
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </div>
  </section>
);

const PolicyPage = ({ mode }) => {
  const routeMode = mode || POLICY_ROUTE_TO_KEY[window.normalizeMockPath ? window.normalizeMockPath() : "/privacy"] || "privacy";
  const page = POLICY_PAGE_CONTENT[routeMode];

  return (
    <div className={`policy-page policy-page--${routeMode}`}>
      <section className="section-frame policy-page-hero">
        <div className="hero-ornament" />
        <div className="container">
          <Reveal>
            <div className="sec-head policy-page-head">
              <div className="sec-eyebrow">
                <span className="l">{page.eyebrow}</span>
              </div>
              <h1 className="sec-title policy-page-title">{page.title}</h1>
            </div>
          </Reveal>

          <Reveal delay={1}>
            <div className="policy-page-hero-grid">
              <PolicySummaryCard page={page} />

              <div className="policy-page-article-wrap">
                <article className="policy-page-article">
                  {page.sections.map((section) => (
                    <PolicySection key={section.title} section={section} />
                  ))}
                </article>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-frame policy-page-cta-wrap">
        <div className="container">
          <Reveal>
            <div className="policy-page-cta">
              <div className="policy-page-cta-copy">
                <div className="eyebrow">Butuh konteks lebih lanjut?</div>
                <h2>Kalau Kamu ingin melihat cara kerja produk lebih rinci, lanjut dari dokumentasi atau hubungi tim.</h2>
                <p>
                  Halaman kebijakan ini menjelaskan pagar dasar. Untuk memahami alur penggunaan,
                  struktur workflow, dan konteks fitur, dokumentasi adalah titik lanjut yang paling relevan.
                </p>
              </div>
              <div className="policy-page-cta-actions">
                <a href="#/documentation" className="btn btn-primary policy-page-cta-button">
                  Lihat dokumentasi <Arrow />
                </a>
                <a href="mailto:dukungan@makalah.ai" className="btn btn-ghost policy-page-cta-button policy-page-cta-button-secondary">
                  Hubungi tim <Arrow />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

Object.assign(window, {
  POLICY_PAGE_CONTENT,
  POLICY_ROUTE_TO_KEY,
  PolicySummaryCard,
  PolicySection,
  PolicyPage
});
