import yaml from "js-yaml"
import {
  PLAN_DATA_PART_TYPE,
  PLAN_FENCE_OPEN,
  planSpecSchema,
  type PlanDataPart,
} from "./plan-spec"

/**
 * Stream transformer that detects plan-spec content in text-delta chunks.
 *
 * Two detection modes:
 * 1. FENCED: ```plan-spec ... ``` — primary mode
 * 2. UNFENCED (state machine): detects "stage: <word>" at line boundary,
 *    buffers until plan pattern ends, then parses. Safety net when model
 *    doesn't use code fences.
 *
 * Both modes: parse YAML, validate with Zod, strip from visible text,
 * emit PLAN_DATA_PART_TYPE part. Malformed content is logged and skipped.
 */

type CaptureState = "normal" | "fenced" | "unfenced"

// Lines that are valid inside an unfenced plan YAML block
const UNFENCED_PLAN_LINE = /^\s*(-\s*label:|status:|stage:|summary:|tasks:|\s*$)/

export function pipePlanCapture(
  input: ReadableStream<unknown>
): ReadableStream<unknown> {
  let buffer = ""
  let state: CaptureState = "normal"
  let captureContent = ""
  // Text before the unfenced plan start that hasn't been flushed yet
  let prePlanText = ""
  // Track the current text block id from upstream text-start chunks.
  // AI SDK v6 requires every text-delta to carry the id of its parent
  // text block — omitting it causes AI_TypeValidationError on the client.
  let currentTextId = ""

  function tryParsePlan(content: string, source: "fenced" | "unfenced"): PlanDataPart | null {
    try {
      // Fix common indentation issue: "status:" not indented under list item
      const fixedContent = content.replace(
        /^(\s*-\s*label:\s*.+)\n\s*status:/gm,
        "$1\n    status:"
      )
      const parsed = yaml.load(fixedContent.trim())
      const result = planSpecSchema.safeParse(parsed)
      if (result.success) {
        console.info(
          `[PLAN-CAPTURE] parsed (${source}) stage=${result.data.stage} tasks=${result.data.tasks.length}`
        )
        return {
          type: PLAN_DATA_PART_TYPE,
          data: { spec: result.data },
        }
      } else {
        console.warn(
          `[PLAN-CAPTURE] validation failed (${source}):`,
          result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
        )
      }
    } catch (e) {
      console.warn(`[PLAN-CAPTURE] YAML parse error (${source}):`, e)
    }
    return null
  }

  function emitText(controller: ReadableStreamDefaultController, text: string) {
    if (text.length > 0) {
      controller.enqueue({ type: "text-delta", id: currentTextId, delta: text })
    }
  }

  /**
   * Process buffer in "normal" state. Handles both fence detection
   * and unfenced plan start detection via state machine.
   */
  function processNormal(controller: ReadableStreamDefaultController) {
    while (buffer.length > 0 && state === "normal") {
      // Check for fenced plan-spec
      const fenceIdx = buffer.indexOf(PLAN_FENCE_OPEN)
      if (fenceIdx !== -1) {
        // Emit text before fence
        emitText(controller, buffer.slice(0, fenceIdx))
        buffer = buffer.slice(fenceIdx + PLAN_FENCE_OPEN.length)
        if (buffer.startsWith("\n")) buffer = buffer.slice(1)
        state = "fenced"
        captureContent = ""
        return
      }

      // Check for unfenced plan start: "stage: <word>" at line boundary
      // Look for \nstage: or buffer starting with stage:
      const unfencedPatterns = ["\nstage: ", "\n stage: "]
      let unfencedIdx = -1
      let unfencedLen = 0

      if (buffer.startsWith("stage: ")) {
        unfencedIdx = 0
        unfencedLen = 0 // no prefix to skip
      } else {
        for (const pattern of unfencedPatterns) {
          const idx = buffer.indexOf(pattern)
          if (idx !== -1 && (unfencedIdx === -1 || idx < unfencedIdx)) {
            unfencedIdx = idx
            unfencedLen = 1 // skip the \n
          }
        }
      }

      if (unfencedIdx !== -1) {
        // Found potential unfenced plan start
        prePlanText = buffer.slice(0, unfencedIdx)
        buffer = buffer.slice(unfencedIdx + unfencedLen)
        state = "unfenced"
        captureContent = ""
        return
      }

      // No plan detected — flush safe portion
      // Keep enough buffer for both fence marker and "stage: " detection
      const keepLength = Math.max(PLAN_FENCE_OPEN.length, "\nstage: ".length)
      const safeLength = Math.max(0, buffer.length - keepLength)
      if (safeLength > 0) {
        emitText(controller, buffer.slice(0, safeLength))
        buffer = buffer.slice(safeLength)
      }
      break
    }
  }

  /**
   * Process buffer in "fenced" state — accumulate until closing fence.
   *
   * Close fence = \n``` followed by optional whitespace then newline or
   * end-of-buffer. Must NOT match \n```yaml-spec or \n```plan-spec
   * (those are opening fences of other blocks).
   */
  function processFenced(controller: ReadableStreamDefaultController) {
    // Match \n``` with optional trailing whitespace, then newline or end.
    // Does NOT match \n```yaml-spec (letter after backticks = opening fence).
    const closeFenceRe = /\n```[ \t]*(?:\n|$)/
    const match = closeFenceRe.exec(buffer)

    if (!match) {
      // Fence not closed — accumulate.
      // Keep trailing \n in buffer so close-fence detection works
      // when backticks arrive in the next chunk.
      if (buffer.endsWith("\n")) {
        captureContent += buffer.slice(0, -1)
        buffer = "\n"
      } else {
        captureContent += buffer
        buffer = ""
      }
      return
    }

    // Fence closed
    captureContent += buffer.slice(0, match.index)
    buffer = buffer.slice(match.index + match[0].length)
    state = "normal"

    const part = tryParsePlan(captureContent, "fenced")
    if (part) controller.enqueue(part)
    captureContent = ""
  }

  /**
   * Process buffer in "unfenced" state — accumulate lines that match
   * plan YAML structure, stop when a non-matching line is found.
   */
  function processUnfenced(controller: ReadableStreamDefaultController) {
    // Accumulate complete lines from buffer
    while (true) {
      const newlineIdx = buffer.indexOf("\n")
      if (newlineIdx === -1) {
        // No complete line yet — wait for more data
        // But check if we have enough accumulated to determine we're done
        // (e.g., buffer starts with non-plan content)
        if (buffer.length > 0 && captureContent.length > 50) {
          // Check if current partial line looks like plan content
          const partialTrimmed = buffer.trimStart()
          if (
            partialTrimmed.length > 10 &&
            !UNFENCED_PLAN_LINE.test(partialTrimmed) &&
            !partialTrimmed.startsWith("-") &&
            !partialTrimmed.startsWith("label:") &&
            !partialTrimmed.startsWith("status:")
          ) {
            // Current partial line is NOT plan content — finalize
            return finalizeUnfenced(controller)
          }
        }
        break
      }

      const line = buffer.slice(0, newlineIdx)
      const remaining = buffer.slice(newlineIdx + 1)

      // Check if this line belongs to the plan
      if (captureContent.length === 0) {
        // First line must be "stage: <word>"
        if (/^stage:\s*\w+/.test(line.trim())) {
          captureContent += line + "\n"
          buffer = remaining
          continue
        } else {
          // Not a plan — abort, flush prePlanText + line
          state = "normal"
          emitText(controller, prePlanText + line + "\n")
          prePlanText = ""
          buffer = remaining
          return
        }
      }

      // Subsequent lines
      if (UNFENCED_PLAN_LINE.test(line) || /^\s*-\s/.test(line)) {
        captureContent += line + "\n"
        buffer = remaining
        continue
      }

      // Non-matching line — plan is complete
      buffer = line + "\n" + remaining
      return finalizeUnfenced(controller)
    }
  }

  function finalizeUnfenced(controller: ReadableStreamDefaultController) {
    state = "normal"
    const part = tryParsePlan(captureContent, "unfenced")
    if (part) {
      // Plan parsed successfully — strip it, only emit prePlanText
      emitText(controller, prePlanText)
      controller.enqueue(part)
    } else {
      // Parse failed — flush everything (plan text was not actually a plan)
      emitText(controller, prePlanText + captureContent)
    }
    prePlanText = ""
    captureContent = ""
  }

  return new ReadableStream({
    async start(controller) {
      const reader = input.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // Flush remaining
            if (state === "fenced") {
              const fullContent = captureContent + buffer
              const part = tryParsePlan(fullContent, "fenced")
              if (part) {
                controller.enqueue(part)
              } else {
                // Parse failed — emit raw content as text (no fence markers prepended).
                // Downstream pipeYamlRender may still find yaml-spec blocks in it.
                emitText(controller, fullContent)
              }
              buffer = ""
              captureContent = ""
              console.warn(`[PLAN-CAPTURE] stream ended in fenced state — ${part ? "parsed" : "re-emitted as text"} (${fullContent.length} chars)`)
            }
            if (state === "unfenced" && captureContent.length > 0) {
              finalizeUnfenced(controller)
            }
            if (state === "normal" && buffer.length > 0) {
              emitText(controller, buffer)
              buffer = ""
            }
            controller.close()
            break
          }

          const chunk = value as { type?: string; id?: string; textDelta?: string; delta?: string }

          // Track text block id from upstream text-start events
          if (chunk.type === "text-start" && chunk.id) {
            currentTextId = chunk.id
          }

          // Flush buffered text BEFORE forwarding text-end so text-delta
          // chunks never arrive after their block has closed (protocol violation)
          if (chunk.type === "text-end") {
            if (state === "unfenced" && captureContent.length > 0) {
              finalizeUnfenced(controller)
            }
            if (state === "normal" && buffer.length > 0) {
              emitText(controller, buffer)
              buffer = ""
            }
            controller.enqueue(value)
            continue
          }

          if (chunk.type !== "text-delta") {
            controller.enqueue(value)
            continue
          }

          const textContent = chunk.id ? (chunk.delta ?? chunk.textDelta) : (chunk.textDelta ?? chunk.delta)
          if (typeof textContent !== "string") {
            controller.enqueue(value)
            continue
          }

          buffer += textContent

          // Process based on current state
          if (state === "normal") processNormal(controller)
          if (state === "fenced") processFenced(controller)
          if (state === "unfenced") processUnfenced(controller)
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
