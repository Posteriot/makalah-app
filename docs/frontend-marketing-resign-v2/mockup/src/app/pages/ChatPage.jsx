/* Static chat page mock — Premium Shell Redesign */

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
  }
];

const CONTROL_GROUPS = [
  {
    key: "conversationState",
    label: "Conversation",
    options: ["landing", "loading", "active", "notFound"]
  },
  {
    key: "sidebarState",
    label: "Sidebar",
    options: ["expanded", "collapsed"]
  },
  {
    key: "composerState",
    label: "Composer",
    options: ["idle", "generating"]
  },
  {
    key: "processState",
    label: "Process",
    options: ["hidden", "processing", "error"]
  },
  {
    key: "artifactPanelState",
    label: "Artifact",
    options: ["closed", "openLoaded", "openLoading"]
  }
];

const CHAT_ACTIVITY_ITEMS = [
  { key: "history", icon: "H", label: "History" },
  { key: "progress", icon: "P", label: "Progress" },
  { key: "library", icon: "L", label: "Library" },
  { key: "settings", icon: "S", label: "Settings" }
];

const CHAT_SIDEBAR_HISTORY_ITEMS = [
  "Draft metode penelitian kuantitatif",
  "Revisi pembahasan literatur utama",
  "Analisis dampak AI di kampus"
];

const CHAT_MESSAGES = [
  {
    role: "user",
    content: "Bantu gue buat draf pendahuluan untuk paper tentang dampak AI di pendidikan tinggi Indonesia."
  },
  {
    role: "assistant",
    content: "Tentu! Ini adalah draf pendahuluan yang gue susun berdasarkan tren saat ini di Indonesia:\n\n1. **Latar Belakang**: Transformasi digital di kampus-kampus besar.\n2. **Masalah Utama**: Kesenjangan akses teknologi antara daerah.\n3. **Tujuan**: Menganalisis efektivitas penggunaan LLM dalam proses belajar mengajar.\n\nApakah ada bagian spesifik yang mau Kamu perdalam?"
  },
  {
    role: "user",
    content: "Coba perdalam di bagian kesenjangan akses teknologi."
  },
  {
    role: "assistant",
    content: "Siap. Gue bakal fokus ke data penetrasi internet di Indonesia Timur vs Barat dan bagaimana itu memengaruhi adopsi alat AI akademik. Bentar ya gue susun argumennya."
  }
];

const ChatMockActivityBar = ({ activePanel }) => (
  <aside className="chat-shell-activity-bar">
    <div className="chat-activity-top" style={{ marginBottom: "auto" }}>
      <img src="assets/official_logo_grey_500.png" alt="" style={{ width: "24px", marginBottom: "24px" }} />
      {CHAT_ACTIVITY_ITEMS.slice(0, 3).map((item) => (
        <button
          key={item.key}
          className={`chat-activity-item ${activePanel === item.key ? "active" : ""}`}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
    </div>
    <div className="chat-activity-bottom">
      <button className="chat-activity-item" title="Settings">S</button>
      <div className="chat-user-avatar" style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--brand-green-soft)", color: "var(--brand-green)", display: "flex", alignItems: "center", justifyCenter: "center", fontSize: "10px", fontWeight: "700" }}>ES</div>
    </div>
  </aside>
);

const ChatMockSidebar = ({ state }) => {
  if (state.sidebarState === "collapsed") return null;
  
  return (
    <aside className="chat-shell-sidebar">
      <div className="chat-sidebar-header">
        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
          + New Research
        </button>
      </div>
      <div className="chat-sidebar-scroll">
        <div className="chat-sidebar-group-label">Recent Conversations</div>
        {CHAT_SIDEBAR_HISTORY_ITEMS.map((item, i) => (
          <button key={i} className={`chat-sidebar-item ${i === 0 ? "active" : ""}`}>
            <span style={{ opacity: 0.5 }}>#</span> {item}
          </button>
        ))}
        
        <div className="chat-sidebar-group-label" style={{ marginTop: "24px" }}>Research Milestones</div>
        <div className="chat-sidebar-item">
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--ok)" }} />
          Literature Review
        </div>
        <div className="chat-sidebar-item">
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--brand-green)" }} />
          Methodology Draft
        </div>
      </div>
    </aside>
  );
};

const ChatMockMessageBubble = ({ message }) => {
  const isUser = message.role === "user";
  
  return (
    <div className="chat-message-container">
      <div style={{ display: "flex", gap: "16px", opacity: isUser ? 0.9 : 1 }}>
        <div style={{ 
          width: "32px", height: "32px", borderRadius: "8px", 
          background: isUser ? "var(--bg-1)" : "var(--brand-green-soft)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "12px", fontWeight: "700", flexShrink: 0,
          border: "1px solid var(--line)"
        }}>
          {isUser ? "ES" : "AI"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: isUser ? "var(--ink)" : "var(--brand-green)" }}>
              {isUser ? "Erik Supit" : "Makalah AI"}
            </span>
            <span style={{ fontSize: "11px", color: "var(--ink-4)" }}>12:45 PM</span>
          </div>
          <div style={{ fontSize: "14px", color: "var(--ink-2)", lineHeight: "1.6" }}>
            {message.content.split("\n").map((line, i) => (
              <p key={i} style={{ marginBottom: "8px" }}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatMockComposer = ({ state, onPatch }) => {
  const isGenerating = state.composerState === "generating";
  
  return (
    <div className="chat-composer-wrapper">
      <div className="chat-composer-box">
        <textarea 
          className="chat-composer-input"
          placeholder="Tanyakan analisis data atau susun draf makalah..."
          readOnly={isGenerating}
        />
        <div className="chat-composer-toolbar">
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="chat-activity-item" style={{ margin: 0, width: "32px", height: "32px" }}>📎</button>
            <button className="chat-activity-item" style={{ margin: 0, width: "32px", height: "32px" }}>🌐</button>
            <button className="chat-activity-item" style={{ margin: 0, width: "32px", height: "32px" }}>🧠</button>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ minHeight: "32px", padding: "0 12px" }}
            onClick={() => onPatch({ composerState: isGenerating ? "idle" : "generating" })}
          >
            {isGenerating ? "Stop" : "Send"}
          </button>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: "12px", fontSize: "11px", color: "var(--ink-4)" }}>
        Press <span style={{ padding: "1px 4px", border: "1px solid var(--line)", borderRadius: "3px" }}>⌘ Enter</span> to send
      </div>
    </div>
  );
};

const ChatMockArtifactPanel = ({ state, onPatch }) => {
  if (state.artifactPanelState === "closed") return null;
  
  const isLoading = state.artifactPanelState === "openLoading";
  
  return (
    <aside className="chat-shell-panel">
      <div className="chat-panel-header">
        <div className="mono-label" style={{ color: "var(--ink)" }}>Artifact: Methodology_Draft.v1</div>
        <button onClick={() => onPatch({ artifactPanelState: "closed" })} style={{ fontSize: "20px", opacity: 0.5 }}>×</button>
      </div>
      <div className="chat-panel-content">
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ height: "24px", width: "60%", background: "var(--line)", borderRadius: "4px" }} />
            <div style={{ height: "100px", width: "100%", background: "var(--line)", borderRadius: "4px" }} />
          </div>
        ) : (
          <div style={{ color: "var(--ink-2)", fontSize: "14px", lineHeight: "1.7" }}>
            <h2 style={{ color: "var(--ink)", marginBottom: "16px", fontSize: "18px" }}>Draf Pendahuluan: AI di Pendidikan</h2>
            <p>Perkembangan kecerdasan buatan (AI) telah membawa perubahan signifikan dalam lanskap pendidikan tinggi di Indonesia...</p>
            <p style={{ marginTop: "12px" }}>Meskipun menawarkan efisiensi, terdapat tantangan besar berupa kesenjangan akses teknologi antar wilayah...</p>
          </div>
        )}
      </div>
    </aside>
  );
};

const ChatPage = () => {
  const [state, setState] = React.useState(DEFAULT_CHAT_MOCK_STATE);
  
  const onPatch = (patch) => setState(prev => ({ ...prev, ...patch }));
  
  const isSidebarCollapsed = state.sidebarState === "collapsed";
  
  return (
    <main className="chat-route-main">
      {/* Review HUD */}
      <div className="chat-review-hud">
        <div className="chat-review-label">Mockup Review Mode</div>
        <div style={{ height: "16px", width: "1px", background: "var(--line-2)" }} />
        <div style={{ display: "flex", gap: "8px" }}>
          {CHAT_MOCK_PRESETS.map(preset => (
            <button 
              key={preset.id}
              className="btn" 
              style={{ minHeight: "28px", fontSize: "11px", padding: "0 10px" }}
              onClick={() => setState(prev => ({ ...prev, ...preset.patch }))}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chat-page-shell" style={{ 
        gridTemplateColumns: `48px ${isSidebarCollapsed ? "0px" : "280px"} 1fr ${state.artifactPanelState === "closed" ? "0px" : "360px"}` 
      }}>
        <ChatMockActivityBar activePanel={state.sidebarPanel} />
        <ChatMockSidebar state={state} />
        
        <section className="chat-shell-main">
          <header className="chat-main-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button 
                className="chat-activity-item" 
                style={{ margin: 0, width: "32px", height: "32px" }}
                onClick={() => onPatch({ sidebarState: isSidebarCollapsed ? "expanded" : "collapsed" })}
              >
                {isSidebarCollapsed ? "→" : "←"}
              </button>
              <div className="mono-label">Project: AI Research 2024</div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div className="chat-process-bar">
                <div className="chat-process-dot" />
                <span>AI is thinking...</span>
              </div>
              <button className="btn" style={{ minHeight: "32px", fontSize: "12px" }}>Share</button>
            </div>
          </header>
          
          <div className="chat-message-list">
            {CHAT_MESSAGES.map((msg, i) => (
              <ChatMockMessageBubble key={i} message={msg} />
            ))}
          </div>
          
          <ChatMockComposer state={state} onPatch={onPatch} />
        </section>
        
        <ChatMockArtifactPanel state={state} onPatch={onPatch} />
      </div>
    </main>
  );
};

Object.assign(window, { ChatPage });
