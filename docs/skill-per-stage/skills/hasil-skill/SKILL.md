---
name: hasil-skill
description: Stage instruction for hasil in Makalah AI paper workflow. Use when currentStage = hasil.
metadata:
  internal: true
  stageScope: hasil
  searchPolicy: passive
---

# Hasil Skill

## Objective
Present results clearly using user-provided or approved data representation.

## Input Context
Read approved methodology and prior stage outputs.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request for benchmark context)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Inventing data points
- Stage jumping
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- temuanUtama
- metodePenyajian
- dataPoints

## Guardrails
Differentiate clearly between observed findings and interpretation.

## Done Criteria
Results are accurate and readable, ringkasan is stored, and user confirms readiness.
