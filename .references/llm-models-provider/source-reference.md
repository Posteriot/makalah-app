# Referensi Source Code

Gue rangkum referensi file biar lo cepat nemu bagian penting.

## 1) `src/lib/ai/streaming.ts`

**Tujuan:** inti manajemen provider + tool pencarian web.

**Export utama:**
- `getGatewayModel()`
- `getOpenRouterModel(options?: { enableWebSearch?: boolean })`
- `getProviderSettings()`
- `getModelNames()`
- `getWebSearchConfig()`
- `getGoogleSearchTool()`
- `AIProviderConfigError`

**Hal penting:**
- `getProviderConfig()` ambil config dari `configCache` dan throw kalau `null`.
- `createProviderModel()` pakai `createGateway` dan `createOpenRouter`.
- `getOpenRouterModel({ enableWebSearch: true })` menambah suffix `:online`.

## 2) `src/lib/ai/config-cache.ts`

**Tujuan:** cache config aktif (TTL 5 menit).

**API:**
- `configCache.get()`
- `configCache.invalidate()`
- `configCache.getState()`

## 3) `src/app/api/chat/route.ts`

**Tujuan:** endpoint chat utama.

**Bagian kunci:**
- Router pencarian web (`decideWebSearchMode`).
- `gatewayTools` hanya `google_search` saat pencarian web aktif.
- Fallback ke OpenRouter normal atau `:online`.
- Sitasi inline primary dari `providerMetadata.google.groundingMetadata`.
- Sitasi inline fallback dari `normalizeCitations()`.

## 4) `src/lib/ai/title-generator.ts`

**Tujuan:** generate judul percakapan.

Alur: primary -> fallback -> truncate.

## 5) `convex/schema.ts`

**Tujuan:** schema `aiProviderConfigs`.

Field penting:
- provider + model
- `gatewayApiKey`, `openrouterApiKey`
- `primaryWebSearchEnabled`, `fallbackWebSearchEnabled`, `fallbackWebSearchEngine`, `fallbackWebSearchMaxResults`
- versioning (`version`, `isActive`, `parentId`, `rootId`)

## 6) `convex/aiProviderConfigs.ts`

**Tujuan:** query/mutation config.

- `getActiveConfig()` suntik nilai bawaan pencarian web.
- `listConfigs()` balikkan versi terbaru per chain.
- `updateConfig()` support clear API key.
- `swapProviders()` tukar provider, bukan kunci.

## 7) `src/components/admin/AIProviderManager.tsx`

**Tujuan:** tabel list config + action (edit, activate, swap, delete).

## 8) `src/components/admin/AIProviderFormDialog.tsx`

**Tujuan:** form create/edit config.

Fitur tambahan:
- Kunci provider per provider + toggle pakai ENV (edit mode).
- Toggle pencarian web (primary + fallback).
- Verifikasi kompatibilitas tool (OpenRouter).

## 9) `src/app/api/admin/validate-provider/route.ts`

**Tujuan:** test koneksi provider.

- `vercel-gateway` pakai `createGateway`.
- `openrouter` pakai `createOpenAI` + `baseURL` OpenRouter.

## 10) `src/app/api/admin/verify-model-compatibility/route.ts`

**Tujuan:** verifikasi pemanggilan tool OpenRouter.

Tes:
- generasi dasar
- pemanggilan tool sederhana
- pemanggilan tool kompleks
- output terstruktur (`generateObject`)

## 11) `convex/migrations/seedDefaultAIConfig.ts`

**Tujuan:** seed config awal dari ENV.

## 12) `convex/migrations/backfillProviderKeys.ts`

**Tujuan:** backfill `gatewayApiKey`/`openrouterApiKey` dari legacy keys.

## 13) `convex/migrations/updateAIConfigForToolCalling.ts`

**Tujuan:** update fallback model ke gemini-2.0-flash-001 untuk pemanggilan tool.

## 14) `convex/migrations/updateToGPT4oForToolCalling.ts`

**Tujuan:** update fallback model ke gpt-4o-mini (OpenRouter).

## File Paths Ringkas

```
src/
  lib/ai/
    streaming.ts
    config-cache.ts
    title-generator.ts
  app/api/
    chat/route.ts
    admin/validate-provider/route.ts
    admin/verify-model-compatibility/route.ts
  components/admin/
    AIProviderManager.tsx
    AIProviderFormDialog.tsx
convex/
  schema.ts
  aiProviderConfigs.ts
  migrations/seedDefaultAIConfig.ts
  migrations/backfillProviderKeys.ts
  migrations/updateAIConfigForToolCalling.ts
  migrations/updateToGPT4oForToolCalling.ts
```
