import yaml from "js-yaml"
import {
  PLAN_DATA_PART_TYPE,
  PLAN_FENCE_OPEN,
  UNFENCED_PLAN_REGEX,
  planSpecSchema,
  type PlanDataPart,
} from "./plan-spec"

/**
 * Stream transformer that detects plan-spec content in text-delta chunks.
 *
 * Two detection modes:
 * 1. FENCED: ```plan-spec ... ``` — primary, parse YAML inside fence
 * 2. UNFENCED: raw "stage: X\nsummary: ...\ntasks:\n..." — safety net
 *    when model doesn't comply with fence instruction
 *
 * Both modes: parse YAML, validate with Zod, strip from visible text,
 * emit PLAN_DATA_PART_TYPE part. Malformed content is logged and skipped.
 */
export function pipePlanCapture(
  input: ReadableStream<unknown>
): ReadableStream<unknown> {
  let buffer = ""
  let insideFence = false
  let fenceContent = ""

  /**
   * Try to parse a plan-spec string (YAML or unfenced format).
   * Returns PlanDataPart if valid, null otherwise.
   */
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

  /**
   * Check buffer for unfenced plan-spec pattern. If found, strip it
   * from the text and emit PlanDataPart.
   * Returns { cleanText, part } or null if no match.
   */
  function detectUnfenced(text: string): { cleanText: string; part: PlanDataPart } | null {
    // Reset regex state (global flag)
    UNFENCED_PLAN_REGEX.lastIndex = 0
    const match = UNFENCED_PLAN_REGEX.exec(text)
    if (!match) return null

    const planYaml = match[1]
    const part = tryParsePlan(planYaml, "unfenced")
    if (!part) return null

    // Strip the matched plan from text
    const cleanText = text.slice(0, match.index) + text.slice(match.index + match[0].length)
    return { cleanText: cleanText.replace(/\n{3,}/g, "\n\n"), part }
  }

  return new ReadableStream({
    async start(controller) {
      const reader = input.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // Flush remaining buffer — check for unfenced before flushing
            if (buffer.length > 0 && !insideFence) {
              const unfenced = detectUnfenced(buffer)
              if (unfenced) {
                controller.enqueue(unfenced.part)
                if (unfenced.cleanText.length > 0) {
                  controller.enqueue({
                    type: "text-delta",
                    textDelta: unfenced.cleanText,
                  })
                }
              } else {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: buffer,
                })
              }
              buffer = ""
            }
            controller.close()
            break
          }

          const chunk = value as { type?: string; textDelta?: string }

          if (
            chunk.type !== "text-delta" ||
            typeof chunk.textDelta !== "string"
          ) {
            controller.enqueue(value)
            continue
          }

          buffer += chunk.textDelta

          while (buffer.length > 0) {
            if (!insideFence) {
              const fenceStart = buffer.indexOf(PLAN_FENCE_OPEN)

              if (fenceStart === -1) {
                // No fence found — check for unfenced pattern in safe portion
                const safeLength = Math.max(
                  0,
                  buffer.length - PLAN_FENCE_OPEN.length
                )
                if (safeLength > 0) {
                  const safeText = buffer.slice(0, safeLength)

                  // Check for unfenced plan-spec in safe text
                  const unfenced = detectUnfenced(safeText)
                  if (unfenced) {
                    controller.enqueue(unfenced.part)
                    if (unfenced.cleanText.length > 0) {
                      controller.enqueue({
                        type: "text-delta",
                        textDelta: unfenced.cleanText,
                      })
                    }
                  } else {
                    controller.enqueue({
                      type: "text-delta",
                      textDelta: safeText,
                    })
                  }
                  buffer = buffer.slice(safeLength)
                }
                break
              }

              if (fenceStart > 0) {
                // Check pre-fence text for unfenced pattern
                const preFence = buffer.slice(0, fenceStart)
                const unfenced = detectUnfenced(preFence)
                if (unfenced) {
                  controller.enqueue(unfenced.part)
                  if (unfenced.cleanText.length > 0) {
                    controller.enqueue({
                      type: "text-delta",
                      textDelta: unfenced.cleanText,
                    })
                  }
                } else {
                  controller.enqueue({
                    type: "text-delta",
                    textDelta: preFence,
                  })
                }
              }

              insideFence = true
              fenceContent = ""
              buffer = buffer.slice(fenceStart + PLAN_FENCE_OPEN.length)
              if (buffer.startsWith("\n")) {
                buffer = buffer.slice(1)
              }
            }

            if (insideFence) {
              const closePatterns = ["\n```\n", "\n```"]
              let closeIdx = -1
              let closeLen = 0

              for (const pattern of closePatterns) {
                const idx = buffer.indexOf(pattern)
                if (idx !== -1 && (closeIdx === -1 || idx < closeIdx)) {
                  closeIdx = idx
                  closeLen = pattern.length
                }
              }

              if (closeIdx === -1) {
                fenceContent += buffer
                buffer = ""
                break
              }

              fenceContent += buffer.slice(0, closeIdx)
              buffer = buffer.slice(closeIdx + closeLen)
              insideFence = false

              const part = tryParsePlan(fenceContent, "fenced")
              if (part) controller.enqueue(part)

              fenceContent = ""
            }
          }
        }
      } catch (err) {
        controller.error(err)
      }
    },
  })
}
