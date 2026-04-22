/* Manifesto section */

const ManifestoSection = () => (
  <section className="section-frame">
    <div className="container">
      <Reveal>
        <div className="manifesto">
          <div className="eyebrow">Prinsip Kerja</div>
          <h2 style={{ marginTop: 20 }}>
            <span style={{ whiteSpace: "nowrap" }}>AI elaborasi &amp; menyusun kata,</span><br />
            <em><span style={{ whiteSpace: "nowrap" }}><span className="underline-brand-green">Kamu pegang kendali gagasan.</span><span className="blink" /></span></em>
          </h2>
          <p>
            Kami percaya paper yang bagus lahir dari proses berpikir yang benar, bukan dari generator sekali klik. Makalah AI dirancang untuk memperkuat dan mengelaborasi ide serta argumentasi —bukan menggantikannya. Manusia menjadi pawang, sedangkan Ai adalah tukang. Tiap peralihan tahap selalu melibatkanmu untuk menentukan arah penyusunan.
          </p>
        </div>
      </Reveal>
    </div>
  </section>
);

const Manifesto = ManifestoSection;

Object.assign(window, { Manifesto, ManifestoSection });
