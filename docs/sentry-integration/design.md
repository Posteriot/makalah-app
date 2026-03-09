# Sentry Integration Design — Makalah AI

**Date:** 2026-03-07
**Branch:** `feat/sentry-integration`
**Status:** Draft — pending user approval

---

## 1. Tujuan

Mengintegrasikan Sentry ke Makalah AI untuk error monitoring dan performance tracking, dengan fokus utama memperkuat area chat sebagai core application.

## 2. Strategi: App-Wide Safety Net + Chat Enrichment + Payment Guard

Bukan chat-only, bukan juga flat app-wide. Tiga layer dengan investasi berbeda:

| Layer | Scope | Tujuan | Effort |
|-------|-------|--------|--------|
| **L1: SDK Base** | App-wide | Automatic error capture, source maps, performance baseline | Minimal (config files) |
| **L2: Chat Enrichment** | Chat client + server | Domain-specific context, tags, fingerprinting via existing infrastructure | **Investasi utama** |
| **L3: Payment Guard** | `/api/webhooks/payment` | Explicit capture untuk prevent revenue loss dari silent failures | Kecil (1 file) |

### Kenapa bukan chat-only?

`@sentry/nextjs` SDK secara nature sudah app-wide. Membatasi scope-nya secara artifisial (custom `beforeSend` filter) justru menambah complexity. Biarkan SDK capture semua, tapi enrichment hanya di chat.

---

## 3. Architecture

### 3.1 SDK Initialization Files

| File | Runtime | Fungsi |
|------|---------|--------|
| `instrumentation-client.ts` | Browser | Client SDK init, replay, router transitions |
| `sentry.server.config.ts` | Node.js | Server SDK init |
| `sentry.edge.config.ts` | Edge | Edge SDK init (untuk proxy.ts/middleware) |
| `instrumentation.ts` | Server bootstrap | Import server/edge configs + `onRequestError` |
| `next.config.ts` | Build | `withSentryConfig()` wrapping, source map upload |
| `src/app/global-error.tsx` | Browser | Root error boundary → `Sentry.captureException()` |

### 3.2 Layer 1: SDK Base (App-Wide)

Standard `@sentry/nextjs` setup. Otomatis menangkap:

- Unhandled exceptions (client + server)
- Unhandled promise rejections
- Console errors
- Web vitals (LCP, FID, CLS)
- Page navigation breadcrumbs
- HTTP request breadcrumbs
- Source maps untuk readable stack traces

**Configuration:**

```typescript
// instrumentation-client.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
})
```

**Sample rates (production):**
- Traces: 10% (balance cost vs visibility)
- Session replay on error: 100% (always replay when error occurs)
- Session replay normal: 10%

### 3.3 Layer 2: Chat Enrichment (Core Investment)

Memanfaatkan infrastructure yang sudah ada untuk meng-enrich Sentry events dengan domain context.

#### 3.3.1 Existing Infrastructure → Sentry Mapping

| Existing | Sentry Feature | Bagaimana |
|----------|---------------|-----------|
| `ChatDiagnosticSnapshot` | `Sentry.setContext("chat")` | Attach chatStatus, toolStates, searchStatus, model ke setiap event |
| `shouldShowTechnicalReportTrigger()` | `Sentry.captureEvent()` | Auto-send event saat trigger=true (tanpa user klik tombol lapor) |
| `classifyError()` | `Sentry.setTag()` + fingerprinting | Error type (timeout, rate_limit, network, auth, server_error) sebagai searchable tag |
| `onError` callback di `useChat` | `Sentry.captureException()` | Primary client-side capture point |
| `console.error` in catch blocks | `Sentry.captureException()` | Replace console.error di critical paths |
| `logAiTelemetry()` | `Sentry.addBreadcrumb()` | AI telemetry events sebagai breadcrumbs untuk error context |

#### 3.3.2 Client-Side (ChatWindow.tsx)

**A. `onError` callback — primary capture point:**

```typescript
onError: (err) => {
  if (isQuotaExceededChatError(err)) return // Known, handled error — skip

  Sentry.withScope((scope) => {
    scope.setTag("chat.mode", isPaperMode ? "paper" : "normal")
    scope.setTag("chat.provider", latestAssistantModel ?? "unknown")
    scope.setContext("chat_diagnostic", technicalReportSnapshot)
    if (safeConversationId) scope.setTag("chat.conversationId", String(safeConversationId))
    Sentry.captureException(err)
  })
}
```

**B. Auto-capture saat `shouldShowTechnicalReportTrigger()` = true:**

Uses a ref guard to prevent duplicate events on React re-renders.

```typescript
const sentryAutoTriggerFired = useRef(false)
useEffect(() => {
  if (!shouldShowTechnicalReportAutoTrigger) {
    sentryAutoTriggerFired.current = false
    return
  }
  if (sentryAutoTriggerFired.current) return
  sentryAutoTriggerFired.current = true

  Sentry.withScope((scope) => {
    scope.setTag("chat.auto_triggered", "true")
    scope.setTag("chat.mode", isPaperMode ? "paper" : "normal")
    scope.setContext("chat_diagnostic", technicalReportSnapshot)
    if (safeConversationId) scope.setTag("chat.conversationId", String(safeConversationId))
    Sentry.captureMessage("Chat error auto-detected", "warning")
  })
}, [shouldShowTechnicalReportAutoTrigger, technicalReportSnapshot, isPaperMode, safeConversationId])
```

**C. Sentry user identity (saat user authenticated):**

Note: Variable is `currentUser` (destructured from `useCurrentUser()` as `{ user: currentUser }`).

```typescript
useEffect(() => {
  if (currentUser) {
    Sentry.setUser({ id: currentUser._id, email: currentUser.email })
  } else {
    Sentry.setUser(null)
  }
}, [currentUser])
```

**D. Critical client-side catch blocks:**

Replace `console.error` with `Sentry.captureException` di catch blocks yang mempengaruhi user actions:

| Line | Context | Subsystem Tag |
|------|---------|---------------|
| ~1511 | Edit and resend failed | `chat.edit` |
| ~1553 | Approve stage failed | `paper.approve` |
| ~1566 | Request revision failed | `paper.revision` |
| ~1598 | Create conversation failed | `chat.create` |
| ~1641 | Rewind failed | `paper.rewind` |

Pattern:
```typescript
// BEFORE:
} catch (error) {
  console.error("Failed to edit and resend:", error)
}
// AFTER:
} catch (error) {
  Sentry.captureException(error, { tags: { subsystem: "chat.edit" } })
  console.error("Failed to edit and resend:", error)
}
```

#### 3.3.3 Server-Side (/api/chat/route.ts)

**A. Outermost catch — currently just `console.error`:**

```typescript
// BEFORE:
} catch (error) {
  console.error("Chat API Error:", error)
  return new Response("Internal Server Error", { status: 500 })
}

// AFTER:
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      "api.route": "chat",
      "chat.mode": isPaperMode ? "paper" : "normal",
    },
    extra: {
      conversationId: currentConversationId,
      userId,
    },
  })
  console.error("Chat API Error:", error)
  return new Response("Internal Server Error", { status: 500 })
}
```

**B. Gateway failover — track primary provider failures:**

```typescript
// Line ~3108: Gateway fails, going to fallback
} catch (error) {
  Sentry.addBreadcrumb({
    category: "ai.failover",
    message: `Primary provider failed: ${modelNames.primary.model}`,
    level: "warning",
    data: { errorType: classifyError(error).errorType },
  })
  // ... existing failover logic
}
```

**C. Critical silent failures:**

Replace `console.error` with `Sentry.captureException` in all critical catch blocks:

| Line | Context | Subsystem Tag | Priority |
|------|---------|---------------|----------|
| ~94 | Convex token retry failure | `auth` | Critical |
| ~259 | Background title generation error | `title_generation` | Low |
| ~1468 | createArtifact tool failed | `artifact` | Critical |
| ~1544 | updateArtifact tool failed | `artifact` | Critical |
| ~1597 | readArtifact tool failed | `artifact` | Medium |
| ~2317,2906,3266,3718 | Billing record usage failed (4x) | `billing` | Critical |
| ~2874 | Paper auto-persist search refs | `paper` | Medium |
| ~2930 | Inline citation compute failed | `citation` | Medium |
| ~2980 | Save partial message on abort | `chat.abort` | Medium |
| ~3787 | Fallback :online stream failed | `ai.fallback` | Critical |

Pattern for `.catch()` chains:
```typescript
// BEFORE:
.catch(err => console.error("[Billing] Failed to record usage:", err))
// AFTER:
.catch(err => Sentry.captureException(err, { tags: { subsystem: "billing" } }))
```

Pattern for try/catch blocks:
```typescript
// BEFORE:
} catch (error) {
    console.error("[createArtifact] Failed:", errorMessage)
}
// AFTER:
} catch (error) {
    Sentry.captureException(error, { tags: { subsystem: "artifact" } })
    console.error("[createArtifact] Failed:", errorMessage)
}
```

### 3.4 Layer 3: Payment Webhook Guard

`/api/webhooks/payment/route.ts` — 9 catch blocks yang kalau silent fail, user bayar tapi credit tidak masuk.

```typescript
// Di catch block utama
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      "api.route": "webhook.payment",
      "payment.provider": "xendit",
    },
    extra: { providerPaymentId },
  })
  console.error("[Payment Webhook] Processing error:", error)
  return NextResponse.json({ error: "Processing failed" }, { status: 500 })
}
```

---

## 4. File Changes Summary

### New Files (SDK Setup)

| File | Purpose |
|------|---------|
| `instrumentation-client.ts` | Client SDK init + replay + router capture |
| `sentry.server.config.ts` | Server SDK init |
| `sentry.edge.config.ts` | Edge SDK init |
| `src/app/global-error.tsx` | Root error boundary |

### Modified Files (Integration)

| File | Changes |
|------|---------|
| `instrumentation.ts` | Add Sentry server/edge import + `onRequestError` export |
| `next.config.ts` | Wrap with `withSentryConfig()` |
| `src/components/chat/ChatWindow.tsx` | L2: Sentry capture di `onError`, auto-trigger effect, user identity |
| `src/app/api/chat/route.ts` | L2: `captureException` di outermost catch, breadcrumbs di failover, replace critical `console.error` |
| `src/app/api/webhooks/payment/route.ts` | L3: `captureException` di catch blocks |
| `.env.example` | Already updated with Sentry vars |

### NOT Modified

- `src/lib/ai/telemetry.ts` — tetap log ke Convex, Sentry menangkap errors secara terpisah
- `src/lib/technical-report/*` — tetap jalan sebagai user-initiated feedback channel
- Marketing pages, CMS, admin panel — captured by L1 automatically, no enrichment needed

---

## 5. Sentry Tags & Context Schema

### Tags (Searchable/Filterable di Sentry Dashboard)

| Tag | Values | Source |
|-----|--------|--------|
| `chat.mode` | `normal`, `paper`, `websearch` | Route logic |
| `chat.provider` | `vercel-gateway`, `openrouter` | Model resolution |
| `chat.error_type` | `timeout`, `rate_limit`, `network`, `auth`, `server_error`, `api_error` | `classifyError()` |
| `chat.auto_triggered` | `true` | `shouldShowTechnicalReportTrigger()` |
| `api.route` | `chat`, `refrasa`, `extract-file`, `export`, `webhook.payment` | API route |
| `subsystem` | `auth`, `billing`, `artifact`, `citation`, `paper`, `title_generation`, `chat.edit`, `chat.create`, `chat.abort`, `paper.approve`, `paper.revision`, `paper.rewind`, `ai.fallback`, `email` | Catch block context |

### Context (Non-searchable, visible di event detail)

| Context Name | Fields | Source |
|-------------|--------|--------|
| `chat_diagnostic` | chatStatus, errorMessage, model, searchStatus, toolStates[] | `ChatDiagnosticSnapshot` |

---

## 6. Environment Variables

| Variable | Type | Required |
|----------|------|----------|
| `NEXT_PUBLIC_SENTRY_DSN` | Public (runtime) | Yes |
| `SENTRY_AUTH_TOKEN` | Secret (build-time) | Yes (for source maps) |
| `SENTRY_ORG` | Build-time | Yes |
| `SENTRY_PROJECT` | Build-time | Yes |

**Verified:** Sentry CLI connected successfully to org `makalah-app`, project `makalah-ai`.

---

## 7. Performance Impact

- **Bundle size**: `@sentry/nextjs` ~30KB gzipped (client), tree-shakeable
- **Runtime**: Negligible — async event capture, non-blocking
- **Build**: +10-20s for source map upload (one-time per build)
- **Sampling**: 10% traces in production, 100% error replays

---

## 8. Hubungan dengan Existing Systems

```
                    Sentry (NEW)
                   /     |        \
                  /      |         \
  [L1: Auto]    /  [L2: Enriched]   \  [L3: Guard]
  All errors   /   Chat errors +     \  Payment
  caught      /    diagnostic ctx     \  webhooks
             /           |             \
            /            |              \
  +---------+    +---------------+    +----------+
  | global   |    | ChatWindow   |    | /api/    |
  | error    |    | /api/chat    |    | webhooks |
  | boundary |    | Diagnostic   |    | payment  |
  +---------+    | Snapshot     |    +----------+
                 +---------------+
                        |
                 +---------------+
                 | Technical     |  (unchanged)
                 | Report        |  User-initiated
                 | (Convex +     |  feedback channel
                 |  Email)       |
                 +---------------+
```

**Key principle:** Sentry dan Technical Report adalah komplementer.
- Sentry = "apa yang rusak" (automatic, technical)
- Technical Report = "apa yang user alami" (manual, contextual)

---

## 9. Scope Exclusions

Hal yang TIDAK termasuk dalam design ini:

- Sentry untuk Convex backend (Convex punya built-in logging)
- Custom Sentry dashboard/alerts setup (dilakukan di Sentry UI, bukan code)
- Performance monitoring tuning (fase lanjutan, setelah baseline data terkumpul)
- Sentry feedback widget (sudah punya Technical Report)
