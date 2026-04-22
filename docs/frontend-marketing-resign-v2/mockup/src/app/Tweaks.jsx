/* Tweaks panel */

const BRAND_COLORS = {
  brandGreen:  { c: "oklch(0.7152 0.1549 128.78)", s: "oklch(0.7152 0.1549 128.78 / 0.16)", g: "oklch(0.7152 0.1549 128.78 / 0.38)", ink: "oklch(0.1536 0.0027 248.00)" },
  brandOrange: { c: "oklch(0.6546 0.2006 36.90)", s: "oklch(0.6546 0.2006 36.90 / 0.16)", g: "oklch(0.6546 0.2006 36.90 / 0.32)", ink: "oklch(0.9810 0.0109 54.50)" },
  sky:         { c: "oklch(0.8756 0.1030 213.51)", s: "oklch(0.8756 0.1030 213.51 / 0.14)", g: "oklch(0.8756 0.1030 213.51 / 0.30)", ink: "oklch(0.1536 0.0027 248.00)" },
  coral:       { c: "oklch(0.7556 0.1491 35.80)", s: "oklch(0.7556 0.1491 35.80 / 0.14)", g: "oklch(0.7556 0.1491 35.80 / 0.40)", ink: "oklch(0.1536 0.0027 248.00)" }
};

const DENSITIES = {
  compact: { sectionPad: 64, heroPad: 100 },
  default: { sectionPad: 96, heroPad: 140 },
  airy:    { sectionPad: 140, heroPad: 180 }
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "brandColor": "brandGreen",
  "density": "default",
  "grain": true,
  "grid": true
}/*EDITMODE-END*/;

const applyTweaks = (tw) => {
  const r = document.documentElement;
  const brandColor = BRAND_COLORS[tw.brandColor] || BRAND_COLORS.brandGreen;
  r.style.setProperty("--brand-green", brandColor.c);
  r.style.setProperty("--brand-green-soft", brandColor.s);
  r.style.setProperty("--brand-green-glow", brandColor.g);
  r.style.setProperty("--brand-green-ink", brandColor.ink);
  r.style.setProperty("--brand-green-line", brandColor.s.replace(/0\.(14|16)/, "0.30"));

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
        <label>Brand color</label>
        <div className="tw-swatches">
          {Object.entries(BRAND_COLORS).map(([k, v]) => (
            <div key={k}
              className={`tw-sw${tw.brandColor === k ? " active" : ""}`}
              style={{ background: v.c }}
              onClick={() => update({ brandColor: k })}
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

Object.assign(window, { Tweaks, TWEAK_DEFAULTS, applyTweaks });
