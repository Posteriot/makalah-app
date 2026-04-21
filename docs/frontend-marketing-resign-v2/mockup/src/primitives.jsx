/* Reusable primitives + icons for the Makalah AI redesign */

const Logo = ({ size = 24 }) => (
  <img
    src="assets/logo-mark.png"
    alt="Makalah"
    style={{ width: size, height: size, display: "block", borderRadius: 4 }}
  />
);

const Wordmark = ({ height = 18 }) => (
  <img
    src="assets/brand-makalah-white.png"
    alt="Makalah AI"
    style={{
      height,
      width: "auto",
      display: "block"
    }}
  />
);

const Arrow = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Chev = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Check = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5l3.5 3L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const X = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

/* Reveal wrapper using IntersectionObserver */
const Reveal = ({ children, delay = 0, className = "", as: As = "div", ...rest }) => {
  const ref = React.useRef(null);
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Safety: always reveal after a short timeout, even if IO never fires (iframe edge cases)
    const fallback = setTimeout(() => setOn(true), 120);
    let obs;
    try {
      obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { setOn(true); clearTimeout(fallback); obs.disconnect(); } },
        { threshold: 0, rootMargin: "0px 0px -5% 0px" }
      );
      obs.observe(el);
    } catch (_) { setOn(true); }
    return () => { clearTimeout(fallback); if (obs) obs.disconnect(); };
  }, []);
  const cls = `reveal${on ? " in" : ""}${delay ? ` d${delay}` : ""} ${className}`.trim();
  return <As ref={ref} className={cls} {...rest}>{children}</As>;
};

Object.assign(window, { Logo, Wordmark, Arrow, Chev, Check, X, Reveal });
