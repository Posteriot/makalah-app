/* Marketing layout mock */

const MarketingLayoutMock = ({ children }) => (
  <>
    <div className="grid-bg" />
    <div className="grain-bg" />
    <GlobalHeaderMock />
    <main>{children}</main>
    <FooterMock />
    <Tweaks defaults={window.__TWEAKS_DEFAULTS || TWEAK_DEFAULTS} />
  </>
);

Object.assign(window, { MarketingLayoutMock });
