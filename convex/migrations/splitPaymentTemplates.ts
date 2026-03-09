import { internalMutationGeneric } from "convex/server"

/**
 * Migration: Split payment templates by tier (BPP vs Pro)
 *
 * Run with: npx convex run migrations/splitPaymentTemplates:splitPaymentTemplates
 *
 * Replaces 2 generic templates (payment_success, payment_failed)
 * with 4 tier-specific templates:
 *   - payment_success_bpp, payment_success_pro
 *   - payment_failed_bpp, payment_failed_pro
 */
export const splitPaymentTemplates = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    console.log("[Migration] Starting splitPaymentTemplates...")

    // Find first superadmin for updatedBy
    const superadmin = await db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "superadmin"))
      .first()

    if (!superadmin) {
      throw new Error("No superadmin found")
    }

    const now = Date.now()

    // Delete old generic templates
    const allTemplates = await db.query("emailTemplates").collect()
    const oldSuccess = allTemplates.find((t) => t.templateType === "payment_success")
    const oldFailed = allTemplates.find((t) => t.templateType === "payment_failed")

    if (oldSuccess) {
      await db.delete(oldSuccess._id)
      console.log("[Migration] Deleted old payment_success template")
    }
    if (oldFailed) {
      await db.delete(oldFailed._id)
      console.log("[Migration] Deleted old payment_failed template")
    }

    // Check if new templates already exist
    const existingBppSuccess = allTemplates.find((t) => t.templateType === "payment_success_bpp")
    if (existingBppSuccess) {
      console.log("[Migration] Split templates already exist, skipping")
      return { success: false, message: "Split templates already exist" }
    }

    // Insert 4 new tier-specific templates
    const templates = [
      {
        templateType: "payment_success_bpp",
        subject: "Pembelian Kredit Berhasil \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Pembelian Kredit Berhasil!" },
          { id: "s2", type: "paragraph", content: "Halo {{userName}}," },
          { id: "s3", type: "paragraph", content: "Terima kasih! Pembelian kredit Anda telah berhasil diproses." },
          {
            id: "s4",
            type: "detail_row",
            rows: [
              { label: "Total Pembayaran", value: "{{amount}}" },
              { label: "Kredit Dibeli", value: "{{credits}}" },
              { label: "Total Kredit Anda", value: "{{newTotalCredits}}" },
              { label: "ID Transaksi", value: "{{transactionId}}" },
              { label: "Waktu Pembayaran", value: "{{paidAt}}" },
            ],
          },
          { id: "s5", type: "divider" },
          { id: "s6", type: "info_box", content: "Kredit yang Anda beli tidak memiliki masa kadaluarsa dan dapat digunakan kapan saja." },
          { id: "s7", type: "paragraph", content: "Kredit Anda sudah siap digunakan. Mulai menyusun paper akademik dengan bantuan AI sekarang!" },
          { id: "s8", type: "button", label: "Mulai Menyusun Paper", url: "{{appUrl}}/chat" },
          { id: "s9", type: "divider" },
          { id: "s10", type: "paragraph", content: "Jika ada pertanyaan tentang transaksi ini, hubungi kami di dukungan@makalah.ai dengan menyertakan ID transaksi." },
        ],
        availablePlaceholders: [
          { key: "userName", description: "Nama user", example: "Erik" },
          { key: "amount", description: "Jumlah pembayaran", example: "Rp 80.000" },
          { key: "credits", description: "Kredit dibeli", example: "300 kredit" },
          { key: "newTotalCredits", description: "Total kredit setelah pembelian", example: "500 kredit" },
          { key: "transactionId", description: "ID transaksi", example: "TXN-20260310-001" },
          { key: "paidAt", description: "Waktu pembayaran", example: "10 Mar 2026, 10:00" },
          { key: "appUrl", description: "URL aplikasi", example: "https://makalah.ai" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },
      {
        templateType: "payment_success_pro",
        subject: "Langganan Pro Berhasil \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Langganan Pro Aktif!" },
          { id: "s2", type: "paragraph", content: "Halo {{userName}}," },
          { id: "s3", type: "paragraph", content: "Terima kasih! Pembayaran langganan {{subscriptionPlanLabel}} Anda telah berhasil." },
          {
            id: "s4",
            type: "detail_row",
            rows: [
              { label: "Paket Langganan", value: "{{subscriptionPlanLabel}}" },
              { label: "Total Pembayaran", value: "{{amount}}" },
              { label: "ID Transaksi", value: "{{transactionId}}" },
              { label: "Waktu Pembayaran", value: "{{paidAt}}" },
            ],
          },
          { id: "s5", type: "divider" },
          { id: "s6", type: "info_box", content: "Langganan Pro memberikan kuota 5.000 kredit per bulan yang di-reset setiap periode billing. Kuota yang tidak terpakai tidak diakumulasi ke bulan berikutnya." },
          { id: "s7", type: "paragraph", content: "Nikmati semua fitur premium sekarang! Mulai menyusun paper akademik tanpa batas." },
          { id: "s8", type: "button", label: "Mulai Menggunakan Pro", url: "{{appUrl}}/chat" },
          { id: "s9", type: "divider" },
          { id: "s10", type: "paragraph", content: "Jika ada pertanyaan tentang transaksi ini, hubungi kami di dukungan@makalah.ai dengan menyertakan ID transaksi." },
        ],
        availablePlaceholders: [
          { key: "userName", description: "Nama user", example: "Erik" },
          { key: "amount", description: "Jumlah pembayaran", example: "Rp 200.000" },
          { key: "subscriptionPlanLabel", description: "Label paket langganan", example: "Pro Bulanan" },
          { key: "transactionId", description: "ID transaksi", example: "TXN-20260310-001" },
          { key: "paidAt", description: "Waktu pembayaran", example: "10 Mar 2026, 10:00" },
          { key: "appUrl", description: "URL aplikasi", example: "https://makalah.ai" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },
      {
        templateType: "payment_failed_bpp",
        subject: "Pembelian Kredit Gagal \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Pembelian Kredit Gagal" },
          { id: "s2", type: "paragraph", content: "Halo {{userName}}," },
          { id: "s3", type: "paragraph", content: "Mohon maaf, pembelian kredit Anda tidak dapat diproses." },
          {
            id: "s4",
            type: "detail_row",
            rows: [
              { label: "Jumlah", value: "{{amount}}" },
              { label: "Alasan Gagal", value: "{{failureReason}}" },
              { label: "ID Transaksi", value: "{{transactionId}}" },
            ],
          },
          { id: "s5", type: "divider" },
          { id: "s6", type: "info_box", content: "Pastikan saldo mencukupi dan metode pembayaran masih aktif. Jika menggunakan kartu, periksa tanggal kadaluarsa dan limit transaksi." },
          { id: "s7", type: "paragraph", content: "Anda bisa mencoba kembali dengan metode pembayaran yang berbeda." },
          { id: "s8", type: "button", label: "Coba Lagi", url: "{{appUrl}}/checkout/bpp" },
          { id: "s9", type: "divider" },
          { id: "s10", type: "paragraph", content: "Jika masalah berlanjut, hubungi kami di dukungan@makalah.ai dengan menyertakan ID transaksi di atas." },
        ],
        availablePlaceholders: [
          { key: "userName", description: "Nama user", example: "Erik" },
          { key: "amount", description: "Jumlah pembayaran", example: "Rp 80.000" },
          { key: "failureReason", description: "Alasan gagal", example: "Saldo tidak mencukupi" },
          { key: "transactionId", description: "ID transaksi", example: "TXN-20260310-001" },
          { key: "appUrl", description: "URL aplikasi", example: "https://makalah.ai" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },
      {
        templateType: "payment_failed_pro",
        subject: "Langganan Pro Gagal \u2014 {{appName}}",
        sections: [
          { id: "s1", type: "heading", content: "Pembayaran Langganan Gagal" },
          { id: "s2", type: "paragraph", content: "Halo {{userName}}," },
          { id: "s3", type: "paragraph", content: "Mohon maaf, pembayaran untuk langganan {{subscriptionPlanLabel}} tidak dapat diproses." },
          {
            id: "s4",
            type: "detail_row",
            rows: [
              { label: "Paket", value: "{{subscriptionPlanLabel}}" },
              { label: "Jumlah", value: "{{amount}}" },
              { label: "Alasan Gagal", value: "{{failureReason}}" },
              { label: "ID Transaksi", value: "{{transactionId}}" },
            ],
          },
          { id: "s5", type: "divider" },
          { id: "s6", type: "info_box", content: "Pastikan saldo mencukupi dan metode pembayaran masih aktif. Langganan Pro tidak akan aktif sampai pembayaran berhasil." },
          { id: "s7", type: "paragraph", content: "Anda bisa mencoba kembali dengan metode pembayaran yang berbeda." },
          { id: "s8", type: "button", label: "Coba Lagi", url: "{{appUrl}}/checkout/pro" },
          { id: "s9", type: "divider" },
          { id: "s10", type: "paragraph", content: "Jika masalah berlanjut, hubungi kami di dukungan@makalah.ai dengan menyertakan ID transaksi di atas." },
        ],
        availablePlaceholders: [
          { key: "userName", description: "Nama user", example: "Erik" },
          { key: "amount", description: "Jumlah pembayaran", example: "Rp 200.000" },
          { key: "subscriptionPlanLabel", description: "Label paket langganan", example: "Pro Bulanan" },
          { key: "failureReason", description: "Alasan gagal", example: "Saldo tidak mencukupi" },
          { key: "transactionId", description: "ID transaksi", example: "TXN-20260310-001" },
          { key: "appUrl", description: "URL aplikasi", example: "https://makalah.ai" },
          { key: "appName", description: "Nama aplikasi", example: "Makalah AI" },
        ],
      },
    ]

    for (const template of templates) {
      await db.insert("emailTemplates", {
        ...template,
        preRenderedHtml: "",
        isActive: false,
        version: 1,
        updatedBy: superadmin._id,
        updatedAt: now,
      })
      console.log(`[Migration] Created template: ${template.templateType}`)
    }

    console.log("[Migration] splitPaymentTemplates complete!")
    return { success: true, message: "Replaced 2 generic → 4 tier-specific payment templates" }
  },
})
