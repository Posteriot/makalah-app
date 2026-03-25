# NLP-1 + NLP-2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Save ~3.4s total latency by (1) skipping the LLM search router when RAG chunks already satisfy the request, and (2) parallelizing paper prompt queries after `getSession`.

**Architecture:** NLP-1 moves the existing deterministic RAG override from post-router to pre-router position in `route.ts`, so requests that match the condition skip the ~2.5s LLM router entirely. NLP-2 converts three sequential Convex queries in `paper-mode-prompt.ts` into a parallel `Promise.allSettled` batch after `getSession` completes.

**Tech Stack:** Next.js 16, AI SDK v6, Convex, TypeScript

**Source documents:**
- `docs/search-fetch-rag-jsonRenderer-reinforcement/stream-delivery-gap/next-latency-priorities.md`
- `docs/search-fetch-rag-jsonRenderer-reinforcement/stream-delivery-gap/verdict.md`

---

## Task 1: Move RAG override to pre-router (NLP-1)

This is the highest-impact change. The RAG override logic at `route.ts:2041-2055`
currently runs AFTER the LLM router (`decideWebSearchMode` at `:1967`), so
every request pays ~2.5s for the router even when the override will skip
search anyway.

The logic is pure deterministic: `ragChunksAvailable && searchAlreadyDone &&
!wantsNewSearch`. It does not use any LLM router output. It can be safely
moved to run before the router.

**Files:**
- Modify: `src/app/api/chat/route.ts:1940-2057` (search mode decision block)

**Step 1: Read the current pre-router guardrails to understand insertion point**

Current structure at `route.ts:1940-1957`:
```
if (forcePaperToolsMode && !hasExplicitSearchIntent)        → skip search
else if (forcePaperToolsMode && hasExplicitSearchIntent)    → allow search
else if (!paperModePrompt && userMessageCount <= 1 && ...)  → fast path: always search
else                                                         → LLM router (2.5s)
```

The RAG override needs to be added as a new `else if` branch BEFORE the
`else` (LLM router) branch.

**Step 2: Extract the RAG override logic from post-router to pre-router**

The existing post-router RAG override at `route.ts:2041-2055` is:
```typescript
if (searchRequestedByPolicy && ragChunksAvailable && searchAlreadyDone) {
    const lastUserMsg = (recentForRouter
        .filter((m: { role?: string }) => m.role === "user")
        .pop() as { content?: string } | undefined)?.content ?? ""
    const msgLower = typeof lastUserMsg === "string" ? lastUserMsg.toLowerCase() : ""
    const wantsNewSearch = /\b(cari\s+(lagi|lebih|baru|tentang)|tambah\s+sumber|search\s+(again|for|more)|referensi\s+(baru|tambahan)|sumber\s+(baru|lain))\b/i.test(msgLower)
    if (!wantsNewSearch) {
        searchRequestedByPolicy = false
        activeStageSearchReason = "rag_chunks_available"
        activeStageSearchNote = getFunctionToolsModeNote("RAG tools available for existing sources")
        console.log("[SearchDecision] RAG override: chunks available, no explicit new-search trigger → enableWebSearch=false")
    }
}
```

Move this to a new `else if` branch. The condition
`searchRequestedByPolicy && ragChunksAvailable && searchAlreadyDone` becomes
just `ragChunksAvailable && searchAlreadyDone` (because `searchRequestedByPolicy`
hasn't been set yet in the pre-router context — it defaults to `false`).

Insert this new branch AFTER the existing fast-path (`!paperModePrompt &&
userMessageCount <= 1 && !searchAlreadyDone`) but BEFORE the `else` (LLM
router):

```typescript
} else if (ragChunksAvailable && searchAlreadyDone) {
    // Pre-router RAG override: if RAG chunks already exist and search was
    // already done, skip the LLM router (~2.5s) unless user explicitly
    // requests new sources. This is pure deterministic — no LLM needed.
    const lastUserMsg = (recentForRouter
        .filter((m: { role?: string }) => m.role === "user")
        .pop() as { content?: string } | undefined)?.content ?? ""
    const msgLower = typeof lastUserMsg === "string" ? lastUserMsg.toLowerCase() : ""
    const wantsNewSearch = /\b(cari\s+(lagi|lebih|baru|tentang)|tambah\s+sumber|search\s+(again|for|more)|referensi\s+(baru|tambahan)|sumber\s+(baru|lain))\b/i.test(msgLower)

    if (!wantsNewSearch) {
        searchRequestedByPolicy = false
        activeStageSearchReason = "rag_chunks_available_pre_router"
        activeStageSearchNote = getFunctionToolsModeNote("RAG tools available for existing sources")
        console.log("[SearchDecision] Pre-router RAG override: chunks available, search done, no new-search trigger → skip router")
    } else {
        // User wants new sources — fall through to LLM router
        // (handled by the else branch below)
    }
}
```

Important: when `wantsNewSearch` is true, this branch sets nothing and the
code must fall through to the LLM router. But `else if` doesn't allow
fallthrough. So the structure needs to be:

```typescript
} else if (ragChunksAvailable && searchAlreadyDone && !wantsNewSearchCheck()) {
    // RAG override — skip router
} else {
    // LLM router
}
```

The cleanest approach: extract the `wantsNewSearch` check into a local
variable computed BEFORE the if-else chain (alongside `hasExplicitSearchIntent`),
then use it in the condition.

**Step 3: Implement the restructure**

BEFORE the if-else chain (near line 1942 where `hasExplicitSearchIntent` is
computed), add:

```typescript
// Pre-compute new-search intent for RAG override (used in pre-router fast path)
const wantsNewSearch =
    ragChunksAvailable &&
    searchAlreadyDone &&
    /\b(cari\s+(lagi|lebih|baru|tentang)|tambah\s+sumber|search\s+(again|for|more)|referensi\s+(baru|tambahan)|sumber\s+(baru|lain))\b/i.test(normalizedLastUserContentLower)
```

Use `normalizedLastUserContentLower` that already exists in `route.ts`
instead of re-deriving the last user message from `recentForRouter`.
This keeps the pre-router check cheaper and avoids duplicating message
selection logic.

Then add the new branch in the if-else chain:

```typescript
} else if (ragChunksAvailable && searchAlreadyDone && !wantsNewSearch) {
    // Pre-router RAG override: RAG chunks exist, search done, user not
    // requesting new sources. Skip LLM router (~2.5s saved).
    searchRequestedByPolicy = false
    activeStageSearchReason = "rag_chunks_available_pre_router"
    activeStageSearchNote = getFunctionToolsModeNote("RAG tools available for existing sources")
    console.log("[SearchDecision] Pre-router RAG override: chunks available, search done, no new-search trigger → skip router")
} else {
    // --- Unified LLM router ---
    ...existing router code...
}
```

**Step 4: Remove the post-router RAG override**

The block at `route.ts:2038-2056` (the post-router RAG override) is now
redundant — its logic has been moved to pre-router. Remove it entirely.

But keep in mind: if `wantsNewSearch` is true, the code falls through to the
LLM router. The router might then decide SEARCH, and the post-router override
would have caught that. After the move, the router's SEARCH decision stands
when `wantsNewSearch` is true — which is correct behavior (user explicitly
wants new sources).

However, there's an edge case: the post-router override also fires when the
router says SEARCH but `ragChunksAvailable && searchAlreadyDone` and the user
did NOT explicitly ask for new search. This exact condition is now handled by
the pre-router branch. So the post-router block is fully redundant and safe
to remove.

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Manual test**

Start dev server. In a conversation that already has search results and RAG
chunks, send a follow-up question that does NOT request new search.

Expected in terminal:
- `[SearchDecision] Pre-router RAG override: chunks available, search done, no new-search trigger → skip router`
- NO `[⏱ LATENCY] searchRouter=` line (router was skipped)

Then test edge case: in the same conversation, send a message with explicit
new-search intent (e.g., "cari referensi baru tentang X").

Expected:
- Should fall through to LLM router
- `[⏱ LATENCY] searchRouter=` line appears
- Search proceeds normally

Do **not** require a specific tool path such as "must use RAG tools" in this
manual test. The purpose of NLP-1 is to skip the router and avoid new web
search, not to force a specific downstream tool-selection behavior.

**Step 7: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(search): move RAG override to pre-router fast path (NLP-1)

When RAG chunks exist, search was already done, and user is not
requesting new sources, skip the LLM search router entirely (~2.5s
saved). The override logic is pure deterministic (regex + state check)
and was previously running post-router, paying the full router cost
before overriding its decision.

Ref: stream-delivery-gap next-latency-priorities NLP-1

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Parallelize paper prompt Convex queries (NLP-2)

Three paper-prompt operations in `paper-mode-prompt.ts` run sequentially after
`getSession`. They are independent of each other (each only needs `session`)
and can run in parallel.

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:125-225` (the three sequential query blocks)

**Step 1: Read the current sequential structure**

After `getSession` completes (line 102), three operations run sequentially:

1. `resolveStageInstructions` (line 128-136) — NO try/catch
2. `listArtifacts` + artifact summary building (line 144-192) — HAS try/catch
3. `getInvalidatedArtifacts` (line 211-225) — HAS try/catch

Each takes ~450-510ms. Total sequential: ~1,375ms after getSession.

**Step 2: Restructure into Promise.allSettled**

Replace the three sequential blocks (lines 125-225) with:

```typescript
        // Resolve stage-specific instructions: active skill first, then hardcoded fallback.
        const fallbackStageInstructions = getStageInstructions(stage);

        // ── Parallel query batch: all three depend on session but not on each other ──
        const parallelStart = Date.now();
        const [stageInstructionsResult, artifactsResult, invalidatedResult] = await Promise.allSettled([
            // 1. Resolve stage instructions
            (async () => {
                const start = Date.now();
                const resolution = await resolveStageInstructions({
                    stage,
                    fallbackInstructions: fallbackStageInstructions,
                    convexToken,
                    requestId,
                });
                logPaperPromptLatency("paperPrompt.resolveStageInstructions", start, {
                    source: resolution.source,
                });
                return resolution;
            })(),

            // 2. List artifacts and build summaries
            (async () => {
                const start = Date.now();
                const allArtifacts = await fetchQuery(
                    api.artifacts.listByConversation,
                    { conversationId, userId: session.userId },
                    convexOptions
                );
                logPaperPromptLatency("paperPrompt.listArtifacts", start, {
                    count: Array.isArray(allArtifacts) ? allArtifacts.length : 0,
                });
                return allArtifacts;
            })(),

            // 3. Get invalidated artifacts
            (async () => {
                const start = Date.now();
                const invalidated = await fetchQuery(
                    api.artifacts.getInvalidatedByConversation,
                    { conversationId, userId: session.userId },
                    convexOptions
                );
                logPaperPromptLatency("paperPrompt.getInvalidatedArtifacts", start, {
                    count: Array.isArray(invalidated) ? invalidated.length : 0,
                });
                return invalidated;
            })(),
        ]);
        logPaperPromptLatency("paperPrompt.parallelBatch", parallelStart, {
            stageInstructions: stageInstructionsResult.status,
            artifacts: artifactsResult.status,
            invalidated: invalidatedResult.status,
        });

        // ── Extract results with graceful fallbacks ──

        // Stage instructions: critical — if failed, use fallback
        const stageInstructions = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.instructions
            : (() => {
                console.error("Error resolving stage instructions:", (stageInstructionsResult as PromiseRejectedResult).reason);
                return fallbackStageInstructions;
            })();
        const stageInstructionSource = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.source
            : "fallback";
        const skillResolverFallback = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.skillResolverFallback
            : true;
        const activeSkillId = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.skillId
            : undefined;
        const activeSkillVersion = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.version
            : undefined;
        const fallbackReason = stageInstructionsResult.status === "fulfilled"
            ? stageInstructionsResult.value.fallbackReason
            : "parallel_batch_failure";

        // Format stageData into readable context
        const formattedData = formatStageData(session.stageData, stage);

        // Artifact summaries: non-critical — empty string on failure
        let artifactSummariesSection = "";
        if (artifactsResult.status === "fulfilled") {
            try {
                const allArtifacts = artifactsResult.value;
                // Map artifactId -> artifact metadata for quick lookup
                const artifactMap = new Map<string, { content: string; version: number; title: string; artifactId: string }>();
                for (const a of allArtifacts) {
                    if (!a.invalidatedAt) {
                        artifactMap.set(String(a._id), { content: a.content, version: a.version, title: a.title, artifactId: String(a._id) });
                    }
                }

                const stageData = session.stageData as Record<string, { artifactId?: string; validatedAt?: number; superseded?: boolean }>;
                const completedArtifacts: Array<{ stageLabel: string; content: string; version: number; title: string; artifactId: string }> = [];

                for (const stageId of STAGE_ORDER) {
                    if (stage !== "completed" && stageId === stage) continue;
                    const sd = stageData[stageId];
                    if (!sd?.validatedAt || sd.superseded) continue;
                    if (!sd.artifactId) continue;
                    const artifact = artifactMap.get(sd.artifactId);
                    if (artifact) {
                        completedArtifacts.push({
                            stageLabel: getStageLabel(stageId as PaperStageId),
                            content: artifact.content,
                            version: artifact.version,
                            title: artifact.title,
                            artifactId: artifact.artifactId,
                        });
                    }
                }
                artifactSummariesSection = formatArtifactSummaries(completedArtifacts);
            } catch (err) {
                console.error("Error building artifact summaries:", err);
            }
        } else {
            console.error("Error fetching artifacts:", (artifactsResult as PromiseRejectedResult).reason);
        }

        // Invalidated artifacts: non-critical — empty string on failure
        let invalidatedArtifactsContext = "";
        if (invalidatedResult.status === "fulfilled") {
            try {
                invalidatedArtifactsContext = getInvalidatedArtifactsContext(invalidatedResult.value);
            } catch (err) {
                console.error("Error processing invalidated artifacts:", err);
            }
        } else {
            console.error("Error fetching invalidated artifacts:", (invalidatedResult as PromiseRejectedResult).reason);
        }
```

**Step 3: Update the return value**

The current return uses `stageInstructionsResolution.*` fields directly.
After the refactor, the return must use the extracted variables from the
parallel batch result instead.

Check the return object (around line 231+) and make sure
all metadata fields are correctly passed through. The existing code has:
```typescript
skillResolverFallback: stageInstructionsResolution.skillResolverFallback,
stageInstructionSource: stageInstructionsResolution.source,
activeSkillId: stageInstructionsResolution.skillId,
activeSkillVersion: stageInstructionsResolution.version,
fallbackReason: stageInstructionsResolution.fallbackReason,
```
Change to:
```typescript
skillResolverFallback: skillResolverFallback,
stageInstructionSource: stageInstructionSource,
activeSkillId: activeSkillId,
activeSkillVersion: activeSkillVersion,
fallbackReason: fallbackReason,
```

**Step 4: Remove the old sequential blocks**

After inserting the parallel block, remove the original sequential code
(lines 125-225 in the pre-refactor file). Make sure no variable references
are broken.

Variables that must still be available after the parallel block:
- `stageInstructions` — used in prompt template
- `formattedData` — used in prompt template
- `artifactSummariesSection` — used in prompt template
- `invalidatedArtifactsContext` — used in prompt template
- `skillResolverFallback` — used in return value
- `stageInstructionSource` — used in return value
- `activeSkillId` — used in return value
- `activeSkillVersion` — used in return value
- `fallbackReason` — used in return value

All of these are created by the new parallel block code above.

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Manual test**

Start dev server. Open a paper-mode conversation. Send a message that
triggers paper prompt resolution.

Expected in terminal:
- `[⏱ PAPER_PROMPT] ... phase=paperPrompt.parallelBatch total=Xms` — new log
  showing the parallel batch took ~500ms instead of ~1,375ms
- Individual query logs still appear (resolveStageInstructions, listArtifacts,
  getInvalidatedArtifacts) — their durations are similar but they overlap
- `[⏱ PAPER_PROMPT] ... phase=paperPrompt.total total=Xms` — total should be
  ~900ms less than before

**Step 7: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "feat(paper-prompt): parallelize Convex queries after getSession (NLP-2)

Three sequential Convex queries (resolveStageInstructions, listArtifacts,
getInvalidatedArtifacts) now run via Promise.allSettled in parallel.
Each takes ~450-510ms; running them concurrently saves ~900ms.

Uses Promise.allSettled to ensure a failure in one query does not cancel
the others. resolveStageInstructions falls back to hardcoded instructions
on failure. Artifact queries degrade to empty strings.

Ref: stream-delivery-gap next-latency-priorities NLP-2

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: End-to-end verification

**Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 2: Manual test — RAG override pre-router (NLP-1)**

Scenario A: conversation with existing search + RAG chunks, follow-up question
- Expected: `[SearchDecision] Pre-router RAG override` in logs, no `searchRouter=` line
- Response should use RAG tools, not trigger new web search

Scenario B: same conversation, explicit new-search request ("cari referensi baru")
- Expected: falls through to LLM router, `searchRouter=` line appears
- New web search proceeds normally

**Step 3: Manual test — paper prompt parallel (NLP-2)**

Send a message in paper mode that triggers paper prompt resolution.
- Expected: `parallelBatch` log shows ~500ms total
- `paperPrompt.total` reduced by ~900ms compared to before
- Response quality unchanged (same stage instructions, same artifact summaries)

**Step 4: Manual test — new conversation (regression check)**

Create a new conversation from scratch. Send first message.
- Expected: normal flow, no regression
- Paper session creation works
- Search triggers if appropriate

**Step 5: Commit verification**

```bash
git add -A
git commit -m "test(nlp1+nlp2): verify end-to-end after RAG pre-router and paper prompt parallel

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
