/* Static features page mock */

const FEATURES_PAGE_PILLARS = [
  {
    id: "workflow",
    eyebrow: "01 / workflow 14 tahap",
    title: <>Paper tidak bergerak liar karena <span className="heading-muted">setiap langkah punya pagar yang jelas</span>.</>,
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
    title: <>Draft AI yang terlalu kaku bisa ditenangkan jadi <span className="heading-muted">bahasa yang lebih manusiawi</span>.</>,
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
    title: <>Paper terlihat sebagai naskah utuh, <span className="heading-muted">bukan kumpulan jawaban yang tercerai</span>.</>,
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
    title: <>Setiap bagian paper punya ruang kerjanya sendiri, <span className="heading-muted">jadi revisi lebih rapi</span>.</>,
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
    title: <>Kamu tidak harus terus mengetik untuk <span className="heading-muted">menjaga arah penulisan tetap tepat</span>.</>,
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
  <div className="features-illustration-frame">
    <img
      src="assets/fitur-illustration-1.png"
      alt="Ilustrasi workflow 14 tahap Makalah AI"
      className="features-illustration-image"
    />
  </div>
);

const FeaturesRefrasaPreview = () => (
  <div className="features-illustration-frame">
    <img
      src="assets/fitur-illustration-2.png"
      alt="Ilustrasi fitur refrasa Makalah AI"
      className="features-illustration-image"
    />
  </div>
);

const FeaturesNaskahPreview = () => (
  <div className="features-illustration-frame">
    <img
      src="assets/fitur-illustration-3.png"
      alt="Ilustrasi fitur naskah Makalah AI"
      className="features-illustration-image"
    />
  </div>
);

const FeaturesArtifactPreview = () => (
  <div className="features-illustration-frame">
    <img
      src="assets/fitur-illustration-4.png"
      alt="Ilustrasi fitur artifak Makalah AI"
      className="features-illustration-image"
    />
  </div>
);

const FeaturesChoiceCardPreview = () => (
  <div className="features-illustration-frame">
    <img
      src="assets/fitur-illustration-5.png"
      alt="Ilustrasi fitur choice card Makalah AI"
      className="features-illustration-image"
    />
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
                  <span className="check features-check-square">
                    <i className="iconoir-check-square" aria-hidden="true" />
                  </span>
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
      <div className="hero-ornament" />
      <div className="container">
        <Reveal>
          <PageSplitHero
            className="features-page-head"
            eyebrow="/ fitur makalah ai"
            title={<>Bukan sekadar tempat bertanya, tetapi <em className="heading-muted">asisten penyusunan paper</em>.</>}
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
