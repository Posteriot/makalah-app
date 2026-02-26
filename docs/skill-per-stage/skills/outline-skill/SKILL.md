---
name: outline-skill
description: Stage instruction for outline in Makalah AI paper workflow. Use when currentStage = outline.
metadata:
  internal: true
  stageScope: outline
  searchPolicy: passive
---

# Outline Skill

## Objective
Build a coherent paper structure with section hierarchy and realistic word budget.

## Input Context
Read approved outputs from earlier stages, especially gagasan and topik.

## Tool Policy
Allowed:
- google_search (passive mode; only on explicit user request)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Initiating web search without user request
- Stage jumping
- Submit without ringkasan

## Output Contract
Required:
- ringkasan (max 280)
Recommended:
- ringkasanDetail
- sections
- totalWordCount
- completenessScore

## Guardrails
Ensure section ordering supports the 13-stage workflow and avoids structural duplication.

## Done Criteria
Outline is complete, internally consistent, ringkasan is stored, and user confirms readiness.
