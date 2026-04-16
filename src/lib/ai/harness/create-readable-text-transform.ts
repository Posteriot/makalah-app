/**
 * Readable text transform for visible compose streams.
 *
 * Iteration 5 — pipeline audit revealed @json-render/yaml's pipeYamlRender
 * re-splits every text-delta into per-character chunks (its fence-scanning
 * loop emits `emitTextDelta(ch, controller)` for each char). That silently
 * undid the coalescing done by iteration 3/4's transform at streamText level.
 *
 * The fix is a TWO-STAGE pipeline:
 *
 *   1. `createReadableTextTransform` — sits in streamText's
 *      `experimental_transform`. Operates on TextStreamPart chunks (field
 *      name: `.text`). Smooths reasoning-delta (which pipeYamlRender does
 *      NOT re-split) and gives pipePlanCapture larger-granularity input.
 *
 *   2. `createUITextCoalescer` / `pipeUITextCoalesce` — sits AFTER
 *      pipeYamlRender, operating on UIMessageChunk chunks (field name:
 *      `.delta`). Re-coalesces the per-char text-delta stream that
 *      pipeYamlRender produced, so the writer loop + client see
 *      sentence-level output.
 *
 * Both helpers share the same two-tier boundary policy:
 *
 *   - PRIMARY chunking (default: sentence) drives steady-state emission.
 *   - SAFE boundary (always word-level) drives partial-flush at non-text
 *     chunk arrival and timer-based fallback. The partial tail is HELD
 *     across non-text (tool-call etc.) boundaries so a mid-word never
 *     freezes on screen while a tool runs.
 *   - Stream-terminating chunks (finish / error / abort) force full
 *     flush before forwarding so the terminator is always the last
 *     event the UI sees.
 *   - maxBufferedChars forces full flush on pathological long-run input
 *     (e.g. URL with no whitespace, longer than the cap).
 *   - maxBufferedDelayMs timer triggers partial-safe flush (never breaks
 *     a word) so slow-model prose doesn't hide indefinitely.
 *   - id/type change forces full flush (cannot merge across streams).
 *   - End of stream (flush callback) forces full flush.
 */

import type { StreamTextTransform, ToolSet } from "ai"

/**
 * Primary chunking presets. `sentence` uses whitespace after punctuation (no
 * end-of-buffer match) so normal word-end periods don't false-trigger when
 * the word continues in the next delta.
 */
const CHUNKING_PRESETS = {
    word: /\S+\s/,
    line: /\n/,
    sentence: /[.!?]\s|\n/,
} satisfies Record<string, RegExp>

/** Word-level safe boundary used for partial flushes at non-text/timer. */
const SAFE_BOUNDARY_REGEX_SOURCE = /\S+\s/.source
const SAFE_BOUNDARY_REGEX_FLAGS = "g"

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
    chunking: "sentence" as const satisfies ChunkingPreset,
    maxBufferedChars: 240,
    maxBufferedDelayMs: 250,
}

/**
 * Find the end index (exclusive) of the last /\S+\s/ match in buffer.
 * Returns 0 if no safe boundary found — caller should hold the buffer.
 */
function findLastSafeBoundaryEndIndex(buffer: string): number {
    if (!buffer) return 0
    const re = new RegExp(SAFE_BOUNDARY_REGEX_SOURCE, SAFE_BOUNDARY_REGEX_FLAGS)
    let lastEnd = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(buffer)) != null) {
        const end = m.index + m[0].length
        if (end > lastEnd) lastEnd = end
        if (m.index === re.lastIndex) re.lastIndex += 1
    }
    return lastEnd
}

/**
 * Core factory — parameterised by the field name that holds text payload.
 *
 * - `textField: "text"` — TextStreamPart (streamText's fullStream level,
 *   used by `experimental_transform`).
 * - `textField: "delta"` — UIMessageChunk (after `toUIMessageStream` and
 *   `pipeYamlRender`, used by the re-coalescing pipe helper).
 */
function createCoreCoalescer(params: {
    options?: ReadableTextTransformOptions
    textField: "text" | "delta"
}): () => TransformStream<unknown, unknown> {
    const { options, textField } = params
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

    const primaryBoundaryRegex =
        chunkingOption instanceof RegExp ? chunkingOption : CHUNKING_PRESETS[chunkingOption]

    const detectPrimaryBoundary = (buffer: string): string | null => {
        if (!buffer) return null
        const re = new RegExp(primaryBoundaryRegex.source, primaryBoundaryRegex.flags)
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

        const buildEmission = (text: string): Record<string, unknown> => ({
            type: bufferType,
            id: bufferId,
            [textField]: text,
            ...(providerMetadata != null ? { providerMetadata } : {}),
        })

        const fullFlush = () => {
            if (buffer.length > 0 && bufferType !== undefined && activeController) {
                activeController.enqueue(buildEmission(buffer))
                buffer = ""
                providerMetadata = undefined
            }
            clearTimer()
        }

        const partialSafeFlush = () => {
            if (buffer.length === 0 || bufferType === undefined || !activeController) {
                clearTimer()
                return
            }
            const end = findLastSafeBoundaryEndIndex(buffer)
            if (end === 0) {
                clearTimer()
                return
            }
            const flushed = buffer.slice(0, end)
            const tail = buffer.slice(end)
            activeController.enqueue(buildEmission(flushed))
            buffer = tail
            providerMetadata = undefined
            clearTimer()
        }

        const scheduleTimerFlush = () => {
            clearTimer()
            if (maxBufferedDelayMs > 0 && buffer.length > 0) {
                timer = setTimeoutFn(() => {
                    timer = null
                    partialSafeFlush()
                }, maxBufferedDelayMs)
            }
        }

        return new TransformStream<unknown, unknown>({
            transform(chunk, controller) {
                activeController = controller

                const chunkType = (chunk as { type?: string })?.type

                if (chunkType !== "text-delta" && chunkType !== "reasoning-delta") {
                    const isStreamTerminator =
                        chunkType === "finish" ||
                        chunkType === "error" ||
                        chunkType === "abort"
                    if (isStreamTerminator) {
                        fullFlush()
                    } else {
                        partialSafeFlush()
                    }
                    controller.enqueue(chunk)
                    return
                }

                const c = chunk as Record<string, unknown> & {
                    type: "text-delta" | "reasoning-delta"
                    id: string
                }
                const incomingText = c[textField]
                if (typeof incomingText !== "string") {
                    // Unexpected shape — pass through untouched rather than
                    // silently drop. Better to leak a badly-shaped chunk than
                    // to lose data.
                    controller.enqueue(chunk)
                    return
                }

                if (
                    buffer.length > 0 &&
                    (c.type !== bufferType || c.id !== bufferId)
                ) {
                    fullFlush()
                }

                bufferType = c.type
                bufferId = c.id
                buffer += incomingText
                const providerMetadataFromChunk = (c as { providerMetadata?: unknown }).providerMetadata
                if (providerMetadataFromChunk != null) {
                    providerMetadata = providerMetadataFromChunk
                }

                let match: string | null
                while ((match = detectPrimaryBoundary(buffer)) != null) {
                    controller.enqueue(buildEmission(match))
                    buffer = buffer.slice(match.length)
                    providerMetadata = undefined
                }

                if (buffer.length >= maxBufferedChars) {
                    fullFlush()
                    return
                }

                scheduleTimerFlush()
            },
            flush(controller) {
                activeController = controller
                fullFlush()
            },
        })
    }
}

/**
 * Factory for `streamText({ experimental_transform })` — operates on
 * TextStreamPart chunks with field `.text`.
 *
 * Still useful even though pipeYamlRender re-splits text-delta downstream:
 *   - reasoning-delta is NOT touched by pipeYamlRender, so coalescing here
 *     carries through to the UI.
 *   - If pipeYamlRender is disabled in some path, this layer alone is
 *     enough to render sentence-level text-delta output.
 */
export function createReadableTextTransform(
    options?: ReadableTextTransformOptions,
): StreamTextTransform<ToolSet> {
    const factory = createCoreCoalescer({ options, textField: "text" })
    return () => factory() as unknown as ReturnType<StreamTextTransform<ToolSet>>
}

/**
 * Factory for a plain `ReadableStream` transform that operates on
 * UIMessageChunk chunks with field `.delta`. Intended to be piped AFTER
 * `pipeYamlRender` to re-coalesce the per-character text-deltas it emits
 * back to sentence/word-level units for the client.
 */
export function createUITextCoalescer(
    options?: ReadableTextTransformOptions,
): () => TransformStream<unknown, unknown> {
    return createCoreCoalescer({ options, textField: "delta" })
}

/**
 * Convenience helper: pipe a UIMessageChunk ReadableStream through the
 * coalescer. Mirrors the shape of pipePlanCapture / pipeYamlRender so the
 * stream wiring reads naturally at the call site.
 */
export function pipeUITextCoalesce(
    stream: ReadableStream<unknown>,
    options?: ReadableTextTransformOptions,
): ReadableStream<unknown> {
    return stream.pipeThrough(createUITextCoalescer(options)())
}
