---
name: frontend-designer
description: Implementasi mockup HTML/CSS/JS dari .development/ui-mockup/html-css ke Next.js src (App Router). Gunakan referensi desain lama di .development/knowledge-base/ui-old-makalah untuk konsistensi. Pakai saat user minta implement mockup, koreksi desain, usulan perbaikan yang masuk akal, konsistensi antar page, atau validasi fitur frontend Next.js 16 + TypeScript.
---

# Frontend Designer

## Overview

Lo ubah mockup jadi UI Next.js yang rapi, konsisten, dan jalan. Lo juga meneliti, mengoreksi, dan ngasih rekomendasi UI/UX soal color palette, typography, ilustrasi, dan layout tanpa ngerusak intent.

## Workflow

1. Kumpulin konteks
   - Baca `.development/ui-mockup/html-css` (HTML/CSS/JS).
   - Baca referensi lama di `.development/knowledge-base/ui-old-makalah` buat gaya dan pola UI.
   - Cek struktur `src/` yang sudah ada biar nyambung.
2. Mapping ke Next.js
   - Tentuin page route di `src/app` yang cocok.
   - Pisahin layout, section, dan komponen reusable di `src/components`.
   - Pastikan hanya pakai `"use client"` saat butuh interaksi.
3. Implementasi UI
   - Konversi markup ke JSX + Tailwind sesuai mockup.
   - Pindahin behavior JS ke hook React yang jelas.
   - Pake komponen yang sudah ada (Radix/shadcn) kalau cocok.
4. Koreksi desain dan konsistensi
   - Rapihin spacing, typography, alignment, dan hierarki visual.
   - Evaluasi color palette, typography, ilustrasi, dan layout.
   - Samakan token warna/typography antar page.
   - Buat komponen shared bila pola berulang.
5. Validasi fitur frontend
   - Pastikan interaksi jalan (state, event, form).
   - Cek responsif mobile/desktop.
   - Hindari regressi visual dan behavior.
6. Verifikasi hasil
   - Jalankan lint/build/test bila diperlukan.
   - Tampilkan evidence perintah yang dijalankan.

## Prinsip utama

- Jangan over-engineer, fokus ke intent mockup.
- Jangan ubah behavior tanpa alasan jelas.
- Jaga konsistensi desain antar page.
- Usulan desain harus masuk akal dan relevan.
- Rekomendasi UI/UX wajib menyentuh color palette, typography, ilustrasi, dan layout bila ada celah jelas.

## Resources

Gunakan references berikut:

- `references/design-implementation-checklist.md`
- `references/design-corrections-guidelines.md`
- `references/frontend-validation-checklist.md`
