/* Static pricing page mock */

const PRICING_PAGE_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "Rp0",
    unit: "/ sekali mulai",
    description: "Cocok untuk mencoba alur kerja Makalah AI dan melihat bagaimana ide berkembang jadi draft awal.",
    credits: "100",
    fill: "22%",
    cta: "Mulai gratis",
    href: "#/documentation",
    bullets: [
      "100 kredit untuk eksplorasi awal",
      "Mencoba 14 tahap workflow secara terbatas",
      "Menyusun draft dari gagasan sampai pendahuluan",
      "Refrasa untuk artifak yang sudah dibuat",
      "Tanpa komitmen pembayaran di awal"
    ]
  },
  {
    id: "paper",
    name: "Bayar per paper",
    price: "Rp80 rb",
    unit: "/ paper",
    description: "Paling pas kalau Kamu ingin menyelesaikan satu paper utuh dengan proses yang tetap terarah dan bisa dipantau.",
    credits: "300 / paper",
    fill: "64%",
    cta: "Ambil paket ini",
    href: "#/",
    featured: true,
    tag: "PALING DIPILIH",
    bullets: [
      "300 kredit untuk 1 paper utuh",
      "Cocok untuk paper sekitar 15-20 halaman",
      "Akses penuh ke 14 tahap workflow",
      "Refrasa untuk seluruh artifak paper",
      "Unduh hasil ke .docx dan .pdf"
    ]
  },
  {
    id: "pro",
    name: "Pro bulanan",
    price: "Rp200 rb",
    unit: "/ bulan",
    description: "Untuk Kamu yang menulis lebih rutin, butuh ruang diskusi lebih panjang, dan ingin workflow yang lebih fleksibel sepanjang bulan.",
    credits: "5.000 / bulan",
    fill: "100%",
    cta: "Pilih plan Pro",
    href: "#/partnership",
    bullets: [
      "5.000 kredit per bulan",
      "Cukup untuk sekitar 5-6 paper",
      "Semua fitur di paket Bayar per paper",
      "Shared workspace untuk 3 pengguna",
      "Email support dengan respons di bawah 24 jam"
    ]
  }
];

const PRICING_PAGE_FAQS = [
  {
    question: "Kalau kredit habis, apakah paper saya hilang?",
    answer: "Tidak. Draft dan artifak yang sudah dibuat tetap ada. Kamu hanya perlu menambah paket untuk melanjutkan proses atau unduhan lanjutan."
  },
  {
    question: "Apakah saya harus langsung berlangganan?",
    answer: "Tidak. Kamu bisa mulai dari Starter, lalu lanjut ke Bayar per paper kalau memang sudah cocok dengan cara kerja Makalah AI."
  },
  {
    question: "Apakah paket bulanan cocok untuk tim kecil?",
    answer: "Ya. Plan Pro lebih cocok untuk pengguna yang rutin menulis, merevisi, atau bekerja bersama dalam satu workspace."
  }
];

const PricingPageFaqItem = ({ item, isOpen, onToggle }) => (
  <div className={`faq-item${isOpen ? " open" : ""}`}>
    <button className="faq-q" type="button" onClick={onToggle} aria-expanded={isOpen}>
      <h4>{item.question}</h4>
      <span className="pm" aria-hidden="true" />
    </button>
    <div className="faq-a">
      <p>{item.answer}</p>
    </div>
  </div>
);

const PricingPlanCard = ({ plan }) => (
  <div className={`p-card${plan.featured ? " featured" : ""}`}>
    {plan.tag ? <span className="p-tag">{plan.tag}</span> : null}
    <div className="p-name">{plan.name}</div>
    <div className="p-price">
      {plan.price}
      <span className="unit">{plan.unit}</span>
    </div>
    <p className="p-desc">{plan.description}</p>
    <div className="p-meter" style={{ "--fill": plan.fill }}>
      <div className="p-meter-row">
        <span>kredit</span>
        <b>{plan.credits}</b>
      </div>
      <div className="p-meter-bar" />
    </div>
    <ul>
      {plan.bullets.map((bullet) => (
        <li key={bullet}>
          <span className="check"><Check /></span>
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
    <a href={plan.href} className={`btn${plan.featured ? " btn-primary" : ""}`}>
      {plan.cta} <Arrow />
    </a>
  </div>
);

const PricingPage = () => {
  const [openFaqIndex, setOpenFaqIndex] = React.useState(0);

  return (
    <div className="pricing-page">
      <section className="section-frame pricing-page-hero">
        <div className="hero-ornament" />
        <div className="container">
          <Reveal>
            <div className="pricing-page-head">
              <div className="sec-eyebrow">
                <span className="l">/ harga &amp; paket</span>
              </div>
              <h1 className="sec-title pricing-page-title">
                Pilih paket yang sesuai dengan cara <em>Kamu menulis paper</em>
              </h1>
              <p className="sec-desc page-split-desc pricing-page-desc">
                Mulai gratis untuk mencoba workflow-nya, bayar per paper saat butuh hasil utuh, atau pakai plan bulanan kalau Kamu rutin menulis dan merevisi.
              </p>
            </div>
          </Reveal>

          <Reveal delay={1}>
            <div className="pricing-page-grid pricing-grid">
              {PRICING_PAGE_PLANS.map((plan) => (
                <PricingPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-frame pricing-page-faq-wrap">
        <div className="container">
          <Reveal>
            <div className="faq pricing-page-faq">
              <div className="pricing-page-faq-copy">
                <div className="eyebrow">Pertanyaan umum</div>
                <h2>Hal yang biasanya langsung ingin Kamu pastikan</h2>
                <p>
                  Pricing page ini sengaja dibuat ringkas. Kalau masih ragu memilih paket,
                  mulai dari pertanyaan yang paling sering muncul dulu.
                </p>
              </div>
              <div className="faq-list">
                {PRICING_PAGE_FAQS.map((item, index) => (
                  <PricingPageFaqItem
                    key={item.question}
                    item={item}
                    isOpen={openFaqIndex === index}
                    onToggle={() => setOpenFaqIndex(openFaqIndex === index ? -1 : index)}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-frame pricing-page-cta-wrap">
        <div className="container">
          <Reveal>
            <div className="pricing-page-cta">
              <div className="pricing-page-cta-copy">
                <div className="eyebrow">Plan institusi</div>
                <h2>Butuh plan untuk kampus, lab, atau kelas riset?</h2>
                <p>
                  Kami bisa bantu siapkan paket dengan kuota, workspace, dan style guide
                  yang lebih sesuai untuk penggunaan bersama.
                </p>
              </div>
              <div className="pricing-page-cta-actions">
                <a href="#/partnership" className="btn btn-primary pricing-page-cta-button">
                  Diskusikan plan kampus/lab <Arrow />
                </a>
                <a href="#/documentation" className="btn btn-ghost pricing-page-cta-button pricing-page-cta-button-secondary">
                  Lihat dokumentasi <Arrow />
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
  PRICING_PAGE_PLANS,
  PRICING_PAGE_FAQS,
  PricingPlanCard,
  PricingPageFaqItem,
  PricingPage
});
