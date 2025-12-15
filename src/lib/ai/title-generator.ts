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

// Template prompt (Indonesia) untuk bikin judul singkat
const TITLE_PROMPT_TEMPLATE = `Buat judul singkat dan jelas untuk percakapan ini (maksimal ${TITLE_MAX_LENGTH} karakter).

Aturan:
- Bahasa Indonesia
- Tanpa tanda kutip
- Jangan pakai prefiks seperti "Judul:" atau "Title:"
- Output hanya judulnya saja

Konteks:`

function createTitlePrompt(input: TitleGenerationInput): string {
    const userPreview = input.userMessage.substring(0, MESSAGE_PREVIEW_LENGTH)
    const assistantPreview = (input.assistantMessage ?? "").substring(0, MESSAGE_PREVIEW_LENGTH)

    return [
        TITLE_PROMPT_TEMPLATE,
        "",
        "Pesan user:",
        userPreview,
        "",
        "Respons assistant:",
        assistantPreview || "(belum ada)",
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
