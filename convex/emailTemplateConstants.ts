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
  payment: [
    "payment_success_bpp",
    "payment_success_pro",
    "payment_failed_bpp",
    "payment_failed_pro",
  ],
  notification: [
    "waitlist_invite",
    "waitlist_admin",
    "technical_report_dev",
    "technical_report_user",
  ],
} as const

export const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  verification: "Dikirim saat user mendaftar untuk memverifikasi alamat email",
  magic_link: "Link login tanpa password, berlaku 5 menit",
  password_reset: "Dikirim saat user meminta reset password",
  two_factor_otp: "Kode OTP 6 digit untuk verifikasi 2FA",
  signup_success: "Konfirmasi pendaftaran berhasil setelah email terverifikasi",
  waitlist_confirmation: "Konfirmasi pendaftaran di waiting list",
  waitlist_invite: "Undangan untuk mendaftar setelah giliran tiba",
  waitlist_admin: "Notifikasi ke admin tentang aktivitas waiting list",
  technical_report_dev: "Laporan teknis dikirim ke developer/support",
  technical_report_user: "Update status laporan teknis ke user",
  payment_success_bpp: "Konfirmasi pembelian kredit BPP berhasil",
  payment_success_pro: "Konfirmasi pembayaran langganan Pro berhasil",
  payment_failed_bpp: "Notifikasi pembelian kredit BPP gagal",
  payment_failed_pro: "Notifikasi pembayaran langganan Pro gagal",
}

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
  payment_success_bpp: "Pembelian Kredit Berhasil",
  payment_success_pro: "Langganan Pro Berhasil",
  payment_failed_bpp: "Pembelian Kredit Gagal",
  payment_failed_pro: "Langganan Pro Gagal",
}
