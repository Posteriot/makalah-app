# Inline Create Password + Universal 2FA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan endpoint create-password resmi agar user Google bisa set password inline di Settings, lalu memastikan UI 2FA tampil untuk seluruh tier user.

**Architecture:** Tambah Better Auth custom endpoint `POST /create-password` pada layer auth Convex. Frontend `SecurityTab` memanggil endpoint itu saat `hasPassword=false`. Section 2FA di-render untuk semua user login, dengan guard interaksi jika password belum tersedia.

**Tech Stack:** Next.js 16, React 19, Better Auth (`better-auth/minimal`, plugin endpoint), Convex, Sonner, Vitest + Testing Library.

---

### Task 1: Tambah plugin endpoint auth custom `POST /create-password`

**Files:**
1. Create: `convex/createPasswordEndpoint.ts`
2. Modify: `convex/auth.ts`

**Step 1: Implement plugin endpoint**

Di `convex/createPasswordEndpoint.ts`:
1. Buat plugin Better Auth baru dengan `id` unik.
2. Tambah endpoint `createAuthEndpoint("/create-password", { method: "POST", body: z.object({ newPassword: z.string() }), use: [sensitiveSessionMiddleware] }, handler)`.
3. Handler wajib:
   - validasi sesi aktif.
   - validasi min/max length dari config password Better Auth.
   - cek credential account existing.
   - hash password.
   - `linkAccount` jika belum ada credential.
   - return sukses atau error terstruktur.

**Step 2: Daftarkan plugin di auth utama**

Di `convex/auth.ts`:
1. import plugin dari `./createPasswordEndpoint`.
2. tambahkan ke `plugins` array `createAuthOptions`.

**Step 3: Verify endpoint route tersedia**

Run:
```bash
npm run dev
```
Lalu test:
```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/create-password -H 'content-type: application/json' --data '{"newPassword":"Testing123!"}'
```
Expected:
1. route tidak 404.
2. unauthorized saat tanpa sesi valid.

**Step 4: Commit**

```bash
git add convex/createPasswordEndpoint.ts convex/auth.ts
git commit -m "feat(auth): add registered create-password endpoint for oauth users"
```

---

### Task 2: Integrasi frontend inline create-password di SecurityTab

**Files:**
1. Modify: `src/components/settings/SecurityTab.tsx`

**Step 1: Ubah blok `hasPassword=false` menjadi inline form**

1. Tampilkan field:
   - `Password baru`
   - `Konfirmasi password`
2. Validasi client:
   - wajib isi
   - min 8 karakter
   - konfirmasi harus cocok

**Step 2: Panggil endpoint custom**

1. Buat handler `handleCreatePassword`.
2. Panggil endpoint custom (via auth client proxy/helper).
3. Jika sukses:
   - `setHasPassword(true)`
   - reset input field
   - toast sukses
4. Jika gagal:
   - tampilkan pesan error backend/fallback.

**Step 3: Pastikan flow change-password existing tetap benar**

1. Pertahankan logic cek `{ error }` untuk `changePassword`.
2. Tidak boleh reintroduce sukses palsu.

**Step 4: Commit**

```bash
git add src/components/settings/SecurityTab.tsx
git commit -m "feat(settings): enable inline create password for oauth-only users"
```

---

### Task 3: Tampilkan UI 2FA untuk semua tier user

**Files:**
1. Modify: `src/components/settings/SecurityTab.tsx`

**Step 1: Lepas gate render 2FA dari `hasPassword`**

1. Section 2FA harus selalu dirender untuk user login.
2. Jangan ada kondisi hide berbasis `hasPassword`.

**Step 2: Tambahkan guard interaksi jika belum punya password**

1. Jika `hasPassword=false`:
   - disable tombol aktifkan/nonaktifkan 2FA.
   - tampilkan copy penjelasan “Buat password dulu untuk mengaktifkan 2FA.”
2. Jika `hasPassword=true`:
   - flow enable/disable normal.

**Step 3: Verifikasi tidak ada tier-based branch**

1. Pastikan tidak ada condition role/tier (`free`, `pro`, `admin`) di render 2FA.

**Step 4: Commit**

```bash
git add src/components/settings/SecurityTab.tsx
git commit -m "feat(settings): show 2fa section for all tiers with password guard"
```

---

### Task 4: Tambah/upgrade test regression

**Files:**
1. Modify: `src/components/settings/SecurityTab.password.test.tsx`
2. (Opsional) Add: `src/components/settings/SecurityTab.2fa-visibility.test.tsx`

**Step 1: Tambah test create-password inline**

Case minimal:
1. berhasil create-password -> `hasPassword` berubah dan UI tombol berubah ke mode `Ubah Password`.
2. gagal create-password -> toast error muncul.

**Step 2: Tambah test universal 2FA visibility**

Case minimal:
1. saat `hasPassword=false`, card 2FA tetap tampil.
2. tombol aksi 2FA disabled saat belum punya password.

**Step 3: Jalankan test targeted**

Run:
```bash
npx vitest run src/components/settings/SecurityTab.password.test.tsx
```
Expected: PASS.

**Step 4: Commit**

```bash
git add src/components/settings/SecurityTab.password.test.tsx src/components/settings/SecurityTab.2fa-visibility.test.tsx
git commit -m "test(settings): cover inline create-password and universal 2fa visibility"
```

---

### Task 5: Quality gate dan validasi lintas tier

**Files:**
1. No code change (verification task)

**Step 1: Lint dan build**

Run:
```bash
npx eslint src/components/settings/SecurityTab.tsx src/components/settings/SecurityTab.password.test.tsx
npm run build
```
Expected: tanpa error.

**Step 2: Manual QA matrix**

Validasi 4 persona:
1. free + Google-only
2. free + credential
3. pro/bpp + Google-only
4. superadmin

Checklist:
1. 2FA card muncul di semua persona.
2. create-password inline berjalan untuk Google-only.
3. setelah create password, 2FA bisa diaktifkan.
4. change-password tetap normal.

**Step 3: Ringkas bukti**

Simpan ringkasan:
1. hasil test
2. hasil build
3. screenshot before/after tiap persona penting.

---

## Acceptance Criteria

1. `/api/auth/create-password` terdaftar dan callable (tidak 404).
2. User Google dapat set password inline di Settings tanpa cek email.
3. UI 2FA tampil pada semua tier user.
4. Aksi 2FA aman: hanya aktif saat user sudah punya password.
5. Test regression dan build pass.
