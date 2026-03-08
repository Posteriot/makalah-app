# Implementation Plan: Web Search Migration to Perplexity Sonar

**Date:** 2026-03-08
**Design Doc:** `docs/searchweb-tool/2026-03-08-perplexity-migration-design.md`
**Branch:** `feat/search-web-tool-enforcement`

## Phase 1 — Schema + New Files (No Behavior Change)

### 1.1 Update Convex schema

**File:** `convex/schema.ts`

Add to `aiProviderConfigs` table:
```typescript
webSearchModel: v.optional(v.string()),
webSearchFallbackModel: v.optional(v.string()),
```

### 1.2 Update Convex mutations

**File:** `convex/aiProviderConfigs.ts`

- Add `webSearchModel` and `webSearchFallbackModel` to `createConfig` args
- Add both fields to `updateConfig` args
- Add defaults in `getActiveConfig()`:
  ```typescript
  webSearchModel: activeConfig.webSearchModel ?? "perplexity/sonar",
  webSearchFallbackModel: activeConfig.webSearchFallbackModel ?? "x-ai/grok-3-mini",
  ```

### 1.3 Create blocked-domains.ts

**File (new):** `src/lib/ai/blocked-domains.ts`

```typescript
export const BLOCKED_DOMAINS = [...]
export function isBlockedSourceDomain(url: string): boolean
```

### 1.4 Create search-source-policy.ts

**File (new):** `src/lib/ai/search-source-policy.ts`

```typescript
export function getSourcePolicyPrompt(): string
```

**Important:** Source names in the policy prompt (Kompas, arxiv.org, World Bank, etc.) are illustrative examples prefixed with "e.g.", NOT a deterministic whitelist. The prompt must explicitly state "Do NOT limit yourself to only these names." This prevents the model from restricting its search scope to only named sources.

### 1.5 Verify

- `npx convex dev` accepts schema change
- New files have no import errors
- Existing behavior completely unchanged

---

## Phase 2 — Citation Normalization (No Behavior Change)

### 2.1 Add Perplexity normalizer

**File:** `src/lib/citations/normalizer.ts`

- Add `normalizePerplexityCitations(sources)` function (pure mapping, no filtering inside)
- Add `'perplexity'` case to `normalizeCitations()` dispatcher
- Add `isBlockedSourceDomain()` post-filter **once** in the dispatcher, after the switch/case returns — this ensures ALL providers (Perplexity, OpenRouter, Google) are filtered uniformly in a single place

### 2.2 Unit tests

- Test `normalizePerplexityCitations()` with mock Perplexity `sources` array
- Test `isBlockedSourceDomain()` with blocked URLs, allowed URLs, and **malformed URLs** (should return false, not throw)
- Test that `normalizeCitations()` dispatcher applies domain filter to ALL providers (pass a Google/OpenRouter result with a wikipedia.org citation — verify it's stripped)
- Test that existing `normalizeGoogleGrounding()` and `normalizeOpenAIAnnotations()` still work

### 2.3 Verify

- All existing citation tests pass
- New tests pass
- No behavior change in production (new normalizer not called yet)

---

## Phase 3 — Execution Mode + Model Provisioning

### 3.1 Update search execution mode

**File:** `src/lib/ai/search-execution-mode.ts`

- Rename `SearchExecutionMode` type:
  - `"primary_google_search"` -> `"primary_perplexity"`
  - `"fallback_online_search"` -> `"fallback_web_search"`
- Update `resolveSearchExecutionMode()` input params:
  - Remove: `primaryToolReady`
  - Add: `webSearchModel`, `webSearchFallbackModel`
- Update logic per design doc Section 4
- **Intended behavior:** If primary disabled + fallback enabled, `"fallback_web_search"` is returned directly (Grok becomes sole provider, not a fallback from anything). Document this in code comments.

### 3.2 Add web search model getters

**File:** `src/lib/ai/streaming.ts`

- Add `getWebSearchModel()` — returns OpenRouter model for Perplexity
- Add `getWebSearchFallbackModel()` — returns OpenRouter model for Grok with `web_search_options`
- Update `getWebSearchConfig()` to include new fields from DB

### 3.3 Update chat route — web search path

**File:** `src/app/api/chat/route.ts`

This is the largest and highest-risk change. Steps:

1. **Update mode resolution call** — pass new params to `resolveSearchExecutionMode()`
2. **Add message sanitization** — create `sanitizeMessagesForSearch(messages)` helper that strips tool call/result messages from conversation history before sending to Perplexity/Grok (different models that may not support Gemini's tool message format)
3. **Replace `primary_google_search` path:**
   - Remove: google_search tool wrapping, `maxToolSteps: 1`, `prepareStep`/`stopWhen` for google_search
   - Add: `getWebSearchModel()` call, source policy prompt injection, message sanitization
   - streamText with Perplexity model (no tools, no tool steps)
   - Extract citations from `result.sources` or `source` stream events
   - Citations pass through `normalizeCitations('perplexity')` which applies domain filter
4. **Replace `fallback_online_search` path:**
   - Remove: `:online` suffix logic
   - Add: `getWebSearchFallbackModel()` call, message sanitization
   - Inject `getSourcePolicyPrompt()` into system prompt (SAME policy as primary)
   - streamText with Grok model (web_search_options configured in model init)
   - Extract citations from annotations via `normalizeCitations('openrouter')` which applies domain filter
5. **Update system note injection** — replace "google_search" references with generic web search messaging
6. **Keep `blocked_unavailable` and `off` paths unchanged**

### 3.4 Verify

- Start dev servers: `npm run dev` + `npm run convex:dev`
- Test web search request — verify Perplexity responds with grounded content + citations
- Test fallback — simulate Perplexity failure, verify Grok fallback activates
- Test blocked — disable both toggles in admin, verify error UI
- Test non-search — verify normal chat (Gemini) still works unchanged
- Test paper workflow — verify mode alternation (search turn vs function tools turn) still works
- Verify citations render correctly in InlineCitationChip
- **Source diversity check:** Run 3-5 different web search queries (different topics). Verify that results include diverse source types (news media, academic, organizations) — NOT just .ac.id or .go.id. If results are narrow, review source policy prompt wording.
- **Source policy on fallback:** Trigger fallback path, verify Grok also receives source policy prompt and produces diverse sources
- **Blocked domain filter:** Search a topic known to surface Wikipedia. Verify Wikipedia URL does not appear in citation chips.
- **Tool call message handling:** In a paper workflow conversation (which has tool call history), trigger a web search. Verify Perplexity/Grok don't error on sanitized messages and still have enough context to produce relevant results. If context is lost, adjust sanitization strategy.

---

## Phase 4 — Admin Panel

### 4.1 Update AIProviderConfigEditor

**File:** `src/components/admin/AIProviderConfigEditor.tsx`

- Add info banner: "Semua pencarian web dirutekan melalui OpenRouter"
- Add `webSearchModel` text input (conditional on `primaryWebSearchEnabled`)
- Add `webSearchFallbackModel` text input (conditional on `fallbackWebSearchEnabled`)
- Update helper texts:
  - Primary: "Model pencarian web utama (via OpenRouter)"
  - Fallback: "Fallback jika model utama gagal (via OpenRouter)"
- Add both fields to state management, change detection, and mutation payloads

### 4.2 Update AIProviderFormDialog (if applicable)

**File:** `src/components/admin/AIProviderFormDialog.tsx`

- Mirror same changes as ConfigEditor for dialog form

### 4.3 Update WebSearchChip display (if applicable)

**File:** `src/components/admin/AIProviderManager.tsx`

- Update status chip to show model names instead of just on/off

### 4.4 Verify

- Open admin panel -> AI Providers -> Edit config
- Verify Web Search Settings shows new fields
- Change model IDs, save, verify persisted in DB
- Toggle switches, verify conditional fields show/hide correctly

---

## Phase 5 — Cleanup

### 5.1 Remove google-search-tool.ts

**File (delete):** `src/lib/ai/google-search-tool.ts`

### 5.2 Remove unused imports

- Remove `google_search` references from chat route
- Remove `initGoogleSearchTool` imports
- Remove `GoogleSearchToolInitResult` type imports
- Remove `SearchToolUnavailableError` if no longer used
- Remove `@ai-sdk/google` dependency from package.json (if solely used for google_search)

### 5.3 Update CLAUDE.md

- Update Web Search section with new architecture
- Update AI SDK section mentioning Perplexity
- Update Key Files list
- Remove google_search references

### 5.4 Seed migration

Create seed script to update existing active config:
```typescript
// Set default web search models for existing configs
webSearchModel: "perplexity/sonar"
webSearchFallbackModel: "x-ai/grok-3-mini"
```

### 5.5 Final verification

- `npm run build` — no build errors
- `npm run lint` — no lint errors
- `npm run test` — all tests pass
- Full manual test: web search, fallback, blocked, non-search, paper workflow, citations
- Verify admin panel reflects all changes

---

## Risk Checkpoints

| After Phase | Check | Rollback |
|-------------|-------|----------|
| Phase 1 | Schema deploys, no runtime errors | Revert schema (fields are optional, safe) |
| Phase 2 | Existing tests pass, new tests pass | Revert normalizer changes |
| Phase 3 | Web search works end-to-end | Revert chat route changes (biggest risk) |
| Phase 4 | Admin panel functional | Revert component changes |
| Phase 5 | Clean build, no dead code | N/A (cleanup only) |

## Dependencies

- `@openrouter/ai-sdk-provider` — already installed
- `OPENROUTER_API_KEY` — already configured
- No new package installations needed (Perplexity accessed via OpenRouter, not `@ai-sdk/perplexity`)
