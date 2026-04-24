/* FAQ section */

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

const FAQSection = () => {
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
              <h2 className="sec-title">Sebelum<br /><span className="heading-muted">Kamu tanya.</span></h2>
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

const FAQ = FAQSection;

Object.assign(window, { FAQ, FAQSection });
