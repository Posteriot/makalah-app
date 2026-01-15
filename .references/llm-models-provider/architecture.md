# Arsitektur - Sistem Provider LLM

Gue jelasin arsitekturnya supaya lo bisa tracking jalur data dari UI sampai provider.

## Gambaran Umum

```
CLIENT (Browser)
  useChat -> DefaultChatTransport -> POST /api/chat

API LAYER (Next.js)
  src/app/api/chat/route.ts
    - auth (Clerk)
    - get/create conversation
    - simpan pesan user
    - sistem prompt + paper prompt + file context
    - router pencarian web
    - streamText (primary) + fallback
    - simpan pesan assistant

AI LAYER (src/lib/ai)
  streaming.ts
    getProviderConfig -> configCache.get -> Convex DB
    createProviderModel
    getGatewayModel / getOpenRouterModel
    getProviderSettings / getModelNames
    getWebSearchConfig / getGoogleSearchTool

DATABASE (Convex)
  aiProviderConfigs (config aktif + versi)
```

## Alur Data - Request Chat

```
1. User kirim pesan
2. POST /api/chat { messages, conversationId?, fileIds? }
3. Auth Clerk
4. Ambil userId Convex
5. Create/get conversation
6. Simpan pesan user
7. Ambil system prompt + paper prompt
8. Susun fullMessages (termasuk file context + sources context)
9. Load provider settings + model names
10. Router pencarian web (output terstruktur -> fallback pemrosesan JSON)
11. streamText primary (Vercel Gateway)
    - jika pencarian web aktif: tools hanya google_search
    - jika non-pencarian web: tools fungsi (createArtifact, updateArtifact, paper tools)
12. onFinish simpan pesan assistant + metadata
13. error -> fallback OpenRouter (opsional :online)
```

## Resolusi Config (streaming.ts)

```
getProviderConfig()
  -> configCache.get()
     - cache fresh (< 5 menit) -> pakai cache
     - cache stale -> fetchQuery(aiProviderConfigs.getActiveConfig)
     - fetch error + ada cache -> pakai cache lama
     - fetch error + cache kosong -> null

  jika null -> throw AIProviderConfigError

  return {
    primary: { provider, model, apiKey },
    fallback: { provider, model, apiKey },
    temperature, topP, maxTokens,
    webSearch: {
      primaryEnabled,
      fallbackEnabled,
      fallbackEngine,
      fallbackMaxResults,
    }
  }
```

**Resolusi API key:**
- `gatewayApiKey` / `openrouterApiKey` dibaca dari DB.
- Kalau kosong, `createProviderModel()` masih akan fallback ke ENV (`AI_GATEWAY_API_KEY`, `VERCEL_AI_GATEWAY_API_KEY`, `OPENROUTER_API_KEY`).
- Legacy `primaryApiKey` / `fallbackApiKey` disimpan untuk kompatibilitas, tapi tidak dipakai langsung oleh `getProviderConfig()`.

## Pembuatan Instance Provider

```
createProviderModel(provider, model, apiKey)
  - vercel-gateway -> createGateway({ apiKey }) -> gateway(model)
    * gemini tanpa prefix -> ditambah "google/"
  - openrouter -> createOpenRouter({ apiKey }) -> openrouter.chat(model)
  - unknown -> throw Error
```

Catatan:
- `createOpenRouter` berasal dari `@openrouter/ai-sdk-provider`.
- Endpoint validasi provider (admin) memakai `createOpenAI` khusus di `validate-provider`.

## Pencarian Web

### Primary (Vercel Gateway)
- Menggunakan provider-defined tool `google_search` dari `@ai-sdk/google`.
- Saat pencarian web aktif, tools lain (createArtifact, paper tools, dll) tidak tersedia di permintaan itu.
- Sitasi inline dihasilkan dari `providerMetadata.google.groundingMetadata`.
- Flag `primaryWebSearchEnabled` disimpan di DB, tapi chat route belum membacanya.

### Fallback (OpenRouter)
- Pakai suffix `:online` di model ID ketika pencarian web diaktifkan.
- Tidak memakai tools (OpenRouter mengurus pencarian internal).
- Sitasi inline diambil dari metadata OpenRouter dan dinormalisasi via `normalizeCitations()`.

## Fallback Strategy

```
Primary stream (Gateway)
  -> success: toUIMessageStreamResponse()
  -> error:
       - hitung fallbackEnableWebSearch
       - jika false: runFallbackWithoutSearch()
       - jika true: coba OpenRouter :online
           - jika :online gagal -> runFallbackWithoutSearch()
```

`fallbackEnableWebSearch` bernilai true hanya jika:
- primary mode butuh pencarian web, DAN
- config `fallbackWebSearchEnabled` true, DAN
- fallback provider = openrouter

`fallbackWebSearchEngine` dan `fallbackWebSearchMaxResults` saat ini cuma disimpan dan di-log; belum dipakai buat permintaan ke OpenRouter.

## Versi Config

```
root v1
  -> v2 (parentId: v1)
  -> v3 (parentId: v2)
```

- `rootId` selalu menunjuk versi awal.
- Hanya satu config `isActive=true`.
- `swapProviders` menukar primary/fallback dan ikut menukar flag enable pencarian web.
