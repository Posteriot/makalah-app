---
name: tinjauan-literatur-skill
description: Stage instruction for tinjauan_literatur in Makalah AI paper workflow. Use when currentStage = tinjauan_literatur.
metadata:
  internal: "true"
  stageScope: tinjauan_literatur
  searchPolicy: active
---

# Tinjauan Literatur Skill

## Objective
Build a literature review that establishes theoretical framing, gap analysis, and research justification.

## Input Context
Read stage summaries, existing references, and user constraints.
Read living outline checklist status when available (checkedAt/checkedBy/editHistory) to keep stage output aligned with approved outline progress.

## Tool Policy
Allowed:
- google_search (active mode)
- updateStageData
- createArtifact
- compileDaftarPustaka (mode: preview; use for cross-stage bibliography audit without persistence)
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Fabricated literature entries
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- kerangkaTeoretis
- reviewLiteratur
- gapAnalysis
- justifikasiPenelitian
- referensi

## Guardrails
Prioritize high-quality references and keep claims traceable to sources.

## Done Criteria
Review is coherent and evidence-backed, ringkasan is stored, and user confirms readiness.
