/* Static sign-in page mock */

const GoogleMark = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#EA4335" d="M12.24 10.285v3.821h5.445c-.22 1.235-.94 2.28-2.02 2.978l3.268 2.536c1.904-1.756 3.001-4.34 3.001-7.405 0-.72-.065-1.412-.185-2.08z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.965-.896 6.62-2.425l-3.268-2.536c-.907.61-2.067.971-3.352.971-2.58 0-4.765-1.742-5.545-4.084H3.076v2.615A9.997 9.997 0 0 0 12 22z" />
    <path fill="#4A90E2" d="M6.455 13.926A5.997 5.997 0 0 1 6.145 12c0-.668.115-1.317.31-1.926V7.459H3.076A9.995 9.995 0 0 0 2 12c0 1.611.386 3.135 1.076 4.541z" />
    <path fill="#FBBC05" d="M12 5.99c1.468 0 2.786.505 3.823 1.496l2.868-2.867C16.96 2.998 14.697 2 12 2A9.997 9.997 0 0 0 3.076 7.459l3.379 2.615C7.235 7.732 9.42 5.99 12 5.99z" />
  </svg>
);

const SignInPage = () => (
  <div className="auth-page sign-in-page">
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

          <div className="auth-card-head auth-card-head-compact">
            <h1>Silakan masuk</h1>
          </div>

          <div className="auth-actions">
            <a href="#/sign-in" className="btn auth-google-btn">
              <GoogleMark />
              <span>Masuk dengan Google</span>
            </a>

            <div className="auth-divider" role="presentation">
              <span>atau masuk dengan email</span>
            </div>

            <form className="auth-form" onSubmit={(event) => event.preventDefault()}>
              <label className="auth-field">
                <input type="email" placeholder="Email" aria-label="Email" />
              </label>

              <label className="auth-field">
                <input type="password" placeholder="Password" aria-label="Password" />
              </label>

              <div className="auth-row auth-row-between">
                <a href="#/magic-link" className="auth-inline-link">
                  Masuk dengan Magic Link
                </a>
                <a href="#/forgot-password" className="auth-inline-link">
                  Lupa password?
                </a>
              </div>

              <div className="auth-feedback" role="status" aria-live="polite">
                Email atau password belum sesuai. Coba lagi.
              </div>

              <button type="submit" className="btn btn-primary auth-submit-btn">
                Masuk <Arrow />
              </button>
            </form>
          </div>

          <div className="auth-card-foot">
            <span className="auth-foot-copy">Belum punya akun?</span>
            <a href="#/sign-up" className="auth-inline-link auth-inline-link-strong">
              Daftar
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
  GoogleMark,
  SignInPage
});
