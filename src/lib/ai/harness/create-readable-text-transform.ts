/**
 * Readable text transform for visible compose streams.
 *
 * Iteration 4 — two-tier boundary policy addresses the Codex audit finding
 * that the iteration-3 helper still dropped partial tokens onto the UI at
 * tool-boundary time.
 *
 * Sits inside streamText's experimental_transform (at TextStreamPart level,
 * BEFORE toUIMessageStream). Buffers text-delta and reasoning-delta chunks,
 * releases them at a PRIMARY boundary (default: sentence), and at a
 * non-text chunk boundary only releases up to the last SAFE boundary
 * (default: word). The partial tail after the safe boundary is HELD across
 * the tool call and prepended to the next incoming text-delta so the user
 * never sees a mid-word fragment left frozen on screen while a tool runs.
 *
 * Release triggers:
 *   - Primary chunking match (sentence by default, also word/line/regex).
 *     This is the steady-state emission for prose.
 *   - Non-text chunk arrival → partial-safe flush (emit up to last word
 *     boundary; keep tail for merge with post-tool text).
 *   - maxBufferedDelayMs timeout → partial-safe flush (never breaks a word).
 *   - maxBufferedChars emergency → full flush (rare; used when a single
 *     word-run exceeds the hard cap, e.g. a very long URL).
 *   - id/type change → full flush (cannot merge residual across streams).
 *   - Stream end → full flush (no more data coming; emit whatever is left).
 */

import type { StreamTextTransform, ToolSet } from "ai"

/**
 * Primary chunking presets. `sentence` uses whitespace after punctuation (no
 * end-of-buffer match) so normal word-end periods don't false-trigger when
 * the word continues in the next delta (e.g. "Dr." followed by " Martin"
 * or a later delta that continues "artifact" → "artifacts").
 */
const CHUNKING_PRESETS = {
    word: /\S+\s/,
    line: /\n/,
    sentence: /[.!?]\s|\n/,
} satisfies Record<string, RegExp>

/**
 * Safe-boundary regex used for partial-flush at non-text / timer boundaries.
 * Always word-level regardless of the configured primary chunking so tool
 * boundaries and slow-model timeouts never split a word.
 */
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

/**
 * Defaults picked so prose flows in readable sentence-level releases while
 * tool boundaries fall on word boundaries. Tuned for chat compose streams
 * where a sentence typically takes 1-3 seconds to produce; that lag is the
 * price paid for avoiding mid-sentence freezes when a tool interrupts.
 */
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
        // Guard against zero-width match infinite loop.
        if (m.index === re.lastIndex) re.lastIndex += 1
    }
    return lastEnd
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

        /**
         * Emit ENTIRE buffer (including any partial trailing token).
         * Reserved for stream-end, id/type change, and maxBufferedChars
         * emergency — use cases where holding the tail is worse than
         * revealing it (we'd otherwise lose or orphan it).
         */
        const fullFlush = () => {
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

        /**
         * Emit only up to the last safe (word) boundary. KEEP the partial
         * trailing token in buffer so it can merge with the next text
         * delta. If buffer has no safe boundary yet, emit nothing and keep
         * holding — the user will never see a mid-word fragment from this
         * path.
         */
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
            activeController.enqueue({
                type: bufferType,
                id: bufferId,
                text: flushed,
                ...(providerMetadata != null ? { providerMetadata } : {}),
            })
            buffer = tail
            // Provider metadata belongs to the flushed prefix; the tail
            // starts fresh and will absorb any metadata on subsequent
            // deltas that continue this run.
            providerMetadata = undefined
            clearTimer()
        }

        const scheduleTimerFlush = () => {
            clearTimer()
            if (maxBufferedDelayMs > 0 && buffer.length > 0) {
                timer = setTimeoutFn(() => {
                    timer = null
                    // Timer always does a SAFE flush — never breaks a word.
                    // If no safe boundary exists, buffer keeps holding
                    // until the next delta arrives or stream ends.
                    partialSafeFlush()
                }, maxBufferedDelayMs)
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new TransformStream<any, any>({
            transform(chunk, controller) {
                activeController = controller as TransformStreamDefaultController<unknown>

                const chunkType = (chunk as { type?: string })?.type

                // Non-text / non-reasoning chunk handling:
                // - Stream-terminating chunks (finish, error, abort): no
                //   further text will ever arrive, so FULL-flush the
                //   buffer (including any tail) before forwarding. This
                //   keeps the final UI state ordered correctly with the
                //   terminator chunk as the LAST event.
                // - All other non-text chunks (tool-call, tool-result,
                //   start-step, finish-step, tool-input-*, source, file,
                //   etc.): PARTIAL-safe flush so completed words reach
                //   the UI, but the trailing token stays buffered and
                //   will merge with the next text-delta. This prevents
                //   mid-word freezes when the next chunk is a tool-call
                //   that may take seconds to resolve.
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

                const c = chunk as {
                    type: "text-delta" | "reasoning-delta"
                    id: string
                    text: string
                    providerMetadata?: unknown
                }

                // If incoming delta belongs to a different text run,
                // the residual cannot be safely merged (it was written
                // by the previous run). Full-flush the old buffer,
                // including any trailing token, before starting fresh.
                if (
                    buffer.length > 0 &&
                    (c.type !== bufferType || c.id !== bufferId)
                ) {
                    fullFlush()
                }

                bufferType = c.type
                bufferId = c.id
                buffer += c.text ?? ""
                if (c.providerMetadata != null) {
                    providerMetadata = c.providerMetadata
                }

                // Primary-boundary emission: release completed units
                // (sentences by default) as soon as they're available.
                let match: string | null
                while ((match = detectPrimaryBoundary(buffer)) != null) {
                    controller.enqueue({
                        type: bufferType,
                        id: bufferId,
                        text: match,
                        ...(providerMetadata != null ? { providerMetadata } : {}),
                    })
                    buffer = buffer.slice(match.length)
                    providerMetadata = undefined
                }

                // Emergency hard cap. Only fires when a single run of
                // non-whitespace text (URL, code token, minified JSON)
                // exceeds maxBufferedChars. Preferable to accept a
                // visible break over unbounded memory growth.
                if (buffer.length >= maxBufferedChars) {
                    fullFlush()
                    return
                }

                scheduleTimerFlush()
            },
            flush(controller) {
                activeController = controller as TransformStreamDefaultController<unknown>
                // End of stream — nothing more will arrive to merge the
                // residual with. Reveal whatever is still buffered.
                fullFlush()
            },
        })
    }
}
