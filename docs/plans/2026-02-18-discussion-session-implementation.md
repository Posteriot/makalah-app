# Discussion Session — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Discussion Session system so all non-paper conversations automatically get structured phases, memory digest, and soft checkpoints — turning Makalah AI into a binary system (paper session OR discussion session).

**Architecture:** Mirror paper session patterns (schema, tools, prompts, hooks) but with 4 non-linear phases, non-blocking checkpoints, and no validation gates. Integrate into existing chat route via mode-aware routing. Also clean up dead credit soft-cap code as part of credit universalization.

**Tech Stack:** Convex (schema, mutations, queries), AI SDK v5 (tools, streaming), React 19 (hooks, components), Next.js 16 (App Router), Tailwind CSS 4, Zod, TypeScript strict mode.

---

## Task 1: Discussion Session Constants & Types (Backend Foundation)

**Files:**
- Create: `convex/discussionSessions/constants.ts`
- Create: `convex/discussionSessions/types.ts`

**Step 1: Create `convex/discussionSessions/constants.ts`**

```typescript
// convex/discussionSessions/constants.ts

export const DISCUSSION_PHASE_ORDER = [
    "orientasi",
    "investigasi",
    "sintesis",
    "konstruksi",
] as const;

export type DiscussionPhaseId = typeof DISCUSSION_PHASE_ORDER[number];

export function canTransitionTo(
    current: DiscussionPhaseId,
    target: DiscussionPhaseId
): boolean {
    return current !== target;
}

export function getPhaseLabel(phase: DiscussionPhaseId): string {
    const labels: Record<DiscussionPhaseId, string> = {
        orientasi: "Orientasi",
        investigasi: "Investigasi",
        sintesis: "Sintesis",
        konstruksi: "Konstruksi",
    };
    return labels[phase];
}

export function getPhaseDescription(phase: DiscussionPhaseId): string {
    const descriptions: Record<DiscussionPhaseId, string> = {
        orientasi: "Pemetaan masalah dan framing pertanyaan",
        investigasi: "Eksplorasi literatur dan analisis argumen",
        sintesis: "Menghubungkan temuan dan membangun framework",
        konstruksi: "Membangun output: ringkasan, framework, rekomendasi",
    };
    return descriptions[phase];
}

export function getPhaseNumber(phase: DiscussionPhaseId): number {
    return DISCUSSION_PHASE_ORDER.indexOf(phase) + 1;
}

// Key whitelist per phase (only these keys allowed in updatePhaseData)
export const DISCUSSION_PHASE_KEYS: Record<DiscussionPhaseId, string[]> = {
    orientasi: [
        "ringkasan", "ringkasanDetail", "pertanyaanUtama", "konteks",
        "batasanTopik", "definisiKunci", "webSearchReferences", "artifactId",
        "checkpointAt", "acknowledged",
    ],
    investigasi: [
        "ringkasan", "ringkasanDetail", "temuanLiteratur", "argumenPro",
        "argumenKontra", "buktiPendukung", "referensi",
        "webSearchReferences", "artifactId", "checkpointAt", "acknowledged",
    ],
    sintesis: [
        "ringkasan", "ringkasanDetail", "polaDitemukan", "koneksiAntarTemuan",
        "frameworkMental", "kesimpulanSementara",
        "webSearchReferences", "artifactId", "checkpointAt", "acknowledged",
    ],
    konstruksi: [
        "ringkasan", "ringkasanDetail", "tipeOutput", "kontenOutput",
        "actionItems", "pertanyaanTerbuka",
        "webSearchReferences", "artifactId", "checkpointAt", "acknowledged",
    ],
};

// Field truncation limits
export const DISCUSSION_FIELD_LIMITS: Record<string, number> = {
    ringkasan: 500,
    ringkasanDetail: 2000,
    pertanyaanUtama: 500,
    konteks: 2000,
    frameworkMental: 3000,
    kontenOutput: 5000,
};
```

**Step 2: Create `convex/discussionSessions/types.ts`**

Copy the full type definitions from design doc Section 2 (OrientasiData, InvestigasiData, SintesisData, KonstruksiData validators using `v` from `convex/values`).

Reference: `docs/plans/2026-02-18-discussion-session-stages-design.md` Section 2, lines 106-210.

Pattern reference: `convex/paperSessions/types.ts` — same structure of exported validator objects.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`
Expected: No errors from the new files.

**Step 4: Commit**

```bash
git add convex/discussionSessions/constants.ts convex/discussionSessions/types.ts
git commit -m "feat(discussion): add constants and type validators for 4-phase discussion sessions"
```

---

## Task 2: Database Schema — Add `discussionSessions` Table + `usageEvents` Field

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add import for discussion session types at top of `convex/schema.ts`**

After the existing paper import block (line ~11), add:

```typescript
import {
  OrientasiData,
  InvestigasiData,
  SintesisData,
  KonstruksiData,
} from "./discussionSessions/types"
```

**Step 2: Add `discussionSessions` table definition**

Insert AFTER the `rewindHistory` table block (after line ~548) and BEFORE `pricingPlans`:

```typescript
// ════════════════════════════════════════════════════════════════
// Discussion Sessions — Non-linear 4-phase academic discussions
// ════════════════════════════════════════════════════════════════
discussionSessions: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),

    // Phase tracking (non-linear)
    currentPhase: v.union(
        v.literal("orientasi"),
        v.literal("investigasi"),
        v.literal("sintesis"),
        v.literal("konstruksi")
    ),
    phaseStatus: v.union(
        v.literal("active"),
        v.literal("checkpoint_pending")
    ),

    // Phase data — typed per phase
    phaseData: v.object({
        orientasi: v.optional(OrientasiData),
        investigasi: v.optional(InvestigasiData),
        sintesis: v.optional(SintesisData),
        konstruksi: v.optional(KonstruksiData),
    }),

    // Memory digest — persistent summary across phases
    memoryDigest: v.optional(v.array(v.object({
        phase: v.union(
            v.literal("orientasi"),
            v.literal("investigasi"),
            v.literal("sintesis"),
            v.literal("konstruksi")
        ),
        ringkasan: v.string(),
        timestamp: v.number(),
        acknowledged: v.boolean(),
    }))),

    // Phase transition audit trail
    phaseTransitions: v.optional(v.array(v.object({
        fromPhase: v.string(),
        toPhase: v.string(),
        timestamp: v.number(),
        trigger: v.union(
            v.literal("ai_auto"),
            v.literal("user_explicit"),
            v.literal("tool_call")
        ),
    }))),

    // Discussion metadata
    discussionTitle: v.optional(v.string()),
    topicTags: v.optional(v.array(v.string())),

    // Lifecycle
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
})
    .index("by_userId", ["userId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_userId_active", ["userId", "archivedAt"]),
```

**Step 3: Add `discussionSessionId` field to `usageEvents` table**

In the `usageEvents` table (line ~655), after `sessionId`:

```typescript
discussionSessionId: v.optional(v.id("discussionSessions")),
```

Also add an index after `by_session`:

```typescript
.index("by_discussion_session", ["discussionSessionId", "createdAt"])
```

**Step 4: Verify Convex schema pushes**

Run: `npx convex dev --once`
Expected: Schema deployed successfully, new table `discussionSessions` created, `usageEvents` updated.

**Step 5: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add discussionSessions table and usageEvents.discussionSessionId field"
```

---

## Task 3: Credit Universalization — Remove Dead Code

**Files:**
- Modify: `convex/schema.ts:511-515` — remove 5 credit fields from `paperSessions`
- Modify: `convex/billing/credits.ts:223-239` — remove session credit tracking block
- Modify: `src/lib/billing/enforcement.ts:32` — remove `isSoftBlocked` from `QuotaCheckResult`

**Step 1: Remove 5 dead credit fields from `paperSessions` in `convex/schema.ts`**

Delete lines 508-515 (the entire "Credit Soft Cap Tracking" section comment + 5 fields):

```typescript
// DELETE THIS BLOCK:
// ════════════════════════════════════════════════════════════════
// Credit Soft Cap Tracking (per paper session)
// ════════════════════════════════════════════════════════════════
creditAllotted: v.optional(v.number()),
creditUsed: v.optional(v.number()),
creditRemaining: v.optional(v.number()),
isSoftBlocked: v.optional(v.boolean()),
softBlockedAt: v.optional(v.number()),
```

**Step 2: Remove session credit tracking block in `convex/billing/credits.ts`**

In `deductCredits` handler (lines ~223-239), delete the entire `if (args.sessionId)` block:

```typescript
// DELETE THIS BLOCK:
// Update paper session credit tracking if provided
if (args.sessionId) {
    const session = await ctx.db.get(args.sessionId)
    if (session) {
        const sessionCreditUsed = (session.creditUsed ?? 0) + creditsToDeduct
        const sessionCreditRemaining =
            (session.creditAllotted ?? 300) - sessionCreditUsed
        const isSoftBlocked = sessionCreditRemaining <= 0

        await ctx.db.patch(args.sessionId, {
            creditUsed: sessionCreditUsed,
            creditRemaining: sessionCreditRemaining,
            isSoftBlocked,
            ...(isSoftBlocked ? { softBlockedAt: Date.now() } : {}),
        })
    }
}
```

Also remove `sessionId` from the `deductCredits` args if no other code uses it, OR keep it as deprecated if paper code still passes it.

**Step 3: Remove `isSoftBlocked` from `QuotaCheckResult` in `src/lib/billing/enforcement.ts`**

Delete line 32: `isSoftBlocked?: boolean`

**Step 4: Verify no references remain**

Run: Search codebase for `creditAllotted`, `isSoftBlocked`, `softBlockedAt`, `creditRemaining` (paper context).

Run: `npx convex dev --once` to push schema.

Run: `npx tsc --noEmit --pretty` to check for type errors.

**Step 5: Commit**

```bash
git add convex/schema.ts convex/billing/credits.ts src/lib/billing/enforcement.ts
git commit -m "refactor(billing): remove dead credit soft-cap code from paperSessions — universalize credits"
```

---

## Task 4: Convex Mutations & Queries (`convex/discussionSessions.ts`)

**Files:**
- Create: `convex/discussionSessions.ts`

**Step 1: Create the file with all mutations and queries**

This file mirrors `convex/paperSessions.ts` structure. Implement:

**Queries:**
- `getByConversationId` — fetch session by `conversationId` (skip if archived)
- `getActiveByUserId` — list active (non-archived) sessions for user

**Mutations:**
- `create` — initialize session with `currentPhase: "orientasi"`, `phaseStatus: "active"`, empty `phaseData: {}`
- `updatePhaseData` — whitelist filter keys → truncate strings → merge into `phaseData[phase]`
  - Requires `phase` param (set by AI tool layer's AUTO-PHASE)
  - Validate `phase === session.currentPhase`
  - Use `DISCUSSION_PHASE_KEYS` for whitelist, `DISCUSSION_FIELD_LIMITS` for truncation
- `submitCheckpoint` — set `phaseStatus = "checkpoint_pending"`, set `checkpointAt` on current phase data
- `acknowledgeCheckpoint` — set `acknowledged: true`, append entry to `memoryDigest`, reset `phaseStatus = "active"`
- `skipCheckpoint` — reset `phaseStatus = "active"`, no memoryDigest entry
- `transitionPhase` — validate target !== current, record in `phaseTransitions`, update `currentPhase`, reset `phaseStatus = "active"`
- `appendSearchReferences` — append to `phaseData[currentPhase].webSearchReferences`, dedup by URL

**Auth pattern:** Use `requireAuthUserId` / `requireConversationOwner` from `convex/authHelpers` (same as paperSessions).

Pattern reference: `convex/paperSessions.ts` — especially `create`, `updateStageData`, `approveStage`, `appendSearchReferences`.

**Step 2: Verify Convex compiles**

Run: `npx convex dev --once`
Expected: Functions registered, no errors.

**Step 3: Commit**

```bash
git add convex/discussionSessions.ts
git commit -m "feat(discussion): add Convex mutations and queries for discussion sessions"
```

---

## Task 5: AI Tools (`src/lib/ai/discussion-tools.ts`)

**Files:**
- Create: `src/lib/ai/discussion-tools.ts`

**Step 1: Create the discussion tools factory**

Mirror `src/lib/ai/paper-tools.ts` structure. Factory function `createDiscussionTools(context)` that returns 5 tools:

1. **`startDiscussionSession`** — params: `{ initialTopic?: string }`. Calls `discussionSessions.create`.
2. **`updatePhaseData`** (AUTO-PHASE) — params: `{ ringkasan: string, data?: Record<string, any> }`. Auto-fetches `currentPhase` from session, then calls `discussionSessions.updatePhaseData`.
3. **`submitCheckpoint`** — params: `{}`. Calls `discussionSessions.submitCheckpoint`.
4. **`getCurrentDiscussionState`** — params: `{}`. Calls `discussionSessions.getByConversationId`.
5. **`transitionPhase`** — params: `{ targetPhase: enum, reason: string }`. Calls `discussionSessions.transitionPhase`.

**Key pattern (AUTO-PHASE):** For `updatePhaseData`, the tool layer fetches `session.currentPhase` and passes it to the Convex mutation. AI never specifies phase. Mirror exact pattern from `paper-tools.ts:updateStageData` (lines 75+).

Use `retryMutation` / `retryQuery` from `src/lib/convex/retry.ts` for resilience.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`

**Step 3: Commit**

```bash
git add src/lib/ai/discussion-tools.ts
git commit -m "feat(discussion): add 5 AI tools for discussion session workflow"
```

---

## Task 6: Phase Instructions & Prompt Assembly

**Files:**
- Create: `src/lib/ai/discussion-phases/orientasi.ts`
- Create: `src/lib/ai/discussion-phases/investigasi.ts`
- Create: `src/lib/ai/discussion-phases/sintesis.ts`
- Create: `src/lib/ai/discussion-phases/konstruksi.ts`
- Create: `src/lib/ai/discussion-phases/formatPhaseData.ts`
- Create: `src/lib/ai/discussion-phases/index.ts`
- Create: `src/lib/ai/discussion-mode-prompt.ts`
- Create: `src/lib/ai/discussion-intent.ts`

**Step 1: Create phase instruction files**

Each file exports a `const XXXX_INSTRUCTIONS: string` with goal-oriented instructions for that phase. Keep short and focused like paper stage instructions.

Pattern reference: `src/lib/ai/paper-stages/foundation.ts`, `core.ts`, `results.ts`, `finalization.ts`.

**Step 2: Create `discussion-phases/formatPhaseData.ts`**

Implements the 3-layer context formatting from design doc Section 5:
- Layer 1: Completed phases → `ringkasan` only
- Layer 2: Current phase → full data (minus `webSearchReferences`)
- Layer 3: Memory digest → acknowledged entries

Pattern reference: `src/lib/ai/paper-stages/formatStageData.ts`

**Step 3: Create `discussion-phases/index.ts` barrel**

Exports `getPhaseInstructions(phase: DiscussionPhaseId): string` router (switch on phase) + re-exports.

Pattern reference: `src/lib/ai/paper-stages/index.ts`

**Step 4: Create `src/lib/ai/discussion-mode-prompt.ts`**

Exports `getDiscussionModeSystemPrompt(conversationId, convexToken)`:
1. Fetch session via `discussionSessions.getByConversationId`
2. If no session → return `""`
3. Assemble: `DISCUSSION_BASE_PROMPT` + `getPhaseInstructions(phase)` + `formatPhaseData(session)` + memory digest + tool usage prompt + checkpoint behavior prompt

Pattern reference: `src/lib/ai/paper-mode-prompt.ts` — same async function pattern, same `fetchQuery` with Convex token.

**Step 5: Create `src/lib/ai/discussion-intent.ts`**

Exports two constants:
- `DISCUSSION_START_REMINDER` — tells AI to call `startDiscussionSession`
- `PAPER_UPGRADE_REMINDER` — for edge case when discussion user wants to write paper

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`

**Step 7: Commit**

```bash
git add src/lib/ai/discussion-phases/ src/lib/ai/discussion-mode-prompt.ts src/lib/ai/discussion-intent.ts
git commit -m "feat(discussion): add phase instructions, prompt assembly, and intent reminders"
```

---

## Task 7: Chat Route Integration (`src/app/api/chat/route.ts`)

This is the largest and most critical task. The route needs mode-aware routing.

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Add imports at top of route.ts**

After existing paper imports (lines 15-31), add:

```typescript
import { createDiscussionTools } from "@/lib/ai/discussion-tools"
import { getDiscussionModeSystemPrompt } from "@/lib/ai/discussion-mode-prompt"
import { DISCUSSION_START_REMINDER } from "@/lib/ai/discussion-intent"
```

**Step 2: Fetch discussion session (after paper session fetch, line ~238)**

After the paper session fetch block, add discussion session detection:

```typescript
// Discussion Session: fetch if not in paper mode
const discussionModePrompt = !paperModePrompt
    ? await getDiscussionModeSystemPrompt(
        currentConversationId as Id<"conversations">,
        convexToken
    )
    : ""
const discussionSession = discussionModePrompt
    ? await fetchQueryWithToken(api.discussionSessions.getByConversationId, {
        conversationId: currentConversationId as Id<"conversations">,
    })
    : null
```

**Step 3: Add discussion intent detection (after paper intent, line ~256)**

After `paperWorkflowReminder` block:

```typescript
let discussionStartReminder = ""
if (!paperModePrompt && !discussionModePrompt && !paperWorkflowReminder && lastUserContent) {
    // No paper intent, no existing session → start discussion
    discussionStartReminder = DISCUSSION_START_REMINDER
}
```

**Step 4: Update `isPaperMode` and add `isDiscussionMode` (line ~412)**

```typescript
const isPaperMode = !!paperModePrompt
const isDiscussionMode = !!discussionModePrompt
```

**Step 5: Inject discussion prompt into system messages (line ~450-465)**

In the `fullMessagesBase` array, after `paperWorkflowReminder` slot, add:

```typescript
...(discussionModePrompt
    ? [{ role: "system" as const, content: discussionModePrompt }]
    : []),
...(discussionStartReminder
    ? [{ role: "system" as const, content: discussionStartReminder }]
    : []),
```

**Step 6: Add discussion tools to tool set (after line ~1084)**

After `...createPaperTools({...})`, add:

```typescript
// Discussion Session Tools
...(!isPaperMode ? createDiscussionTools({
    userId: userId as Id<"users">,
    conversationId: currentConversationId as Id<"conversations">,
    convexToken,
}) : {}),
```

Note: Discussion tools are only included when NOT in paper mode. Paper tools are always included (for the upgrade case).

**Step 7: Update `sessionId` in `recordUsageAfterOperation` calls (4 places)**

At each `recordUsageAfterOperation` call (lines ~1326, 1780, 1876, 2099), add `discussionSessionId`:

Currently:
```typescript
sessionId: paperSession?._id,
```

Change to also pass `discussionSessionId` — but since the enforcement function type expects `Id<"paperSessions">`, we need to update the enforcement function first. For now, we'll handle this by adding a new param.

**Step 7a: Update `recordUsageAfterOperation` in `src/lib/billing/enforcement.ts`**

Add optional `discussionSessionId` param:

```typescript
export async function recordUsageAfterOperation(params: {
  userId: Id<"users">
  conversationId?: Id<"conversations">
  sessionId?: Id<"paperSessions">
  discussionSessionId?: Id<"discussionSessions">  // NEW
  // ... rest
```

Pass it through to `recordUsage` mutation.

**Step 7b: Update `recordUsage` mutation in `convex/billing/usage.ts`**

Add `discussionSessionId` arg:

```typescript
args: {
    // ... existing
    discussionSessionId: v.optional(v.id("discussionSessions")),
}
```

And persist it to the `usageEvents` insert.

**Step 7c: Back in route.ts**, update all 4 `recordUsageAfterOperation` calls to include:

```typescript
discussionSessionId: discussionSession?._id,
```

**Step 8: Auto-persist web search references for discussion session**

After the paper auto-persist block (lines ~1744-1761), add parallel block:

```typescript
// ──── Auto-persist search references to discussion phaseData ────
if (discussionSession && persistedSources && persistedSources.length > 0) {
    try {
        await fetchMutationWithToken(api.discussionSessions.appendSearchReferences, {
            sessionId: discussionSession._id,
            references: persistedSources.map(s => ({
                url: s.url,
                title: s.title,
                ...(typeof s.publishedAt === "number" && Number.isFinite(s.publishedAt)
                    ? { publishedAt: s.publishedAt }
                    : {}),
            })),
        })
    } catch (err) {
        console.error("[Discussion] Failed to auto-persist search references:", err)
    }
}
```

**Step 9: Update LLM router context (line ~1186-1219)**

In the `decideWebSearchMode` call, add discussion context:

```typescript
isPaperMode: isPaperMode || isDiscussionMode,
```

Actually, discussion mode should use the same LLM router as paper's passive stages — let the router decide. No deterministic 3-layer logic needed for discussion.

**Step 10: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`

**Step 11: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/billing/enforcement.ts convex/billing/usage.ts
git commit -m "feat(discussion): integrate discussion session into chat route with mode-aware routing"
```

---

## Task 8: React Hook (`src/lib/hooks/useDiscussionSession.ts`)

**Files:**
- Create: `src/lib/hooks/useDiscussionSession.ts`

**Step 1: Create the hook**

Mirror `src/lib/hooks/usePaperSession.ts` structure but simpler (no rewind, no stage start index):

```typescript
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { DiscussionPhaseId, getPhaseLabel, getPhaseNumber } from "../../../convex/discussionSessions/constants";

export const useDiscussionSession = (conversationId?: Id<"conversations">) => {
    const { isAuthenticated } = useConvexAuth();

    const session = useQuery(
        api.discussionSessions.getByConversationId,
        conversationId && isAuthenticated ? { conversationId } : "skip"
    );

    const acknowledgeCheckpointMut = useMutation(api.discussionSessions.acknowledgeCheckpoint);
    const skipCheckpointMut = useMutation(api.discussionSessions.skipCheckpoint);
    const transitionPhaseMut = useMutation(api.discussionSessions.transitionPhase);

    const isDiscussionMode = !!session;
    const currentPhase = session?.currentPhase as DiscussionPhaseId | undefined;

    const acknowledgeCheckpoint = async (userId: Id<"users">) => {
        if (!session) return;
        return await acknowledgeCheckpointMut({ sessionId: session._id, userId });
    };

    const skipCheckpoint = async (userId: Id<"users">) => {
        if (!session) return;
        return await skipCheckpointMut({ sessionId: session._id, userId });
    };

    const transitionPhase = async (
        userId: Id<"users">,
        targetPhase: DiscussionPhaseId,
        trigger: "user_explicit"
    ) => {
        if (!session) return;
        return await transitionPhaseMut({
            sessionId: session._id,
            userId,
            targetPhase,
            trigger,
        });
    };

    return {
        session,
        isDiscussionMode,
        currentPhase: currentPhase ?? null,
        phaseStatus: session?.phaseStatus ?? null,
        phaseLabel: currentPhase ? getPhaseLabel(currentPhase) : "",
        phaseNumber: currentPhase ? getPhaseNumber(currentPhase) : 0,
        phaseData: session?.phaseData,
        memoryDigest: session?.memoryDigest,
        acknowledgeCheckpoint,
        skipCheckpoint,
        transitionPhase,
        isLoading: session === undefined,
    };
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`

**Step 3: Commit**

```bash
git add src/lib/hooks/useDiscussionSession.ts
git commit -m "feat(discussion): add useDiscussionSession React hook"
```

---

## Task 9: UI Components — DiscussionPhaseProgress

**Files:**
- Create: `src/components/discussion/DiscussionPhaseProgress.tsx`

**Step 1: Create the 4-badge horizontal bar component**

Displays 4 phase badges in a horizontal row above the chat area:
- Active phase: filled dot + bold label (using `--primary` amber)
- Visited phase (has data): outlined dot
- Unvisited: empty/muted dot
- All badges clickable → calls `transitionPhase` with `trigger: "user_explicit"`

Layout: horizontal flex, Geist Mono labels, compact badges.

Follow Mechanical Grace design system:
- Font: `.text-interface` (Geist Mono)
- Badge radius: `.rounded-badge` (6px)
- Spacing: `gap-dense` (8px)
- Active indicator: Amber-500 dot
- Border: `.border-hairline` (0.5px)

Pattern reference: `src/components/paper/PaperStageProgress.tsx` — adapt from vertical to horizontal.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`

**Step 3: Commit**

```bash
git add src/components/discussion/DiscussionPhaseProgress.tsx
git commit -m "feat(discussion): add DiscussionPhaseProgress UI component"
```

---

## Task 10: UI Components — CheckpointCard

**Files:**
- Create: `src/components/discussion/CheckpointCard.tsx`

**Step 1: Create inline checkpoint card**

Renders in the chat message stream when `phaseStatus === "checkpoint_pending"`:
- Shows phase name + ringkasan of current phase
- Two buttons: "Catat" (acknowledge) and "Lewati" (skip)
- Non-blocking: chat input stays active
- Uses Sky border (`.border-ai`) since it's AI-triggered

Follow Mechanical Grace:
- Card: `.rounded-shell` (16px)
- Buttons: `.rounded-action` (8px)
- Border: `.border-ai` (1px dashed)
- Font: `.text-interface` for body, `.text-signal` for phase label

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty`

**Step 3: Commit**

```bash
git add src/components/discussion/CheckpointCard.tsx
git commit -m "feat(discussion): add CheckpointCard inline UI component"
```

---

## Task 11: ChatWindow Integration

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1: Add discussion session hook import and usage**

After the `usePaperSession` import (line 19), add:

```typescript
import { useDiscussionSession } from "@/lib/hooks/useDiscussionSession"
import { DiscussionPhaseProgress } from "../discussion/DiscussionPhaseProgress"
import { CheckpointCard } from "../discussion/CheckpointCard"
```

After `usePaperSession` hook call (line ~124), add:

```typescript
const {
    session: discussionSession,
    isDiscussionMode,
    currentPhase,
    phaseStatus,
    acknowledgeCheckpoint,
    skipCheckpoint,
    transitionPhase,
} = useDiscussionSession(safeConversationId ?? undefined)
```

**Step 2: Add DiscussionPhaseProgress above chat area**

Where the paper `PaperStageProgress` would go (or above the virtuoso list), add:

```tsx
{isDiscussionMode && currentPhase && (
    <DiscussionPhaseProgress
        currentPhase={currentPhase}
        phaseData={discussionSession?.phaseData}
        onTransitionPhase={(targetPhase) => {
            if (userId) transitionPhase(userId, targetPhase, "user_explicit")
        }}
    />
)}
```

**Step 3: Add CheckpointCard rendering**

Below the message list (or as a fixed bar above the input), when checkpoint is pending:

```tsx
{isDiscussionMode && phaseStatus === "checkpoint_pending" && userId && (
    <CheckpointCard
        phase={currentPhase!}
        ringkasan={discussionSession?.phaseData?.[currentPhase!]?.ringkasan}
        onAcknowledge={() => acknowledgeCheckpoint(userId)}
        onSkip={() => skipCheckpoint(userId)}
    />
)}
```

**Step 4: Verify TypeScript compiles and dev server renders**

Run: `npx tsc --noEmit --pretty`
Run: `npm run dev` — navigate to `/chat`, verify no crash.

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(discussion): integrate discussion session UI into ChatWindow"
```

---

## Task 12: Discussion Edit Permissions

**Files:**
- Create: `src/lib/utils/discussionPermissions.ts`

**Step 1: Create edit permission rules**

More lenient than paper (3-turn window, no phase lock):

```typescript
export function isEditAllowed(params: {
    messageIndex: number;
    totalMessages: number;
    isUserMessage: boolean;
}): { allowed: boolean; reason?: string } {
    if (!params.isUserMessage) {
        return { allowed: false, reason: "Hanya pesan user yang bisa diedit" };
    }
    // Max 3 user turns back (more lenient than paper's 2)
    // Discussion has no phase-lock (always editable)
    const turnsFromEnd = params.totalMessages - 1 - params.messageIndex;
    const userTurnsBack = Math.ceil(turnsFromEnd / 2);
    if (userTurnsBack > 3) {
        return { allowed: false, reason: "Hanya 3 pesan terakhir yang bisa diedit" };
    }
    return { allowed: true };
}
```

**Step 2: Commit**

```bash
git add src/lib/utils/discussionPermissions.ts
git commit -m "feat(discussion): add discussion edit permission rules"
```

---

## Task 13: End-to-End Smoke Test

**Files:** None created — manual testing.

**Step 1: Start dev servers**

Run: `npm run dev` (in one terminal)
Run: `npx convex dev` (in another terminal)

**Step 2: Test discussion session creation**

1. Open browser → `/chat`
2. Type any non-paper message (e.g., "Apa dampak AI terhadap pendidikan?")
3. Verify: AI should call `startDiscussionSession` tool
4. Verify: Discussion session created in Convex dashboard (`discussionSessions` table)
5. Verify: DiscussionPhaseProgress bar appears above chat

**Step 3: Test phase transition**

1. Click on "Investigasi" badge in phase progress bar
2. Verify: `currentPhase` updates to "investigasi"
3. Verify: Phase transition recorded in `phaseTransitions` array

**Step 4: Test checkpoint flow**

1. Continue discussion until AI calls `submitCheckpoint`
2. Verify: CheckpointCard appears inline
3. Click "Catat" → verify entry in `memoryDigest`
4. Verify: Chat input stays active during checkpoint

**Step 5: Test paper intent in discussion**

1. In an active discussion, type "Aku ingin menulis paper tentang ini"
2. Verify: Paper workflow reminder injected (AI asks about switching to paper mode)

**Step 6: Test credit tracking**

1. Check `usageEvents` table in Convex dashboard
2. Verify: `discussionSessionId` populated for discussion messages
3. Verify: `operationType` is "chat_message" (not "paper_generation")

**Step 7: Commit (if any fixes needed)**

```bash
git commit -m "fix(discussion): address smoke test findings"
```

---

## Task 14: Update CLAUDE.md Documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add Discussion Session section after Paper Writing Workflow section**

Add brief documentation covering:
- 4-phase overview (orientasi → investigasi → sintesis → konstruksi)
- Key files listing
- AI tools listing (5 tools)
- Non-linear navigation
- Soft checkpoint mechanism
- Credit universalization note

Pattern reference: The "Paper Writing Workflow" section in CLAUDE.md.

**Step 2: Update Database Schema section**

Add `discussionSessions` to the key tables list.
Update `usageEvents` to note `discussionSessionId` field.
Remove mention of credit soft-cap per paper session.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add discussion session documentation to CLAUDE.md"
```

---

## Dependency Graph

```
Task 1 (constants/types)
    ↓
Task 2 (schema) ← depends on Task 1 types
    ↓
Task 3 (credit cleanup) ← can run parallel with Task 4 after Task 2
    ↓
Task 4 (mutations/queries) ← depends on Task 2 schema
    ↓
Task 5 (AI tools) ← depends on Task 4 mutations
    ↓
Task 6 (prompts/phases) ← depends on Task 1 constants
    ↓
Task 7 (route integration) ← depends on Task 5 + Task 6
    ↓
Task 8 (hook) ← depends on Task 4 queries
    ↓
Task 9 (PhaseProgress UI) ← depends on Task 1 constants
    ↓
Task 10 (CheckpointCard UI) ← can parallel with Task 9
    ↓
Task 11 (ChatWindow) ← depends on Task 8 + Task 9 + Task 10
    ↓
Task 12 (edit permissions) ← independent, can parallel with Task 9-10
    ↓
Task 13 (smoke test) ← depends on ALL above
    ↓
Task 14 (docs) ← after smoke test passes
```

## Parallel Execution Opportunities

These groups can be parallelized:

- **Group A (after Task 2):** Task 3 + Task 4 (credit cleanup + mutations)
- **Group B (after Task 4):** Task 5 + Task 6 + Task 8 (tools + prompts + hook)
- **Group C (after Task 6):** Task 9 + Task 10 + Task 12 (UI components + permissions)
