---
name: security-auditor
description: "Audit keamanan aplikasi makalahapp: auth/permission, data exposure, webhook, dan hardening API. Gunakan saat user minta review keamanan, perbaikan kontrol akses, atau cek kebocoran data."
---

# Security Auditor

## Overview

Lo audit security end-to-end, fokus ke auth, permission, data exposure, webhook, dan API hardening tanpa ngerusak behavior.

## Workflow

1. Kumpulin konteks
   - Baca area auth, API routes, dan Convex functions.
   - Baca seluruh dokumentasi di `.references`.
2. Audit auth & permission
   - Cek Clerk integration, session enforcement, role checks.
   - Validasi server-side guard di route/Convex.
3. Audit data exposure
   - Cek data sensitif bocor ke client/log.
   - Pastikan data di response minimal dan aman.
4. Audit webhook
   - Validasi signature, timestamp, idempotency.
   - Pastikan payload diverifikasi sebelum dipakai.
5. Hardening API
   - Validasi input, rate limit (jika ada), error handling aman.
6. Evidence & rekomendasi
   - Temuan severity tinggi dulu.
   - Rekomendasi fix yang feasible.

## Area fokus wajib

- Auth/permission (Clerk + Convex).
- API routes (Next.js /api).
- Webhook (Clerk/Resend/Xendit bila ada).
- Data exposure (PII, token, secret).

## Resources

Gunakan references berikut:

- `references/security-audit-checklist.md`
- `references/webhook-security.md`
- `references/auth-permission-audit.md`
- `references/data-exposure-audit.md`
- `references/project-references-index.md`
