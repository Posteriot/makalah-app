/* Marketing layout mock */

const MarketingLayoutMock = () => (
  <>
    <div className="grid-bg" />
    <div className="grain-bg" />
    <GlobalHeaderMock />
    <main>
      <MarketingHomePage />
    </main>
    <FooterMock />
    <Tweaks defaults={window.__TWEAKS_DEFAULTS || TWEAK_DEFAULTS} />
  </>
);

Object.assign(window, { MarketingLayoutMock });
