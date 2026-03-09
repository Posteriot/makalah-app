# Two-Pass Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace direct Perplexity-to-user streaming with silent Perplexity search → Gemini compose with skill instructions, so research methodology skills actually affect the response.

**Architecture:** Phase 1 (Perplexity searches silently, `await .text` + `.sources`) → source pipeline (normalize, score, enrich, dedup) → Phase 2 (Gemini `streamText()` with skill instructions + sources as context, streams to user). Same treatment for Grok fallback. UI shows "Mencari sumber..." then "Menyusun jawaban...".

**Tech Stack:** Vercel AI SDK v5 (`streamText`, `createUIMessageStream`), Gemini 2.5 Flash (compose), Perplexity Sonar (search), existing skill system (`composeSkillInstructions`)

**Design doc:** `docs/skill-wrapped-tools/skill-search-tool/two-pass-search-design.md`

---

### Task 1: Create `buildSearchResultsContext()` helper

**Files:**
- Create: `src/lib/ai/search-results-context.ts`
- Test: `__tests__/ai/search-results-context.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/ai/search-results-context.test.ts
import { describe, it, expect } from "vitest"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"

describe("buildSearchResultsContext", () => {
  it("should format sources with titles, URLs, and tiers", () => {
    const sources = [
      { url: "https://bps.go.id/stats", title: "BPS Statistics 2025", tier: "institutional" as const, score: 80 },
      { url: "https://arxiv.org/paper", title: "AI Impact Study", tier: "academic" as const, score: 90 },
    ]
    const rawText = "AI has significant impact on employment..."

    const result = buildSearchResultsContext(sources, rawText)

    expect(result).toContain("SEARCH RESULTS")
    expect(result).toContain("BPS Statistics 2025")
    expect(result).toContain("https://bps.go.id/stats")
    expect(result).toContain("institutional")
    expect(result).toContain("AI Impact Study")
    expect(result).toContain("academic")
    expect(result).toContain("AI has significant impact")
    expect(result).toContain("ONLY these sources")
  })

  it("should handle empty sources gracefully", () => {
    const result = buildSearchResultsContext([], "some text")

    expect(result).toContain("No sources found")
  })

  it("should handle sources without tier info", () => {
    const sources = [
      { url: "https://example.com/article", title: "Some Article" },
    ]
    const result = buildSearchResultsContext(sources, "text")

    expect(result).toContain("Some Article")
    expect(result).toContain("https://example.com/article")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/ai/search-results-context.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/lib/ai/search-results-context.ts

interface SearchSource {
  url: string
  title: string
  tier?: string
  score?: number
}

export function buildSearchResultsContext(
  sources: SearchSource[],
  rawSearchText: string
): string {
  if (sources.length === 0) {
    return `## SEARCH RESULTS\nNo sources found from web search. Answer based on your knowledge and inform the user that no web sources were available.`
  }

  const sourceList = sources
    .map((s, i) => {
      const tierLabel = s.tier ? ` (${s.tier})` : ""
      return `${i + 1}. ${s.title} — ${s.url}${tierLabel}`
    })
    .join("\n")

  return `## SEARCH RESULTS
You have the following sources from web search.
Use ONLY these sources for citations. Do not fabricate or guess URLs.

Sources:
${sourceList}

Raw search summary (use as reference for context, compose your own narrative):
${rawSearchText}`
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/ai/search-results-context.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/ai/search-results-context.ts __tests__/ai/search-results-context.test.ts
git commit -m "feat: add buildSearchResultsContext helper for two-pass search"
```

---

### Task 2: Add "composing" search status to frontend

**Files:**
- Modify: `src/components/chat/SearchStatusIndicator.tsx`
- Test: manual — verify `"composing"` renders correctly

**Step 1: Update SearchStatus type and rendering**

In `src/components/chat/SearchStatusIndicator.tsx`:

Change line 6:
```typescript
export type SearchStatus = "searching" | "composing" | "done" | "off" | "error"
```

Change line 20 (isProcessing):
```typescript
const isProcessing = status === "searching" || status === "composing" || status === "done"
```

Add shimmer text for composing in `SHIMMER_TEXTS` set (line 14):
```typescript
const SHIMMER_TEXTS = new Set(["Pencarian internet...", "Pencarian web", "Menyusun jawaban..."])
```

Add composing case in `resolveText` function (after line 66):
```typescript
if (status === "composing") return "Menyusun jawaban..."
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: clean

**Step 3: Commit**

```bash
git add src/components/chat/SearchStatusIndicator.tsx
git commit -m "feat: add composing search status for two-pass search UX"
```

---

### Task 3: Refactor Perplexity primary path to two-pass

This is the main change. Replace direct Perplexity streaming with silent search → Gemini compose.

**Files:**
- Modify: `src/app/api/chat/route.ts` (lines ~2248-2640)

**Step 1: Understand the current structure**

The web search block (line 2248: `if (enableWebSearch)`) currently:
1. Calls `streamText({ model: webSearchModel, ... })` (line 2269)
2. Creates `createUIMessageStream()` (line 2276)
3. Inside execute: iterates `perplexityResult.toUIMessageStream()` (line 2326)
4. Streams text-delta chunks directly to user (line 2635)
5. On finish: extracts sources, normalizes, scores, enriches, deduplicates (lines 2378-2428)
6. Writes data-cited-text + data-cited-sources (lines 2447-2468)
7. Persists message + sources to DB (lines 2486-2523)
8. Returns response (line 2640)

**Step 2: Rewrite the web search block**

Replace lines 2269-2640 with this structure (keep surrounding code — the `if (enableWebSearch)` guard, IDs, trace controller):

```typescript
// ═══════════════════════════════════════════════════
// TWO-PASS: Phase 1 — Silent Perplexity search
// ═══════════════════════════════════════════════════
const perplexityResult = streamText({
    model: webSearchModel,
    messages: sanitizedMessages,
    ...samplingOptions,
})

// Await full result silently (not streamed to user)
const [searchText, rawSources] = await Promise.all([
    perplexityResult.text,
    (async () => {
        try {
            return await Promise.race([
                perplexityResult.sources,
                new Promise<undefined>((resolve) =>
                    setTimeout(() => resolve(undefined), 4000)
                ),
            ])
        } catch {
            return undefined
        }
    })(),
])

// Source pipeline (same as before — normalize, score, enrich, dedup)
const normalizedCitations = normalizeCitations(rawSources, 'perplexity')
const qualityInput = normalizedCitations.map(c => ({
    url: normalizeWebSearchUrl(c.url),
    title: c.title || c.url,
}))
const qualityResult = validateWithScores({ sources: qualityInput })

let sources: { url: string; title: string; publishedAt?: number | null }[] =
    qualityResult.scoredSources
        ? qualityResult.scoredSources.map(s => ({ url: s.url, title: s.title }))
        : qualityInput.filter(c => !isGarbageUrl(c.url))

if (qualityResult.filteredOut?.length) {
    console.log(`[source-quality] Filtered ${qualityResult.filteredOut.length} low-quality sources`)
}
if (qualityResult.diversityWarning) {
    console.log(`[source-quality] ${qualityResult.diversityWarning}`)
}

if (sources.length > 0) {
    sources = await enrichSourcesWithFetchedTitles(sources, {
        concurrency: 4,
        timeoutMs: 2500,
    })
    sources = sources.filter((s) => !(s as { _unreachable?: true })._unreachable)

    const canonicalizeCitationUrl = (raw: string) => {
        try {
            const u = new URL(raw)
            for (const key of Array.from(u.searchParams.keys())) {
                if (/^utm_/i.test(key)) u.searchParams.delete(key)
            }
            u.hash = ""
            const out = u.toString()
            return out.endsWith("/") ? out.slice(0, -1) : out
        } catch {
            return raw
        }
    }
    const deduped = new Map<string, typeof sources[0]>()
    for (const src of sources) {
        const key = canonicalizeCitationUrl(src.url)
        if (!deduped.has(key)) deduped.set(key, src)
    }
    sources = Array.from(deduped.values())
}

// ═══════════════════════════════════════════════════
// TWO-PASS: Phase 2 — Gemini compose with skills
// ═══════════════════════════════════════════════════
const { buildSearchResultsContext } = await import("@/lib/ai/search-results-context")

const composeSkillContext: SkillContext = {
    isPaperMode: !!paperModePrompt,
    currentStage: paperSession?.currentStage ?? null,
    hasRecentSources: sources.length > 0,
    availableSources: sources,
}

const scoredSourcesForContext = qualityResult.scoredSources ?? sources.map(s => ({
    ...s,
    tier: "unknown" as const,
    score: 40,
}))

const composeMessages = [
    { role: "system" as const, content: systemPrompt },
    ...(paperModePrompt
        ? [{ role: "system" as const, content: paperModePrompt }]
        : []),
    ...(paperWorkflowReminder
        ? [{ role: "system" as const, content: paperWorkflowReminder }]
        : []),
    { role: "system" as const, content: composeSkillInstructions(composeSkillContext) },
    { role: "system" as const, content: buildSearchResultsContext(scoredSourcesForContext, searchText) },
    ...(fileContext
        ? [{ role: "system" as const, content: `File Context:\n\n${fileContext}` }]
        : []),
    ...trimmedModelMessages,
]

const composeModel = model // Primary Gemini model (already resolved)
const composeResult = streamText({
    model: composeModel,
    messages: composeMessages,
    // No tools in compose phase — pure text generation with source references
    ...samplingOptions,
})

// Stream Phase 2 to user
const stream = createUIMessageStream({
    execute: async ({ writer }) => {
        let composedText = ""

        writer.write({ type: "start", messageId })

        // Phase 1 status: searching
        writer.write({
            type: "data-search",
            id: searchStatusId,
            data: { status: "searching" },
        })

        // Phase 1 → Phase 2 transition
        writer.write({
            type: "data-search",
            id: searchStatusId,
            data: { status: "composing", sourceCount: sources.length },
        })

        // Stream Gemini's compose output
        for await (const chunk of composeResult.toUIMessageStream({
            sendStart: false,
            generateMessageId: () => messageId,
        })) {
            if (chunk.type === "text-delta") {
                composedText += chunk.delta
            }

            if (chunk.type === "finish") {
                // Build citations from sources (same paragraph-end format)
                const persistedSources = sources.length > 0 ? sources : undefined
                const citationAnchors = sources.map((_, idx) => ({
                    position: null as number | null,
                    sourceNumbers: [idx + 1],
                }))
                const textWithInlineCitations = sources.length > 0
                    ? formatParagraphEndCitations({
                        text: composedText,
                        sources,
                        anchors: citationAnchors,
                    })
                    : composedText
                const userFacingPayload = buildUserFacingSearchPayload(textWithInlineCitations)

                writer.write({
                    type: "data-search",
                    id: searchStatusId,
                    data: { status: persistedSources ? "done" : "off" },
                })

                writer.write({
                    type: "data-cited-text",
                    id: citedTextId,
                    data: { text: userFacingPayload.citedText },
                })

                if (userFacingPayload.internalThoughtText) {
                    writer.write({
                        type: "data-internal-thought",
                        id: internalThoughtId,
                        data: { text: userFacingPayload.internalThoughtText },
                    })
                }

                if (persistedSources && persistedSources.length > 0) {
                    writer.write({
                        type: "data-cited-sources",
                        id: citedSourcesId,
                        data: { sources: persistedSources },
                    })
                }

                // Persist
                await saveAssistantMessage(
                    textWithInlineCitations,
                    persistedSources,
                    `${webSearchModelName}+${modelNames.primary.model}`,
                    undefined // reasoning trace TBD
                )

                if (paperSession && persistedSources && persistedSources.length > 0) {
                    try {
                        await fetchMutationWithToken(api.paperSessions.appendSearchReferences, {
                            sessionId: paperSession._id,
                            references: persistedSources.map(s => ({
                                url: s.url,
                                title: s.title,
                                ...(typeof s.publishedAt === "number" && Number.isFinite(s.publishedAt)
                                    ? { publishedAt: s.publishedAt }
                                    : {}),
                            })),
                        })
                    } catch (err) {
                        console.error("[Paper] Failed to auto-persist search references:", err)
                    }
                }

                // Billing: record both search + compose tokens
                const searchUsage = await perplexityResult.usage
                const composeUsage = (chunk as { usage?: { inputTokens?: number; outputTokens?: number } }).usage
                const totalInput = (searchUsage?.inputTokens ?? 0) + (composeUsage?.inputTokens ?? 0)
                const totalOutput = (searchUsage?.outputTokens ?? 0) + (composeUsage?.outputTokens ?? 0)
                if (totalInput > 0 || totalOutput > 0) {
                    await recordUsageAfterOperation({
                        userId: billingContext.userId,
                        conversationId: currentConversationId as Id<"conversations">,
                        sessionId: paperSession?._id,
                        inputTokens: totalInput,
                        outputTokens: totalOutput,
                        totalTokens: totalInput + totalOutput,
                        model: `${webSearchModelName}+${modelNames.primary.model}`,
                        operationType: "web_search",
                        convexToken,
                    }).catch(err => console.error("[Billing] Failed to record usage:", err))
                }

                // Telemetry
                const sourceQualityTelemetry = {
                    searchSkillApplied: true,
                    searchSkillName: "source-quality",
                    searchSkillAction: qualityResult.valid ? "scored" : "rejected",
                    sourcesScored: (qualityResult.scoredSources?.length ?? 0) + (qualityResult.filteredOut?.length ?? 0),
                    sourcesFiltered: qualityResult.filteredOut?.length ?? 0,
                    sourcesPassedTiers: JSON.stringify(
                        (qualityResult.scoredSources ?? []).reduce((acc: Record<string, number>, s) => {
                            acc[s.tier] = (acc[s.tier] ?? 0) + 1
                            return acc
                        }, {} as Record<string, number>)
                    ),
                    diversityWarning: qualityResult.diversityWarning,
                }
                logAiTelemetry({
                    token: convexToken,
                    userId: userId as Id<"users">,
                    conversationId: currentConversationId as Id<"conversations">,
                    provider: "openrouter",
                    model: `${webSearchModelName}+${modelNames.primary.model}`,
                    isPrimaryProvider: true,
                    failoverUsed: false,
                    toolUsed: "two_pass_search",
                    mode: "websearch",
                    success: true,
                    latencyMs: Date.now() - telemetryStartTime,
                    inputTokens: totalInput,
                    outputTokens: totalOutput,
                    ...telemetrySkillContext,
                    ...sourceQualityTelemetry,
                })

                // Title generation
                const minPairsForFinalTitle = Number.parseInt(
                    process.env.CHAT_TITLE_FINAL_MIN_PAIRS ?? "3",
                    10
                )
                await maybeUpdateTitleFromAI({
                    assistantText: textWithInlineCitations,
                    minPairsForFinalTitle: Number.isFinite(minPairsForFinalTitle)
                        ? minPairsForFinalTitle
                        : 3,
                })

                writer.write(chunk)
                break
            }

            if (chunk.type === "error") {
                writer.write({
                    type: "data-search",
                    id: searchStatusId,
                    data: { status: "error" },
                })
                writer.write(chunk)
                break
            }

            // Forward text-delta and other chunks to user
            writer.write(chunk)
        }
    },
})

return createUIMessageStreamResponse({ stream })
```

**Step 3: Remove `webSearchBehaviorSystemNote` from primary path messages**

Since Perplexity no longer needs tool-avoidance instructions (it's called silently, not streamed), the `webSearchBehaviorSystemNote` is no longer injected into the primary web search path. It was at `fullMessagesGateway` line 2187.

However, `webSearchBehaviorSystemNote` is still built (line 1791) and may still be used by Grok fallback. Keep the definition, just don't inject it for Perplexity.

The `fullMessagesGateway` enableWebSearch branch (line 2185-2199) can be simplified since Perplexity now uses `sanitizedMessages` directly (no need for separate fullMessagesGateway construction for search). The non-web-search branch remains unchanged.

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: clean (may have warnings about unused vars to clean up)

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: implement two-pass search for primary Perplexity path"
```

---

### Task 4: Refactor Grok fallback path to two-pass

Same treatment as Task 3 but for the Grok fallback (line ~3157-3500+).

**Files:**
- Modify: `src/app/api/chat/route.ts` (Grok fallback section)

**Step 1: Apply same two-pass pattern**

The Grok fallback currently:
1. Calls `streamText({ model: fallbackSearchModel, ... })` (line 3235)
2. Streams chunks directly to user
3. On finish: extracts sources from OpenRouter annotations, normalizes, scores

Rewrite to:
1. `await fallbackSearchResult.text` + extract sources (silent)
2. Same source pipeline
3. Gemini compose with skills + stream to user

The structure is identical to Task 3 but with these differences:
- Source extraction uses `normalizeCitations(providerMetadata, 'openrouter')` instead of `perplexityResult.sources`
- `providerMetadata` must be awaited from `fallbackSearchResult.providerMetadata`
- Quality scoring uses `grokQualityInput` / `grokQualityResult` variable names
- Telemetry logs `toolUsed: "two_pass_search_fallback"`

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: clean

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: implement two-pass search for Grok fallback path"
```

---

### Task 5: Handle "composing" status in SearchStatusIndicator data flow

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx` or `src/components/chat/MessageBubble.tsx` (wherever `data-search` is consumed)

**Step 1: Find where data-search status is parsed**

Search for where `"data-search"` type is handled in the frontend. The `SearchStatusIndicator` receives a `status` prop — trace where that prop comes from.

**Step 2: Ensure "composing" flows through**

The `SearchStatus` type was updated in Task 2. Verify the parsing layer passes `"composing"` through without filtering. If the parsing does `status === "searching" ? ... : ...`, add `"composing"` handling.

Also verify that `sourceCount` from `{ status: "composing", sourceCount: N }` is accessible if we want to show "Menyusun jawaban dari N sumber...".

**Step 3: Update resolveText to use sourceCount if available**

In `SearchStatusIndicator.tsx`, if sourceCount is passed:
```typescript
if (status === "composing") {
    return sourceCount ? `Menyusun jawaban dari ${sourceCount} sumber...` : "Menyusun jawaban..."
}
```

This may require extending `SearchStatusIndicatorProps` to include optional `sourceCount`.

**Step 4: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -10`

**Step 5: Commit**

```bash
git add src/components/chat/SearchStatusIndicator.tsx src/components/chat/ChatWindow.tsx
git commit -m "feat: handle composing status in search indicator with source count"
```

---

### Task 6: Clean up unused code

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Remove `webSearchBehaviorSystemNote` from Perplexity path**

The system note that tells Perplexity "do not call tools" is no longer needed since Perplexity is called silently. However, check if Grok fallback still needs it — if Grok fallback is also two-pass now, the note can be removed entirely.

**Step 2: Clean up `fullMessagesGateway` construction**

If `enableWebSearch` no longer needs a separate message array for Perplexity (since Perplexity uses `sanitizedMessages` directly), simplify or remove the web search branch of `fullMessagesGateway`.

**Step 3: Remove old streaming code that's been replaced**

Any dead code from the old direct-streaming Perplexity path that wasn't caught during Task 3/4.

**Step 4: Verify tests pass + tsc clean**

Run: `npm run test && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor: clean up unused code after two-pass search migration"
```

---

### Task 7: End-to-end verification

**Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass (395+)

**Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: clean

**Step 3: Manual testing from chat UI**

Test the following scenarios:

**Scenario A: Chat mode web search**
1. Open chat at localhost:3000/chat
2. Ask: "Apa dampak AI terhadap pasar tenaga kerja di Indonesia?"
3. Observe: "Mencari sumber..." → "Menyusun jawaban dari N sumber..." → Gemini streams response
4. Verify: Response cites sources, narrative integrates sources (not just lists them)
5. Check ai-ops Search Skill Monitor: skill applied, sources scored

**Scenario B: Paper mode web search**
1. Start paper session, go to gagasan stage
2. Ask something that triggers web search
3. Verify same two-pass flow works in paper context

**Scenario C: Compare with remote (production)**
1. Ask same question on production (old behavior)
2. Compare: local should show different narrative style (source integration, methodology)

**Scenario D: Error handling**
1. Temporarily misconfigure web search model in admin
2. Verify graceful fallback (Grok → normal mode)

**Step 4: Commit verification results**

```bash
git commit --allow-empty -m "test: verify two-pass search end-to-end"
```
