/* Static about page mock */

const ABOUT_MANIFESTO = {
  eyebrow: "/ tentang makalah ai",
  title: "Kolaborasi penumbuh pikiran.",
  subtitle: "Makalah AI hadir untuk menjaga proses berpikir tetap hidup ketika penulisan paper mulai terasa berat, teknis, dan melelahkan.",
  paragraphs: [
    "Makalah tidak dibangun untuk menggantikan penulis. Makalah dibangun untuk memantik diskusi, menyangga teknis penulisan, dan membuat pengguna tetap fokus menajamkan gagasan.",
    "Interaksi dengan AI tidak harus dimulai dari prompting yang rumit. Di Makalah, yang lebih penting adalah percakapan iteratif, informatif, dan cukup dekat dengan bahasa sehari-hari.",
    "Setiap langkah penulisan perlu bisa ditelusuri. Karena itu, sumber, sitasi, dan provenance disusun agar mudah diperiksa kembali ketika argumen berkembang."
  ],
  principles: [
    "AI sebagai sparring partner, bukan penulis otomatis.",
    "Percakapan yang natural lebih penting daripada prompt yang sakti.",
    "Proses dan sumber harus tetap transparan."
  ]
};

const ABOUT_PROBLEMS = [
  {
    title: "AI mematikan rasa ingin tahu?",
    description: "Makalah mengambil arah sebaliknya: sistem ini justru memantik diskusi dan membantu teknis penulisan supaya energi utama tetap dipakai untuk menajamkan gagasan."
  },
  {
    title: "Prompting yang ribet",
    description: "Makalah dibangun untuk membantah asumsi bahwa AI hanya berguna kalau pengguna tahu prompt yang rumit. Yang dibutuhkan justru percakapan iteratif yang jelas dan informatif."
  },
  {
    title: "Sitasi dan provenance",
    description: "Setiap sumber perlu bisa dilacak. Makalah menjaga sitasi tetap rapi dan asal-usul ide tetap terbaca supaya paper mudah diaudit ketika direvisi."
  },
  {
    title: "Plagiarisme dipagari etis",
    description: "Sistem dipagari agar tidak menyalin teks berhak cipta secara mentah. Tujuannya menjaga orisinalitas gagasan pengguna dan mendorong penulisan yang lebih bertanggung jawab."
  },
  {
    title: "Transparansi proses penyusunan",
    description: "Riwayat interaksi dan alur revisi perlu terlihat, bukan tersembunyi di balik hasil akhir. Makalah memosisikan AI sebagai kolaborator yang akuntabel."
  },
  {
    title: "Deteksi AI yang problematik",
    description: "Makalah tidak berangkat dari obsesi membedakan tulisan AI atau bukan. Yang lebih penting adalah transparansi penggunaan, jejak proses, dan kualitas argumentasi akhir."
  }
];

const ABOUT_AGENTS = [
  {
    title: "Sparring Partner",
    status: "Tersedia",
    active: true,
    description: "Pendamping riset yang berperan sebagai juru tulis sekaligus mitra diskusi saat pengguna sedang menyusun arah paper."
  },
  {
    title: "Dosen Pembimbing",
    status: "Proses",
    description: "Agen yang memberi arahan struktur, kritik metodologi, dan petunjuk milestone supaya paper berkembang lebih terarah."
  },
  {
    title: "Peer Reviewer",
    status: "Proses",
    description: "Agen yang bertugas memberi review kritis pada argumen, struktur, dan referensi, seperti rekan yang siap menguji paper dari sisi lain."
  },
  {
    title: "Gap Thinker",
    status: "Proses",
    description: "Agen yang menyorot celah riset dari kumpulan referensi awal dan membantu menemukan kemungkinan topik yang lebih segar."
  },
  {
    title: "Novelty Finder",
    status: "Proses",
    description: "Agen yang membantu memetakan posisi kontribusi dan kebaruan ketika topik yang dipilih sudah ramai dibahas."
  },
  {
    title: "Graph Elaborator",
    status: "Proses",
    description: "Agen yang memetakan konsep ke bentuk grafik, mengaitkannya dengan referensi, dan merapikan hubungan antar ide yang relevan."
  }
];

const ABOUT_CONTACT = {
  company: "PT The Management Asia",
  address: ["Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"],
  email: "dukungan@makalah.ai",
  career: "Update posisi akan kami tampilkan di halaman ini."
};

const AboutProblemCard = ({ item }) => (
  <article className="about-problem-card">
    <h3>{item.title}</h3>
    <p>{item.description}</p>
  </article>
);

const AboutAgentCard = ({ item }) => (
  <article className={`about-agent-card${item.active ? " active" : ""}`}>
    <div className="about-agent-status">{item.status}</div>
    <h3>{item.title}</h3>
    <p>{item.description}</p>
  </article>
);

const AboutPage = () => (
  <div className="about-page">
    <section className="section-frame about-hero">
      <div className="container">
        <Reveal>
          <div className="sec-head page-split-hero about-hero-head">
            <div className="page-split-main">
              <div className="sec-eyebrow">
                <span className="l">{ABOUT_MANIFESTO.eyebrow}</span>
              </div>
              <h1 className="sec-title page-split-title about-hero-title">{ABOUT_MANIFESTO.title}</h1>
            </div>
            <div className="page-split-side">
              <p className="sec-desc page-split-desc about-hero-desc">{ABOUT_MANIFESTO.subtitle}</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <div className="about-hero-grid">
            <div className="about-manifesto-panel">
              {ABOUT_MANIFESTO.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="about-principles-panel">
              <div className="eyebrow">Prinsip kerja</div>
              <ul>
                {ABOUT_MANIFESTO.principles.map((principle) => (
                  <li key={principle}>
                    <span className="check"><Check /></span>
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>

    <section className="section-frame about-problems">
      <div className="container">
        <Reveal>
          <div className="sec-head about-section-head">
            <div>
              <div className="eyebrow">Persoalan</div>
              <h2 className="sec-title about-section-title">Hal-hal yang ingin dibenahi dari cara orang menulis paper dengan bantuan AI.</h2>
            </div>
            <p className="sec-desc about-section-desc">
              Daftar ini diambil dari pokok masalah di production about page, lalu disusun ulang supaya lebih mudah dipindai sebagai narasi marketing.
            </p>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <div className="about-problems-grid">
            {ABOUT_PROBLEMS.map((item) => (
              <AboutProblemCard key={item.title} item={item} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>

    <section className="section-frame about-agents">
      <div className="container">
        <Reveal>
          <div className="sec-head about-section-head">
            <div>
              <div className="eyebrow">AI Agents</div>
              <h2 className="sec-title about-section-title">Makalah dirancang sebagai tim agent, bukan satu jawaban tunggal yang serba jadi.</h2>
            </div>
            <p className="sec-desc about-section-desc">
              Beberapa agent sudah siap dipakai, sebagian lain masih disiapkan untuk memperluas cara pengguna menggali topik, meninjau argumen, dan melihat gap riset.
            </p>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <div className="about-agents-grid">
            {ABOUT_AGENTS.map((item) => (
              <AboutAgentCard key={item.title} item={item} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>

    <section className="section-frame about-contact">
      <div className="container">
        <Reveal>
          <div className="about-contact-shell">
            <div>
              <div className="eyebrow">Karier & kontak</div>
              <h2>Kalau ingin bergabung atau menghubungi tim, mulai dari sini.</h2>
              <p>{ABOUT_CONTACT.career}</p>
            </div>
            <div className="about-contact-cards">
              <div className="about-contact-card">
                <h3>Karier</h3>
                <p>{ABOUT_CONTACT.career}</p>
              </div>
              <div className="about-contact-card">
                <h3>Kontak</h3>
                <p>{ABOUT_CONTACT.company}</p>
                {ABOUT_CONTACT.address.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                <a href={`mailto:${ABOUT_CONTACT.email}`}>{ABOUT_CONTACT.email}</a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  </div>
);

Object.assign(window, {
  ABOUT_MANIFESTO,
  ABOUT_PROBLEMS,
  ABOUT_AGENTS,
  ABOUT_CONTACT,
  AboutProblemCard,
  AboutAgentCard,
  AboutPage
});
