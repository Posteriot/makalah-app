/* Tweaks panel + App root */

const ACCENTS = {
  lime:    { c: "#D4FF56", s: "rgba(212,255,86,0.14)", g: "rgba(212,255,86,0.4)", ink: "#0B0C0D" },
  amber:   { c: "#FFB547", s: "rgba(255,181,71,0.14)",  g: "rgba(255,181,71,0.4)",  ink: "#0B0C0D" },
  violet:  { c: "#B19CFF", s: "rgba(177,156,255,0.14)", g: "rgba(177,156,255,0.4)", ink: "#0B0C0D" },
  sky:     { c: "#7EE8FF", s: "rgba(126,232,255,0.14)", g: "rgba(126,232,255,0.4)", ink: "#0B0C0D" },
  coral:   { c: "#FF8A6B", s: "rgba(255,138,107,0.14)", g: "rgba(255,138,107,0.4)", ink: "#0B0C0D" }
};

const DENSITIES = {
  compact: { sectionPad: 64, heroPad: 100 },
  default: { sectionPad: 96, heroPad: 140 },
  airy:    { sectionPad: 140, heroPad: 180 }
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "lime",
  "density": "default",
  "grain": true,
  "grid": true
}/*EDITMODE-END*/;

const applyTweaks = (tw) => {
  const r = document.documentElement;
  const a = ACCENTS[tw.accent] || ACCENTS.lime;
  r.style.setProperty("--accent", a.c);
  r.style.setProperty("--accent-soft", a.s);
  r.style.setProperty("--accent-glow", a.g);
  r.style.setProperty("--accent-ink", a.ink);
  r.style.setProperty("--line-hot", a.s.replace("0.14", "0.30"));

  const d = DENSITIES[tw.density] || DENSITIES.default;
  document.querySelectorAll(".section-frame").forEach(el => {
    el.style.paddingTop = d.sectionPad + "px";
    el.style.paddingBottom = d.sectionPad + "px";
  });
  const hero = document.querySelector(".hero");
  if (hero) hero.style.paddingTop = d.heroPad + "px";

  document.querySelector(".grain-bg").style.display = tw.grain ? "" : "none";
  document.querySelector(".grid-bg").style.display = tw.grid ? "" : "none";
};

const Tweaks = ({ defaults }) => {
  const [tw, setTw] = React.useState(defaults);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => { applyTweaks(tw); }, [tw]);

  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "__activate_edit_mode") setOpen(true);
      if (e.data?.type === "__deactivate_edit_mode") setOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const update = (patch) => {
    const next = { ...tw, ...patch };
    setTw(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*");
  };

  return (
    <div className={`tweaks${open ? " open" : ""}`}>
      <h6>Tweaks <span className="dot" /></h6>
      <div className="tw-row">
        <label>Accent</label>
        <div className="tw-swatches">
          {Object.entries(ACCENTS).map(([k, v]) => (
            <div key={k}
              className={`tw-sw${tw.accent === k ? " active" : ""}`}
              style={{ background: v.c }}
              onClick={() => update({ accent: k })}
              title={k}
            />
          ))}
        </div>
      </div>
      <div className="tw-row">
        <label>Density</label>
        <div className="tw-opts">
          {["compact", "default", "airy"].map(d => (
            <div key={d}
              className={`tw-opt${tw.density === d ? " active" : ""}`}
              onClick={() => update({ density: d })}
            >{d}</div>
          ))}
        </div>
      </div>
      <div className="tw-row">
        <label>Grid overlay</label>
        <div className={`tw-opt${tw.grid ? " active" : ""}`} onClick={() => update({ grid: !tw.grid })}>
          {tw.grid ? "ON" : "OFF"}
        </div>
      </div>
      <div className="tw-row">
        <label>Grain texture</label>
        <div className={`tw-opt${tw.grain ? " active" : ""}`} onClick={() => update({ grain: !tw.grain })}>
          {tw.grain ? "ON" : "OFF"}
        </div>
      </div>
    </div>
  );
};

/* ---------- App ---------- */
const App = () => (
  <>
    <div className="grid-bg" />
    <div className="grain-bg" />
    <Navbar />
    <main>
      <Hero />
      <Benefits />
      <WorkflowFeature />
      <RefrasaFeature />
      <Manifesto />
      <Demo />
      <Pricing />
      <FAQ />
    </main>
    <Footer />
    <Tweaks defaults={window.__TWEAKS_DEFAULTS || TWEAK_DEFAULTS} />
  </>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
