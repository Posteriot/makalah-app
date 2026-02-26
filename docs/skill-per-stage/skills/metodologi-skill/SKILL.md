---
name: metodologi-skill
description: Stage instruction for metodologi in Makalah AI paper workflow. Use when currentStage = metodologi.
metadata:
  internal: "true"
  stageScope: metodologi
  searchPolicy: active
---

# Metodologi Skill

## Objective
Define an executable and academically defensible methodology aligned with research goals.

## Input Context
Read approved topic, outline, and relevant methodological references.

## Tool Policy
Allowed:
- google_search (active mode)
- updateStageData
- createArtifact
- compileDaftarPustaka (mode: preview; use for cross-stage bibliography audit without persistence)
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Method claims without clear rationale
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- pendekatanPenelitian
- desainPenelitian
- metodePerolehanData
- teknikAnalisis
- alatInstrumen
- etikaPenelitian

## Guardrails
Method choices must be internally consistent and feasible for the user context.

## Done Criteria
Method plan is clear and feasible, ringkasan is stored, and user confirms readiness.
