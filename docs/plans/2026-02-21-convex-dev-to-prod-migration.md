# Plan: Migrasi Convex Dev → Prod Deployment

> **Status:** DEFERRED — Dikerjakan setelah semua fitur di sprint ini matang dan stabil.
> **Created:** 2026-02-21
> **Priority:** Medium (operational risk, bukan blocker)

---

## Konteks

Production app (`www.makalah.ai`) saat ini terhubung ke Convex **dev deployment** `wary-ferret-59`.
Convex **prod deployment** `basic-oriole-337` ada tapi kosong/tidak terpakai.

### Risiko Saat Ini
- Local `npx convex dev` dan production Vercel **shared deployment** — bisa saling interfere
- Dev deployment punya policy scaling/retention yang berbeda dari prod
- Deploy command membingungkan (`npx convex dev --once` vs `npx convex deploy`)

### Target
- Production Vercel → `prod:basic-oriole-337`
- Local development → `dev:wary-ferret-59` (tetap)
- Pemisahan data dan environment yang proper

---

## Pre-Migration Checklist

- [ ] Pastikan semua fitur aktif sudah stabil (waitlist flow, billing, paper workflow)
- [ ] Tidak ada migration/schema change yang sedang in-progress
- [ ] Backup data dev deployment
- [ ] Maintenance window dijadwalkan (minimal downtime 15-30 menit)

---

## Langkah Migrasi

### Phase 1: Persiapan (sebelum maintenance window)

**1.1 Inventory env vars di dev deployment**
```bash
npx convex env list
# Catat semua env vars yang perlu di-copy ke prod
```

**1.2 Set semua env vars di prod deployment**
```bash
npx convex env set APP_URL "https://www.makalah.ai" --prod
npx convex env set RESEND_API_KEY "..." --prod
npx convex env set BETTER_AUTH_SECRET "..." --prod
# ... semua env vars lainnya
```

**1.3 Deploy schema + functions ke prod**
```bash
npx convex deploy --yes
# Verifikasi: npx convex deploy sudah target basic-oriole-337
```

**1.4 Verifikasi schema match**
Buka Convex dashboard, compare schema dev vs prod — harus identik.

---

### Phase 2: Data Migration (dalam maintenance window)

**2.1 Export data dari dev**
```bash
npx convex export --path ./convex-backup-dev
```

**2.2 Import data ke prod**
```bash
npx convex import --prod ./convex-backup-dev
```

**2.3 Verifikasi data di prod**
- Cek jumlah records per table (users, conversations, messages, waitlistEntries, dll)
- Spot-check beberapa records penting

---

### Phase 3: Switchover

**3.1 Update Vercel environment variables (Production)**

| Variable | Old Value | New Value |
|----------|-----------|-----------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://wary-ferret-59.convex.cloud` | `https://basic-oriole-337.convex.cloud` |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `https://wary-ferret-59.convex.site` | `https://basic-oriole-337.convex.site` |
| `CONVEX_SITE_URL` | `https://wary-ferret-59.convex.site` | `https://basic-oriole-337.convex.site` |

**3.2 Trigger Vercel redeploy**
```bash
vercel --prod
```

**3.3 Smoke test production**
- [ ] Homepage loads
- [ ] Sign-in works
- [ ] Chat loads conversations
- [ ] Admin dashboard accessible
- [ ] Waitlist flow works end-to-end

---

### Phase 4: Post-Migration

**4.1 Update local `.env.local`**
Tidak perlu diubah — local tetap pakai `dev:wary-ferret-59`.

**4.2 Update deploy workflow**
Setelah migrasi, deploy command kembali normal:
- Local dev: `npx convex dev`
- Production deploy: `npx convex deploy --yes`

**4.3 Update CLAUDE.md**
Tambah catatan:
- Production deployment: `basic-oriole-337`
- Dev deployment: `wary-ferret-59`
- Deploy ke prod: `npx convex deploy --yes`
- Deploy ke dev: `npx convex dev --once`

**4.4 Monitoring (48 jam)**
- Pantau Convex dashboard prod untuk errors
- Cek systemAlerts di admin panel
- Pastikan billing/quota tracking berjalan normal

---

## Rollback Plan

Kalau ada masalah setelah switchover:

1. Revert Vercel env vars ke `wary-ferret-59`
2. Trigger redeploy
3. Production kembali ke dev deployment (seperti sekarang)
4. Investigate dan fix masalah sebelum retry

---

## Estimasi

- Persiapan: ~30 menit
- Maintenance window: ~15-30 menit
- Post-migration monitoring: 48 jam

---

## Catatan

- **Jangan pakai Vercel Marketplace integration** — itu bikin project Convex baru, gak bisa adopt existing deployment
- BetterAuth session cookies mungkin perlu di-clear setelah switchover (beda CONVEX_SITE_URL)
- Xendit webhook URL mungkin perlu di-update jika mengarah ke Convex HTTP actions URL
