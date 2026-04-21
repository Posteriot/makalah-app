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
            <a href="#fitur">Fitur</a>
            <a href="#demo">Demo</a>
            <a href="#harga">Harga</a>
            <a href="#dokumen">Dokumen</a>
            <a href="#faq">FAQ</a>
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
            Nulis paper<br/>
            tanpa <em>deadline-panic.</em><br/>
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
              <b>PROTOKOL</b><br/>
              14 tahap penyusunan paper dengan human-in-the-loop di tiap peralihan tahap.
            </div>
            <div className="hero-meta-block">
              <b>VERIFIKASI</b><br/>
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
  <div className="console">
    <div className="console-bar">
      <div className="dots"><span/><span/><span/></div>
      <div className="path">
        <span>makalah.ai</span>
        <span className="slash">/</span>
        <b>project-047</b>
        <span className="slash">/</span>
        <span>stage-07-tinjauan-literatur</span>
      </div>
      <div className="right">
        <span className="k">autosaved · 14:32</span>
        <span className="k">⌘K</span>
      </div>
    </div>
    <div className="console-body">
      <aside className="console-rail">
        <h5>Project</h5>
        <div className="stage-item done"><span className="idx">✓</span>Topik &amp; scope</div>
        <div className="stage-item done"><span className="idx">✓</span>Research question</div>
        <div className="stage-item done"><span className="idx">✓</span>Keyword map</div>
        <div className="stage-item done"><span className="idx">✓</span>Kerangka teori</div>
        <div className="stage-item done"><span className="idx">✓</span>Pencarian literatur</div>
        <div className="stage-item done"><span className="idx">✓</span>Shortlist sumber</div>
        <div className="stage-item active"><span className="idx">07</span>Tinjauan literatur</div>
        <h5>Upcoming</h5>
        <div className="stage-item pending"><span className="idx">08</span>Metodologi</div>
        <div className="stage-item pending"><span className="idx">09</span>Analisis</div>
        <div className="stage-item pending"><span className="idx">10</span>Diskusi</div>
        <div className="stage-item pending"><span className="idx">11</span>Simpulan</div>
        <div className="stage-item pending"><span className="idx">12</span>Refrasa &amp; edit</div>
        <div className="stage-item pending"><span className="idx">13</span>Export</div>
      </aside>

      <div className="console-main">
        <div className="chat-turn you">
          <div className="avatar">N</div>
          <div className="body">
            Aku mau bahas soal <span className="hl">adopsi AI di UMKM Indonesia pasca-pandemi</span>.
            Fokus di sektor kuliner yang pakai POS cloud. Aku udah punya 12 jurnal, tapi bingung bikin
            tinjauannya ga jadi ringkasan satu-per-satu.
          </div>
        </div>
        <div className="chat-turn ai">
          <div className="avatar">M</div>
          <div className="body">
            Oke. Kalau 12 itu dikelompokkan berdasarkan <b>sudut pandang</b>, bukan per jurnal, bakal jauh
            lebih ngalir. Dari shortlist lo aku lihat 3 klaster: (a) <span className="hl">technology acceptance</span> —
            Davis 1989 <span className="cite">[3]</span>, Venkatesh 2003 <span className="cite">[7]</span>;
            (b) <span className="hl">friksi kas kecil</span> — Prasetyo 2021 <span className="cite">[11]</span>;
            (c) <span className="hl">UX mobile-first</span> — Setiawan &amp; Rahardja 2023 <span className="cite">[4]</span>.
            Mau kita mulai dari klaster mana?
          </div>
        </div>
        <div className="typing">
          <span className="dots"><span/><span/><span/></span>
          sedang menyusun outline paragraf — 4 sitasi aktif
        </div>
      </div>

      <aside className="console-inspect">
        <h6>Context inspector</h6>
        <div className="inspect-row"><span>stage</span><b>07 / 14</b></div>
        <div className="inspect-row"><span>tokens</span><span className="tok">2,847 / 8k</span></div>
        <div className="inspect-row"><span>sources</span><b>12 verified</b></div>
        <div className="inspect-row"><span>DOI resolved</span><b>12 / 12</b></div>
        <div className="inspect-row"><span>style</span><b>APA 7</b></div>

        <div className="cite-card">
          <b>Davis, F. D. (1989)</b>
          Perceived Usefulness, Perceived Ease of Use, and User Acceptance of Information Technology.
          <div className="meta">MIS Quarterly · DOI:10.2307/249008 · ★ pinned</div>
        </div>
        <div className="cite-card">
          <b>Setiawan &amp; Rahardja (2023)</b>
          Mobile-first POS usability among Indonesian UMKM.
          <div className="meta">JUTI · Q2 · cited 34×</div>
        </div>
      </aside>
    </div>
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
            <span style={{ whiteSpace: "nowrap" }}>AI elaborasi &amp; menyusun kata,</span><br/>
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
