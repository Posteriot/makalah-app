# Mekanisme Fallback

Gue jelasin layer fallback di sistem biar lo bisa tracking perilaku saat error.

**PENTING:** Database tetap sumber utama tunggal untuk config aktif.

## 1) Tidak Ada Config Aktif

Lokasi: `src/lib/ai/streaming.ts` -> `getProviderConfig()`

```ts
const config = await configCache.get()
if (!config) {
  throw new AIProviderConfigError(
    "No active AI provider configuration found. " +
    "Please activate a configuration in Admin Panel -> AI Providers."
  )
}
```

**Trigger:** `getActiveConfig()` mengembalikan `null` dan cache kosong.

**Perilaku:** `AIProviderConfigError` (bukan hardcoded fallback config).

## 2) Cache Stale Fallback

Lokasi: `src/lib/ai/config-cache.ts` -> `get()`

**Trigger:** DB error, tapi cache lama masih ada.

**Perilaku:** pakai cache lama (graceful degradation).

## 3) Primary Provider Gagal

Lokasi: `src/app/api/chat/route.ts`

**Alur:**
- Primary (Gateway) gagal -> masuk `catch`.
- Hitung `fallbackEnableWebSearch`.
- Jika `false` -> fallback normal (OpenRouter tanpa pencarian web).
- Jika `true` -> coba OpenRouter `:online`.
- Kalau `:online` gagal -> ulang fallback normal.

### Fallback normal (tanpa pencarian web)

```ts
const fallbackModel = await getOpenRouterModel({ enableWebSearch: false })
const result = streamText({
  model: fallbackModel,
  messages: fullMessagesBase,
  tools,
  stopWhen: stepCountIs(5),
  ...samplingOptions,
})
```

`samplingOptions` (temperature/topP/maxTokens) tetap sama seperti primary.

### Fallback `:online` (pencarian web)

- Model ID jadi `${model}:online`.
- Tidak pakai tools.
- Citations di-normalisasi dari metadata OpenRouter.
- Sitasi inline ditulis lewat `data-cited-text` dan `data-cited-sources`.

## 4) Title Generation Fallback

Lokasi: `src/lib/ai/title-generator.ts`

```ts
try {
  const model = await getGatewayModel()
  return (await generateText({ model, prompt })).text
} catch {
  try {
    const fallbackModel = await getOpenRouterModel()
    return (await generateText({ model: fallbackModel, prompt })).text
  } catch {
    return input.userMessage.substring(0, 30) + "..."
  }
}
```

## 5) Google Search Tool Tidak Tersedia

Lokasi: `src/lib/ai/streaming.ts` -> `getGoogleSearchTool()`

- Jika import gagal -> return `null`.
- Kalau `null`, mode pencarian web primary dimatikan.

## Ringkas Prioritas

| Kondisi | Perilaku |
| --- | --- |
| Tidak ada config aktif | Throw `AIProviderConfigError` |
| DB error + cache ada | Pakai cache lama |
| Primary gagal | Fallback OpenRouter (normal atau `:online`) |
| `:online` gagal | Fallback normal |
| Title primary gagal | Coba fallback, lalu truncate |
| Google Search tool gagal | Pencarian web primary dimatikan |
