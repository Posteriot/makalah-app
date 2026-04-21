/* Navbar, Hero, Marquee, Stats, Manifesto */

const Navbar = () => {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", on); on();
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="container nav-row">
        <div className="nav-left">
          <a href="#" className="brand">
            <div className="brand-mark"><Logo /></div>
            <Wordmark />
          </a>
          <div className="nav-links">
            <a href="#chat">Chat</a>
            <a href="#fitur">Fitur</a>
            <a href="#harga">Harga</a>
            <a href="#dokumentasi">Dokumentasi</a>
            <a href="#faq">FAQ</a>
            <a href="#tentang">Tentang</a>
          </div>
        </div>
        <div className="nav-right">
          <a href="#" className="btn btn-primary">Masuk <Arrow /></a>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => (
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
            <span style={{ whiteSpace: "nowrap" }}><span className="underline-accent">Obrolin aja!</span><span className="blink" /></span>
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

const Marquee = () => {
  const logos = [
    "Universitas Indonesia", "Institut Teknologi Bandung", "Universitas Gadjah Mada",
    "Universitas Airlangga", "Universitas Brawijaya", "Universitas Padjadjaran",
    "Binus University", "Universitas Diponegoro", "UPI Bandung", "Unhas Makassar"
  ];
  const items = [...logos, ...logos];
  return (
    <div className="marquee">
      <div className="container marquee-head">Dipakai peneliti &amp; mahasiswa di lebih dari 40 kampus</div>
      <div className="marquee-track">
        {items.map((l, i) => (
          <span key={i} className="marquee-item">{l}<span className="sep"> / </span></span>
        ))}
      </div>
    </div>
  );
};

const Stats = () => (
  <div className="container" style={{ paddingTop: 80, paddingBottom: 80 }}>
    <div className="stats">
      <div className="stat" style={{ "--fill": "82%" }}>
        <div className="label"><span className="marker" /> paper dipublikasi</div>
        <div className="value">12,847</div>
        <div className="sub">sejak Maret 2025</div>
        <div className="bar" />
      </div>
      <div className="stat" style={{ "--fill": "94%" }}>
        <div className="label"><span className="marker" /> sumber terverifikasi</div>
        <div className="value">240M+</div>
        <div className="sub">indeks jurnal + DOI</div>
        <div className="bar" />
      </div>
      <div className="stat" style={{ "--fill": "67%" }}>
        <div className="label"><span className="marker" /> rata-rata selesai</div>
        <div className="value">3.2<span style={{ fontSize: 22, color: "var(--ink-3)" }}> hari</span></div>
        <div className="sub">dari topik → final draft</div>
        <div className="bar" />
      </div>
      <div className="stat" style={{ "--fill": "99%" }}>
        <div className="label"><span className="marker" /> akurasi sitasi</div>
        <div className="value">99.4<span style={{ fontSize: 22 }}>%</span></div>
        <div className="sub">cross-checked DOI resolver</div>
        <div className="bar" />
      </div>
    </div>
  </div>
);

const Manifesto = () => (
  <section className="section-frame">
    <div className="container">
      <Reveal>
        <div className="manifesto">
          <div className="eyebrow">Prinsip Kerja</div>
          <h2 style={{ marginTop: 20 }}>
            <span style={{ whiteSpace: "nowrap" }}>AI elaborasi &amp; menyusun kata,</span><br />
            <em><span style={{ whiteSpace: "nowrap" }}><span className="underline-accent">Kamu pegang kendali gagasan.</span><span className="blink" /></span></em>
          </h2>
          <p>
            Kami percaya paper yang bagus lahir dari proses berpikir yang benar, bukan dari generator
            sekali klik. Makalah AI dirancang untuk memperkuat dan mengelaborasi ide serta argumentasi —bukan menggantikannya.
            Tiap peralihan tahap selalu melibatkanmu untuk menentukan arah penyusunan.
          </p>
        </div>
      </Reveal>
    </div>
  </section>
);

Object.assign(window, { Navbar, Hero, HeroConsole, Marquee, Stats, Manifesto });
