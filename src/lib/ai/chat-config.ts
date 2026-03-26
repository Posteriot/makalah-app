import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

/**
 * Minimal fallback system prompt
 * Used when database fetch fails or no active prompt exists
 *
 * IMPORTANT: This is intentionally minimal to:
 * 1. Indicate to admin that main prompt is not loading
 * 2. Still provide basic functionality
 * 3. Trigger monitoring alerts in admin panel
 */
export function getMinimalFallbackPrompt(): string {
    return `[⚠️ FALLBACK MODE - Primary System Prompt Not Active]

You are MOKA, the AI assistant for Makalah App, operating in LIMITED MODE.

IMPORTANT:
The primary system prompt from the database is unavailable. You are operating with basic instructions.
Inform the user that the system is in limited mode if relevant.

AVAILABLE CAPABILITIES:
1. **Paper Writing Workflow** (14 stages: gagasan → judul)
   - Tools: startPaperSession, updateStageData, submitStageForValidation, getCurrentPaperState
   - You can write full academic paper content per stage
2. **Web Search** - if the user explicitly asks to search, run it immediately
3. **Artifact Creation** (createArtifact) - for content output
4. **File Reading** - read files uploaded by the user

TOOL RULES:
- Web search and function tools CANNOT run in the same turn
- If the user explicitly requests web search, references, literature, journals, or factual lookup, perform the search in that turn
- Only ask for confirmation when YOU are proposing a search that the user did not explicitly request
- Do NOT say "please wait" and do NOT imply search will run automatically later unless the user sends another message
- After search results arrive, use function tools to save findings
- Artifacts can be created at any time (not tied to mode)

NOTE FOR USER:
If the user notices responses differ from usual, the system is in limited mode.
Advise them to contact the administrator or try again later for the full experience.

TECHNICAL NOTE (for logging):
- Fallback active because: database not responding or no active prompt
- Alert sent to admin panel
- Some detailed instructions may be unavailable

Assist the user as best you can with available capabilities.
Always respond helpfully, in a structured and actionable manner.`
}

/**
 * Log fallback activation to systemAlerts table
 * This creates an alert visible in admin panel
 */
async function logFallbackActivation(reason: string, error?: unknown): Promise<void> {
    try {
        await fetchMutation(api.systemAlerts.createAlert, {
            alertType: "fallback_activated",
            severity: "critical",
            message: `System prompt fallback activated: ${reason}`,
            source: "chat-api",
            metadata: {
                reason,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            },
        })
        console.warn(`[chat-config] Fallback activated and logged: ${reason}`)
    } catch (logError) {
        // If even logging fails, at least console.error
        console.error("[chat-config] CRITICAL: Fallback activated AND failed to log alert:", {
            reason,
            originalError: error,
            logError,
        })
    }
}

/**
 * Async function to get system prompt from database
 * Falls back to minimal prompt if:
 * - Database fetch fails
 * - No active prompt exists
 *
 * When fallback is triggered, an alert is logged to systemAlerts table
 * which is visible in admin panel for monitoring.
 */
export async function getSystemPrompt(): Promise<string> {
    try {
        const activePrompt = await fetchQuery(api.systemPrompts.getActiveSystemPrompt)

        if (activePrompt?.content) {
            return activePrompt.content
        }

        // No active prompt found - log alert and use fallback
        console.warn("[chat-config] No active system prompt in database, activating fallback")
        await logFallbackActivation("no_active_prompt")
        return getMinimalFallbackPrompt()
    } catch (error) {
        // Database error - log alert and use fallback
        console.error("[chat-config] Failed to fetch system prompt from database:", error)
        await logFallbackActivation("database_error", error)
        return getMinimalFallbackPrompt()
    }
}

// CHAT_CONFIG removed - model/provider settings are now managed via Admin Panel (database)
// Temperature, topP, etc. are also in aiProviderConfigs table
// See: src/lib/ai/streaming.ts for getProviderSettings()
