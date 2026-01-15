# Database Schema - AI Provider Config (Convex)

Gue jabarkan schema dan fungsi Convex biar lo bisa cocokkan field config dengan DB.

## Lokasi Schema

`convex/schema.ts`

## Table `aiProviderConfigs`

```ts
aiProviderConfigs: defineTable({
  name: v.string(),
  description: v.optional(v.string()),

  // Primary Provider
  primaryProvider: v.string(),
  primaryModel: v.string(),

  // Fallback Provider
  fallbackProvider: v.string(),
  fallbackModel: v.string(),

  // Kunci per provider (global)
  gatewayApiKey: v.optional(v.string()),
  openrouterApiKey: v.optional(v.string()),

  // Legacy slot-based keys (kompatibilitas)
  primaryApiKey: v.optional(v.string()),
  fallbackApiKey: v.optional(v.string()),

  // AI Settings
  temperature: v.number(),
  topP: v.optional(v.number()),
  maxTokens: v.optional(v.number()),

  // Pengaturan Pencarian Web
  primaryWebSearchEnabled: v.optional(v.boolean()),
  fallbackWebSearchEnabled: v.optional(v.boolean()),
  fallbackWebSearchEngine: v.optional(v.string()), // native | exa | auto
  fallbackWebSearchMaxResults: v.optional(v.number()),

  // Versioning
  version: v.number(),
  isActive: v.boolean(),
  parentId: v.optional(v.id("aiProviderConfigs")),
  rootId: v.optional(v.id("aiProviderConfigs")),

  // Audit
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_active", ["isActive"])
  .index("by_root", ["rootId", "version"])
  .index("by_createdAt", ["createdAt"])
```

## Query Functions (convex/aiProviderConfigs.ts)

### `getActiveConfig`

- Tidak butuh auth.
- Inject nilai bawaan untuk pencarian web:
  - `primaryWebSearchEnabled`: true
  - `fallbackWebSearchEnabled`: true
  - `fallbackWebSearchEngine`: "auto"
  - `fallbackWebSearchMaxResults`: 5

### `listConfigs`

- Admin only.
- Ambil semua config, lalu pilih versi terbaru per chain (`rootId`).
- Tambah `creatorEmail` untuk UI.

### `getConfigVersionHistory`

- Admin only.
- Ambil semua versi berdasarkan `rootId`.

## Mutation Functions

### `createConfig`

- Admin only.
- Validasi: `name` wajib, `temperature` 0..2, `fallbackWebSearchMaxResults` 1..10.
- `gatewayApiKey` / `openrouterApiKey` disimpan sebagai string (boleh kosong).
- Legacy `primaryApiKey` / `fallbackApiKey` di-set string kosong.
- `isActive` nilai awal `false`.

### `updateConfig`

- Admin only.
- Buat versi baru (immutable versioning).
- API key opsional:
  - `gatewayApiKeyClear` / `openrouterApiKeyClear` -> simpan string kosong.
  - Kalau tidak ada key baru, pakai key lama (atau derive dari legacy).
- Field pencarian web ikut di-merge.
- Kalau config lama aktif, aktivasi dipindah ke versi baru.

### `activateConfig`

- Admin only.
- Nonaktifkan semua config aktif, lalu aktifkan target.

### `swapProviders`

- Admin only.
- Buat versi baru dengan primary <-> fallback.
- **Kunci per provider tidak ditukar** (tetap di `gatewayApiKey` / `openrouterApiKey`).
- `primaryWebSearchEnabled` dan `fallbackWebSearchEnabled` ikut ditukar.
- `fallbackWebSearchEngine` dan `fallbackWebSearchMaxResults` tetap di slot fallback.

### `deleteConfig`

- Admin only.
- Tidak boleh hapus config aktif.

### `deleteConfigChain`

- Admin only.
- Tidak boleh hapus jika ada versi yang aktif di chain.

## Migration: seedDefaultAIConfig

Lokasi: `convex/migrations/seedDefaultAIConfig.ts`

- Buat config bawaan dari ENV.
- Set:
  - primary: vercel-gateway / gemini-2.5-flash-lite
  - fallback: openrouter / google/gemini-2.5-flash-lite
  - `gatewayApiKey` dan `openrouterApiKey` dari ENV
  - legacy `primaryApiKey`/`fallbackApiKey` ikut diisi

Run:

```bash
npx convex run migrations:seedDefaultAIConfig
```

## Migrasi Lain (Opsional)

### backfillProviderKeys

Lokasi: `convex/migrations/backfillProviderKeys.ts`

- Backfill `gatewayApiKey` / `openrouterApiKey` dari `primaryApiKey` / `fallbackApiKey`.
- Ada heuristik swap kalau prefix key ketukar.

Run:

```bash
npx convex run migrations:backfillProviderKeys
```

### updateAIConfigForToolCalling

Lokasi: `convex/migrations/updateAIConfigForToolCalling.ts`

- Update fallback model ke `google/gemini-2.0-flash-001` agar pemanggilan tool stabil.

Run:

```bash
npx convex run "migrations/updateAIConfigForToolCalling:updateAIConfigForToolCalling"
```

### updateToGPT4oForToolCalling

Lokasi: `convex/migrations/updateToGPT4oForToolCalling.ts`

- Update fallback ke `openai/gpt-4o-mini` via OpenRouter.

Run:

```bash
npx convex run "migrations/updateToGPT4oForToolCalling:updateToGPT4oForToolCalling"
```
