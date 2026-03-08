# Sentry Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Sentry into Makalah AI with app-wide error capture, enriched chat monitoring, and payment webhook guard.

**Architecture:** Three-layer approach — L1 (SDK base, app-wide auto-capture), L2 (chat enrichment with domain-specific context via existing `ChatDiagnosticSnapshot` + `classifyError()`), L3 (explicit `captureException` in payment webhook). See `docs/sentry-integration/design.md` for full design.

**Tech Stack:** `@sentry/nextjs`, Next.js 16 (App Router, `proxy.ts` instead of middleware), React 19, TypeScript

**Design doc:** `docs/sentry-integration/design.md`

---

## Task 1: Install `@sentry/nextjs` SDK

**Files:**
- Modify: `package.json`

**Step 1: Install the SDK**

Run:
```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/feat-sentry-integration
npm install @sentry/nextjs
```

Expected: Package added to `dependencies` in `package.json`.

**Step 2: Verify installation**

Run:
```bash
node -e "require('@sentry/nextjs'); console.log('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @sentry/nextjs SDK"
```

---

## Task 2: Create SDK Initialization Files (L1)

**Files:**
- Create: `instrumentation-client.ts` (project root)
- Create: `sentry.server.config.ts` (project root)
- Create: `sentry.edge.config.ts` (project root)
- Create: `instrumentation.ts` (project root)

**Note:** These files MUST be at the project root (next to `next.config.ts`), not inside `src/`. This is a `@sentry/nextjs` requirement.

**Step 1: Create `instrumentation-client.ts`**

This file runs in the browser. It initializes client-side error capture, session replay, and router transition tracking.

```typescript
// instrumentation-client.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Session Replay: always replay on error, 10% normal sessions
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration(),
  ],
})

// Instrument Next.js router navigations for performance tracing
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
```

**Step 2: Create `sentry.server.config.ts`**

This file runs on the Node.js server runtime (API routes, server components).

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance: 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
})
```

**Step 3: Create `sentry.edge.config.ts`**

This file runs on the edge runtime (used by `proxy.ts` which replaces middleware).

```typescript
// sentry.edge.config.ts
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
})
```

**Step 4: Create `instrumentation.ts`**

This file is the Next.js instrumentation hook. It loads the server/edge configs and captures server-side request errors.

```typescript
// instrumentation.ts
import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
```

**Step 5: Verify files exist at the right location**

Run:
```bash
ls -la instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts instrumentation.ts
```

Expected: All 4 files listed at project root.

**Step 6: Commit**

```bash
git add instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts instrumentation.ts
git commit -m "feat(sentry): add SDK initialization files for client, server, and edge"
```

---

## Task 3: Wrap `next.config.ts` with Sentry

**Files:**
- Modify: `next.config.ts:1-30`

**Step 1: Update `next.config.ts`**

Wrap the existing config export with `withSentryConfig()`. This enables source map upload during build and Sentry's build-time instrumentation.

The full file should become:

```typescript
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "xlsx-populate",
    "officeparser",
  ],
  outputFileTracingIncludes: {
    "/api/extract-file": [
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/legacy/build/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-*/*",
      "./node_modules/@napi-rs/canvas-*/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qr.xendit.co",
        pathname: "/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for readable stack traces
  widenClientFileUpload: true,

  // Suppress source map upload logs in CI unless debugging
  silent: !process.env.CI,
});
```

**Step 2: Verify build still works**

Run:
```bash
npm run build
```

Expected: Build succeeds. You may see Sentry source map upload logs.

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(sentry): wrap next.config.ts with withSentryConfig for source maps"
```

---

## Task 4: Create Global Error Boundary

**Files:**
- Create: `src/app/global-error.tsx`

**Step 1: Create `src/app/global-error.tsx`**

This is the Next.js App Router root error boundary. It catches unhandled errors in the root layout and reports them to Sentry. This file must use `"use client"` and render a full `<html>` tag (since the root layout itself may have errored).

Follow Mechanical Grace design system: Geist Mono for data, `rounded-action` for button.

```tsx
"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="max-w-md text-center space-y-4 p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Terjadi kesalahan sistem
          </h2>
          <p className="text-sm font-mono text-muted-foreground">
            {error.digest && (
              <span className="block text-xs mb-2">
                Kode: {error.digest}
              </span>
            )}
            Silakan coba muat ulang halaman.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-action bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/global-error.tsx
git commit -m "feat(sentry): add global error boundary with Sentry capture"
```

---

## Task 5: Verify L1 — Build & Smoke Test

**Prerequisites:** Sentry env vars (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) must be available in `.env.local` for source map upload to work during build.

**Step 1: Build the project**

Run:
```bash
npm run build
```

Expected: Build succeeds. Sentry source maps uploaded (look for `Sentry` logs in build output). If source map upload fails but build succeeds, Sentry still works — just with minified stack traces.

**Step 2: Run tests to ensure nothing broke**

Run:
```bash
npm run test
```

Expected: All existing tests pass.

**Step 3: Verify lint passes**

Run:
```bash
npm run lint
```

Expected: No new lint errors.

**Step 4: Commit (if any fixes needed)**

Only if fixes were needed during this step.

---

## Task 6: Chat Client Enrichment (L2 — Client Side)

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Key variables in scope (verified against codebase):**
- `currentUser` (line 366): `const { user: currentUser } = useCurrentUser()` — NOT `user`
- `isPaperMode` (line 424): boolean from `usePaperSession`
- `paperSession` (line 423): object from `usePaperSession` — use `isPaperMode` for tags
- `latestAssistantModel` (line 582): string | undefined
- `safeConversationId` (line 416): `Id<"conversations"> | null`
- `technicalReportSnapshot` (line 1119): `ChatDiagnosticSnapshot`

This is the core investment. Wire existing diagnostic infrastructure to Sentry.

**Step 1: Add Sentry import**

At the top of `ChatWindow.tsx` (after existing imports, around line 1), add:

```typescript
import * as Sentry from "@sentry/nextjs"
```

**Step 2: Enrich `onError` callback**

Find the `onError` callback at line ~701:

```typescript
// BEFORE (line 701-704):
    onError: (err) => {
      if (isQuotaExceededChatError(err)) return
      toast.error("Terjadi kesalahan: " + (err.message || "Gagal memproses pesan"))
    }
```

Replace with:

```typescript
    onError: (err) => {
      if (isQuotaExceededChatError(err)) return
      toast.error("Terjadi kesalahan: " + (err.message || "Gagal memproses pesan"))

      Sentry.withScope((scope) => {
        scope.setTag("chat.mode", isPaperMode ? "paper" : "normal")
        scope.setTag("chat.provider", latestAssistantModel ?? "unknown")
        scope.setContext("chat_diagnostic", technicalReportSnapshot)
        if (safeConversationId) scope.setTag("chat.conversationId", String(safeConversationId))
        Sentry.captureException(err)
      })
    }
```

**Step 3: Add auto-capture effect for `shouldShowTechnicalReportAutoTrigger`**

Find `shouldShowTechnicalReportAutoTrigger` memo at line ~1130-1138. After it (e.g., after line 1138), add a new `useEffect`:

```typescript
  // Sentry: auto-capture when technical report trigger fires
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

**Note:** The `sentryAutoTriggerFired` ref prevents duplicate Sentry events when the memo recomputes with the same `true` value. It resets when the trigger clears.

**Step 4: Add Sentry user identity**

Find `const { user: currentUser } = useCurrentUser()` at line ~366. After it, add a `useEffect` for Sentry user identity (place it near other user-related effects):

```typescript
  // Sentry: set user identity for error correlation
  useEffect(() => {
    if (currentUser) {
      Sentry.setUser({ id: currentUser._id, email: currentUser.email })
    } else {
      Sentry.setUser(null)
    }
  }, [currentUser])
```

**Step 5: Add Sentry capture to critical client catch blocks**

There are 5 critical catch blocks in ChatWindow.tsx where user actions fail silently (only `console.error`). Add `Sentry.captureException` BEFORE each `console.error`:

**5a. Edit and resend (line ~1511):**

Find:
```typescript
      console.error("Failed to edit and resend:", error)
```
Add BEFORE it:
```typescript
      Sentry.captureException(error, { tags: { subsystem: "chat.edit" } })
```

**5b. Approve stage (line ~1553):**

Find:
```typescript
      console.error("Failed to approve stage:", error)
```
Add BEFORE it:
```typescript
      Sentry.captureException(error, { tags: { subsystem: "paper.approve" } })
```

**5c. Request revision (line ~1566):**

Find:
```typescript
      console.error("Failed to request revision:", error)
```
Add BEFORE it:
```typescript
      Sentry.captureException(error, { tags: { subsystem: "paper.revision" } })
```

**5d. Create conversation (line ~1598):**

Find:
```typescript
      console.error("Failed to create conversation:", error)
```
Add BEFORE it:
```typescript
      Sentry.captureException(error, { tags: { subsystem: "chat.create" } })
```

**5e. Rewind failed (line ~1641):**

Find:
```typescript
      console.error("Rewind failed:", error)
```
Add BEFORE it:
```typescript
      Sentry.captureException(error, { tags: { subsystem: "paper.rewind" } })
```

**Step 6: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(sentry): add chat client enrichment — onError, auto-trigger, user identity, critical catch blocks"
```

---

## Task 7: Chat Server Enrichment (L2 — Server Side)

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Add Sentry import**

At the top of the file (line 1), add:

```typescript
import * as Sentry from "@sentry/nextjs"
```

**Step 2: Enrich outermost catch (line ~3801-3803)**

Find:
```typescript
    } catch (error) {
        console.error("Chat API Error:", error)
        return new Response("Internal Server Error", { status: 500 })
    }
```

Replace with:
```typescript
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                "api.route": "chat",
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

**Step 3: Add breadcrumb at Gateway failover (line ~3108-3109)**

Find:
```typescript
        } catch (error) {
            console.error("Gateway stream failed, trying fallback:", error)
```

Add AFTER the `console.error` line:
```typescript
            Sentry.addBreadcrumb({
                category: "ai.failover",
                message: `Primary provider failed, switching to fallback`,
                level: "warning",
                data: { errorType: classifyError(error).errorType },
            })
```

**Step 4: Capture Convex token retry failure (line ~94)**

Find:
```typescript
            console.error("[Chat API] Failed to get Convex token after retry:", tokenError)
```

Add BEFORE it:
```typescript
            Sentry.captureException(tokenError instanceof Error ? tokenError : new Error(String(tokenError)), {
                tags: { "api.route": "chat", subsystem: "auth" },
            })
```

**Step 5: Replace billing `.catch` silent failures**

There are 4 billing catch blocks (lines ~2317, ~2906, ~3266, ~3718) with identical pattern. Replace each:

Find (all 4 instances):
```typescript
.catch(err => console.error("[Billing] Failed to record usage:", err))
```

Replace with:
```typescript
.catch(err => Sentry.captureException(err, { tags: { subsystem: "billing" } }))
```

**Step 6: Replace title generation silent failure (line ~259)**

Find:
```typescript
.catch(err => console.error("Background title generation error:", err))
```

Replace with:
```typescript
.catch(err => Sentry.captureException(err, { tags: { subsystem: "title_generation" } }))
```

**Step 7: Capture artifact tool failures (lines ~1468, ~1544, ~1597)**

For each of the 3 artifact catch blocks, add `Sentry.captureException` BEFORE the existing `console.error`:

**7a. createArtifact (line ~1468):**

Find:
```typescript
                        console.error("[createArtifact] Failed:", errorMessage)
```
Add BEFORE it:
```typescript
                        Sentry.captureException(error, { tags: { subsystem: "artifact" } })
```

**7b. updateArtifact (line ~1544):**

Find:
```typescript
                        console.error("[updateArtifact] Failed:", errorMessage)
```
Add BEFORE it:
```typescript
                        Sentry.captureException(error, { tags: { subsystem: "artifact" } })
```

**7c. readArtifact (line ~1597):**

Find:
```typescript
                        console.error("[readArtifact] Failed:", errorMessage)
```
Add BEFORE it:
```typescript
                        Sentry.captureException(error, { tags: { subsystem: "artifact" } })
```

**Step 8: Capture paper search ref persistence failure (line ~2874)**

Find:
```typescript
                                            console.error("[Paper] Failed to auto-persist search references:", err)
```
Add BEFORE it:
```typescript
                                            Sentry.captureException(err, { tags: { subsystem: "paper" } })
```

Note: There is a second identical block at line ~3662 (fallback path). Apply the same change there.

**Step 9: Capture citation compute failure (line ~2930)**

Find:
```typescript
                                    console.error("[Chat API] Failed to compute inline citations:", err)
```
Add BEFORE it:
```typescript
                                    Sentry.captureException(err, { tags: { subsystem: "citation" } })
```

**Step 10: Capture partial message save on abort (line ~2980)**

Find:
```typescript
                                        console.error("[Chat API] Failed to save partial message on abort:", err)
```
Add BEFORE it:
```typescript
                                        Sentry.captureException(err, { tags: { subsystem: "chat.abort" } })
```

**Step 11: Capture fallback :online stream failure (line ~3787)**

Find:
```typescript
                console.error("[Fallback] :online stream failed, retrying without search:", onlineError)
```
Add BEFORE it:
```typescript
                Sentry.captureException(onlineError, { tags: { subsystem: "ai.fallback" } })
```

**Step 12: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(sentry): add chat server enrichment — error capture, failover breadcrumbs, all critical catch blocks"
```

---

## Task 8: Payment Webhook Guard (L3)

**Files:**
- Modify: `src/app/api/webhooks/payment/route.ts:7,21-23,30-32,61-68,84-86,244-246,298-300`

**Step 1: Add Sentry import**

At the top (after existing imports, line ~7), add:

```typescript
import * as Sentry from "@sentry/nextjs"
```

**Step 2: Add capture to main processing catch (line 61-68)**

Find:
```typescript
  } catch (error) {
    console.error("[Payment Webhook] Processing error:", error)
```

Add AFTER `console.error`:
```typescript
    Sentry.captureException(error, {
      tags: {
        "api.route": "webhook.payment",
        "payment.status": event.status,
      },
      extra: { providerPaymentId: event.providerPaymentId },
    })
```

**Step 3: Capture "Payment not found" as warning (line 84-86)**

Find:
```typescript
  if (!payment) {
    console.error(`[Payment] Payment not found in DB: ${providerPaymentId}`)
    return
  }
```

Add AFTER `console.error`:
```typescript
    Sentry.captureMessage(`Payment not found in DB: ${providerPaymentId}`, {
      level: "error",
      tags: { "api.route": "webhook.payment" },
    })
```

**Step 4: Capture email failures (line 244-246 and 298-300)**

Find both instances of:
```typescript
  } catch (emailError) {
    // Email failure should not break webhook processing
    console.error(`[Payment] Email notification failed:`, emailError)
  }
```

and:
```typescript
  } catch (emailError) {
    // Email failure should not break webhook processing
    console.error(`[Payment] Failed email notification failed:`, emailError)
  }
```

Add AFTER each `console.error`:
```typescript
    Sentry.captureException(emailError, {
      tags: { "api.route": "webhook.payment", subsystem: "email" },
    })
```

**Step 5: Capture server misconfiguration (line 21-23)**

Find:
```typescript
  if (!internalKey) {
    console.error("[Payment Webhook] CONVEX_INTERNAL_KEY belum diset")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }
```

Add AFTER `console.error`:
```typescript
    Sentry.captureMessage("CONVEX_INTERNAL_KEY not configured for payment webhook", {
      level: "fatal",
      tags: { "api.route": "webhook.payment" },
    })
```

**Step 6: Commit**

```bash
git add src/app/api/webhooks/payment/route.ts
git commit -m "feat(sentry): add payment webhook guard — capture processing errors, missing payments, email failures"
```

---

## Task 9: Final Verification

**Step 1: Run tests**

Run:
```bash
npm run test
```

Expected: All tests pass.

**Step 2: Run lint**

Run:
```bash
npm run lint
```

Expected: No lint errors.

**Step 3: Build**

Run:
```bash
npm run build
```

Expected: Build succeeds with Sentry source map upload.

**Step 4: Verify Sentry receives a test event**

Run (requires env vars loaded):
```bash
export $(grep -E '^(SENTRY_|NEXT_PUBLIC_SENTRY)' .env.local | xargs) && npx sentry-cli send-event -m "Test event from Makalah AI integration"
```

Expected: Event ID returned. Verify event appears in Sentry Dashboard → project `makalah-ai`.

**Step 5: Final commit if needed**

Only if fixes were required during verification.

---

## Task 10: Update Documentation

**Files:**
- Modify: `docs/sentry-integration/context.md` (replace with final context)
- The design doc `docs/sentry-integration/design.md` is already written

**Step 1: Update `context.md` to reflect completed state**

Replace the existing brainstorming notes in `context.md` with a concise summary that references the design doc.

**Step 2: Commit all docs**

```bash
git add docs/sentry-integration/
git commit -m "docs(sentry): finalize integration documentation"
```

---

## Summary

| Task | Layer | What | Files |
|------|-------|------|-------|
| 1 | Setup | Install SDK | `package.json` |
| 2 | L1 | SDK init files (client, server, edge, instrumentation) | 4 new root files |
| 3 | L1 | Wrap `next.config.ts` | `next.config.ts` |
| 4 | L1 | Global error boundary | `src/app/global-error.tsx` |
| 5 | L1 | Build & smoke test | — |
| 6 | L2 | Chat client enrichment (onError, auto-trigger, user identity, 5 critical catches) | `ChatWindow.tsx` |
| 7 | L2 | Chat server enrichment (outermost catch, failover, 4 billing, 3 artifact, auth, citation, paper, abort, fallback) | `/api/chat/route.ts` |
| 8 | L3 | Payment webhook guard | `/api/webhooks/payment/route.ts` |
| 9 | — | Final verification | — |
| 10 | — | Documentation | `docs/sentry-integration/` |

**Total new files:** 5 (4 SDK config + 1 error boundary)
**Total modified files:** 4 (`next.config.ts`, `ChatWindow.tsx`, chat route, payment webhook)
