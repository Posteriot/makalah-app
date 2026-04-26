# 02. Paket Langganan & Lifecycle

Dokumen ini menjelaskan empat tier langganan Makalah AI, pricing yang berlaku, batasan per tier, serta mekanisme siklus hidup subscription Pro. Seluruh fakta divalidasi dari audit forensik `convex/pricingPlans.ts`, `convex/billing/subscriptions.ts`, `convex/billing/constants.ts`, dan `src/lib/utils/subscription.ts`.

---

## 1. Empat Tier Langganan

Makalah AI menggunakan empat tier yang dikonfigurasikan di `convex/billing/constants.ts` (`TIER_LIMITS`) dan diekspos ke marketing page via tabel `pricingPlans` di Convex DB.

### Gratis

| Parameter | Nilai |
|-----------|-------|
| Harga | Rp 0/bulan |
| Token bulanan | 100.000 tokens (≈ 100 kredit) |
| Token harian | Tidak terbatas (habis saat token bulanan habis) |
| Maks paper/bulan | 2 paper |
| Hard limit | ✅ Diblokir saat kuota habis |
| Credit-based | ❌ |

> [!NOTE]
> Tier Gratis memberikan kuota bulanan **tanpa limit harian** — artinya user bisa pakai semua jatah 100K token di hari pertama. Yang membatasi adalah total bulanan, bukan batas per hari.

### BPP (Bayar Per Paper)

| Parameter | Nilai |
|-----------|-------|
| Harga | Rp 80.000 per Paket Paper (300 kredit) |
| Token | Tidak terbatas (dibatasi oleh saldo kredit) |
| Paper/bulan | Tidak terbatas |
| Hard limit | ❌ (batas = saldo kredit) |
| Credit-based | ✅ |

BPP adalah model **pay-as-you-go**: User membeli kredit, setiap operasi AI memotong kredit dari saldo. Tidak ada kuota bulanan — selama ada saldo, user bisa terus menggunakan layanan.

**Paket kredit aktif (satu-satunya paket saat ini):**

| Tipe | Kredit | Token | Harga | Rate per kredit |
|------|--------|-------|-------|-----------------|
| `paper` | 300 kredit | 300.000 tokens | Rp 80.000 | Rp 267/kredit |

### Pro

| Parameter | Nilai |
|-----------|-------|
| Harga | Rp 200.000/bulan (atau Rp 2.000.000/tahun — hemat 2 bulan) |
| Token bulanan | 5.000.000 tokens (estimasi 5-6 paper/bulan) |
| Token harian | Tidak terbatas |
| Paper/bulan | Tidak terbatas |
| Hard limit | ✅ Diblokir saat kuota habis (kecuali ada kredit BPP) |
| Credit-based | ❌ (tapi bisa fallback ke kredit BPP saat quota habis) |

> [!IMPORTANT]
> **Fallback kredit Pro**: Ketika kuota bulanan 5M token habis, sistem **tidak langsung memblokir** — melainkan cek apakah user memiliki saldo kredit BPP. Jika ada kredit, user tetap bisa melanjutkan dengan biaya kredit. Jika tidak ada kredit → diblokir dengan opsi top-up.

### Unlimited

| Parameter | Nilai |
|-----------|-------|
| Harga | – (tidak dijual) |
| Token | Tidak terbatas |
| Hard limit | ❌ |
| Untuk siapa | Admin dan superadmin (ditetapkan otomatis dari role) |

Tier `unlimited` **dapat tersimpan** sebagai `subscriptionStatus` di DB — `promoteToAdmin` secara eksplisit menge-set `subscriptionStatus: "unlimited"` saat user dipromosikan menjadi admin. Namun nilai ini tidak digunakan untuk menentukan akses: `getEffectiveTier()` memutuskan tier dari `role` terlebih dahulu, sebelum membaca `subscriptionStatus`.

---

## 2. Resolusi Tier: `getEffectiveTier()` (`src/lib/utils/subscription.ts`)

Satu-satunya sumber kebenaran untuk menentukan tier aktif user saat runtime adalah fungsi ini:

```typescript
getEffectiveTier(role?: string, subscriptionStatus?: string): EffectiveTier
```

**Prioritas resolusi (berurutan):**
1. Jika `role === "superadmin"` atau `role === "admin"` → return `"unlimited"` *(bypasses DB subscriptionStatus)*
2. Jika `subscriptionStatus === "pro"` → return `"pro"`
3. Jika `subscriptionStatus === "bpp"` → return `"bpp"`
4. Jika `subscriptionStatus === "unlimited"` → return `"unlimited"`
5. Default (termasuk `"free"`, `undefined`, nilai tidak dikenal) → return `"gratis"`

> [!IMPORTANT]
> **Admin selalu `unlimited`** — role mengoverride subscriptionStatus. Ini juga berarti mengubah `subscriptionStatus` admin di DB tidak akan berdampak pada akses mereka. Logika backend (`deductQuota`, `checkQuota`) memiliki bypass terpisah untuk admin/superadmin via `user.role`.

---

## 3. Subscription Plans di Database (`convex/pricingPlans.ts`)

Tabel `pricingPlans` di Convex menyimpan data paket yang ditampilkan di halaman marketing. Admin dapat mengedit beberapa field via `updatePricingPlan`:

| Field yang bisa diedit | Deskripsi |
|----------------------|-----------|
| `name`, `price`, `priceValue` | Label dan harga tampil |
| `unit` | Satuan harga (misal: "/bulan") |
| `tagline`, `teaserDescription` | Teks marketing utama |
| `teaserCreditNote` | Catatan kredit pada teaser |
| `features` | List fitur yang ditampilkan |
| `ctaText`, `ctaHref` | Tombol CTA |
| `isHighlighted` | Badge "Populer" |
| `isDisabled` | Nonaktifkan paket |

**Proteksi paket Gratis**: Perubahan `price`, `priceValue`, dan `isDisabled` pada slug `gratis` selalu diblokir di backend (`throw new Error`). Gratis tidak bisa dinonaktifkan atau diberi harga.

**Harga Pro di DB vs Konstanta**: `subscriptions.ts` menggunakan `resolveSubscriptionPricing()` yang membaca harga dari tabel `pricingPlans` (DB), lalu fallback ke `SUBSCRIPTION_PRICING` di `constants.ts` jika tidak ada data. Ini memungkinkan admin mengubah harga Pro tanpa deploy ulang.

---

## 4. Lifecycle Subscription Pro (`convex/billing/subscriptions.ts`)

Subscription Pro mengikuti siklus hidup dengan status berikut:

```
               [Pembayaran Berhasil]
                       ↓
                    active
                  ↙         ↘
      [Cancel at period end]   [Gagal bayar perpanjangan]
            ↓                           ↓
        active*              →       past_due
    (cancelAtPeriodEnd=true)           ↓
            ↓                 [Bayar berhasil]
      [Periode berakhir]              ↓
            ↓                      active
         expired
            ↓
    [Smart downgrade]           [Cancel Immediate]
    (bpp/free)                  (cancelAtPeriodEnd=false)
                                        ↓
                                    canceled  ←─ Smart downgrade
                                  (bpp/free)     langsung
```

> [!NOTE]
> Ada dua jalur cancel yang berbeda:
> - `cancelAtPeriodEnd=true` (default): subscription tetap `active` hingga periode berakhir, lalu `expired` + smart downgrade
> - `cancelAtPeriodEnd=false`: subscription langsung ke status **`canceled`** dan smart downgrade dieksekusi **saat itu juga**

### Fungsi-Fungsi Kunci

| Fungsi | Dipanggil Oleh | Deskripsi |
|--------|----------------|-----------|
| `createSubscription` | Frontend (auth) | Buat subscription baru + set user ke `pro` |
| `createSubscriptionInternal` | Webhook handler | Buat subscription tanpa auth (butuh `CONVEX_INTERNAL_KEY`) |
| `renewSubscription` | Frontend (auth) | Perpanjang periode subscription |
| `renewSubscriptionInternal` | Webhook handler | Perpanjang tanpa auth |
| `cancelSubscription` | Frontend (auth) | Cancel: bisa immediate atau di akhir periode |
| `expireSubscription` | Cron / Webhook | Expire subscription + smart downgrade user |
| `markPastDue` | Webhook | Tandai gagal bayar perpanjangan |
| `reactivateSubscription` | Webhook | Reaktivasi setelah past_due |
| `getActiveSubscription` | Frontend | Ambil subscription aktif user |
| `checkSubscriptionStatus` | Frontend | Status detail + `daysRemaining` + `isPendingCancel` |

### Smart Downgrade

Saat subscription expire (baik via `cancelSubscription` immediate maupun `expireSubscription`):
1. Cek `creditBalances` user — apakah ada `remainingCredits > 0`?
2. Jika **ada kredit** → downgrade ke `"bpp"` (user tetap bisa pakai kredit yang tersisa)
3. Jika **tidak ada kredit** → downgrade ke `"free"`

Ini memastikan user tidak kehilangan kredit yang sudah dibeli hanya karena langganan Pro berakhir.

---

## 5. Cron Expiry Otomatis (`convex/billing/subscriptionCron.ts`)

Fungsi `checkExpiredSubscriptions` (internal mutation) berjalan terjadwal untuk menangani subscription yang melewati `currentPeriodEnd` tanpa pembayaran perpanjangan:

```
Query: subscriptions WHERE status="active" AND currentPeriodEnd < now
For each:
  1. Cek creditBalances user
  2. patch subscription.status = "expired"
  3. patch user.subscriptionStatus = "bpp" | "free" (smart downgrade)
```

Cron ini adalah **safety net** — dalam kondisi normal, expire seharusnya terpicu dari webhook Xendit saat `payment_renewal` gagal atau tidak datang.
