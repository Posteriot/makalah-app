---
name: tinjauan-literatur-skill
description: Stage instruction for tinjauan_literatur in Makalah AI paper workflow. Use when currentStage = tinjauan_literatur.
metadata:
  internal: true
  stageScope: tinjauan_literatur
  searchPolicy: active
---

# Tinjauan Literatur Skill

## Objective
Build a literature review that establishes theoretical framing, gap analysis, and research justification.

## Input Context
Read stage summaries, existing references, and user constraints.

## Tool Policy
Allowed:
- google_search (active mode)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Fabricated literature entries
- Stage jumping
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
