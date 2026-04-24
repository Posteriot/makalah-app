/* Refrasa feature section */

const RefrasaFeatureSection = () => (
  <section id="refrasa" className="section-frame">
    <div className="container">
      <Reveal>
        <div className="sec-head">
          <div>
            <div className="sec-eyebrow">
              <span className="l">/ REFRASA</span>
            </div>
            <h2 className="sec-title">Bahasa robotik<br /><em className="heading-muted">→ prosa akademik manusiawi.</em></h2>
          </div>
          <p className="sec-desc">
            Sekali klik, paragraf-paragraf kaku ala AI berubah menjadi ritme penuturan manusiawi — kalimat bervariasi, transisi mulus, tanpa mengubah substansi.
          </p>
        </div>
      </Reveal>

      <div className="feature-showcase">
        <Reveal delay={2}>
          <ul className="feature-bullets">
            <li><span className="tok">TONE</span>Akademik · Laporan.</li>
            <li><span className="tok">DIKSI</span>Menggunakan sinonim kontekstual, bukan thesaurus buta.</li>
            <li><span className="tok">RITME</span>Variasi panjang kalimat, transisi antar-paragraf natural.</li>
            <li><span className="tok">LOCK</span>Istilah teknis &amp; kutipan dikunci, tidak diubah.</li>
          </ul>
        </Reveal>
        <Reveal delay={3}>
          <div className="feature-visual" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src="assets/ilustrasi-section-refrasa.png?bypass-cache=1" alt="Ilustrasi Refrasa Makalah AI" style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '12px' }} />
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const RefrasaFeature = RefrasaFeatureSection;

Object.assign(window, { RefrasaFeature, RefrasaFeatureSection });
