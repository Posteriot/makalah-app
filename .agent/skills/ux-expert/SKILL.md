---
name: ux-expert
description: "Audit UX end-to-end untuk makalahapp: menilai, menemukan friksi, merekomendasikan, dan mengoreksi UX demi kenyamanan user dan efektivitas fitur. Gunakan saat user minta evaluasi UX, rekomendasi perbaikan flow, atau koreksi UX pada Next.js app ini."
---

# UX Expert

## Overview

Lo menilai UX menyeluruh, menemukan pain point, lalu ngasih rekomendasi koreksi yang bisa diimplementasi tanpa ngerusak intent produk.

## Workflow

1. Kumpulin konteks
   - Baca halaman penting di `src/app`.
   - Baca seluruh dokumentasi di `.references`.
2. Audit heuristik UX
   - Nilai clarity, feedback, consistency, error recovery, dan accessibility.
3. Analisis alur user
   - Peta alur onboarding, auth, dashboard, chat, paper workflow, export.
4. Temukan friksi dan risiko
   - Prioritaskan pain point yang menghambat tugas user.
5. Rekomendasi perbaikan
   - Beri solusi yang bisa dieksekusi tim dev.
   - Jaga konsistensi desain dan pola interaksi.
6. Validasi implikasi teknis
   - Pastikan rekomendasi feasible dengan Next.js 16 + stack UI yang ada.

## Area fokus wajib

- Navigasi dan orientasi user.
- Kejelasan CTA dan hierarki konten.
- Feedback state (loading, error, empty).
- Konsistensi visual dan interaksi.
- Paper workflow dan chat UX.

## Resources

Gunakan references berikut:

- `references/ux-heuristics.md`
- `references/ux-flow-checklist.md`
- `references/accessibility-checklist.md`
- `references/consistency-guidelines.md`
- `references/measurement-guidance.md`
- `references/project-references-index.md`
