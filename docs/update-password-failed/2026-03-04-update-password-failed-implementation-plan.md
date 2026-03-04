# Update Password Failed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memastikan user Google bisa membuat password dari Settings (via reset-link flow yang valid) dan user email/password tidak lagi mendapat status sukses palsu saat change password gagal.

**Architecture:** Perubahan terpusat di `SecurityTab`. Jalur create password untuk akun Google-only diarahkan ke `requestPasswordReset` (endpoint publik yang tersedia). Jalur change password tetap memakai `changePassword`, tetapi response ditangani benar dengan cek `{ error }` sebelum sukses/redirect.

**Tech Stack:** Next.js 16 App Router, React 19, Better Auth client (`better-auth/react`), `@convex-dev/better-auth`, Sonner toast, Vitest/Testing Library.

---

### Task 1: Refactor create-password flow untuk akun Google-only

**Files:**
- Modify: `src/components/settings/SecurityTab.tsx`

**Step 1: Kembalikan handler dari inline `setPassword` ke `requestPasswordReset`**

Di `SecurityTab.tsx`, ganti `handleSetPassword` menjadi `handleSendResetLink`:
- gunakan `authClient.requestPasswordReset({ email: session.user.email, redirectTo: \`\${window.location.origin}/sign-in\` })`
- simpan state `isSendingResetLink` dan `resetLinkSent`
- tampilkan toast sukses/gagal yang relevan

**Step 2: Sesuaikan UI blok `!hasPassword`**

- tombol utama memanggil `handleSendResetLink`
- label tombol:
  - default: `Kirim Link Buat Password`
  - loading: `Mengirim...`
  - sent: `Link Terkirim`
- tampilkan info text jika link sudah terkirim

**Step 3: Validasi compile**

Run: `npm run build`  
Expected: build sukses tanpa TypeScript error.

**Step 4: Commit**

```bash
git add src/components/settings/SecurityTab.tsx
git commit -m "fix(settings): use reset-link flow for google-only password setup"
```

---

### Task 2: Perbaiki response handling change password

**Files:**
- Modify: `src/components/settings/SecurityTab.tsx`

**Step 1: Ubah pemanggilan `changePassword` agar cek error eksplisit**

Ganti:
- dari: `await authClient.changePassword(...)`
- ke: `const { error: apiError } = await authClient.changePassword(...)`

Lalu tambahkan guard:
- jika `apiError` ada -> `toast.error(apiError.message ?? "Gagal memperbarui password.")` dan `return`
- jalur sukses hanya saat `apiError` null

**Step 2: Pertahankan behavior sukses existing**

- `signOutOthers=true` -> toast sukses lalu redirect ke `/sign-in`
- `signOutOthers=false` -> toast sukses + reset form + tutup mode edit

**Step 3: Validasi compile**

Run: `npm run build`  
Expected: build sukses tanpa error.

**Step 4: Commit**

```bash
git add src/components/settings/SecurityTab.tsx
git commit -m "fix(settings): handle changePassword error response correctly"
```

---

### Task 3: Tambah unit test untuk mencegah regresi success palsu

**Files:**
- Create: `src/components/settings/__tests__/SecurityTab.password.test.tsx`
- (Opsional bila perlu) Modify: `vitest` setup file jika mocking belum tersedia

**Step 1: Tulis test gagal dulu (TDD)**

Case minimal:
1. saat `changePassword` resolve `{ error: { message: "INVALID_PASSWORD" } }`, komponen menampilkan toast error dan **tidak** menampilkan sukses.
2. saat `changePassword` resolve `{ error: null }`, komponen menampilkan sukses.

Mock:
- `authClient.changePassword`
- `authClient.listAccounts`
- `toast`

**Step 2: Jalankan test untuk memastikan fail awal**

Run: `npm test -- SecurityTab.password.test.tsx`  
Expected: FAIL sebelum implementasi final jika behavior belum benar.

**Step 3: Sesuaikan implementasi minimal sampai test lulus**

Run: `npm test -- SecurityTab.password.test.tsx`  
Expected: PASS.

**Step 4: Commit**

```bash
git add src/components/settings/__tests__/SecurityTab.password.test.tsx src/components/settings/SecurityTab.tsx
git commit -m "test(settings): cover password error/success handling in SecurityTab"
```

---

### Task 4: Verifikasi manual end-to-end dua persona user

**Files:**
- No code change (manual QA checklist)

**Step 1: Persona A (Google-only)**

1. login via Google
2. buka `/settings?tab=security`
3. klik kirim link
4. verifikasi UI status “link terkirim”
5. buka email reset dan set password baru

Expected:
- tidak ada call ke `/api/auth/set-password`
- flow reset selesai sukses

**Step 2: Persona B (Email/password)**

1. login normal
2. coba ubah password dengan current password salah

Expected:
- muncul toast error
- tidak ada success toast
- password lama tetap valid

3. ulangi dengan current password benar

Expected:
- sukses sesuai opsi sign-out others

**Step 3: Capture evidence**

Simpan screenshot/log singkat hasil QA di catatan PR.

---

### Task 5: Final quality gate

**Files:**
- No code change (command verification)

**Step 1: Jalankan test suite relevan**

Run:
```bash
npm test -- SecurityTab.password.test.tsx
```

Expected: PASS.

**Step 2: Jalankan build**

Run:
```bash
npm run build
```

Expected: PASS.

**Step 3: Siapkan ringkasan perubahan untuk review**

Isi ringkasan:
1. Root cause
2. File yang diubah
3. Bukti test/manual QA

---

## Acceptance Criteria

1. Tidak ada lagi penggunaan `authClient.setPassword` di `SecurityTab`.
2. Flow Google-only memakai `requestPasswordReset`.
3. `changePassword` di `SecurityTab` cek `{ error }` sebelum sukses.
4. Unit test regression untuk success palsu tersedia dan lulus.
5. Manual QA untuk dua persona lulus.
