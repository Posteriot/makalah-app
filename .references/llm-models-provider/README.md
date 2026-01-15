# Dokumentasi LLM & Provider AI

Gue bikin ringkasan ini biar lo gampang ngelacak sumber utama terkait model/provider.

## Ikhtisar

Arsitektur pakai dual-provider:
- **Primary**: Vercel AI Gateway
- **Fallback**: OpenRouter
- **Model bawaan (seed)**: `google/gemini-2.5-flash-lite`
- **AI settings**: `temperature`, `topP`, `maxTokens` dari config aktif di DB

Config aktif di database adalah sumber utama. Kalau tidak ada config aktif, `getProviderConfig()` melempar `AIProviderConfigError`.

## Berkas Utama

| Berkas | Lokasi | Fungsi |
| --- | --- | --- |
| `streaming.ts` | `src/lib/ai/` | Provider model + resolver config + tool pencarian web |
| `config-cache.ts` | `src/lib/ai/` | Cache di memori untuk config aktif |
| `chat/route.ts` | `src/app/api/` | Endpoint chat + router pencarian web + fallback |
| `title-generator.ts` | `src/lib/ai/` | Generate judul percakapan |
| `aiProviderConfigs.ts` | `convex/` | Query/mutation config |
| `schema.ts` | `convex/` | Schema `aiProviderConfigs` |
| `AIProviderManager.tsx` | `src/components/admin/` | List + aksi config |
| `AIProviderFormDialog.tsx` | `src/components/admin/` | Form create/edit config |
| `validate-provider/route.ts` | `src/app/api/admin/` | Test koneksi provider |
| `verify-model-compatibility/route.ts` | `src/app/api/admin/` | Verifikasi pemanggilan tool (OpenRouter) |

## Variabel Environment

```env
# Vercel AI Gateway
VERCEL_AI_GATEWAY_API_KEY=...
AI_GATEWAY_API_KEY=...  # alias yang dipakai SDK

# OpenRouter
OPENROUTER_API_KEY=...

# Opsional
APP_URL=http://localhost:3000
CHAT_TITLE_FINAL_MIN_PAIRS=3
GOOGLE_GENERATIVE_AI_API_KEY=...  # buat google_search tool
```

## Provider & Format Model

### Vercel AI Gateway
- Format model: `model-name` (contoh `gemini-2.5-flash-lite`)
- Gemini tanpa prefix akan ditambah `google/`.
- Dipakai via `createGateway` dari `@ai-sdk/gateway`.

### OpenRouter
- Format model: `provider/model` (contoh `google/gemini-2.5-flash-lite`).
- Dipakai via `createOpenRouter` dari `@openrouter/ai-sdk-provider`.
- Untuk pencarian web di fallback, model disufiks `:online`.

## Konfigurasi Database

Field inti:

```ts
{
  name: string
  primaryProvider: "vercel-gateway" | "openrouter"
  primaryModel: string
  fallbackProvider: "vercel-gateway" | "openrouter"
  fallbackModel: string
  gatewayApiKey?: string
  openrouterApiKey?: string
  temperature: number
  topP?: number
  maxTokens?: number
  primaryWebSearchEnabled?: boolean
  fallbackWebSearchEnabled?: boolean
  fallbackWebSearchEngine?: string
  fallbackWebSearchMaxResults?: number
  version: number
  isActive: boolean
}
```

Legacy `primaryApiKey`/`fallbackApiKey` masih ada untuk kompatibilitas, tapi alur utama pakai `gatewayApiKey`/`openrouterApiKey`.

## Setup Pertama Kali

```bash
npx convex run migrations:seedDefaultAIConfig
```

## Migrasi Tambahan (Opsional)

```bash
npx convex run migrations:backfillProviderKeys
npx convex run "migrations/updateAIConfigForToolCalling:updateAIConfigForToolCalling"
npx convex run "migrations/updateToGPT4oForToolCalling:updateToGPT4oForToolCalling"
```

## Struktur Dokumen

1. `architecture.md`
2. `streaming-core.md`
3. `config-cache.md`
4. `chat-api.md`
5. `database-schema.md`
6. `admin-panel.md`
7. `fallback-mechanism.md`
8. `source-reference.md`
