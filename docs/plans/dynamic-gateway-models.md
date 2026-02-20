# Plan: Dynamic Gateway Model List for Admin Panel

> **Status:** IMPLEMENTED — semua 4 steps selesai
> **Created:** 2026-02-20
> **Context:** Admin Panel dropdown model saat ini hardcoded di `AIProviderFormDialog.tsx`. Vercel AI Gateway punya REST API `/v1/models` yang bisa di-fetch untuk selalu up-to-date.

---

## Problem

Preset model di Admin Panel (`VERCEL_GATEWAY_MODELS` dan `OPENROUTER_MODELS` di `AIProviderFormDialog.tsx`) di-hardcode. Setiap kali Vercel menambah model baru, list ini jadi stale. Harus manual update code.

## Goal

Replace hardcoded model presets dengan dynamic fetch dari Vercel AI Gateway API, filtered untuk kebutuhan Makalah (language models with vision capability).

## API Discovery

### Vercel AI Gateway API

```
GET https://ai-gateway.vercel.sh/v1/models
```

- **Auth:** Tidak wajib (public endpoint)
- **Response format:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "google/gemini-2.5-flash",
      "object": "model",
      "owned_by": "google",
      "name": "Gemini 2.5 Flash",
      "description": "...",
      "context_window": 1048576,
      "max_tokens": 65536,
      "type": "language",
      "tags": ["file-input", "reasoning", "tool-use", "vision", "implicit-caching"],
      "pricing": {
        "input": "0.00000015",
        "output": "0.0000006"
      }
    }
  ]
}
```

### Key Fields untuk Filter
- `type === "language"` — hanya text/chat models
- `tags.includes("vision")` — bisa baca gambar (kebutuhan Makalah)
- `tags.includes("tool-use")` — support function calling (wajib untuk paper tools)

### Stats (per 2026-02-20)
- Total models di Gateway: 215
- Language + Vision: 75
- Language + Vision + Tool-use: ~65

### Model ID Format Perbedaan
- **Gateway format:** `gemini-2.5-flash` (tanpa provider prefix) — untuk `primaryModel`
- **OpenRouter format:** `google/gemini-2.5-flash` (dengan provider prefix) — untuk `fallbackModel`
- Gateway API returns ID dengan prefix: `google/gemini-2.5-flash`
- Admin Panel primary model saat ini disimpan TANPA prefix: `gemini-2.5-flash`
- Perlu strip prefix untuk primary dropdown, keep prefix untuk fallback dropdown

---

## Implementation Plan

### Step 1: Create API Route — `/api/admin/gateway-models`

**File:** `src/app/api/admin/gateway-models/route.ts`

**Fungsi:**
- Fetch dari `https://ai-gateway.vercel.sh/v1/models`
- Filter: `type === "language"` AND `tags.includes("vision")` AND `tags.includes("tool-use")`
- Transform response ke format yang dibutuhkan dropdown
- Cache response (Next.js `revalidate` atau in-memory TTL 1 jam)
- Return 2 arrays: `gatewayModels` (tanpa prefix) dan `openrouterModels` (dengan prefix)

**Response shape:**
```typescript
interface ModelOption {
  value: string       // model ID untuk disimpan ke DB
  label: string       // display name untuk dropdown
  context: number     // context window
  maxOutput: number   // max output tokens
  tags: string[]      // capabilities
  pricing?: {
    input: string
    output: string
  }
}

interface GatewayModelsResponse {
  gatewayModels: ModelOption[]    // prefix stripped: "gemini-2.5-flash"
  openrouterModels: ModelOption[] // prefix kept: "google/gemini-2.5-flash"
  fetchedAt: string              // ISO timestamp
}
```

**Transform logic:**
```typescript
// Gateway API returns: "google/gemini-2.5-flash"
// Primary (Gateway): strip prefix → "gemini-2.5-flash"
// Fallback (OpenRouter): keep as-is → "google/gemini-2.5-flash"

function stripProviderPrefix(id: string): string {
  const parts = id.split("/")
  return parts.length > 1 ? parts.slice(1).join("/") : id
}
```

**Caching strategy:**
```typescript
// Option A: Next.js route segment config
export const revalidate = 3600 // 1 hour

// Option B: Manual cache header
return Response.json(data, {
  headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200" }
})
```

### Step 2: Create Custom Hook — `useGatewayModels`

**File:** `src/lib/hooks/useGatewayModels.ts`

**Fungsi:**
- Fetch dari `/api/admin/gateway-models`
- SWR atau simple fetch with state
- Return `{ gatewayModels, openrouterModels, isLoading, error }`
- Fallback ke hardcoded list kalau fetch gagal

```typescript
const FALLBACK_GATEWAY_MODELS: ModelOption[] = [
  { value: "gemini-2.5-flash", label: "Google Gemini 2.5 Flash", ... },
  { value: "gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite", ... },
  { value: "gpt-4o", label: "OpenAI GPT-4o", ... },
  // ... subset penting saja
]

const FALLBACK_OPENROUTER_MODELS: ModelOption[] = [
  { value: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash", ... },
  { value: "openai/gpt-5.1", label: "OpenAI GPT-5.1", ... },
  // ... subset penting saja
]
```

### Step 3: Update AIProviderFormDialog.tsx

**File:** `src/components/admin/AIProviderFormDialog.tsx`

**Changes:**
1. Import `useGatewayModels` hook
2. Replace `VERCEL_GATEWAY_MODELS` constant dengan dynamic data
3. Replace `OPENROUTER_MODELS` constant dengan dynamic data
4. Keep "Custom" option di dropdown (admin bisa input manual)
5. Show loading state saat fetch
6. Show model specs (context window, max output) di dropdown label atau tooltip

**Dropdown label format:**
```
Gemini 2.5 Flash — 1M ctx / 66K out
GPT-5.2 — 400K ctx / 128K out
```

**Grouping:** Group by `owned_by` (provider) dalam dropdown menggunakan `<optgroup>` atau shadcn Select groups.

### Step 4: Update docs/vercel-aigateway-models/models.md

Tambahkan note bahwa Admin Panel sekarang fetch dynamic dari API, dan file ini adalah snapshot reference saja.

---

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `src/app/api/admin/gateway-models/route.ts` | API route fetch + filter + cache |
| CREATE | `src/lib/hooks/useGatewayModels.ts` | Client hook with fallback |
| MODIFY | `src/components/admin/AIProviderFormDialog.tsx` | Replace hardcoded with dynamic |
| MODIFY | `docs/vercel-aigateway-models/models.md` | Add note about dynamic fetch |

## Dependencies

- Tidak ada package baru yang perlu di-install
- Menggunakan native `fetch` API
- Tidak perlu auth token untuk Gateway models endpoint

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Gateway API down | Hardcoded fallback list di hook |
| API response format berubah | Defensive parsing + error boundary |
| Terlalu banyak model (75+) | Group by provider, sorted by popularity |
| Model ID format inconsistent | Strip prefix function tested |
| Network latency saat buka form | Prefetch saat Admin page mount, bukan saat dialog open |

## Testing Checklist

- [ ] API route returns filtered models correctly
- [ ] Dropdown shows dynamic models grouped by provider
- [ ] Custom model input masih bisa dipakai
- [ ] Fallback works when API unreachable
- [ ] Primary model ID tersimpan tanpa prefix (Gateway format)
- [ ] Fallback model ID tersimpan dengan prefix (OpenRouter format)
- [ ] Default values di form "Create New" masih `gemini-2.5-flash` / `openai/gpt-5.1`
- [ ] Edit mode populate dari DB config, bukan dari dropdown default

## Out of Scope (untuk sekarang)

- OpenRouter API fetch (tetap hardcoded, nanti bisa ditambah)
- Pricing display di dropdown (data tersedia tapi UI belum perlu)
- Model comparison/recommendation engine
- Auto-migration ketika model deprecated

---

## Execution Order

1. **Step 1** — API route (backend, bisa di-test isolated via curl)
2. **Step 2** — Hook (client, depends on Step 1)
3. **Step 3** — UI update (depends on Step 2)
4. **Step 4** — Docs update (independent, bisa parallel)

Estimasi: 4 steps, masing-masing bisa di-commit terpisah.
