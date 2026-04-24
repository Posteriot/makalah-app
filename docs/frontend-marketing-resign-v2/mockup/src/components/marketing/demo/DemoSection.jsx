/* Demo section */

const DemoSection = () => {
  return (
    <section id="demo" className="section-frame">
      <div className="container">
        <Reveal>
          <div className="sec-head">
            <div>
              <div className="sec-eyebrow">
                <span className="l">/ Uji Pratinjau</span>
              </div>
              <h2 className="sec-title">Coba langsung.<br /><em className="heading-muted">Daftar dulu.</em></h2>
            </div>
            <p className="sec-desc">
              Daftar sekarang. Sign up mudah menggunakan Google atau registrasi manusal. Masuki halaman chat. Lalu, ketik topik — lihat cara Makalah AI mengeksplorasi ide, menyusun abstrak + pendahuluan, lengkap dengan sitasi real. Progress penyusunan bisa dipantau melalui activity bar, pratinjau paper jadi pun bisa dilihat lewat fitur Naskah.
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

const Demo = DemoSection;

Object.assign(window, { Demo, DemoSection });
