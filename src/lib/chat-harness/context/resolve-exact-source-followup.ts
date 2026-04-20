import type { LanguageModel } from "ai"

import { resolveExactSourceFollowup } from "@/lib/ai/exact-source-followup"
import type {
    ExactSourceConversationMessage,
    ExactSourceFollowupResolution,
    ExactSourceSummary,
} from "@/lib/ai/exact-source-followup"
import { shouldIncludeRawSourcesContextForExactFollowup } from "@/lib/ai/exact-source-guardrails"

/**
 * Resolve exact-source followup intent and derive routing flags.
 *
 * Wraps the classifier call (`resolveExactSourceFollowup`) and computes the
 * three boolean flags that downstream context assembly and tool policy use.
 */
export async function resolveExactSourceFollowupStep(params: {
    model: LanguageModel
    lastUserContent: string
    recentConversationMessages: ExactSourceConversationMessage[]
    availableExactSources: ExactSourceSummary[]
    hasRecentSourcesInDb: boolean
}): Promise<{
    resolution: ExactSourceFollowupResolution
    shouldIncludeRawSourcesContext: boolean
    shouldIncludeExactInspectionSystemMessage: boolean
    shouldIncludeRecentSourceSkillInstructions: boolean
}> {
    const {
        model,
        lastUserContent,
        recentConversationMessages,
        availableExactSources,
        hasRecentSourcesInDb,
    } = params

    const resolution = await resolveExactSourceFollowup({
        lastUserMessage: lastUserContent,
        recentMessages: recentConversationMessages,
        availableExactSources,
        model,
    })

    console.log(
        `[EXACT-SOURCE-RESOLUTION] mode=${resolution.mode} reason=${resolution.reason}${resolution.mode === "force-inspect" ? ` matchedSourceId=${resolution.matchedSource.sourceId.slice(0, 60)}` : ""}`
    )

    const shouldIncludeRawSourcesContext =
        shouldIncludeRawSourcesContextForExactFollowup(resolution)

    const shouldIncludeExactInspectionSystemMessage =
        resolution.mode !== "clarify"

    const shouldIncludeRecentSourceSkillInstructions =
        hasRecentSourcesInDb && shouldIncludeRawSourcesContext

    return {
        resolution,
        shouldIncludeRawSourcesContext,
        shouldIncludeExactInspectionSystemMessage,
        shouldIncludeRecentSourceSkillInstructions,
    }
}
