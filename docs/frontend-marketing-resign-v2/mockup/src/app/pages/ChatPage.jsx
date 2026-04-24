/* Static chat page mock */

const ChatPage = () => {
  return (
    <div className="chat-page-mock">
      <div className="chat-page-mock__frame">
        <aside className="chat-page-mock__sidebar" aria-label="Navigasi chat mockup">
          <div className="chat-page-mock__sidebar-brand">
            <img
              src="assets/official_logo_grey_500.png"
              alt="Makalah"
              className="chat-page-mock__brand-mark"
            />
            <img
              src="assets/brand-text-white.png"
              alt="Makalah AI"
              className="chat-page-mock__brand-text"
            />
          </div>

          <div className="chat-page-mock__sidebar-section">
            <div className="chat-page-mock__sidebar-label">Chat mockup</div>
            <button type="button" className="chat-page-mock__sidebar-action">
              Percakapan Baru
            </button>
          </div>

          <div className="chat-page-mock__sidebar-section">
            <div className="chat-page-mock__sidebar-label">Status runtime</div>
            <ul className="chat-page-mock__status-list">
              <li>Route `#/chat` sudah terdaftar</li>
              <li>Shell route aktif tanpa marketing chrome</li>
              <li>State controls akan dirakit di task berikutnya</li>
            </ul>
          </div>
        </aside>

        <section className="chat-page-mock__main" aria-label="Area utama chat mockup">
          <header className="chat-page-mock__topbar">
            <div>
              <div className="chat-page-mock__eyebrow">Shell Route Ready</div>
              <h1>ChatPage mockup berhasil masuk ke runtime statis.</h1>
            </div>
            <a href="#/documentation" className="chat-page-mock__topbar-link">
              Lihat dokumentasi
            </a>
          </header>

          <div className="chat-page-mock__panel">
            <div className="chat-page-mock__panel-label">Task 1</div>
            <p>
              Halaman ini baru skeleton minimal untuk validasi wiring route, registrasi global component,
              dan pemisahan shell route dari marketing layout.
            </p>
          </div>

          <div className="chat-page-mock__conversation">
            <article className="chat-page-mock__bubble chat-page-mock__bubble--user">
              <div className="chat-page-mock__bubble-role">Kamu</div>
              <p>Tolong siapkan fondasi chat mockup untuk review runtime.</p>
            </article>

            <article className="chat-page-mock__bubble chat-page-mock__bubble--assistant">
              <div className="chat-page-mock__bubble-role">Makalah AI</div>
              <p>
                Fondasi runtime sudah siap. Task berikutnya bisa lanjut ke state controls, shell layout,
                composer, dan panel pendukung.
              </p>
            </article>
          </div>

          <div className="chat-page-mock__composer" aria-label="Composer placeholder">
            <div className="chat-page-mock__composer-input">
              Composer placeholder untuk task berikutnya.
            </div>
            <button type="button" className="chat-page-mock__composer-button">
              Kirim
            </button>
          </div>

          <ShellPageFooter />
        </section>
      </div>
    </div>
  );
};

Object.assign(window, {
  ChatPage
});
