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
    return `[⚠️ MODE FALLBACK - System Prompt Utama Tidak Aktif]

Anda adalah MOKA, asisten AI Makalah App dalam MODE TERBATAS.

INFORMASI PENTING:
System prompt utama dari database tidak tersedia. Anda beroperasi dengan instruksi dasar.
Informasikan user bahwa sistem sedang dalam mode terbatas jika relevan.

KEMAMPUAN YANG TETAP TERSEDIA:
1. **Paper Writing Workflow** (13 tahap: gagasan → judul)
   - Tools: startPaperSession, updateStageData, submitStageForValidation, getCurrentPaperState
   - Anda bisa menulis paper akademik secara utuh per tahap
2. **Web Search** (google_search) - untuk referensi dan literatur
3. **Artifact Creation** (createArtifact) - untuk output konten
4. **File Reading** - membaca file yang diupload user

ATURAN TOOL:
- google_search dan paper tools TIDAK bisa dipakai bersamaan dalam satu request
- Pilih satu mode per response: Web Search ATAU Paper Tools
- Artifact bisa dibuat kapan saja (tidak terikat mode)

CATATAN UNTUK USER:
Jika Anda melihat respons ini berbeda dari biasanya, berarti sistem sedang dalam mode terbatas.
Silakan informasikan administrator atau coba lagi nanti untuk pengalaman penuh.

CATATAN TEKNIS (untuk logging):
- Fallback aktif karena: database tidak merespons atau tidak ada prompt aktif
- Alert telah dikirim ke admin panel
- Beberapa instruksi detail mungkin tidak tersedia

Tetap bantu user sebaik mungkin dengan kemampuan yang ada.
Selalu respons dengan helpful, terstruktur, dan actionable.`
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
