/**
 * Stream transform that intercepts `<think>...</think>` tags from model
 * text-delta output and re-emits the content as `reasoning-delta` chunks.
 *
 * WHY: Gemini sometimes outputs reasoning as `<think>` tags in text instead
 * of using the native thinking API (reasoning-delta). When this happens the
 * raw thinking content renders in the chat window instead of the reasoning
 * loading bar. This transform catches that case.
 *
 * POSITION in pipeline: AFTER toUIMessageStream, BEFORE pipePlanCapture.
 * This ensures think-tagged content never reaches pipePlanCapture (which
 * would misparse plan YAML inside think blocks) or pipeYamlRender (which
 * would render yaml-spec fences inside think blocks as choice cards).
 *
 * The emitted reasoning-delta chunks flow through the rest of the pipeline
 * unchanged and are consumed by the writer loop's existing reasoning
 * accumulator (build-step-stream.ts line 746-757).
 *
 * Matching is strict and case-sensitive: only `<think>` and `</think>`
 * (no attributes, no uppercase, no spaces).
 */

const OPEN_TAG = "<think>"
const CLOSE_TAG = "</think>"

type State = "outside" | "inside"

export function pipeThinkTagStrip(
  input: ReadableStream<unknown>,
): ReadableStream<unknown> {
  let state: State = "outside"
  let currentTextId = ""
  // Buffer for partial tag matching (e.g. "<thi" at chunk boundary)
  let tagBuffer = ""
  // Counters for anomaly detection
  let totalTextChars = 0
  let thinkChars = 0
  // Unique ID per reasoning block (distinct from text block ID)
  let reasoningBlockCount = 0
  let activeReasoningId = ""

  function emitText(
    controller: ReadableStreamDefaultController,
    text: string,
  ) {
    if (text.length > 0) {
      controller.enqueue({ type: "text-delta", id: currentTextId, delta: text })
    }
  }

  function emitReasoning(
    controller: ReadableStreamDefaultController,
    text: string,
  ) {
    if (text.length > 0) {
      thinkChars += text.length
      controller.enqueue({ type: "reasoning-delta", id: activeReasoningId, delta: text })
    }
  }

  function flushTagBuffer(controller: ReadableStreamDefaultController) {
    if (tagBuffer.length > 0) {
      if (state === "outside") {
        emitText(controller, tagBuffer)
      } else {
        emitReasoning(controller, tagBuffer)
      }
      tagBuffer = ""
    }
  }

  function emitReasoningStart(controller: ReadableStreamDefaultController) {
    activeReasoningId = `think-${++reasoningBlockCount}`
    controller.enqueue({ type: "reasoning-start", id: activeReasoningId })
  }

  function emitReasoningEnd(controller: ReadableStreamDefaultController) {
    if (activeReasoningId) {
      controller.enqueue({ type: "reasoning-end", id: activeReasoningId })
      activeReasoningId = ""
    }
  }

  /**
   * Process text content through the state machine.
   * Handles tag detection, partial buffering, and state transitions.
   */
  function processText(
    controller: ReadableStreamDefaultController,
    text: string,
  ) {
    let pos = 0

    while (pos < text.length) {
      if (state === "outside") {
        // Look for <think> opening tag
        const openIdx = text.indexOf("<", pos)

        if (openIdx === -1) {
          // No < found — emit all remaining text
          emitText(controller, text.slice(pos))
          pos = text.length
          continue
        }

        // Emit text before the <
        if (openIdx > pos) {
          emitText(controller, text.slice(pos, openIdx))
        }

        // Check if we have enough chars to match <think>
        const remaining = text.slice(openIdx)

        if (remaining.length >= OPEN_TAG.length) {
          if (remaining.startsWith(OPEN_TAG)) {
            // Full <think> found — switch to inside
            state = "inside"
            emitReasoningStart(controller)
            pos = openIdx + OPEN_TAG.length
            continue
          } else {
            // Not <think> — emit the < as text and continue
            emitText(controller, "<")
            pos = openIdx + 1
            continue
          }
        } else {
          // Partial potential tag at end of chunk (e.g. "<thi")
          // Check if it could be the start of <think>
          if (OPEN_TAG.startsWith(remaining)) {
            tagBuffer = remaining
            pos = text.length
          } else {
            // Not a potential <think> start — emit as text
            emitText(controller, remaining)
            pos = text.length
          }
          continue
        }
      } else {
        // state === "inside" — look for </think> closing tag
        const closeIdx = text.indexOf("<", pos)

        if (closeIdx === -1) {
          // No < found — all content is reasoning
          emitReasoning(controller, text.slice(pos))
          pos = text.length
          continue
        }

        // Emit reasoning before the <
        if (closeIdx > pos) {
          emitReasoning(controller, text.slice(pos, closeIdx))
        }

        const remaining = text.slice(closeIdx)

        if (remaining.length >= CLOSE_TAG.length) {
          if (remaining.startsWith(CLOSE_TAG)) {
            // Full </think> found — switch to outside
            state = "outside"
            emitReasoningEnd(controller)
            pos = closeIdx + CLOSE_TAG.length
            continue
          } else {
            // Not </think> — emit < as reasoning and continue
            emitReasoning(controller, "<")
            pos = closeIdx + 1
            continue
          }
        } else {
          // Partial potential tag at end of chunk
          if (CLOSE_TAG.startsWith(remaining)) {
            tagBuffer = remaining
            pos = text.length
          } else {
            emitReasoning(controller, remaining)
            pos = text.length
          }
          continue
        }
      }
    }
  }

  /**
   * Resolve a partial tag buffer when new text arrives.
   * The buffer contains a prefix like "<thi" that might complete to
   * "<think>" or might be something else like "<things>".
   */
  function resolveTagBuffer(
    controller: ReadableStreamDefaultController,
    newText: string,
  ) {
    const combined = tagBuffer + newText
    tagBuffer = ""

    if (state === "outside") {
      // Was buffering potential <think>
      if (combined.length >= OPEN_TAG.length) {
        if (combined.startsWith(OPEN_TAG)) {
          // Confirmed <think> — switch state, process remainder
          state = "inside"
          emitReasoningStart(controller)
          processText(controller, combined.slice(OPEN_TAG.length))
        } else {
          // Not <think> — flush combined as text
          processText(controller, combined)
        }
      } else if (OPEN_TAG.startsWith(combined)) {
        // Still partial — keep buffering
        tagBuffer = combined
      } else {
        // Mismatch — flush as text
        processText(controller, combined)
      }
    } else {
      // Was buffering potential </think>
      if (combined.length >= CLOSE_TAG.length) {
        if (combined.startsWith(CLOSE_TAG)) {
          // Confirmed </think> — switch state, process remainder
          state = "outside"
          emitReasoningEnd(controller)
          processText(controller, combined.slice(CLOSE_TAG.length))
        } else {
          // Not </think> — flush combined as reasoning
          processText(controller, combined)
        }
      } else if (CLOSE_TAG.startsWith(combined)) {
        // Still partial — keep buffering
        tagBuffer = combined
      } else {
        // Mismatch — flush as reasoning
        processText(controller, combined)
      }
    }
  }

  return new ReadableStream({
    async start(controller) {
      const reader = input.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // Stream ended — flush any remaining state
            flushTagBuffer(controller)

            if (state === "inside") {
              emitReasoningEnd(controller)
              console.warn(
                `[THINK-STRIP] stream ended inside <think> block — ` +
                `flushed ${thinkChars} chars to reasoning`,
              )
            }

            // Anomaly detection
            if (
              totalTextChars > 0 &&
              thinkChars / totalTextChars > 0.9
            ) {
              console.warn(
                `[THINK-STRIP] anomaly: ${((thinkChars / totalTextChars) * 100).toFixed(0)}% ` +
                `of output was in <think> tags (${thinkChars}/${totalTextChars} chars)`,
              )
            }

            controller.close()
            break
          }

          const chunk = value as {
            type?: string
            id?: string
            delta?: string
          }

          // Track text block id
          if (chunk.type === "text-start" && chunk.id) {
            currentTextId = chunk.id
          }

          // Flush state before text-end (preserve protocol ordering)
          if (chunk.type === "text-end") {
            flushTagBuffer(controller)
            controller.enqueue(value)
            continue
          }

          // Only process text-delta chunks
          if (chunk.type !== "text-delta") {
            controller.enqueue(value)
            continue
          }

          const delta = chunk.delta
          if (typeof delta !== "string" || delta.length === 0) {
            controller.enqueue(value)
            continue
          }

          // Track id from incoming chunk
          if (chunk.id) {
            currentTextId = chunk.id
          }

          totalTextChars += delta.length

          // Process through state machine
          if (tagBuffer.length > 0) {
            resolveTagBuffer(controller, delta)
          } else {
            processText(controller, delta)
          }
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
