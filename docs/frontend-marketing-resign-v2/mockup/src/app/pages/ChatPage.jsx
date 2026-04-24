/* Static chat page mock */

const DEFAULT_CHAT_MOCK_STATE = {
  viewport: "desktop",
  conversationState: "active",
  sidebarState: "expanded",
  sidebarPanel: "history",
  composerState: "idle",
  processState: "hidden",
  alertState: "none",
  artifactPanelState: "closed",
  sourcesPanelOpen: false,
  reasoningPanelOpen: false
};

const CHAT_MOCK_PRESETS = [
  {
    id: "default",
    label: "Default Chat",
    patch: {}
  },
  {
    id: "processing",
    label: "Processing",
    patch: {
      conversationState: "active",
      composerState: "generating",
      processState: "processing",
      alertState: "none"
    }
  },
  {
    id: "artifact",
    label: "Artifact Review",
    patch: {
      conversationState: "active",
      artifactPanelState: "openLoaded",
      sourcesPanelOpen: false
    }
  },
  {
    id: "sources",
    label: "Source Review",
    patch: {
      conversationState: "active",
      sourcesPanelOpen: true,
      artifactPanelState: "closed"
    }
  },
  {
    id: "error",
    label: "Error Review",
    patch: {
      conversationState: "active",
      alertState: "sendError",
      processState: "error",
      composerState: "idle"
    }
  },
  {
    id: "quota",
    label: "Quota Blocked",
    patch: {
      conversationState: "active",
      alertState: "quotaBlocked",
      composerState: "idle",
      processState: "hidden"
    }
  },
  {
    id: "landing",
    label: "Landing",
    patch: {
      conversationState: "landing",
      processState: "hidden",
      alertState: "none",
      artifactPanelState: "closed"
    }
  },
  {
    id: "not-found",
    label: "Not Found",
    patch: {
      conversationState: "notFound",
      alertState: "none",
      processState: "hidden"
    }
  },
  {
    id: "mobile",
    label: "Mobile Review",
    patch: {
      viewport: "mobile",
      sidebarState: "mobileSheetOpen",
      conversationState: "active",
      composerState: "mobileFullscreen"
    }
  }
];

const CONTROL_GROUPS = [
  {
    key: "viewport",
    label: "Viewport",
    options: ["desktop", "mobile"]
  },
  {
    key: "conversationState",
    label: "Conversation",
    options: ["landing", "loading", "active", "notFound"]
  },
  {
    key: "sidebarState",
    label: "Sidebar",
    options: ["expanded", "collapsed", "mobileSheetOpen"]
  },
  {
    key: "sidebarPanel",
    label: "Panel",
    options: ["history", "progress"]
  },
  {
    key: "composerState",
    label: "Composer",
    options: ["idle", "withContext", "generating", "mobileFullscreen"]
  },
  {
    key: "processState",
    label: "Process",
    options: ["hidden", "processing", "completeCollapsed", "completeExpanded", "error"]
  },
  {
    key: "alertState",
    label: "Alert",
    options: ["none", "quotaWarning", "technicalReport", "quotaBlocked", "sendError"]
  },
  {
    key: "artifactPanelState",
    label: "Artifact",
    options: ["closed", "openLoaded", "openLoading", "openEmpty", "openMissing"]
  }
];

const BOOLEAN_CONTROLS = [
  {
    key: "sourcesPanelOpen",
    label: "Sources Open"
  },
  {
    key: "reasoningPanelOpen",
    label: "Reasoning Open"
  }
];

const CHAT_ACTIVITY_ITEMS = [
  {
    key: "history",
    icon: "Ri",
    label: "Riwayat"
  },
  {
    key: "progress",
    icon: "Pr",
    label: "Linimasa"
  }
];

const CHAT_SIDEBAR_HISTORY_ITEMS = [
  "Draft metode penelitian kuantitatif",
  "Outline pendahuluan AI bisnis",
  "Revisi pembahasan literatur utama"
];

const CHAT_SIDEBAR_PROGRESS_ITEMS = [
  "Topik dan tujuan sudah stabil",
  "Outline paper menunggu approval",
  "Draft hasil penelitian sedang diperkaya"
];

const mergeChatMockState = (prevState, patch) => ({
  ...prevState,
  ...patch
});

const getPresetState = (presetPatch) => mergeChatMockState(DEFAULT_CHAT_MOCK_STATE, presetPatch);

const ChatMockToggleGroup = ({ label, value, options, onChange }) => (
  <div className="chat-page-mock__control-group">
    <div className="chat-page-mock__control-label">{label}</div>
    <div className="chat-page-mock__segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`chat-page-mock__segmented-button ${value === option ? "is-active" : ""}`}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

const ChatMockBooleanControl = ({ label, checked, onChange }) => (
  <label className={`chat-page-mock__boolean ${checked ? "is-active" : ""}`}>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span>{label}</span>
  </label>
);

const ChatMockActivityBar = ({ activePanel }) => (
  <aside className="chat-page-mock__activitybar" aria-label="Activity bar placeholder">
    <a href="#/" className="chat-page-mock__activitybar-brand" aria-label="Kembali ke home">
      <img src="assets/official_logo_grey_500.png" alt="Makalah" className="chat-page-mock__activitybar-mark" />
    </a>

    <div className="chat-page-mock__activitybar-items">
      {CHAT_ACTIVITY_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`chat-page-mock__activitybar-button ${activePanel === item.key ? "is-active" : ""}`}
          aria-pressed={activePanel === item.key}
        >
          <span className="chat-page-mock__activitybar-icon">{item.icon}</span>
          <span className="chat-page-mock__activitybar-label">{item.label}</span>
        </button>
      ))}
    </div>
  </aside>
);

const ChatMockSidebar = ({ state }) => {
  const items = state.sidebarPanel === "progress" ? CHAT_SIDEBAR_PROGRESS_ITEMS : CHAT_SIDEBAR_HISTORY_ITEMS;

  return (
    <aside className={`chat-page-mock__desktop-sidebar ${state.sidebarState === "collapsed" ? "is-collapsed" : ""}`} aria-label="Sidebar desktop placeholder">
      {state.sidebarState === "collapsed" ? (
        <div className="chat-page-mock__sidebar-collapsed">
          <span>SB</span>
        </div>
      ) : (
        <>
          <div className="chat-page-mock__desktop-sidebar-head">
            <div>
              <div className="chat-page-mock__panel-label">Sidebar Desktop</div>
              <p>{state.sidebarPanel === "progress" ? "Linimasa progres paper" : "Riwayat percakapan aktif"}</p>
            </div>
            <button type="button" className="chat-page-mock__sidebar-primary">
              Percakapan Baru
            </button>
          </div>

          <div className="chat-page-mock__desktop-sidebar-list">
            {items.map((item, index) => (
              <article
                key={item}
                className={`chat-page-mock__desktop-sidebar-item ${index === 0 ? "is-active" : ""}`}
              >
                <div className="chat-page-mock__desktop-sidebar-item-title">{item}</div>
                <div className="chat-page-mock__desktop-sidebar-item-meta">
                  {state.sidebarPanel === "progress" ? "Status aktif" : "Terakhir dibuka 12m lalu"}
                </div>
              </article>
            ))}
          </div>

          <div className="chat-page-mock__desktop-sidebar-footer">
            <div className="chat-page-mock__desktop-sidebar-credit">
              <div className="chat-page-mock__panel-label">Credit Summary</div>
              <p>124 kredit tersisa</p>
            </div>
            <div className="chat-page-mock__desktop-sidebar-user">
              <div className="chat-page-mock__panel-label">User Summary</div>
              <p>Erik Supit · Pro Plan</p>
            </div>
          </div>
        </>
      )}
    </aside>
  );
};

const ChatMockTopBar = ({ state }) => (
  <header className="chat-page-mock__topbar" aria-label="Top bar desktop placeholder">
    <div className="chat-page-mock__topbar-left">
      {state.sidebarState === "collapsed" ? (
        <button type="button" className="chat-page-mock__topbar-icon-button">
          Sidebar
        </button>
      ) : null}
      <div>
        <div className="chat-page-mock__panel-label">Top Bar</div>
        <p>Desktop shell placeholder aktif</p>
      </div>
    </div>

    <div className="chat-page-mock__topbar-right">
      <button type="button" className="chat-page-mock__topbar-icon-button">
        Theme
      </button>
      <div className="chat-page-mock__artifact-count" aria-label="Jumlah artifak">
        <span>Artifak</span>
        <strong>{state.artifactPanelState === "closed" ? "0" : "3"}</strong>
      </div>
      <div className="chat-page-mock__topbar-user">ES</div>
    </div>
  </header>
);

const ChatMockArtifactSlot = ({ state }) => {
  const isClosed = state.artifactPanelState === "closed";

  return (
    <aside
      className={`chat-page-mock__artifact-slot ${isClosed ? "is-closed" : ""}`}
      aria-label="Artifact panel slot placeholder"
    >
      <div className="chat-page-mock__panel-label">Artifact Panel Slot</div>
      <p>State aktif: {state.artifactPanelState}</p>
      <p>
        {isClosed
          ? "Panel kanan masih tertutup. Task berikutnya akan mengisi state tab, toolbar, dan content tanpa menghilangkan slot shell."
          : "Panel kanan akan diisi detail tab, toolbar, dan content di task berikutnya."}
      </p>
    </aside>
  );
};

const ChatMockDesktopMain = ({ state, summaryItems }) => (
  <section className="chat-page-mock__desktop-main" aria-label="Main shell desktop placeholder">
    <ChatMockTopBar state={state} />

    <div className="chat-page-mock__shell-summary">
      {summaryItems.map(([label, value]) => (
        <article key={label} className="chat-page-mock__summary-card">
          <div className="chat-page-mock__summary-label">{label}</div>
          <div className="chat-page-mock__summary-value">{value}</div>
        </article>
      ))}
    </div>

    <div className="chat-page-mock__desktop-main-panels">
      <section className="chat-page-mock__shell-main" aria-label="Main placeholder">
        <div className="chat-page-mock__panel-label">Main Placeholder</div>
        <p>Conversation state: {state.conversationState}</p>
        <p>Composer state: {state.composerState}</p>
        <p>Process state: {state.processState}</p>
      </section>

      <div className="chat-page-mock__shell-notes">
        <div className="chat-page-mock__panel-label">Task 3 Boundary</div>
        <ul className="chat-page-mock__status-list">
          <li>Desktop shell sudah dipecah jadi activity bar, sidebar, top bar, main, dan artifact slot.</li>
          <li>State `sidebar expanded/collapsed` sekarang punya efek visual di shell desktop.</li>
          <li>Surface desktop masih placeholder dan belum masuk ke detail mobile atau message system.</li>
        </ul>
      </div>
    </div>
  </section>
);

const ChatMockDesktopShell = ({ state, summaryItems }) => (
  <div className={`chat-page-mock__desktop-shell ${state.sidebarState === "collapsed" ? "is-collapsed" : ""}`}>
    <ChatMockActivityBar activePanel={state.sidebarPanel} />
    <ChatMockSidebar state={state} />
    <ChatMockDesktopMain state={state} summaryItems={summaryItems} />
    <ChatMockArtifactSlot state={state} />
  </div>
);

const ChatMockMobileHeader = ({ onOpenSidebar }) => (
  <header className="chat-page-mock__mobile-header" aria-label="Mobile header placeholder">
    <button type="button" className="chat-page-mock__mobile-menu-trigger" onClick={onOpenSidebar}>
      Menu
    </button>
    <div className="chat-page-mock__mobile-brand">
      <img src="assets/official_logo_grey_500.png" alt="Makalah" className="chat-page-mock__activitybar-mark" />
    </div>
    <div className="chat-page-mock__mobile-user">ES</div>
  </header>
);

const ChatMockMobileSidebarSheet = ({ state, onClose }) => {
  if (state.sidebarState !== "mobileSheetOpen") return null;

  return (
    <div className="chat-page-mock__mobile-sidebar-overlay" onClick={onClose}>
      <aside className="chat-page-mock__mobile-sidebar-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="chat-page-mock__mobile-sidebar-head">
          <div className="chat-page-mock__panel-label">Menu Mobile</div>
          <button type="button" className="chat-page-mock__mobile-close" onClick={onClose}>
            Tutup
          </button>
        </div>

        <div className="chat-page-mock__activitybar-items">
          {CHAT_ACTIVITY_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`chat-page-mock__activitybar-button ${state.sidebarPanel === item.key ? "is-active" : ""}`}
            >
              <span className="chat-page-mock__activitybar-icon">{item.icon}</span>
              <span className="chat-page-mock__activitybar-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="chat-page-mock__mobile-sidebar-list">
          <div className="chat-page-mock__panel-label">
            {state.sidebarPanel === "progress" ? "Progres Paper" : "Riwayat Percakapan"}
          </div>
          {(state.sidebarPanel === "progress" ? CHAT_SIDEBAR_PROGRESS_ITEMS : CHAT_SIDEBAR_HISTORY_ITEMS).map((item) => (
            <div key={item} className="chat-page-mock__mobile-sidebar-item">
              {item}
            </div>
          ))}
        </div>

        <div className="chat-page-mock__mobile-sidebar-footer">
          <div className="chat-page-mock__panel-label">Akun & Kredit</div>
          <p>Erik Supit · 124 Kredit</p>
        </div>
      </aside>
    </div>
  );
};

const ChatMockMobileFrame = ({ state, summaryItems, onPatch }) => (
  <div className={`chat-page-mock__mobile-frame ${state.composerState === "mobileFullscreen" ? "is-fullscreen-composer" : ""}`}>
    <ChatMockMobileHeader onOpenSidebar={() => onPatch({ sidebarState: "mobileSheetOpen" })} />
    <ChatMockMobileSidebarSheet state={state} onClose={() => onPatch({ sidebarState: "collapsed" })} />

    <main className="chat-page-mock__mobile-content">
      <div className="chat-page-mock__shell-summary is-mobile">
        {summaryItems.slice(0, 4).map(([label, value]) => (
          <article key={label} className="chat-page-mock__summary-card">
            <div className="chat-page-mock__summary-label">{label}</div>
            <div className="chat-page-mock__summary-value">{value}</div>
          </article>
        ))}
      </div>

      <section className="chat-page-mock__shell-main is-mobile">
        <div className="chat-page-mock__panel-label">Mobile Main Placeholder</div>
        <p>State: {state.conversationState}</p>
        <p>Composer: {state.composerState}</p>
        {state.composerState === "mobileFullscreen" && (
          <div className="chat-page-mock__fullscreen-indicator">
            Fullscreen Composer Mode Aktif
          </div>
        )}
      </section>

      <div className="chat-page-mock__shell-notes is-mobile">
        <div className="chat-page-mock__panel-label">Task 4 Boundary</div>
        <p>Mobile shell sudah mencakup frame, header, dan sidebar sheet visual. State fullscreen composer juga punya representasi visual.</p>
      </div>
    </main>
  </div>
);

const ChatMockStateControls = ({ state, activePresetId, onPatch, onPreset }) => (
  <section className="chat-page-mock__review-strip" aria-label="Chat mockup review controls">
    <div className="chat-page-mock__review-header">
      <div>
        <div className="chat-page-mock__eyebrow">Review Strip</div>
        <h1>ChatPage mockup review</h1>
      </div>
      <a href="#/documentation" className="chat-page-mock__review-link">
        Lihat dokumentasi
      </a>
    </div>

    <div className="chat-page-mock__preset-block">
      <div className="chat-page-mock__control-label">Preset Minimum</div>
      <div className="chat-page-mock__preset-list" role="group" aria-label="Preset minimum chat mockup">
        {CHAT_MOCK_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`chat-page-mock__preset-button ${activePresetId === preset.id ? "is-active" : ""}`}
            onClick={() => onPreset(preset.id, preset.patch)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>

    <div className="chat-page-mock__controls-grid">
      {CONTROL_GROUPS.map((group) => (
        <ChatMockToggleGroup
          key={group.key}
          label={group.label}
          value={state[group.key]}
          options={group.options}
          onChange={(nextValue) => onPatch({ [group.key]: nextValue })}
        />
      ))}
    </div>

    <div className="chat-page-mock__boolean-row">
      {BOOLEAN_CONTROLS.map((control) => (
        <ChatMockBooleanControl
          key={control.key}
          label={control.label}
          checked={state[control.key]}
          onChange={(nextValue) => onPatch({ [control.key]: nextValue })}
        />
      ))}
    </div>
  </section>
);

const ChatMockShell = ({ state, onPatch }) => {
  const summaryItems = [
    ["Viewport", state.viewport],
    ["Conversation", state.conversationState],
    ["Sidebar", `${state.sidebarState} / ${state.sidebarPanel}`],
    ["Composer", state.composerState],
    ["Process", state.processState],
    ["Alert", state.alertState],
    ["Artifact", state.artifactPanelState],
    ["Sources", state.sourcesPanelOpen ? "open" : "closed"],
    ["Reasoning", state.reasoningPanelOpen ? "open" : "closed"]
  ];

  return (
    <section className="chat-page-mock__shell" aria-label="Chat mockup shell surface">
      <div className="chat-page-mock__shell-frame">
        <header className="chat-page-mock__shell-header">
          <div>
          <div className="chat-page-mock__eyebrow">Chat Surface</div>
            <h2>{state.viewport === "mobile" ? "Mobile shell visual aktif" : "Desktop shell visual aktif"}</h2>
          </div>
          <div className="chat-page-mock__shell-badge">Bukan review strip</div>
        </header>
        {state.viewport === "mobile"
          ? <ChatMockMobileFrame state={state} summaryItems={summaryItems} onPatch={onPatch} />
          : <ChatMockDesktopShell state={state} summaryItems={summaryItems} />}

        <ShellPageFooter />
      </div>
    </section>
  );
};

const ChatPage = () => {
  const [mockState, setMockState] = React.useState(DEFAULT_CHAT_MOCK_STATE);
  const [activePresetId, setActivePresetId] = React.useState("default");

  const handleStatePatch = (patch) => {
    setActivePresetId(null);
    setMockState((prevState) => mergeChatMockState(prevState, patch));
  };

  const handlePresetApply = (presetId, presetPatch) => {
    setActivePresetId(presetId);
    setMockState(getPresetState(presetPatch));
  };

  return (
    <div className="chat-page-mock">
      <ChatMockStateControls
        state={mockState}
        activePresetId={activePresetId}
        onPatch={handleStatePatch}
        onPreset={handlePresetApply}
      />
      <ChatMockShell state={mockState} onPatch={handleStatePatch} />
    </div>
  );
};

Object.assign(window, {
  ChatPage
});
