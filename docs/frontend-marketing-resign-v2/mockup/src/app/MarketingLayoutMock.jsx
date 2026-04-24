/* Marketing layout mock */

const MarketingLayoutMock = ({ children }) => {
  const currentRoute = typeof window.useHashRoute === "function" ? window.useHashRoute() : "/";
  const isChatRoute = currentRoute === "/chat";
  const isShellRoute = currentRoute === "/documentation"
    || isChatRoute
    || currentRoute.indexOf("/report-issue") === 0;
  const isAuthRoute = currentRoute === "/sign-in"
    || currentRoute.indexOf("/sign-in/") === 0
    || currentRoute === "/sign-up"
    || currentRoute.indexOf("/sign-up/") === 0
    || currentRoute === "/verify-2fa"
    || currentRoute.indexOf("/verify-2fa/") === 0
    || currentRoute === "/forgot-password"
    || currentRoute.indexOf("/forgot-password/") === 0
    || currentRoute === "/magic-link"
    || currentRoute.indexOf("/magic-link/") === 0
    || currentRoute === "/reset-password"
    || currentRoute.indexOf("/reset-password/") === 0;

  const mainClassName = isChatRoute
    ? "chat-route-main"
    : isShellRoute
      ? "docs-route-main"
      : isAuthRoute
        ? "auth-route-main"
        : "";

  return (
    <>
      <div className="grid-bg" />
      <div className="grain-bg" />
      {!isShellRoute && !isAuthRoute ? <GlobalHeaderMock /> : null}
      <main className={mainClassName}>{children}</main>
      {!isShellRoute && !isAuthRoute ? <FooterMock /> : null}
      {!isShellRoute && !isAuthRoute ? <Tweaks defaults={window.__TWEAKS_DEFAULTS || TWEAK_DEFAULTS} /> : null}
    </>
  );
};

Object.assign(window, { MarketingLayoutMock });
