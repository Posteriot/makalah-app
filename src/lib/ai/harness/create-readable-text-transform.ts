/**
 * Readable text transform for visible compose streams (E2E iteration 3).
 *
 * Sits inside streamText's experimental_transform (at TextStreamPart level,
 * BEFORE toUIMessageStream). Buffers text-delta and reasoning-delta chunks,
 * emits them at readability boundaries, and flushes the buffer before any
 * non-text chunk so tool/step boundaries never land on a half-word.
 *
 * Flush triggers (any one):
 *   - chunking match (word / line / sentence / custom regex)
 *   - non-text chunk arrival (tool-call, start-step, finish, etc.)
 *   - maxBufferedChars threshold
 *   - maxBufferedDelayMs timeout
 *   - stream end (flush callback)
 */

import type { StreamTextTransform, ToolSet } from "ai"

const CHUNKING_PRESETS = {
    word: /\S+\s/,
    line: /\n/,
    sentence: /[.!?](?:\s|$)|\n/,
} satisfies Record<string, RegExp>

export type ChunkingPreset = keyof typeof CHUNKING_PRESETS

export interface ReadableTextTransformOptions {
    readonly chunking?: ChunkingPreset | RegExp
    readonly maxBufferedChars?: number
    readonly maxBufferedDelayMs?: number
    readonly _internal?: {
        setTimeout?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
        clearTimeout?: (timer: ReturnType<typeof setTimeout>) => void
    }
}

export const READABLE_TEXT_TRANSFORM_DEFAULTS = {
    chunking: "word" as const satisfies ChunkingPreset,
    maxBufferedChars: 240,
    maxBufferedDelayMs: 250,
}

export function createReadableTextTransform(
    options?: ReadableTextTransformOptions,
): StreamTextTransform<ToolSet> {
    const chunkingOption = options?.chunking ?? READABLE_TEXT_TRANSFORM_DEFAULTS.chunking
    const maxBufferedChars = Math.max(
        1,
        options?.maxBufferedChars ?? READABLE_TEXT_TRANSFORM_DEFAULTS.maxBufferedChars,
    )
    const maxBufferedDelayMs = Math.max(
        0,
        options?.maxBufferedDelayMs ?? READABLE_TEXT_TRANSFORM_DEFAULTS.maxBufferedDelayMs,
    )
    const setTimeoutFn =
        options?._internal?.setTimeout ?? ((fn, ms) => globalThis.setTimeout(fn, ms))
    const clearTimeoutFn =
        options?._internal?.clearTimeout ?? ((timer) => globalThis.clearTimeout(timer))

    const boundaryRegex =
        chunkingOption instanceof RegExp ? chunkingOption : CHUNKING_PRESETS[chunkingOption]

    const detectBoundary = (buffer: string): string | null => {
        if (!buffer) return null
        const re = new RegExp(boundaryRegex.source, boundaryRegex.flags)
        const match = re.exec(buffer)
        if (!match) return null
        return buffer.slice(0, match.index) + match[0]
    }

    return () => {
        let buffer = ""
        let bufferType: "text-delta" | "reasoning-delta" | undefined
        let bufferId = ""
        let providerMetadata: unknown | undefined
        let timer: ReturnType<typeof setTimeout> | null = null
        let activeController: TransformStreamDefaultController<unknown> | null = null

        const clearTimer = () => {
            if (timer !== null) {
                clearTimeoutFn(timer)
                timer = null
            }
        }

        const flushBuffer = () => {
            if (buffer.length > 0 && bufferType !== undefined && activeController) {
                activeController.enqueue({
                    type: bufferType,
                    id: bufferId,
                    text: buffer,
                    ...(providerMetadata != null ? { providerMetadata } : {}),
                })
                buffer = ""
                providerMetadata = undefined
            }
            clearTimer()
        }

        const scheduleTimerFlush = () => {
            clearTimer()
            if (maxBufferedDelayMs > 0 && buffer.length > 0) {
                timer = setTimeoutFn(() => {
                    timer = null
                    flushBuffer()
                }, maxBufferedDelayMs)
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new TransformStream<any, any>({
            transform(chunk, controller) {
                activeController = controller as TransformStreamDefaultController<unknown>

                const chunkType = (chunk as { type?: string })?.type

                if (chunkType !== "text-delta" && chunkType !== "reasoning-delta") {
                    flushBuffer()
                    controller.enqueue(chunk)
                    return
                }

                const c = chunk as {
                    type: "text-delta" | "reasoning-delta"
                    id: string
                    text: string
                    providerMetadata?: unknown
                }

                if (
                    buffer.length > 0 &&
                    (c.type !== bufferType || c.id !== bufferId)
                ) {
                    flushBuffer()
                }

                bufferType = c.type
                bufferId = c.id
                buffer += c.text ?? ""
                if (c.providerMetadata != null) {
                    providerMetadata = c.providerMetadata
                }

                let match: string | null
                while ((match = detectBoundary(buffer)) != null) {
                    controller.enqueue({
                        type: bufferType,
                        id: bufferId,
                        text: match,
                        ...(providerMetadata != null ? { providerMetadata } : {}),
                    })
                    buffer = buffer.slice(match.length)
                    providerMetadata = undefined
                }

                if (buffer.length >= maxBufferedChars) {
                    flushBuffer()
                    return
                }

                scheduleTimerFlush()
            },
            flush(controller) {
                activeController = controller as TransformStreamDefaultController<unknown>
                flushBuffer()
            },
        })
    }
}
