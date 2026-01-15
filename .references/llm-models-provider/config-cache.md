# Config Cache - `src/lib/ai/config-cache.ts`

Gue jelasin cache config biar lo ngerti kapan DB kepanggil dan kapan pake cache.

## Tujuan

Cache di memori untuk config AI provider (TTL 5 menit) supaya permintaan chat tidak selalu akses DB.

## Struktur Interface

```ts
export interface AIProviderConfig {
  _id: Id<"aiProviderConfigs">
  name: string
  description?: string
  primaryProvider: string
  primaryModel: string
  fallbackProvider: string
  fallbackModel: string

  // Kunci per provider
  gatewayApiKey?: string
  openrouterApiKey?: string

  // Legacy (kompatibilitas)
  primaryApiKey?: string
  fallbackApiKey?: string

  temperature: number
  topP?: number
  maxTokens?: number

  // Pengaturan pencarian web (nilai bawaan disuntik di getActiveConfig)
  primaryWebSearchEnabled: boolean
  fallbackWebSearchEnabled: boolean
  fallbackWebSearchEngine: string
  fallbackWebSearchMaxResults: number

  version: number
  isActive: boolean
  createdBy: Id<"users">
  createdAt: number
  updatedAt: number
}
```

Catatan: field pencarian web dapat nilai bawaan dari `getActiveConfig`.

## Implementasi Cache

```ts
class ConfigCache {
  private config: AIProviderConfig | null = null
  private lastFetch = 0
  private TTL = 5 * 60 * 1000
}
```

## Method

### `get()`

```ts
async get(): Promise<AIProviderConfig | null> {
  const now = Date.now()
  if (this.config && now - this.lastFetch < this.TTL) {
    return this.config
  }

  try {
    const { fetchQuery } = await import("convex/nextjs")
    const { api } = await import("@convex/_generated/api")
    const activeConfig = await fetchQuery(api.aiProviderConfigs.getActiveConfig)
    this.config = activeConfig
    this.lastFetch = now
    return this.config
  } catch (error) {
    console.error("[ConfigCache] Error fetching config:", error)
    if (this.config) return this.config
    return null
  }
}
```

Perilaku:
- Cache fresh (< 5 menit) -> pakai cache.
- Cache stale -> fetch DB.
- DB error + ada cache -> pakai cache lama.
- DB error + cache kosong -> `null`.

### `invalidate()`

```ts
invalidate() {
  this.config = null
  this.lastFetch = 0
}
```

### `getState()`

```ts
getState() {
  return {
    hasCached: this.config !== null,
    lastFetch: this.lastFetch,
    age: this.lastFetch > 0 ? Date.now() - this.lastFetch : 0,
    ttl: this.TTL,
    isExpired: this.lastFetch > 0 && Date.now() - this.lastFetch >= this.TTL,
  }
}
```

## Catatan Faktual

- Cache ini singleton per proses server.
- `invalidate()` belum dipanggil dari UI admin (tombol reload cuma toast).
- Jika `get()` mengembalikan `null`, `getProviderConfig()` akan melempar `AIProviderConfigError`.
