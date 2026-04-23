/* Static magic link page mock */

const MAGIC_LINK_VARIANTS = {
  default: { mode: "request" },
  required: { mode: "request", tone: "error", message: "Email wajib diisi sebelum Magic Link dikirim." },
  invalidEmail: { mode: "request", tone: "error", message: "Format email belum valid. Periksa kembali email Kamu." },
  emailNotFound: { mode: "request", tone: "error", message: "Email belum terdaftar. Periksa lagi atau buat akun baru." },
  sendFailed: { mode: "request", tone: "error", message: "Kami gagal mengirim Magic Link. Coba lagi beberapa saat lagi." },
  invalid: {
    mode: "status",
    title: "Magic Link tidak valid",
    description: "Link yang Kamu buka tidak bisa dipakai untuk masuk.",
    message: "Minta Magic Link baru untuk melanjutkan masuk ke akun Kamu.",
    primaryLabel: "Minta Magic Link baru",
    primaryHref: "#/magic-link"
  },
  expired: {
    mode: "status",
    title: "Magic Link kedaluwarsa",
    description: "Link masuk ini sudah tidak berlaku lagi.",
    message: "Minta Magic Link baru agar Kamu bisa melanjutkan proses masuk.",
    primaryLabel: "Kirim Magic Link baru",
    primaryHref: "#/magic-link"
  }
};

const MagicLinkPage = ({ variant = "default" }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const state = MAGIC_LINK_VARIANTS[variant] || MAGIC_LINK_VARIANTS.default;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      window.location.hash = "#/magic-link/email-sent";
    }, 1200);
  };

  return (
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
            <h1>{state.mode === "status" ? state.title : "Masuk dengan Magic Link"}</h1>
            <p className="auth-card-copy">
              {state.mode === "status"
                ? state.description
                : "Masukkan email dan kami kirim link masuk ke inbox Kamu."}
            </p>
          </div>

          <div className="auth-actions">
            {state.mode === "status" ? (
              <>
                <div className="auth-feedback auth-feedback-error" role="status" aria-live="polite">
                  {state.message}
                </div>
                <div className="auth-form">
                  <a href={state.primaryHref} className="btn btn-primary auth-submit-btn">
                    {state.primaryLabel} <Arrow />
                  </a>
                </div>
              </>
            ) : (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <input type="email" placeholder="Email" aria-label="Email" disabled={isSubmitting} />
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
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim Magic Link</span>
                      <Arrow />
                    </>
                  )}
                </button>
              </form>
            )}

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
};

Object.assign(window, {
  MAGIC_LINK_VARIANTS,
  MagicLinkPage
});
