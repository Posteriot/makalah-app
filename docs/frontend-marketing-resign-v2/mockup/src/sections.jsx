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
                <span className="num" style={{ fontFamily: '"Geist Mono"', fontSize: '12px', fontWeight: 400, padding: '6px 12px 6px 8px' }}>{b.num}</span>
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
  const FRAMES = {
    sparring: <SparringViz />,
    chat: <ChatViz />,
    bahasa: <BahasaViz />,
    workflow: <WorkflowViz />
  };
  return Object.entries(FRAMES).map(([id, el]) => (
    <div key={id} className={`b-frame${active === id ? " active" : ""}`}>{el}</div>
  ));
};

const SparringViz = () => (
  <div style={{ width: "100%", maxWidth: 480 }}>
    <div style={{
      border: "1px solid var(--line-2)", borderRadius: 12, overflow: "hidden",
      background: "var(--bg-2)", boxShadow: "0 30px 60px rgba(0,0,0,0.4)"
    }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
        sparring · stage 04 / kerangka teori
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--line-2)", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--font-mono)" }}>N</div>
          <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.55 }}>
            Aku pengen pakai TAM tapi rasanya terlalu umum buat konteks UMKM.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", color: "var(--accent-ink)", flexShrink: 0, display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700 }}>M</div>
          <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>
            Setuju. Extend pakai <span style={{ background: "var(--accent-soft)", color: "var(--ink)", padding: "1px 4px" }}>UTAUT2</span> — dia sudah memasukkan
            <i> facilitating conditions</i> yang relevan buat warung kecil. Atau mau aku cariin model lokal?
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <span style={{ padding: "4px 10px", border: "1px solid var(--line-hot)", borderRadius: 100, fontSize: 11, color: "var(--accent)", background: "var(--accent-soft)", fontFamily: "var(--font-mono)" }}>→ pakai UTAUT2</span>
          <span style={{ padding: "4px 10px", border: "1px solid var(--line-2)", borderRadius: 100, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>cariin alt</span>
          <span style={{ padding: "4px 10px", border: "1px solid var(--line-2)", borderRadius: 100, fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>skip</span>
        </div>
      </div>
    </div>
  </div>
);

const ChatViz = () => (
  <div style={{ width: "100%", maxWidth: 500, display: "flex", flexDirection: "column", gap: 10 }}>
    {[
      { who: "N", text: "jujur aja aku gatau mau nulis apa buat bab 2" },
      { who: "M", text: "Hehe santai. Dari 3 sumber yang kamu drop, common thread-nya soal user trust. Mau kita mulai dari situ?" },
      { who: "N", text: "trust-nya lebih ke data privacy apa ke UI yg kelihatan 'beneran'?" },
      { who: "M", text: "Dua-duanya muncul. Tapi di konteks UMKM Indo, privacy belum jadi concern utama — UI legitimacy lebih dominan. Mau kita split jadi dua sub-bagian?" }
    ].map((m, i) => (
      <div key={i} style={{ display: "flex", gap: 10, justifyContent: m.who === "N" ? "flex-end" : "flex-start" }}>
        {m.who === "M" && <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, flexShrink: 0 }}>M</div>}
        <div style={{
          padding: "10px 14px", borderRadius: 12,
          fontSize: 13, lineHeight: 1.55, maxWidth: "78%",
          background: m.who === "N" ? "var(--bg-2)" : "var(--bg-panel)",
          border: "1px solid var(--line)",
          color: m.who === "N" ? "var(--ink)" : "var(--ink-2)"
        }}>{m.text}</div>
      </div>
    ))}
  </div>
);

const BahasaViz = () => (
  <div style={{ width: "100%", maxWidth: 520, display: "grid", gap: 10 }}>
    <div className="diff-block">
      <div className="diff-head"><span>input robotik</span><span className="tag before">SEBELUM</span></div>
      <div className="diff-body"><span className="strike">Berdasarkan hal tersebut di atas, dapat disimpulkan bahwa faktor-faktor yang mempengaruhi adopsi teknologi di kalangan UMKM adalah sangat beragam dan kompleks.</span></div>
    </div>
    <div className="diff-block" style={{ borderColor: "var(--line-hot)" }}>
      <div className="diff-head"><span>output manusiawi</span><span className="tag after">SETELAH · APA 7</span></div>
      <div className="diff-body"><span className="ins">Adopsi teknologi di kalangan UMKM dipengaruhi banyak faktor yang saling berkelindan — dari kapasitas digital pemilik usaha hingga ekosistem pembayaran yang tersedia.</span></div>
    </div>
    <div className="refrasa-meta">
      <div className="cell"><div className="lbl">Kata</div><div className="val">31 → 22</div></div>
      <div className="cell"><div className="lbl">Readability</div><div className="val acc">+34%</div></div>
      <div className="cell"><div className="lbl">Substansi</div><div className="val">100%</div></div>
    </div>
  </div>
);

const WorkflowViz = () => (
  <div style={{ width: "100%", maxWidth: 540 }}>
    <div className="wf-diag">
      {Array.from({ length: 14 }, (_, i) => {
        const cls = i < 6 ? "done" : i === 6 ? "active" : "";
        return <div key={i} className={`wf-step ${cls}`}>{String(i + 1).padStart(2, "0")}</div>;
      })}
    </div>
    <div className="wf-detail">
      <div className="wf-detail-head"><b>Stage 07 — Tinjauan literatur</b><span className="tag">IN PROGRESS</span></div>
      <div className="wf-detail-body">
        <div className="wf-row"><span className="lbl">sources verified</span><span className="val ok">12 / 12</span></div>
        <div className="wf-row"><span className="lbl">outline paragraf</span><span className="val">4 klaster</span></div>
        <div className="wf-row"><span className="lbl">sitasi aktif</span><span className="val acc">9</span></div>
        <div className="wf-row"><span className="lbl">handover next</span><span className="val">Metodologi →</span></div>
      </div>
    </div>
  </div>
);

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
            <h2 className="sec-title">Pagar ketat<br /><em>di tiap tahap<br />penyusunan.</em></h2>
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
          <div className="feature-visual">
            <WorkflowViz />
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const RefrasaFeature = () => (
  <section className="feature reverse" id="refrasa">
    <Reveal>
      <div className="feature-visual">
        <BahasaViz />
      </div>
    </Reveal>
    <div className="feature-text">
      <Reveal delay={2}>
        <span className="eyebrow">/ REFRASA</span>
        <h3>Bahasa robotik<br />→ prosa akademik<br />yang manusiawi.</h3>
        <p>
          Sekali klik, paragraf-paragraf kaku ala AI berubah menjadi ritme penuturan manusiawi — kalimat bervariasi,
          transisi mulus, tanpa mengubah substansi.
        </p>
        <ul className="feature-bullets">
          <li><span className="tok">TONE</span>Akademik · Laporan.</li>
          <li><span className="tok">DIKSI</span>Menggunakan sinonim kontekstual, bukan thesaurus buta.</li>
          <li><span className="tok">RITME</span>Variasi panjang kalimat, transisi antar-paragraf natural.</li>
          <li><span className="tok">LOCK</span>Istilah teknis &amp; kutipan dikunci, tidak diubah.</li>
        </ul>
      </Reveal>
    </div>
  </section>
);

/* ---------- Demo ---------- */
const DEMO_TOPICS = [
  "Dampak TikTok Shop terhadap UMKM lokal",
  "Adopsi AI generatif di pendidikan tinggi Indonesia",
  "Feminisme digital di ruang komentar Twitter",
  "Efektivitas MBKM pada kesiapan kerja lulusan"
];

const Demo = () => {
  const [topic, setTopic] = React.useState(DEMO_TOPICS[0]);
  const [style, setStyle] = React.useState("APA 7");
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
          <div className="demo">
            <div className="demo-head">
              <h3>Mulai dari satu kalimat.<br />Dapet outline + 6 sitasi dalam 12 detik.</h3>
              <span className="mono-label" style={{ marginTop: 6 }}>⏱ avg. 12.4s · 6 sumber</span>
            </div>
            <div className="demo-input-row">
              <span className="prefix">topik {">"}</span>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} />
              <span className="mono-label">{style}</span>
              <a href="#" className="btn btn-primary" style={{ padding: "8px 14px" }}>Generate <Arrow /></a>
            </div>
            <div className="demo-chips">
              {DEMO_TOPICS.map(t => (
                <button key={t} className={`demo-chip${t === topic ? " active" : ""}`} onClick={() => setTopic(t)}>
                  {t}
                </button>
              ))}
              <span style={{ flex: 1 }} />
              {["APA 7", "Chicago", "IEEE", "Harvard"].map(s => (
                <button key={s} className={`demo-chip${s === style ? " active" : ""}`} onClick={() => setStyle(s)}>{s}</button>
              ))}
            </div>

            <div className="demo-output">
              <div className="demo-paper">
                <h4>{topic}</h4>
                <div className="section-lbl">abstrak · draft auto-generated</div>
                <p>
                  Studi ini mengeksplorasi bagaimana {topic.toLowerCase()} membentuk perilaku digital konsumen
                  muda urban di Indonesia. Dengan pendekatan kualitatif-deskriptif dan pengambilan data melalui
                  wawancara semi-terstruktur terhadap 24 informan (Creswell, 2018)<span className="cite">¹</span>,
                  penelitian menemukan tiga pola adaptasi utama<span className="cite">²</span>.
                </p>
                <div className="section-lbl">tinjauan literatur · klaster 1 dari 3</div>
                <p>
                  Kerangka <i>technology acceptance model</i> (Davis, 1989)<span className="cite">³</span>
                  tetap relevan, namun perlu diperluas dengan variabel <i>facilitating conditions</i>
                  (Venkatesh et al., 2003)<span className="cite">⁴</span> untuk menangkap konteks
                  infrastruktur digital UMKM<span className="cite">⁵</span>.<span className="typing-line" />
                </p>
              </div>
              <aside className="demo-side">
                <h6>Sumber ({topic.length % 3 === 0 ? 6 : 5})</h6>
                {[
                  { n: "¹", t: "Creswell, J. W.", y: "2018", meta: "Research Design · Sage", cited: "42k" },
                  { n: "²", t: "Prasetyo, R.", y: "2023", meta: "JIAI · Q2", cited: "87" },
                  { n: "³", t: "Davis, F. D.", y: "1989", meta: "MIS Quarterly", cited: "78k" },
                  { n: "⁴", t: "Venkatesh et al.", y: "2003", meta: "MIS Quarterly", cited: "54k" },
                  { n: "⁵", t: "Setiawan & R.", y: "2023", meta: "JUTI · Q2", cited: "34" }
                ].map(r => (
                  <div key={r.n} className="ref">
                    <b>{r.n} {r.t} ({r.y})</b>
                    {r.meta}
                    <div className="meta"><span className="acc">DOI ✓</span><span>cited {r.cited}×</span></div>
                  </div>
                ))}
              </aside>
            </div>
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
        <div style={{ textAlign: "center", marginTop: 32, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
          butuh plan kampus / lab? <a href="#" style={{ color: "var(--accent)" }}>ngobrol sama tim →</a>
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
                Enam pertanyaan yang paling sering kami terima. Masih bingung? → <a href="#" style={{ color: "var(--accent)" }}>dukungan@makalah.ai</a>
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
        <span>© 2026 Makalah AI — Produk PT The Management Asia.</span>
        <div className="meta">
          <span>Made in Jakarta</span>
          <span className="dot" />
          <span>v2.1.3</span>
          <span className="dot" />
          <span>all systems nominal</span>
        </div>
      </div>
    </div>
  </footer>
);

Object.assign(window, { Benefits, WorkflowFeature, RefrasaFeature, Demo, Pricing, FAQ, Footer });
