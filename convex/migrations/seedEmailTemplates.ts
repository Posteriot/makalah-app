import { internalMutationGeneric } from "convex/server"

/**
 * Migration: Seed 12 default email templates + brand settings
 *
 * Run with: npx convex run migrations/seedEmailTemplates:seedEmailTemplates
 *
 * Creates brand settings and 12 email templates (all inactive).
 * Templates must be reviewed and activated by admin before use.
 */
export const seedEmailTemplates = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedEmailTemplates...")

    // Check if brand settings already exist
    const existingBrand = await db.query("emailBrandSettings").first()
    if (existingBrand) {
      console.log("[Migration] Email brand settings already exist, skipping seed")
      return {
        success: false,
        message: "Email brand settings already exist, migration skipped",
      }
    }

    // Check if any templates already exist
    const existingTemplate = await db.query("emailTemplates").first()
    if (existingTemplate) {
      console.log("[Migration] Email templates already exist, skipping seed")
      return {
        success: false,
        message: "Email templates already exist, migration skipped",
      }
    }

    // Find first superadmin
    const superadmin = await db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "superadmin"))
      .first()

    if (!superadmin) {
      throw new Error(
        "No superadmin found. Create a superadmin user first before running this migration."
      )
    }

    const now = Date.now()

    // ── Brand Settings ─────────────────────────────────────────
    console.log("[Migration] Creating brand settings...")

    await db.insert("emailBrandSettings", {
      appName: "Makalah AI",
      primaryColor: "#2563eb",
      secondaryColor: "#16a34a",
      backgroundColor: "#f8fafc",
      contentBackgroundColor: "#ffffff",
      textColor: "#1e293b",
      mutedTextColor: "#64748b",
      fontFamily: "Geist, Arial, sans-serif",
      footerText: "\u00a9 2026 Makalah AI. All rights reserved.",
      footerLinks: [
        { label: "Website", url: "https://makalah.ai" },
        { label: "Bantuan", url: "https://makalah.ai/documentation" },
      ],
      updatedBy: superadmin._id,
      updatedAt: now,
    })

    console.log("[Migration] Brand settings created")

    // ── Email Templates ────────────────────────────────────────
    console.log("[Migration] Creating 12 email templates...")

    const templates = [
      // 1. verification
      {
        templateType: "verification",
        subject: "Verifikasi Email \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Verifikasi Email Anda" },
          { id: "s2", type: "paragraph", content: "Klik tombol di bawah untuk verifikasi email Anda:" },
          { id: "s3", type: "button", label: "Verifikasi Email", url: "{{verificationUrl}}" },
        ],
        availablePlaceholders: [
          { key: "userName", description: "Nama user", example: "Erik" },
          { key: "verificationUrl", description: "Link verifikasi", example: "https://makalah.ai/verify?token=example" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },

      // 2. magic_link
      {
        templateType: "magic_link",
        subject: "Masuk ke {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Masuk ke Makalah AI" },
          { id: "s2", type: "paragraph", content: "Klik tombol di bawah untuk masuk ke akun Anda." },
          { id: "s3", type: "button", label: "Masuk Sekarang", url: "{{magicLinkUrl}}" },
          { id: "s4", type: "paragraph", content: "Link ini berlaku selama {{expiryMinutes}} menit." },
        ],
        availablePlaceholders: [
          { key: "email", description: "Email user", example: "erik@example.com" },
          { key: "magicLinkUrl", description: "Link magic login", example: "https://makalah.ai/auth/magic?token=example" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
          { key: "expiryMinutes", description: "Durasi expiry", example: "5" },
        ],
      },

      // 3. password_reset
      {
        templateType: "password_reset",
        subject: "Reset Password \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Reset Password" },
          { id: "s2", type: "paragraph", content: "Klik tombol di bawah untuk reset password Anda:" },
          { id: "s3", type: "button", label: "Reset Password", url: "{{resetUrl}}" },
        ],
        availablePlaceholders: [
          { key: "resetUrl", description: "Link reset password", example: "https://makalah.ai/reset?token=example" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },

      // 4. two_factor_otp
      {
        templateType: "two_factor_otp",
        subject: "Kode Verifikasi 2FA \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Verifikasi 2FA" },
          { id: "s2", type: "paragraph", content: "Masukkan kode berikut untuk menyelesaikan login:" },
          { id: "s3", type: "otp_code", content: "{{otpCode}}" },
          { id: "s4", type: "paragraph", content: "Kode berlaku selama 5 menit. Jangan bagikan kode ini ke siapapun." },
        ],
        availablePlaceholders: [
          { key: "otpCode", description: "Kode OTP 6 digit", example: "123456" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },

      // 5. signup_success
      {
        templateType: "signup_success",
        subject: "Pendaftaran Berhasil \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Pendaftaran Berhasil!" },
          { id: "s2", type: "paragraph", content: "Halo {{userName}}, pendaftaran akun kamu berhasil." },
          { id: "s3", type: "paragraph", content: "Sekarang kamu bisa mulai menyusun paper dengan Makalah AI." },
          { id: "s4", type: "button", label: "Mulai Sekarang", url: "{{loginUrl}}" },
        ],
        availablePlaceholders: [
          { key: "userName", description: "Nama user", example: "Erik" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
          { key: "loginUrl", description: "Link login", example: "https://makalah.ai/chat" },
        ],
      },

      // 6. waitlist_confirmation
      {
        templateType: "waitlist_confirmation",
        subject: "Pendaftaran Waiting List Berhasil - {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Terima Kasih!" },
          { id: "s2", type: "paragraph", content: "Halo {{firstName}}, kamu sudah terdaftar di waiting list Makalah AI." },
          { id: "s3", type: "paragraph", content: "Kami akan mengirimkan undangan segera setelah giliran kamu tiba." },
        ],
        availablePlaceholders: [
          { key: "firstName", description: "Nama depan", example: "Erik" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },

      // 7. waitlist_invite
      {
        templateType: "waitlist_invite",
        subject: "Undangan Bergabung \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Giliran Kamu Sudah Tiba!" },
          { id: "s2", type: "paragraph", content: "Halo {{firstName}}! Klik tombol di bawah untuk mendaftar di Makalah AI. Kamu bisa pilih masuk lewat Google atau daftar dengan email dan password." },
          { id: "s3", type: "button", label: "DAFTAR SEKARANG", url: "{{signupUrl}}" },
          { id: "s4", type: "paragraph", content: "Kalau kamu tidak merasa mendaftar di Makalah AI, abaikan email ini." },
        ],
        availablePlaceholders: [
          { key: "firstName", description: "Nama depan", example: "Erik" },
          { key: "signupUrl", description: "Link pendaftaran", example: "https://makalah.ai/sign-up?invite=example" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },

      // 8. waitlist_admin
      {
        templateType: "waitlist_admin",
        subject: "[Waitlist] {{eventLabel}}: {{entryName}} ({{entryEmail}})",
        sections: [
          { id: "s1", type: "heading", content: "{{eventLabel}}" },
          { id: "s2", type: "paragraph", content: "{{entryName}} ({{entryEmail}})" },
          { id: "s3", type: "info_box", content: "Email notifikasi otomatis dari sistem Makalah AI." },
          { id: "s4", type: "button", label: "BUKA DASHBOARD", url: "https://makalah.ai/dashboard" },
        ],
        availablePlaceholders: [
          { key: "eventLabel", description: "Label event", example: "Pendaftar Baru" },
          { key: "entryEmail", description: "Email pendaftar", example: "user@example.com" },
          { key: "entryName", description: "Nama pendaftar", example: "John Doe" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },

      // 9. technical_report_dev
      {
        templateType: "technical_report_dev",
        subject: "[Technical Report] {{status}} \u2022 {{reportId}}",
        sections: [
          { id: "s1", type: "heading", content: "Technical Report" },
          {
            id: "s2",
            type: "detail_row",
            rows: [
              { label: "Status", value: "{{status}}" },
              { label: "Report ID", value: "{{reportId}}" },
              { label: "User", value: "{{userEmail}}" },
              { label: "Waktu", value: "{{timestamp}}" },
            ],
          },
          { id: "s3", type: "info_box", content: "{{summary}}" },
          { id: "s4", type: "button", label: "Buka Dashboard", url: "{{appUrl}}/dashboard" },
        ],
        availablePlaceholders: [
          { key: "reportId", description: "ID laporan", example: "TR-001" },
          { key: "status", description: "Status laporan", example: "Pending" },
          { key: "userEmail", description: "Email pelapor", example: "user@example.com" },
          { key: "summary", description: "Ringkasan", example: "Error pada fitur chat" },
          { key: "appUrl", description: "URL aplikasi", example: "https://makalah.ai" },
          { key: "timestamp", description: "Waktu laporan", example: "9 Mar 2026, 10:30" },
        ],
      },

      // 10. technical_report_user
      {
        templateType: "technical_report_user",
        subject: "[Technical Report] Status Laporan Kamu: {{status}}",
        sections: [
          { id: "s1", type: "heading", content: "Update Laporan Teknis" },
          { id: "s2", type: "paragraph", content: "Laporan kamu sedang diproses. Berikut pembaruan terakhir:" },
          {
            id: "s3",
            type: "detail_row",
            rows: [
              { label: "Status", value: "{{status}}" },
              { label: "ID Laporan", value: "{{reportId}}" },
              { label: "Waktu", value: "{{timestamp}}" },
            ],
          },
          { id: "s4", type: "paragraph", content: "{{summary}}" },
          { id: "s5", type: "button", label: "Buka Halaman Support", url: "{{appUrl}}/support" },
        ],
        availablePlaceholders: [
          { key: "reportId", description: "ID laporan", example: "TR-001" },
          { key: "status", description: "Status laporan", example: "Proses" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
          { key: "summary", description: "Ringkasan", example: "Laporan sedang ditinjau tim" },
          { key: "appUrl", description: "URL aplikasi", example: "https://makalah.ai" },
          { key: "timestamp", description: "Waktu update", example: "9 Mar 2026, 11:00" },
        ],
      },

      // 11. payment_success
      {
        templateType: "payment_success",
        subject: "Pembayaran Berhasil - {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Pembayaran Berhasil!" },
          { id: "s2", type: "paragraph", content: "Halo {{userName}}, terima kasih! Pembayaran Anda telah berhasil diproses." },
          {
            id: "s3",
            type: "detail_row",
            rows: [
              { label: "Total Pembayaran", value: "{{amount}}" },
              { label: "Kredit/Langganan", value: "{{credits}}" },
              { label: "ID Transaksi", value: "{{transactionId}}" },
              { label: "Waktu", value: "{{paidAt}}" },
            ],
          },
          { id: "s4", type: "button", label: "Mulai Menyusun Paper", url: "{{appUrl}}/chat" },
        ],
        availablePlaceholders: [
          { key: "userName", description: "Nama user", example: "Erik" },
          { key: "amount", description: "Jumlah pembayaran", example: "Rp 80.000" },
          { key: "credits", description: "Kredit dibeli", example: "300 kredit" },
          { key: "newTotalCredits", description: "Total kredit", example: "500 kredit" },
          { key: "subscriptionPlanLabel", description: "Label langganan", example: "Pro Bulanan" },
          { key: "transactionId", description: "ID transaksi", example: "TXN-123" },
          { key: "paidAt", description: "Waktu bayar", example: "9 Mar 2026, 10:00" },
          { key: "appUrl", description: "URL aplikasi", example: "https://makalah.ai" },
        ],
      },

      // 12. payment_failed
      {
        templateType: "payment_failed",
        subject: "Pembayaran Gagal - {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Pembayaran Gagal" },
          { id: "s2", type: "paragraph", content: "Halo {{userName}}, mohon maaf, pembayaran Anda tidak dapat diproses." },
          {
            id: "s3",
            type: "detail_row",
            rows: [
              { label: "Jumlah", value: "{{amount}}" },
              { label: "Alasan Gagal", value: "{{failureReason}}" },
              { label: "ID Transaksi", value: "{{transactionId}}" },
            ],
          },
          { id: "s4", type: "paragraph", content: "Anda bisa mencoba kembali dengan metode pembayaran yang berbeda." },
          { id: "s5", type: "button", label: "Coba Lagi", url: "{{appUrl}}/subscription/plans" },
        ],
        availablePlaceholders: [
          { key: "userName", description: "Nama user", example: "Erik" },
          { key: "amount", description: "Jumlah", example: "Rp 80.000" },
          { key: "failureReason", description: "Alasan gagal", example: "Saldo tidak mencukupi" },
          { key: "transactionId", description: "ID transaksi", example: "TXN-123" },
          { key: "appUrl", description: "URL aplikasi", example: "https://makalah.ai" },
        ],
      },
    ]

    const templateIds: string[] = []

    for (const template of templates) {
      const id = await db.insert("emailTemplates", {
        ...template,
        preRenderedHtml: "",
        isActive: false,
        version: 1,
        updatedBy: superadmin._id,
        updatedAt: now,
      })
      templateIds.push(id)
      console.log(`[Migration] Created template: ${template.templateType}`)
    }

    console.log(`[Migration] Success! Created ${templateIds.length} email templates + brand settings`)

    return {
      success: true,
      templateCount: templateIds.length,
      message: "12 email templates + brand settings created successfully (all templates inactive)",
    }
  },
})
