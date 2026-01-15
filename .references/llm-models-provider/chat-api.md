# Chat API - `src/app/api/chat/route.ts`

Gue rangkum alur chat API biar lo bisa nyocokin logika route dengan perilaku UI.

## Endpoint

```
POST /api/chat
```

## Request Body

```ts
{
  messages: UIMessage[]
  conversationId?: string
  fileIds?: Id<"files">[]
}
```

## Response

Streaming via `toUIMessageStreamResponse()` atau `createUIMessageStreamResponse()` (mode pencarian web/sitasi).

## Dependensi Kunci

```ts
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  generateText,
  tool,
  type ToolSet,
  type ModelMessage,
  stepCountIs,
} from "ai"
import { auth } from "@clerk/nextjs/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
```

## Ringkasan Alur

1. Auth via Clerk.
2. Parse body dan ambil `messages`, `conversationId`, `fileIds`.
3. Ambil `userId` dari Convex.
4. Create/get conversation + title awal.
5. Simpan pesan user terakhir.
6. Ambil `systemPrompt` + `paperModePrompt`.
7. Buat `fileContext` (dengan batas untuk paper mode).
8. Sanitize `messages` (hapus role non user/assistant/system dan normalisasi content).
9. Ambil `sources` recent buat konteks artifact.
10. Susun `fullMessagesBase`.
11. Load provider settings + model names + tool pencarian web.
12. Router pencarian web (output terstruktur + fallback pemrosesan JSON).
13. streamText primary (Gateway) atau fallback OpenRouter.
14. Simpan pesan assistant + metadata model.

## Detail Penting

### 1) Simpan Pesan User

```ts
await fetchMutation(api.messages.createMessage, {
  conversationId: currentConversationId,
  role: "user",
  content: userContent,
  fileIds,
})
```

### 2) File Context (Paper Mode)

- Batas per file: 6000 karakter.
- Batas total: 20000 karakter.
- Hanya aktif saat paper mode.

### 3) Trimming Riwayat (Paper Mode)

```ts
const MAX_CHAT_HISTORY_PAIRS = 20 // 20 pairs = 40 messages
```

Jika paper mode aktif dan history lebih panjang, `modelMessages` dipotong dari belakang.

### 3) Sanitasi Messages

`modelMessages` dibersihin agar kompatibel dengan OpenRouter:
- Hanya role `user`, `assistant`, `system`.
- `content` array diubah jadi string gabungan.

### 4) Sources Context (Artifact)

```
api.messages.getRecentSources (batas: 5)
```

Sources ini disuntik ke system message agar tool `createArtifact`/`updateArtifact` bisa pakai sitasi sebelumnya.

### 5) Tools

Tools utama:
- `createArtifact`
- `updateArtifact`
- `renameConversationTitle`
- Paper workflow tools (`createPaperTools`)

Catatan:
- Tool `updateArtifact` dipakai kalau artifact lama di-invalidasi.
- `renameConversationTitle` dibatasi max 2 kali update judul.

### 6) Router Pencarian Web

`decideWebSearchMode()`:
- Prioritas: output terstruktur `generateObject()` (2x retry).
- Fallback: `generateText()` lalu pemrosesan JSON manual.

Tambahan logika:
- Paper mode stage policy: `active` / `passive` / `none`.
- Kalau user hanya konfirmasi/approve, pencarian web dipaksa `false`.
- Kalau pencarian sudah pernah dilakukan di percakapan, prefer mode non-pencarian.

Daftar stage:

```
ACTIVE_SEARCH_STAGES:
  gagasan, topik, pendahuluan, tinjauan_literatur, metodologi, diskusi
PASSIVE_SEARCH_STAGES:
  outline, abstrak, hasil, kesimpulan, daftar_pustaka, lampiran, judul
```

Jika paper intent terdeteksi tapi sesi belum ada, `forcePaperToolsMode` memaksa non-pencarian agar `startPaperSession` bisa dipanggil dulu.

### 7) Pemilihan Tools

```ts
const gatewayTools: ToolSet = enableWebSearch
  ? ({ google_search: wrappedGoogleSearchTool } as ToolSet)
  : tools

const maxToolSteps = enableWebSearch ? 1 : 5
```

Jika `shouldForceSubmitValidation` true, `toolChoice` dipaksa ke `submitStageForValidation`.

### 8) Primary Stream (Vercel Gateway)

- Pencarian web aktif -> tools hanya `google_search`.
- Non-pencarian web -> tools fungsi normal.

Mode pencarian web (primary):
- `fullMessagesGateway` disisipi `webSearchBehaviorSystemNote` (catatan sistem berisi aturan pencarian web).
- `createUIMessageStream()` dipakai untuk kirim `data-search` status.
- `providerMetadata.google.groundingMetadata` dipakai buat sitasi inline.
- Chunk `data-cited-text` dan `data-cited-sources` dikirim ke client.

Mode non-pencarian web (primary):
- `streamText()` + `onFinish` simpan pesan.
- Jika ada `providerMetadata` yang berisi grounding, tetap dicoba ekstraksi sources.

### 9) Fallback Stream (OpenRouter)

Trigger: error saat stream primary.

Alur:
- `getWebSearchConfig()` diambil dari DB.
- `fallbackEnableWebSearch` true jika:
  - primary butuh pencarian web, dan
  - `fallbackWebSearchEnabled` true, dan
  - fallback provider = openrouter

Jika `fallbackEnableWebSearch` false:
- `runFallbackWithoutSearch()` -> `streamText()` biasa + tools fungsi.

Jika `fallbackEnableWebSearch` true:
- Model diubah jadi `model:online` via `getOpenRouterModel({ enableWebSearch: true })`.
- `createUIMessageStream()` dipakai buat `data-search`.
- Citations diambil dari metadata OpenRouter dan dinormalisasi dengan `normalizeCitations()`.
- `data-cited-text` dan `data-cited-sources` dikirim ke client.
- Jika mode `:online` gagal, fallback ke `runFallbackWithoutSearch()`.

### 10) Metadata Model

`saveAssistantMessage()` menerima `usedModel`:
- Primary: `modelNames.primary.model`
- Fallback normal: `modelNames.fallback.model`
- Fallback online: `${modelNames.fallback.model}:online`

### 11) Log Utama (contoh)

```
[WebSearchRouter] Decision: ...
[Chat API] Gateway Tools Configured: ...
[Fallback] Web search config: ...
[Fallback] Citations found: <n>
[Fallback] :online stream failed, retrying without search: ...
[Chat API] Failed to compute inline citations: ...
```
