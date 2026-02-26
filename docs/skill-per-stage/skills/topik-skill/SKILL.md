---
name: topik-skill
description: Stage instruction for topik in Makalah AI paper workflow. Use when currentStage = topik.
metadata:
  internal: "true"
  stageScope: topik
  searchPolicy: active
---

# Topik Skill

## Objective
Convert the agreed idea into a definitive, defensible research topic with explicit research gap.

## Input Context
Read approved output from gagasan, latest user feedback, and current stage references.

## Tool Policy
Allowed:
- google_search (active mode)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Stage jumping
- Submit without ringkasan
- Function-tool calls in the same turn after google_search
- Unsupported topic claims without evidence

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- definitif
- angleSpesifik
- argumentasiKebaruan
- researchGap
- referensiPendukung

## Guardrails
Prefer specific and measurable topic framing over broad, generic phrasing.

## Done Criteria
The user approves the definitive topic, ringkasan is stored, and draft is ready for validation.
