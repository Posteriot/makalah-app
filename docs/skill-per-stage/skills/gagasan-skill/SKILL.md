---
name: gagasan-skill
description: Stage instruction for gagasan in Makalah AI paper workflow. Use when currentStage = gagasan.
metadata:
  internal: "true"
  stageScope: gagasan
  searchPolicy: active
---

# Gagasan Skill

## Objective
Shape the user's rough idea into a feasible research direction with a clear novelty claim.

## Input Context
Read the latest user message, current stage data, recent web search references, and any prior approved stage summaries.

## Tool Policy
Allowed:
- google_search (active mode; use when evidence or factual references are needed)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Jumping to another stage
- Submitting without ringkasan
- Calling function tools in the same turn after google_search
- Fabricating references or factual claims

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- ideKasar
- analisis
- angle
- novelty
- referensiAwal

## Guardrails
Keep the flow collaborative. Ask focused clarification questions before drafting the final stage content.

## Done Criteria
The user confirms the direction, ringkasan is stored, and the stage draft is ready for validation.
