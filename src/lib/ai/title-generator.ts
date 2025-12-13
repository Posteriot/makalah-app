
import { generateText } from "ai"
import { getGatewayModel, getOpenRouterModel } from "./streaming"

export async function generateTitle(userMessage: string): Promise<string> {
    try {
        const model = getGatewayModel()
        const { text } = await generateText({
            model,
            prompt: `Generate a short, concise title (maximum 50 characters) for a conversation that starts with this message. The title should be in Indonesian. Do not use quotes. Just the title.\n\nMessage: "${userMessage.substring(0, 500)}"`
        })
        return text.trim().slice(0, 50)
    } catch (error) {
        console.error("Title generation failed, trying fallback...", error)
        try {
            const fallbackModel = getOpenRouterModel()
            const { text } = await generateText({
                model: fallbackModel,
                prompt: `Generate a short, concise title (maximum 50 characters) for a conversation that starts with this message. The title should be in Indonesian. Do not use quotes. Just the title.\n\nMessage: "${userMessage.substring(0, 500)}"`
            })
            return text.trim().slice(0, 50)
        } catch (finalError) {
            console.error("All title generation attempts failed", finalError)
            return userMessage.substring(0, 30) + "..."
        }
    }
}
