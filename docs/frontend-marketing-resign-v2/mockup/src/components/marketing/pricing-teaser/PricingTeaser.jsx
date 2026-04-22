/* Pricing teaser section */

const PricingTeaser = () => (
  <section id="harga" className="section-frame">
    <div className="container">
      <Reveal>
        <div className="sec-head">
          <div>
            <div className="sec-eyebrow">
              <span className="l">/ pemakaian &amp; harga</span>
            </div>
            <h2 className="sec-title">Seperti bayar asisten,<br /><em>dengan harga terjangkau</em></h2>
          </div>
          <p className="sec-desc">
            Model kredit transparan. Tersedia kredit gratis — cukup untuk menjajal kemampuan Makalah Ai. Upgrade kalau tertarik untuk lanjut.
          </p>
        </div>
      </Reveal>

      <Reveal delay={2}>
        <div className="pricing-grid">
          <div className="p-card">
            <div className="p-name">Starter</div>
            <div className="p-price">Rp0<span className="unit">/ sekali</span></div>
            <p className="p-desc">Cocok untuk mencoba 14 tahap workflow dan menyusun draft awal tanpa biaya.</p>
            <div className="p-meter" style={{ "--fill": "20%" }}>
              <div className="p-meter-row"><span>kredit</span><b>100</b></div>
              <div className="p-meter-bar" />
            </div>
            <ul>
              <li><span className="check"><Check /></span>Menjajal workflow Makalah Ai</li>
              <li><span className="check"><Check /></span>Memproses draft gagasan hingga pendahuluan</li>
              <li><span className="check"><Check /></span>Menggunakan Refrasa pada artifak yang terbuat</li>
            </ul>
            <a href="#" className="btn">Mulai gratis <Arrow /></a>
          </div>

          <div className="p-card featured">
            <span className="p-tag">PALING DIPILIH</span>
            <div className="p-name">Bayar per paper</div>
            <div className="p-price">Rp80<span className="unit">rb / paper</span></div>
            <p className="p-desc">Tepat untuk menggarap satu paper utuh, hingga download Word/PDF.</p>
            <div className="p-meter" style={{ "--fill": "60%" }}>
              <div className="p-meter-row"><span>kredit</span><b>300 / paper</b></div>
              <div className="p-meter-bar" />
            </div>
            <ul>
              <li><span className="check"><Check /></span>1 paper utuh (±15-20 halaman)</li>
              <li><span className="check"><Check /></span>Berproses di 14 tahap workflow Makalah Ai</li>
              <li><span className="check"><Check /></span>Refrasa semua artifak paper</li>
              <li><span className="check"><Check /></span>Memantau progres paper hingga jadi melalui fitur Naskah</li>
              <li><span className="check"><Check /></span>Download per artifact maupun paper jadi, dalam ekstensi .docx, .pdf.</li>
            </ul>
            <a href="#" className="btn btn-primary">Ambil paket <Arrow /></a>
          </div>

          <div className="p-card">
            <div className="p-name">Pro · bulanan</div>
            <div className="p-price">Rp200<span className="unit">rb / bln</span></div>
            <p className="p-desc">Ideal untuk penyusunan banyak paper dengan diskusi sepuasnya</p>
            <div className="p-meter" style={{ "--fill": "100%" }}>
              <div className="p-meter-row"><span>kredit</span><b>5,000 / bln</b></div>
              <div className="p-meter-bar" />
            </div>
            <ul>
              <li><span className="check"><Check /></span>±5-6 paper per bulan</li>
              <li><span className="check"><Check /></span>Semua fitur Bayar Per Paper</li>
              <li><span className="check"><Check /></span>Shared workspace (3 user)</li>
              <li><span className="check"><Check /></span>Custom style guide kampus</li>
              <li><span className="check"><Check /></span>Email support &lt; 24 jam</li>
            </ul>
            <a href="#" className="btn">Pilih paket <Arrow /></a>
          </div>
        </div>
      </Reveal>

      <Reveal delay={3}>
        <div style={{ textAlign: "center", marginTop: 32, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-3)" }}>
          Butuh plan kampus/lab? <a href="#" style={{ color: "var(--brand-green)" }}>Mari obrolkan →</a>
        </div>
      </Reveal>
    </div>
  </section>
);

const Pricing = PricingTeaser;

Object.assign(window, { Pricing, PricingTeaser });
