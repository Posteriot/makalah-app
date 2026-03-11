# Verification Checklist: Post-Migration Smoke Tests

> Jalankan semua test di bawah SETELAH switchover selesai (Phase 3 done).
> Kalau ada yang gagal, refer ke `rollback-plan.md`.

---

## 1. Basic Connectivity

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 1.1 | Convex prod deployment aktif | Buka Convex dashboard → `basic-oriole-337` → Overview | Status "Running", functions deployed |
| 1.2 | Convex prod env vars lengkap | `npx convex env list --prod` | 13 environment variables |
| 1.3 | Vercel deployment sukses | Vercel dashboard → latest deployment | Build status: Ready |
| 1.4 | Vercel build log benar | Cek build log, cari output `npx convex deploy` | Target deployment: `basic-oriole-337` (bukan `wary-ferret-59`) |

---

## 2. Public Pages (No Auth Required)

| # | Test | URL | Expected |
|---|------|-----|----------|
| 2.1 | Homepage loads | `https://www.makalah.ai` | Page renders, hero section tampil |
| 2.2 | CMS images tampil | Homepage hero, features, logo | Gambar tidak broken (404) |
| 2.3 | Pricing page | `https://www.makalah.ai/pricing` | 3 tiers tampil (Gratis, BPP, Pro) |
| 2.4 | About page | `https://www.makalah.ai/about` | Content renders |
| 2.5 | Docs page | `https://www.makalah.ai/docs` | Documentation sections tampil |
| 2.6 | Privacy/Terms | `https://www.makalah.ai/privacy` | Rich text content renders |

> **Kenapa CMS images penting?** Images disimpan di Convex `_storage`. Kalau import `_storage` gagal/incomplete, images akan broken.

---

## 3. Authentication

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 3.1 | Sign-in page loads | `https://www.makalah.ai/sign-in` | Form tampil tanpa error |
| 3.2 | Email/password login | Login dengan akun yang ada | Berhasil masuk, redirect ke dashboard/chat |
| 3.3 | Google OAuth login | Klik "Sign in with Google" | Google consent screen muncul, login berhasil |
| 3.4 | Session persistence | Refresh halaman setelah login | Tetap logged in |
| 3.5 | Sign-out | Klik sign out | Kembali ke sign-in page |
| 3.6 | Magic link (kalau dipakai) | Request magic link | Email terkirim via Resend |

> **CATATAN:** User lama yang sudah login MUNGKIN perlu login ulang karena session cookie mengarah ke `CONVEX_SITE_URL` yang berubah. Ini expected behavior.

> **Kalau Google OAuth gagal:** Cek Google Cloud Console — Authorized redirect URIs harus sudah diupdate ke `basic-oriole-337.convex.site`.

---

## 4. Core Functionality (Auth Required)

Login sebagai admin user (`erik.supit@gmail.com`) untuk test ini.

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 4.1 | Chat landing | `/chat` | Empty state tampil, sidebar loads |
| 4.2 | Existing conversations | Sidebar → klik conversation lama | Messages tampil, history intact |
| 4.3 | New chat message | Kirim pesan baru di chat | AI responds, message tersimpan |
| 4.4 | Web search | Kirim pesan yang trigger web search | Perplexity/Grok search works, citations tampil |
| 4.5 | File upload | Upload file di chat | File uploaded, extraction berjalan |
| 4.6 | Refrasa | Test refrasa feature | Refrasa works, style constitutions loaded |
| 4.7 | Paper session | Mulai paper session baru | Paper workflow aktif, stages tampil |

---

## 5. Admin Panel

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 5.1 | Admin dashboard | `/dashboard` | Dashboard loads, admin tabs visible |
| 5.2 | System prompts | Tab "System Prompts" | Active prompt ada, SystemHealthPanel shows NORMAL |
| 5.3 | AI provider config | Tab AI Providers | Config loaded, provider info tampil |
| 5.4 | User management | Tab Users | User list loaded (~22 users) |
| 5.5 | System alerts | SystemHealthPanel | Tidak ada unresolved critical alerts (kecuali yang baru dari migration) |
| 5.6 | Email templates | Tab "Email Templates" | Template list loaded, brand settings loaded tanpa error |
| 5.7 | Email template preview | Klik salah satu template → Preview | Preview renders dengan brand colors |

---

## 6. CMS Admin

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 6.1 | CMS shell loads | `/cms` | CmsMainOverview tampil |
| 6.2 | Home sections | Klik Home di activity bar | Sections listed with status |
| 6.3 | Edit section | Buka editor salah satu section | Content loaded, images tampil |
| 6.4 | Image upload test | Upload gambar baru di CMS editor | Upload berhasil ke Convex storage |

---

## 7. Billing & Payments

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 7.1 | Quota check | Kirim chat message | Tidak ada 402 error (quota check passes) |
| 7.2 | Usage tracking | Cek `usageEvents` table di Convex dashboard | New events recorded setelah chat |
| 7.3 | Credit balance | Cek `creditBalances` table | Existing balances intact |
| 7.4 | Xendit webhook | Cek Xendit dashboard → Webhook logs | Webhook URL updated, delivery successful (kalau ada transaction) |

> **Untuk full billing test:** Lakukan test topup BPP kecil untuk verifikasi end-to-end payment flow. HATI-HATI: ini transaksi nyata.

---

## 8. Email Delivery

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 8.1 | Email templates loaded | Cek `emailTemplates` table di Convex | Templates ada |
| 8.2 | Email sending | Trigger action yang kirim email (magic link, forgot password) | Email terkirim (cek Resend dashboard) |

---

## 8.5. Scheduled Functions (Cron Jobs)

Buka Convex dashboard → `basic-oriole-337` → Scheduled.

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 8.5.1 | Cron `check-expired-subscriptions` aktif | Cek di Scheduled tab | Terdaftar, next run ~17:05 UTC |
| 8.5.2 | Cron `cleanup-old-ai-telemetry` aktif | Cek di Scheduled tab | Terdaftar, next run ~20:00 UTC |
| 8.5.3 | Tidak ada cron duplikat | Count cron entries | Tepat 2 cron jobs |

> **CATATAN:** Jadwal dalam UTC. 17:05 UTC = 00:05 WIB, 20:00 UTC = 03:00 WIB.

---

## 9. Data Integrity Spot-Checks

Buka Convex dashboard → `basic-oriole-337` → Data.

| # | Table | Check | Expected |
|---|-------|-------|----------|
| 9.1 | `users` | Count | ~22 records |
| 9.2 | `users` | Spot-check admin | `erik.supit@gmail.com` ada, role = superadmin |
| 9.3 | `conversations` | Count | Sama dengan count di dev sebelum migration |
| 9.4 | `messages` | Spot-check | Buka 2-3 conversations, messages intact |
| 9.5 | `systemPrompts` | Active check | Tepat 1 prompt dengan `isActive: true` |
| 9.6 | `aiProviderConfigs` | Active check | Tepat 1 config dengan `isActive: true` |
| 9.7 | `pricingPlans` | Count | >= 3 plans |
| 9.8 | `styleConstitutions` | Count | >= 1 |
| 9.9 | `paperSessions` | Spot-check | Existing sessions intact |
| 9.10 | `_storage` | Count | > 0 (CMS images) |
| 9.11 | `pageContent` | Count | > 0 (CMS sections) |

---

## 10. Local Development Isolation

Test ini verifikasi bahwa local dev TIDAK terganggu oleh migrasi.

| # | Test | Cara verifikasi | Expected |
|---|------|-----------------|----------|
| 10.1 | Local .env.local | Baca file | Masih mengarah ke `wary-ferret-59` |
| 10.2 | `npx convex dev` | Jalankan | Connect ke `wary-ferret-59`, BUKAN `basic-oriole-337` |
| 10.3 | Local data intact | Buka `localhost:3000` | Data tampil normal |
| 10.4 | Local schema push | Push schema change via `npx convex dev` | Tidak mempengaruhi production |

---

## Decision Matrix

| Hasil | Aksi |
|-------|------|
| Semua test PASS | Migrasi sukses. Lanjut monitoring 48 jam. |
| Test 1-2 gagal (minor, fixable) | Fix langsung tanpa rollback. Re-test. |
| Auth gagal (3.x) | Cek Google OAuth config & `CONVEX_SITE_URL`. Likely config issue, fix tanpa rollback. |
| Data missing (9.x) | Cek import log. Mungkin perlu re-import. Evaluasi rollback kalau parah. |
| Core functionality broken (4.x) | Investigate 15 menit max. Kalau tidak fix, ROLLBACK. |
| Multiple critical failures | ROLLBACK segera. Lihat `rollback-plan.md`. |

---

## Sign-Off

Setelah semua test pass:

- [ ] Semua 10 sections verified
- [ ] Screenshot evidence disimpan
- [ ] Monitoring 48 jam dimulai
- [ ] Tim informed bahwa migrasi selesai

**Verified by:** _______________
**Date:** _______________
**Time maintenance window ended:** _______________
