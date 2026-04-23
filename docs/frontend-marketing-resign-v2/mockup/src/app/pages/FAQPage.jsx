/* Static FAQ page mock */

const FAQ_PAGE_GROUPS = [
  {
    id: "cara-kerja",
    meta: "Cara kerja",
    label: "Memahami bagaimana Makalah AI memandu proses penyusunan paper.",
    intro: "Pertanyaan untuk memahami bagaimana Makalah memandu proses penyusunan paper.",
    items: [
      {
        question: "Apa beda Makalah AI dibanding aplikasi chatbot lain?",
        answer: "Makalah AI tidak diposisikan sebagai chat yang dibiarkan melebar ke mana-mana. Sistem ini memakai workflow yang terjaga, choice card untuk memudahkan keputusan, artifak untuk menampung hasil tiap tahap, dan naskah yang terus bertumbuh sampai paper terasa utuh."
      },
      {
        question: "Apakah saya harus jago menulis prompt untuk memakainya?",
        answer: "Tidak. Makalah memang dirancang untuk mengurangi ketergantungan pada prompt panjang. Di banyak titik penting, agen memberi recommendation lewat choice card sehingga Kamu bisa memilih arah yang paling sesuai tanpa harus selalu merumuskan instruksi dari nol."
      },
      {
        question: "Apa yang dimaksud workflow 14 tahap di Makalah AI?",
        answer: "Workflow 14 tahap adalah pagar kerja agar penyusunan paper berjalan runtut dari gagasan, topik, outline, sampai bagian-bagian akhir seperti pembaruan abstrak, daftar pustaka, lampiran, dan judul. Tujuannya menjaga konteks tetap utuh dan membuat progres lebih mudah ditinjau."
      }
    ]
  },
  {
    id: "kualitas-hasil",
    meta: "Kualitas hasil",
    label: "Mutu output dan batas penggunaan Makalah AI.",
    intro: "Pertanyaan yang biasanya muncul saat orang menilai mutu output dan batas penggunaan Makalah.",
    items: [
      {
        question: "Paper buatan Makalah AI bakal terdeteksi AI detector?",
        answer: "Makalah punya tahap Refrasa untuk membuat bahasa lebih natural dan lebih manusiawi. Meski begitu, fokus utama kami bukan mengejar detector, melainkan membantu Kamu menghasilkan paper yang lebih rapi, jelas, dan tetap terasa sebagai hasil kerja yang Kamu pahami."
      },
      {
        question: "Sumber sitasinya real atau halusinasi?",
        answer: "Makalah dirancang supaya sumber bisa dilacak kembali. Referensi yang dipakai bukan sekadar tempelan nama penulis, tetapi jejak sumber yang perlu tetap terbaca agar argumen paper bisa diaudit saat direvisi."
      },
      {
        question: "Selain paper akademik, apakah Makalah AI juga bisa menghasilkan skripsi, tesis, atau disertasi?",
        answer: "Tidak. Makalah AI difokuskan untuk penyusunan paper akademik dengan cakupan yang lebih terkendali. Untuk skripsi, tesis, atau disertasi penuh, skala, kedalaman, dan pengawasannya berbeda sehingga sebaiknya tetap dikerjakan secara mandiri bersama pembimbing."
      }
    ]
  },
  {
    id: "data-dan-privasi",
    meta: "Data & privasi",
    label: "Keamanan data, kontrol akses, dan kepemilikan hasil kerja.",
    intro: "Pertanyaan tentang keamanan data, kontrol akses, dan kepemilikan hasil kerja.",
    items: [
      {
        question: "Apakah dataku, baik percakapan maupun isi paper, aman?",
        answer: "Aman. Percakapan, draft, referensi, dan file yang Kamu unggah tersimpan terikat ke akunmu dan bersifat privat secara default. Data tidak dibagikan ke pengguna lain, dan kendali terhadap ekspor maupun penghapusan tetap ada di tanganmu."
      },
      {
        question: "Apakah data saya dipakai untuk melatih model?",
        answer: "Tidak. Data pengguna tidak diposisikan sebagai bahan pelatihan model. Fokus sistem ini adalah membantu proses kerja pengguna, bukan mengambil isi kerja mereka untuk kepentingan lain."
      },
      {
        question: "Kalau saya ingin menghapus riwayat kerja, apakah bisa?",
        answer: "Bisa. Kamu tetap perlu punya kendali untuk mengekspor, menghapus item tertentu, atau menghapus riwayat secara permanen ketika memang sudah tidak diperlukan lagi."
      }
    ]
  },
  {
    id: "paket-dan-kredit",
    meta: "Paket & kredit",
    label: "Penghitungan kredit, paket, dan kelanjutan kerja saat kuota habis.",
    intro: "Pertanyaan seputar cara hitung kredit, paket, dan kelanjutan kerja saat kuota habis.",
    items: [
      {
        question: "Apa maksud kredit di Makalah AI, dan bagaimana hitungannya?",
        answer: "Kredit adalah satuan pemakaian ketika AI bekerja membaca konteks, melakukan reasoning, dan menuliskan keluaran. Hitungannya berbasis token, jadi beban kerja ringan dan berat bisa dibedakan lebih adil daripada model hitung per pesan."
      },
      {
        question: "Kalau kredit habis, apakah paper saya hilang?",
        answer: "Tidak. Draft, artifak, dan progres yang sudah tersusun tetap ada. Kamu hanya perlu menambah paket untuk melanjutkan proses kerja berikutnya."
      },
      {
        question: "Apakah saya harus langsung berlangganan?",
        answer: "Tidak. Kamu bisa mulai dari paket yang paling ringan untuk memahami cara kerja Makalah terlebih dahulu, lalu naik ke paket yang lebih sesuai ketika kebutuhan menulis Kamu sudah lebih jelas."
      }
    ]
  }
];

const FAQ_PAGE_HIGHLIGHTS = [
  "Makalah memakai workflow 14 tahap, bukan chat bebas yang dibiarkan melebar.",
  "Makalah ditujukan untuk paper akademik, bukan skripsi atau tesis penuh.",
  "Data tetap privat dan kendali atas riwayat kerja tetap ada di tangan pengguna."
];

const FAQPageItem = ({ item, isOpen, onToggle }) => (
  <article className={`faq-item${isOpen ? " open" : ""}`}>
    <button className="faq-q" type="button" onClick={onToggle} aria-expanded={isOpen}>
      <h4>{item.question}</h4>
      <span className="pm" aria-hidden="true" />
    </button>
    <div className="faq-a">
      <p>{item.answer}</p>
    </div>
  </article>
);

const FAQPageGroup = ({ group, isOpen, activeIndex, onToggle }) => (
  <section className="faq-page-group" id={group.id}>
    <div className="faq-page-group-head">
      <div className="eyebrow">{group.meta}</div>
      <h2>{group.label}</h2>
    </div>
    <div className="faq-list faq-page-list">
      {group.items.map((item, index) => (
        <FAQPageItem
          key={item.question}
          item={item}
          isOpen={activeIndex === index}
          onToggle={() => onToggle(activeIndex === index ? -1 : index)}
        />
      ))}
    </div>
  </section>
);

const FAQPage = () => {
  const [openMap, setOpenMap] = React.useState(() =>
    FAQ_PAGE_GROUPS.reduce((acc, group, index) => {
      acc[group.id] = index === 0 ? 0 : -1;
      return acc;
    }, {})
  );

  const toggleGroupItem = (groupId, nextIndex) => {
    setOpenMap((prev) => ({
      ...prev,
      [groupId]: nextIndex
    }));
  };

  return (
    <div className="faq-page">
      <section className="section-frame faq-page-hero">
        <div className="hero-ornament" />
        <div className="container">
          <Reveal>
            <div className="faq-page-head">
              <div className="sec-eyebrow">
                <span className="l">/ faq makalah ai</span>
              </div>
              <h1 className="sec-title faq-page-title">
                Sebelum mulai, biasanya orang ingin <em>memastikan beberapa hal ini</em>.
              </h1>
            </div>
          </Reveal>

          <Reveal delay={1}>
            <div className="faq-page-hero-grid">
              <div className="faq-page-sidebar">
                <div className="faq-page-sidebar-card">
                  <div className="eyebrow">Hal penting</div>
                  <ul className="faq-page-highlight-list">
                    {FAQ_PAGE_HIGHLIGHTS.map((item) => (
                      <li key={item}>
                        <span className="check features-check-square">
                          <i className="iconoir-check-square" aria-hidden="true" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="faq-page-content">
                {FAQ_PAGE_GROUPS.map((group) => (
                  <Reveal key={group.id} delay={1}>
                    <FAQPageGroup
                      group={group}
                      activeIndex={openMap[group.id]}
                      isOpen={openMap[group.id]}
                      onToggle={(nextIndex) => toggleGroupItem(group.id, nextIndex)}
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-frame faq-page-cta-wrap">
        <div className="container">
          <Reveal>
            <div className="faq-page-cta">
              <div className="faq-page-cta-copy">
                <div className="eyebrow">Masih ada pertanyaan?</div>
                <h2>Kalau pertanyaan Kamu belum terjawab, lanjut ke dokumentasi atau hubungi tim.</h2>
                <p>
                  Beberapa hal memang lebih mudah dijelaskan lewat panduan yang lebih rinci.
                  Kalau ingin melihat alurnya lebih detail, dokumentasi adalah titik lanjut yang paling tepat.
                </p>
              </div>
              <div className="faq-page-cta-actions">
                <a href="#/documentation" className="btn btn-primary faq-page-cta-button">
                  Lihat dokumentasi <Arrow />
                </a>
                <a href="mailto:dukungan@makalah.ai" className="btn btn-ghost faq-page-cta-button faq-page-cta-button-secondary">
                  Hubungi tim <Arrow />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
};

Object.assign(window, {
  FAQ_PAGE_GROUPS,
  FAQ_PAGE_HIGHLIGHTS,
  FAQPageItem,
  FAQPageGroup,
  FAQPage
});
