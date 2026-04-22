/* Benefits, Feature splits, Demo, Pricing, FAQ, Footer */

const BENEFITS = [
  {
    id: "sparring", num: "01", title: "Sparring partner, bukan ghostwriter",
    desc: "Mitra brainstorming, mengolah ide sampai paper jadi. Kamu tetap pegang kendali, AI jadi mitra periset dan penulis."
  },
  {
    id: "chat", num: "02", title: "Ngobrol wajar layaknya diskusi ",
    desc: "Tanpa prompt ritual. Tanpa 'act as professor'. Ungkapkan saja maksudmu — AI nyambung, lanjut, dan bikin pertanyaan balik."
  },
  {
    id: "bahasa", num: "03", title: "Bahasa manusiawi, tone akademik",
    desc: "Konversi kalimat kaku robotik jadi prosa mengalir tanpa mengorbankan presisi. Paragrafnya punya ritme."
  },
  {
    id: "workflow", num: "04", title: "14 tahap research loop",
    desc: "Pagar ketat di tiap tahap penyusunan — dari scoping sampai ekspor. Tidak ngalor-ngidul, tanpa  keluar konteks."
  }
];

const Benefits = () => {
  const [active, setActive] = React.useState("sparring");
  return (
    <section id="fitur" className="section-frame">
      <div className="container">
        <Reveal>
          <div className="sec-head">
            <div>
              <div className="sec-eyebrow">
                <span className="l">/ kenapa Makalah AI?</span>
              </div>
              <h2 className="sec-title">Kerja bersama AI.<br /><em>Bukan dibuatkan AI.</em></h2>
            </div>
            <p className="sec-desc">
              Empat prinsip yang bikin paper kamu tetap punya <b style={{ color: "var(--ink)" }}>akuntabilitas</b> — melalui kolaborasi dengan AI.
            </p>
          </div>
        </Reveal>

        <div className="benefits-grid">
          <div className="b-tabs">
            {BENEFITS.map(b => (
              <button
                key={b.id}
                className={`b-tab${active === b.id ? " active" : ""}`}
                onClick={() => setActive(b.id)}
              >
                <div>
                  <h4>{b.title}</h4>
                  <p>{b.desc}</p>
                </div>
                <span className="chev"><Chev /></span>
              </button>
            ))}
          </div>
          <div className="b-showcase">
            <BenefitFrame active={active} />
          </div>
        </div>
      </div>
    </section>
  );
};

const BenefitFrame = ({ active }) => {
  const imgViz = (
    <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center" }}>
      <img src="assets/ilustrasi-section-kenapa.png?bypass-cache=1" alt="Ilustrasi Kenapa Makalah AI" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );

  const FRAMES = {
    sparring: imgViz,
    chat: imgViz,
    bahasa: imgViz,
    workflow: imgViz
  };

  return Object.entries(FRAMES).map(([id, el]) => (
    <div key={id} className={`b-frame${active === id ? " active" : ""}`}>{el}</div>
  ));
};



/* ---------- Feature splits ---------- */
const WorkflowFeature = () => (
  <section id="workflow" className="section-frame">
    <div className="container">
      <Reveal>
        <div className="sec-head">
          <div>
            <div className="sec-eyebrow">
              <span className="l">/ WORKFLOW</span>
            </div>
            <h2 className="sec-title">Pagar ketat<br /><em>di tiap tahap</em></h2>
          </div>
          <p className="sec-desc">
            14 tahap terstruktur dari menggodok gagasan, penentuan topik sampai kesimpulan final. Tiap peralihan tahap dan keputusan butuh konfirmasi kamu — maka konteks terjaga, argumen tidak mengambang.
          </p>
        </div>
      </Reveal>

      <div className="feature-showcase">
        <Reveal delay={2}>
          <ul className="feature-bullets">
            <li><span className="tok">01→04</span>Scoping: topik, pertanyaan riset, keyword map, kerangka teori.</li>
            <li><span className="tok">05→07</span>Research: pencarian literatur, shortlist, tinjauan berkluster.</li>
            <li><span className="tok">08→11</span>Analisis: metodologi, temuan, diskusi, simpulan.</li>
            <li><span className="tok">12→14</span>Polish: refrasa manusiawi &amp; ekspor multi-format.</li>
          </ul>
        </Reveal>
        <Reveal delay={3}>
          <div className="feature-visual" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src="assets/ilustrasi-workflow.png?bypass-cache=1" alt="Ilustrasi Workflow Makalah AI" style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '12px' }} />
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const RefrasaFeature = () => (
  <section id="refrasa" className="section-frame">
    <div className="container">
      <Reveal>
        <div className="sec-head">
          <div>
            <div className="sec-eyebrow">
              <span className="l">/ REFRASA</span>
            </div>
            <h2 className="sec-title">Bahasa robotik<br /><em>→ prosa akademik manusiawi.</em></h2>
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

/* ---------- Demo ---------- */
const Demo = () => {
  return (
    <section id="demo" className="section-frame">
      <div className="container">
        <Reveal>
          <div className="sec-head">
            <div>
              <div className="sec-eyebrow">
                <span className="l">/ live preview</span>
              </div>
              <h2 className="sec-title">Coba langsung.<br /><em>Daftar dulu.</em></h2>
            </div>
            <p className="sec-desc">
              Ketik topik — lihat cara Makalah AI mengeksplorasi ide, menyusun abstrak + pendahuluan, lengkap dengan sitasi real. Progress penyusunan bisa dipantau melalui activity bar, pratinjau paper jadi pun bisa dilihat lewat fitur Naskah.
            </p>
          </div>
        </Reveal>

        <Reveal delay={2}>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src="assets/ilustrasi-live-preview.png?bypass-cache=1" alt="Ilustrasi Live Preview Makalah AI" style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '12px' }} />
          </div>
        </Reveal>
      </div>
    </section>
  );
};

/* ---------- Pricing ---------- */
const Pricing = () => (
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

/* ---------- FAQ ---------- */
const FAQS = [
  {
    q: "Apa beda Makalah AI dibanding  aplikasi  chatbot lain?",
    a: "Makalah AI punya workflow yang terjaga ketat, jadi tanpa prompt rumit atau aturan diskusi yang aneh-aneh, konteks penulisan tetap terjaga dari awal sampai akhir. Metode diskusinya juga dibantu dengan choice card — setiap opsi tinggal dipilih, tidak perlu menyusun instruksi panjang. Dan di setiap iterasi selalu ada rekomendasi langkah, tindakan, atau pendapat, sehingga pengguna tidak pernah berhenti di tengah jalan tanpa tahu harus ngapain."
  },
  {
    q: "Paper buatan Makalah AI bakal kedetect AI detector?",
    a: "Output setelah tahap Refrasa lolos dari Turnitin AI, GPTZero, dan Originality.ai di 94% test kami. Tapi jujur — kami dorong lo aktif di tiap handover biar hasilnya emang punya lo, bukan cuma lolos detector."
  },
  {
    q: "Selain paper akademik, apakah Makalah AI juga bisa menghasilkan skripsi/tesis/disertasi?",
    a: "Tidak. Makalah AI hanya untuk menyusun paper akademik, maksimal sekitar 25 halaman. Untuk skripsi, tesis, maupun disertasi, cakupan dan kedalaman argumennya di luar scope tool ini — jadi sebaiknya tetap disusun secara mandiri bersama pembimbing."
  },
  {
    q: "Sumber sitasinya real atau halusinasi seperti chatbot kebanyakan?",
    a: "Real. Makalah AI menggunakan search orchestrator yang menjalankan pencarian web, fetch konten, filtering & ranking berbasis kualitas, verifikasi sumber, hingga retrieval-augmented generation. Referensi yang tervalidasi disimpan ter-index di database internal — sehingga setiap sitasi dapat ditelusuri balik ke sumber aslinya, bukan dikarang seperti chatbot pada umumnya."
  },
  {
    q: "Apa maksud \"Kredit\" di Makalah AI, dan bagaimana hitungannya?",
    a: "\"Kredit\" adalah satuan pemakaian Makalah AI — semacam saldo yang terpakai setiap kali AI bekerja untukmu: membaca instruksi, menelaah konteks, melakukan reasoning, hingga menuliskan jawaban. Hitungannya berbasis token (unit terkecil yang diproses model AI), bukan per-pesan atau per-paragraf, supaya pemakaian ringan dan berat dibedakan secara adil. Sebagai patokan: 1 kredit ≈ 1.000 token, kurang-lebih setara 600–800 kata bahasa Indonesia. Contohnya, 10 kredit ≈ 6.000–8.000 kata, 100 kredit ≈ 60.000–80.000 kata, dan 300 kredit ≈ 180.000–240.000 kata. Sisa kredit dan estimasi pemakaian selalu terlihat di console."
  },
  {
    q: "Apakah dataku, baik percakapan maupun yang tertera di paper, aman?",
    a: "Aman. Seluruh percakapan, draft, referensi, dan file yang kamu unggah tersimpan terikat ke akunmu dan bersifat privat secara default — tidak pernah dipakai untuk melatih model, tidak dibagikan ke pihak lain, dan tidak dapat diakses oleh pengguna lain. Data dienkripsi baik saat transit (TLS) maupun saat tersimpan (at-rest), dengan akses dibatasi lewat autentikasi akun. Kendali sepenuhnya ada di tanganmu: kamu bisa mengekspor, menghapus per-item, atau menghapus permanen seluruh riwayat kapan saja — dan begitu dihapus, data benar-benar hilang dari sistem, bukan sekadar disembunyikan."
  }
];

const FAQ = () => {
  const [open, setOpen] = React.useState(0);
  return (
    <section id="faq" className="section-frame">
      <div className="container">
        <div className="faq">
          <Reveal>
            <div>
              <div className="sec-eyebrow">
                <span className="l">/ pertanyaan wajar</span>
              </div>
              <h2 className="sec-title">Sebelum<br />Kamu tanya.</h2>
              <p className="sec-desc" style={{ marginTop: 16 }}>
                Enam pertanyaan yang paling sering kami terima. Masih bingung? → <a href="#" style={{ color: "var(--brand-green)" }}>dukungan@makalah.ai</a>
              </p>
            </div>
          </Reveal>
          <Reveal delay={2}>
            <div className="faq-list">
              {FAQS.map((f, i) => (
                <div key={i} className={`faq-item${open === i ? " open" : ""}`}>
                  <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                    <h4>{f.q}</h4>
                    <span className="pm" />
                  </button>
                  <div className="faq-a">{f.a}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};

/* ---------- Footer ---------- */
const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-top">
        <div className="footer-col">
          <h5>Produk</h5>
          <a href="#chat">Chat</a>
          <a href="#fitur">Fitur</a>
          <a href="#harga">Harga</a>
          <a href="#roadmap">Roadmap</a>
          <a href="#changelog">Changelog</a>
        </div>
        <div className="footer-col">
          <h5>Sumber daya</h5>
          <a href="#dokumentasi">Dokumentasi</a>
          <a href="#blog">Blog</a>
          <a href="#status">Status</a>
          <a href="#laporan">Lapor Masalah</a>
        </div>
        <div className="footer-col">
          <h5>Perusahaan</h5>
          <a href="#tentang">Tentang</a>
          <a href="#kerjasama">Kerja Sama</a>
          <a href="#karier">Karier</a>
          <a href="#kontak">Kontak</a>
        </div>
        <div className="footer-col">
          <h5>Legal</h5>
          <a href="#security">Security</a>
          <a href="#terms">Terms</a>
          <a href="#privacy">Privacy</a>
        </div>
      </div>
    </div>

    <div className="footer-wordmark">
      MAKALAH.AI
    </div>

    <div className="container">
      <div className="footer-bottom">
        <div className="fb-left">
          <span>© 2026 Makalah AI.</span>
          <span>Produk PT The Management Asia.</span>
        </div>
        <div className="fb-right">
          <span>Made in Jakarta.</span>
          <span>v0.8</span>
        </div>
      </div>
    </div>
  </footer>
);

Object.assign(window, { Benefits, WorkflowFeature, RefrasaFeature, Demo, Pricing, FAQ, Footer });
