/* Static features page mock */

const FEATURES_PAGE_PILLARS = [
  {
    id: "workflow",
    eyebrow: "01 / workflow 14 tahap",
    title: "Paper tidak bergerak liar karena setiap langkah punya pagar yang jelas.",
    description:
      "Makalah memandu penyusunan paper melalui 14 tahap yang berurutan. Setiap perpindahan tahap menjaga konteks tetap utuh, sehingga ide, struktur, dan arah penulisan tidak mudah melebar ke mana-mana.",
    bullets: [
      "Urutan kerja dimulai dari gagasan, topik, outline, lalu turun ke section-section paper utama.",
      "Setiap tahap punya fokus yang spesifik, jadi Kamu tidak dipaksa memikirkan semua hal sekaligus.",
      "Perkembangan paper lebih mudah ditinjau karena alasan di balik setiap keputusan tetap terbaca."
    ],
    statLabel: "Tahap aktif",
    statValue: "14 tahap terjaga"
  },
  {
    id: "refrasa",
    eyebrow: "02 / refrasa",
    title: "Draft AI yang terlalu kaku bisa ditenangkan jadi bahasa yang lebih manusiawi.",
    description:
      "Refrasa membantu mengubah paragraf yang terasa mekanis menjadi bahasa Indonesia yang lebih natural, tetap akademik, dan lebih nyaman dibaca tanpa menggeser substansi utama yang sudah disusun.",
    bullets: [
      "Diksi dibuat lebih alami tanpa mengubah isi argumen utama.",
      "Transisi antarkalimat terasa lebih rapi untuk kebutuhan paper akademik.",
      "Istilah penting dan konteks teknis tetap dijaga agar tidak berubah sembarangan."
    ],
    statLabel: "Fokus utama",
    statValue: "Bahasa lebih manusiawi"
  },
  {
    id: "naskah",
    eyebrow: "03 / naskah",
    title: "Paper terlihat sebagai naskah utuh, bukan kumpulan jawaban yang tercerai.",
    description:
      "Naskah memberi pratinjau tentang bagaimana seluruh paper akan terbaca saat semua bagian mulai tersusun. Saat satu artifak bertambah atau diperbarui, naskah ikut tumbuh mengikuti perkembangan paper.",
    bullets: [
      "Kamu bisa melihat arah keseluruhan paper tanpa menunggu semua tahap selesai.",
      "Pertumbuhan paper terasa nyata karena susunan final terus diperbarui sepanjang proses.",
      "Naskah membantu memeriksa alur antarseksi agar paper tetap terasa utuh."
    ],
    statLabel: "Pratinjau",
    statValue: "Paper terus bertumbuh"
  },
  {
    id: "artifak",
    eyebrow: "04 / artifak",
    title: "Setiap bagian paper punya ruang kerjanya sendiri, jadi revisi lebih rapi.",
    description:
      "Makalah menuliskan hasil tiap tahap sebagai artifak terpisah. Abstrak, pendahuluan, tinjauan literatur, metodologi, hasil, diskusi, kesimpulan, pembaruan abstrak, dan daftar pustaka dapat dilihat sebagai bagian-bagian yang jelas.",
    bullets: [
      "Setiap section paper tidak bercampur dalam satu chat panjang yang sulit ditelusuri.",
      "Versi revisi lebih mudah dipantau karena hasil kerja tersimpan per bagian.",
      "Artifak membantu Kamu fokus menilai satu section tanpa kehilangan konteks paper secara keseluruhan."
    ],
    statLabel: "Section terpisah",
    statValue: "Abstrak sampai daftar pustaka"
  },
  {
    id: "choice-card",
    eyebrow: "05 / choice card",
    title: "Kamu tidak harus terus mengetik untuk menjaga arah penulisan tetap tepat.",
    description:
      "Saat ada keputusan yang perlu diambil, agen Makalah menampilkan recommendation lewat choice card. Kamu tinggal memilih arah yang paling sesuai, dan baru menulis manual kalau memang opsi yang dibutuhkan belum tersedia.",
    bullets: [
      "Pilihan yang ditampilkan membantu user bergerak lebih cepat tanpa prompt panjang.",
      "Sistem tetap memberi recommendation, jadi pengguna tidak dibiarkan bingung menentukan langkah berikutnya.",
      "Input manual tetap terbuka ketika Kamu ingin memberi arah yang lebih spesifik."
    ],
    statLabel: "Interaksi",
    statValue: "Pilih dulu, ketik bila perlu"
  }
];

const FEATURES_PAGE_ARTIFACT_SECTIONS = [
  "abstrak",
  "pendahuluan",
  "tinjauan_literatur",
  "metodologi",
  "hasil",
  "diskusi",
  "kesimpulan",
  "pembaruan_abstrak",
  "daftar_pustaka"
];

const FeaturesWorkflowPreview = () => (
  <div className="features-visual-shell features-visual-shell-workflow">
    <div className="features-shell-top">
      <span className="features-shell-label">Tahap paper</span>
      <span className="features-shell-value">14 checkpoint</span>
    </div>
    <div className="features-stage-list">
      {[
        "01 Gagasan",
        "02 Topik",
        "03 Outline",
        "04 Abstrak",
        "05 Pendahuluan",
        "06 Tinjauan literatur",
        "07 Metodologi",
        "08 Hasil",
        "09 Diskusi",
        "10 Kesimpulan",
        "11 Pembaruan abstrak",
        "12 Daftar pustaka",
        "13 Lampiran",
        "14 Judul"
      ].map((label, index) => (
        <div key={label} className={`features-stage-item${index < 5 ? " is-active" : ""}${index === 5 ? " is-next" : ""}`}>
          <span>{label}</span>
          <span>{index < 5 ? "Terkunci" : index === 5 ? "Berikutnya" : "Menunggu"}</span>
        </div>
      ))}
    </div>
  </div>
);

const FeaturesRefrasaPreview = () => (
  <div className="features-visual-shell">
    <div className="features-refrasa-grid">
      <div className="features-refrasa-card">
        <div className="features-shell-label">Sebelum</div>
        <p>
          Penelitian ini memiliki tujuan untuk melakukan analisis terhadap penggunaan media digital
          yang mana dapat memberikan dampak terhadap kualitas proses pembelajaran mahasiswa.
        </p>
      </div>
      <div className="features-refrasa-card is-accent">
        <div className="features-shell-label">Sesudah</div>
        <p>
          Penelitian ini menganalisis bagaimana penggunaan media digital memengaruhi kualitas
          proses belajar mahasiswa dalam konteks perkuliahan.
        </p>
      </div>
    </div>
    <div className="features-refrasa-notes">
      <span>Ritme kalimat lebih tenang</span>
      <span>Istilah utama tetap dijaga</span>
      <span>Diksi lebih natural</span>
    </div>
  </div>
);

const FeaturesNaskahPreview = () => (
  <div className="features-visual-shell features-visual-shell-paper">
    <div className="features-paper-page">
      <div className="features-paper-heading">
        <span className="features-shell-label">Naskah</span>
        <h3>Pengaruh Media Digital terhadap Kualitas Belajar Mahasiswa</h3>
      </div>
      <div className="features-paper-sections">
        {[
          ["Abstrak", "Sudah tersusun"],
          ["Pendahuluan", "Sudah tersusun"],
          ["Tinjauan Literatur", "Sedang bertumbuh"],
          ["Metodologi", "Menunggu tahap aktif"]
        ].map(([title, meta]) => (
          <div key={title} className="features-paper-section">
            <div>
              <strong>{title}</strong>
              <p>{meta}</p>
            </div>
            <span className="features-paper-dot" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const FeaturesArtifactPreview = () => (
  <div className="features-visual-shell">
    <div className="features-shell-top">
      <span className="features-shell-label">Artifak paper</span>
      <span className="features-shell-value">{FEATURES_PAGE_ARTIFACT_SECTIONS.length} section inti</span>
    </div>
    <div className="features-artifact-list">
      {FEATURES_PAGE_ARTIFACT_SECTIONS.map((item, index) => (
        <div key={item} className={`features-artifact-item${index < 3 ? " is-ready" : ""}`}>
          <span>{item}</span>
          <span>{index < 3 ? `v${index + 1}` : "belum dibuat"}</span>
        </div>
      ))}
    </div>
  </div>
);

const FeaturesChoiceCardPreview = () => (
  <div className="features-visual-shell">
    <div className="features-choice-card">
      <div className="features-shell-label">Choice card</div>
      <h3>Pilih arah pendahuluan yang paling pas</h3>
      <div className="features-choice-options">
        <button type="button" className="features-choice-option is-recommended">
          <span>Masalah utama lebih dulu</span>
          <strong>Rekomendasi</strong>
        </button>
        <button type="button" className="features-choice-option">
          <span>Mulai dari konteks umum</span>
        </button>
        <button type="button" className="features-choice-option">
          <span>Bandingkan dua pendekatan</span>
        </button>
      </div>
      <div className="features-choice-submit">Kirim pilihan</div>
    </div>
  </div>
);

const FEATURES_PAGE_VISUALS = {
  workflow: <FeaturesWorkflowPreview />,
  refrasa: <FeaturesRefrasaPreview />,
  naskah: <FeaturesNaskahPreview />,
  artifak: <FeaturesArtifactPreview />,
  "choice-card": <FeaturesChoiceCardPreview />
};

const FeaturesPillarSection = ({ item, index }) => (
  <section className={`section-frame features-pillar features-pillar-${item.id}`}>
    <div className="container">
      <Reveal>
        <div className={`features-pillar-grid${index % 2 === 1 ? " reverse" : ""}`}>
          <div className="features-pillar-copy">
            <div className="sec-eyebrow">
              <span className="l">{item.eyebrow}</span>
            </div>
            <h2 className="sec-title features-pillar-title">{item.title}</h2>
            <p className="sec-desc features-pillar-desc">{item.description}</p>
            <ul className="features-pillar-bullets">
              {item.bullets.map((bullet) => (
                <li key={bullet}>
                  <span className="check"><Check /></span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="features-pillar-visual-wrap">
            <div className="features-pillar-stat">
              <span>{item.statLabel}</span>
              <strong>{item.statValue}</strong>
            </div>
            {FEATURES_PAGE_VISUALS[item.id]}
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

const FeaturesPage = () => (
  <div className="features-page">
    <section className="section-frame features-page-hero">
      <div className="container">
        <Reveal>
          <PageSplitHero
            className="features-page-head"
            eyebrow="/ fitur makalah ai"
            title={<>Bukan sekadar tempat bertanya, tetapi <em>asisten penyusunan paper</em>.</>}
            description="Makalah membantu Kamu menyusun paper dengan alur yang terjaga, bahasa yang lebih manusiawi, naskah yang terus bertumbuh, serta keputusan-keputusan penting yang tetap dibimbing dengan jelas."
            titleClassName="features-page-title"
            descriptionClassName="features-page-desc"
            rightClassName="features-page-summary"
          />
        </Reveal>

        <Reveal delay={1}>
          <div className="features-page-intro">
            <div className="features-intro-card">
              <div className="features-intro-card-grid">
                <div className="features-intro-card-icon" aria-hidden="true">
                  <i className="iconoir-journal-page" aria-hidden="true" />
                </div>
                <div className="features-intro-card-copy">
                  <span className="features-shell-label">Paradigma kerja</span>
                  <p>
                    Makalah memperlakukan paper sebagai dokumen akademik yang tumbuh tahap demi tahap.
                    Karena itu, pengalaman utamanya bukan percakapan yang terus melebar, melainkan proses
                    menulis yang tetap terarah.
                  </p>
                </div>
              </div>
            </div>
            <div className="features-intro-card">
              <div className="features-intro-card-grid">
                <div className="features-intro-card-icon" aria-hidden="true">
                  <i className="iconoir-sparks" aria-hidden="true" />
                </div>
                <div className="features-intro-card-copy">
                  <span className="features-shell-label">Yang terasa bagi user</span>
                  <p>
                    Kamu tidak perlu memulai dari prompt yang rumit. Sistem memberi struktur, recommendation,
                    dan ruang kerja yang lebih rapi agar fokus Kamu tetap ada pada isi paper.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>

    {FEATURES_PAGE_PILLARS.map((item, index) => (
      <FeaturesPillarSection key={item.id} item={item} index={index} />
    ))}

    <section className="section-frame features-page-cta-wrap">
      <div className="container">
        <Reveal>
          <div className="features-page-cta">
            <div className="features-page-cta-copy">
              <div className="eyebrow">Siap melihat cara kerjanya</div>
              <h2>Mulai dari alur yang terarah, lalu lihat bagaimana paper Kamu bertumbuh.</h2>
              <p>
                Kalau Kamu ingin memahami mekanismenya lebih rinci, lanjut ke dokumentasi.
                Kalau ingin langsung melihat paket yang tersedia, buka halaman harga.
              </p>
            </div>
            <div className="features-page-cta-actions">
              <a href="#/documentation" className="btn btn-primary features-page-cta-button">
                Lihat dokumentasi <Arrow />
              </a>
              <a href="#/pricing" className="btn btn-ghost features-page-cta-button features-page-cta-button-secondary">
                Lihat harga <Arrow />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  </div>
);

Object.assign(window, {
  FEATURES_PAGE_PILLARS,
  FEATURES_PAGE_ARTIFACT_SECTIONS,
  FeaturesWorkflowPreview,
  FeaturesRefrasaPreview,
  FeaturesNaskahPreview,
  FeaturesArtifactPreview,
  FeaturesChoiceCardPreview,
  FeaturesPillarSection,
  FeaturesPage
});
