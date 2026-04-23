/* Marketing layout mock */

const MarketingLayoutMock = ({ children }) => {
  const currentRoute = typeof window.useHashRoute === "function" ? window.useHashRoute() : "/";
  const isDocsRoute = currentRoute === "/documentation";
  const isAuthRoute = currentRoute === "/sign-in"
    || currentRoute === "/sign-up"
    || currentRoute === "/verify-2fa"
    || currentRoute === "/forgot-password"
    || currentRoute === "/forgot-password/email-sent"
    || currentRoute === "/magic-link"
    || currentRoute === "/magic-link/email-sent"
    || currentRoute === "/reset-password";

  return (
    <>
      <div className="grid-bg" />
      <div className="grain-bg" />
      {!isDocsRoute && !isAuthRoute ? <GlobalHeaderMock /> : null}
      <main className={isDocsRoute ? "docs-route-main" : isAuthRoute ? "auth-route-main" : ""}>{children}</main>
      {!isDocsRoute && !isAuthRoute ? <FooterMock /> : null}
      {!isDocsRoute && !isAuthRoute ? <Tweaks defaults={window.__TWEAKS_DEFAULTS || TWEAK_DEFAULTS} /> : null}
    </>
  );
};

Object.assign(window, { MarketingLayoutMock });
