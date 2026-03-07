# Sentry Integration — Context & Summary

**Status:** Implemented
**Branch:** `feat/sentry-integration`
**Date:** 2026-03-07

## What Was Built

Three-layer Sentry integration for Makalah AI:

- **L1 (SDK Base):** App-wide auto-capture via `@sentry/nextjs` — unhandled exceptions, web vitals, session replay, source maps
- **L2 (Chat Enrichment):** Domain-specific context in `ChatWindow.tsx` and `/api/chat/route.ts` — `ChatDiagnosticSnapshot`, `classifyError()` tags, auto-trigger capture, user identity
- **L3 (Payment Guard):** Explicit error capture in `/api/webhooks/payment/route.ts` — processing errors, missing payments, email failures, misconfiguration

## Key Decision

Chose "App-Wide Safety Net + Chat Enrichment" over "Chat-Only Surgical" because `@sentry/nextjs` is inherently app-wide. Limiting scope artificially adds complexity. Instead: let SDK capture everything, invest enrichment only in chat.

## Files

See `design.md` for full architecture and `implementation-plan.md` for step-by-step details.

### New Files
- `instrumentation-client.ts` — Client SDK init + replay
- `sentry.server.config.ts` — Server SDK init
- `sentry.edge.config.ts` — Edge SDK init
- `instrumentation.ts` — Next.js instrumentation hook
- `src/app/global-error.tsx` — Root error boundary

### Modified Files
- `next.config.ts` — `withSentryConfig()` wrapper
- `src/components/chat/ChatWindow.tsx` — L2 client enrichment (11 Sentry calls)
- `src/app/api/chat/route.ts` — L2 server enrichment (16 Sentry calls)
- `src/app/api/webhooks/payment/route.ts` — L3 payment guard (5 Sentry calls)

## Relationship with Existing Systems

- **Technical Report** (unchanged): User-initiated feedback channel — complementary to Sentry
- **AI Telemetry** (unchanged): Server-side logging to Convex — Sentry captures errors separately
- **classifyError()**: Used for Sentry breadcrumb data at failover point
- **ChatDiagnosticSnapshot**: Attached as Sentry context on chat errors
