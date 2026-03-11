# Rollback Plan: Convex Dev → Prod Migration

> Dokumen ini menjelaskan prosedur rollback kalau migrasi gagal atau production bermasalah setelah switchover.

---

## Prinsip Rollback

Rollback **sederhana** karena dev deployment (`wary-ferret-59`) masih ada dan masih punya data asli. Yang perlu dilakukan hanya mengarahkan Vercel kembali ke dev deployment.

**Rollback bisa dilakukan di phase mana saja.** Semakin awal rollback, semakin sedikit yang perlu dibatalkan.

---

## Skenario 1: Gagal di Phase 1 (Persiapan)

**Situasi:** Env vars gagal di-set, deploy ke prod gagal, atau backup corrupt.

**Aksi:** Tidak perlu rollback. Production masih mengarah ke dev deployment, tidak ada yang berubah. Fix masalahnya dan coba lagi.

---

## Skenario 2: Gagal di Phase 2 (Data Migration)

**Situasi:** Import data ke prod gagal atau data tidak lengkap.

**Aksi:**

1. Hentikan proses migrasi
2. Production masih aman (masih mengarah ke dev deployment)
3. Clear data di prod deployment jika perlu:
   - Buka Convex dashboard → `basic-oriole-337` → Data
   - Atau clear via CLI dan re-import
4. Fix masalah import dan coba lagi

---

## Skenario 3: Gagal di Phase 3 (Switchover) — PALING KRITIS

**Situasi:** Vercel sudah mengarah ke prod tapi production bermasalah (error, auth gagal, data missing, dll).

### Langkah Rollback:

#### Step 1: Revert Vercel environment variables (5 menit)

Buka Vercel Dashboard → Project Settings → Environment Variables → scope **Production**.

Revert semua ke value lama:

| Variable | Revert ke |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://wary-ferret-59.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://wary-ferret-59.convex.site` |
| `CONVEX_DEPLOY_KEY` | (deploy key dev lama) |
| `CONVEX_INTERNAL_KEY` | (internal key dev lama) |
| `CONVEX_DEPLOYMENT` | `dev:wary-ferret-59` (kalau sebelumnya ada) |

> **TIPS:** Screenshot semua old values SEBELUM migrasi supaya rollback cepat.

#### Step 2: Revert external services (5 menit)

**Google Cloud Console:**
1. OAuth Authorized redirect URIs → revert `basic-oriole-337.convex.site` ke `wary-ferret-59.convex.site`
2. Authorized JavaScript origins → sama

**Xendit Dashboard:** Tidak perlu diubah — webhook ada di Vercel domain (`www.makalah.ai/api/webhooks/payment`), bukan Convex domain.

#### Step 3: Trigger Vercel redeploy (5-10 menit)

```bash
vercel --prod
```

Atau: Vercel dashboard → Deployments → Redeploy latest.

#### Step 4: Verifikasi rollback

- [ ] Homepage loads
- [ ] Sign-in works
- [ ] Chat functional
- [ ] Admin dashboard accessible

#### Step 5: Assess data gap

Kalau production sempat berjalan di prod deployment (walau sebentar), mungkin ada data baru yang masuk ke `basic-oriole-337` (user registrations, messages, payments). Data ini **tidak otomatis kembali** ke dev deployment.

Opsi:
- Kalau downtime sangat singkat (<5 menit) dan off-peak, kemungkinan tidak ada data baru → aman
- Kalau ada data baru, export dari prod dan manually reconcile

---

## Skenario 4: Masalah ditemukan setelah Phase 4 (Post-Migration, dalam 48 jam)

**Situasi:** Production sudah jalan di prod deployment beberapa jam/hari, tapi ditemukan masalah serius.

### Pertimbangan sebelum rollback:

1. **Data divergence:** Setelah switchover, data baru (conversations, payments, user registrations) masuk ke prod deployment. Rollback ke dev deployment berarti **kehilangan data baru** ini.

2. **Lebih baik fix forward:** Kalau masalahnya bisa di-fix tanpa rollback (misal: env var typo, Google OAuth config salah), fix langsung di prod deployment.

3. **Rollback hanya jika kritis dan tidak bisa di-fix:** Misal, data corruption, fundamental incompatibility yang butuh waktu lama untuk fix.

### Kalau tetap harus rollback:

#### Step 1: Export data baru dari prod

```bash
npx convex export --prod --include-file-storage --path ./convex-prod-data-$(date +%Y%m%d-%H%M)
```

> Simpan ini untuk data recovery nanti.

#### Step 2: Ikuti langkah rollback Skenario 3 (Step 1-4)

#### Step 3: Data recovery

Data baru yang masuk ke prod deployment (selama production jalan di sana) perlu di-reconcile manual:
- Cek `users` table untuk new registrations
- Cek `conversations` dan `messages` untuk new chats
- Cek `payments` dan `creditBalances` untuk transactions
- Cek `usageEvents` untuk billing accuracy

> Ini proses manual yang complex. Idealnya, jangan sampai ke skenario ini.

---

## Prevention Checklist

Untuk meminimalkan kemungkinan rollback:

- [ ] Phase 1 sudah 100% selesai sebelum masuk maintenance window
- [ ] Data export/import sudah diverifikasi (count per table match)
- [ ] External services sudah diupdate (Google OAuth)
- [ ] Screenshot semua old Vercel env var values sebelum mengubah
- [ ] Vercel deploy key prod sudah di-test (bisa deploy)
- [ ] Ada 2 orang available selama maintenance window (satu execute, satu verify)

---

## Contact / Escalation

Kalau rollback juga gagal:
1. Cek Convex status page: https://status.convex.dev
2. Cek Vercel status page: https://www.vercel-status.com
3. Convex Discord / support untuk deployment-specific issues
