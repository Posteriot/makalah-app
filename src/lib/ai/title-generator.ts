import { generateText } from "ai"
import { getGatewayModel, getOpenRouterModel } from "./streaming"

// Title generation configuration
const TITLE_MAX_LENGTH = 50
const MESSAGE_PREVIEW_LENGTH = 500
const FALLBACK_TITLE_LENGTH = 30

type TitleGenerationInput = {
    userMessage: string
    assistantMessage?: string
}

const TITLE_PROMPT_TEMPLATE = `Generate a short, clear title for this conversation (max ${TITLE_MAX_LENGTH} characters).

Rules:
- Output in Indonesian (Bahasa Indonesia)
- No quotation marks
- Do not use prefixes like "Judul:" or "Title:"
- Output only the title itself

Context:`

function createTitlePrompt(input: TitleGenerationInput): string {
    const userPreview = input.userMessage.substring(0, MESSAGE_PREVIEW_LENGTH)
    const assistantPreview = (input.assistantMessage ?? "").substring(0, MESSAGE_PREVIEW_LENGTH)

    return [
        TITLE_PROMPT_TEMPLATE,
        "",
        "User message:",
        userPreview,
        "",
        "Assistant response:",
        assistantPreview || "(none yet)",
    ].join("\n")
}

export async function generateTitle(input: TitleGenerationInput): Promise<string> {
    const prompt = createTitlePrompt(input)

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
            return input.userMessage.substring(0, FALLBACK_TITLE_LENGTH) + "..."
        }
    }
}
