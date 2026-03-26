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
    submitChoice: async () => {
      // Actual handler injected by JSONUIProvider in JsonRendererChoiceBlock
    },
  },
})
