/* Benefits section */

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

const BenefitsSectionWrapper = () => {
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
              <h2 className="sec-title">Kerja bersama AI.<br /><em className="heading-muted">Bukan dibuatkan AI.</em></h2>
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

const Benefits = BenefitsSectionWrapper;

Object.assign(window, { Benefits, BenefitsSectionWrapper, BenefitFrame });
