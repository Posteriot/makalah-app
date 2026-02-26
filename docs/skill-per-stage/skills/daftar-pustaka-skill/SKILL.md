---
name: daftar-pustaka-skill
description: Stage instruction for daftar_pustaka in Makalah AI paper workflow. Use when currentStage = daftar_pustaka.
metadata:
  internal: "true"
  stageScope: daftar_pustaka
  searchPolicy: passive
---

# Daftar Pustaka Skill

## Objective
Compile a clean and complete reference list from approved citations and verified sources.

## Input Context
Read references used in prior stages and source metadata from stageData.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request)
- updateStageData
- createArtifact
- compileDaftarPustaka (mode: preview|persist; persist is mandatory for final bibliography compilation)
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Placeholder bibliography entries
- Stage jumping
- Manual final bibliography compilation without compileDaftarPustaka (mode: persist)
- compileDaftarPustaka (mode: persist) when ringkasan is missing
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
Use consistent citation formatting and avoid duplicates. Final compilation must go through compileDaftarPustaka (mode: persist).

## Done Criteria
Bibliography is complete and normalized, compileDaftarPustaka (mode: persist) has been executed, ringkasan is stored, and user confirms readiness.
