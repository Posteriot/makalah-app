/* Static forgot password page mock */

const FORGOT_PASSWORD_VARIANTS = {
  default: null,
  required: { tone: "error", message: "Email wajib diisi sebelum link reset dikirim." },
  invalidEmail: { tone: "error", message: "Format email belum valid. Periksa kembali email Kamu." },
  emailNotFound: { tone: "error", message: "Email belum terdaftar. Periksa lagi atau buat akun baru." },
  sendFailed: { tone: "error", message: "Kami gagal mengirim email reset. Coba beberapa saat lagi." }
};

const ForgotPasswordPage = ({ variant = "default" }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const state = FORGOT_PASSWORD_VARIANTS[variant] || FORGOT_PASSWORD_VARIANTS.default;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      window.location.hash = "#/forgot-password/email-sent";
    }, 1200);
  };

  return (
    <div className="auth-page forgot-password-page">
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
              <h1>Lupa password?</h1>
              <p className="auth-card-copy">Masukkan email untuk menerima link reset password.</p>
            </div>

            <div className="auth-actions">
              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <input type="email" placeholder="Email" aria-label="Email" disabled={isSubmitting} />
                </label>

                {state ? (
                  <div className={`auth-feedback auth-feedback-${state.tone}`} role="status" aria-live="polite">
                    {state.message}
                  </div>
                ) : null}

                <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim link reset</span>
                      <Arrow />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-row auth-row-between auth-helper-row">
                <a href="#/sign-in" className="auth-inline-link auth-inline-link-arrow">
                  <span className="auth-inline-link-arrow-icon" aria-hidden="true">
                    <Arrow />
                  </span>
                  <span>Masuk</span>
                </a>
                <a href="#/magic-link" className="auth-inline-link">
                  Masuk dengan Magic Link
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
};

Object.assign(window, {
  FORGOT_PASSWORD_VARIANTS,
  ForgotPasswordPage
});
