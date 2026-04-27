# P2: Slow Journal Domain Routing + P3: Skeleton Flicker Fix

## P2: Direct Tavily Routing for Slow Journal Domains

**Problem:** Journal domains frequently timeout at primary fetch (5s), then Tavily fallback succeeds. User wastes 5s per URL.

**Solution:** Add `isSlowJournalHost(hostname)` detection in `content-fetcher.ts`. Matching URLs get route kind `"journal_direct_tavily"` and skip primary fetch — go straight to `fallbackCandidates` like PDFs.

**Detection patterns:** hostname contains `journal`, `jurnal`, `ejournal`, or TLD is `.ac.id` / `.sch.id`.

**File:** `src/lib/ai/web-search/content-fetcher.ts`

## P3: Skeleton Flicker After Settled State

**Problem:** `isAwaitingAssistantStart` stays `true` forever if auto-send never fires, causing skeleton to persist after data loads.

**Solution:** Add `useEffect` that resets `isAwaitingAssistantStart` to `false` when conversation loading completes and messages exist.

**File:** `src/components/chat/ChatWindow.tsx`
