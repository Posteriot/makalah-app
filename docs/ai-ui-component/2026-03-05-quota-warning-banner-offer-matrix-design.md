# Quota Warning Banner Offer Matrix Design (Chat -> Checkout -> Billing)

**Tanggal:** 2026-03-05  
**Status:** Approved by user  
**Worktree:** `ai-ui-chat-restyling`

## 1. Tujuan

Menyatukan perilaku CTA quota/kredit di area chat agar:

1. Tepat per tier (`gratis`, `bpp`, `pro`).
2. Konsisten antara UI preventif (`QuotaWarningBanner`) dan UI reaktif (`error overlay` saat 402 `quota_exceeded`).
3. Langsung mengarah ke route checkout yang benar-benar executable sampai billing (`/checkout/bpp` atau `/checkout/pro`).
4. Tidak lagi mengandalkan hardcode CTA terpisah di beberapa komponen.

## 2. Scope

### In-Scope

1. Kontrak offer tunggal (policy resolver) untuk message + CTA quota.
2. Integrasi policy ke `QuotaWarningBanner`.
3. Integrasi policy ke quota error overlay di `ChatWindow`.
4. Standardisasi route canonical CTA quota.
5. Test coverage untuk matrix offer + route canonical.

### Out-of-Scope

1. Mengubah core enforcement billing (`checkQuota`, `deductCredits`, webhook payment).
2. Mengubah paket harga/konstanta kredit.
3. Mengubah desain visual besar di luar komponen quota-related.

## 3. Kondisi Existing (Terverifikasi)

1. `QuotaWarningBanner` masih single-CTA dan hardcode per branch, termasuk branch `gratis || pro` yang digabung.
2. `QuotaWarningBanner` masih punya mode `preview`.
3. `ChatWindow` sudah membedakan overlay quota (`quota_exceeded`) vs error generic, tetapi CTA quota overlay masih hardcode (`router.push("/subscription/plans")`).
4. Untuk top up kredit, route aktif saat ini adalah `"/checkout/bpp"` (route `"/subscription/topup"` hanya redirect).
5. Checkout `bpp` juga dipakai user `pro` untuk top up kredit (copy halaman sudah tier-aware).
6. Halaman `"/subscription/plans"` me-redirect user `gratis` dan `bpp` ke `"/subscription/overview"`, jadi tidak cocok jadi canonical CTA quota chat.

## 4. Keputusan Desain yang Disetujui

## 4.1 Pendekatan

Dipilih **contract-driven quota offer policy** (single source of truth), bukan patch hardcode per komponen.

## 4.2 Canonical Route

1. **Beli Kredit (termasuk tier Pro):** `/checkout/bpp`
2. **Upgrade ke Pro:** `/checkout/pro`
3. **Overview fallback (non-depleted tertentu):** `/subscription/overview`

## 4.3 Matrix CTA Final

### Status `depleted`

1. `gratis`
- Primary: `Beli Kredit` -> `/checkout/bpp`
- Secondary: `Upgrade ke Pro` -> `/checkout/pro`

2. `bpp`
- Primary: `Beli Kredit` -> `/checkout/bpp`
- Secondary: `Upgrade ke Pro` -> `/checkout/pro`

3. `pro`
- Primary: `Beli Kredit` -> `/checkout/bpp`
- Secondary: none

### Status `warning` / `critical`

1. `gratis`
- Primary: `Lihat Opsi` -> `/subscription/overview`

2. `bpp`
- Primary: `Beli Kredit` -> `/checkout/bpp`

3. `pro`
- Primary: `Beli Kredit` -> `/checkout/bpp`

## 4.4 Rule Reason Override (khusus `chat_error`)

Untuk 402 `quota_exceeded`, jika `reason` termasuk `monthly_limit`, `insufficient_credit`, atau `paper_limit`, maka policy dipaksa ke mode `depleted` agar CTA selalu langsung bisa dieksekusi.

## 5. Arsitektur

## 5.1 Modul Sumber Tunggal

Buat modul policy resolver terpusat:

- `src/lib/billing/quota-offer-policy.ts`

Kontrak utama:

1. Input:
- tier efektif
- context (`banner` | `chat_error`)
- visual state (`warning` | `critical` | `depleted`)
- quota reason (opsional)

2. Output:
- `message`
- `primaryCta` (`label`, `href`)
- `secondaryCta` (opsional)
- `tone` (untuk mapping visual jika perlu)

## 5.2 Konsumen Policy

1. `src/components/chat/QuotaWarningBanner.tsx`
- Tidak boleh hardcode CTA/message lagi.
- Hanya menentukan state kuota (warning/critical/depleted), lalu resolve via policy.

2. `src/components/chat/ChatWindow.tsx`
- Saat quota error overlay 402, parse payload error.
- Resolve via policy dengan context `chat_error`.
- Render tombol berdasarkan output policy (1 atau 2 CTA).

## 5.3 Data Flow End-to-End

1. User kirim pesan chat.
2. API `/api/chat` menjalankan `checkQuotaBeforeOperation`.
3. Jika tidak allowed, API mengembalikan 402 dengan `error: "quota_exceeded"` + `reason` + `action`.
4. Frontend (`useChat`) menerima error.
5. `ChatWindow` mendeteksi quota error, render overlay berdasarkan policy resolver.
6. User klik CTA:
- `Beli Kredit` -> `/checkout/bpp`
- `Upgrade ke Pro` -> `/checkout/pro`
7. Checkout memanggil API payment:
- top up -> `/api/payments/topup` -> `paymentType: "credit_topup"`
- subscribe pro -> `/api/payments/subscribe` -> `paymentType: "subscription_initial"`
8. Webhook payment update status + aktivasi credit/subscription.

## 6. Error Handling

1. Jika payload quota error gagal diparse, fallback policy tetap aman:
- `gratis` -> `/subscription/overview`
- `bpp/pro` -> `/checkout/bpp`

2. Jika tier tidak terdeteksi, fallback ke `gratis` behavior.

3. Jika route tidak valid (harusnya tidak terjadi), fallback ke `/subscription/overview`.

## 7. Testing Strategy

1. Unit test policy resolver (matrix lengkap tier x state x reason).
2. Component test `QuotaWarningBanner` untuk validasi CTA rendering.
3. Test helper quota error parsing + mapping CTA pada `ChatWindow`.
4. Regression assertion: flow quota chat tidak kembali ke `/subscription/plans`.

## 8. Risiko dan Mitigasi

1. **Risiko drift UI antar komponen**
- Mitigasi: satu policy module, larang hardcode CTA/message di konsumen.

2. **Risiko regress route**
- Mitigasi: test explicit untuk canonical route (`pro` topup harus `/checkout/bpp`).

3. **Risiko preview mode mengganggu produksi**
- Mitigasi: final task wajib menonaktifkan force preview untuk flow quota terkait.

## 9. Kriteria Sukses

1. Matrix CTA sesuai keputusan user berjalan di banner dan error overlay.
2. Semua CTA quota mengarah ke flow checkout executable.
3. Tier Pro topup selalu ke `/checkout/bpp`.
4. Test policy + integration-level UI pass.
5. Tidak ada hardcode CTA quota terpisah di komponen chat.

## 10. Audit Pra-Eksekusi (Checklist)

1. Route canonical diverifikasi dari codebase worktree: OK.
2. Flow payment topup Pro via `/checkout/bpp` + `/api/payments/topup`: OK.
3. Redirect behavior `/subscription/topup` ke `/checkout/bpp`: OK.
4. Potensi mismatch `subscription/plans` untuk gratis/bpp: terdeteksi dan ditangani di desain.
5. Scope tidak menyentuh billing core enforcement: OK.
