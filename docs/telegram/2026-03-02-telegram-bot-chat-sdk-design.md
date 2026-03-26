# Telegram Bot Integration via Vercel Chat SDK

**Date:** 2026-03-02
**Status:** Design
**Approach:** Vercel chat-sdk (`@chat-adapter/telegram`) + AI SDK streaming

## Goal

Makalah AI accessible via Telegram bot. Users can chat with AI, run paper workflow, and access all results on web. Telegram as thin client, web as rich client.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vercel chat-sdk | Same ecosystem as AI SDK, first-class streaming, event-driven |
| WhatsApp | Deferred | No adapter yet. Telegram first, WA later (possibly custom adapter) |
| Paper mode UX | Hybrid (AI narrate + `/status`) | Natural conversation + on-demand structured view |
| Rewind | Web-only | Too risky without modal confirmation dialog |
| Artifact viewing | Deep link to web | Telegram can't render Markdown/LaTeX/Mermaid |
| Account linking | One-time token deep link | Secure, standard Telegram bot auth pattern |

## Feature Scope

### Tier 1 — MVP

| Feature | Telegram UX | Implementation |
|---------|-------------|----------------|
| Chat AI | Text → streaming response (post-and-edit) | `thread.post(result.textStream)` via chat-sdk |
| Account linking | `/start` → inline button → web auth page | One-time token + `telegramUserId` on users table |
| Conversation list | `/conversations` → numbered list | Query Convex conversations |
| New conversation | `/new` or send message directly | Create Convex conversation |
| File upload | Send PDF/DOCX to bot | Reuse `/api/extract-file` pipeline |
| Billing check | Pre-flight quota check | Reuse `checkQuotaBeforeOperation()` |

### Tier 2 — Paper Mode (Post-MVP)

| Feature | Telegram UX |
|---------|-------------|
| Start paper session | `/paper` → AI starts workflow |
| Stage progression | AI narrates + text progress bar |
| Artifact creation | AI announces + deep link to web |
| View progress | `/status` → structured stage list |
| Web search | Automatic (AI decides), text citations |

### Tier 3 — Nice to Have (Later)

- Push notifications (paper stage complete)
- `/credits` command (billing info)
- `/refrasa` command (quick text styling)

### NOT Supported on Telegram

- Artifact viewer (Markdown/LaTeX/Mermaid) → deep link to web
- Rewind stage → web only
- File preview/download → link to web
- Rich citations UI → text URLs only
- Admin/CMS → web only
- Refrasa panel → web only

## Architecture

### Component Diagram

```
┌─────────────┐     webhook      ┌──────────────────────┐
│  Telegram    │ ───────────────→ │  /api/webhooks/      │
│  User Chat   │ ←─────────────  │  telegram/route.ts   │
└─────────────┘   bot API reply  │  (chat-sdk handler)  │
                                 └──────────┬───────────┘
                                            │
                                 ┌──────────▼───────────┐
                                 │  Telegram Handler     │
                                 │  Layer                │
                                 │  - auth resolution    │
                                 │  - quota check        │
                                 │  - system prompt      │
                                 │  - paper mode inject  │
                                 │  - telegram prompt    │
                                 └──────────┬───────────┘
                                            │
                          ┌─────────────────┼──────────────────┐
                          │                 │                  │
                ┌─────────▼──────┐ ┌───────▼────────┐ ┌──────▼───────┐
                │  AI SDK        │ │  Convex        │ │  File        │
                │  streamText()  │ │  messages,     │ │  Extract     │
                │  + paper tools │ │  conversations,│ │  Pipeline    │
                │                │ │  paperSessions │ │              │
                └────────────────┘ └────────────────┘ └──────────────┘
```

### Files to Create

```
src/app/api/webhooks/telegram/
  route.ts                  ← Next.js API route, chat-sdk webhook entry

src/lib/telegram/
  bot.ts                    ← chat-sdk Chat instance + Telegram adapter
  handlers.ts               ← onNewMention, onSubscribedMessage logic
  auth.ts                   ← Telegram userId ↔ Makalah user resolution
  commands.ts               ← Slash command handlers (/start, /new, /status, etc.)
  paper-prompt.ts           ← Telegram-specific paper mode prompt additions
  deep-links.ts             ← Generate makalah.ai deep links
  format.ts                 ← Text formatting (progress bar, stage list, etc.)
```

### Schema Change

```typescript
// convex/schema.ts - users table addition
telegramUserId: v.optional(v.string()),
```

### New Convex Functions

```typescript
// convex/users.ts
getUserByTelegramId(telegramUserId: string)  // Resolve Telegram → Makalah user
linkTelegramAccount(userId, telegramUserId)  // Account linking
unlinkTelegramAccount(userId)                // Account unlinking

// convex/telegramTokens.ts (new table)
createLinkingToken(telegramUserId)           // Generate one-time auth token
consumeLinkingToken(token)                   // Verify + link account
```

### Data Flow: Telegram Message → AI Response

```
1. Telegram sends webhook → POST /api/webhooks/telegram/route.ts
2. chat-sdk parses event → routes to handler
3. Handler resolves telegramUserId → Makalah user
4. Get/create conversation (thread.state.conversationId)
5. checkQuotaBeforeOperation() → block if exhausted
6. Save user message to Convex messages table
7. Build system prompt:
   - Base system prompt (from systemPrompts table)
   - + Telegram mode instructions (formatting, deep links)
   - + Paper mode context (if active session)
   - + File context (if attachments)
8. streamText() with AI SDK (primary: Gateway, fallback: OpenRouter)
9. thread.post(result.textStream) → chat-sdk streams to Telegram
10. onFinish callback:
    - Save assistant message to Convex
    - Record billing usage
    - Generate title (if new conversation)
```

### Account Linking Flow

```
1. User: /start
2. Bot: "Selamat datang di Makalah AI!
         Hubungkan akun Makalah kamu untuk mulai."
         [🔗 Hubungkan Akun] ← inline button
3. Button opens: makalah.ai/connect-telegram?token={one-time-token}
4. Web: user logs in → sees "Hubungkan Telegram?" confirmation
5. User confirms → backend links telegramUserId to users table
6. Bot detects linking → "✅ Akun terhubung! Ketik /help untuk panduan."
```

### Telegram Mode System Prompt

```
Kamu sedang berkomunikasi via Telegram. Aturan tambahan:
1. Response singkat (max 2000 karakter). Jika lebih panjang, pecah jadi beberapa bagian.
2. Gunakan format Telegram: *bold*, _italic_, `code`, ```code block```
3. JANGAN gunakan Markdown heading (#, ##, ###) — Telegram tidak render.
4. Setiap kali stage paper berubah:
   - Tampilkan progress bar: ■■■■□□□□□□□□□ (4/13)
   - List stage yang selesai (✓) dan stage aktif (▶)
5. Setiap kali artifact dibuat:
   - Announce: "📄 Artifact '[judul]' sudah dibuat"
   - Sertakan deep link: "🔗 Lihat di web: [URL]"
6. Fitur yang butuh UI rich (rewind, edit artifact, refrasa):
   - Arahkan user: "Fitur ini tersedia di web: [URL]"
7. Jangan mention fitur yang tidak tersedia di Telegram.
```

### Shared Logic Reuse

These existing modules are reused as-is:

| Module | Reuse |
|--------|-------|
| `src/lib/ai/streaming.ts` | `getGatewayModel()`, `getOpenRouterModel()`, `getProviderConfig()` |
| `src/lib/ai/chat-config.ts` | `getSystemPrompt()` |
| `src/lib/ai/paper-tools.ts` | `createPaperTools()` (all paper tools) |
| `src/lib/ai/paper-mode-prompt.ts` | `getPaperModeSystemPrompt()` |
| `src/lib/ai/paper-search-helpers.ts` | Search decision helpers |
| `src/lib/billing/enforcement.ts` | `checkQuotaBeforeOperation()`, `recordUsageAfterOperation()` |
| `src/lib/citations/normalizer.ts` | `normalizeCitations()` |
| `convex/messages.ts` | `createMessage()`, `getMessages()` |
| `convex/conversations.ts` | `createConversation()`, `getConversation()` |
| `convex/paperSessions.ts` | All paper session mutations |

### Dependencies to Add

```json
{
  "chat": "latest",
  "@chat-adapter/telegram": "latest"
}
```

### Environment Variables

```
TELEGRAM_BOT_TOKEN=         # From BotFather
TELEGRAM_WEBHOOK_SECRET_TOKEN=  # Optional, for webhook verification
TELEGRAM_BOT_USERNAME=      # Bot username for mention detection
```

### Webhook Registration

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://makalah.ai/api/webhooks/telegram"}'
```

## Security Considerations

1. **Webhook verification**: Validate `X-Telegram-Bot-Api-Secret-Token` header
2. **Account linking**: One-time tokens with 10-minute expiry
3. **Rate limiting**: Telegram has built-in rate limits (30 msg/sec per bot)
4. **User isolation**: Always resolve telegramUserId → userId before any data access
5. **No sensitive data in Telegram**: Billing details, account settings → web only

## Rollout Plan

1. **Phase 1**: Bot setup + account linking + basic chat AI (Tier 1 MVP)
2. **Phase 2**: Paper mode support (Tier 2)
3. **Phase 3**: Notifications + utility commands (Tier 3)
4. **Phase 4**: Evaluate WhatsApp adapter (if demand exists)

## Resolved Questions

1. **Group chat or DM only?** → DM only. Simpler auth, no mention parsing needed.
2. **Web search in Telegram?** → Same as web: AI decides, citations as text URLs.
3. **Max message length?** → Telegram limit: 4096 chars. Split if longer.
