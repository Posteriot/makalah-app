"use client"

import { useMemo, useState } from "react"
import { JSONUIProvider, Renderer } from "@json-render/react"
import type { Spec } from "@json-render/core"
import {
  cloneSpecWithReadOnlyState,
  type JsonRendererChoicePayload,
} from "@/lib/json-render/choice-payload"
import { choiceRegistry } from "./registry"

interface JsonRendererChoiceBlockProps {
  payload: JsonRendererChoicePayload
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
  const submitted = isSubmitted || localSubmitted

  const renderedSpec = useMemo(
    () =>
      submitted
        ? cloneSpecWithReadOnlyState(payload.spec)
        : payload.spec,
    [submitted, payload.spec]
  )

  const handlers = useMemo(
    () => ({
      submitChoice: async (params?: Record<string, unknown>) => {
        if (submitted || !onSubmit) return

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
    [submitted, onSubmit]
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
