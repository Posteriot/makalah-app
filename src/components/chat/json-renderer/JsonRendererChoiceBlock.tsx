"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { JSONUIProvider, Renderer } from "@json-render/react"
import type { Spec } from "@json-render/core"
import {
  cloneSpecWithReadOnlyState,
  type JsonRendererChoiceRenderPayload,
} from "@/lib/json-render/choice-payload"
import { choiceRegistry } from "./registry"

interface JsonRendererChoiceBlockProps {
  payload: JsonRendererChoiceRenderPayload
  isSubmitted?: boolean
  onSubmit?: (params: {
    selectedOptionId: string
    customText?: string
  }) => void | Promise<void>
}

export function JsonRendererChoiceBlock({
  payload,
  isSubmitted = false,
  onSubmit,
}: JsonRendererChoiceBlockProps) {
  const [localSubmitted, setLocalSubmitted] = useState(false)

  // Track latest isSubmitted in a ref so the submit handler always
  // reads the freshest value, not a stale closure from a previous render.
  const isSubmittedRef = useRef(isSubmitted)
  isSubmittedRef.current = isSubmitted

  // Reset local latch when parent signals card is no longer submitted
  // (e.g., after cancel-choice reverts the decision). Without this,
  // localSubmitted stays true and blocks re-submission until remount.
  useEffect(() => {
    if (!isSubmitted && localSubmitted) {
      setLocalSubmitted(false)
      if (process.env.NODE_ENV !== "production") {
        console.info("[CHOICE-CARD] localSubmitted reset — card re-enabled for resubmission")
      }
    }
  }, [isSubmitted, localSubmitted])

  // Visual state: controls read-only rendering of the spec
  const visuallySubmitted = isSubmitted || localSubmitted

  const renderedSpec = useMemo(
    () =>
      visuallySubmitted
        ? cloneSpecWithReadOnlyState(payload.spec)
        : payload.spec,
    [visuallySubmitted, payload.spec]
  )

  const handlers = useMemo(
    () => ({
      submitChoice: async (params?: Record<string, unknown>) => {
        // Guard: use localSubmitted (component's own latch) as primary guard.
        // Also check isSubmittedRef for cross-mount double-submit protection,
        // but read from ref (not closure) to avoid stale prop after cancel.
        if (localSubmitted || isSubmittedRef.current || !onSubmit) {
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[CHOICE-CARD] submitChoice blocked isSubmittedRef=${isSubmittedRef.current} localSubmitted=${localSubmitted} hasOnSubmit=${!!onSubmit}`)
          }
          return
        }

        const selectedOptionId =
          typeof params?.selectedOptionId === "string"
            ? params.selectedOptionId.trim()
            : ""

        if (!selectedOptionId) return

        const customText =
          typeof params?.customText === "string" &&
          params.customText.trim().length > 0
            ? params.customText.trim()
            : undefined

        setLocalSubmitted(true)
        await onSubmit({ selectedOptionId, customText })
      },
    }),
    // localSubmitted is intentionally NOT in deps — the handler reads
    // it via the ref-like pattern (useState + check at call time).
    // onSubmit is the only real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onSubmit]
  )

  return (
    <JSONUIProvider
      registry={choiceRegistry.registry}
      initialState={payload.initialState}
      handlers={handlers}
    >
      <Renderer
        spec={renderedSpec as unknown as Spec}
        registry={choiceRegistry.registry}
      />
    </JSONUIProvider>
  )
}
