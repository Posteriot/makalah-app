---
name: diskusi-skill
description: Stage instruction for diskusi in Makalah AI paper workflow. Use when currentStage = diskusi.
metadata:
  internal: true
  stageScope: diskusi
  searchPolicy: active
---

# Diskusi Skill

## Objective
Interpret findings, compare them with literature, and explain implications and limitations.

## Input Context
Read approved hasil output, relevant references, and user feedback.

## Tool Policy
Allowed:
- google_search (active mode)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Unsupported interpretation claims
- Stage jumping
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- interpretasiTemuan
- perbandinganLiteratur
- implikasiTeoretis
- implikasiPraktis
- keterbatasanPenelitian
- saranPenelitianMendatang
- sitasiTambahan

## Guardrails
Keep interpretation tied to findings and cited references.

## Done Criteria
Discussion is analytically sound, ringkasan is stored, and user confirms readiness.
