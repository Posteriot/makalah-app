---
name: code-reviewer
description: Review dan refactor codebase makalahapp dengan fokus kualitas, keamanan, dan kesederhanaan. Gunakan saat user minta code review, refactor, cek security pembayaran (termasuk Xendit), atau verifikasi logika paper workflow di halaman Chat pada Next.js 16 + TypeScript + Convex.
---

# Code Reviewer

## Overview

Lakukan review menyeluruh, temukan bug/risiko/security issue, lalu refactor ringan tanpa merusak behavior. Pastikan lint/test/typecheck/build valid dan tampilkan evidence.

## Workflow

1. Tetapkan scope dan file target
   - Baca permintaan user dan area fokus (global header, pembayaran Xendit, paper workflow di Chat).
   - Cari entry point di repo, lalu identifikasi file kritikal yang terlibat.
2. Audit behavior dan risiko
   - Fokus bug, regresi behavior, security, reliability, dan edge case.
   - Catat temuan dengan file path + line.
3. Refactor minimal dan aman
   - Hapus dead code, unused import, console yang mubazir, dan duplikasi.
   - Sederhanakan logika tanpa ubah kontrak API.
4. Validasi dengan evidence
   - Jalankan lint/test/typecheck/build yang relevan.
   - Simpan output ringkas sebagai bukti.
5. Laporan hasil
   - Utamakan temuan (severity tinggi ke rendah).
   - Tampilkan bukti perintah yang dijalankan.

## Fokus area wajib

- Global header (rendering, state, auth/role, responsif).
- Pembayaran Xendit (signature/verification, webhook security, idempotency, secret handling).
- Paper workflow di Chat (state machine/stage, izin edit, invalidation, navigation).

## Resources

Gunakan references berikut saat review:

- `references/review-checklist.md` untuk checklist umum.
- `references/security-checklist.md` untuk pembayaran/Xendit.
- `references/refactor-checklist.md` untuk simplifikasi dan cleanup.
