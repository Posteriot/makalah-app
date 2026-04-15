import type { Id } from "../../../../convex/_generated/dataModel"
import { api } from "../../../../convex/_generated/api"
import { buildSourceInventoryContext } from "@/lib/ai/exact-source-guardrails"
import type { ExactSourceSummary } from "@/lib/ai/exact-source-followup"
import type { ConvexFetchQuery } from "../types"
import type { RecentSource } from "./types"

export async function fetchAndAssembleSourcesContext(params: {
    conversationId: Id<"conversations">
    fetchQueryWithToken: ConvexFetchQuery
}): Promise<{
    recentSourcesList: RecentSource[]
    availableExactSources: ExactSourceSummary[]
    hasRecentSourcesInDb: boolean
    sourcesContext: string
    sourceInventoryContext: string
}> {
    const { conversationId, fetchQueryWithToken } = params

    let sourcesContext = ""
    let hasRecentSourcesInDb = false
    let recentSourcesList: RecentSource[] = []
    let availableExactSources: ExactSourceSummary[] = []

    // ── Fetch recent web search sources from DB ──
    try {
        const recentSources = await fetchQueryWithToken(api.messages.getRecentSources, {
            conversationId,
            limit: 5,
        })

        if (recentSources && recentSources.length > 0) {
            hasRecentSourcesInDb = true
            recentSourcesList = recentSources
            const sourcesJson = JSON.stringify(recentSources, null, 2)
            sourcesContext = `AVAILABLE_WEB_SOURCES (dari hasil web search sebelumnya):
${sourcesJson}`
        }
    } catch (sourcesError) {
        console.error("[route] Failed to fetch recent sources:", sourcesError)
        // Non-blocking - continue without sources context
    }

    // ── Fetch exact source inventory ──
    try {
        const exactSources = await fetchQueryWithToken(
            api.sourceDocuments.listSourceSummariesByConversation,
            {
                conversationId,
            }
        )

        if (Array.isArray(exactSources) && exactSources.length > 0) {
            availableExactSources = exactSources
        }
    } catch (exactSourcesError) {
        console.error("[route] Failed to fetch exact source summaries:", exactSourcesError)
    }

    // ── Build source inventory context ──
    const sourceInventoryContext = buildSourceInventoryContext({
        recentSources: recentSourcesList,
        exactSources: availableExactSources,
    })

    return {
        recentSourcesList,
        availableExactSources,
        hasRecentSourcesInDb,
        sourcesContext,
        sourceInventoryContext,
    }
}
