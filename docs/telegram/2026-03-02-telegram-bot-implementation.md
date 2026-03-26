# Telegram Bot Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable Makalah AI chat via Telegram using Vercel chat-sdk, with account linking and conversation sync to web.

**Architecture:** Next.js API route receives Telegram webhooks via chat-sdk. Handler resolves Telegram user → Makalah user, then runs AI SDK `streamText()` with same models/prompts as web. Messages persist in Convex, accessible from both Telegram and web.

**Tech Stack:** Vercel chat-sdk + `@chat-adapter/telegram`, AI SDK v5, Convex, Next.js 16 API routes

**Design Doc:** `docs/plans/2026-03-02-telegram-bot-chat-sdk-design.md`

---

### Task 1: Install Dependencies & Set Up Environment

**Files:**
- Modify: `package.json`
- Create: `.env.local` entries (manual)

**Step 1: Install chat-sdk and Telegram adapter**

Run:
```bash
npm install chat-sdk @chat-sdk/telegram
```

> Note: Package names may be `chat` and `@chat-adapter/telegram` based on docs. Check npm registry first:
```bash
npm search chat-sdk --json | head -20
npm view @chat-adapter/telegram version 2>/dev/null || npm view @chat-sdk/telegram version 2>/dev/null
```

If exact names differ, use what npm resolves to.

**Step 2: Add environment variables**

Add to `.env.local`:
```
TELEGRAM_BOT_TOKEN=           # Get from @BotFather on Telegram
TELEGRAM_WEBHOOK_SECRET_TOKEN= # Random string for webhook verification
TELEGRAM_BOT_USERNAME=        # Bot username without @
```

**Step 3: Create Telegram bot via BotFather**

1. Open Telegram, search `@BotFather`
2. Send `/newbot`
3. Follow prompts: choose name and username
4. Copy the bot token to `.env.local`
5. Send `/setprivacy` → choose your bot → `Disable` (so bot receives all DMs)

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add chat-sdk and telegram adapter dependencies"
```

---

### Task 2: Add `telegramUserId` to Convex Schema

**Files:**
- Modify: `convex/schema.ts:51-72` (users table)

**Step 1: Add field and index to users table**

In `convex/schema.ts`, add to the `users` table definition (after `hasSeenLinkingNotice`):

```typescript
// Telegram bot integration
telegramUserId: v.optional(v.string()),
```

And add index after existing indexes:

```typescript
.index("by_telegramUserId", ["telegramUserId"])
```

**Step 2: Push schema to Convex**

Run:
```bash
npx convex dev
```

Wait for schema validation to pass. Check for any errors.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add telegramUserId field to users table"
```

---

### Task 3: Add Convex Functions for Telegram User Resolution

**Files:**
- Modify: `convex/users.ts`
- Create: `convex/telegramTokens.ts`

**Step 1: Add `getUserByTelegramId` query to `convex/users.ts`**

Add after the existing `getUserByBetterAuthId` function:

```typescript
export const getUserByTelegramId = query({
  args: { telegramUserId: v.string() },
  handler: async (ctx, { telegramUserId }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", telegramUserId))
      .unique()
  },
})
```

**Step 2: Add `linkTelegramAccount` mutation to `convex/users.ts`**

```typescript
export const linkTelegramAccount = mutation({
  args: {
    userId: v.id("users"),
    telegramUserId: v.string(),
  },
  handler: async (ctx, { userId, telegramUserId }) => {
    // Check if this telegramUserId is already linked to another account
    const existing = await ctx.db
      .query("users")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", telegramUserId))
      .unique()

    if (existing && existing._id !== userId) {
      throw new Error("Telegram account already linked to another user")
    }

    await ctx.db.patch(userId, { telegramUserId })
    return { success: true }
  },
})
```

**Step 3: Add `unlinkTelegramAccount` mutation to `convex/users.ts`**

```typescript
export const unlinkTelegramAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { telegramUserId: undefined })
    return { success: true }
  },
})
```

**Step 4: Create `convex/telegramTokens.ts` for account linking tokens**

Add `telegramLinkingTokens` table to `convex/schema.ts`:

```typescript
telegramLinkingTokens: defineTable({
  token: v.string(),
  telegramUserId: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
  consumed: v.boolean(),
}).index("by_token", ["token"]),
```

Create `convex/telegramTokens.ts`:

```typescript
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// 10-minute token expiry
const TOKEN_EXPIRY_MS = 10 * 60 * 1000

export const createLinkingToken = mutation({
  args: { telegramUserId: v.string() },
  handler: async (ctx, { telegramUserId }) => {
    // Generate random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")

    const now = Date.now()
    await ctx.db.insert("telegramLinkingTokens", {
      token,
      telegramUserId,
      createdAt: now,
      expiresAt: now + TOKEN_EXPIRY_MS,
      consumed: false,
    })

    return { token }
  },
})

export const consumeLinkingToken = mutation({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { token, userId }) => {
    const tokenDoc = await ctx.db
      .query("telegramLinkingTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique()

    if (!tokenDoc) {
      return { success: false, error: "Token tidak ditemukan" }
    }

    if (tokenDoc.consumed) {
      return { success: false, error: "Token sudah digunakan" }
    }

    if (Date.now() > tokenDoc.expiresAt) {
      return { success: false, error: "Token sudah kedaluwarsa" }
    }

    // Mark token as consumed
    await ctx.db.patch(tokenDoc._id, { consumed: true })

    // Link Telegram account
    const existing = await ctx.db
      .query("users")
      .withIndex("by_telegramUserId", (q) => q.eq("telegramUserId", tokenDoc.telegramUserId))
      .unique()

    if (existing && existing._id !== userId) {
      return { success: false, error: "Akun Telegram sudah terhubung ke user lain" }
    }

    await ctx.db.patch(userId, { telegramUserId: tokenDoc.telegramUserId })
    return { success: true, telegramUserId: tokenDoc.telegramUserId }
  },
})
```

**Step 5: Verify Convex compiles**

Run:
```bash
npx convex dev
```

Check no errors. Types should regenerate.

**Step 6: Commit**

```bash
git add convex/schema.ts convex/users.ts convex/telegramTokens.ts
git commit -m "feat(convex): add Telegram user resolution and linking token functions"
```

---

### Task 4: Create Account Linking Web Page

**Files:**
- Create: `src/app/connect-telegram/page.tsx`

**Step 1: Create the linking page**

```typescript
"use client"

import { use, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useRouter } from "next/navigation"

export default function ConnectTelegramPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = use(searchParams)
  const { user, isLoading } = useCurrentUser()
  const consumeToken = useMutation(api.telegramTokens.consumeLinkingToken)
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "linking" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-interface text-sm text-muted-foreground">Token tidak valid.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-interface text-sm text-muted-foreground">Memuat...</p>
      </div>
    )
  }

  if (!user) {
    // Redirect to sign-in with return URL
    router.push(`/sign-in?redirect_url=/connect-telegram?token=${token}`)
    return null
  }

  const handleLink = async () => {
    setStatus("linking")
    try {
      const result = await consumeToken({ token, userId: user._id })
      if (result.success) {
        setStatus("success")
      } else {
        setStatus("error")
        setErrorMsg(result.error ?? "Gagal menghubungkan akun")
      }
    } catch (err) {
      setStatus("error")
      setErrorMsg("Terjadi kesalahan. Coba lagi.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-comfort">
      <div className="w-full max-w-md rounded-shell border border-main bg-card p-airy space-y-4">
        <h1 className="text-narrative text-xl font-semibold tracking-tight">
          Hubungkan Telegram
        </h1>

        {status === "idle" && (
          <>
            <p className="text-interface text-sm text-muted-foreground">
              Hubungkan akun Telegram kamu ke Makalah untuk mengakses AI chat langsung dari Telegram.
            </p>
            <p className="text-interface text-sm">
              Akun: <span className="font-medium">{user.email}</span>
            </p>
            <button
              onClick={handleLink}
              className="w-full rounded-action bg-primary px-4 py-2 text-interface text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Hubungkan Akun
            </button>
          </>
        )}

        {status === "linking" && (
          <p className="text-interface text-sm text-muted-foreground">Menghubungkan...</p>
        )}

        {status === "success" && (
          <div className="space-y-2">
            <p className="text-interface text-sm text-success">
              Akun Telegram berhasil dihubungkan!
            </p>
            <p className="text-interface text-sm text-muted-foreground">
              Kembali ke Telegram dan kirim pesan ke bot untuk mulai chat.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-2">
            <p className="text-interface text-sm text-destructive">{errorMsg}</p>
            <button
              onClick={() => setStatus("idle")}
              className="rounded-action border border-main px-4 py-2 text-interface text-sm hover:bg-muted"
            >
              Coba Lagi
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Verify page renders**

Run dev server and navigate to `http://localhost:3000/connect-telegram?token=test`
Should show "Token tidak valid" or redirect to sign-in (expected since token is fake).

**Step 3: Commit**

```bash
git add src/app/connect-telegram/page.tsx
git commit -m "feat: add Telegram account linking web page"
```

---

### Task 5: Create Telegram Bot Core (`src/lib/telegram/`)

**Files:**
- Create: `src/lib/telegram/bot.ts`
- Create: `src/lib/telegram/format.ts`
- Create: `src/lib/telegram/deep-links.ts`

**Step 1: Create `src/lib/telegram/deep-links.ts`**

```typescript
const APP_URL = process.env.APP_URL ?? process.env.SITE_URL ?? "https://makalah.ai"

export function chatLink(conversationId: string): string {
  return `${APP_URL}/chat/${conversationId}`
}

export function linkingUrl(token: string): string {
  return `${APP_URL}/connect-telegram?token=${token}`
}
```

**Step 2: Create `src/lib/telegram/format.ts`**

```typescript
import { STAGE_LABELS, STAGE_ORDER } from "@convex/paperSessions/constants"

/**
 * Text-based progress bar for paper stages
 */
export function formatStageProgress(currentStage: string): string {
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  if (currentIndex === -1) return ""

  const total = STAGE_ORDER.length
  const filled = currentIndex + 1
  const bar = "■".repeat(filled) + "□".repeat(total - filled)

  const lines = [`📊 *Progress:* ${bar} (${filled}/${total})`]

  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i]
    const label = STAGE_LABELS[stage] ?? stage
    if (i < currentIndex) {
      lines.push(`  ✓ ${label}`)
    } else if (i === currentIndex) {
      lines.push(`  ▶ ${label} ← sekarang`)
    }
    // Don't show future stages to keep it short
  }

  return lines.join("\n")
}

/**
 * Format conversation list for Telegram
 */
export function formatConversationList(
  conversations: Array<{ _id: string; title: string; lastMessageAt: number }>
): string {
  if (conversations.length === 0) {
    return "Belum ada percakapan. Kirim pesan untuk memulai!"
  }

  const lines = conversations.slice(0, 10).map((conv, i) => {
    const date = new Date(conv.lastMessageAt).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })
    return `${i + 1}. *${escapeMarkdown(conv.title)}* (${date})`
  })

  return lines.join("\n")
}

/**
 * Escape Telegram MarkdownV2 special characters
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1")
}
```

**Step 3: Create `src/lib/telegram/bot.ts`**

```typescript
import { Chat } from "chat-sdk"
import { createTelegramAdapter } from "@chat-sdk/telegram"
// NOTE: Exact import paths depend on actual package names. Adjust after install.

let botInstance: Chat | null = null

export function getTelegramBot(): Chat {
  if (botInstance) return botInstance

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set")
  }

  botInstance = new Chat({
    userName: process.env.TELEGRAM_BOT_USERNAME ?? "makalah_ai_bot",
    adapters: {
      telegram: createTelegramAdapter(),
    },
  })

  return botInstance
}
```

> **Important:** The exact import paths (`chat-sdk`, `@chat-sdk/telegram` or `chat`, `@chat-adapter/telegram`) need to be verified after installing in Task 1. Adjust accordingly.

**Step 4: Commit**

```bash
git add src/lib/telegram/
git commit -m "feat(telegram): add bot core, formatting helpers, and deep link utils"
```

---

### Task 6: Create Telegram Message Handler

**Files:**
- Create: `src/lib/telegram/handlers.ts`
- Create: `src/lib/telegram/auth.ts`

**Step 1: Create `src/lib/telegram/auth.ts`**

```typescript
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"

export interface TelegramUser {
  makalahUserId: Id<"users">
  email: string
  tier: string
}

/**
 * Resolve Telegram user ID to Makalah user.
 * Returns null if not linked.
 */
export async function resolveTelegramUser(
  telegramUserId: string
): Promise<TelegramUser | null> {
  const user = await fetchQuery(api.users.getUserByTelegramId, {
    telegramUserId,
  })

  if (!user) return null

  return {
    makalahUserId: user._id,
    email: user.email,
    tier: user.subscriptionStatus,
  }
}

/**
 * Create a one-time linking token for account connection.
 */
export async function createLinkingToken(
  telegramUserId: string
): Promise<string> {
  const result = await fetchMutation(api.telegramTokens.createLinkingToken, {
    telegramUserId,
  })
  return result.token
}
```

**Step 2: Create `src/lib/telegram/handlers.ts`**

This is the core handler. It contains the AI streaming logic reused from the web chat route.

```typescript
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { streamText, convertToModelMessages } from "ai"
import { getSystemPrompt } from "@/lib/ai/chat-config"
import {
  getGatewayModel,
  getOpenRouterModel,
  getProviderSettings,
  getModelNames,
} from "@/lib/ai/streaming"
import {
  checkQuotaBeforeOperation,
  recordUsageAfterOperation,
} from "@/lib/billing/enforcement"
import { resolveTelegramUser, createLinkingToken } from "./auth"
import { chatLink, linkingUrl } from "./deep-links"
import { retryMutation } from "@/lib/convex/retry"

// Telegram mode system prompt addition
const TELEGRAM_MODE_PROMPT = `
Kamu sedang berkomunikasi via Telegram. Aturan tambahan:
1. Response singkat (max 2000 karakter). Jika lebih panjang, pecah jadi beberapa bagian.
2. Gunakan format Telegram: *bold*, _italic_, \`code\`, \`\`\`code block\`\`\`
3. JANGAN gunakan Markdown heading (#, ##, ###) — Telegram tidak render.
4. Setiap kali stage paper berubah, tampilkan progress bar teks.
5. Setiap kali artifact dibuat, announce dengan deep link ke web.
6. Fitur yang butuh UI rich (rewind, edit artifact, refrasa) → arahkan ke web.
7. Jangan mention fitur yang tidak tersedia di Telegram.
`.trim()

interface HandleMessageParams {
  telegramUserId: string
  messageText: string
  threadPost: (content: AsyncIterable<string> | string) => Promise<void>
  threadTyping: () => Promise<void>
}

/**
 * Handle an incoming Telegram message: resolve user, check quota,
 * stream AI response, persist everything to Convex.
 */
export async function handleTelegramMessage({
  telegramUserId,
  messageText,
  threadPost,
  threadTyping,
}: HandleMessageParams): Promise<void> {
  // 1. Resolve user
  const user = await resolveTelegramUser(telegramUserId)
  if (!user) {
    const token = await createLinkingToken(telegramUserId)
    await threadPost(
      `Selamat datang di Makalah AI! 🎓\n\n` +
      `Untuk mulai, hubungkan akun Makalah kamu:\n` +
      `${linkingUrl(token)}\n\n` +
      `Link berlaku 10 menit.`
    )
    return
  }

  // 2. Check quota
  const quotaCheck = await checkQuotaBeforeOperation(
    user.makalahUserId,
    messageText,
    "chat_message"
  )
  if (!quotaCheck.allowed) {
    await threadPost(
      `⚠️ Kuota habis.\n${quotaCheck.message ?? "Upgrade atau topup untuk melanjutkan."}`
    )
    return
  }

  // 3. Get or create conversation
  // Use a simple approach: 1 active conversation per Telegram user
  // TODO: Support multiple conversations via /new and /conversations commands
  let conversations = await fetchQuery(api.conversations.listConversations, {
    userId: user.makalahUserId,
  })

  let conversationId: Id<"conversations">

  if (conversations.length > 0) {
    // Use most recent conversation
    conversationId = conversations[0]._id
  } else {
    // Create new conversation
    conversationId = await fetchMutation(api.conversations.createConversation, {
      userId: user.makalahUserId,
      title: "Percakapan Telegram",
    })
  }

  // 4. Save user message to Convex
  await retryMutation(
    () => fetchMutation(api.messages.createMessage, {
      conversationId,
      role: "user",
      content: messageText,
    }),
    "messages.createMessage(user-telegram)"
  )

  // 5. Build system prompt
  const basePrompt = await getSystemPrompt()
  const systemPrompt = `${basePrompt}\n\n${TELEGRAM_MODE_PROMPT}`

  // 6. Get conversation history for context
  const history = await fetchQuery(api.messages.getMessages, {
    conversationId,
  })

  // Build messages array for AI
  const aiMessages = history.map((msg) => ({
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
  }))

  // 7. Stream AI response
  await threadTyping()

  const settings = await getProviderSettings()
  const modelNames = await getModelNames()

  let model
  let usedFallback = false

  try {
    model = await getGatewayModel()
  } catch {
    model = await getOpenRouterModel()
    usedFallback = true
  }

  try {
    const result = streamText({
      model,
      system: systemPrompt,
      messages: aiMessages,
      ...settings,
      onFinish: async ({ text, usage }) => {
        // Save assistant message
        await retryMutation(
          () => fetchMutation(api.messages.createMessage, {
            conversationId,
            role: "assistant",
            content: text,
            metadata: {
              model: usedFallback ? modelNames.fallback.model : modelNames.primary.model,
            },
          }),
          "messages.createMessage(assistant-telegram)"
        )

        // Record billing usage
        if (usage) {
          await recordUsageAfterOperation({
            userId: user.makalahUserId,
            conversationId,
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
            totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
            model: usedFallback ? modelNames.fallback.model : modelNames.primary.model,
            operationType: "chat_message",
          })
        }
      },
    })

    // Stream response to Telegram via chat-sdk
    await threadPost(result.textStream)
  } catch (error) {
    console.error("[Telegram] AI streaming error:", error)

    if (!usedFallback) {
      // Try fallback
      try {
        const fallbackModel = await getOpenRouterModel()
        const fallbackResult = streamText({
          model: fallbackModel,
          system: systemPrompt,
          messages: aiMessages,
          ...settings,
          onFinish: async ({ text, usage }) => {
            await retryMutation(
              () => fetchMutation(api.messages.createMessage, {
                conversationId,
                role: "assistant",
                content: text,
                metadata: { model: modelNames.fallback.model },
              }),
              "messages.createMessage(assistant-telegram-fallback)"
            )

            if (usage) {
              await recordUsageAfterOperation({
                userId: user.makalahUserId,
                conversationId,
                inputTokens: usage.inputTokens ?? 0,
                outputTokens: usage.outputTokens ?? 0,
                totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
                model: modelNames.fallback.model,
                operationType: "chat_message",
              })
            }
          },
        })

        await threadPost(fallbackResult.textStream)
      } catch (fallbackError) {
        console.error("[Telegram] Fallback also failed:", fallbackError)
        await threadPost("Maaf, terjadi gangguan. Coba lagi nanti.")
      }
    } else {
      await threadPost("Maaf, terjadi gangguan. Coba lagi nanti.")
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/telegram/auth.ts src/lib/telegram/handlers.ts
git commit -m "feat(telegram): add message handler with AI streaming and Convex persistence"
```

---

### Task 7: Create Slash Command Handlers

**Files:**
- Create: `src/lib/telegram/commands.ts`

**Step 1: Create command handlers**

```typescript
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { resolveTelegramUser, createLinkingToken } from "./auth"
import { linkingUrl, chatLink } from "./deep-links"
import { formatConversationList } from "./format"

type PostFn = (content: string) => Promise<void>

/**
 * Handle /start command — welcome message + account linking
 */
export async function handleStart(
  telegramUserId: string,
  post: PostFn
): Promise<void> {
  const user = await resolveTelegramUser(telegramUserId)

  if (user) {
    await post(
      `Akun sudah terhubung! ✅\n\n` +
      `Email: ${user.email}\n` +
      `Kirim pesan untuk mulai chat dengan AI.\n\n` +
      `Ketik /help untuk daftar perintah.`
    )
    return
  }

  const token = await createLinkingToken(telegramUserId)
  await post(
    `Selamat datang di *Makalah AI* 🎓\n\n` +
    `Hubungkan akun Makalah kamu untuk mulai:\n` +
    `${linkingUrl(token)}\n\n` +
    `Link berlaku 10 menit.`
  )
}

/**
 * Handle /help command — list available commands
 */
export async function handleHelp(post: PostFn): Promise<void> {
  await post(
    `*Perintah yang tersedia:*\n\n` +
    `/start — Hubungkan akun\n` +
    `/new — Mulai percakapan baru\n` +
    `/conversations — Daftar percakapan\n` +
    `/web — Buka Makalah di web\n` +
    `/help — Tampilkan bantuan ini\n\n` +
    `Kirim pesan langsung untuk chat dengan AI.`
  )
}

/**
 * Handle /conversations command — list recent conversations
 */
export async function handleConversations(
  telegramUserId: string,
  post: PostFn
): Promise<void> {
  const user = await resolveTelegramUser(telegramUserId)
  if (!user) {
    await post("Hubungkan akun dulu. Ketik /start")
    return
  }

  const conversations = await fetchQuery(api.conversations.listConversations, {
    userId: user.makalahUserId,
  })

  const list = formatConversationList(
    conversations.map((c) => ({
      _id: c._id,
      title: c.title,
      lastMessageAt: c.lastMessageAt,
    }))
  )

  await post(`*Percakapan terbaru:*\n\n${list}`)
}

/**
 * Handle /new command — create new conversation
 */
export async function handleNew(
  telegramUserId: string,
  post: PostFn
): Promise<void> {
  const user = await resolveTelegramUser(telegramUserId)
  if (!user) {
    await post("Hubungkan akun dulu. Ketik /start")
    return
  }

  // NOTE: Conversation will be created automatically on next message
  // For now, just acknowledge
  await post(
    `Percakapan baru dimulai! 💬\n` +
    `Kirim pesan pertama kamu.`
  )
}

/**
 * Handle /web command — deep link to web app
 */
export async function handleWeb(post: PostFn): Promise<void> {
  const url = process.env.APP_URL ?? process.env.SITE_URL ?? "https://makalah.ai"
  await post(`Buka Makalah di web:\n${url}/chat`)
}
```

**Step 2: Commit**

```bash
git add src/lib/telegram/commands.ts
git commit -m "feat(telegram): add slash command handlers"
```

---

### Task 8: Create Webhook API Route

**Files:**
- Create: `src/app/api/webhooks/telegram/route.ts`

**Step 1: Create the webhook route**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getTelegramBot } from "@/lib/telegram/bot"
import { handleTelegramMessage } from "@/lib/telegram/handlers"
import {
  handleStart,
  handleHelp,
  handleConversations,
  handleNew,
  handleWeb,
} from "@/lib/telegram/commands"

export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN
  if (secretToken) {
    const headerToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if (headerToken !== secretToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const bot = getTelegramBot()

    // Register event handlers (idempotent — chat-sdk handles dedup)
    bot.onNewMention(async (thread, message) => {
      const telegramUserId = message.author?.id
      if (!telegramUserId) return

      const text = message.text?.trim() ?? ""

      // Handle slash commands
      if (text.startsWith("/")) {
        const command = text.split(" ")[0].toLowerCase()
        const post = async (content: string) => { await thread.post(content) }

        switch (command) {
          case "/start":
            return handleStart(telegramUserId, post)
          case "/help":
            return handleHelp(post)
          case "/conversations":
            return handleConversations(telegramUserId, post)
          case "/new":
            return handleNew(telegramUserId, post)
          case "/web":
            return handleWeb(post)
          default:
            return thread.post(`Perintah tidak dikenal. Ketik /help untuk bantuan.`)
        }
      }

      // Handle regular messages
      await handleTelegramMessage({
        telegramUserId,
        messageText: text,
        threadPost: async (content) => { await thread.post(content) },
        threadTyping: async () => { await thread.typing() },
      })
    })

    // Handle messages in existing threads (follow-up messages)
    bot.onSubscribedMessage(async (thread, message) => {
      const telegramUserId = message.author?.id
      if (!telegramUserId) return

      const text = message.text?.trim() ?? ""
      if (!text || text.startsWith("/")) return

      await handleTelegramMessage({
        telegramUserId,
        messageText: text,
        threadPost: async (content) => { await thread.post(content) },
        threadTyping: async () => { await thread.typing() },
      })
    })

    // Let chat-sdk process the webhook
    // NOTE: The exact method to process incoming webhooks depends on chat-sdk API.
    // This may be `bot.handleWebhook(request)` or similar.
    // Check chat-sdk docs for the correct method after installation.
    const response = await bot.handleWebhook(request)
    return response ?? NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error)
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true })
  }
}
```

> **IMPORTANT NOTE:** The exact chat-sdk webhook handling API (`bot.handleWebhook()`) needs to be verified after package installation. The chat-sdk docs show webhook routes are set up differently per framework. Check the actual API after Task 1.

**Step 2: Commit**

```bash
git add src/app/api/webhooks/telegram/route.ts
git commit -m "feat(telegram): add webhook API route with command routing"
```

---

### Task 9: Register Webhook with Telegram

**Step 1: Deploy or use ngrok for local testing**

For local development:
```bash
npx ngrok http 3000
```

Copy the ngrok URL (e.g., `https://abc123.ngrok.io`).

**Step 2: Register webhook**

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://YOUR_DOMAIN/api/webhooks/telegram\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET_TOKEN}\"
  }"
```

Expected response:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

**Step 3: Verify webhook is set**

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Expected: URL should match what you set.

---

### Task 10: Integration Testing

**Step 1: Test account linking flow**

1. Open Telegram, find your bot
2. Send `/start`
3. Bot should reply with linking URL
4. Open URL in browser → sign in → confirm linking
5. Go back to Telegram, send any message
6. Bot should respond with AI-generated text

**Step 2: Test basic chat**

1. Send a message like "Apa itu makalah ilmiah?"
2. Bot should stream a response (you'll see the message being edited as tokens arrive)
3. Check Convex dashboard — conversation and messages should be visible
4. Open web app → the same conversation should appear in sidebar

**Step 3: Test slash commands**

- `/help` → should show command list
- `/conversations` → should show recent conversations
- `/new` → should acknowledge new conversation
- `/web` → should show web link

**Step 4: Test quota enforcement**

1. Use a gratis tier account
2. Send messages until quota runs out
3. Bot should reply with quota exceeded message

**Step 5: Verify cross-platform sync**

1. Send a message via Telegram
2. Open web app → same conversation → message should be there
3. Reply from web app
4. Send another message from Telegram — AI should have context of web reply

---

### Task 11: Error Handling & Edge Cases

**Files:**
- Modify: `src/lib/telegram/handlers.ts`

**Step 1: Add error boundaries and edge case handling**

After integration testing, address these edge cases in `handlers.ts`:

1. **Empty messages** — ignore silently
2. **Very long messages** (>4096 chars from user) — truncate with warning
3. **Concurrent messages** — chat-sdk should handle, but verify
4. **Unlinked user sends message** — always prompt linking (already handled)
5. **Convex connection failure** — catch and reply with error message
6. **AI timeout** — streamText has default timeout, catch and inform user

**Step 2: Commit**

```bash
git add src/lib/telegram/handlers.ts
git commit -m "fix(telegram): add error handling for edge cases"
```

---

### Task 12: Final Cleanup & Documentation

**Step 1: Update CLAUDE.md with Telegram bot section**

Add to CLAUDE.md under appropriate section:

```markdown
### Telegram Bot Integration
- Bot powered by Vercel chat-sdk + `@chat-adapter/telegram`
- DM only (no group chat support)
- Account linking via one-time token → web page
- Messages sync bidirectionally with web via Convex
- Slash commands: /start, /help, /new, /conversations, /web
- Paper mode: AI narrates progress + /status command (Post-MVP)
- Rewind & artifact viewing: web-only (deep links)

**Key Files:**
- `src/app/api/webhooks/telegram/route.ts` — Webhook entry point
- `src/lib/telegram/bot.ts` — chat-sdk instance
- `src/lib/telegram/handlers.ts` — Core message handler
- `src/lib/telegram/auth.ts` — User resolution & linking
- `src/lib/telegram/commands.ts` — Slash command handlers
- `convex/telegramTokens.ts` — Linking token CRUD

**Env vars:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET_TOKEN`, `TELEGRAM_BOT_USERNAME`
```

**Step 2: Commit all**

```bash
git add -A
git commit -m "docs: add Telegram bot integration to CLAUDE.md"
```

---

## Dependency Graph

```
Task 1 (Install deps)
  └─→ Task 2 (Schema change)
        └─→ Task 3 (Convex functions)
              ├─→ Task 4 (Linking page) ─────────────┐
              └─→ Task 5 (Bot core) ─────────────────┤
                    └─→ Task 6 (Message handler) ─────┤
                          └─→ Task 7 (Commands) ──────┤
                                └─→ Task 8 (Webhook) ─┤
                                      └─→ Task 9 (Register) → Task 10 (Test) → Task 11 (Edge cases) → Task 12 (Docs)
```

## Notes for Implementer

1. **Package name uncertainty:** chat-sdk package names (`chat-sdk` vs `chat`, `@chat-sdk/telegram` vs `@chat-adapter/telegram`) need verification at install time. The Vercel changelog and docs use slightly different names.

2. **Webhook API method:** `bot.handleWebhook(request)` is assumed. Check actual chat-sdk docs for the correct webhook processing method for Next.js.

3. **No auth token for Convex:** Telegram webhooks don't have a user session. All Convex calls in handlers use `fetchQuery`/`fetchMutation` without auth token (public functions). The `getUserByTelegramId` query is public by design — it only returns user existence info. Mutations validate internally.

4. **Conversation management:** MVP uses "most recent conversation" strategy. Multi-conversation support (picking specific conversations) is a follow-up improvement.

5. **chat-sdk is in beta:** Expect API changes. Pin versions in package.json.
