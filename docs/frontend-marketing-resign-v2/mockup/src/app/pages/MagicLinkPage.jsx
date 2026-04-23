/* Static magic link page mock */

const MagicLinkPage = () => (
  <div className="auth-page magic-link-page">
    <section className="auth-shell">
      <div className="auth-shell-glow" aria-hidden="true" />
      <Reveal className="auth-card-wrap">
        <div className="auth-card">
          <a href="#/" className="auth-brand" aria-label="Kembali ke home Makalah AI">
            <img
              src="assets/official_logo_grey_500.png"
              alt="Makalah"
              className="auth-brand-mark"
            />
          </a>

          <div className="auth-card-head">
            <h1>Masuk dengan Magic Link</h1>
            <p className="auth-card-copy">Masukkan email dan kami kirim link masuk ke inbox Kamu.</p>
          </div>

          <div className="auth-actions">
            <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
              <label className="auth-field">
                <input type="email" placeholder="Email" aria-label="Email" />
              </label>

              <button type="submit" className="btn btn-primary auth-submit-btn">
                Kirim Magic Link <Arrow />
              </button>
            </form>

            <div className="auth-row auth-row-between auth-helper-row">
              <a href="#/sign-in" className="auth-inline-link auth-inline-link-arrow">
                <span className="auth-inline-link-arrow-icon" aria-hidden="true">
                  <Arrow />
                </span>
                <span>Masuk</span>
              </a>
              <a href="#/forgot-password" className="auth-inline-link">
                Lupa password?
              </a>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={1} className="auth-identity">
        <span>Makalah AI</span>
        <span>PT The Management Asia</span>
      </Reveal>
    </section>
  </div>
);

Object.assign(window, {
  MagicLinkPage
});
