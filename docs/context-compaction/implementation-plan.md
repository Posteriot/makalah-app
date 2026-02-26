# Context Compaction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement threshold-based (85%) context compaction with prioritized chain (P1-P4) for paper workflow and general chat, plus activate unused paperMemoryDigest.

**Architecture:** Compaction layer inserted between message building and existing brute prune in `chat/route.ts`. Priority chain: strip chitchat → compact oldest stages → LLM summarize → compact recent stages. Each priority re-estimates tokens and stops when under 85%. Existing 80% brute prune remains as safety net.

**Tech Stack:** TypeScript, Convex (schema + mutations), Vercel AI SDK (`generateText`), Gemini Flash (via existing Gateway)

**Design Doc:** `docs/context-compaction/design.md`

---

### Task 1: Add COMPACTION_TRIGGER constant to context-budget.ts

**Files:**
- Modify: `src/lib/ai/context-budget.ts:11` (add constant near existing thresholds)
- Modify: `__tests__/context-budget.test.ts` (add test for new threshold)

**Step 1: Write the failing test**

Add to `__tests__/context-budget.test.ts` at the end, before the closing `});`:

```typescript
describe("checkContextBudget with compaction threshold", () => {
  it("should flag shouldCompact when over 85% but under 80% prune threshold", () => {
    // 128k window, compaction at 0.85 = 108800 tokens = 435200 chars
    // prune at 0.8 = 102400 tokens = 409600 chars
    // 440000 chars = 110000 tokens → over 85% (108800) but under... wait
    // 85% > 80% so shouldCompact triggers BEFORE shouldPrune
    // 128k * 0.85 = 108800 tokens → 435200 chars
    const result = checkContextBudget(436000, 128_000);
    expect(result.shouldCompact).toBe(true);
    expect(result.shouldPrune).toBe(false); // under 80% prune (409600 chars)
  });

  it("should NOT flag shouldCompact when under 85%", () => {
    // 128k * 0.85 = 108800 tokens = 435200 chars
    const result = checkContextBudget(400_000, 128_000);
    expect(result.shouldCompact).toBe(false);
    expect(result.shouldPrune).toBe(false);
  });

  it("should flag both shouldCompact and shouldPrune when over 80%", () => {
    // over 409600 chars = over 80% prune threshold
    const result = checkContextBudget(420_000, 128_000);
    expect(result.shouldCompact).toBe(true);
    expect(result.shouldPrune).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/context-budget.test.ts`
Expected: FAIL — `shouldCompact` property does not exist on `ContextBudgetResult`

**Step 3: Write minimal implementation**

In `src/lib/ai/context-budget.ts`:

1. Add constant at line 11 area:
```typescript
const DEFAULT_COMPACTION_RATIO = 0.85
```

2. Add `shouldCompact` to `ContextBudgetResult` interface:
```typescript
export interface ContextBudgetResult {
  totalTokens: number
  threshold: number
  compactionThreshold: number
  contextWindow: number
  shouldCompact: boolean
  shouldPrune: boolean
  shouldWarn: boolean
}
```

3. Update `checkContextBudget` function:
```typescript
export function checkContextBudget(
  totalChars: number,
  contextWindow: number,
  thresholdRatio = DEFAULT_THRESHOLD_RATIO
): ContextBudgetResult {
  const threshold = Math.floor(contextWindow * thresholdRatio)
  const compactionThreshold = Math.floor(contextWindow * DEFAULT_COMPACTION_RATIO)
  const warnThreshold = Math.floor(contextWindow * DEFAULT_WARN_RATIO)
  const totalTokens = Math.ceil(totalChars / CHARS_PER_TOKEN)

  return {
    totalTokens,
    threshold,
    compactionThreshold,
    contextWindow,
    shouldCompact: totalTokens > compactionThreshold,
    shouldPrune: totalTokens > threshold,
    shouldWarn: totalTokens > warnThreshold,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/context-budget.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/ai/context-budget.ts __tests__/context-budget.test.ts
git commit -m "feat(context): add 85% compaction threshold to context budget"
```

---

### Task 2: Add stageMessageBoundaries to paperSessions schema

**Files:**
- Modify: `convex/schema.ts:536` (add field near `isDirty`)

**Step 1: Add schema field**

In `convex/schema.ts`, after the `isDirty` field (line 536), add:

```typescript
    // ════════════════════════════════════════════════════════════════
    // Context Compaction: Stage Message Boundaries
    // Records which messages belong to which stage for selective compaction
    // ════════════════════════════════════════════════════════════════
    stageMessageBoundaries: v.optional(v.array(v.object({
      stage: v.string(),
      firstMessageId: v.string(),
      lastMessageId: v.string(),
      messageCount: v.number(),
    }))),
```

**Step 2: Verify schema compiles**

Run: `npx convex dev --once` (or check that running `convex dev` accepts the schema)
Expected: Schema accepted, no errors

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add stageMessageBoundaries to paperSessions"
```

---

### Task 3: Record stageMessageBoundaries in approveStage mutation

**Files:**
- Modify: `convex/paperSessions.ts:1060-1176` (inside `approveStage` handler)

**Step 1: Understand current code**

The `approveStage` mutation at line 1060 currently:
- Validates session, ringkasan, budget
- Marks stage as validated (line 1127-1133)
- Gets next stage (line 1135)
- Updates paperMemoryDigest (line 1141-1147)
- Patches session (line 1176)

We need to add boundary recording between digest update and patch.

**Step 2: Add message boundary recording**

After the paperMemoryDigest section (after line 1147), add:

```typescript
        // ════════════════════════════════════════════════════════════════
        // Context Compaction: Record stage message boundaries
        // Queries messages in conversation to determine boundaries for this stage
        // ════════════════════════════════════════════════════════════════
        const existingBoundaries = session.stageMessageBoundaries || [];

        // Find the last recorded boundary to know where this stage starts
        const lastBoundaryMessageId = existingBoundaries.length > 0
            ? existingBoundaries[existingBoundaries.length - 1].lastMessageId
            : null;

        // Query all messages for this conversation, ordered by creation
        const allMessages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) => q.eq("conversationId", session.conversationId))
            .collect();

        // Determine stage message range
        let stageMessages;
        if (lastBoundaryMessageId) {
            // Find index of last boundary message, take everything after
            const lastIdx = allMessages.findIndex(m => String(m._id) === lastBoundaryMessageId);
            stageMessages = lastIdx >= 0 ? allMessages.slice(lastIdx + 1) : allMessages;
        } else {
            // First stage — all messages belong to it
            stageMessages = allMessages;
        }

        let updatedBoundaries = existingBoundaries;
        if (stageMessages.length > 0) {
            const newBoundary = {
                stage: currentStage,
                firstMessageId: String(stageMessages[0]._id),
                lastMessageId: String(stageMessages[stageMessages.length - 1]._id),
                messageCount: stageMessages.length,
            };
            updatedBoundaries = [...existingBoundaries, newBoundary];
        }
```

Then add `stageMessageBoundaries: updatedBoundaries` to the `patchData` object (line 1154 area):

```typescript
        const patchData: Record<string, unknown> = {
            currentStage: nextStage,
            stageStatus: nextStage === "completed" ? "approved" : "drafting",
            stageData: updatedStageData,
            updatedAt: now,
            isDirty: false,
            paperMemoryDigest: updatedDigest,
            stageMessageBoundaries: updatedBoundaries, // NEW
            estimatedContentChars: totalContentChars,
            estimatedTokenUsage: estimatedTokens,
            ...(nextStage === "completed" ? { completedAt: now } : {}),
        };
```

**Step 3: Verify mutation compiles**

Run: `npx convex dev --once`
Expected: No errors

**Step 4: Commit**

```bash
git add convex/paperSessions.ts
git commit -m "feat(paper): record stageMessageBoundaries on stage approve"
```

---

### Task 4: Activate paperMemoryDigest in paper-mode-prompt.ts

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:46-180`
- Test: Manual — verify digest appears in paper mode system prompt

**Step 1: Add formatMemoryDigest function**

At the top of `src/lib/ai/paper-mode-prompt.ts`, after the `InvalidatedArtifact` interface (after line 16), add:

```typescript
interface PaperMemoryEntry {
    stage: string;
    decision: string;
    timestamp: number;
    superseded?: boolean;
}

/**
 * Format paperMemoryDigest into a concise context block.
 * Always injected — serves as "memory anchor" for AI across stages.
 */
function formatMemoryDigest(digest: PaperMemoryEntry[]): string {
    if (!digest || digest.length === 0) return "";

    const entries = digest
        .filter(d => !d.superseded)
        .map(d => `- ${getStageLabel(d.stage as PaperStageId)}: ${d.decision}`)
        .join("\n");

    return `\nMEMORY DIGEST (keputusan tersimpan per tahap — JANGAN kontradiksi):\n${entries}\n`;
}
```

**Step 2: Inject digest into system prompt**

In the `getPaperModeSystemPrompt` function, after line 60 (`const stageLabel = ...`), add:

```typescript
        // Build memory digest from session
        const memoryDigest = formatMemoryDigest(
            (session as { paperMemoryDigest?: PaperMemoryEntry[] }).paperMemoryDigest || []
        );
```

Then in the return template string (line 139-175), inject `${memoryDigest}` after the `ATURAN UMUM` section and before `${stageInstructions}`:

```
${stageInstructions}
${memoryDigest}
KONTEKS TAHAP SELESAI & CHECKLIST:
```

**Step 3: Verify prompt builds correctly**

Run: `npm run build`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "feat(paper): activate paperMemoryDigest injection in system prompt"
```

---

### Task 5: Create compaction-prompts.ts

**Files:**
- Create: `src/lib/ai/compaction-prompts.ts`

**Step 1: Write the file**

```typescript
/**
 * LLM Summarization Prompt Templates for Context Compaction (P3)
 *
 * Used by context-compaction.ts when P1-P2 are insufficient
 * and LLM summarization is needed to reduce context size.
 */

/**
 * Prompt for summarizing mid-stage paper discussion.
 * Called when messages within a single paper stage exceed threshold.
 */
export function getPaperMidStageSummaryPrompt(stageName: string): string {
    return `Ringkas diskusi berikut jadi 3-5 bullet points dalam bahasa Indonesia.
Fokus pada:
- Keputusan yang disepakati user dan AI
- Referensi atau data yang dibahas
- Request user yang belum diselesaikan
- Perubahan/revisi yang diminta

Konteks: Tahap paper "${stageName}" sedang berlangsung.
Max 500 karakter total. Hanya bullet points, tanpa pembuka/penutup.`
}

/**
 * Prompt for summarizing general (non-paper) chat history.
 * Called when conversation messages exceed threshold without paper context.
 */
export function getGeneralChatSummaryPrompt(): string {
    return `Ringkas percakapan berikut jadi 3-7 bullet points dalam bahasa Indonesia.
Fokus pada:
- Topik utama yang dibahas
- Keputusan atau kesepakatan
- File yang di-upload atau dibahas
- Request yang belum selesai

Max 500 karakter total. Hanya bullet points, tanpa pembuka/penutup.`
}
```

**Step 2: Verify it compiles**

Run: `npm run build`
Expected: No errors (file is pure exports, no external deps)

**Step 3: Commit**

```bash
git add src/lib/ai/compaction-prompts.ts
git commit -m "feat(context): add LLM summarization prompt templates"
```

---

### Task 6: Create context-compaction.ts (Core Logic)

**Files:**
- Create: `src/lib/ai/context-compaction.ts`
- Test: `__tests__/context-compaction.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/context-compaction.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { stripChitchat, type CompactableMessage } from "@/lib/ai/context-compaction";

describe("Context Compaction", () => {
    describe("stripChitchat", () => {
        it("should remove short user confirmations", () => {
            const messages: CompactableMessage[] = [
                { role: "user", content: "ok" },
                { role: "assistant", content: "Baik, saya akan melanjutkan." },
                { role: "user", content: "ya" },
                { role: "assistant", content: "Berikut hasilnya." },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(2); // only assistant messages kept
            expect(result.every(m => m.role === "assistant")).toBe(true);
        });

        it("should NOT remove user messages with questions", () => {
            const messages: CompactableMessage[] = [
                { role: "user", content: "ok?" },
                { role: "assistant", content: "Ya, benar." },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(2);
        });

        it("should NOT remove user messages longer than 50 chars", () => {
            const messages: CompactableMessage[] = [
                { role: "user", content: "Saya setuju dengan pendekatan yang kamu sarankan tadi" },
                { role: "assistant", content: "Baik." },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(2);
        });

        it("should NOT remove system messages", () => {
            const messages: CompactableMessage[] = [
                { role: "system", content: "ok" },
                { role: "user", content: "ok" },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(1); // system kept, user stripped
            expect(result[0].role).toBe("system");
        });

        it("should handle empty array", () => {
            expect(stripChitchat([])).toHaveLength(0);
        });

        it("should NOT remove messages with exclamation marks", () => {
            const messages: CompactableMessage[] = [
                { role: "user", content: "bagus!" },
                { role: "assistant", content: "Terima kasih." },
            ];
            const result = stripChitchat(messages);
            expect(result).toHaveLength(2);
        });
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/context-compaction.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/lib/ai/context-compaction.ts`:

```typescript
/**
 * Context Compaction — Threshold-Based Priority Chain
 *
 * Inserted between message building and brute prune in chat/route.ts.
 * Runs P1-P4 sequentially, stopping when tokens drop below 85%.
 *
 * P1: Strip chitchat (deterministic)
 * P2: Compact oldest completed stages (paper only, deterministic)
 * P3: LLM summarize mid-conversation (paper + general chat)
 * P4: Compact recent completed stages (paper only, deterministic)
 */

import { generateText } from "ai"
import { getStageLabel, type PaperStageId } from "../../../convex/paperSessions/constants"
import { getPaperMidStageSummaryPrompt, getGeneralChatSummaryPrompt } from "./compaction-prompts"

// ════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════

export interface CompactableMessage {
    role: string
    content: string
    [key: string]: unknown
}

interface StageMessageBoundary {
    stage: string
    firstMessageId: string
    lastMessageId: string
    messageCount: number
}

interface PaperMemoryEntry {
    stage: string
    decision: string
    timestamp: number
    superseded?: boolean
}

interface PaperSessionContext {
    currentStage: string
    stageMessageBoundaries?: StageMessageBoundary[]
    paperMemoryDigest?: PaperMemoryEntry[]
}

export interface CompactionResult {
    messages: CompactableMessage[]
    compactedStages: string[]
    strippedChitchatCount: number
    llmSummarized: boolean
    resolvedAtPriority: "P1" | "P2" | "P3" | "P4" | "none"
}

interface CompactionConfig {
    contextWindow: number
    compactionThreshold: number // 85% of contextWindow in tokens
    isPaperMode: boolean
    paperSession?: PaperSessionContext | null
    getModel?: () => Promise<unknown> // for P3 LLM summarization
}

// ════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════

const CHARS_PER_TOKEN = 4
const CHITCHAT_MAX_LENGTH = 50
const CHITCHAT_SHORT_LENGTH = 15
const P3_GENERAL_CHAT_OLDEST_COUNT = 20

// ════════════════════════════════════════════════════════════════
// P1: Strip Chitchat
// ════════════════════════════════════════════════════════════════

function isChitchat(msg: CompactableMessage): boolean {
    if (msg.role !== "user") return false
    if (msg.content.length > CHITCHAT_MAX_LENGTH) return false
    const text = msg.content.trim().toLowerCase()
    return text.length < CHITCHAT_SHORT_LENGTH && !text.includes("?") && !text.includes("!")
}

export function stripChitchat(messages: CompactableMessage[]): CompactableMessage[] {
    return messages.filter(msg => !isChitchat(msg))
}

// ════════════════════════════════════════════════════════════════
// P2/P4: Compact Completed Stages (Paper Only)
// ════════════════════════════════════════════════════════════════

/**
 * Exclude messages belonging to a specific stage by matching message IDs
 * between boundary firstMessageId and lastMessageId (inclusive).
 */
function excludeStageMessages(
    messages: CompactableMessage[],
    boundary: StageMessageBoundary,
    messageIdExtractor: (msg: CompactableMessage) => string | undefined
): CompactableMessage[] {
    const firstId = boundary.firstMessageId
    const lastId = boundary.lastMessageId

    let inRange = false
    let passedRange = false

    return messages.filter(msg => {
        // System messages are always kept
        if (msg.role === "system") return true

        const msgId = messageIdExtractor(msg)
        if (!msgId) return true // Keep messages without ID (system-injected)

        if (msgId === firstId) inRange = true
        if (inRange && !passedRange) {
            if (msgId === lastId) {
                passedRange = true
                inRange = false
            }
            return false // Exclude this message
        }
        return true
    })
}

/**
 * Build a compact summary system message for excluded stages.
 */
function buildStageDigestMessage(
    digest: PaperMemoryEntry[],
    compactedStages: string[]
): CompactableMessage | null {
    if (compactedStages.length === 0) return null

    const entries = digest
        .filter(d => !d.superseded && compactedStages.includes(d.stage))
        .map(d => `- ${getStageLabel(d.stage as PaperStageId)}: ${d.decision}`)
        .join("\n")

    if (!entries) return null

    return {
        role: "system",
        content: `[CONTEXT COMPACTION: ${compactedStages.length} tahap sebelumnya di-compact]\n${entries}\n\nDetail tersimpan di stageData. Pesan asli tetap ada di database.`,
    }
}

// ════════════════════════════════════════════════════════════════
// P3: LLM Summarize
// ════════════════════════════════════════════════════════════════

async function llmSummarize(
    messages: CompactableMessage[],
    prompt: string,
    getModel: () => Promise<unknown>
): Promise<string | null> {
    try {
        const conversationText = messages
            .map(m => `[${m.role}]: ${m.content}`)
            .join("\n")

        const model = await getModel()

        const result = await generateText({
            model: model as Parameters<typeof generateText>[0]["model"],
            system: prompt,
            prompt: conversationText,
            maxTokens: 200,
        })

        return result.text || null
    } catch (error) {
        console.error("[Context Compaction] P3 LLM summarization failed:", error)
        return null
    }
}

// ════════════════════════════════════════════════════════════════
// Utility
// ════════════════════════════════════════════════════════════════

function estimateTokens(messages: CompactableMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => {
        return sum + (typeof msg.content === "string" ? msg.content.length : 0)
    }, 0)
    return Math.ceil(totalChars / CHARS_PER_TOKEN)
}

function isUnderThreshold(messages: CompactableMessage[], threshold: number): boolean {
    return estimateTokens(messages) < threshold
}

// ════════════════════════════════════════════════════════════════
// Main: runCompactionChain
// ════════════════════════════════════════════════════════════════

/**
 * Run the compaction priority chain.
 * Returns compacted messages + metadata about what was done.
 *
 * @param messages - The full message array (system + conversation)
 * @param config - Compaction configuration
 * @param messageIdExtractor - Function to extract message ID from a CompactableMessage
 */
export async function runCompactionChain(
    messages: CompactableMessage[],
    config: CompactionConfig,
    messageIdExtractor: (msg: CompactableMessage) => string | undefined = () => undefined
): Promise<CompactionResult> {
    const result: CompactionResult = {
        messages: [...messages],
        compactedStages: [],
        strippedChitchatCount: 0,
        llmSummarized: false,
        resolvedAtPriority: "none",
    }

    const threshold = config.compactionThreshold

    // Already under threshold — no compaction needed
    if (isUnderThreshold(result.messages, threshold)) {
        return result
    }

    console.info(
        `[Context Compaction] Triggered: ${estimateTokens(result.messages)} tokens > ${threshold} threshold`
    )

    // ── P1: Strip Chitchat ──────────────────────────────────
    const beforeP1 = result.messages.length
    result.messages = stripChitchat(result.messages)
    result.strippedChitchatCount = beforeP1 - result.messages.length

    if (result.strippedChitchatCount > 0) {
        console.info(
            `[Context Compaction] P1: Stripped ${result.strippedChitchatCount} chitchat messages → ${estimateTokens(result.messages)} tokens`
        )
    }

    if (isUnderThreshold(result.messages, threshold)) {
        result.resolvedAtPriority = "P1"
        console.info("[Context Compaction] Complete: resolved at P1")
        return result
    }

    // ── P2: Compact Oldest Completed Stages (Paper Only) ────
    if (config.isPaperMode && config.paperSession?.stageMessageBoundaries) {
        const boundaries = config.paperSession.stageMessageBoundaries
        const digest = config.paperSession.paperMemoryDigest || []

        // Sort oldest to newest (they should already be in order)
        for (const boundary of boundaries) {
            result.messages = excludeStageMessages(result.messages, boundary, messageIdExtractor)
            result.compactedStages.push(boundary.stage)

            console.info(
                `[Context Compaction] P2: Compacted stage ${boundary.stage} (${boundary.messageCount} msgs) → ${estimateTokens(result.messages)} tokens`
            )

            if (isUnderThreshold(result.messages, threshold)) {
                // Inject digest for compacted stages
                const digestMsg = buildStageDigestMessage(digest, result.compactedStages)
                if (digestMsg) {
                    // Insert after system messages but before conversation
                    const systemCount = result.messages.filter(m => m.role === "system").length
                    result.messages.splice(systemCount, 0, digestMsg)
                }
                result.resolvedAtPriority = "P2"
                console.info(`[Context Compaction] Complete: resolved at P2 (${result.compactedStages.length} stages compacted)`)
                return result
            }
        }

        // All stages compacted but still over — inject digest and continue
        const digestMsg = buildStageDigestMessage(digest, result.compactedStages)
        if (digestMsg) {
            const systemCount = result.messages.filter(m => m.role === "system").length
            result.messages.splice(systemCount, 0, digestMsg)
        }
    }

    // ── P3: LLM Summarize ───────────────────────────────────
    if (config.getModel) {
        const conversationMessages = result.messages.filter(m => m.role !== "system")
        const systemMessages = result.messages.filter(m => m.role === "system")

        // Determine how many oldest messages to summarize
        const summarizeCount = config.isPaperMode
            ? Math.min(Math.floor(conversationMessages.length * 0.3), 30) // 30% of conversation, max 30
            : Math.min(P3_GENERAL_CHAT_OLDEST_COUNT, Math.floor(conversationMessages.length * 0.4))

        if (summarizeCount > 2) {
            const toSummarize = conversationMessages.slice(0, summarizeCount)
            const toKeep = conversationMessages.slice(summarizeCount)

            // Build prompt
            const prompt = config.isPaperMode
                ? getPaperMidStageSummaryPrompt(
                    getStageLabel(config.paperSession?.currentStage as PaperStageId) || "unknown"
                )
                : getGeneralChatSummaryPrompt()

            const summary = await llmSummarize(toSummarize, prompt, config.getModel)

            if (summary) {
                const summaryMsg: CompactableMessage = {
                    role: "system",
                    content: `[RINGKASAN DISKUSI SEBELUMNYA]\n${summary}\n\nPercakapan berlanjut dari sini.`,
                }

                result.messages = [...systemMessages, summaryMsg, ...toKeep]
                result.llmSummarized = true

                console.info(
                    `[Context Compaction] P3: Summarized ${summarizeCount} messages via LLM → ${estimateTokens(result.messages)} tokens`
                )

                if (isUnderThreshold(result.messages, threshold)) {
                    result.resolvedAtPriority = "P3"
                    console.info("[Context Compaction] Complete: resolved at P3")
                    return result
                }
            } else {
                console.warn("[Context Compaction] P3: LLM summarization returned null, skipping")
            }
        }
    }

    // ── P4: Compact Recent Stages (Paper Only) ──────────────
    // At this point, all P2 boundaries are already compacted.
    // P4 reduces formatStageData detail window to 0 (ringkasan only for ALL stages).
    // This is handled by the caller — we signal it via resolvedAtPriority.
    if (config.isPaperMode) {
        result.resolvedAtPriority = "P4"
        console.info("[Context Compaction] P4: Signal caller to shrink formatStageData detail window")
        return result
    }

    // If we get here, compaction wasn't enough — P5 (brute prune) will handle
    console.warn("[Context Compaction] Chain exhausted without resolution. P5 (brute prune) will handle.")
    return result
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/context-compaction.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/ai/context-compaction.ts __tests__/context-compaction.test.ts
git commit -m "feat(context): create context-compaction core with priority chain P1-P4"
```

---

### Task 7: Integrate compaction layer into chat/route.ts

**Files:**
- Modify: `src/app/api/chat/route.ts:492-526` (between token estimation and brute prune)

**Step 1: Add import**

At the top of `chat/route.ts` (near line 34-36 where context-budget is imported), add:

```typescript
import { runCompactionChain, type CompactableMessage } from "@/lib/ai/context-compaction"
```

**Step 2: Insert compaction layer**

In `chat/route.ts`, after the context budget estimation log (line 511) and BEFORE the existing brute prune block (line 513), insert:

```typescript
        // ════════════════════════════════════════════════════════════════
        // Context Compaction Layer — threshold-based priority chain
        // Runs BEFORE brute prune. Brute prune remains as safety net.
        // ════════════════════════════════════════════════════════════════
        if (budget.shouldCompact) {
            const compactionConfig = {
                contextWindow: contextWindow,
                compactionThreshold: budget.compactionThreshold,
                isPaperMode,
                paperSession: paperSession ? {
                    currentStage: (paperSession as { currentStage: string }).currentStage,
                    stageMessageBoundaries: (paperSession as { stageMessageBoundaries?: unknown }).stageMessageBoundaries as {
                        stage: string
                        firstMessageId: string
                        lastMessageId: string
                        messageCount: number
                    }[] | undefined,
                    paperMemoryDigest: (paperSession as { paperMemoryDigest?: unknown }).paperMemoryDigest as {
                        stage: string
                        decision: string
                        timestamp: number
                        superseded?: boolean
                    }[] | undefined,
                } : null,
                getModel: async () => {
                    // Use primary model for summarization (Flash is already cheap)
                    return getGatewayModel()
                },
            }

            const messageIdExtractor = (msg: CompactableMessage) => {
                return (msg as { id?: string }).id || undefined
            }

            const compactionResult = await runCompactionChain(
                fullMessagesBase as CompactableMessage[],
                compactionConfig,
                messageIdExtractor,
            )

            // Replace messages with compacted version
            fullMessagesBase.length = 0
            fullMessagesBase.push(...compactionResult.messages as typeof fullMessagesBase[number][])

            // Re-estimate after compaction
            const postCompactionChars = estimateModelMessageChars(fullMessagesBase)
            const postBudget = checkContextBudget(postCompactionChars, contextWindow)
            console.info(
                `[Context Compaction] Post-compaction: ${postBudget.totalTokens.toLocaleString()} tokens (${Math.round((postBudget.totalTokens / postBudget.compactionThreshold) * 100)}% of compaction threshold)`
            )
        }
```

**Step 3: Verify existing brute prune still works**

The existing brute prune at line 513 (`if (budget.shouldPrune)`) runs AFTER compaction. It reads the (possibly compacted) `fullMessagesBase` and applies its own threshold check. No changes needed — it's the safety net.

**Step 4: Verify it compiles**

Run: `npm run build`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(context): integrate compaction chain into chat route"
```

---

### Task 8: Add paperSession fields to chat route's session fetch

**Files:**
- Modify: `src/app/api/chat/route.ts` (where paperSession is fetched, around line 234-242)

**Step 1: Locate session fetch**

Find where `paperSession` is assigned. It's likely fetched via `fetchQuery(api.paperSessions.getByConversation, ...)`. Verify that the query returns `stageMessageBoundaries` and `paperMemoryDigest` fields.

**Step 2: Verify Convex query returns new fields**

Check `convex/paperSessions.ts` — the `getByConversation` query should already return the full document including any new optional fields. Since Convex returns all fields by default, `stageMessageBoundaries` will be included automatically once the schema is deployed.

**Step 3: No code change needed if query returns full document**

If `getByConversation` does a `.first()` or `.unique()` on the table, all fields are returned. Verify this by reading the query.

**Step 4: Commit (only if changes were needed)**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(context): ensure paperSession includes compaction fields"
```

---

### Task 9: Remove legacy paper message trimming

**Files:**
- Modify: `src/app/api/chat/route.ts:413-421`

**Step 1: Understand legacy trimming**

Lines 413-421 contain a hardcoded paper-mode trimming that keeps only last 40 messages:

```typescript
const MAX_CHAT_HISTORY_PAIRS = 20 // 20 pairs = 40 messages max
const isPaperMode = !!paperModePrompt

let trimmedModelMessages = modelMessages
if (isPaperMode && modelMessages.length > MAX_CHAT_HISTORY_PAIRS * 2) {
    trimmedModelMessages = modelMessages.slice(-MAX_CHAT_HISTORY_PAIRS * 2)
}
```

This is now superseded by the compaction chain. However, **do NOT remove it yet** — keep it as an additional safety measure. The compaction chain is new and untested in production.

**Step 2: Add comment indicating future removal**

```typescript
// Legacy paper-mode trimming. Superseded by context compaction chain (P1-P4).
// TODO: Remove after compaction chain is validated in production.
const MAX_CHAT_HISTORY_PAIRS = 20
```

**Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "docs(context): annotate legacy paper trimming for future removal"
```

---

### Task 10: End-to-end verification

**Files:**
- All modified files

**Step 1: Run all tests**

```bash
npx vitest run __tests__/context-budget.test.ts __tests__/context-compaction.test.ts
```
Expected: ALL PASS

**Step 2: Run lint**

```bash
npm run lint
```
Expected: No errors on modified files

**Step 3: Run build**

```bash
npm run build
```
Expected: Clean build, no TypeScript errors

**Step 4: Verify Convex schema**

```bash
npx convex dev --once
```
Expected: Schema accepted, `stageMessageBoundaries` field present

**Step 5: Manual smoke test (optional)**

1. Start dev server: `npm run dev` + `npm run convex:dev`
2. Open a paper session, work through stages 1-2
3. Approve stages — verify `stageMessageBoundaries` populated in Convex dashboard
4. Check console logs for `[Context Compaction]` messages (should NOT trigger — context too small)
5. Verify `paperMemoryDigest` appears in paper mode system prompt (check Network tab → POST /api/chat request)

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat(context): complete context compaction system with threshold-based priority chain

- 85% compaction threshold with P1-P4 priority chain
- P1: strip chitchat, P2/P4: compact stage messages (paper)
- P3: LLM summarize via Gemini Flash (paper + general chat)
- Activate paperMemoryDigest as memory anchor
- Record stageMessageBoundaries on stage approve
- Existing 80% brute prune remains as safety net"
```
