# Verification: Naskah Feature Baseline Environment

Tanggal: 2026-04-09
Worktree: `C:\Users\eriks\Desktop\makalahapp\.worktrees\naskah-feature`
Branch: `naskah-feature`

## Tujuan

Memastikan workspace `naskah-feature` memiliki baseline environment yang siap dipakai untuk riset dan implementasi fitur `Naskah`.

## Setup yang berhasil

- Worktree berhasil dibuat dari `main`.
- File konteks berhasil tersedia:
  - `.env.local`
  - `CLAUDE.md`
  - `AGENTS.md`
  - `SCOPE.md`
- Folder lokal `screenshots/` tersedia dan sudah di-ignore oleh `.gitignore`.
- Folder dokumentasi fitur tersedia di `docs/naskah-feature/`.
- `npm ci --no-audit --no-fund` berhasil dijalankan sampai selesai.
- `npm ls --depth=0` berhasil dan dependency tree terbaca clean.

## Catatan environment

- Repo mendeklarasikan engine `node: 20.x`.
- Environment aktif saat verifikasi memakai `Node v24.6.0` dan `npm 11.5.1`.
- Install dependency tetap sukses, tetapi masih memunculkan warning `EBADENGINE`.

## Verifikasi yang dijalankan

### 1. Dependency tree

Command:

```powershell
npm ls --depth=0
```

Status:

- Lolos.

### 2. Guard script setara `check:chat-empty-state:no-fallback`

Guard shell asli memakai `bash scripts/check-chat-empty-state-no-fallback.sh`.
Karena `bash` tidak tersedia normal di PATH Windows session ini, pengecekan dijalankan ulang secara ekuivalen di PowerShell dengan `rg`.

Status:

- Lolos.

### 3. Vitest baseline

Command:

```powershell
npx vitest run
```

Status:

- Tidak clean.
- Hasil: `151` file test lulus, `3` file test gagal.
- Total: `943` test lulus, `6` test gagal.

## Failure baseline yang terdeteksi

### 1. Billing checkout tests timeout

File:
- `__tests__/billing-bpp-payment-config.test.tsx`
- `__tests__/billing-pro-card-ui.test.tsx`

Masalah:
- Dua test timeout pada 5000ms.
- Satu test gagal karena query `QRIS` menemukan multiple matches.

### 2. Reference presentation contract mismatch

File:
- `__tests__/reference-presentation.test.ts`

Masalah:
- Test masih mengharapkan return value sinkron.
- Implementasi yang ter-load mengembalikan `Promise`, sehingga assertion menerima `Promise {}` alih-alih string mode.

## Kesimpulan

Baseline environment `naskah-feature` sudah cukup siap untuk mulai kerja dari sisi workspace, file konteks, dan dependency install.

Namun verifikasi belum sepenuhnya clean karena masih ada failure baseline test di repo, dan environment aktif juga belum mengikuti engine yang direkomendasikan (`Node 20.x`).
