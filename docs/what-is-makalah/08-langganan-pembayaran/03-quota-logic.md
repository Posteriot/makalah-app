# 03. Logika Kuota & Kredit

Dokumen ini menjelaskan dua mekanisme pembatasan penggunaan Makalah AI secara paralel: **kuota token berbasis periode** (untuk Gratis dan Pro) dan **saldo kredit on-demand** (untuk BPP). Seluruh fakta divalidasi dari audit forensik `convex/billing/quotas.ts`, `convex/billing/credits.ts`, `convex/billing/constants.ts`, dan `src/lib/billing/quota-offer-policy.ts`.

---

## 1. Sistem Kredit (Unit Dasar)

Seluruh sistem billing menggunakan **kredit** sebagai unit dasar abstraksi di atas token LLM:

```
1 kredit = 1.000 tokens (TOKENS_PER_CREDIT)
```

Konversi dilakukan dengan ceiling (dibulatkan ke atas):
```typescript
tokensToCredits(tokens) = Math.ceil(tokens / 1_000)
```

**Estimasi biaya aktual** (digunakan untuk `usage.ts` cost tracking):
- Primary model (Gemini 2.5 Flash): Input $0.30/1M, Output $2.50/1M
- Blended average: Rp 22,40 / 1.000 tokens (`TOKEN_PRICE_PER_1K_IDR`)

---

## 2. Kuota Token (Gratis & Pro) — `convex/billing/quotas.ts`

### Tabel `userQuotas`

Setiap user non-BPP memiliki satu record `userQuotas` yang di-reset setiap periode tagihan (billing anniversary). Field kunci:

| Field | Deskripsi |
|-------|-----------|
| `allottedTokens` | Jatah token periode ini (berdasarkan tier) |
| `usedTokens` | Total token terpakai |
| `remainingTokens` | Sisa token (= allotted - used, min 0) |
| `dailyUsedTokens` | Token terpakai hari ini (reset harian) |
| `lastDailyReset` | Timestamp reset harian terakhir |
| `completedPapers` | Jumlah paper selesai (untuk limit paper Gratis) |
| `allottedPapers` | Maks paper per periode |
| `overageTokens` | Token overage (analytics only) |
| `overageCostIDR` | Estimasi biaya overage dalam IDR (analytics only) |
| `periodStart` / `periodEnd` | Batas periode tagihan (billing anniversary) |
| `tier` | Tier user saat kuota diinit |

### Periode Tagihan (Billing Anniversary)

Periode **tidak dimulai dari awal bulan kalender** — melainkan dari tanggal signup user (`user.createdAt`). Fungsi `getPeriodBoundaries()` di `constants.ts`:
- Mengambil hari tanggal signup (misal: signup tanggal 15 → billing anniversary tiap tanggal 15)
- `periodStart` = tanggal 15 bulan berjalan
- `periodEnd` = tanggal 15 bulan berikutnya

### Pre-Flight Check: `checkQuota`

Sebelum setiap operasi AI, sistem menjalankan `checkQuota` untuk memutuskan apakah request diizinkan:

```
checkQuota(userId, estimatedTokens, operationType)
    ↓
1. Admin/superadmin → allowed: true (bypass)
2. Tier "bpp" → cek creditBalance (lihat seksi 3)
3. Cek daily limit
4. Cek monthly limit:
   ├── Token tersisa < estimasi → BLOCKED (kecuali Pro dengan kredit)
   └── Pro dengan kredit BPP → allowed: true (fallback)
5. Cek paper limit (operationType="paper", untuk Gratis)
6. → allowed: true
```

**Respon saat diblokir:**

| Kondisi | `reason` | `action` | Pesan |
|---------|----------|----------|-------|
| Kuota bulanan habis (Gratis) | `monthly_limit` | `upgrade` | "Upgrade ke Pro atau top up credit" |
| Kuota bulanan habis (Pro tanpa kredit) | `monthly_limit` | `topup` | "Top up credit untuk melanjutkan" |
| Kredit tidak cukup (BPP) | `insufficient_credit` | `topup` | "Kredit tidak cukup. Estimasi X, saldo Y" |
| Limit paper bulanan (Gratis) | `paper_limit` | `upgrade` | "Limit paper bulanan tercapai" |
| Limit harian tercapai | `daily_limit` | `wait` | "Reset besok jam 00:00" |

### `deductQuota` — Pemotongan Setelah AI Response

Dipanggil setelah AI response berhasil dikirim. Alur:
1. Bypass untuk admin/superadmin
2. Auto-init kuota jika belum ada atau periode baru
3. Handle daily reset (tanggal berubah → `dailyUsedTokens = 0`)
4. Update `usedTokens`, `remainingTokens`, `dailyUsedTokens`
5. Track `overageTokens` untuk analytics (tidak memblokir)

### `getQuotaStatus` — Status untuk UI

Query untuk menampilkan status kuota di header/banner. Mengembalikan **tiga bentuk berbeda** tergantung tier:

**Admin/Superadmin:**
```typescript
{ tier: "unlimited", unlimited: true, percentageUsed: 0, warningLevel: "none" }
```

**BPP (credit-based):**
```typescript
{
  tier: "bpp", creditBased: true,
  currentCredits, totalCredits, usedCredits,
  warningLevel  // berbasis absolut kredit, bukan persentase
}
```

**Gratis & Pro (token-based):**
```typescript
{
  tier, percentageUsed, percentageRemaining,
  usedTokens, allottedTokens, remainingTokens,
  dailyUsedTokens, dailyLimit,
  completedPapers, allottedPapers,
  periodEnd, warningLevel,
  overageTokens, overageCostIDR   // analytics only
}
```

**Threshold warning untuk Gratis & Pro** (dari `QUOTA_WARNING_THRESHOLDS` — berbasis persentase sisa token):

| Warning Level | Kondisi |
|---------------|---------|
| `"none"` | > 20% remaining |
| `"warning"` | ≤ 20% remaining |
| `"critical"` | ≤ 10% remaining |
| `"blocked"` | 0% remaining |

**Threshold warning untuk BPP** (berbasis jumlah kredit absolut — bukan persentase):

| Warning Level | Kondisi |
|---------------|---------|
| `"none"` | `currentCredits >= 100` kredit |
| `"warning"` | `currentCredits < 100` kredit |
| `"critical"` | `currentCredits < 30` kredit |

---

## 3. Saldo Kredit BPP — `convex/billing/credits.ts`

### Tabel `creditBalances`

Satu record per user BPP di tabel `creditBalances`:

| Field | Deskripsi |
|-------|-----------|
| `totalCredits` | Total kredit yang pernah dimiliki |
| `usedCredits` | Total kredit terpakai |
| `remainingCredits` | Saldo kredit tersedia |
| `totalPurchasedCredits` | Total kredit dibeli (riwayat) |
| `totalSpentCredits` | Total kredit digunakan (riwayat) |
| `lastPurchaseAt` | Waktu pembelian terakhir |
| `lastPurchaseType` | Tipe paket terakhir dibeli |
| `lastPurchaseCredits` | Jumlah kredit terakhir dibeli |

### `addCredits` — Menambah Saldo

Dipanggil dari webhook handler setelah `credit_topup` sukses:
1. Cek `creditBalance` user — buat baru jika belum ada
2. Update `totalCredits`, `remainingCredits`, `totalPurchasedCredits`
3. Jika user masih di tier `"free"` → **otomatis upgrade ke `"bpp"`**

### `deductCredits` — Memotong Saldo

Dipanggil setelah AI response untuk user BPP:
1. Convert `tokensUsed` ke kredit (ceiling)
2. Validasi `remainingCredits >= creditsToDeduct` — throw jika kurang
3. Update `usedCredits`, `remainingCredits`, `totalSpentCredits`
4. Jika ada `sessionId` → update `paperSession.creditUsed`, `creditRemaining`, set `isSoftBlocked` jika kredit sesi habis

**Soft Block per Sesi**: Setiap paper session BPP memiliki jatah `creditAllotted` (default: 300 kredit = 1 paper). Ketika `creditRemaining ≤ 0`, sesi di-`isSoftBlocked = true` — ini bukan hard stop, tapi sinyal kepada Harness bahwa paper ini sudah melewati batas kredit yang dialokasikan.

### `getCreditHistory` — Riwayat Transaksi Kredit

Menggabungkan dua sumber data:
- **Purchases**: dari tabel `payments` (filter `credit_topup` + `SUCCEEDED`)
- **Usage**: dari tabel `usageEvents` (operasi AI yang mengonsumsi kredit)
- Diurutkan berdasarkan waktu terbaru, default 30 (caller-settable via `limit` arg)

---

## 4. Penawaran Upgrade/Top-up (`src/lib/billing/quota-offer-policy.ts`)

Fungsi `resolveQuotaOffer(input)` menentukan pesan dan CTA yang ditampilkan di banner kuota dan error chat, berdasarkan kombinasi tier + visual state + konteks.

### Input

```typescript
{
  tier: "gratis" | "bpp" | "pro",   // tier aktif user
  context: "banner" | "chat_error", // tampil di mana
  visualState: "warning" | "critical" | "depleted",
  quotaReason?: "monthly_limit" | "insufficient_credit" | "paper_limit" | ...
}
```

### Matriks Output

| Context | State | Tier | Pesan | Primary CTA | Secondary CTA |
|---------|-------|------|-------|-------------|---------------|
| `chat_error` | `depleted` | Gratis | "Permintaan ditolak: kuota gratis tidak mencukupi." | Beli Kredit (`/checkout/bpp`) | Upgrade ke Pro (`/checkout/pro`) |
| `banner` | `depleted` | Gratis | "Kuota habis. Pilih beli kredit atau upgrade ke Pro untuk melanjutkan." | Beli Kredit | Upgrade ke Pro |
| `chat_error` | `depleted` | BPP | "Permintaan ditolak: kredit tidak mencukupi." | Beli Kredit (`/checkout/bpp`) | Upgrade ke Pro |
| `banner` | `depleted` | BPP | "Kredit habis. Beli kredit atau upgrade ke Pro untuk melanjutkan." | Beli Kredit | Upgrade ke Pro |
| `chat_error` | `depleted` | Pro | "Permintaan ditolak: kuota/kredit tidak mencukupi." | Beli Kredit (`/checkout/bpp`) | – |
| `banner` | `depleted` | Pro | "Kuota/kredit Pro tidak mencukupi. Beli kredit untuk melanjutkan." | Beli Kredit | – |
| any | `warning`/`critical` | Gratis | "Kuota hampir habis. Lihat opsi paket agar proses tidak terhenti." | Lihat Opsi (`/subscription/overview`) | – |
| any | `warning`/`critical` | BPP/Pro | "Kredit hampir habis. Beli kredit untuk menjaga kelancaran proses." | Beli Kredit (`/checkout/bpp`) | – |

> [!NOTE]
> Hard block reasons (`monthly_limit`, `insufficient_credit`, `paper_limit`) dari `chat_error` context selalu mengoverride visual state menjadi `depleted`, terlepas dari persentase sisa kuota. Ini memastikan pesan yang ditampilkan selalu akurat sesuai kondisi aktual.

---

## 5. Konstanta Operasional (`convex/billing/constants.ts`)

Konstanta-konstanta kunci yang mengatur seluruh sistem billing:

| Konstanta | Nilai | Deskripsi |
|-----------|-------|-----------|
| `TOKENS_PER_CREDIT` | 1.000 | Rate konversi token → kredit |
| `PAPER_CREDITS` | 300 | Kredit soft cap per paper (BPP) |
| `PAPER_TOKENS` | 300.000 | Token equivalent per paper |
| `PAPER_PRICE_IDR` | 80.000 | Harga paket paper |
| `TOKEN_PRICE_PER_1K_IDR` | 22,4 | Harga per 1K token untuk cost tracking |
| `QUOTA_WARNING_THRESHOLDS.warning` | 20% | Threshold peringatan kuning |
| `QUOTA_WARNING_THRESHOLDS.critical` | 10% | Threshold peringatan merah |
| `SUBSCRIPTION_PRICING.pro_monthly.priceIDR` | 200.000 | Harga Pro bulanan |
| `SUBSCRIPTION_PRICING.pro_yearly.priceIDR` | 2.000.000 | Harga Pro tahunan (hemat 2 bulan) |

**Konstanta yang deprecated** (masih ada untuk backward compatibility):
- `TOKENS_PER_IDR = 10` — sistem lama (sebelum kredit)
- `BPP_PAPER_TOKENS_ESTIMATE = 800_000` — estimasi lama
- `TOP_UP_PACKAGES` — paket top-up lama (Rp 25rb/50rb/100rb), tidak dijual lagi
