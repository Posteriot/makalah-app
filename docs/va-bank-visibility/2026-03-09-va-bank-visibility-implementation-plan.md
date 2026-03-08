# VA Bank Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin/superadmin bisa show/hide bank Virtual Account per channel dari dashboard, berlaku konsisten ke checkout BPP dan Pro, tanpa mengubah perilaku QRIS dan E-Wallet.

**Architecture:** Konfigurasi visibilitas bank VA disimpan di `paymentProviderConfigs.visibleVAChannels` sebagai source of truth. Frontend checkout memfilter channel VA berdasarkan config aktif, sementara API route memvalidasi channel agar request manual tidak bisa bypass. Metode VA dianggap unavailable hanya saat `visibleVAChannels` kosong; QRIS dan E-Wallet tetap mengikuti `enabledMethods` existing.

**Tech Stack:** Next.js 16 App Router, TypeScript, Convex, Vitest, React Testing Library.

---

### Task 1: Extend Convex Schema for VA Visibility

**Files:**
- Modify: `convex/schema.ts`
- Test: `npm run test -- src/lib/payment/channel-options.test.ts` (sanity terhadap daftar channel existing)

**Step 1: Add failing validation expectation in design notes (lightweight pre-check)**

```ts
// Target schema field:
visibleVAChannels: v.array(v.string())
```

**Step 2: Update schema**
- Tambahkan field `visibleVAChannels` di table `paymentProviderConfigs`.

**Step 3: Run focused sanity test**
Run: `npm run test -- src/lib/payment/channel-options.test.ts`
Expected: PASS (field schema baru tidak mengubah daftar channel statis).

**Step 4: Commit**
```bash
git add convex/schema.ts
git commit -m "feat(payment): add visibleVAChannels to payment provider config schema"
```

### Task 2: Add Channel Helpers and Visibility Filtering

**Files:**
- Modify: `src/lib/payment/channel-options.ts`
- Modify: `src/lib/payment/channel-options.test.ts`

**Step 1: Write failing test**
Tambahkan test baru:
- returns all VA channels as default visible list
- filters VA channels by provided visible codes
- ignores unknown channel codes

```ts
expect(getDefaultVisibleVAChannels()).toEqual(ACTIVE_VA_CHANNELS.map((c) => c.code))
expect(getVisibleVAChannels(["BRI_VIRTUAL_ACCOUNT"]).map((c) => c.code)).toEqual(["BRI_VIRTUAL_ACCOUNT"])
```

**Step 2: Run test to verify FAIL**
Run: `npm run test -- src/lib/payment/channel-options.test.ts`
Expected: FAIL karena helper belum ada.

**Step 3: Implement minimal helper**
Tambahkan export baru:
- `getDefaultVisibleVAChannels()`
- `getVisibleVAChannels(visibleCodes: readonly string[])`
- `isKnownVAChannel(code: string)`

**Step 4: Run test to verify PASS**
Run: `npm run test -- src/lib/payment/channel-options.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/payment/channel-options.ts src/lib/payment/channel-options.test.ts
git commit -m "feat(payment): add VA channel visibility helpers"
```

### Task 3: Extend Runtime Settings for Effective Method Availability

**Files:**
- Modify: `src/lib/payment/runtime-settings.ts`
- Modify: `src/lib/payment/runtime-settings.test.ts`

**Step 1: Write failing test**
Tambahkan test baru:
- VA unavailable when `VIRTUAL_ACCOUNT` enabled but visible VA list empty
- QRIS/E-Wallet unaffected by VA visibility

```ts
expect(getEnabledCheckoutMethods(["QRIS", "VIRTUAL_ACCOUNT"], [])).toEqual(["qris"])
expect(getEnabledCheckoutMethods(["QRIS", "EWALLET"], [])).toEqual(["qris", "ewallet"])
```

**Step 2: Run test to verify FAIL**
Run: `npm run test -- src/lib/payment/runtime-settings.test.ts`
Expected: FAIL karena function signature/rules belum support visibility.

**Step 3: Implement minimal runtime changes**
- Tambah parameter opsional `visibleVAChannels` ke fungsi availability.
- Pastikan default behavior backward-compatible (kalau arg tidak dikirim, VA tetap existing behavior).

**Step 4: Run test to verify PASS**
Run: `npm run test -- src/lib/payment/runtime-settings.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/payment/runtime-settings.ts src/lib/payment/runtime-settings.test.ts
git commit -m "feat(payment): derive VA availability from visible channels"
```

### Task 4: Add Server-side Validation for Visible VA Channel

**Files:**
- Modify: `src/lib/payment/request-validation.ts`
- Modify: `src/lib/payment/request-validation.test.ts`

**Step 1: Write failing test**
Tambahkan test baru:
- pass when requested `vaChannel` is visible
- throw when `vaChannel` is hidden
- throw when `vaChannel` unknown

```ts
expect(() => assertVisibleVAChannel("BRI_VIRTUAL_ACCOUNT", ["BRI_VIRTUAL_ACCOUNT"]))
  .not.toThrow()
expect(() => assertVisibleVAChannel("BNI_VIRTUAL_ACCOUNT", ["BRI_VIRTUAL_ACCOUNT"]))
  .toThrow("Channel Virtual Account tidak tersedia")
```

**Step 2: Run test to verify FAIL**
Run: `npm run test -- src/lib/payment/request-validation.test.ts`
Expected: FAIL karena validator belum ada.

**Step 3: Implement validator**
Tambahkan `assertVisibleVAChannel(vaChannel, visibleVAChannels)`.

**Step 4: Run test to verify PASS**
Run: `npm run test -- src/lib/payment/request-validation.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/lib/payment/request-validation.ts src/lib/payment/request-validation.test.ts
git commit -m "feat(payment): validate visible VA channel in runtime"
```

### Task 5: Persist Visibility in Convex Config Query/Mutation

**Files:**
- Modify: `convex/billing/paymentProviderConfigs.ts`
- Modify: `src/components/admin/PaymentProviderManager.test.tsx` (data contract mock update)

**Step 1: Write failing test (UI contract)**
Update test mock agar assert payload `upsertConfig` wajib mengirim `visibleVAChannels`.

```ts
expect(mutate).toHaveBeenCalledWith(
  expect.objectContaining({
    visibleVAChannels: expect.arrayContaining(["BJB_VIRTUAL_ACCOUNT"]),
  })
)
```

**Step 2: Run test to verify FAIL**
Run: `npm run test -- src/components/admin/PaymentProviderManager.test.tsx`
Expected: FAIL karena mutation belum kirim field itu.

**Step 3: Implement Convex data contract**
- `getActiveConfig`: return `visibleVAChannels` default semua channel.
- `upsertConfig`: terima + validasi + simpan `visibleVAChannels`.

**Step 4: Run test to verify PASS (sementara bisa masih fail di UI sampai Task 6)**
Run: `npm run test -- src/components/admin/PaymentProviderManager.test.tsx`
Expected: masih boleh FAIL karena UI belum update; lanjut Task 6.

**Step 5: Commit**
```bash
git add convex/billing/paymentProviderConfigs.ts src/components/admin/PaymentProviderManager.test.tsx
git commit -m "feat(payment): persist visible VA channels in provider config"
```

### Task 6: Implement Admin Dashboard Controls for Per-Bank Visibility

**Files:**
- Modify: `src/components/admin/PaymentProviderManager.tsx`
- Modify: `src/components/admin/PaymentProviderManager.test.tsx`

**Step 1: Write/complete failing component tests**
Tambahkan test:
- render bank VA list
- toggle bank visibility
- save payload include `visibleVAChannels`
- warning copy saat semua bank hidden dan VA method aktif

**Step 2: Run test to verify FAIL**
Run: `npm run test -- src/components/admin/PaymentProviderManager.test.tsx`
Expected: FAIL sebelum implementasi UI.

**Step 3: Implement minimal UI and save logic**
- Ambil default `visibleVAChannels` dari config.
- Render checkbox per bank dari helper `ACTIVE_VA_CHANNELS`.
- Simpan payload `visibleVAChannels` ke mutation.
- Tampilkan warning non-blocking sesuai accepted risk.

**Step 4: Run test to verify PASS**
Run: `npm run test -- src/components/admin/PaymentProviderManager.test.tsx`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/components/admin/PaymentProviderManager.tsx src/components/admin/PaymentProviderManager.test.tsx
git commit -m "feat(admin): add per-bank VA visibility controls"
```

### Task 7: Apply Visibility to Checkout BPP and PRO

**Files:**
- Modify: `src/app/(onboarding)/checkout/bpp/page.tsx`
- Modify: `src/app/(onboarding)/checkout/pro/page.tsx`
- Test: existing checkout-related tests if available; otherwise manual QA script in PR notes

**Step 1: Add failing behavior check (unitized helper-based assertions where possible)**
Minimal assertion target:
- VA channel grid hanya render channel visible.
- Saat empty visible VA, metode VA tidak muncul.

**Step 2: Run relevant tests**
Run: `npm run test -- src/lib/payment/runtime-settings.test.ts`
Expected: PASS baseline sebelum wiring.

**Step 3: Implement checkout wiring**
- Gunakan `visibleVAChannels` dari `paymentConfig`.
- Bangun `visibleVAOptions = getVisibleVAChannels(...)`.
- Integrasikan ke `getEnabledCheckoutMethods(...)` agar VA hilang saat kosong.
- Auto-reset `selectedVAChannel` ke channel visible pertama.

**Step 4: Manual verification (dev server)**
Run:
```bash
npm run dev
```
Check:
- `/checkout/bpp`
- `/checkout/pro`
Expected:
- Bank list sesuai toggle dashboard.
- QRIS/E-Wallet tetap muncul sesuai `enabledMethods` existing.

**Step 5: Commit**
```bash
git add 'src/app/(onboarding)/checkout/bpp/page.tsx' 'src/app/(onboarding)/checkout/pro/page.tsx'
git commit -m "feat(checkout): enforce VA bank visibility across BPP and PRO"
```

### Task 8: Enforce API Guard in Payment Routes

**Files:**
- Modify: `src/app/api/payments/topup/route.ts`
- Modify: `src/app/api/payments/subscribe/route.ts`
- Modify: tests untuk route payments (create if missing)

**Step 1: Write failing route tests**
Kasus minimal:
- `paymentMethod=va` + hidden channel => 400
- `paymentMethod=va` + visible channel => lanjut provider flow
- `qris/ewallet` tidak terpengaruh visibility VA

**Step 2: Run tests to verify FAIL**
Run: `npm run test -- src/app/api/payments`
Expected: FAIL pada skenario validasi baru.

**Step 3: Implement guard**
Di kedua route:
- ambil `paymentConfig.visibleVAChannels`
- sebelum create payment VA, panggil `assertVisibleVAChannel(...)`

**Step 4: Run tests to verify PASS**
Run: `npm run test -- src/app/api/payments`
Expected: PASS.

**Step 5: Commit**
```bash
git add src/app/api/payments/topup/route.ts src/app/api/payments/subscribe/route.ts src/app/api/payments
git commit -m "feat(api): reject hidden VA channels for checkout payments"
```

### Task 9: Full Verification and Regression Check

**Files:**
- No code changes expected

**Step 1: Run targeted suites**
Run:
```bash
npm run test -- src/lib/payment/channel-options.test.ts src/lib/payment/runtime-settings.test.ts src/lib/payment/request-validation.test.ts src/components/admin/PaymentProviderManager.test.tsx
```
Expected: PASS.

**Step 2: Run full test suite**
Run:
```bash
npm run test
```
Expected: PASS semua test existing + baru.

**Step 3: Run typecheck**
Run:
```bash
npm run typecheck
```
Expected: PASS, tidak ada TypeScript error.

**Step 4: Final manual QA checklist**
- Toggle sebagian bank VA -> reflected di BPP/Pro.
- Toggle semua bank VA hidden -> metode VA tidak tampil.
- QRIS dan E-Wallet tetap available sesuai `enabledMethods`.
- API tolak channel VA hidden.

**Step 5: Commit verification notes (opsional jika ada file release notes/PR notes)**
```bash
git status --short
```
Expected: working tree bersih.

---

## Execution Notes
- Gunakan urutan task berurutan, jangan lompat.
- Setiap task wajib TDD minimal (fail -> implement -> pass).
- Jangan ubah behavior QRIS/E-Wallet selain logic existing `enabledMethods`.
- Ikuti accepted risk di design doc: force majeure seluruh metode off tidak dimitigasi oleh fitur ini.
