# Json Renderer as Model Visual Language

## Core Paradigm: Json Renderer Is the Model's Visual Language

The json-renderer card is **not a separate system that interprets the model's prose**. It is a **native output modality** of the model — the same way the model can output text, call tools, or emit reasoning traces.

The model has two output channels:

1. **Text** — for analysis, context, reasoning, narration
2. **Visual card** — for any structured interaction that requires the user to make an explicit decision

The visual card is the model's way of saying "I need you to choose" — whether that is:
- **Recommendations** (model has a strong preference among options)
- **Neutral options** (all choices are equally valid, model presents without bias)
- **Confirmations** (proceed vs reconsider — binary decision points)
- **Prioritization requests** (future: rank items by importance)
- **Action selections** (future: choose what to do next from a set of actions)

In short: **any moment where clicking is faster, clearer, and less ambiguous than typing** is a valid use case for the visual card.

These two channels work together in the same response:
- Model writes context/analysis as prose (paragraphs 1-2)
- Model emits a structured choice block (replaces what would have been paragraphs 3-4 of option listings)
- Frontend renders prose + card as one coherent message
- User reads context, then clicks choice in card

The model **knows** the card will appear. It does not duplicate the choices in prose because it knows the card handles that.