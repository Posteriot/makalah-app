---
name: lampiran-skill
description: Stage instruction for lampiran in Makalah AI paper workflow. Use when currentStage = lampiran.
metadata:
  internal: "true"
  stageScope: lampiran
  searchPolicy: passive
---

# Lampiran Skill

## Objective
Prepare appendix materials that support the paper without bloating main sections.

## Input Context
Read approved outputs and identify supplementary materials required by the user.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Unnecessary appendix inflation
- Stage jumping
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- items
- tidakAdaLampiran
- alasanTidakAda

## Guardrails
Appendix entries must map to actual needs of the paper.

## Done Criteria
Appendix plan is complete (or justified as empty), ringkasan is stored, and user confirms readiness.
