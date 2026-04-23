/* Static documentation page mock */

const DOC_PAGE_SECTIONS = [
  {
    id: "tinjauan",
    group: "Tinjauan",
    title: "Tinjauan",
    label: "Tinjauan",
    summary: "Makalah AI membantu Kamu menulis paper secara bertahap, bukan dalam satu proses panjang yang sulit dikendalikan.",
    sections: [
      {
        title: "Apa yang akan Kamu lihat di workspace",
        paragraphs: [
          "Sidebar di kiri membantu Kamu berpindah antar panduan. Area konten di kanan menampilkan penjelasan utama, langkah kerja, dan panduan lanjutan yang masih terkait dengan topik yang sedang dibuka.",
          "Kalau baru pertama kali memakai Makalah AI, mulai dari halaman ini dulu. Setelah itu, lanjutkan ke topik yang paling dekat dengan kebutuhan Kamu saat ini."
        ]
      },
      {
        title: "Kapan sebaiknya mulai dari Tinjauan",
        paragraphs: [
          "Mulai dari Tinjauan kalau Kamu belum memahami urutan workflow, belum tahu menu mana yang paling relevan, atau ingin melihat gambaran besar sebelum masuk ke panduan yang lebih spesifik."
        ],
        list: [
          "Pahami alur dasar dari topik sampai output",
          "Lanjut ke workflow penulisan saat arah kerja sudah jelas",
          "Buka revisi dan output saat draft mulai stabil",
          "Cek workspace dan kredit saat ritme kerja sudah rutin"
        ]
      },
      {
        title: "Panduan berikutnya yang paling relevan",
        paragraphs: [
          "Kalau Kamu sudah siap mulai, lanjut ke panduan menentukan topik dan tujuan. Kalau Kamu ingin langsung memahami inti sistemnya, buka panduan 14 tahap workflow."
        ]
      }
    ],
    nextSteps: [
      {
        id: "topik-tujuan",
        title: "Menentukan topik dan tujuan",
        description: "Mulai dari dasar yang paling penting sebelum workflow penulisan dijalankan."
      },
      {
        id: "workflow-paper",
        title: "14 tahap workflow",
        description: "Lihat bagaimana alur kerja dibagi ke langkah yang lebih mudah dikontrol."
      }
    ]
  },
  {
    id: "topik-tujuan",
    group: "Mulai Menulis",
    title: "Menentukan topik dan tujuan",
    label: "Menentukan topik dan tujuan",
    summary: "Topik dan tujuan yang jelas akan membuat workflow berikutnya jauh lebih stabil dan lebih mudah diarahkan.",
    sections: [
      {
        title: "Mulai dari pertanyaan inti",
        paragraphs: [
          "Jangan mulai dari judul yang terlalu final. Mulai dari pertanyaan inti yang ingin Kamu jawab, lalu turunkan jadi topik kerja yang lebih terarah."
        ]
      },
      {
        title: "Batasi ruang pembahasan",
        paragraphs: [
          "Kalau ruang pembahasan terlalu lebar, hasil draft akan cepat melebar dan sulit dipertajam. Tetapkan tujuan yang cukup spesifik sejak awal."
        ]
      }
    ],
    nextSteps: [
      {
        id: "workflow-paper",
        title: "14 tahap workflow",
        description: "Masuk ke alur kerja inti setelah topik dan arah paper cukup jelas."
      },
      {
        id: "draft-outline",
        title: "Menyusun outline",
        description: "Lanjutkan ke struktur bab dan subbab yang akan mengarahkan isi paper."
      }
    ]
  },
  {
    id: "workflow-paper",
    group: "Workflow",
    title: "14 tahap workflow",
    label: "14 tahap workflow",
    summary: "Makalah AI membantu Kamu menulis paper secara bertahap, dari ide awal sampai draft yang siap dirapikan. Setiap tahap punya tujuan yang jelas supaya proses menulis terasa lebih terarah.",
    sections: [
      {
        title: "Cara kerja alur penulisan",
        paragraphs: [
          "Workflow dibagi menjadi beberapa langkah kecil seperti merumuskan topik, menajamkan tujuan, menyusun outline, menulis bagian inti, lalu merapikan hasil akhirnya. Dengan pola ini, Kamu bisa mengecek kualitas isi di setiap tahap sebelum lanjut ke tahap berikutnya."
        ]
      },
      {
        title: "Kapan sebaiknya lanjut ke tahap berikutnya",
        paragraphs: [
          "Lanjut ketika output tahap sekarang sudah cukup jelas untuk dijadikan dasar. Kamu tidak perlu menunggu semuanya sempurna. Fokus utamanya adalah menjaga kesinambungan argumen, bukan mengejar hasil final terlalu cepat."
        ]
      },
      {
        title: "Bagaimana kalau hasilnya belum pas",
        paragraphs: [
          "Gunakan revisi ringan atau Refrasa pada bagian yang terasa terlalu umum, terlalu panjang, atau belum sesuai gaya penulisan yang Kamu butuhkan. Kalau masalahnya ada di arah pembahasan, lebih baik kembali satu tahap ke belakang."
        ]
      }
    ],
    nextSteps: [
      {
        id: "draft-outline",
        title: "Menyusun outline",
        description: "Pelajari cara memecah topik menjadi struktur bab dan subbab yang lebih stabil sejak awal."
      },
      {
        id: "refrasa-final",
        title: "Menggunakan Refrasa",
        description: "Gunakan Refrasa saat Kamu perlu memperjelas kalimat tanpa mengubah arah utama isi paper."
      }
    ]
  },
  {
    id: "draft-outline",
    group: "Workflow",
    title: "Menyusun outline",
    label: "Menyusun outline",
    summary: "Cara menyusun kerangka yang cukup jelas sebelum Kamu mengisi isi paper lebih detail.",
    sections: [
      {
        title: "Tujuan outline",
        paragraphs: [
          "Outline membantu Kamu menjaga arah argumen. Bahkan outline yang sederhana akan membuat proses penulisan jauh lebih efisien dibanding langsung menulis penuh."
        ]
      }
    ],
    nextSteps: [
      {
        id: "workflow-paper",
        title: "14 tahap workflow",
        description: "Lihat bagaimana outline dihubungkan ke tahapan kerja yang lebih lengkap."
      },
      {
        id: "quality-check",
        title: "Quality Check",
        description: "Pastikan tiap bagian sudah kuat sebelum masuk ke tahap akhir."
      }
    ]
  },
  {
    id: "refrasa-final",
    group: "Revisi dan Output",
    title: "Menggunakan Refrasa",
    label: "Menggunakan Refrasa",
    summary: "Panduan memakai Refrasa untuk merapikan bahasa, bukan mengubah maksud utama tulisan.",
    sections: [
      {
        title: "Kapan pakai Refrasa",
        paragraphs: [
          "Gunakan Refrasa ketika struktur tulisan sudah cukup stabil. Kalau argumennya masih berubah-ubah, hasil revisi akan terasa mubazir."
        ]
      },
      {
        title: "Cara mengecek hasil",
        paragraphs: [
          "Setelah Refrasa dijalankan, cek ulang istilah teknis, nada kalimat, dan konsistensi istilah antarbagian."
        ]
      }
    ],
    nextSteps: [
      {
        id: "quality-check",
        title: "Quality Check",
        description: "Cek ulang konsistensi sebelum hasil dibagikan."
      },
      {
        id: "paket-kredit",
        title: "Paket & Kredit",
        description: "Pahami pemakaian kredit kalau Kamu sering menjalankan revisi."
      }
    ]
  },
  {
    id: "quality-check",
    group: "Revisi dan Output",
    title: "Quality Check",
    label: "Quality check",
    summary: "Checklist akhir untuk memastikan hasil siap dibaca, didiskusikan, atau dilanjutkan ke unduhan.",
    sections: [
      {
        title: "Checklist cepat",
        paragraphs: [
          "Cek apakah semua bagian inti sudah terisi, istilah sudah konsisten, dan transisi antarbab tidak terasa loncat."
        ],
        list: [
          "Istilah utama konsisten",
          "Transisi antarbab jelas",
          "Bagian kesimpulan tidak bertabrakan dengan isi"
        ]
      }
    ],
    nextSteps: [
      {
        id: "refrasa-final",
        title: "Refrasa Final",
        description: "Kalau nada tulisan belum konsisten, lanjutkan perapihan di tahap refrasa."
      },
      {
        id: "paket-kredit",
        title: "Paket & Kredit",
        description: "Lihat opsi penggunaan kalau Kamu perlu menjalankan revisi lebih sering."
      }
    ]
  },
  {
    id: "paket-kredit",
    group: "Workspace",
    title: "Mengelola kredit",
    label: "Paket dan kredit",
    summary: "Ringkasan cara membaca pemakaian kredit dan memilih paket yang masuk akal untuk ritme kerja Kamu.",
    sections: [
      {
        title: "Cara membaca kredit",
        paragraphs: [
          "Kredit dipakai untuk mendukung proses drafting, revisi, dan tahap lain yang aktif. Kalau Kamu bekerja bertahap, pemakaian kredit juga lebih terukur."
        ]
      },
      {
        title: "Kapan upgrade",
        paragraphs: [
          "Upgrade saat Kamu sudah tahu ritme kerja sendiri. Kalau masih eksplorasi, mulai dari paket yang lebih ringan lebih aman."
        ]
      }
    ],
    nextSteps: [
      {
        id: "tinjauan",
        title: "Tinjauan",
        description: "Balik ke gambaran utama kalau Kamu ingin mengulang alur dari awal."
      },
      {
        id: "workflow-paper",
        title: "Workflow Paper",
        description: "Lanjut lagi ke alur kerja untuk memahami kebutuhan kredit per tahap."
      }
    ]
  }
];

const DOC_PAGE_GROUPS = [
  { title: "Tinjauan", items: ["tinjauan"] },
  { title: "Mulai Menulis", items: ["topik-tujuan"] },
  { title: "Workflow", items: ["workflow-paper", "draft-outline"] },
  { title: "Revisi dan Output", items: ["refrasa-final", "quality-check"] },
  { title: "Workspace", items: ["paket-kredit"] }
];

const normalizeDocText = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

const findDocSection = (id) => DOC_PAGE_SECTIONS.find((section) => section.id === id) || DOC_PAGE_SECTIONS[0];

const DocumentationSidebar = ({
  query,
  onQueryChange,
  activeSectionId,
  onSelectSection,
  resultSections
}) => (
  <div className="docs-sidebar-shell">
    <div className="docs-sidebar-head">
      <a href="#/" className="docs-sidebar-brand">
        <img
          src="assets/official_logo_grey_500.png"
          alt="Makalah"
          className="docs-sidebar-brand-mark"
        />
        <img
          src="assets/brand-text-white.png"
          alt="Makalah AI"
          className="docs-sidebar-brand-text"
        />
      </a>
    </div>

    <div className="docs-sidebar-scroll">
      <div className="docs-search">
        <span className="docs-search-icon">
          <i className="iconoir-search" aria-hidden="true" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Cari topik dokumentasi..."
          className="docs-search-input"
        />
      </div>

      {query ? (
        <div className="docs-results">
          <div className="docs-results-label">Hasil pencarian</div>
          {resultSections.length > 0 ? (
            <div className="docs-results-list">
              {resultSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`docs-results-item${activeSectionId === section.id ? " active" : ""}`}
                  onClick={() => onSelectSection(section.id)}
                >
                  <span>{section.title}</span>
                  <i className="iconoir-nav-arrow-right" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <div className="docs-results-empty">Tidak ada topik yang cocok.</div>
          )}
        </div>
      ) : null}

      <nav className="docs-nav">
        {DOC_PAGE_GROUPS.map((group) => (
          <div key={group.title} className="docs-nav-group">
            <div className="docs-nav-group-title">{group.title}</div>
            <div className="docs-nav-items">
              {group.items.map((id) => {
                const section = findDocSection(id);
                const isActive = activeSectionId === id;

                return (
                  <button
                    key={id}
                    type="button"
                    className={`docs-nav-item${isActive ? " active" : ""}`}
                    onClick={() => onSelectSection(id)}
                  >
                    <span>{section.label}</span>
                    {isActive ? <i className="iconoir-nav-arrow-right" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>

    <div className="docs-sidebar-auth">
      <a href="#/sign-in" className="btn btn-primary docs-sidebar-auth-button">
        Masuk <Arrow />
      </a>
    </div>
  </div>
);

const DocumentationArticle = ({
  section,
  previousSection,
  nextSection,
  onSelectSection
}) => (
  <article className="docs-article-shell">
    <div className="docs-article-head-wrap">
      <div className="docs-article-head">
        <div className="docs-article-group">{section.group}</div>
        <h1>{section.title}</h1>
        <p>{section.summary}</p>
      </div>
    </div>

    <div className="docs-article-scroll">
      <div className="docs-article-body">
        {section.sections.map((item) => (
          <section className="docs-article-panel" key={item.title}>
            <h2>{item.title}</h2>
            {item.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {item.list ? (
              <ol className="docs-article-list">
                {item.list.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}
      </div>

      <section className="docs-article-next">
        <div className="docs-panel-label">Selanjutnya</div>
        <div className="docs-next-grid">
          {section.nextSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              className="docs-next-card"
              onClick={() => onSelectSection(step.id)}
            >
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <span>
                Buka topik
                <i className="iconoir-nav-arrow-right" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="docs-mobile-nav">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => previousSection && onSelectSection(previousSection.id)}
          disabled={!previousSection}
        >
          <i className="iconoir-nav-arrow-left" aria-hidden="true" />
          Kembali
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => nextSection && onSelectSection(nextSection.id)}
          disabled={!nextSection}
        >
          Lanjut
          <i className="iconoir-nav-arrow-right" aria-hidden="true" />
        </button>
      </div>
    </div>

    <ShellPageFooter />
  </article>
);

const DocumentationPage = () => {
  const [activeSectionId, setActiveSectionId] = React.useState(DOC_PAGE_SECTIONS[0].id);
  const [query, setQuery] = React.useState("");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const filteredSections = React.useMemo(() => {
    const normalized = normalizeDocText(query).trim();
    if (!normalized) return [];

    return DOC_PAGE_SECTIONS.filter((section) => {
      const haystack = normalizeDocText(
        `${section.title} ${section.summary} ${section.sections.map((item) => item.title).join(" ")}`
      );
      return haystack.includes(normalized);
    }).slice(0, 6);
  }, [query]);

  const activeSection = React.useMemo(() => findDocSection(activeSectionId), [activeSectionId]);
  const activeIndex = DOC_PAGE_SECTIONS.findIndex((section) => section.id === activeSectionId);
  const previousSection = activeIndex > 0 ? DOC_PAGE_SECTIONS[activeIndex - 1] : null;
  const nextSection = activeIndex >= 0 && activeIndex < DOC_PAGE_SECTIONS.length - 1
    ? DOC_PAGE_SECTIONS[activeIndex + 1]
    : null;

  const handleSelectSection = (sectionId) => {
    setActiveSectionId(sectionId);
    setMobileNavOpen(false);
  };

  return (
    <div className="docs-page">
      <div className="docs-page-shell">
        <div className="docs-page-layout">
          <div className="docs-mobile-toolbar">
            <a href="#/" className="docs-mobile-brand">
              <img
                src="assets/official_logo_grey_500.png"
                alt="Makalah"
                className="docs-mobile-brand-mark"
              />
              <img
                src="assets/brand-text-white.png"
                alt="Makalah AI"
                className="docs-mobile-brand-text"
              />
            </a>
            <button
              type="button"
              className={`docs-mobile-trigger${mobileNavOpen ? " active" : ""}`}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label={mobileNavOpen ? "Tutup navigasi dokumentasi" : "Buka navigasi dokumentasi"}
              aria-expanded={mobileNavOpen}
              aria-controls="docs-mobile-sidebar"
            >
              <i className={`iconoir-${mobileNavOpen ? "xmark" : "menu"}`} aria-hidden="true" />
            </button>
          </div>

          <aside className={`docs-sidebar${mobileNavOpen ? " open" : ""}`} id="docs-mobile-sidebar">
            <DocumentationSidebar
              query={query}
              onQueryChange={setQuery}
              activeSectionId={activeSectionId}
              onSelectSection={handleSelectSection}
              resultSections={filteredSections}
            />
          </aside>

          <div className="docs-content-column">
            <DocumentationArticle
              section={activeSection}
              previousSection={previousSection}
              nextSection={nextSection}
              onSelectSection={handleSelectSection}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, {
  DOC_PAGE_SECTIONS,
  DOC_PAGE_GROUPS,
  normalizeDocText,
  DocumentationSidebar,
  DocumentationArticle,
  DocumentationPage
});
