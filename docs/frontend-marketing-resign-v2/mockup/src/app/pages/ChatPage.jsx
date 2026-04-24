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

const ChatMockStateControls = ({ state, activePresetId, onPatch, onPreset }) => (
  <section className="chat-page-mock__review-strip" aria-label="Chat mockup review controls">
    <div className="chat-page-mock__review-header">
      <div>
        <div className="chat-page-mock__eyebrow">Review Strip</div>
        <h1>ChatPage skeleton + review controls</h1>
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

const ChatMockShell = ({ state }) => {
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
            <h2>Shell placeholder untuk task berikutnya</h2>
          </div>
          <div className="chat-page-mock__shell-badge">Bukan review strip</div>
        </header>

        <div className="chat-page-mock__shell-summary">
          {summaryItems.map(([label, value]) => (
            <article key={label} className="chat-page-mock__summary-card">
              <div className="chat-page-mock__summary-label">{label}</div>
              <div className="chat-page-mock__summary-value">{value}</div>
            </article>
          ))}
        </div>

        <div className="chat-page-mock__shell-columns">
          <aside className="chat-page-mock__shell-panel" aria-label="Sidebar placeholder">
            <div className="chat-page-mock__panel-label">Sidebar Placeholder</div>
            <p>Mode aktif: {state.sidebarState}</p>
            <p>Panel aktif: {state.sidebarPanel}</p>
          </aside>

          <section className="chat-page-mock__shell-main" aria-label="Main placeholder">
            <div className="chat-page-mock__panel-label">Main Placeholder</div>
            <p>Conversation state: {state.conversationState}</p>
            <p>Composer state: {state.composerState}</p>
            <p>Process state: {state.processState}</p>
          </section>
        </div>

        <div className="chat-page-mock__shell-notes">
          <div className="chat-page-mock__panel-label">Task 2 Boundary</div>
          <ul className="chat-page-mock__status-list">
            <li>Review controls dipisah di strip teratas.</li>
            <li>Shell ini hanya placeholder visual untuk task lanjutan.</li>
            <li>State root sekarang sudah bisa diganti via preset dan controls eksplisit.</li>
          </ul>
        </div>

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
      <ChatMockShell state={mockState} />
    </div>
  );
};

Object.assign(window, {
  ChatPage
});
