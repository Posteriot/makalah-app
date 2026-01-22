---
name: performance-optimizer
description: "Optimasi performance frontend dan data fetch di makalahapp: profiling, bundle size, render hot path, dan query Convex/Next.js. Gunakan saat user minta speed-up, audit performance, atau perbaikan bottleneck."
---

# Performance Optimizer

## Overview

Lo audit performa end-to-end, temukan bottleneck, lalu kasih rekomendasi/perbaikan yang aman dan terukur.

## Workflow

1. Kumpulin konteks
   - Baca area UI yang lambat dan data fetch terkait.
   - Baca seluruh dokumentasi di `.references`.
2. Profiling & observasi
   - Identifikasi render hot path dan rerender berulang.
   - Cek ukuran bundle dan asset berat.
3. Optimasi render
   - Kurangi rerender, memoize bila perlu.
   - Kurangi komponen client jika bisa server.
4. Optimasi data fetch
   - Kurangi query berulang, batching, dan caching.
   - Pastikan indeks query Convex sesuai.
5. Validasi hasil
   - Jalankan lint/build/test bila ada perubahan.
   - Catat evidence perbaikan.

## Area fokus wajib

- Bundle size dan asset berat.
- Render hot path di React.
- Data fetch di Convex/Next.js.
- Streaming UI di chat.

## Resources

Gunakan references berikut:

- `references/profiling-checklist.md`
- `references/bundle-optimization.md`
- `references/render-optimization.md`
- `references/data-fetch-optimization.md`
- `references/project-references-index.md`
