/* Static chat page mock — Premium Shell Redesign */

const DEFAULT_CHAT_MOCK_STATE = {
  viewport: "desktop",
  conversationState: "active",
  sidebarState: "expanded",
  sidebarPanel: "chat-history",
  composerState: "idle",
  processState: "hidden",
  alertState: "none",
  artifactPanelState: "closed",
  artifactCount: 3,
  sourcesPanelOpen: false,
  reasoningPanelOpen: false
};

const CHAT_ACTIVITY_ITEMS = [
  { key: "chat-history", icon: "iconoir-chat-bubble", label: "Riwayat percakapan" },
  { key: "progress", icon: "iconoir-git-branch", label: "Linimasa progres" }
];

const CHAT_SIDEBAR_CONVERSATIONS = [
  {
    id: "c1",
    title: "Dampak AI di Pendidikan Tinggi",
    meta: "2 jam lalu",
    stage: 4,
    files: [
      { id: "f1", title: "Pendahuluan", type: "section", version: 2 },
      { id: "f2", title: "Pendahuluan", type: "refrasa", version: 1 },
      { id: "f3", title: "Tinjauan Pustaka", type: "section", version: 1 }
    ]
  },
  { id: "c2", title: "Metode Penelitian Kualitatif", meta: "kemarin", stage: 2, files: [] },
  { id: "c3", title: "Analisis Ekonomi Digital 2024", meta: "3 hari lalu", stage: null, files: [] }
];

const FolderIcon = ({ solid }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M3.75 7.1C3.75 5.86 4.76 4.85 6 4.85h3.23c.61 0 1.2.25 1.62.68l.9.92c.21.22.5.34.8.34H18c1.24 0 2.25 1.01 2.25 2.25v7.21A2.75 2.75 0 0 1 17.5 19H6.5a2.75 2.75 0 0 1-2.75-2.75V7.1Z"
      fill={solid ? "currentColor" : "none"}
      stroke={solid ? "none" : "currentColor"}
      strokeWidth={solid ? 0 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CHAT_MESSAGES = [
  {
    kind: "user",
    text: "Paper: Penggunaan chatbot AI sejenis ChatGPT oleh siswa SD, apakah berdampak pada kemunduran tingkat intelektualitas, menambah kemalasan, atau malah meningkatkan semua aspek inteligensianya?",
    attachments: [
      { name: "Penelitian-AI-SD.pdf", mimeType: "application/pdf", size: 2_415_000 },
      { name: "Data-survei.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 184_320 }
    ]
  },
  {
    kind: "assistant",
    body: "rich-1"
  },
  {
    kind: "artifact",
    title: "Pendahuluan: AI di Pendidikan Tinggi",
    status: "created",
    version: 1
  },
  {
    kind: "validation",
    stageLabel: "Pendahuluan"
  },
  {
    kind: "choice",
    title: "Langkah selanjutnya",
    options: [
      { id: "ref", label: "Cari referensi awal (akademik dan non-akademik)", recommended: true }
    ],
    selectedId: null,
    submitLabel: "Sudah dikirim"
  },
  {
    kind: "confirmed",
    label: "PILIHAN DIKONFIRMASI",
    text: "Cari referensi awal (akademik dan non-akademik)"
  }
];

const ChatMockActivityBar = ({ activePanel, onPanelChange }) => (
  <aside className="chat-shell-activity-bar" role="navigation" aria-label="Sidebar navigation">
    {/* Logo */}
    <a href="#/" className="chat-activity-logo" aria-label="Home">
      <img src="assets/makalah_logo_light.svg" alt="Makalah" width="20" height="20" />
    </a>

    {/* Panel Navigation Items */}
    <div className="chat-activity-group" role="tablist" aria-orientation="vertical" aria-label="Panel selection">
      {CHAT_ACTIVITY_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`chat-activity-item ${activePanel === item.key ? "active" : ""}`}
          onClick={() => onPanelChange(item.key)}
          title={item.label}
          aria-label={`${item.label} panel`}
          aria-pressed={activePanel === item.key}
        >
          <i className={item.icon}></i>
        </button>
      ))}
    </div>
  </aside>
);

const ChatMockSidebar = ({ state, onCollapse }) => {
  const isCollapsed = state.sidebarState === "collapsed";
  const [expandedId, setExpandedId] = React.useState("c1");
  if (isCollapsed) return null;

  const activeId = "c1";
  const total = CHAT_SIDEBAR_CONVERSATIONS.length;

  return (
    <aside className="chat-shell-sidebar" data-testid="chat-sidebar">
      {/* Desktop collapse toggle header */}
      <div className="chat-sidebar-collapse-header">
        <button
          className="chat-sidebar-collapse-btn"
          onClick={onCollapse}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <i className="iconoir-fast-arrow-left"></i>
        </button>
      </div>

      {/* New Chat button */}
      <div className="chat-sidebar-newchat">
        <button className="chat-sidebar-newchat-btn" aria-label="Start new chat">
          <i className="iconoir-plus"></i>
          <span>Percakapan Baru</span>
        </button>
      </div>

      {/* Riwayat header */}
      <div className="chat-sidebar-section-header">
        <div className="chat-sidebar-section-title">
          <span>Riwayat</span>
          <span className="chat-sidebar-count-badge">{total}</span>
        </div>
        <button className="chat-sidebar-manage-btn" aria-label="Buka mode kelola riwayat">
          <i className="iconoir-settings"></i>
        </button>
      </div>

      {/* Tree list */}
      <div className="chat-sidebar-tree">
        {CHAT_SIDEBAR_CONVERSATIONS.map((conv) => {
          const hasChildren = conv.files.length > 0;
          const isExpanded = expandedId === conv.id;
          const isActive = activeId === conv.id;
          return (
            <div key={conv.id}>
              <div className={`chat-sidebar-conv-row ${isActive ? "active" : ""}`}>
                <div className="chat-sidebar-conv-chevron">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                      className={`chat-sidebar-chevron-btn ${isExpanded ? "expanded" : ""}`}
                      aria-label={isExpanded ? "Tutup subtree percakapan" : "Buka subtree percakapan"}
                    >
                      <i className="iconoir-nav-arrow-right"></i>
                    </button>
                  ) : <span className="chat-sidebar-chevron-spacer" aria-hidden="true" />}
                </div>
                <div className={`chat-sidebar-conv-icon ${hasChildren ? "solid" : ""}`} aria-hidden="true">
                  <FolderIcon solid={hasChildren} />
                </div>
                <div className="chat-sidebar-conv-text">
                  <div className={`chat-sidebar-conv-title ${hasChildren ? "bold" : ""}`}>{conv.title}</div>
                  <div className="chat-sidebar-conv-meta">{conv.meta}</div>
                </div>
                <div className="chat-sidebar-conv-actions">
                  <button className="chat-sidebar-conv-edit" aria-label={`Ubah judul percakapan ${conv.title}`}>
                    <i className="iconoir-edit-pencil"></i>
                  </button>
                  {conv.stage && (
                    <span className="chat-sidebar-stage-badge" title={`Paper mode: Tahap ${conv.stage} dari 14`}>
                      <i className="iconoir-page" aria-hidden="true"></i>
                      {conv.stage}/14
                    </span>
                  )}
                </div>
              </div>

              {hasChildren && isExpanded && (
                <div className={`chat-sidebar-conv-subtree ${isActive ? "active" : ""}`}>
                  {conv.files.map((file, i) => {
                    const isFirst = i === 0;
                    const isLast = i === conv.files.length - 1;
                    return (
                      <button key={file.id} type="button" className="chat-sidebar-file-row">
                        <span
                          className="chat-sidebar-file-line"
                          data-first={isFirst ? "true" : "false"}
                          data-last={isLast ? "true" : "false"}
                          aria-hidden="true"
                        />
                        <span className="chat-sidebar-file-branch" aria-hidden="true" />
                        {file.type === "refrasa" ? (
                          <span className="chat-sidebar-file-badge refrasa" aria-hidden="true">R</span>
                        ) : (
                          <span className="chat-sidebar-file-badge artifact" aria-hidden="true">
                            <i className="iconoir-page"></i>
                          </span>
                        )}
                        <span className="chat-sidebar-file-text">
                          <span className="chat-sidebar-file-title">{file.title}</span>
                          <span className="chat-sidebar-file-meta">
                            {file.type === "refrasa" ? "Refrasa" : "Artifak"} · v{file.version}
                          </span>
                        </span>
                        <i className="iconoir-nav-arrow-right chat-sidebar-file-chev" aria-hidden="true"></i>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer: SegmentBadge + tier label (admin/unlimited mode) */}
      <div className="chat-sidebar-footer">
        <button className="chat-sidebar-tier" aria-label="Lihat detail langganan">
          <span className="chat-sidebar-tier-badge">UNLIMITED</span>
          <span className="chat-sidebar-tier-label">Unlimited</span>
        </button>
      </div>
    </aside>
  );
};

const formatFileSize = (bytes) => {
  if (typeof bytes !== "number" || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const ChatMockMessageAttachment = ({ name, mimeType, size, imageUrl }) => {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const isImage = !!imageUrl;
  const palette = !isImage && EXT_PALETTE[ext] ? EXT_PALETTE[ext] : null;
  const sizeLabel = formatFileSize(size);
  const subtitle = [mimeType || null, sizeLabel].filter(Boolean).join(" · ");
  return (
    <div className="chat-msg-attachment" title={name}>
      <div className="chat-msg-attachment-thumb">
        {isImage ? (
          <img src={imageUrl} alt={name} />
        ) : palette ? (
          <span
            className="chat-msg-attachment-extlabel"
            style={{ background: palette.bg, color: palette.text }}
            aria-hidden="true"
          >
            {palette.label}
          </span>
        ) : null}
      </div>
      <div className="chat-msg-attachment-meta">
        <div className="chat-msg-attachment-name">{name}</div>
        {subtitle && <div className="chat-msg-attachment-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
};

const ChatMockUserBubble = ({ text, attachments }) => (
  <div className="chat-message-row chat-message-row--user">
    <div className="chat-message-bubble chat-message-bubble--user">
      {attachments && attachments.length > 0 && (
        <div className="chat-msg-attachment-stack">
          {attachments.map((a, i) => (
            <ChatMockMessageAttachment key={i} {...a} />
          ))}
        </div>
      )}
      <p>{text}</p>
    </div>
  </div>
);

const RichBullet = ({ term, body }) => (
  <li>
    <strong>{term}</strong>: {body}
  </li>
);

const ChatMockUnifiedProcessCard = ({
  stageLabel,
  activeProcessLabel,
  isStreaming,
  description,
  tasks,
  searchStatus,
  tools,
  defaultOpen
}) => {
  const [isOpen, setIsOpen] = React.useState(!!defaultOpen);
  const STATUS_ICON = { complete: "✅", "in-progress": "🔄", pending: "○" };
  return (
    <div className="chat-process-card">
      <button
        type="button"
        className="chat-process-trigger"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <div className="chat-process-trigger-left">
          <span className="chat-process-stage">{stageLabel}</span>
        </div>
        <div className="chat-process-trigger-right">
          {(activeProcessLabel || isStreaming) && (
            <span className="chat-process-active-label">{activeProcessLabel}</span>
          )}
          {isStreaming && (
            <span className="chat-process-pulse" aria-hidden="true">
              <span className="chat-process-pulse-dot d1" />
              <span className="chat-process-pulse-dot d2" />
              <span className="chat-process-pulse-dot d3" />
            </span>
          )}
          <span className="chat-process-chevron" aria-hidden="true">
            <i className={isOpen ? "iconoir-nav-arrow-up" : "iconoir-nav-arrow-down"}></i>
          </span>
        </div>
      </button>
      {isOpen && (
        <div className="chat-process-content">
          {description && <p className="chat-process-desc">{description}</p>}
          {tasks && tasks.length > 0 && (
            <div className="chat-process-section">
              <div className="chat-process-section-label">Langkah</div>
              <div className="chat-process-task-list">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`chat-process-task is-${t.status}`}
                  >
                    <span className="chat-process-task-icon" aria-hidden="true">
                      {STATUS_ICON[t.status]}
                    </span>
                    <span className="chat-process-task-label">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(searchStatus || (tools && tools.length > 0)) && (
            <div className="chat-process-section">
              <div className="chat-process-section-label">Proses</div>
              <div className="chat-process-tool-list">
                {searchStatus && (
                  <div className="chat-process-tool-row">
                    <i className="iconoir-internet"></i>
                    <span>{searchStatus.message}</span>
                    {typeof searchStatus.sourceCount === "number" && (
                      <span className="chat-process-tool-meta">({searchStatus.sourceCount} sumber)</span>
                    )}
                  </div>
                )}
                {tools && tools.map((tool, i) => (
                  <div key={i} className="chat-process-tool-row">
                    <i className={tool.icon || "iconoir-flash"}></i>
                    <span>{tool.label}</span>
                    {tool.state && (
                      <span className="chat-process-tool-meta">{tool.state}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ChatMockReasoningPanel = ({ duration, headline, body, hasDetail }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div className={`chat-reasoning-panel ${isOpen ? "is-open" : ""}`}>
      <div className="chat-reasoning-row">
        <button
          type="button"
          className="chat-reasoning-trigger"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
        >
          <span className="chat-reasoning-caret" aria-hidden="true">
            <i className={isOpen ? "iconoir-nav-arrow-down" : "iconoir-nav-arrow-right"}></i>
          </span>
          <span className="chat-reasoning-text">
            <span className="chat-reasoning-duration">{duration}s — </span>
            {headline}
          </span>
        </button>
        {hasDetail && !isOpen && (
          <button type="button" className="chat-reasoning-detail">Detail &rarr;</button>
        )}
      </div>
      {isOpen && (
        <div className="chat-reasoning-content">{body}</div>
      )}
    </div>
  );
};

const ChatMockAssistantBody = () => (
  <div className="chat-message-row">
    <div className="chat-message-assistant">
      <ChatMockReasoningPanel
        duration="13.1"
        headline="I'm also analyzing the inherent strengths and potential research angles of the propos..."
        body={`I'm also analyzing the inherent strengths and potential research angles of the proposed paper topic.

The user is exploring whether AI chatbots like ChatGPT cause cognitive decline, increased laziness, or actually enhance intelligence in elementary school students. This is a multi-angle question that needs careful operational definitions.

Key considerations:
- The age group (SD students) has unique developmental characteristics that distinguish this from studies on adults.
- The framing is balanced — open to both negative and positive outcomes — which makes it suitable as a hypothesis-driven study.
- Need to scope "intelektualitas" and "kemalasan" with measurable indicators before proceeding.

Next step: search for prior literature on AI usage in primary education to anchor the hypothesis.`}
        hasDetail
      />
      <ChatMockUnifiedProcessCard
        stageLabel="Pendahuluan"
        activeProcessLabel="Membuat artifak"
        isStreaming
        description="Bangun latar belakang, rumusan masalah, dan tujuan penelitian."
        tasks={[
          { id: "t1", status: "complete", label: "Susun rumusan masalah" },
          { id: "t2", status: "complete", label: "Identifikasi tujuan penelitian" },
          { id: "t3", status: "in-progress", label: "Tulis latar belakang" },
          { id: "t4", status: "pending", label: "Sintesis ke draf" }
        ]}
        searchStatus={{ message: "Pencarian selesai", sourceCount: 5 }}
        tools={[
          { icon: "iconoir-edit-pencil", label: "createArtifact", state: "running" }
        ]}
        defaultOpen
      />
      <p>
        Ide paper kamu tentang &quot;Penggunaan chatbot AI sejenis ChatGPT oleh siswa SD, apakah berdampak pada
        kemunduran tingkat intelektualitas, menambah kemalasan, atau malah meningkatkan semua aspek
        inteligensianya?&quot; sangat menarik dan relevan banget, apalagi di era digital sekarang.
      </p>
      <p>Beberapa poin yang aku lihat dari ide ini:</p>
      <ul className="chat-message-list-bullet">
        <RichBullet term="Relevansi Tinggi" body="Topik ini sedang hangat dibicarakan di dunia pendidikan, terutama dengan cepatnya perkembangan teknologi AI." />
        <RichBullet term="Fokus Spesifik" body="Memilih siswa SD sebagai subjek penelitian itu bagus, karena kelompok usia ini punya karakteristik perkembangan yang unik dan mungkin berbeda dampaknya dibanding usia yang lebih dewasa." />
        <RichBullet term="Pertanyaan Jelas" body="Kamu sudah punya pertanyaan penelitian yang cukup jelas, yaitu apakah dampaknya negatif (kemunduran, kemalasan) atau positif (peningkatan inteligensi). Ini akan memudahkan dalam merumuskan hipotesis nanti." />
      </ul>
      <p>Namun, ada beberapa tantangan yang perlu kita pertimbangkan:</p>
      <ul className="chat-message-list-bullet">
        <RichBullet term="Definisi Operasional" body="Kita perlu mendefinisikan secara jelas apa yang dimaksud dengan &quot;tingkat intelektualitas&quot;, &quot;kemalasan&quot;, dan &quot;aspek inteligensi&quot; dalam konteks siswa SD dan bagaimana mengukurnya." />
        <RichBullet term="Metodologi" body="Penelitian ini kemungkinan akan membutuhkan metodologi yang cukup kompleks, bisa berupa studi…" />
      </ul>
      <p>
        Untuk bisa melanjutkan diskusi ini dengan lebih akurat dan mendalam, aku perlu mencari referensi
        awal terlebih dahulu. Ini penting untuk melihat apa saja yang sudah diteliti terkait topik ini,
        teori apa yang relevan, dan di mana kira-kira celah penelitian yang bisa kita isi.
      </p>
    </div>
  </div>
);

const ChatMockChoiceCard = ({ title, options, selectedId, submitLabel }) => (
  <div className="chat-message-row">
    <section className="chat-choice-card">
      <h3 className="chat-choice-title">{title}</h3>
      <div className="chat-choice-options">
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          const isRecommended = !!opt.recommended;
          const cls = [
            "chat-choice-option",
            isRecommended ? "is-recommended" : "",
            isSelected ? "is-selected" : ""
          ].filter(Boolean).join(" ");
          return (
            <button key={opt.id} type="button" className={cls}>
              <span className="chat-choice-option-label">
                <span className="chat-choice-option-text">{opt.label}</span>
                {isRecommended && (
                  <span className="chat-choice-rec-badge">
                    <i className="iconoir-star-solid"></i>
                    Rekomendasi
                  </span>
                )}
              </span>
              <span className="chat-choice-option-check" aria-hidden="true">
                <i className="iconoir-check"></i>
              </span>
            </button>
          );
        })}
      </div>
      <div className="chat-choice-submit-row">
        <button type="button" className="chat-choice-submit" disabled>
          <i className="iconoir-send"></i>
          {submitLabel}
        </button>
      </div>
    </section>
    <button type="button" className="chat-message-copy">
      <i className="iconoir-copy"></i>
      Copy
    </button>
  </div>
);

const ChatMockArtifactCard = ({ title, status, version }) => {
  const isUpdated = status === "updated";
  return (
    <div className="chat-message-row">
      <button type="button" className="chat-artifact-card">
        <span className="chat-artifact-icon" aria-hidden="true">
          <i className={isUpdated ? "iconoir-edit-pencil" : "iconoir-check-circle"}></i>
        </span>
        <div className="chat-artifact-body">
          <div className="chat-artifact-badges">
            <span className="chat-artifact-badge chat-artifact-badge--type">Artifak</span>
            {isUpdated && (
              <span className="chat-artifact-badge chat-artifact-badge--revisi">Revisi</span>
            )}
            {typeof version === "number" && (
              <span className="chat-artifact-badge chat-artifact-badge--version">v{version}</span>
            )}
          </div>
          <p className="chat-artifact-title">{title}</p>
        </div>
        <span className="chat-artifact-cta">
          Buka
          <i className="iconoir-nav-arrow-right"></i>
        </span>
      </button>
    </div>
  );
};

const ChatMockValidationPanel = ({ stageLabel, isDirty }) => {
  const [showRevision, setShowRevision] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");
  const isRevisionReady = feedback.trim().length > 0;

  return (
    <div className="chat-validation-row">
      <section className="chat-validation-panel">
        {isDirty && (
          <div className="chat-validation-dirty">
            <i className="iconoir-warning-circle"></i>
            <p>Percakapan berubah sejak data terakhir disimpan. Perintahkan Agen Makalah sinkronkan data sebelum menyetujui & melanjutkan.</p>
          </div>
        )}
        <div className="chat-validation-body">
          <div className="chat-validation-header">
            <div className="chat-validation-header-text">
              <h3>Validasi Tahap: {stageLabel}</h3>
              <p>Periksa draft di artifak. Apakah sudah sesuai atau perlu revisi?</p>
            </div>
            {showRevision && (
              <button
                type="button"
                className="chat-validation-close"
                aria-label="Tutup formulir revisi"
                onClick={() => { setShowRevision(false); setFeedback(""); }}
              >
                <i className="iconoir-xmark"></i>
              </button>
            )}
          </div>

          {!showRevision ? (
            <div className="chat-validation-actions">
              <button
                type="button"
                className="chat-validation-btn chat-validation-btn--revisi"
                onClick={() => setShowRevision(true)}
              >
                <i className="iconoir-edit-pencil"></i>
                Revisi
              </button>
              <button
                type="button"
                className="chat-validation-btn chat-validation-btn--approve"
              >
                <i className="iconoir-check"></i>
                Setujui &amp; Lanjutkan
              </button>
            </div>
          ) : (
            <div className="chat-validation-revision">
              <textarea
                className="chat-validation-textarea"
                placeholder="Jelaskan bagian yang harus diperbaiki..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="chat-validation-revision-submit">
                <button
                  type="button"
                  disabled={!isRevisionReady}
                  className={`chat-validation-btn ${isRevisionReady ? "chat-validation-btn--approve" : "chat-validation-btn--ghost"}`}
                >
                  <i className="iconoir-send"></i>
                  Kirim feedback
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const ChatMockConfirmedBubble = ({ label, text }) => (
  <div className="chat-message-row chat-message-row--user">
    <div className="chat-message-bubble chat-message-bubble--user">
      <div className="chat-confirmed-head">
        <i className="iconoir-check-circle"></i>
        <span className="chat-confirmed-label">{label}</span>
      </div>
      <div className="chat-confirmed-text">{text}</div>
    </div>
  </div>
);

const ChatMockMessageBubble = ({ message }) => {
  if (message.kind === "user") return <ChatMockUserBubble text={message.text} attachments={message.attachments} />;
  if (message.kind === "assistant") return <ChatMockAssistantBody />;
  if (message.kind === "artifact") return <ChatMockArtifactCard {...message} />;
  if (message.kind === "validation") return <ChatMockValidationPanel {...message} />;
  if (message.kind === "choice") return <ChatMockChoiceCard {...message} />;
  if (message.kind === "confirmed") return <ChatMockConfirmedBubble {...message} />;
  return null;
};

const ChatMockProcessStatusBar = ({ progress = 65 }) => {
  const safe = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <div className="chat-status-bar" role="status" aria-live="polite">
      <div className="chat-status-bar-row">
        <span className="chat-status-bar-dots" aria-hidden="true">
          <span className="chat-status-bar-dot d1" />
          <span className="chat-status-bar-dot d2" />
          <span className="chat-status-bar-dot d3" />
        </span>
        <span className="chat-status-bar-percent">{safe}%</span>
      </div>
      <div className="chat-status-bar-track">
        <div className="chat-status-bar-fill" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
};

const EXT_PALETTE = {
  pdf: { bg: "oklch(0.62 0.22 25 / 0.15)", text: "oklch(0.72 0.16 25)", label: "PDF" },
  doc: { bg: "oklch(0.60 0.20 255 / 0.15)", text: "oklch(0.72 0.13 250)", label: "DOC" },
  docx: { bg: "oklch(0.60 0.20 255 / 0.15)", text: "oklch(0.72 0.13 250)", label: "DOC" },
  xls: { bg: "oklch(0.66 0.16 160 / 0.15)", text: "oklch(0.74 0.14 160)", label: "XLS" },
  xlsx: { bg: "oklch(0.66 0.16 160 / 0.15)", text: "oklch(0.74 0.14 160)", label: "XLS" },
  ppt: { bg: "oklch(0.68 0.18 50 / 0.15)", text: "oklch(0.76 0.15 50)", label: "PPT" },
  pptx: { bg: "oklch(0.68 0.18 50 / 0.15)", text: "oklch(0.76 0.15 50)", label: "PPT" },
  txt: { bg: "oklch(0.65 0.01 0 / 0.15)", text: "oklch(0.72 0.01 0)", label: "TXT" }
};

const ChatMockAttachmentChip = ({ name, isImage }) => {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const palette = !isImage && EXT_PALETTE[ext]
    ? EXT_PALETTE[ext]
    : { bg: "var(--bg-2)", text: "var(--text-muted)", label: isImage ? (ext.toUpperCase() || "Image") : ext.toUpperCase() };
  const iconClass = isImage ? "iconoir-media-image" : "iconoir-page";
  return (
    <div className="chat-composer-chip" title={name}>
      <div className="chat-composer-chip-icon" style={{ background: palette.bg }} aria-hidden="true">
        <i className={iconClass} style={{ color: palette.text }}></i>
      </div>
      <div className="chat-composer-chip-meta">
        <div className="chat-composer-chip-name">{name}</div>
        <div className="chat-composer-chip-type">{palette.label}</div>
      </div>
      <button type="button" className="chat-composer-chip-remove" aria-label={`Hapus ${name}`}>
        <i className="iconoir-xmark"></i>
      </button>
    </div>
  );
};

const ChatMockComposer = ({ state, onPatch }) => {
  const isGenerating = state.composerState === "generating";

  return (
    <div className="chat-composer-wrapper">
      <div className="chat-composer-box">
        <div className="chat-composer-context-row">
          <div className="chat-composer-context-left">
            <button className="chat-composer-context-btn" title="Tambah konteks" aria-label="Tambah konteks">
              <i className="iconoir-plus"></i>
            </button>
            <ChatMockAttachmentChip name="Penelitian-AI-SD.pdf" />
            <ChatMockAttachmentChip name="Data-survei.xlsx" />
          </div>
          <button className="chat-composer-context-btn" title="Hapus semua" aria-label="Hapus semua">
            <i className="iconoir-trash"></i>
          </button>
        </div>
        <div className="chat-composer-input-row">
          <textarea
            className="chat-composer-input"
            placeholder="Kirim percakapan..."
            rows={1}
            readOnly={isGenerating}
          />
          <button
            className="chat-composer-send"
            aria-label={isGenerating ? "Stop generating response" : "Send message"}
            onClick={() => onPatch({ composerState: isGenerating ? "idle" : "generating", processState: isGenerating ? "hidden" : "processing" })}
          >
            {isGenerating ? <i className="iconoir-pause"></i> : <i className="iconoir-send"></i>}
          </button>
        </div>
      </div>
    </div>
  );
};

const ARTIFACT_TABS = [
  { id: "t1", type: "section", title: "Pendahuluan", icon: "iconoir-page", typeLabel: "Section" },
  { id: "t2", type: "section", title: "Tinjauan Pustaka", icon: "iconoir-page", typeLabel: "Section" }
];

const ChatMockArtifactTabs = ({ tabs, activeTabId, onTabChange, onClosePanel }) => (
  <div className="chat-art-tabs-row">
    <div className="chat-art-tabs-scroll">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <div
            key={tab.id}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`chat-art-tab ${isActive ? "is-active" : ""}`}
          >
            <span className={`chat-art-tab-icon ${isActive ? "is-active" : ""}`} aria-hidden="true">
              <i className={tab.icon}></i>
            </span>
            <span className="chat-art-tab-title">{tab.title}</span>
            <button
              type="button"
              className="chat-art-tab-close"
              onClick={(e) => { e.stopPropagation(); }}
              aria-label={`Tutup tab ${tab.title}`}
            >
              <i className="iconoir-xmark"></i>
            </button>
          </div>
        );
      })}
    </div>
    <div className="chat-art-tabs-controls">
      <span className="chat-art-tabs-count">{tabs.length} tab</span>
      <button type="button" className="chat-art-tabs-nav" aria-label="Tab sebelumnya">
        <i className="iconoir-nav-arrow-left"></i>
      </button>
      <button type="button" className="chat-art-tabs-nav" aria-label="Tab berikutnya">
        <i className="iconoir-nav-arrow-right"></i>
      </button>
    </div>
    <button type="button" className="chat-art-tabs-close-panel" onClick={onClosePanel} aria-label="Tutup panel">
      <i className="iconoir-xmark"></i>
    </button>
  </div>
);

const ChatMockArtifactToolbar = ({ artifact }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="chat-art-toolbar">
      <div className="chat-art-toolbar-head">
        <p className="chat-art-toolbar-title">{artifact.title}</p>
        <button type="button" className="chat-art-toolbar-icon-btn chat-art-toolbar-icon-btn--surface" aria-label="Buka fullscreen">
          <i className="iconoir-expand"></i>
        </button>
      </div>
      <div className="chat-art-toolbar-actions">
        <div className="chat-art-toolbar-badges">
          <span className="chat-art-badge">{artifact.contentTypeLabel}</span>
          <span className="chat-art-badge">{artifact.wordCount} kata</span>
          <span className="chat-art-badge">{artifact.contentLength} karakter</span>
        </div>
        <div className="chat-art-toolbar-actions-right">
          <button type="button" className="chat-art-toolbar-icon-btn chat-art-toolbar-icon-btn--surface" aria-label="Edit">
            <i className="iconoir-edit-pencil"></i>
          </button>
          <button
            type="button"
            className={`chat-art-toolbar-icon-btn chat-art-toolbar-icon-btn--surface ${copied ? "is-copied" : ""}`}
            onClick={handleCopy}
            aria-label={copied ? "Disalin" : "Salin"}
          >
            <i className={copied ? "iconoir-check" : "iconoir-copy"}></i>
          </button>
          <button type="button" className="chat-art-toolbar-icon-btn chat-art-toolbar-icon-btn--surface" aria-label="Refrasa">
            <span className="chat-art-refrasa-square" aria-hidden="true">R</span>
          </button>
          <button type="button" className="chat-art-toolbar-icon-btn chat-art-toolbar-icon-btn--surface" aria-label="Download">
            <i className="iconoir-download"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatMockArtifactViewer = () => (
  <article className="chat-art-viewer">
    <h1>Pendahuluan: AI di Pendidikan Tinggi Indonesia</h1>

    <h2>1. Latar Belakang</h2>
    <p>
      Transformasi digital telah menjadi pendorong utama dalam evolusi pendidikan tinggi di Indonesia.
      Integrasi <strong>Kecerdasan Buatan (AI)</strong> menjanjikan efisiensi administratif dan personalisasi
      pembelajaran yang belum pernah terjadi sebelumnya. Penetrasi <em>chatbot</em> berbasis Large Language
      Model (LLM) seperti ChatGPT di kalangan mahasiswa dan dosen menumbuhkan diskursus baru tentang batas
      etis penggunaan AI di ruang akademik.
    </p>

    <p>
      Namun, tantangan krusial muncul terkait aksesibilitas dan kesenjangan infrastruktur digital di
      berbagai wilayah nusantara. Studi awal menunjukkan disparitas adopsi yang signifikan antara kampus
      di Pulau Jawa dan kampus di kawasan timur Indonesia.
    </p>

    <h2>2. Rumusan Masalah</h2>
    <ul>
      <li>Bagaimana pola adopsi AI generatif di kalangan dosen dan mahasiswa lintas wilayah?</li>
      <li>Apa dampak penggunaan AI terhadap kualitas penalaran kritis mahasiswa?</li>
      <li>Sejauh mana kebijakan kampus mengatur batas etis penggunaan AI dalam tugas akademik?</li>
    </ul>

    <h2>3. Tujuan Penelitian</h2>
    <p>
      Penelitian ini bertujuan memetakan dampak <strong>integrasi AI generatif</strong> terhadap proses
      belajar mengajar di pendidikan tinggi Indonesia, dengan fokus khusus pada kesenjangan akses dan
      pergeseran kompetensi kognitif mahasiswa.
    </p>

    <blockquote>
      &quot;Transformasi digital tanpa kerangka etis akan memperdalam kesenjangan, bukan mempersempitnya.&quot;
      — Asosiasi Pendidik Tinggi Indonesia, 2025
    </blockquote>
  </article>
);

const ARTIFACT_SOURCES = [
  {
    title: "Education in the Age of AI: Disruption, Distinction, Future",
    url: "https://www.nature.com/articles/s41562-024-edu-ai-2025",
    publishedAt: "2025",
    verificationStatus: "verified_content",
    documentKind: "html"
  },
  {
    title: "AI Adoption in Indonesian Universities — Annual Survey",
    url: "https://kompas.com/edu/2025/04/ai-adoption-survey",
    publishedAt: "2025",
    verificationStatus: "verified_content",
    documentKind: "html"
  },
  {
    title: "Generative AI and Academic Integrity: A Framework",
    url: "https://arxiv.org/abs/2503.18244",
    publishedAt: "2025",
    verificationStatus: "unverified_link",
    documentKind: "pdf"
  },
  {
    title: "Kerangka Etika AI dalam Pendidikan Tinggi",
    url: "https://kemdikbud.go.id/main/blog/2025/04/kerangka-etika-ai",
    publishedAt: "2025",
    documentKind: "html"
  },
  {
    title: "ChatGPT Usage Patterns Among Indonesian Students",
    url: "https://jurnal.ugm.ac.id/jpt/article/view/89312",
    publishedAt: "2024",
    verificationStatus: "verified_content",
    documentKind: "pdf"
  },
  {
    title: "Cognitive Effects of LLM Tutoring (Working Paper)",
    url: "https://ssrn.com/abstract=4878221",
    publishedAt: "2024",
    documentKind: "html"
  }
];

const VERIFICATION_LABEL = {
  verified_content: "Konten terverifikasi",
  unverified_link: "Tautan belum diverifikasi",
  unavailable: "Tidak tersedia"
};

const ChatMockSourceItem = ({ source }) => {
  const verifLabel = source.verificationStatus ? VERIFICATION_LABEL[source.verificationStatus] : null;
  const kindLabel = source.documentKind ? source.documentKind.toUpperCase() : null;
  return (
    <a className="chat-art-source-item" href={source.url} target="_blank" rel="noopener noreferrer">
      <span className="chat-art-source-title">
        {source.title}
        <i className="iconoir-open-new-window chat-art-source-extlink" aria-hidden="true"></i>
      </span>
      <span className="chat-art-source-url">{source.url}</span>
      {verifLabel && <span className="chat-art-source-badge">{verifLabel}</span>}
      {kindLabel && <span className="chat-art-source-badge">{kindLabel}</span>}
    </a>
  );
};

const ChatMockSourcesPanel = ({ sources }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  if (!sources || sources.length === 0) return null;
  const displayed = showAll ? sources : sources.slice(0, 5);
  const hasMore = sources.length > 5;
  const remaining = sources.length - 5;
  return (
    <div className="chat-art-sources">
      <p className="chat-art-sources-section-label">Sumber Terkait</p>
      <button
        type="button"
        className="chat-art-sources-trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      >
        <i className="iconoir-check-circle"></i>
        <span className="chat-art-sources-summary">Menemukan {sources.length} rujukan</span>
        <i className={`iconoir-nav-arrow-down chat-art-sources-chev ${isOpen ? "is-open" : ""}`}></i>
      </button>
      {isOpen && (
        <div className="chat-art-sources-list">
          {displayed.map((s, i) => (
            <ChatMockSourceItem key={i} source={s} />
          ))}
          {hasMore && (
            <button
              type="button"
              className="chat-art-sources-more"
              onClick={() => setShowAll((v) => !v)}
              aria-label={showAll ? "Sembunyikan rujukan tambahan" : `Tampilkan ${remaining} rujukan lainnya`}
            >
              {showAll ? (
                <i className="iconoir-nav-arrow-up"></i>
              ) : (
                <>
                  <i className="iconoir-nav-arrow-down"></i>
                  <span>+{remaining}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ChatMockArtifactPanel = ({ state, onPatch }) => {
  const [activeTabId, setActiveTabId] = React.useState(ARTIFACT_TABS[0].id);
  if (state.artifactPanelState === "closed") return null;

  const artifact = {
    title: "Pendahuluan: AI di Pendidikan Tinggi Indonesia",
    type: "section",
    version: 1,
    createdAt: "27 Apr 2026",
    contentTypeLabel: "Markdown",
    wordCount: 320,
    contentLength: 2415
  };

  return (
    <aside className="chat-shell-panel chat-art-panel">
      <ChatMockArtifactTabs
        tabs={ARTIFACT_TABS}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onClosePanel={() => onPatch({ artifactPanelState: "closed" })}
      />
      <ChatMockArtifactToolbar artifact={artifact} />
      <div className="chat-art-viewer-wrap">
        <ChatMockArtifactViewer />
        <ChatMockSourcesPanel sources={ARTIFACT_SOURCES} />
      </div>
    </aside>
  );
};

const ChatPage = () => {
  const [state, setState] = React.useState(DEFAULT_CHAT_MOCK_STATE);
  
  const onPatch = (patch) => setState(prev => ({ ...prev, ...patch }));
  
  const isSidebarCollapsed = state.sidebarState === "collapsed";
  const isPanelOpen = state.artifactPanelState !== "closed";
  
  return (
    <>
      <div className="chat-page-shell" style={{ 
        "--sidebar-w": isSidebarCollapsed ? "0px" : "280px",
        "--resizer-l-w": isSidebarCollapsed ? "0px" : "2px",
        "--panel-w": isPanelOpen ? "480px" : "0px",
        "--resizer-r-w": isPanelOpen ? "2px" : "0px"
      }}>
        <ChatMockActivityBar
          activePanel={state.sidebarPanel}
          onPanelChange={(panel) => onPatch({ sidebarPanel: panel, sidebarState: "expanded" })}
        />
        
        <ChatMockSidebar
          state={state}
          onCollapse={() => onPatch({ sidebarState: "collapsed" })}
        />
        
        <div className="chat-resizer" />
        
        <section className="chat-shell-main">
          <header className="chat-main-header">
            {/* Left: Expand sidebar toggle (only when collapsed) */}
            <div className="chat-topbar-left">
              {isSidebarCollapsed && (
                <button
                  className="chat-topbar-expand-btn"
                  onClick={() => onPatch({ sidebarState: "expanded" })}
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                >
                  <i className="iconoir-fast-arrow-right"></i>
                </button>
              )}
            </div>

            {/* Right: Naskah link, theme toggle, artifact indicator, user dropdown */}
            <div className="chat-topbar-right">
              {/* Naskah jadi — active blue state */}
              <a className="chat-topbar-naskah-link" href="#/naskah" aria-label="Buka Naskah">
                <span>Naskah jadi</span>
              </a>

              {/* Theme toggle */}
              <button className="chat-topbar-icon-btn" aria-label="Toggle theme" title="Toggle theme">
                <i className="iconoir-sun-light"></i>
              </button>

              {/* Artifact indicator */}
              <button
                className={`chat-topbar-artifact-btn ${isPanelOpen ? "active" : ""}`}
                onClick={() => onPatch({ artifactPanelState: isPanelOpen ? "closed" : "openLoaded" })}
                aria-label={`${state.artifactCount} artifak tersedia`}
              >
                <i className="iconoir-page"></i>
                <span className="chat-topbar-artifact-badge">
                  {state.artifactCount}
                </span>
              </button>

              {/* User dropdown — compact first-name variant */}
              <button className="chat-topbar-user-btn" aria-label="User menu" aria-haspopup="true">
                <span className="chat-topbar-user-avatar">
                  <i className="iconoir-user"></i>
                  <span className="chat-topbar-user-online" aria-hidden="true" />
                </span>
                <span className="chat-topbar-user-name">Erik</span>
                <i className="iconoir-nav-arrow-down chat-topbar-user-chev" aria-hidden="true"></i>
              </button>
            </div>
          </header>
          
          <div className="chat-message-list">
            {CHAT_MESSAGES.map((msg, i) => (
              <ChatMockMessageBubble key={i} message={msg} />
            ))}
            {state.processState === "processing" && (
              <div className="chat-message-row">
                <div className="chat-message-assistant">
                  <div className="chat-process-dot" style={{ margin: "8px 0" }}></div>
                </div>
              </div>
            )}
          </div>

          <ChatMockProcessStatusBar progress={65} />
          <ChatMockComposer state={state} onPatch={onPatch} />
        </section>
        
        <div className="chat-resizer" />
        
        <ChatMockArtifactPanel state={state} onPatch={onPatch} />
      </div>
    </>
  );
};

Object.assign(window, { ChatPage });
