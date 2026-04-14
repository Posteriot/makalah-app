import yaml from "js-yaml"
import {
  PLAN_DATA_PART_TYPE,
  PLAN_FENCE_OPEN,
  planSpecSchema,
  type PlanDataPart,
} from "./plan-spec"

/**
 * Stream transformer that detects ```plan-spec fences in text-delta chunks,
 * parses YAML, validates, strips fence from visible text, and emits
 * PLAN_DATA_PART_TYPE parts.
 *
 * Non-plan chunks pass through unchanged.
 * Malformed YAML is logged and skipped — never breaks the stream.
 */
export function pipePlanCapture(
  input: ReadableStream<unknown>
): ReadableStream<unknown> {
  let buffer = ""
  let insideFence = false
  let fenceContent = ""

  return new ReadableStream({
    async start(controller) {
      const reader = input.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (buffer.length > 0 && !insideFence) {
              controller.enqueue({
                type: "text-delta",
                textDelta: buffer,
              })
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
                const safeLength = Math.max(
                  0,
                  buffer.length - PLAN_FENCE_OPEN.length
                )
                if (safeLength > 0) {
                  controller.enqueue({
                    type: "text-delta",
                    textDelta: buffer.slice(0, safeLength),
                  })
                  buffer = buffer.slice(safeLength)
                }
                break
              }

              if (fenceStart > 0) {
                controller.enqueue({
                  type: "text-delta",
                  textDelta: buffer.slice(0, fenceStart),
                })
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

              try {
                const parsed = yaml.load(fenceContent.trim())
                const result = planSpecSchema.safeParse(parsed)
                if (result.success) {
                  const part: PlanDataPart = {
                    type: PLAN_DATA_PART_TYPE,
                    data: { spec: result.data },
                  }
                  controller.enqueue(part)
                  console.info(
                    `[PLAN-CAPTURE] parsed stage=${result.data.stage} tasks=${result.data.tasks.length}`
                  )
                } else {
                  console.warn(
                    `[PLAN-CAPTURE] validation failed:`,
                    result.error.issues.map(
                      (i) => `${i.path.join(".")}: ${i.message}`
                    )
                  )
                }
              } catch (e) {
                console.warn(`[PLAN-CAPTURE] YAML parse error:`, e)
              }

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
