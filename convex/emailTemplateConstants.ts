// Shared constants for email templates.
// Separated from emailTemplates.ts so browser code can import without
// pulling in Convex server functions (query/mutation).

export const TEMPLATE_GROUPS = {
  auth: [
    "verification",
    "magic_link",
    "password_reset",
    "two_factor_otp",
    "signup_success",
    "waitlist_confirmation",
  ],
  payment: ["payment_success", "payment_failed"],
  notification: [
    "waitlist_invite",
    "waitlist_admin",
    "technical_report_dev",
    "technical_report_user",
  ],
} as const

export const TEMPLATE_LABELS: Record<string, string> = {
  verification: "Verifikasi Email",
  magic_link: "Magic Link",
  password_reset: "Reset Password",
  two_factor_otp: "Kode 2FA",
  signup_success: "Pendaftaran Berhasil",
  waitlist_confirmation: "Konfirmasi Waitlist",
  waitlist_invite: "Undangan Waitlist",
  waitlist_admin: "Notifikasi Admin Waitlist",
  technical_report_dev: "Laporan Teknis (Developer)",
  technical_report_user: "Laporan Teknis (User)",
  payment_success: "Pembayaran Berhasil",
  payment_failed: "Pembayaran Gagal",
}
