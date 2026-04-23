/* Static verify 2FA page mock */

const VERIFY_2FA_DIGITS = ["1", "8", "4", "", "", ""];

const VERIFY_2FA_VARIANTS = {
  default: null,
  required: { tone: "error", message: "Kode 2FA wajib diisi sebelum Kamu bisa melanjutkan." },
  incomplete: { tone: "error", message: "Kode 2FA belum lengkap. Masukkan seluruh 6 digit kode." },
  invalid: { tone: "error", message: "Kode 2FA salah. Periksa lagi kode dari aplikasi autentikator." },
  rateLimit: { tone: "error", message: "Terlalu banyak percobaan verifikasi. Tunggu sebentar sebelum mencoba lagi." }
};

const Verify2FAPage = ({ variant = "default" }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const state = VERIFY_2FA_VARIANTS[variant] || VERIFY_2FA_VARIANTS.default;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    window.setTimeout(() => setIsSubmitting(false), 1200);
  };

  return (
    <div className="auth-page verify-2fa-page">
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
              <h1>Verifikasi 2FA</h1>
              <p className="auth-card-copy">Masukkan 6 digit kode dari aplikasi autentikator untuk melanjutkan masuk.</p>
            </div>

            <div className="auth-actions">
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-otp-grid" role="group" aria-label="Kode verifikasi 2FA">
                  {VERIFY_2FA_DIGITS.map((digit, index) => (
                    <input
                      key={index}
                      className="auth-otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      placeholder=""
                      aria-label={`Digit ${index + 1}`}
                      readOnly
                      disabled={isSubmitting}
                    />
                  ))}
                </div>

                {state ? (
                  <div className={`auth-feedback auth-feedback-${state.tone}`} role="status" aria-live="polite">
                    {state.message}
                  </div>
                ) : null}

                <button type="submit" className="btn btn-primary auth-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Verifikasi</span>
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
                  Pakai Magic Link
                </a>
              </div>

              <div className="auth-feedback auth-feedback-soft auth-feedback-center auth-helper-note" role="status" aria-live="polite">
                Belum menerima kode? Gunakan recovery code atau kirim ulang dari perangkat autentikasi Kamu.
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
  VERIFY_2FA_DIGITS,
  VERIFY_2FA_VARIANTS,
  Verify2FAPage
});
