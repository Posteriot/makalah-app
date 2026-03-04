# 2FA Backup Code End-to-End Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menjadikan backup code 2FA benar-benar bisa dipakai di flow login `/verify-2fa`, tanpa mengubah OTP email 6 digit.

**Architecture:** Pertahankan flow bypass token cross-domain yang sudah ada. Tambahkan endpoint custom verifikasi backup code pada layer Convex HTTP, lalu perluas UI `verify-2fa` menjadi dual-mode (OTP atau backup code). Kedua mode bermuara ke jalur akhir yang sama: `signIn.email()` dengan header `X-2FA-Bypass-Token`.

**Tech Stack:** Next.js 16 (App Router), React 19, Better Auth, Convex HTTP Actions, Vitest + Testing Library, TypeScript.

---

### Task 1: Tambah helper client untuk backup code (TDD)

**Files:**
- Modify: `src/lib/auth-2fa.ts`
- Create: `src/lib/auth-2fa.test.ts`

**Step 1: Write failing test untuk endpoint backup code**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { verifyBackupCode } from "@/lib/auth-2fa"

describe("auth-2fa verifyBackupCode", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("memanggil endpoint /api/auth/2fa/verify-backup-code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({ status: true, bypassToken: "token-1" }),
    }))

    const result = await verifyBackupCode("user@example.com", "DX1va-73eL5")

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/2fa/verify-backup-code"),
      expect.objectContaining({ method: "POST" })
    )
    expect(result.status).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/auth-2fa.test.ts
```

Expected: FAIL dengan error `verifyBackupCode is not exported`.

**Step 3: Implement minimal function di helper**

```ts
export async function verifyBackupCode(email: string, code: string) {
  const response = await fetch(`${CONVEX_SITE_URL}/api/auth/2fa/verify-backup-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  })
  return response.json() as Promise<{ status: boolean; bypassToken?: string; error?: string }>
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/auth-2fa.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/auth-2fa.ts src/lib/auth-2fa.test.ts
git commit -m "test(auth-2fa): cover backup-code helper endpoint"
```

---

### Task 2: Tambah endpoint backend `verify-backup-code`

**Files:**
- Modify: `convex/twoFactorHttp.ts`
- Modify: `convex/http.ts`

**Step 1: Write failing HTTP check (endpoint belum ada)**

Run:
```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/2fa/verify-backup-code \
  -H 'content-type: application/json' \
  --data '{"email":"user@example.com","code":"DX1va-73eL5"}'
```

Expected: 404 (sebelum route ditambahkan).

**Step 2: Implement handler `verifyBackupCode` di `twoFactorHttp.ts`**

Minimal logic yang harus ada:

```ts
export const verifyBackupCode = httpAction(async (ctx, request) => {
  // 1) parse email + code
  // 2) resolve user via auth context
  // 3) find twoFactor row (model: "twoFactor")
  // 4) decrypt backupCodes
  // 5) exact-match check code
  // 6) remove used code + encrypt + update row
  // 7) create bypass token (TTL 30s)
  // 8) return { status: true, bypassToken }
})
```

**Step 3: Register route di `convex/http.ts`**

Tambahkan `POST` + `OPTIONS`:

```ts
http.route({ path: "/api/auth/2fa/verify-backup-code", method: "POST", handler: verifyBackupCode })
http.route({ path: "/api/auth/2fa/verify-backup-code", method: "OPTIONS", handler: verifyBackupCode })
```

**Step 4: Verify endpoint is reachable**

Run:
```bash
npm run dev
```

Then run:
```bash
curl -i -X POST http://127.0.0.1:3000/api/auth/2fa/verify-backup-code \
  -H 'content-type: application/json' \
  --data '{"email":"invalid@example.com","code":"INVALID-CODE"}'
```

Expected: bukan 404, dan body JSON error terstruktur.

**Step 5: Commit**

```bash
git add convex/twoFactorHttp.ts convex/http.ts
git commit -m "feat(auth): add custom 2fa backup-code verification endpoint"
```

---

### Task 3: Dual-mode UI di `/verify-2fa` (OTP + Backup Code) dengan TDD

**Files:**
- Modify: `src/app/(auth)/verify-2fa/page.tsx`
- Modify: `src/lib/auth-2fa.ts`
- Create: `src/app/(auth)/verify-2fa/page.backup-code.test.tsx`

**Step 1: Write failing UI test untuk mode backup**

```tsx
it("bisa switch ke mode backup code", async () => {
  render(<Verify2FAPageWrapper />)

  await user.click(screen.getByRole("button", { name: "Backup code" }))

  expect(screen.getByPlaceholderText("Contoh: DX1va-73eL5")).toBeInTheDocument()
  expect(screen.queryAllByRole("textbox").length).toBe(1)
})
```

Tambahkan juga test submit backup mode:

```tsx
it("submit backup mode memanggil verifyBackupCode", async () => {
  // mock verifyBackupCode -> { status: true, bypassToken: "ok" }
  // assert signIn.email dipanggil dengan header X-2FA-Bypass-Token
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run 'src/app/(auth)/verify-2fa/page.backup-code.test.tsx'
```

Expected: FAIL karena UI/mode backup belum ada.

**Step 3: Implement dual-mode UI minimal di `page.tsx`**

Tambahkan state mode:

```ts
const [method, setMethod] = useState<"otp" | "backup">("otp")
```

Implementasi:

1. Mode `otp` pakai 6 box existing.
2. Mode `backup` pakai single input text.
3. Submit handler bercabang:
   - `otp` -> `verifyOtp(...)`
   - `backup` -> `verifyBackupCode(...)`
4. Kedua cabang melanjutkan flow sign-in bypass yang sama.

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run 'src/app/(auth)/verify-2fa/page.backup-code.test.tsx'
```

Expected: PASS.

**Step 5: Commit**

```bash
git add 'src/app/(auth)/verify-2fa/page.tsx' src/lib/auth-2fa.ts 'src/app/(auth)/verify-2fa/page.backup-code.test.tsx'
git commit -m "feat(auth): support backup-code mode on verify-2fa page"
```

---

### Task 4: Konsistensi copy/settings agar tidak misleading

**Files:**
- Modify: `src/components/settings/SecurityTab.tsx`

**Step 1: Update copy backup code untuk use case login**

Contoh perubahan copy:

```tsx
<p className="...">
  Simpan backup codes ini di tempat yang aman. Gunakan saat kamu tidak bisa akses OTP email. Kode ini hanya ditampilkan sekali.
</p>
```

**Step 2: Add fallback info di verify page subtitle**

Tambahkan satu kalimat di `verify-2fa`:

```tsx
"Jika email OTP tidak tersedia, pakai backup code."
```

**Step 3: Quick UI sanity check**

Run:
```bash
npm run dev
```

Checklist:
1. Toggle mode terlihat.
2. Backup input muncul.
3. Copy tidak ambigu.

**Step 4: Commit**

```bash
git add src/components/settings/SecurityTab.tsx 'src/app/(auth)/verify-2fa/page.tsx'
git commit -m "chore(auth): clarify backup-code usage copy"
```

---

### Task 5: Regression suite + quality gate

**Files:**
- Modify (opsional jika test adjustment perlu):
  - `src/components/settings/SecurityTab.password.test.tsx`
  - `src/lib/auth-2fa.test.ts`
  - `src/app/(auth)/verify-2fa/page.backup-code.test.tsx`

**Step 1: Run targeted tests**

Run:
```bash
npx vitest run src/lib/auth-2fa.test.ts
npx vitest run 'src/app/(auth)/verify-2fa/page.backup-code.test.tsx'
npx vitest run src/components/settings/SecurityTab.password.test.tsx
```

Expected: semua PASS.

**Step 2: Run lint for touched files**

Run:
```bash
npx eslint src/lib/auth-2fa.ts src/app/(auth)/verify-2fa/page.tsx src/components/settings/SecurityTab.tsx convex/twoFactorHttp.ts convex/http.ts
```

Expected: tanpa error.

**Step 3: Run build**

Run:
```bash
npm run build
```

Expected: build sukses.

**Step 4: Manual QA matrix**

1. Persona credential + 2FA enabled: OTP login tetap berhasil.
2. Persona credential + 2FA enabled: backup code login berhasil.
3. Backup code yang sama dipakai ulang: harus gagal.
4. OTP flow resend tetap berfungsi.

**Step 5: Commit final QA adjustment (jika ada)**

```bash
git add -A
git commit -m "test(auth): add regression coverage for backup-code 2fa flow"
```

---

## Acceptance Criteria

1. Halaman `/verify-2fa` mendukung OTP dan backup code.
2. Endpoint `/api/auth/2fa/verify-backup-code` aktif dan tidak 404.
3. Backup code valid menghasilkan bypass token dan bisa menyelesaikan sign-in.
4. Backup code yang sudah dipakai tidak bisa dipakai ulang.
5. OTP 6 digit tetap berfungsi tanpa regresi.
6. Test targeted, lint, dan build pass.
