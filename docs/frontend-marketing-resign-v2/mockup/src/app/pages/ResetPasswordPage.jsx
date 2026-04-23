/* Static reset password page mock */

const RESET_PASSWORD_VARIANTS = {
  default: { mode: "form" },
  required: { mode: "form", tone: "error", message: "Password baru dan konfirmasi password wajib diisi." },
  passwordTooShort: { mode: "form", tone: "error", message: "Password terlalu pendek. Gunakan password yang lebih kuat." },
  mismatch: { mode: "form", tone: "error", message: "Konfirmasi password belum sama. Periksa kembali dua field password." },
  invalid: {
    mode: "status",
    tone: "error",
    title: "Link reset tidak valid",
    description: "Link yang Kamu buka tidak bisa dipakai untuk mengganti password.",
    message: "Minta link reset baru dari halaman lupa password untuk melanjutkan."
  },
  expired: {
    mode: "status",
    tone: "error",
    title: "Link reset kedaluwarsa",
    description: "Link reset password ini sudah tidak berlaku lagi.",
    message: "Kirim ulang link reset dari halaman lupa password untuk melanjutkan."
  },
  saveFailed: { mode: "form", tone: "error", message: "Kami gagal menyimpan password baru. Coba lagi beberapa saat lagi." },
  success: {
    mode: "status",
    tone: "success",
    title: "Password berhasil diperbarui",
    description: "Password baru Kamu sudah tersimpan dan siap dipakai untuk masuk.",
    message: "Lanjutkan ke halaman masuk untuk memakai password yang baru."
  }
};

const ResetPasswordPage = ({ variant = "default" }) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const state = RESET_PASSWORD_VARIANTS[variant] || RESET_PASSWORD_VARIANTS.default;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    window.setTimeout(() => setIsSubmitting(false), 1200);
  };

  return (
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
            <h1>{state.mode === "status" ? state.title : "Buat password baru"}</h1>
            <p className="auth-card-copy">
              {state.mode === "status"
                ? state.description
                : "Masukkan password baru untuk melanjutkan masuk ke akun Kamu."}
            </p>
          </div>

          <div className="auth-actions">
            {state.mode === "form" ? (
              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="auth-field">
                  <input type="password" placeholder="Password baru" aria-label="Password baru" disabled={isSubmitting} />
                </label>

                <label className="auth-field">
                  <input type="password" placeholder="Ulangi password" aria-label="Ulangi password" disabled={isSubmitting} />
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
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <span>Simpan password baru</span>
                      <Arrow />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <>
                <div className={`auth-feedback auth-feedback-${state.tone}`} role="status" aria-live="polite">
                  {state.message}
                </div>
                <div className="auth-form">
                  <a href="#/sign-in" className="btn btn-primary auth-submit-btn">
                    Masuk <Arrow />
                  </a>
                </div>
              </>
            )}

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
};

Object.assign(window, {
  RESET_PASSWORD_VARIANTS,
  ResetPasswordPage
});
