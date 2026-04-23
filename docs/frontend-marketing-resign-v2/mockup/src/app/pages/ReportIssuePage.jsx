/* Static report issue support page mock */

const REPORT_ISSUE_SECTIONS = [
  {
    id: "progress",
    label: "Progres Laporan",
    title: "Progres Laporan",
    description: "Pantau status terbaru dari laporan yang sudah dikirim dan lihat tindak lanjut yang sedang berjalan."
  },
  {
    id: "report",
    label: "Lapor Masalah",
    title: "Lapor Masalah",
    description: "Kirim laporan baru saat ada kendala ketika chat, menyusun paper, atau memproses lampiran."
  }
];

const REPORT_ISSUE_CONTEXT_OPTIONS = [
  { value: "", label: "Pilih sesi chat terkait (opsional)" },
  { value: "paper-ai-bisnis", label: "Paper AI Bisnis - draft metode" },
  { value: "workflow-refrasa", label: "Workflow Refrasa - revisi paragraf" },
  { value: "sesi-tidak-diketahui", label: "Sesi chat tidak diketahui" }
];

const REPORT_ISSUE_PROGRESS_ITEMS = [
  {
    id: "MKR-24011",
    title: "Jawaban berhenti saat tahap hasil penelitian",
    status: "Sedang ditinjau",
    tone: "active",
    detail: "Tim sedang mengecek log dan snapshot konteks dari sesi yang terkait."
  },
  {
    id: "MKR-23988",
    title: "File PDF gagal diproses saat upload",
    status: "Butuh info tambahan",
    tone: "warn",
    detail: "Mohon kirim nama file, ukuran, dan waktu kejadian agar proses pengecekan lebih cepat."
  },
  {
    id: "MKR-23940",
    title: "Pilihan stage tidak muncul setelah refresh",
    status: "Selesai",
    tone: "ok",
    detail: "Masalah sudah diperbaiki. Jika masih muncul, kirim laporan baru dengan sesi terbaru."
  }
];

const REPORT_ISSUE_TIPS = [
  "Jelaskan langkah yang Kamu lakukan sebelum masalah muncul.",
  "Sertakan sesi chat terkait kalau kendalanya muncul di percakapan tertentu.",
  "Kalau ada file yang terlibat, sebutkan jenis file dan perkiraan ukurannya."
];

const REPORT_ISSUE_SUCCESS_NOTES = [
  "Laporan masuk ke antrean review teknis untuk dicek bersama konteks dasarnya.",
  "Kalau Kamu menyertakan diagnostics, tim bisa membaca route, browser, dan metadata sesi lebih cepat.",
  "Gunakan ID laporan ini kalau Kamu perlu follow-up ke tim support."
];

const REPORT_ISSUE_SUBMITTED_MOCK = {
  reportId: "MKR-24053",
  description: "Jawaban berhenti di tengah saat proses penulisan hasil penelitian, lalu stage berikutnya tidak bisa dibuka ulang.",
  contextLabel: "Paper AI Bisnis - draft metode",
  includeDiagnostics: true
};

const REPORT_ISSUE_QUICK_NOTES = [
  "Laporan yang lengkap mempercepat proses peninjauan.",
  "Diagnostics otomatis membantu tim membaca route, browser, dan konteks dasar.",
  "Kalau kendalanya menyangkut pembayaran, sebutkan ID transaksi bila ada."
];

const makeMockReportId = () => `MKR-${String(Date.now()).slice(-6)}`;

const ReportIssueSidebar = ({ activeSection, onSelectSection }) => (
  <div className="support-sidebar-shell">
    <div className="support-sidebar-head">
      <a href="#/" className="support-sidebar-brand">
        <img
          src="assets/official_logo_grey_500.png"
          alt="Makalah"
          className="support-sidebar-brand-mark"
        />
        <img
          src="assets/brand-text-white.png"
          alt="Makalah AI"
          className="support-sidebar-brand-text"
        />
      </a>
    </div>

    <div className="support-sidebar-scroll">
      <div className="support-sidebar-group">
        <div className="support-sidebar-group-title">Support</div>
        <div className="support-sidebar-items">
          {REPORT_ISSUE_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`support-sidebar-item${activeSection === section.id ? " active" : ""}`}
              onClick={() => onSelectSection(section.id)}
            >
              <span>{section.label}</span>
              {activeSection === section.id ? <i className="iconoir-nav-arrow-right" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </div>
    </div>

    <div className="support-sidebar-panel">
      <div className="docs-panel-label">Catatan cepat</div>
      <ul className="support-note-list">
        {REPORT_ISSUE_QUICK_NOTES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  </div>
);

const ReportIssueProgressSection = ({ onCreateReport }) => (
  <div className="support-content-stack">
    <section className="support-panel">
      <div className="support-panel-label">Status terkini</div>
      <div className="support-progress-list">
        {REPORT_ISSUE_PROGRESS_ITEMS.map((item) => (
          <article key={item.id} className="support-progress-card">
            <div className="support-progress-main">
              <div className="support-progress-id">{item.id}</div>
              <h2>{item.title}</h2>
              <p>{item.detail}</p>
            </div>
            <div className="support-progress-side">
              <span className={`support-status-chip ${item.tone}`}>{item.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className="support-panel support-panel-muted">
      <div className="support-inline-cta">
        <div>
          <h3>Kalau kendala yang Kamu alami belum tercatat, kirim laporan baru dari sini.</h3>
          <p>Gunakan form pelaporan supaya tim bisa melihat konteks awal dan menindaklanjuti dengan lebih terarah.</p>
        </div>
        <button type="button" className="btn btn-primary support-inline-button" onClick={onCreateReport}>
          Buka form laporan <Arrow />
        </button>
      </div>
    </section>
  </div>
);

const ReportIssueSuccessSection = ({ submission, onOpenProgress, onCreateAnotherReport }) => (
  <div className="support-content-stack">
    <section className="support-panel support-success-panel">
      <div className="support-success-badge">
        <i className="iconoir-check-square" aria-hidden="true" />
        <span>Laporan terkirim</span>
      </div>

      <div className="support-success-head">
        <h2>Laporan Kamu sudah masuk dan siap ditinjau tim support.</h2>
        <p>
          Simpan ID laporan ini untuk follow-up. Detail yang Kamu kirim sudah tercatat dan akan dipakai
          sebagai konteks awal pengecekan.
        </p>
      </div>

      <div className="support-success-grid">
        <article className="support-success-card">
          <div className="support-panel-label">ID laporan</div>
          <p className="support-success-id">{submission.reportId}</p>
        </article>
        <article className="support-success-card">
          <div className="support-panel-label">Sesi terkait</div>
          <p>{submission.contextLabel || "Tidak dipilih"}</p>
        </article>
        <article className="support-success-card">
          <div className="support-panel-label">Diagnostics</div>
          <p>{submission.includeDiagnostics ? "Disertakan" : "Tidak disertakan"}</p>
        </article>
      </div>

      <div className="support-success-summary">
        <div className="support-panel-label">Ringkasan laporan</div>
        <p>{submission.description}</p>
      </div>

      <div className="support-success-actions">
        <button type="button" className="btn btn-primary support-inline-button support-success-button" onClick={onOpenProgress}>
          Lihat progres laporan <Arrow />
        </button>
        <button
          type="button"
          className="btn btn-ghost support-inline-button support-success-button support-success-button-secondary"
          onClick={onCreateAnotherReport}
        >
          Kirim laporan lain
        </button>
      </div>
    </section>

    <section className="support-panel support-panel-muted">
      <div className="support-panel-label">Apa yang terjadi selanjutnya</div>
      <div className="support-success-note-list">
        {REPORT_ISSUE_SUCCESS_NOTES.map((item) => (
          <article key={item} className="support-success-note">
            <span className="check"><Check /></span>
            <p>{item}</p>
          </article>
        ))}
      </div>
    </section>
  </div>
);

const ReportIssueFormSection = ({ onOpenSubmitted }) => {
  const [description, setDescription] = React.useState("");
  const [contextValue, setContextValue] = React.useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      onOpenSubmitted({
        reportId: makeMockReportId(),
        description: description.trim() || REPORT_ISSUE_SUBMITTED_MOCK.description,
        contextLabel: (REPORT_ISSUE_CONTEXT_OPTIONS.find((option) => option.value === contextValue) || {}).label || REPORT_ISSUE_SUBMITTED_MOCK.contextLabel,
        includeDiagnostics
      });
    }, 420);
  };

  return (
    <div className="support-content-stack">
      <form className="support-panel support-report-form" onSubmit={handleSubmit}>
        <div className="support-panel-label">Form laporan</div>

        <div className="support-field">
          <label htmlFor="report-issue-description">Ceritakan masalah yang terjadi</label>
          <textarea
            id="report-issue-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Contoh: Jawaban berhenti di tengah saat tombol Kirim ditekan, atau draft tidak berpindah ke tahap berikutnya."
          />
        </div>

        <div className="support-field">
          <label htmlFor="report-issue-context">Sesi chat terkait</label>
          <select
            id="report-issue-context"
            value={contextValue}
            onChange={(event) => setContextValue(event.target.value)}
          >
            {REPORT_ISSUE_CONTEXT_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <label className="support-checkbox">
          <input
            type="checkbox"
            checked={includeDiagnostics}
            onChange={(event) => setIncludeDiagnostics(event.target.checked)}
          />
          <span>Sertakan informasi tambahan otomatis {includeDiagnostics ? "(disarankan)" : ""}</span>
        </label>

        <div className="support-form-actions">
          <button type="submit" className="btn btn-primary support-submit-button" disabled={isSubmitting}>
            {isSubmitting ? "Mengirim..." : "Kirim Laporan"} <Arrow />
          </button>
        </div>
      </form>

      <section className="support-panel support-panel-muted">
        <div className="support-panel-label">Sebelum kirim</div>
        <div className="support-tip-grid">
          {REPORT_ISSUE_TIPS.map((item) => (
            <article key={item} className="support-tip-card">
              <span className="check"><Check /></span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

const ReportIssuePage = ({ initialSection = "progress", variant = "default" }) => {
  const [activeSection, setActiveSection] = React.useState(initialSection);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setActiveSection(initialSection);
    setMobileNavOpen(false);
  }, [initialSection, variant]);

  const currentSection = REPORT_ISSUE_SECTIONS.find((section) => section.id === activeSection) || REPORT_ISSUE_SECTIONS[0];

  const handleSelectSection = (nextSection) => {
    setActiveSection(nextSection);
    setMobileNavOpen(false);
    window.location.hash = nextSection === "progress" ? "#/report-issue" : "#/report-issue/new";
  };

  return (
    <div className="support-page">
      <div className="support-page-shell">
        <div className="support-page-layout">
          <div className="support-mobile-toolbar">
            <a href="#/" className="support-mobile-brand">
              <img
                src="assets/official_logo_grey_500.png"
                alt="Makalah"
                className="support-mobile-brand-mark"
              />
              <img
                src="assets/brand-text-white.png"
                alt="Makalah AI"
                className="support-mobile-brand-text"
              />
            </a>
            <button
              type="button"
              className={`support-mobile-trigger${mobileNavOpen ? " active" : ""}`}
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label={mobileNavOpen ? "Tutup navigasi lapor masalah" : "Buka navigasi lapor masalah"}
            >
              <i className={`iconoir-${mobileNavOpen ? "xmark" : "menu"}`} aria-hidden="true" />
            </button>
          </div>

          <aside className={`support-sidebar${mobileNavOpen ? " open" : ""}`}>
            <ReportIssueSidebar
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
            />
          </aside>

          <div className="support-content-column">
            <article className="support-article-shell">
              <div className="support-article-head-wrap">
                <div className="support-article-head">
                  <h1>{currentSection.title}</h1>
                  <p>{currentSection.description}</p>
                </div>
              </div>

              <div className="support-article-scroll">
                {activeSection === "progress" ? (
                  <ReportIssueProgressSection onCreateReport={() => handleSelectSection("report")} />
                ) : variant === "submitted" ? (
                  <ReportIssueSuccessSection
                    submission={REPORT_ISSUE_SUBMITTED_MOCK}
                    onOpenProgress={() => {
                      window.location.hash = "#/report-issue/";
                    }}
                    onCreateAnotherReport={() => {
                      window.location.hash = "#/report-issue/new";
                      window.setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: "auto" });
                      }, 0);
                    }}
                  />
                ) : (
                  <ReportIssueFormSection
                    onOpenSubmitted={() => {
                      window.location.hash = "#/report-issue/terkirim";
                    }}
                  />
                )}
              </div>

              <ShellPageFooter />
            </article>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, {
  REPORT_ISSUE_SECTIONS,
  REPORT_ISSUE_CONTEXT_OPTIONS,
  REPORT_ISSUE_PROGRESS_ITEMS,
  REPORT_ISSUE_TIPS,
  REPORT_ISSUE_SUCCESS_NOTES,
  REPORT_ISSUE_SUBMITTED_MOCK,
  REPORT_ISSUE_QUICK_NOTES,
  ReportIssueSuccessSection,
  ReportIssueSidebar,
  ReportIssueProgressSection,
  ReportIssueFormSection,
  ReportIssuePage
});
