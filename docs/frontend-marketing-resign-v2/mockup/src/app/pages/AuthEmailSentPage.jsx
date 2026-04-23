/* Static auth email sent page mock */

const AUTH_EMAIL_SENT_VARIANTS = {
  forgotPassword: {
    title: "Cek email Kamu",
    description: "Kami sudah mengirim link reset password ke email Kamu.",
    note: "Buka inbox atau folder spam, lalu klik link reset untuk membuat password baru.",
    primaryLabel: "Kirim ulang link",
    secondaryLabel: "Masuk",
    secondaryHref: "#/sign-in"
  },
  magicLink: {
    title: "Cek email Kamu",
    description: "Kami sudah mengirim Magic Link ke email Kamu.",
    note: "Buka inbox atau folder spam, lalu klik link itu untuk langsung masuk ke akun Kamu.",
    primaryLabel: "Kirim ulang Magic Link",
    secondaryLabel: "Masuk",
    secondaryHref: "#/sign-in"
  }
};

const AuthEmailSentPage = ({ variant = "forgotPassword" }) => {
  const content = AUTH_EMAIL_SENT_VARIANTS[variant] || AUTH_EMAIL_SENT_VARIANTS.forgotPassword;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleResend = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    window.setTimeout(() => setIsSubmitting(false), 1200);
  };

  return (
    <div className="auth-page auth-email-sent-page">
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
              <h1>{content.title}</h1>
              <p className="auth-card-copy">{content.description}</p>
            </div>

            <div className="auth-actions">
              <div className="auth-feedback auth-feedback-soft auth-feedback-center auth-email-sent-note" role="status" aria-live="polite">
                {content.note}
              </div>

              <div className="auth-form auth-email-sent-actions">
                <button type="button" className="btn btn-primary auth-submit-btn" onClick={handleResend} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="auth-spinner" aria-hidden="true" />
                      <span>Mengirim ulang...</span>
                    </>
                  ) : (
                    <>
                      <span>{content.primaryLabel}</span>
                      <Arrow />
                    </>
                  )}
                </button>
              </div>

              <div className="auth-row auth-row-center auth-helper-row">
                <a href={content.secondaryHref} className="auth-inline-link auth-inline-link-arrow">
                  <span className="auth-inline-link-arrow-icon" aria-hidden="true">
                    <Arrow />
                  </span>
                  <span>{content.secondaryLabel}</span>
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
  AUTH_EMAIL_SENT_VARIANTS,
  AuthEmailSentPage
});
