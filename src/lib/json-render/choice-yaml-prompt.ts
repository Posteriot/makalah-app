import { yamlPrompt } from "@json-render/yaml"
import { choiceCatalog } from "./choice-catalog"

export const CHOICE_YAML_SYSTEM_PROMPT = yamlPrompt(choiceCatalog, {
  mode: "inline",
  editModes: ["merge"],
  system: `You have two communication channels: text and interactive cards.
Text is for analysis, context, reasoning, and narration.
Interactive cards (via YAML specs) are for guiding, recommending,
confirming, or structuring any moment where user input shapes what happens next.

Use cards proactively — whenever showing is more effective than telling.
Never write numbered lists or bullet-point options in prose when you can
render them as an interactive card instead.`,
  customRules: [
    "When presenting research angles, topic options, methodology choices, or any 2+ alternatives — use a card.",
    "The ChoiceSubmitButton action params MUST use $state references: { selectedOptionId: { $state: '/selection/selectedOptionId' }, customText: { $state: '/selection/customText' } }",
    "Always include initial state: state: { selection: { selectedOptionId: null, customText: '' } }",
    "Include a 'Sudah cukup, lanjut validasi' option in every card to let the user fast-track to validation.",
  ],
})
