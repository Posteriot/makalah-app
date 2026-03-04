# TS Typecheck Stale Dev Types Design

**Masalah**
`tsc --noEmit` bisa gagal dengan `TS2307` karena file stale di `.next/dev/types/validator.ts` masih mereferensikan route onboarding yang sudah dihapus (`/get-started`).

**Akar Teknis**
- Route dihapus pada commit `d0a1367`.
- `tsconfig.json` masih meng-include `.next/dev/types/**/*.ts`.
- Saat `tsc` dijalankan langsung, file stale dev types ikut dibaca.
- `next build` lolos karena Next.js mem-filter dev types stale di build mode.

## Pendekatan

### Opsi 1: Bersihkan `.next/dev/types` sebelum typecheck
- Contoh: `rm -rf .next/dev/types && tsc --noEmit`.
- Kelebihan: paling cepat.
- Kekurangan: rapuh, bergantung cleanup cache, mudah balik rusak.

### Opsi 2: Hapus `.next/dev/types/**/*.ts` dari `tsconfig.json`
- Kelebihan: simple.
- Kekurangan: Next.js bisa menulis ulang include ini saat sinkronisasi config; berpotensi churn.

### Opsi 3 (Rekomendasi Terbaik): Jalur typecheck dedicated
- Buat `tsconfig.typecheck.json` untuk CI/manual typecheck.
- Jalankan `next typegen` dulu, lalu `tsc -p tsconfig.typecheck.json`.
- Exclude `.next/dev/types` dari jalur typecheck.
- Kelebihan: stabil, deterministic, tidak tergantung cache dev.
- Kekurangan: tambah satu file config dan satu script npm.

## Desain yang Dipilih
Pakai **Opsi 3**.

**Perubahan**
1. Tambah file `tsconfig.typecheck.json` (extends `tsconfig.json`) dengan include/exclude untuk typecheck yang aman.
2. Tambah script npm:
- `typegen`: generate route/app types dari Next.
- `typecheck`: `npm run typegen && tsc -p tsconfig.typecheck.json --noEmit --pretty false`.
3. Validasi:
- `npm run typecheck` harus pass.
- `npm run build` harus tetap pass.

**Dampak**
- Developer tetap bebas pakai `npm run dev`.
- Workflow typecheck tidak lagi pecah karena stale onboarding route di `.next/dev/types`.
