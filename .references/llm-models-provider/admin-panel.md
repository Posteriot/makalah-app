# Panel Admin - Manajemen Provider AI

Gue tulis ringkasan ini biar lo bisa cocokin UI admin dengan kode yang jalan sekarang.

## Hierarki Komponen

```
AdminPanelContainer (src/components/admin/AdminPanelContainer.tsx)
  -> Tabs
     - User Management (UserList)
     - System Prompts (SystemHealthPanel + SystemPromptsManager)
     - AI Providers (AIProviderManager)  <-- fokus doc ini
     - Style Constitution (StyleConstitutionManager)
     - Statistik
```

## AIProviderManager

Lokasi: `src/components/admin/AIProviderManager.tsx`

### Props

```ts
interface AIProviderManagerProps {
  userId: Id<"users">
}
```

### Data Fetching

```ts
const configs = useQuery(api.aiProviderConfigs.listConfigs, {
  requestorUserId: userId,
})
```

`listConfigs` balikkan versi terbaru per chain + `creatorEmail`.

### State Utama

```ts
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
const [editingConfig, setEditingConfig] = useState<AIProviderConfig | null>(null)
const [deleteConfig, setDeleteConfig] = useState<AIProviderConfig | null>(null)
const [activateConfig, setActivateConfig] = useState<AIProviderConfig | null>(null)
const [swapConfig, setSwapConfig] = useState<AIProviderConfig | null>(null)
const [isLoading, setIsLoading] = useState(false)
```

### Mutations

```ts
const activateMutation = useMutation(api.aiProviderConfigs.activateConfig)
const swapMutation = useMutation(api.aiProviderConfigs.swapProviders)
const deleteMutation = useMutation(api.aiProviderConfigs.deleteConfigChain)
```

### Fitur UI

| Fitur | Aksi | Keterangan |
| --- | --- | --- |
| Buat | Buka `AIProviderFormDialog` | Buat config baru |
| Edit | Buka `AIProviderFormDialog` | Update config (buat versi baru) |
| Activate | Dialog konfirmasi | Aktifkan config |
| Swap | Dialog konfirmasi | Tukar primary <-> fallback (buat versi baru) |
| Delete | Dialog konfirmasi | Hapus seluruh chain versi |
| Reload Cache | Tombol | Hanya toast UI, belum ada invalidasi cache server | 

### Kolom Tabel

| Kolom | Isi | Catatan |
| --- | --- | --- |
| Nama | name + description | description ditampilkan kecil |
| Primary Provider | provider + model | provider di-capitalize (replace "-") |
| Fallback Provider | provider + model | sama seperti primary |
| Temperature | angka | topP/maxTokens tidak ditampilkan |
| Versi | badge `v{version}` | |
| Status | badge Aktif/Tidak Aktif | |
| Terakhir Update | format tanggal `id-ID` | |
| Actions | Edit, Swap, Activate, Delete | Activate/Delete disable saat aktif |

### Catatan UI yang Muncul

Kalau ada config, UI menampilkan catatan:

```
Catatan: Jika tidak ada config yang aktif, AI akan menggunakan hardcoded fallback config.
Config cache akan otomatis refresh setiap 5 menit.
```

Catatan di atas adalah teks UI. Di backend, `getProviderConfig()` melempar
`AIProviderConfigError` kalau tidak ada config aktif (lihat `src/lib/ai/streaming.ts`).

## AIProviderFormDialog

Lokasi: `src/components/admin/AIProviderFormDialog.tsx`

### Props

```ts
interface AIProviderFormDialogProps {
  open: boolean
  config: AIProviderConfig | null
  userId: Id<"users">
  onClose: () => void
}
```

### Provider Options

```ts
const PROVIDER_OPTIONS = [
  { value: "vercel-gateway", label: "Vercel AI Gateway" },
  { value: "openrouter", label: "OpenRouter" },
]
```

### Model Preset - Vercel AI Gateway

```ts
const VERCEL_GATEWAY_MODELS = [
  // Google
  { value: "gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite" },
  { value: "gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Google Gemini 2.0 Flash" },
  { value: "gemini-2.0-flash-lite", label: "Google Gemini 2.0 Flash Lite" },
  // OpenAI
  { value: "gpt-4o", label: "OpenAI GPT-4o" },
  { value: "gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  { value: "gpt-4.1", label: "OpenAI GPT-4.1" },
  { value: "gpt-4.1-mini", label: "OpenAI GPT-4.1 Mini" },
  { value: "gpt-4-turbo", label: "OpenAI GPT-4 Turbo" },
  { value: "o1", label: "OpenAI o1" },
  { value: "o3-mini", label: "OpenAI o3 Mini" },
  // Anthropic
  { value: "claude-sonnet-4", label: "Anthropic Claude Sonnet 4" },
  { value: "claude-3.7-sonnet", label: "Anthropic Claude 3.7 Sonnet" },
  { value: "claude-3.5-sonnet", label: "Anthropic Claude 3.5 Sonnet" },
  { value: "claude-3.5-haiku", label: "Anthropic Claude 3.5 Haiku" },
  { value: "claude-opus-4", label: "Anthropic Claude Opus 4" },
  // Meta Llama
  { value: "llama-3.3-70b", label: "Meta Llama 3.3 70B" },
  { value: "llama-4-scout", label: "Meta Llama 4 Scout" },
  { value: "llama-4-maverick", label: "Meta Llama 4 Maverick" },
  // DeepSeek
  { value: "deepseek-v3", label: "DeepSeek V3" },
  { value: "deepseek-r1", label: "DeepSeek R1" },
  // Mistral
  { value: "mistral-large", label: "Mistral Large" },
  { value: "mistral-small", label: "Mistral Small" },
  // Qwen
  { value: "qwen3-max", label: "Qwen 3 Max" },
  { value: "qwen3-coder", label: "Qwen 3 Coder" },
  // Custom
  { value: "custom", label: "Custom (input manual)" },
]
```

### Model Preset - OpenRouter

```ts
const OPENROUTER_MODELS = [
  // Google Gemini
  { value: "google/gemini-2.5-flash-lite", label: "Google Gemini 2.5 Flash Lite" },
  { value: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
  { value: "google/gemini-2.0-flash-001", label: "Google Gemini 2.0 Flash" },
  { value: "google/gemini-2.0-flash-lite-001", label: "Google Gemini 2.0 Flash Lite" },
  // OpenAI
  { value: "openai/gpt-4o", label: "OpenAI GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini" },
  { value: "openai/gpt-4.1", label: "OpenAI GPT-4.1" },
  { value: "openai/gpt-4.1-mini", label: "OpenAI GPT-4.1 Mini" },
  { value: "openai/gpt-4-turbo", label: "OpenAI GPT-4 Turbo" },
  { value: "openai/chatgpt-4o-latest", label: "OpenAI ChatGPT-4o Latest" },
  // Anthropic
  { value: "anthropic/claude-sonnet-4", label: "Anthropic Claude Sonnet 4" },
  { value: "anthropic/claude-3.7-sonnet", label: "Anthropic Claude 3.7 Sonnet" },
  { value: "anthropic/claude-3.5-sonnet", label: "Anthropic Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3.5-haiku", label: "Anthropic Claude 3.5 Haiku" },
  { value: "anthropic/claude-opus-4", label: "Anthropic Claude Opus 4" },
  // Meta Llama
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Meta Llama 3.3 70B" },
  { value: "meta-llama/llama-4-scout", label: "Meta Llama 4 Scout" },
  { value: "meta-llama/llama-4-maverick", label: "Meta Llama 4 Maverick" },
  { value: "meta-llama/llama-3.1-405b-instruct", label: "Meta Llama 3.1 405B" },
  // DeepSeek
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek/deepseek-r1", label: "DeepSeek R1" },
  { value: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2" },
  // Mistral
  { value: "mistralai/mistral-large", label: "Mistral Large" },
  { value: "mistralai/ministral-8b", label: "Ministral 8B" },
  { value: "mistralai/codestral-2508", label: "Codestral" },
  // Qwen
  { value: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B" },
  { value: "qwen/qwen-2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B" },
  { value: "qwen/qwen3-235b-a22b", label: "Qwen 3 235B" },
  { value: "qwen/qwen-max", label: "Qwen Max" },
  // Custom
  { value: "custom", label: "Custom (input manual)" },
]
```

### Struktur Form

**Basic Info**
- Nama (wajib)
- Deskripsi (opsional)

**Primary Provider**
- Provider select
- Model preset select
- Custom model input (jika preset = `custom`)
- Tombol `Test`

**Fallback Provider**
- Struktur sama dengan primary
- Ada tombol `Verify Tool Compatibility` khusus OpenRouter

**Kunci Provider**
- `gatewayApiKey` dan `openrouterApiKey` (per provider, bukan per slot)
- Edit mode punya toggle `Pakai ENV` untuk clear key tersimpan

**AI Settings**
- Temperature (0-2, step 0.1, wajib)
- Top P (0-1, step 0.1, opsional)
- Max Tokens (min 1, step 100, opsional)

**Pengaturan Pencarian Web**
- Toggle primary pencarian web
- Toggle fallback pencarian web
- Mesin pencarian fallback + jumlah hasil maksimal (muncul kalau fallback aktif)

### Validasi Utama

- `name` wajib non-kosong
- `temperature` 0..2
- `topP` 0..1 (jika diisi)
- `maxTokens` > 0 (jika diisi)
- `fallbackWebSearchMaxResults` 1..10

### Submit

**Create** (API key boleh kosong, akan pakai ENV di runtime):

```ts
await createMutation({
  requestorUserId: userId,
  name,
  description,
  primaryProvider,
  primaryModel,
  fallbackProvider,
  fallbackModel,
  gatewayApiKey,
  openrouterApiKey,
  temperature,
  topP,
  maxTokens,
  primaryWebSearchEnabled,
  fallbackWebSearchEnabled,
  fallbackWebSearchEngine,
  fallbackWebSearchMaxResults,
})
```

**Update** (hanya field berubah yang dikirim):

```ts
const updateArgs = {
  requestorUserId: userId,
  configId: config._id,
  temperature,
  topP,
  maxTokens,
  // plus field lain yang berubah
  gatewayApiKey,           // kalau diisi
  openrouterApiKey,        // kalau diisi
  gatewayApiKeyClear: true // kalau pilih "Pakai ENV"
  openrouterApiKeyClear: true
}
await updateMutation(updateArgs)
```

### Provider Validation

Endpoint: `POST /api/admin/validate-provider`

Payload:

```json
{
  "provider": "vercel-gateway" | "openrouter",
  "model": "...",
  "apiKey": "optional"
}
```

Catatan implementasi:
- `vercel-gateway` memakai `createGateway`.
- `openrouter` memakai `createOpenAI` dengan `baseURL` OpenRouter (bukan `createOpenRouter`).

### Verifikasi Kompatibilitas Tool (Fallback OpenRouter)

Endpoint: `POST /api/admin/verify-model-compatibility`

- Cuma muncul jika fallback provider = `openrouter`.
- Tes: generasi dasar, pemanggilan tool sederhana, pemanggilan tool kompleks, output terstruktur.
- Hasil ditampilkan sebagai level: `full` / `partial` / `incompatible`.

## Alur UI Singkat

```
Admin buka tab AI Providers
  -> listConfigs
  -> tabel config + aksi
  -> buat/edit via AIProviderFormDialog
  -> activate / swap / delete via dialog konfirmasi
```
