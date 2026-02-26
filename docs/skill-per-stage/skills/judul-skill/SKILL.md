---
name: judul-skill
description: Stage instruction for judul in Makalah AI paper workflow. Use when currentStage = judul.
metadata:
  internal: "true"
  stageScope: judul
  searchPolicy: passive
---

# Judul Skill

## Objective
Finalize title options and choose the strongest final title aligned with approved content.

## Input Context
Read approved summaries from all prior stages and final user positioning.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request)
- updateStageData
- createArtifact
- compileDaftarPustaka (mode: preview; use for cross-stage bibliography audit without persistence)
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Titles not grounded in approved content
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- opsiJudul
- judulTerpilih
- alasanPemilihan

## Guardrails
Title selection must reflect scope, contribution, and evidence from previous stages.

## Done Criteria
Final title decision is approved, ringkasan is stored, and stage is ready for completion.
