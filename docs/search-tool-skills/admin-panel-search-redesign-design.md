# Admin Panel — Web Search Retrievers Redesign

## Problem

The current admin panel web search section uses toggle switches + free-text model inputs. This has two issues:

1. **`fromTwoSlotFields()` in config-builder hardcodes primary→perplexity, fallback→grok.** Toggling or swapping has no effect on which retriever is used — only on whether a slot is enabled.
2. **No way to select new retrievers** (Google Grounding Gemini, OpenAI Search) without manually typing model IDs that may not match the retriever's source extraction logic.

The orchestrator is already agnostic — it runs any retriever in the chain. The admin panel needs to catch up.

## Approach

Use the existing `webSearchRetrievers` array field (already in Convex schema) instead of the two-slot legacy fields. Admin panel writes this array; `fromRetrieverArray()` in config-builder (already implemented) reads it. Zero backend pipeline changes needed.

Legacy fields (`primaryWebSearchEnabled`, `webSearchModel`, etc.) remain untouched for backward compatibility — `fromTwoSlotFields()` still reads them if `webSearchRetrievers` is undefined.

## Preset Registry

Fixed dropdown options. No custom model input — each retriever has specific source extraction logic that must match the model.

```ts
const RETRIEVER_PRESETS = [
  { key: "perplexity",       label: "Perplexity Sonar",           modelId: "perplexity/sonar",   provider: "openrouter" },
  { key: "grok",             label: "Grok Mini",                  modelId: "x-ai/grok-3-mini",   provider: "openrouter" },
  { key: "google-grounding", label: "Google Grounding Gemini",    modelId: "gemini-2.5-flash",   provider: "google-ai-studio" },
  { key: "openai-search",    label: "OpenAI GPT-4o Mini",         modelId: "openai/gpt-4o-mini", provider: "openrouter" },
] as const
```

Dropdown shows `label` + an additional "Disabled" option (value `""`).

## UI Layout

Replaces current toggle+text section in `AIProviderConfigEditor.tsx`:

```
┌─ Web Search Retrievers ──────────────────────────┐
│                                                   │
│  ℹ️ "Pencarian web via OpenRouter atau Google     │
│      Grounding Gemini"                            │
│                                                   │
│  Primary Search Retriever                         │
│  ┌──────────────────────────────────────┐         │
│  │ Perplexity Sonar                   ▼ │         │
│  └──────────────────────────────────────┘         │
│  Model: perplexity/sonar              (read-only) │
│                                                   │
│           [ ⇅ Tukar Posisi ]                      │
│                                                   │
│  Fallback Search Retriever                        │
│  ┌──────────────────────────────────────┐         │
│  │ Grok Mini                          ▼ │         │
│  └──────────────────────────────────────┘         │
│  Model: x-ai/grok-3-mini             (read-only) │
│                                                   │
└───────────────────────────────────────────────────┘
```

- **Dropdown**: `Select` component, 5 options (Disabled + 4 presets)
- **Model hint**: `text-[10px] text-muted-foreground`, read-only, auto-derived from preset
- **Swap button**: `DataTransferBoth` icon + "Tukar Posisi", centered between dropdowns. Disabled when either slot is Disabled
- **Validation**: Primary and Fallback cannot be the same (except both Disabled). Inline error on duplicate

### Removed from current UI

- Toggle switches (replaced by "Disabled" dropdown option)
- Free-text model inputs (replaced by read-only preset-derived hint)
- Grok engine dropdown and maxResults input (use defaults, can add later)

## Data Flow

### Save (Admin Panel → DB)

Admin panel writes `webSearchRetrievers` array:

```json
[
  { "name": "perplexity", "enabled": true, "modelId": "perplexity/sonar", "priority": 0 },
  { "name": "grok", "enabled": true, "modelId": "x-ai/grok-3-mini", "priority": 1 }
]
```

Rules:
- Primary dropdown → entry with `priority: 0`
- Fallback dropdown → entry with `priority: 1`
- "Disabled" → entry not included in array
- Both Disabled → empty array `[]`

### Read (DB → Orchestrator)

Existing flow, no changes needed:
1. `getWebSearchConfig()` returns `webSearchRetrievers` from DB
2. `config-builder.ts` detects array → calls `fromRetrieverArray()`
3. `fromRetrieverArray()` builds chain sorted by priority
4. Orchestrator runs chain with failover

### Read (DB → Admin Panel form)

When editor opens for edit:
1. Read `webSearchRetrievers` from config
2. Entry with `priority: 0` → set primary dropdown
3. Entry with `priority: 1` → set fallback dropdown
4. If array empty/undefined → fallback to two-slot fields for backward compat
5. If two-slot fields also absent → default Perplexity primary, Grok fallback

### Swap

Frontend-only: swap two dropdown values in local state. On save, priority assignment follows position (primary=0, fallback=1). No separate swap mutation needed.

## File Changes

### Modified

| File | Change |
|---|---|
| `config-builder.ts` | Rename `fromNewFormat()` → `fromRetrieverArray()`, `fromLegacyFormat()` → `fromTwoSlotFields()` |
| `AIProviderConfigEditor.tsx` | Replace web search section: dropdowns + swap + read-only hint |
| `convex/aiProviderConfigs.ts` | Add `webSearchRetrievers` to `updateConfig` and `createConfig` mutation args |
| `AIProviderManager.tsx` | Update web search chip display in ConfigCard |

| `config-cache.ts` | Add `webSearchRetrievers` to `AIProviderConfig` interface (currently accessed via `as any`) |
| `convex/aiProviderConfigs.ts` | Also: preserve `webSearchRetrievers` in `swapProviders` mutation insert |
| `src/lib/ai/telemetry.ts` | Add `retrieverName` field to telemetry type |
| `convex/schema.ts` | Add `retrieverName` to `aiTelemetry` table validator |
| `src/app/api/chat/route.ts` | Log `retrieverName` in telemetry call + update console log for array format |
| `src/lib/ai/web-search/orchestrator.ts` | Remove debug log |

### Not Modified

| File | Reason |
|---|---|
| `streaming.ts` | `getWebSearchConfig()` already returns `webSearchRetrievers` |
| `retrievers/*.ts` | Already registered and functional |
| `retriever-registry.ts` | 4 retrievers already registered |

## Audit Gaps (Post-Design Review)

Six gaps identified by cross-referencing design against all related files:

### Gap 1 (CRITICAL): `AIProviderConfig` interface missing `webSearchRetrievers`
**File**: `src/lib/ai/config-cache.ts`
The TypeScript interface doesn't declare `webSearchRetrievers`. `getWebSearchConfig()` accesses it via `(config as any).webSearchRetrievers` — fragile, no type safety.
**Fix**: Add field to interface.

### Gap 2 (CRITICAL): `updateConfig` mutation doesn't preserve `webSearchRetrievers`
**File**: `convex/aiProviderConfigs.ts`
When creating a new version, `webSearchRetrievers` isn't copied from old config. Any edit (temperature, model, etc.) causes the array to be lost.
**Fix**: Add to mutation args + merge logic + insert statement.

### Gap 3 (CRITICAL): `swapProviders` mutation doesn't preserve `webSearchRetrievers`
**File**: `convex/aiProviderConfigs.ts`
When swapping AI providers, new version is created without `webSearchRetrievers`. Array lost on swap.
**Fix**: Add `webSearchRetrievers: config.webSearchRetrievers` to insert statement.

### Gap 4 (MEDIUM): Telemetry doesn't log which retriever actually succeeded
**Files**: `src/lib/ai/telemetry.ts`, `convex/schema.ts`, `src/app/api/chat/route.ts`
Orchestrator returns `result.retrieverName` but it's only used to derive `provider` field. The actual retriever name string (e.g., "perplexity", "grok") is not stored.
**Fix**: Add `retrieverName` field to telemetry type, schema, and log call.

### Gap 5 (MEDIUM): Console log in route.ts only shows legacy fields
**File**: `src/app/api/chat/route.ts` line 2017
Log shows `primaryEnabled=X, fallbackEnabled=Y` — not useful when using array format.
**Fix**: Update log to also show retriever array info.

### Gap 6 (LOW): Debug log still present in orchestrator
**File**: `src/lib/ai/web-search/orchestrator.ts` line 80
Development debug log `[Orchestrator] ${retriever.name}: text=Xchars...` still in code.
**Fix**: Remove.
