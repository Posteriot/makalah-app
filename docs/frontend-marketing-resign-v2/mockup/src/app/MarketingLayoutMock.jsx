/* Marketing layout mock */

const MarketingLayoutMock = ({ children }) => {
  const currentRoute = typeof window.useHashRoute === "function" ? window.useHashRoute() : "/";
  const isDocsRoute = currentRoute === "/documentation";

  return (
    <>
      <div className="grid-bg" />
      <div className="grain-bg" />
      {!isDocsRoute ? <GlobalHeaderMock /> : null}
      <main className={isDocsRoute ? "docs-route-main" : ""}>{children}</main>
      {!isDocsRoute ? <FooterMock /> : null}
      {!isDocsRoute ? <Tweaks defaults={window.__TWEAKS_DEFAULTS || TWEAK_DEFAULTS} /> : null}
    </>
  );
};

Object.assign(window, { MarketingLayoutMock });
