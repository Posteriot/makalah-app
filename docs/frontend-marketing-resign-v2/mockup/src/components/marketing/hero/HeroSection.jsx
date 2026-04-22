/* Marketing hero section */

const HeroSection = () => (
  <section className="hero">
    <div className="hero-ornament" />
    <div className="container">
      <div className="hero-head">
        <Reveal>
          <div className="hero-badge-row">
            <span className="hero-badge" style={{ fontFamily: "Geist", fontSize: "12px", fontWeight: 400 }}><span className="tag-dot"><span className="pulse" /></span> Kamu Pawang, AI Tukang</span>
          </div>
          <h1 className="hero-title">
            Nulis paper<br />
            tanpa <em>deadline-panic.</em><br />
            <span style={{ whiteSpace: "nowrap" }}><span className="underline-brand-green">Obrolin aja!</span><span className="blink" /></span>
          </h1>
          <p className="hero-sub">
            Bukan mesin prompt,  melainkan sparring partner, dari brainstorm ide hingga paper utuh—lengkap tinjauan
            literatur, metodologi, dan sitasi terverifikasi.
          </p>
          <div className="hero-cta">
            <a href="#" className="btn btn-primary">Coba <Arrow /></a>
          </div>
        </Reveal>
        <Reveal delay={2}>
          <aside className="hero-meta">
            <div className="hero-meta-block">
              <b>PROTOKOL</b><br />
              14 tahap penyusunan paper dengan human-in-the-loop di tiap peralihan tahap.
            </div>
            <div className="hero-meta-block">
              <b>VERIFIKASI</b><br />
              Cross-checked terhadap ribuan paper di internet
            </div>
          </aside>
        </Reveal>
      </div>

      <Reveal delay={3}><HeroConsole /></Reveal>
    </div>
  </section>
);

const HeroConsole = () => (
  <div className="hero-illustration" style={{ marginTop: '56px', width: '100%', display: 'flex', justifyContent: 'center' }}>
    <img src="assets/ilustrasi-hero.png" alt="Ilustrasi Console Makalah AI" style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '12px' }} />
  </div>
);

const Hero = HeroSection;

Object.assign(window, { Hero, HeroSection, HeroConsole });
