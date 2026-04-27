# Kategori 08: Langganan & Pembayaran

Kategori ini mendokumentasikan seluruh lapisan sistem monetisasi Makalah AI: dari definisi paket harga, integrasi payment gateway Xendit, manajemen siklus hidup langganan, hingga mekanisme pemotongan kuota dan kontrol admin. Seluruh konten telah divalidasi melalui audit forensik terhadap codebase produksi.

## Daftar Dokumen

1. **[01-payment-integration.md](./01-payment-integration.md)**
   Arsitektur integrasi Xendit: alur transaksi end-to-end, provider abstraction layer, webhook handler, dan konfigurasi runtime.

2. **[02-subscription-plans.md](./02-subscription-plans.md)**
   Definisi empat tier langganan (Gratis, BPP, Pro, Unlimited), pricing, batasan per tier, dan manajemen siklus hidup subscription.

3. **[03-quota-logic.md](./03-quota-logic.md)**
   Mekanisme kuota token berbasis tier, sistem kredit BPP (1 kredit = 1.000 tokens), pre-flight checks, dan logika penawaran upgrade/top-up.

4. **[04-admin-controls.md](./04-admin-controls.md)**
   Kuasa superadmin dan admin: promote/demote role, update tier manual, soft delete user, dan arsitektur RBAC berbasis hirarki.

---

## Gambaran Sistem

Setiap tier memiliki mekanisme pembatasan yang berbeda — ketiganya tidak ekuivalen dan tidak bisa dikelompokkan sederhana:

### Gratis — Kuota Token Bulanan (Reset Otomatis)
- **Jatah**: 100.000 tokens per periode billing
- **Reset**: Otomatis setiap bulan berdasarkan tanggal anniversary signup (`getPeriodBoundaries(user.createdAt)`)
- **Batas harian**: Tidak ada — user bisa pakai semua 100K token di hari pertama
- **Batas paper**: Maksimal 2 paper per periode
- **Habis**: Diblokir keras (`hardLimit: true`). Aksi yang tersedia: upgrade ke BPP atau Pro
- **Tidak menggunakan** sistem kredit

### BPP — Saldo Kredit (Tidak Ada Reset)
- **Jatah**: Tidak ada batas token bulanan (`monthlyTokens: Infinity`)
- **Reset**: Tidak ada — saldo kredit berkurang terus dan tidak pernah diisi ulang otomatis
- **Unit**: 1 kredit = 1.000 tokens. Pemotongan per operasi AI via `deductCredits(tokensUsed)`
- **Habis**: Diblokir saat `remainingCredits < estimatedCredits`. Aksi: beli kredit lagi (top-up) atau upgrade ke Pro
- **Tidak menggunakan** sistem kuota bulanan (`userQuotas`)

### Pro — Kuota Token Bulanan + Kontrak Subscription
- **Jatah**: 5.000.000 tokens per periode billing
- **Reset**: Direset saat subscription diperpanjang (`initializeQuotaInternal` dipanggil oleh webhook setelah pembayaran renewal sukses)
- **Batas harian**: Tidak ada
- **Batas paper**: Tidak ada
- **Habis**: Tidak langsung diblokir — sistem cek dulu apakah ada saldo kredit BPP. Jika ada kredit → lanjut pakai kredit. Jika tidak ada kredit → diblokir, aksi: top-up kredit
- **Kontrak**: Memiliki `currentPeriodStart` / `currentPeriodEnd` di tabel `subscriptions`. Cron `subscriptionCron` expire otomatis jika renewal tidak datang

---

Ketiga tier dikoordinasikan oleh tiga lapisan infrastruktur:
- **Database Convex** — state (`userQuotas`, `creditBalances`, `subscriptions`, `payments`)
- **Webhook Xendit** — trigger fulfilment setelah pembayaran sukses
- **Cron `subscriptionCron`** — expire otomatis subscription Pro yang melewati `currentPeriodEnd`

---

## File Kode Utama

| File | Fungsi |
|------|--------|
| [`convex/billing/payments.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/payments.ts) | CRUD record pembayaran, idempotency, stats admin |
| [`convex/billing/paymentProviderConfigs.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/paymentProviderConfigs.ts) | Konfigurasi aktif payment provider (metode, VA, expiry) |
| [`src/lib/payment/adapters/xendit.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/payment/adapters/xendit.ts) | Implementasi `PaymentProvider` untuk Xendit |
| [`src/app/api/webhooks/payment/route.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/api/webhooks/payment/route.ts) | Webhook handler (SUCCEEDED / FAILED / EXPIRED) |
| [`convex/pricingPlans.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/pricingPlans.ts) | Query & mutation tabel `pricingPlans` |
| [`convex/billing/subscriptions.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/subscriptions.ts) | Lifecycle subscription Pro (create, renew, cancel, expire) |
| [`convex/billing/quotas.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/quotas.ts) | Manajemen kuota token (init, deduct, check, status) |
| [`convex/billing/credits.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/credits.ts) | Manajemen saldo kredit BPP (add, deduct, history) |
| [`convex/billing/constants.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/constants.ts) | Konstanta tier, pricing, paket kredit, helper functions |
| [`convex/billing/pricingHelpers.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/pricingHelpers.ts) | Query DB → fallback konstanta untuk harga BPP & Pro |
| [`convex/billing/subscriptionCron.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/subscriptionCron.ts) | Cron job expire subscription otomatis |
| [`convex/billing/usage.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/billing/usage.ts) | Pencatatan usage events untuk cost tracking |
| [`src/lib/utils/subscription.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/utils/subscription.ts) | `getEffectiveTier()` — resolusi tier dari role + status |
| [`src/lib/billing/quota-offer-policy.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/billing/quota-offer-policy.ts) | Logika pesan & CTA banner kuota per tier |
| [`convex/adminUserManagement.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/adminUserManagement.ts) | Mutations admin: promote, demote, update tier, soft delete |
| [`convex/permissions.ts`](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/permissions.ts) | RBAC `hasRole()` / `requireRole()` dengan hirarki 3-level |

> [!IMPORTANT]
> Gunakan file **index.md** ini sebagai gerbang navigasi utama. Setiap sub-dok di bawah ini dirancang untuk memberikan konteks mendalam yang bisa dibaca secara independen.
