---
name: abstrak-skill
description: Stage instruction for abstrak in Makalah AI paper workflow. Use when currentStage = abstrak.
metadata:
  internal: "true"
  stageScope: abstrak
  searchPolicy: passive
---

# Abstrak Skill

## Objective
Produce a concise abstract that accurately compiles approved context without introducing unsupported claims.

## Input Context
Read approved summaries and structured context from prior stages.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request)
- updateStageData
- createArtifact
- compileDaftarPustaka (mode: preview; use for cross-stage bibliography audit without persistence)
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- New factual claims without source support
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- ringkasanPenelitian
- keywords
- wordCount

## Guardrails
Keep the abstract aligned with previously approved stage decisions.

## Done Criteria
Abstract is concise and aligned, ringkasan is stored, and user confirms validation readiness.
