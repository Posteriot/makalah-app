/* Static sign-up page mock */

const SignUpPage = () => (
  <div className="auth-page sign-up-page">
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
            <h1>Buat akun</h1>
          </div>

          <div className="auth-actions">
            <a href="#/sign-up" className="btn auth-google-btn">
              <GoogleMark />
              <span>Daftar dengan Google</span>
            </a>

            <div className="auth-divider" role="presentation">
              <span>atau daftar dengan email</span>
            </div>

            <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
              <label className="auth-field">
                <input type="text" placeholder="Nama depan" aria-label="Nama depan" />
              </label>

              <label className="auth-field">
                <input type="text" placeholder="Nama belakang" aria-label="Nama belakang" />
              </label>

              <label className="auth-field">
                <input type="email" placeholder="Email" aria-label="Email" />
              </label>

              <label className="auth-field">
                <input type="password" placeholder="Password" aria-label="Password" />
              </label>

              <button type="submit" className="btn btn-primary auth-submit-btn">
                Daftar <Arrow />
              </button>
            </form>
          </div>

          <div className="auth-card-foot">
            <span className="auth-foot-copy">Sudah punya akun?</span>
            <a href="#/sign-in" className="auth-inline-link auth-inline-link-strong">
              Masuk
            </a>
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
  SignUpPage
});
