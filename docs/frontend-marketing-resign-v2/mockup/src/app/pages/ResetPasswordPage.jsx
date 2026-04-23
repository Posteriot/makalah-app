/* Static reset password page mock */

const ResetPasswordPage = () => (
  <div className="auth-page reset-password-page">
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
            <h1>Buat password baru</h1>
            <p className="auth-card-copy">Masukkan password baru untuk melanjutkan masuk ke akun Kamu.</p>
          </div>

          <div className="auth-actions">
            <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
              <label className="auth-field">
                <input type="password" placeholder="Password baru" aria-label="Password baru" />
              </label>

              <label className="auth-field">
                <input type="password" placeholder="Ulangi password" aria-label="Ulangi password" />
              </label>

              <button type="submit" className="btn btn-primary auth-submit-btn">
                Simpan password baru <Arrow />
              </button>
            </form>

            <div className="auth-row auth-row-center auth-helper-row">
              <a href="#/sign-in" className="auth-inline-link auth-inline-link-arrow">
                <span className="auth-inline-link-arrow-icon" aria-hidden="true">
                  <Arrow />
                </span>
                <span>Masuk</span>
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
  ResetPasswordPage
});
