/* Global footer chrome */

const FooterMock = () => {
  const currentRoute = typeof window.useHashRoute === "function" ? window.useHashRoute() : "/";
  if (currentRoute === "/documentation") return null;

  return (
  <footer className="footer">
    <div className="container">
      <div className="footer-top">
        <div className="footer-col">
          <h5>Produk</h5>
          <a href="#/chat">Chat</a>
          <a href="#/features">Fitur</a>
          <a href="#/pricing">Harga</a>
          <a href="#/roadmap">Roadmap</a>
          <a href="#/changelog">Changelog</a>
        </div>
        <div className="footer-col">
          <h5>Sumber daya</h5>
          <a href="#/documentation">Dokumentasi</a>
          <a href="#/blog">Blog</a>
          <a href="#/status">Status</a>
          <a href="#/report-issue/new">Lapor Masalah</a>
        </div>
        <div className="footer-col">
          <h5>Perusahaan</h5>
          <a href="#/about">Tentang</a>
          <a href="#/partnership">Kerja Sama</a>
          <a href="#">Karier</a>
          <a href="#">Kontak</a>
        </div>
        <div className="footer-col">
          <h5>Legal</h5>
          <a href="#/security">Security</a>
          <a href="#/terms">Terms</a>
          <a href="#/privacy">Privacy</a>
        </div>
      </div>
    </div>

    <div className="footer-wordmark">
      MAKALAH.AI
    </div>

    <div className="container">
      <div className="footer-bottom">
        <div className="fb-left">
          <span>© 2026 Makalah AI</span>
          <span>Produk PT The Management Asia</span>
        </div>
        <div className="fb-right">
          <span>Made in Jakarta</span>
          <span>v0.8</span>
        </div>
      </div>
    </div>
  </footer>
  );
};

const Footer = FooterMock;

Object.assign(window, { Footer, FooterMock });
