/* Static sign-up page mock */

const SIGN_UP_VARIANTS = {
  default: { success: false },
  required: { tone: "error", message: "Semua field wajib diisi sebelum akun bisa dibuat." },
  invalidEmail: { tone: "error", message: "Format email belum valid. Periksa kembali email Kamu." },
  emailTooShort: { tone: "error", message: "Email minimal 8 karakter. Periksa kembali email Kamu." },
  emailTaken: { tone: "error", message: "Email ini sudah dipakai. Coba email lain atau langsung masuk." },
  passwordTooShort: { tone: "error", message: "Password terlalu pendek. Gunakan password yang lebih kuat." },
  success: {
    success: true,
    title: "Akun berhasil dibuat",
    description: "Akun baru Kamu sudah siap. Lanjutkan ke halaman masuk untuk mulai memakai Makalah AI.",
    primaryLabel: "Masuk sekarang",
    primaryHref: "#/sign-in"
  }
};

const SignUpPage = ({ variant = "default" }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const state = SIGN_UP_VARIANTS[variant] || SIGN_UP_VARIANTS.default;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    window.setTimeout(() => setIsSubmitting(false), 1200);
  };

  return (
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

          <div className={`auth-card-head${state.success ? "" : " auth-card-head-compact"}`}>
            <h1>{state.success ? state.title : "Buat akun"}</h1>
            {state.success ? <p className="auth-card-copy">{state.description}</p> : null}
          </div>

          <div className="auth-actions">
            {state.success ? (
              <div className="auth-form">
                <a href={state.primaryHref} className="btn btn-primary auth-submit-btn">
                  {state.primaryLabel} <Arrow />
                </a>
              </div>
            ) : (
              <>
                <a href="#/sign-up" className="btn auth-google-btn">
                  <GoogleMark />
                  <span>Daftar dengan Google</span>
                </a>

                <div className="auth-divider" role="presentation">
                  <span>atau daftar dengan email</span>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                  <label className="auth-field">
                    <input type="text" placeholder="Nama depan" aria-label="Nama depan" disabled={isSubmitting} />
                  </label>

                  <label className="auth-field">
                    <input type="text" placeholder="Nama belakang" aria-label="Nama belakang" disabled={isSubmitting} />
                  </label>

                  <label className="auth-field">
                    <input type="email" placeholder="Email" aria-label="Email" disabled={isSubmitting} />
                  </label>

                  <label className="auth-field">
                    <input type="password" placeholder="Password" aria-label="Password" disabled={isSubmitting} />
                  </label>

                  {state.message ? (
                    <div className={`auth-feedback auth-feedback-${state.tone}`} role="status" aria-live="polite">
                      {state.message}
                    </div>
                  ) : null}

                  <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="auth-spinner" aria-hidden="true" />
                        <span>Mendaftarkan...</span>
                      </>
                    ) : (
                      <>
                        <span>Daftar</span>
                        <Arrow />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
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
};

Object.assign(window, {
  SignUpPage
});
