/* Global header chrome */

const Navbar = () => {
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuButtonRef = React.useRef(null);
  const menuPanelRef = React.useRef(null);
  const currentPath = typeof window.useHashRoute === "function" ? window.useHashRoute() : "#/";

  const links = [
    ["#/", "Home"],
    ["#/features", "Fitur"],
    ["#/pricing", "Harga"],
    ["#/documentation", "Dokumentasi"],
    ["#/blog", "Blog"],
    ["#/faq", "FAQ"],
    ["#/about", "Tentang"]
  ];
  const currentRoute = typeof window.normalizeMockPath === "function"
    ? window.normalizeMockPath(currentPath)
    : "/";
  const isActiveRoute = (href) => {
    const route = typeof window.normalizeMockPath === "function"
      ? window.normalizeMockPath(href)
      : href;
    return route === currentRoute;
  };
  const getNavLinkStyle = (href) => (
    isActiveRoute(href)
      ? { color: "var(--ink)", background: "var(--bg-elev)" }
      : null
  );
  const handleNavLinkClick = () => setMenuOpen(false);

  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", on); on();
    return () => window.removeEventListener("scroll", on);
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      const target = e.target;
      if (menuButtonRef.current?.contains(target) || menuPanelRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}${menuOpen ? " menu-open" : ""}`}>
      <div className="container nav-row">
        <div className="nav-left">
          <a href="#/" className="brand" onClick={handleNavLinkClick}>
            <div className="brand-mark"><Logo /></div>
            <Wordmark />
          </a>
          <div className="nav-links">
            {links.map(([href, label]) => (
              <a
                key={href}
                href={href}
                aria-current={isActiveRoute(href) ? "page" : undefined}
                onClick={handleNavLinkClick}
                style={getNavLinkStyle(href)}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <button
            ref={menuButtonRef}
            className="nav-menu-btn"
            type="button"
            aria-label={menuOpen ? "Tutup menu utama" : "Buka menu utama"}
            aria-expanded={menuOpen}
            aria-controls="mobile-main-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <i className={`iconoir-${menuOpen ? "xmark" : "menu"}`} aria-hidden="true" />
          </button>
          <a href="#/" className="btn btn-primary nav-login" onClick={handleNavLinkClick}>Masuk <Arrow /></a>
        </div>
      </div>
      <div id="mobile-main-menu" className="container mobile-menu" aria-hidden={!menuOpen}>
        <div className="mobile-menu-panel" ref={menuPanelRef}>
          <div className="mobile-menu-links">
            {links.map(([href, label]) => (
              <a
                key={href}
                href={href}
                aria-current={isActiveRoute(href) ? "page" : undefined}
                onClick={handleNavLinkClick}
                style={isActiveRoute(href) ? { color: "var(--brand-green)", background: "var(--bg-elev)" } : null}
              >
                <span>{label}</span>
              </a>
            ))}
          </div>
          <div className="mobile-menu-action">
            <a href="#/" className="btn btn-primary mobile-login" onClick={handleNavLinkClick}>
              Masuk <Arrow />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

const GlobalHeaderMock = Navbar;

Object.assign(window, { Navbar, GlobalHeaderMock });
