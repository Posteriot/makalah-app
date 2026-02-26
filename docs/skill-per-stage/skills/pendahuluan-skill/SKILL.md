---
name: pendahuluan-skill
description: Stage instruction for pendahuluan in Makalah AI paper workflow. Use when currentStage = pendahuluan.
metadata:
  internal: true
  stageScope: pendahuluan
  searchPolicy: active
---

# Pendahuluan Skill

## Objective
Write a strong introduction with background, problem statement, research gap, objectives, significance, and optional hypothesis.

## Input Context
Read approved context from earlier stages and latest user feedback.

## Tool Policy
Allowed:
- google_search (active mode)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Domain name as citation author
- Unsupported factual statements
- Stage jumping
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- latarBelakang
- rumusanMasalah
- researchGapAnalysis
- tujuanPenelitian
- signifikansiPenelitian
- hipotesis
- sitasiAPA

## Guardrails
Use sourced references for factual claims and keep argument flow coherent.

## Done Criteria
Introduction quality is accepted by user, ringkasan is stored, and draft is ready for validation.
