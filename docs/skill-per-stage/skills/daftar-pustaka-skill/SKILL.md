---
name: daftar-pustaka-skill
description: Stage instruction for daftar_pustaka in Makalah AI paper workflow. Use when currentStage = daftar_pustaka.
metadata:
  internal: true
  stageScope: daftar_pustaka
  searchPolicy: passive
---

# Daftar Pustaka Skill

## Objective
Compile a clean and complete reference list from approved citations and verified sources.

## Input Context
Read references used in prior stages and source metadata from stageData.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Placeholder bibliography entries
- Stage jumping
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- entries
- totalCount
- incompleteCount
- duplicatesMerged

## Guardrails
Use consistent citation formatting and avoid duplicates.

## Done Criteria
Bibliography is complete and normalized, ringkasan is stored, and user confirms readiness.
