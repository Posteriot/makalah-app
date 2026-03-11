# Migrasi Convex: Dev Deployment → Production Deployment

> **Status:** READY TO EXECUTE
> **Tanggal plan:** 2026-03-11
> **Estimasi downtime:** 20-40 menit (maintenance window)
> **Rollback:** Lihat `rollback-plan.md`
> **Verifikasi:** Lihat `verification-checklist.md`

---

## Ringkasan

Migrasi production app (`www.makalah.ai`) dari Convex dev deployment ke production deployment.

| | Deployment | URL |
|---|---|---|
| **Dev (tetap untuk local)** | `wary-ferret-59` | `https://wary-ferret-59.convex.cloud` |
| **Prod (target baru)** | `basic-oriole-337` | `https://basic-oriole-337.convex.cloud` |

### Kenapa migrasi ini perlu?

Saat ini production Vercel dan local dev **pakai deployment yang sama** (`wary-ferret-59`). Setiap kali developer jalankan `npx convex dev` dari feature branch, production functions ke-overwrite dan production bisa crash.

### Setelah migrasi:

- **Vercel Production** → `basic-oriole-337` (prod deployment, stabil)
- **Local Development** → `wary-ferret-59` (dev deployment, bebas eksperimen)
- `npx convex dev` tidak akan pernah mengganggu production lagi

---

## Pre-Migration Checklist

- [ ] Tidak ada schema change atau migration yang sedang in-progress
- [ ] Tidak ada fitur kritis yang sedang half-deployed
- [ ] Production deploy key untuk `basic-oriole-337` sudah tersedia (Convex dashboard → Settings → Deploy keys)
- [ ] Jadwalkan maintenance window (idealnya off-peak: malam hari WIB)
- [ ] Komunikasikan downtime ke user aktif jika perlu
- [ ] Baca `rollback-plan.md` supaya siap kalau ada masalah

---

## Phase 1: Persiapan (SEBELUM maintenance window)

Semua langkah di phase ini bisa dilakukan kapan saja tanpa mengganggu production.

### 1.1 Backup data dari dev deployment

```bash
# Dari root project
npx convex export --include-file-storage --path ./convex-backup-dev-$(date +%Y%m%d)
```

> **PENTING:** Flag `--include-file-storage` WAJIB agar file uploads (CMS images, logo, cover images, chat attachments) ikut ter-export. Tanpa flag ini, hanya data tables yang ter-export — file blobs TIDAK ikut.

Verifikasi backup:
```bash
ls -la ./convex-backup-dev-*/
# Harus ada folder dengan files JSON + _storage folder
```

### 1.2 Set environment variables di prod deployment

Buka Convex dashboard → `basic-oriole-337` → Settings → Environment Variables.

Atau via CLI (harus satu-satu, masukkan value dari dev deployment):

```bash
# Gunakan flag --prod untuk target production deployment
npx convex env set APP_URL "https://www.makalah.ai" --prod
npx convex env set BETTER_AUTH_SECRET "<value-dari-dev>" --prod
npx convex env set CONVEX_INTERNAL_KEY "<value-dari-dev>" --prod
npx convex env set GOOGLE_CLIENT_ID "<value-dari-dev>" --prod
npx convex env set GOOGLE_CLIENT_SECRET "<value-dari-dev>" --prod
npx convex env set OPENROUTER_API_KEY "<value-dari-dev>" --prod
npx convex env set RESEND_API_KEY "<value-dari-dev>" --prod
npx convex env set SITE_URL "https://www.makalah.ai" --prod
npx convex env set SUPERADMIN_EMAILS "erik.supit@gmail.com" --prod
npx convex env set VERCEL_AI_GATEWAY_API_KEY "<value-dari-dev>" --prod
npx convex env set XENDIT_SECRET_KEY "<value-dari-dev>" --prod
npx convex env set XENDIT_WEBHOOK_SECRET "<value-dari-dev>" --prod
npx convex env set XENDIT_WEBHOOK_TOKEN "<value-dari-dev>" --prod
```

Verifikasi:
```bash
npx convex env list --prod
# Harus ada 13 environment variables
```

> **CATATAN tentang CONVEX_INTERNAL_KEY:** Ini adalah key yang di-generate per deployment. Prod deployment MUNGKIN butuh key yang berbeda dari dev. Cek di Convex dashboard → `basic-oriole-337` → Settings apakah ada internal key yang berbeda. Kalau ada, pakai yang itu.

### 1.3 Deploy schema + functions ke prod

```bash
npx convex deploy --yes
```

> **PENTING:** Command `npx convex deploy` otomatis menarget production deployment berdasarkan project config. Verifikasi di output CLI bahwa targetnya `basic-oriole-337`, BUKAN `wary-ferret-59`.

Verifikasi di Convex dashboard:
- Buka `basic-oriole-337` → Functions — harus terisi semua functions
- Buka `basic-oriole-337` → Data — schema harus ada (tables kosong, belum ada data)

### 1.4 Catat semua deploy keys yang dibutuhkan

Dari Convex dashboard → `basic-oriole-337` → Settings → Deploy keys:
- **Production deploy key** — untuk `CONVEX_DEPLOY_KEY` di Vercel
- Catat value-nya, akan dipakai di Phase 3

---

## Phase 2: Data Migration (DALAM maintenance window)

> **MULAI MAINTENANCE WINDOW DI SINI**
> Dari titik ini, production app mungkin mengalami gangguan.

### 2.1 Freeze production state

- Pastikan tidak ada user yang sedang aktif (idealnya off-peak)
- Kalau perlu, pasang maintenance page di Vercel

### 2.2 Export data terbaru dari dev deployment

```bash
# Export FRESH data (bukan backup lama dari Phase 1)
npx convex export --include-file-storage --path ./convex-export-final-$(date +%Y%m%d-%H%M)
```

> Kenapa export lagi? Karena mungkin ada data baru sejak Phase 1 (user registrations, conversations, payments).

### 2.3 Import data ke prod deployment

```bash
npx convex import --prod ./convex-export-final-<timestamp>/
```

> **PERINGATAN tentang `_storage`:** Convex export/import TERMASUK file storage. Ini berarti file uploads (CMS images, user uploaded files) akan ter-copy ke prod deployment. Storage IDs akan di-remap otomatis oleh Convex import.

### 2.4 Verifikasi data di prod

Buka Convex dashboard → `basic-oriole-337` → Data:

| Table | Expected Count | Verifikasi |
|---|---|---|
| `users` | ~22 records | Cek email admin ada |
| `conversations` | >0 | Spot-check beberapa |
| `messages` | >0 | Spot-check beberapa |
| `systemPrompts` | >=1 active | Pastikan ada yang `isActive: true` |
| `aiProviderConfigs` | >=1 active | Pastikan ada yang `isActive: true` |
| `styleConstitutions` | >=1 | Refrasa styles |
| `pageContent` | >0 | CMS content |
| `richTextPages` | >0 | Legal pages |
| `siteConfig` | >0 | Header/footer config |
| `emailTemplates` | >0 | Email templates |
| `pricingPlans` | >=3 | Gratis, BPP, Pro |
| `userQuotas` | >0 | User quota records |
| `creditBalances` | >0 | BPP credit balances |
| `_storage` | >0 | CMS uploaded images |

> **KRITIS:** Kalau ada table yang count-nya 0 padahal di dev ada data, STOP dan investigasi sebelum lanjut.

---

## Phase 3: Switchover

### 3.1 Update Vercel environment variables (Production scope)

Buka Vercel Dashboard → Project Settings → Environment Variables.

Update variabel berikut **untuk scope Production saja**:

| Variable | Old Value | New Value |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `https://wary-ferret-59.convex.cloud` | `https://basic-oriole-337.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://wary-ferret-59.convex.site` | `https://basic-oriole-337.convex.site` |
| `CONVEX_DEPLOYMENT` | `dev:wary-ferret-59` (atau value lama) | Hapus atau kosongkan — tidak dipakai kalau `CONVEX_DEPLOY_KEY` ada |
| `CONVEX_DEPLOY_KEY` | (key dev lama) | (production deploy key dari `basic-oriole-337`) |
| `CONVEX_INTERNAL_KEY` | (key dev lama) | (internal key dari `basic-oriole-337` — cek dashboard) |

> **CATATAN tentang `CONVEX_SITE_URL`:** Cek apakah variabel `CONVEX_SITE_URL` (tanpa `NEXT_PUBLIC_` prefix) juga ada di Vercel. Kalau ada, update juga ke `https://basic-oriole-337.convex.site`.

> **CATATAN tentang `CONVEX_DEPLOYMENT`:** Kalau `CONVEX_DEPLOY_KEY` sudah di-set, `CONVEX_DEPLOYMENT` tidak dipakai saat deploy. Tapi kalau masih ada, hapus atau update supaya tidak membingungkan.

### 3.2 Update external services

#### Google Cloud Console (OAuth) — MANUAL ACTION

1. Buka Google Cloud Console → APIs & Services → Credentials
2. Edit OAuth 2.0 Client ID yang dipakai Makalah
3. Di **Authorized redirect URIs**, cari yang mengandung `wary-ferret-59.convex.site`
4. Ganti ke `basic-oriole-337.convex.site` (path sisanya tetap sama)
5. Di **Authorized JavaScript origins**, lakukan hal yang sama
6. Save

> **KRITIS:** Kalau langkah ini terlewat, Google OAuth login akan GAGAL di production.

#### ~~Xendit Dashboard (Webhook)~~ — TIDAK PERLU DIUBAH

> Xendit webhook endpoint ada di **Vercel domain** (`https://www.makalah.ai/api/webhooks/payment`), bukan di Convex domain. Karena domain Vercel tidak berubah, webhook URL Xendit **tetap valid** setelah migrasi Convex. Tidak ada aksi yang diperlukan.

### 3.3 Trigger Vercel redeploy

```bash
# Dari root project, push empty commit atau trigger manual redeploy
# Option A: Vercel CLI
vercel --prod

# Option B: Manual di Vercel dashboard → Deployments → Redeploy latest
```

`vercel.json` punya `buildCommand: "npm run convex -- deploy && npm run build"` — ini akan otomatis deploy functions ke prod karena `CONVEX_DEPLOY_KEY` sudah diupdate.

### 3.4 Tunggu deployment selesai

Monitor di Vercel dashboard. Build harus sukses tanpa error. Perhatikan log `npm run convex -- deploy` — pastikan target deployment-nya `basic-oriole-337`.

---

## Phase 4: Post-Migration

### 4.1 Smoke test production

Jalankan semua test di `verification-checklist.md`. Minimal:

- [ ] Homepage loads (`www.makalah.ai`)
- [ ] Sign-in works (email/password)
- [ ] Google OAuth sign-in works
- [ ] Chat loads dan bisa kirim message
- [ ] Admin dashboard accessible
- [ ] CMS images tampil (cek homepage hero, logo)

### 4.2 Session handling

BetterAuth sessions di browser user lama mungkin invalid karena `CONVEX_SITE_URL` berubah. User akan perlu login ulang — ini expected behavior, bukan bug.

### 4.3 Verifikasi local development tidak terganggu

```bash
# Local dev TETAP pakai wary-ferret-59
# .env.local tidak perlu diubah
npx convex dev
# Pastikan connect ke wary-ferret-59, BUKAN basic-oriole-337
```

### 4.4 Monitoring 48 jam

- [ ] Pantau Convex dashboard `basic-oriole-337` untuk function errors
- [ ] Cek systemAlerts di admin panel (`/dashboard`)
- [ ] Pastikan billing/quota tracking berjalan normal
- [ ] Pantau Xendit webhook delivery (cek Xendit dashboard)
- [ ] Monitor email delivery (Resend dashboard)

### 4.5 Update dokumentasi project

Setelah migrasi berhasil dan stabil (48 jam), update `CLAUDE.md`:

```
### Deployment Strategy
- **Production:** `basic-oriole-337` (Convex prod deployment)
- **Development:** `wary-ferret-59` (Convex dev deployment)
- `npx convex dev` → otomatis ke dev deployment (aman, tidak ganggu prod)
- `npx convex deploy` → otomatis ke prod deployment (hati-hati!)
```

### 4.6 Cleanup (opsional, setelah 2 minggu stabil)

Setelah yakin prod deployment berjalan lancar:
- Dev deployment (`wary-ferret-59`) bisa tetap dipakai untuk local development
- Data lama di dev deployment bisa dibiarkan atau di-clear — tidak ada dampak ke production
- Hapus backup files: `rm -rf ./convex-backup-dev-* ./convex-export-final-*`

---

## Catatan Penting

### Yang TIDAK boleh dilakukan

1. **JANGAN pakai Vercel Marketplace integration** — itu bikin project Convex baru, tidak bisa adopt existing deployment
2. **JANGAN hapus dev deployment** — masih dipakai untuk local development
3. **JANGAN jalankan seed migrations di prod** — data sudah ter-import dari dev, seed akan bikin duplikat
4. **JANGAN update `.env.local`** — local dev tetap pakai `wary-ferret-59`

### Tentang `_storage` (File Storage)

Project ini pakai Convex file storage untuk:
- CMS images (hero, features, logo, cover images)
- User uploaded files (chat attachments)

Convex `export` dan `import` **termasuk** `_storage` table dan file blobs. Storage IDs akan di-remap saat import. Referensi ke `_storage` IDs di table lain (seperti `pageContent.imageId`, `siteConfig.logoStorageId`) akan tetap valid karena Convex import mempertahankan konsistensi referensi.

### Tentang Scheduled Functions / Cron Jobs

Project ini punya **2 cron jobs aktif** (didefinisikan di `convex/crons.ts`):

| Cron Name | Jadwal | Fungsi |
|---|---|---|
| `check-expired-subscriptions` | Setiap hari 00:05 WIB (17:05 UTC) | Cek subscription yang sudah expired |
| `cleanup-old-ai-telemetry` | Setiap hari 03:00 WIB (20:00 UTC) | Hapus telemetry records lama |

Cron jobs **otomatis aktif** setelah `npx convex deploy` ke prod. Verifikasi di Convex dashboard → `basic-oriole-337` → Scheduled:
- Kedua cron harus terdaftar
- Next run time harus sesuai jadwal UTC di atas

> **CATATAN:** Jadwal dalam UTC, bukan WIB. Jangan bingung kalau waktu di dashboard terlihat "salah" — itu UTC.

### Tentang `CONVEX_SITE_URL` (Server-Side)

`CONVEX_SITE_URL` (tanpa prefix `NEXT_PUBLIC_`) dipakai oleh BetterAuth di `convex/auth.ts` untuk `baseURL`. Variable ini **otomatis di-set oleh Convex** saat deployment — tidak perlu di-set manual di Vercel atau Convex dashboard. Yang perlu di-set manual hanya `NEXT_PUBLIC_CONVEX_SITE_URL` (untuk frontend).

### Estimasi Waktu

| Phase | Durasi | Downtime? |
|---|---|---|
| Phase 1: Persiapan | 30-60 menit | Tidak |
| Phase 2: Data Migration | 10-20 menit | Ya |
| Phase 3: Switchover | 10-15 menit | Ya |
| Phase 4: Post-Migration | 48 jam monitoring | Tidak |
| **Total downtime** | **~20-40 menit** | |
