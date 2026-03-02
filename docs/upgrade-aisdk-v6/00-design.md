# AI SDK v5 → v6 Upgrade — Design Document

> Date: 2026-03-03
> Approach: Big Bang — upgrade semua sekaligus di main
> Motivation: Prerequisite untuk `@convex-dev/rag@0.7.1` yang butuh `ai@^6.0.0`

---

## 1. Scope

### Package Upgrades

| Package | From | To | API Breaking? |
|---------|------|----|---------------|
| `ai` | `^5.0.113` | `^6.0.0` | Ya — 3 items |
| `@ai-sdk/gateway` | `^2.0.24` | `^3.0.0` | Tidak |
| `@ai-sdk/google` | `^2.0.46` | `^3.0.0` | Tidak |
| `@ai-sdk/openai` | `^2.0.86` | `^3.0.0` | Minor |
| `@ai-sdk/react` | `^2.0.115` | `^3.0.0` | Tidak |
| `@ai-sdk/vercel` | `^1.0.30` | Cek/hapus | Mungkin deprecated |
| `@openrouter/ai-sdk-provider` | `^1.5.4` | `^2.2.3` | Tidak |

### Out of Scope

- Convex, BetterAuth, Zod, dan semua non-AI packages
- Refactoring unrelated code
- Feature additions

---

## 2. Breaking Changes & Required Code Fixes

### 2.1 `convertToModelMessages()` — Jadi Async

**Sebelum (v5):**
```typescript
const rawModelMessages = convertToModelMessages(messages)
```

**Sesudah (v6):**
```typescript
const rawModelMessages = await convertToModelMessages(messages)
```

**File:** `src/app/api/chat/route.ts` (line ~588)
**Risk:** Low — fungsi sudah di dalam async handler

### 2.2 `CoreMessage` → `ModelMessage`

**Sebelum (v5):**
```typescript
import { streamText, type CoreMessage } from "ai"
```

**Sesudah (v6):**
```typescript
import { streamText, type ModelMessage } from "ai"
```

**File:** `src/lib/ai/streaming.ts` (line 1)
**Risk:** Low — type rename, nggak ada runtime impact

### 2.3 `generateObject()` → `generateText({ output })`

Deprecated di v6, masih jalan tapi bakal dihapus. Migrasikan sekarang.

**Sebelum (v5):**
```typescript
const { object } = await generateObject({
  model,
  schema: mySchema,
  prompt: "..."
})
```

**Sesudah (v6):**
```typescript
const { output } = await generateText({
  model,
  output: zodSchema(mySchema),
  prompt: "..."
})
```

**Files:**
- `src/app/api/refrasa/route.ts` — 2 calls
- `src/app/api/chat/route.ts` — 1 call (line ~1058)
- `src/app/api/admin/verify-model-compatibility/route.ts` — 1 call

**Risk:** Medium — perlu pastiin return shape (`object` → `output`) dan error handling tetap benar

### 2.4 `@ai-sdk/vercel` — Cek Status

Package `@ai-sdk/vercel@^1.0.30` ada di dependencies. Perlu cek:
- Apakah masih dipakai di codebase
- Apakah masih kompatibel dengan v6
- Hapus kalau nggak dipakai

### 2.5 `@ai-sdk/openai` — `strictJsonSchema` Default True

Di v3, `strictJsonSchema` default-nya jadi `true`. Ini bisa affect `generateObject`/`generateText({ output })` kalau schema punya optional fields yang nggak di-support strict mode. Monitor saat testing.

---

## 3. Files Affected (Complete Map)

### Pasti Berubah

| File | Perubahan |
|------|-----------|
| `package.json` | Version bumps |
| `src/app/api/chat/route.ts` | `await convertToModelMessages`, `generateObject` → `generateText` |
| `src/lib/ai/streaming.ts` | `CoreMessage` → `ModelMessage` |
| `src/app/api/refrasa/route.ts` | `generateObject` → `generateText` |
| `src/app/api/admin/verify-model-compatibility/route.ts` | `generateObject` → `generateText` |

### Perlu Dicek (Mungkin Berubah)

| File | Alasan Cek |
|------|------------|
| `src/lib/ai/title-generator.ts` | `generateText` — verify return shape |
| `src/lib/ai/context-compaction.ts` | `generateText` — verify return shape |
| `src/lib/file-extraction/image-ocr.ts` | `generateText` + OpenRouter — verify |
| `src/lib/ai/paper-tools.ts` | `tool()` — verify signature |
| `src/components/chat/ChatWindow.tsx` | `useChat` + `DefaultChatTransport` — verify |
| `src/lib/billing/enforcement.ts` | Token field names — verify `inputTokens`/`outputTokens` |

### Tidak Berubah (Verified Safe)

| API | Status v6 |
|-----|-----------|
| `streamText` | Sama |
| `useChat` | Sama |
| `DefaultChatTransport` | Sama |
| `sendMessage({ text })` | Sama |
| `regenerate()` | Sama |
| `createUIMessageStream` | Sama |
| `createUIMessageStreamResponse` | Sama |
| `toUIMessageStreamResponse()` | Sama |
| `stepCountIs()` | Sama |
| `tool()` (tanpa `toModelOutput`) | Sama |
| `inputTokens`/`outputTokens` | Sama |
| `UIMessage` type | Sama |
| `ToolSet` type | Sama |

---

## 4. Token Tracking & Billing

`inputTokens` dan `outputTokens` naming **tetap sama** di v6. Yang berubah cuma detail fields:
- `cachedInputTokens` → `inputTokenDetails.cacheReadTokens`
- `reasoningTokens` → `outputTokenDetails.reasoningTokens`

Codebase saat ini cuma pakai `inputTokens`/`outputTokens` (8 lokasi di chat route + enforcement.ts). Aman.

---

## 5. Verification Strategy

### Automated
1. `npx tsc --noEmit` — zero TypeScript errors
2. `npm run lint` — zero lint errors
3. `npm run build` — production build success
4. `npm run test` — all tests pass

### Manual (Wajib Sebelum Push)
1. Chat normal — kirim pesan, terima response, token dihitung
2. Web search — Gateway google_search, fallback OpenRouter :online
3. Paper mode — start session, tool calls work
4. Refrasa — structured output masih benar
5. File upload + extraction — OCR via OpenRouter
6. Billing — credit deduction tercatat
7. Admin panel — validate provider, verify model compatibility

---

## 6. Rollback Plan

Kalau upgrade gagal di testing:
1. `git reset --hard HEAD~N` untuk revert commits
2. `rm -rf node_modules && npm install` untuk restore deps
3. Verify: `npm run build` + manual test

Nggak ada database migration, nggak ada schema change. Rollback 100% clean.
