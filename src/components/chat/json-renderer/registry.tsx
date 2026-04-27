"use client"

import { defineRegistry } from "@json-render/react"
import { choiceCatalog } from "@/lib/json-render/choice-catalog"
import { ChoiceCardShell } from "./components/ChoiceCardShell"
import { ChoiceOptionButton } from "./components/ChoiceOptionButton"
import { ChoiceTextarea } from "./components/ChoiceTextarea"
import { ChoiceSubmitButton } from "./components/ChoiceSubmitButton"

export const choiceRegistry = defineRegistry(choiceCatalog, {
  components: {
    ChoiceCardShell,
    ChoiceOptionButton,
    ChoiceTextarea,
    ChoiceSubmitButton,
  },
  actions: {
    toggleOption: async (params, setState) => {
      // setState is actually set(path, value) from the framework's state context.
      // Read current selection via the useStateValue hook in the component —
      // the action receives params.optionId and params.currentSelectedId
      // (resolved from $state at call time by the framework).
      const clickedId = params?.optionId as string | undefined
      const currentId = params?.currentSelectedId as string | null | undefined
      const setStateFn = setState as unknown as (path: string, value: unknown) => void
      setStateFn("/selection/selectedOptionId", currentId === clickedId ? null : clickedId ?? null)
    },
    submitChoice: async () => {
      // Actual handler injected by JSONUIProvider in JsonRendererChoiceBlock
    },
  },
})
