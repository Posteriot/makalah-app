/* Hash router for the static marketing mockup */

const MOCK_ROUTE_KEYS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/pricing",
  "/documentation",
  "/blog",
  "/blog/workflow-bertahap-untuk-paper",
  "/about",
  "/privacy",
  "/security",
  "/terms",
  "/features",
  "/faq",
  "/roadmap",
  "/changelog",
  "/status",
  "/partnership"
];

const normalizeMockPath = (hash) => {
  const rawHash = typeof hash === "string" ? hash : window.location.hash;
  if (!rawHash || rawHash === "#" || rawHash === "#/") return "/";

  const withoutHash = rawHash.charAt(0) === "#" ? rawHash.slice(1) : rawHash;
  if (!withoutHash || withoutHash === "/") return "/";

  const withLeadingSlash = withoutHash.charAt(0) === "/" ? withoutHash : `/${withoutHash}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.charAt(withLeadingSlash.length - 1) === "/") {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
};

const useHashRoute = () => {
  const [path, setPath] = React.useState(() => normalizeMockPath());

  React.useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "#/";
      return undefined;
    }

    const onHashChange = () => {
      setPath(normalizeMockPath());
      window.scrollTo({ top: 0, behavior: "auto" });
    };

    window.addEventListener("hashchange", onHashChange);
    onHashChange();

    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return path;
};

const MockPagePlaceholder = ({ eyebrow, title, description, ctaLabel, ctaHref = "#/" }) => (
  <section className="section">
    <div className="container">
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "32px",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-xl)",
          background: "var(--bg-elev)",
          boxShadow: "var(--shadow-1)"
        }}
      >
        <div className="eyebrow">{eyebrow}</div>
        <h1 style={{ marginTop: "14px", marginBottom: "12px", fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>{title}</h1>
        <p style={{ margin: 0, color: "var(--ink-3)", fontSize: "1rem", lineHeight: 1.7 }}>{description}</p>
        <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
          <a href={ctaHref} className="btn btn-primary">
            {ctaLabel} <Arrow />
          </a>
          <a href="#/" className="btn btn-ghost">
            Kembali ke home
          </a>
        </div>
      </div>
    </div>
  </section>
);

const MockNotFoundPage = () => (
  <section className="section">
    <div className="container">
      <div
        style={{
          maxWidth: "560px",
          margin: "0 auto",
          padding: "28px",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-lg)",
          background: "rgba(15, 16, 18, 0.82)",
          textAlign: "center"
        }}
      >
        <div className="eyebrow">Route tidak ditemukan</div>
        <h1 style={{ marginTop: "12px", marginBottom: "10px", fontSize: "2rem" }}>Halaman ini belum tersedia</h1>
        <p style={{ margin: 0, color: "var(--ink-3)", lineHeight: 1.7 }}>
          Link yang Kamu buka tidak cocok dengan registry route mockup saat ini.
        </p>
        <a href="#/" className="btn btn-primary" style={{ marginTop: "22px" }}>
          Kembali ke home <Arrow />
        </a>
      </div>
    </div>
  </section>
);

const MOCK_ROUTE_REGISTRY = {
  "/": () => <MarketingHomePage />,
  "/sign-in": () => <SignInPage />,
  "/sign-up": () => <SignUpPage />,
  "/pricing": () => <PricingPage />,
  "/documentation": () => <DocumentationPage />,
  "/blog": () => <BlogPage />,
  "/blog/workflow-bertahap-untuk-paper": () => <BlogArticlePage />,
  "/about": () => <AboutPage />,
  "/privacy": () => (
    <MockPagePlaceholder
      eyebrow="Privacy"
      title="Ringkasan kebijakan privasi akan hadir di unit policy"
      description="Route legal sudah tersedia supaya footer bisa mengarah ke tujuan yang benar sejak awal implementasi."
      ctaLabel="Lihat security"
      ctaHref="#/security"
    />
  ),
  "/security": () => (
    <MockPagePlaceholder
      eyebrow="Security"
      title="Halaman security belum diisi konten final"
      description="Route ini disiapkan lebih dulu agar navigasi legal, active state, dan fallback bisa diuji dalam satu fondasi yang stabil."
      ctaLabel="Lihat terms"
      ctaHref="#/terms"
    />
  ),
  "/terms": () => (
    <MockPagePlaceholder
      eyebrow="Terms"
      title="Halaman terms akan dibuat pada unit policy"
      description="Saat ini route terms sudah aktif sebagai bagian dari registry semua target route yang diwajibkan."
      ctaLabel="Lihat privacy"
      ctaHref="#/privacy"
    />
  ),
  "/features": () => <FeaturesPage />,
  "/faq": () => <FAQPage />,
  "/roadmap": () => (
    <MockPagePlaceholder
      eyebrow="Roadmap"
      title="Roadmap mockup belum dirakit"
      description="Route roadmap sudah aktif agar footer produk bisa memakai target final tanpa menunggu halaman detail selesai."
      ctaLabel="Lihat changelog"
      ctaHref="#/changelog"
    />
  ),
  "/changelog": () => (
    <MockPagePlaceholder
      eyebrow="Changelog"
      title="Changelog akan dibuat sebagai halaman operasional"
      description="Unit routing foundation hanya memastikan changelog punya route yang valid dan fallback yang rapi."
      ctaLabel="Lihat status"
      ctaHref="#/status"
    />
  ),
  "/status": () => (
    <MockPagePlaceholder
      eyebrow="Status"
      title="Dashboard status akan diimplementasikan kemudian"
      description="Target route status sudah disiapkan untuk footer sumber daya dan pengujian registry route lengkap."
      ctaLabel="Lihat dokumentasi"
      ctaHref="#/documentation"
    />
  ),
  "/partnership": () => (
    <MockPagePlaceholder
      eyebrow="Kerja Sama"
      title="Halaman kerja sama belum dibangun"
      description="Route ini sudah tersedia sebagai bagian dari fondasi multi-page supaya navigasi footer final bisa langsung dipakai."
      ctaLabel="Lihat tentang"
      ctaHref="#/about"
    />
  )
};

const MockRouter = () => {
  const path = useHashRoute();
  const renderRoute = MOCK_ROUTE_REGISTRY[path];

  if (!renderRoute) {
    return <MockNotFoundPage />;
  }

  return renderRoute();
};

Object.assign(window, {
  MOCK_ROUTE_KEYS,
  MOCK_ROUTE_REGISTRY,
  MockNotFoundPage,
  MockPagePlaceholder,
  MockRouter,
  normalizeMockPath,
  useHashRoute
});
