import * as Sentry from "@sentry/nextjs"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { retryQuery, retryDelay } from "@/lib/convex/retry"
import {
    checkQuotaBeforeOperation,
    createQuotaExceededResponse,
    type OperationType,
} from "@/lib/billing/enforcement"
import { parseOptionalChoiceInteractionEvent } from "@/lib/chat/choice-request"
import type { AcceptedChatRequest } from "../types"

/**
 * Validates and accepts an incoming chat request.
 *
 * Performs auth, token acquisition, body parsing, user lookup, and billing
 * pre-flight. Returns an `AcceptedChatRequest` on success, or a `Response`
 * on any early rejection (401, 404, quota exceeded).
 */
export async function acceptChatRequest(req: Request): Promise<AcceptedChatRequest | Response> {
    // 1. Authenticate with BetterAuth
    const isAuthed = await isAuthenticated()
    if (!isAuthed) {
        return new Response("Unauthorized", { status: 401 })
    }

    // 1.1. Ambil token BetterAuth untuk Convex auth guard
    let convexToken: string | null = null
    let tokenError: unknown = null
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            convexToken = (await getToken()) ?? null
            if (convexToken) {
                break
            }
            tokenError = new Error("Convex auth token missing")
        } catch (error) {
            tokenError = error
        }

        if (attempt < 3) {
            await retryDelay(attempt * 150)
        }
    }
    if (!convexToken) {
        Sentry.captureException(tokenError instanceof Error ? tokenError : new Error(String(tokenError)), {
            tags: { "api.route": "chat", subsystem: "auth" },
        })
        console.error("[Chat API] Failed to get Convex token after retry:", tokenError)
        return new Response("Session token unavailable. Please refresh and retry.", { status: 401 })
    }
    const convexOptions = { token: convexToken }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchQueryWithToken = (ref: any, args: any) => fetchQuery(ref, args, convexOptions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchMutationWithToken = (ref: any, args: any) => fetchMutation(ref, args, convexOptions)

    // 2. Parse request (AI SDK v5/v6 format)
    const body = await req.json()
    const {
        messages,
        conversationId,
        fileIds: requestFileIds,
        attachmentMode: requestedAttachmentMode,
        replaceAttachmentContext,
        inheritAttachmentContext,
        clearAttachmentContext,
        requestStartedAt: rawRequestStartedAt,
    } = body
    const requestStartedAt =
        typeof rawRequestStartedAt === "number" &&
        Number.isFinite(rawRequestStartedAt) &&
        rawRequestStartedAt > 0
            ? rawRequestStartedAt
            : undefined
    const choiceInteractionEvent = parseOptionalChoiceInteractionEvent(body)
    if (choiceInteractionEvent) {
        console.info(`[CHOICE-CARD][event-received] type=${choiceInteractionEvent.type} stage=${choiceInteractionEvent.stage} selected=${choiceInteractionEvent.selectedOptionIds.join(",")} workflowAction=${choiceInteractionEvent.workflowAction ?? "unknown"}`)
    }
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    // Observability: log user input at request entry
    {
        const lastMsg = messages[messages.length - 1]
        const userText = lastMsg?.role === "user"
            ? (lastMsg.content || lastMsg.parts?.find((p: { type: string; text?: string }) => p.type === "text")?.text || "")
            : ""
        const truncated = typeof userText === "string" ? userText.slice(0, 120) : ""
        if (choiceInteractionEvent) {
            console.info(`[USER-INPUT] type=choice-selection stage=${choiceInteractionEvent.stage} selected=${choiceInteractionEvent.selectedOptionIds.join(",")}`)
        } else if (truncated) {
            console.info(`[USER-INPUT] type=prompt text="${truncated}${userText.length > 120 ? "..." : ""}"`)
        }
    }

    // 3. Get Convex User ID
    const userId = await retryQuery(
        () => fetchQueryWithToken(api.chatHelpers.getMyUserId, {}),
        "chatHelpers.getMyUserId"
    )
    if (!userId) {
        return new Response("User not found in database", { status: 404 })
    }

    // Extract first user message content (handle AI SDK v5/v6 UIMessage format)
    const firstUserMsg = messages.find((m: { role: string }) => m.role === "user")
    const firstUserContent = firstUserMsg?.content ||
        firstUserMsg?.parts?.find((p: { type: string; text?: string }) => p.type === 'text')?.text ||
        ""

    // ════════════════════════════════════════════════════════════════
    // BILLING: Pre-flight quota check
    // ════════════════════════════════════════════════════════════════
    const lastMsgForQuota = messages[messages.length - 1]
    const lastUserContentForQuota = lastMsgForQuota?.role === "user"
        ? (lastMsgForQuota.content ||
            lastMsgForQuota.parts?.find((p: { type: string; text?: string }) => p.type === "text")?.text ||
            "")
        : ""

    // Determine operation type (will be refined later when we know paper session)
    const initialOperationType: OperationType = "chat_message"

    // Check quota before proceeding
    const quotaCheck = await checkQuotaBeforeOperation(
        userId,
        lastUserContentForQuota,
        initialOperationType,
        convexToken
    )

    if (!quotaCheck.allowed) {
        console.warn("[Billing] Quota check failed:", {
            userId,
            reason: quotaCheck.reason,
            message: quotaCheck.message,
            tier: quotaCheck.tier,
        })
        return createQuotaExceededResponse(quotaCheck)
    }

    // Store for later use in onFinish
    const billingContext = {
        userId,
        quotaWarning: quotaCheck.warning,
        operationType: initialOperationType as OperationType,
    }
    // ════════════════════════════════════════════════════════════════

    // ════════════════════════════════════════════════════════════════
    // Phase 8 — resume header parsing (Task 8.3a)
    // ════════════════════════════════════════════════════════════════
    // If `x-harness-resume: <runId>` is present, the caller is re-entering
    // a paused run after a decision was resolved. We fetch the run via the
    // authenticated Convex query (which enforces ownership) and validate:
    //   1. Run exists (else 404)
    //   2. Status is `paused` (else 409)
    //   3. Access granted (else 403 — getRunById returns null on mismatch)
    // On success we surface a `resumeContext` that the orchestrator uses to
    // skip resolveRunLane and reuse persisted lane identifiers.
    let resumeContext: AcceptedChatRequest["resumeContext"]
    const resumeRunId = req.headers.get("x-harness-resume")
    if (resumeRunId) {
        const pausedRun = await fetchQueryWithToken(api.harnessRuns.getRunById, {
            runId: resumeRunId as Id<"harnessRuns">,
        }) as {
            _id: Id<"harnessRuns">
            conversationId: Id<"conversations">
            paperSessionId?: Id<"paperSessions">
            ownerToken: string
            status: string
            workflowStage: string
        } | null

        if (pausedRun === null) {
            // Convex getRunById returns null for BOTH not-found and
            // ownership-denied — we cannot disambiguate without leaking
            // run existence to unauthenticated callers. Return 403 which
            // covers both cases safely (404 would confirm non-existence
            // to an attacker who guessed a real runId).
            return new Response("Forbidden", { status: 403 })
        }

        if (pausedRun.status !== "paused") {
            return new Response(`Run is not paused (status=${pausedRun.status})`, {
                status: 409,
            })
        }

        resumeContext = {
            runId: pausedRun._id,
            ownerToken: pausedRun.ownerToken,
            paperSessionId: pausedRun.paperSessionId,
            workflowStage: pausedRun.workflowStage,
            conversationId: pausedRun.conversationId,
        }

        console.info(
            `[HARNESS][entry] resume header detected runId=${pausedRun._id} workflowStage=${pausedRun.workflowStage}`,
        )
    }

    return {
        requestId,
        userId,
        convexToken,
        messages,
        lastUserContent: lastUserContentForQuota,
        firstUserContent,
        requestStartedAt,
        billingContext,
        choiceInteractionEvent,
        fetchQueryWithToken,
        fetchMutationWithToken,
        conversationId: conversationId as Id<"conversations"> | undefined,
        requestFileIds,
        requestedAttachmentMode,
        replaceAttachmentContext,
        inheritAttachmentContext,
        clearAttachmentContext,
        ...(resumeContext !== undefined ? { resumeContext } : {}),
    }
}
