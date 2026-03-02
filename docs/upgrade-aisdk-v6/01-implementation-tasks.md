# AI SDK v5 → v6 Upgrade — Implementation Tasks

> Reference: `00-design.md` untuk konteks dan rationale
> Approach: Big Bang di main, NO push sebelum verifikasi 100%

---

## Task 1: Upgrade Dependencies

**Steps:**
1. Jalankan:
   ```bash
   npm install ai@^6 @ai-sdk/gateway@^3 @ai-sdk/google@^3 @ai-sdk/openai@^3 @ai-sdk/react@^3 @openrouter/ai-sdk-provider@^2
   ```
2. Cek apakah `@ai-sdk/vercel` masih dipakai:
   - Grep codebase untuk import `@ai-sdk/vercel`
   - Kalau nggak dipakai → `npm uninstall @ai-sdk/vercel`
   - Kalau dipakai → upgrade ke versi compatible
3. Verify: `npx tsc --noEmit` — catat semua errors (expected, akan difix di task berikutnya)
4. Commit: dependency upgrades saja

**Acceptance Criteria:**
- [ ] `package.json` menunjukkan versi v6-compatible
- [ ] `npm install` clean tanpa peer dep warnings
- [ ] `node_modules` consistent

---

## Task 2: Run Codemod

**Steps:**
1. Jalankan automated codemod:
   ```bash
   npx @ai-sdk/codemod v6
   ```
2. Review setiap perubahan yang dilakukan codemod
3. Verify: `npx tsc --noEmit` — catat remaining errors

**Acceptance Criteria:**
- [ ] Codemod ran tanpa crash
- [ ] Review: nggak ada perubahan yang salah/destructive

---

## Task 3: Fix `convertToModelMessages` — Async

**File:** `src/app/api/chat/route.ts`

**Steps:**
1. Cari `convertToModelMessages(messages)` (line ~588)
2. Tambah `await`:
   ```typescript
   const rawModelMessages = await convertToModelMessages(messages)
   ```
3. Verify: `npx tsc --noEmit` — error ini harus hilang

**Acceptance Criteria:**
- [ ] `convertToModelMessages` call di-await
- [ ] Surrounding async context sudah benar

---

## Task 4: Fix `CoreMessage` → `ModelMessage`

**File:** `src/lib/ai/streaming.ts`

**Steps:**
1. Ganti import:
   ```typescript
   // Before:
   import { streamText, type CoreMessage } from "ai"
   // After:
   import { streamText, type ModelMessage } from "ai"
   ```
2. Ganti semua usage `CoreMessage` → `ModelMessage` di file ini
3. Grep codebase untuk `CoreMessage` lain yang mungkin terlewat
4. Verify: `npx tsc --noEmit`

**Acceptance Criteria:**
- [ ] Zero references ke `CoreMessage` di codebase
- [ ] `ModelMessage` type resolves correctly

---

## Task 5: Migrate `generateObject` → `generateText({ output })`

### 5a: `src/app/api/refrasa/route.ts` (2 calls)

**Steps:**
1. Tambah import `zodSchema` dari `ai`:
   ```typescript
   import { generateText, zodSchema } from "ai"
   ```
2. Ganti setiap `generateObject` call:
   ```typescript
   // Before:
   const { object } = await generateObject({ model, schema, prompt, system, temperature })
   // After:
   const { output } = await generateText({ model, output: zodSchema(schema), prompt, system, temperature })
   ```
3. Ganti `object` → `output` di semua downstream usage
4. Verify: `npx tsc --noEmit`

### 5b: `src/app/api/chat/route.ts` (1 call)

**Steps:**
1. Cari `generateObject` usage (line ~1058)
2. Ikuti pattern yang sama dengan 5a
3. Verify return value dipakai dengan benar

### 5c: `src/app/api/admin/verify-model-compatibility/route.ts` (1 call)

**Steps:**
1. Cari `generateObject` usage
2. Ikuti pattern yang sama
3. Verify: test endpoint masih mengembalikan response yang benar

**Acceptance Criteria (all 5a-5c):**
- [ ] Zero references ke `generateObject` di codebase
- [ ] `generateText({ output })` compiles clean
- [ ] Return value `output` digunakan di semua downstream code

---

## Task 6: Verify Token Tracking

**Files:** `src/app/api/chat/route.ts`, `src/lib/billing/enforcement.ts`

**Steps:**
1. Grep `inputTokens|outputTokens|cachedInputTokens|reasoningTokens`
2. Confirm `inputTokens`/`outputTokens` masih ada di v6 (expected: ya)
3. Kalau ada `cachedInputTokens` → migrate ke `inputTokenDetails.cacheReadTokens`
4. Kalau ada `reasoningTokens` → migrate ke `outputTokenDetails.reasoningTokens`
5. Verify: billing enforcement code path tetap benar

**Acceptance Criteria:**
- [ ] Token fields resolve di TypeScript
- [ ] No deprecated token field access

---

## Task 7: TypeScript + Build Verification

**Steps:**
1. `npx tsc --noEmit` — MUST be zero errors
2. `npm run lint` — MUST be zero errors (or fix)
3. `npm run build` — production build MUST succeed
4. `npm run test` — all tests MUST pass
5. Commit semua code fixes

**Acceptance Criteria:**
- [ ] `tsc` clean
- [ ] `lint` clean
- [ ] `build` success
- [ ] `test` pass

---

## Task 8: Manual Verification (WAJIB sebelum push)

> Jalankan `npm run dev` + `npx convex dev` dan test semua flow.

### 8.1 Chat Normal
- [ ] Kirim pesan → response streaming diterima
- [ ] Token usage tercatat (cek Convex dashboard: `usageEvents` table)
- [ ] Multi-turn conversation works

### 8.2 Web Search
- [ ] Trigger web search → Gateway `google_search` works
- [ ] Fallback: OpenRouter `:online` search works
- [ ] Citations muncul di response

### 8.3 Paper Mode
- [ ] Start paper session → tool calls work
- [ ] `updateStageData` → saves correctly
- [ ] `submitStageForValidation` → dialog flow works

### 8.4 Refrasa
- [ ] Submit text → structured output diterima
- [ ] Dual provider fallback works

### 8.5 File Upload & Extraction
- [ ] Upload PDF/DOCX/TXT → extraction success
- [ ] Upload image → OCR via OpenRouter works

### 8.6 Admin Panel
- [ ] Validate provider → responds correctly
- [ ] Verify model compatibility → all 4 tests pass

### 8.7 Billing
- [ ] Credit deduction tercatat setelah chat
- [ ] Quota check masih block kalau habis

**Acceptance Criteria:**
- [ ] ALL 8.1-8.7 pass
- [ ] No console errors di browser
- [ ] No unhandled errors di server logs

---

## Task 9: Commit & Hold

**Steps:**
1. Commit dengan message descriptif
2. **JANGAN push** — tunggu konfirmasi user
3. Inform user: upgrade selesai, ready for their final verification

**Acceptance Criteria:**
- [ ] Clean commit(s) di main
- [ ] NOT pushed to remote
- [ ] User informed
