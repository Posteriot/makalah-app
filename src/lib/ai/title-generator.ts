import { generateText } from "ai"
import { getGatewayModel, getOpenRouterModel } from "./streaming"

// Title generation configuration
const TITLE_MAX_LENGTH = 50
const MESSAGE_PREVIEW_LENGTH = 500
const FALLBACK_TITLE_LENGTH = 30

// Title generation prompt template
const TITLE_PROMPT_TEMPLATE = `Generate a short, concise title (maximum ${TITLE_MAX_LENGTH} characters) for a conversation that starts with this message. The title should be in Indonesian. Do not use quotes. Just the title.

Message: `

/**
 * Helper function to create full prompt with message
 */
function createTitlePrompt(userMessage: string): string {
    const messagePreview = userMessage.substring(0, MESSAGE_PREVIEW_LENGTH)
    return `${TITLE_PROMPT_TEMPLATE}"${messagePreview}"`
}

export async function generateTitle(userMessage: string): Promise<string> {
    const prompt = createTitlePrompt(userMessage)

    try {
        const model = await getGatewayModel()
        const { text } = await generateText({
            model,
            prompt
        })
        return text.trim().slice(0, TITLE_MAX_LENGTH)
    } catch (error) {
        console.error("Title generation failed, trying fallback...", error)
        try {
            const fallbackModel = await getOpenRouterModel()
            const { text } = await generateText({
                model: fallbackModel,
                prompt
            })
            return text.trim().slice(0, TITLE_MAX_LENGTH)
        } catch (finalError) {
            console.error("All title generation attempts failed", finalError)
            return userMessage.substring(0, FALLBACK_TITLE_LENGTH) + "..."
        }
    }
}
