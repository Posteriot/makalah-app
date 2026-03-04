# TS Typecheck Stale Dev Types Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Hilangkan error pre-existing `TS2307` dari stale `.next/dev/types` dengan workflow typecheck yang deterministic.

**Architecture:** Pisahkan jalur typecheck dari cache dev types. Route/app types tetap dihasilkan lewat `next typegen`, lalu typecheck dijalankan dengan `tsconfig.typecheck.json` yang mengecualikan `.next/dev/types`.

**Tech Stack:** Next.js 16.1.6, TypeScript 5, npm scripts.

---

### Task 1: Baseline Reproduksi Error

**Files:**
- Modify: none

**Step 1: Jalankan reproduksi baseline**

Run: `npm exec -- tsc --noEmit --pretty false`
Expected: Bisa fail dengan `TS2307` jika `.next/dev/types/validator.ts` stale.

**Step 2: Catat bukti path error**

Run: `rg -n "get-started|onboarding" .next/dev/types/validator.ts .next/dev/types/routes.d.ts`
Expected: Ada referensi `/get-started` pada kondisi stale.

**Step 3: Commit (opsional, jika mau simpan baseline log)**

```bash
git status --short
```

### Task 2: Tambah Konfigurasi Typecheck Dedicated

**Files:**
- Create: `tsconfig.typecheck.json`
- Modify: `package.json`

**Step 1: Buat config typecheck khusus**

Buat `tsconfig.typecheck.json` yang extends `tsconfig.json`, tapi override `include`/`exclude` agar `.next/dev/types` tidak ikut typecheck.

**Step 2: Tambah script `typegen`**

Di `package.json`, tambahkan script:
- `"typegen": "node --no-network-family-autoselection node_modules/next/dist/bin/next typegen"`

**Step 3: Tambah script `typecheck`**

Di `package.json`, tambahkan script:
- `"typecheck": "npm run typegen && tsc -p tsconfig.typecheck.json --noEmit --pretty false"`

**Step 4: Commit**

```bash
git add tsconfig.typecheck.json package.json
git commit -m "build: add deterministic typecheck flow excluding stale dev types"
```

### Task 3: Validasi End-to-End

**Files:**
- Modify: none

**Step 1: Jalankan typecheck baru**

Run: `npm run typecheck`
Expected: PASS tanpa error `TS2307` onboarding deleted page.

**Step 2: Jalankan build production**

Run: `npm run build`
Expected: PASS.

**Step 3: Verifikasi tidak ada regressi config**

Run: `git diff -- package.json tsconfig.typecheck.json tsconfig.json`
Expected: Hanya perubahan yang direncanakan.

**Step 4: Commit final validasi (jika perlu terpisah)**

```bash
git add -A
git commit -m "chore: verify typecheck/build after stale dev types mitigation"
```

### Task 4: Dokumentasi Ringkas Operasional

**Files:**
- Modify: `README.md` (opsional minimal)

**Step 1: Tambah perintah typecheck resmi tim**

Tambahkan 1 bagian singkat di README:
- gunakan `npm run typecheck` (bukan `tsc --noEmit` langsung).

**Step 2: Jalankan sanity check cepat**

Run: `npm run typecheck`
Expected: PASS.

**Step 3: Commit docs**

```bash
git add README.md
git commit -m "docs: standardize typecheck command"
```
