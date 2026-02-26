---
name: outline-skill
description: Stage instruction for outline in Makalah AI paper workflow. Use when currentStage = outline.
metadata:
  internal: "true"
  stageScope: outline
  searchPolicy: passive
---

# Outline Skill

## Objective
Build a coherent paper structure with section hierarchy and realistic word budget, and establish a living checklist baseline for downstream stages.

## Input Context
Read approved outputs from earlier stages, especially gagasan and topik.
Prepare outline sections with stable IDs so checklist auto-check and minor-edit lifecycle can work consistently.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request)
- updateStageData
- createArtifact
- compileDaftarPustaka (mode: preview; use for cross-stage bibliography audit without persistence)
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Initiating web search without user request
- Stage jumping
- compileDaftarPustaka (mode: persist) outside daftar_pustaka stage
- Submission is forbidden when ringkasan is missing

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- sections
- totalWordCount
- completenessScore
- sections[].checkedAt
- sections[].checkedBy
- sections[].editHistory

## Guardrails
Ensure section ordering supports the 13-stage workflow, avoids structural duplication, and keeps IDs stable for living-checklist tracking.

## Done Criteria
Outline is complete, internally consistent, living-checklist fields are structurally ready, ringkasan is stored, and user confirms readiness.
