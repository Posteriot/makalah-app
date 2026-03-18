"use client"

import { useMemo } from "react"
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
  const renderedSpec = useMemo(
    () =>
      isSubmitted
        ? cloneSpecWithReadOnlyState(payload.spec)
        : payload.spec,
    [isSubmitted, payload.spec]
  )

  const handlers = useMemo(
    () => ({
      submitChoice: async (params?: Record<string, unknown>) => {
        if (isSubmitted || !onSubmit) return

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

        await onSubmit({ selectedOptionId, customText })
      },
    }),
    [isSubmitted, onSubmit]
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
