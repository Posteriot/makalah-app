---
name: kesimpulan-skill
description: Stage instruction for kesimpulan in Makalah AI paper workflow. Use when currentStage = kesimpulan.
metadata:
  internal: "true"
  stageScope: kesimpulan
  searchPolicy: passive
---

# Kesimpulan Skill

## Objective
Deliver a conclusion that answers the research problem and provides practical follow-up recommendations.

## Input Context
Read approved hasil and diskusi outputs.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Introducing unrelated new findings
- Stage jumping
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- ringkasanHasil
- jawabanRumusanMasalah
- implikasiPraktis
- saranPraktisi
- saranPeneliti
- saranKebijakan

## Guardrails
Keep the conclusion as synthesis, not as a new analysis section.

## Done Criteria
Conclusion is complete and actionable, ringkasan is stored, and user confirms readiness.
