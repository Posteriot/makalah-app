# Full Chat System Architecture Review Output Template

Dokumen ini adalah template hasil audit untuk sesi review arsitektur chat system / halaman chat system. Template ini dipakai sebagai kerangka dokumen output yang harus diisi agent setelah menjalankan prompt audit utama.

## Document Metadata

- Review title:
- Review date:
- Reviewer / agent:
- Source prompt document:
- Scope version:
- Reference prompt/skills folder: `.references/system-prompt-skills-active/updated-2`

## Executive Summary

### Ringkasan Masalah Utama

-

### Kesimpulan Tingkat Tinggi

-

### Status Umum Sistem

- Reusable pattern lintas 14 stage:
- Choice card consistency:
- Artifact lifecycle consistency:
- Validation lifecycle consistency:
- Revision flow consistency:
- Regex elimination readiness:

## Scope and Non-Goals

### Scope

Audit ini mencakup:

1. Chat system / halaman chat system.
2. Seluruh 14 stage paper.
3. System prompt utama aktif.
4. Stage skills aktif.
5. Flow choice card, artifact lifecycle, validation lifecycle, revision flow, dan instruction contract.

### Non-Goals

1. Tidak melakukan implementasi final langsung.
2. Tidak melakukan deploy prompt/skill langsung ke sistem aktif.
3. Tidak melakukan refactor umum yang tidak terkait langsung dengan flow inti.
4. Tidak membuat rekomendasi tanpa evidence dan traceability.

## System Context

### Komponen yang Diaudit

- Frontend paths:
- Backend paths:
- Prompt files:
- Skill files:
- Runtime contracts:
- Relevant mutations / queries / tools:

### Ringkasan Arsitektur Existing

-

## Existing Architecture Findings

### Temuan Inti

| ID | Priority | Area | Summary | Impact |
| --- | --- | --- | --- | --- |
| F-001 |  |  |  |  |
| F-002 |  |  |  |  |

### Existing Pattern Summary

#### Choice Card

-

#### Artifact Lifecycle

-

#### Validation Lifecycle

-

#### Revision Flow

-

#### Prompt and Skill Contract

-

#### Regex Usage

-

## Stage-by-Stage Audit Matrix

Isi satu baris untuk setiap stage.

| Stage | Choice Card Present | Choice Card Safe | updateStageData | create/updateArtifact | artifactId Stored | submitStageForValidation | pending_validation Reached | Validation Panel Rendered | Chat Revision Works | Validation Panel Revision Works | Edit+Resend Works | Versioned Artifact Needed | Root Cause | Evidence / File Paths | Architecture Correction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gagasan |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| topik |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| outline |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| abstrak |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| pendahuluan |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| tinjauan_literatur |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| metodologi |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| hasil |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| diskusi |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| kesimpulan |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| pembaruan_abstrak |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| daftar_pustaka |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| lampiran |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| judul |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## System Prompt Findings

### Files Reviewed

- [ ] `.references/system-prompt-skills-active/updated-2/system-prompt.md`

### Findings

| ID | Priority | Problem | Evidence | Impact | Correction Needed |
| --- | --- | --- | --- | --- | --- |
| SP-001 |  |  |  |  |  |

### False-Claim Risk Assessment

-

### Contract Gaps

-

## Stage Skills Findings

### Files Reviewed

- [ ] `.references/system-prompt-skills-active/updated-2/01-gagasan-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/02-topik-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/03-outline-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/04-abstrak-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/05-pendahuluan-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/06-tinjauan-literatur-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/07-metodologi-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/08-hasil-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/09-diskusi-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/10-kesimpulan-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/11-pembaruan-abstrak-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/12-daftar-pustaka-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/13-lampiran-skill.md`
- [ ] `.references/system-prompt-skills-active/updated-2/14-judul-skill.md`

### Findings

| ID | Stage | Priority | Problem | Evidence | Impact | Correction Needed |
| --- | --- | --- | --- | --- | --- | --- |
| SK-001 |  |  |  |  |  |  |

### Cross-Stage Consistency Assessment

-

## Regex Deletion Plan

### Inventory of Regex or Fragile String-Matching Patterns

| ID | Location | Current Pattern | Purpose | Why Fragile | Remove / Replace |
| --- | --- | --- | --- | --- | --- |
| RX-001 |  |  |  |  |  |

### Replacement Strategy

#### Target Structured Contract

-

#### JSON / Schema / Typed Payload Proposal

```json
{
  "action": "",
  "stage": "",
  "intent": "",
  "artifact": {
    "mode": "",
    "artifactId": null,
    "createNewVersion": false
  },
  "validation": {
    "submit": false,
    "expectedStatus": ""
  },
  "choiceCard": {
    "present": false,
    "mode": ""
  }
}
```

#### Migration Notes

-

## Target Architecture Pattern

### Reusable Pattern Overview

-

### Required Contracts

#### Prompt Contract

-

#### Skill Contract

-

#### Runtime Contract

-

#### Backend Contract

-

#### Frontend Render Contract

-

## Artifact Lifecycle Contract

### Existing State

-

### Target State

-

### Required Guarantees

1. 
2. 
3. 

### Failure Modes

| ID | Failure Mode | Where It Breaks | Evidence | Required Correction |
| --- | --- | --- | --- | --- |
| AL-001 |  |  |  |  |

## Validation Lifecycle Contract

### Existing State

-

### Target State

-

### Required Guarantees

1. 
2. 
3. 

### Failure Modes

| ID | Failure Mode | Where It Breaks | Evidence | Required Correction |
| --- | --- | --- | --- | --- |
| VL-001 |  |  |  |  |

## Revision Flow Contract

### Chat Revision Flow

#### Existing State

-

#### Target State

-

#### Required Guarantees

1. 
2. 
3. 

### Validation Panel Revision Flow

#### Existing State

-

#### Target State

-

#### Required Guarantees

1. 
2. 
3. 

### Edit+Resend Prompt Contract

#### Existing State

-

#### Target State

-

#### Required Guarantees

1. 
2. 
3. 

### Versioned Artifact Policy

-

## False-Claim Guardrails

### Assistant Claim Rules

1. 
2. 
3. 

### Guardrail Conditions

| ID | Claim Type | Required Backend Proof | Required UI Proof | Required Runtime Proof |
| --- | --- | --- | --- | --- |
| FG-001 | artifact created |  |  |  |
| FG-002 | submitted for validation |  |  |  |
| FG-003 | validation panel available |  |  |  |

## Traceability Map

| Finding ID | Related Code Files | Related Prompt/Skill Files | Related Mutation/Tool | Related Backend State | Related Frontend Render |
| --- | --- | --- | --- | --- | --- |
| F-001 |  |  |  |  |  |

## Prompt and Skill Draft Corrections

### Draft Revisions Prepared

| ID | File | Status | Summary of Draft Correction | Upload Needed via Admin Panel |
| --- | --- | --- | --- | --- |
| DR-001 |  |  |  | yes / no |

### Notes

-

## Migration Plan

### Existing State vs Target State

| Area | Existing State | Target State | Gap | Risk |
| --- | --- | --- | --- | --- |
| choice card |  |  |  |  |
| artifact lifecycle |  |  |  |  |
| validation lifecycle |  |  |  |  |
| revision flow |  |  |  |  |
| prompt and skills |  |  |  |  |
| regex replacement |  |  |  |  |

### Recommended Execution Order

1. 
2. 
3. 
4. 

### Regression Risks

1. 
2. 
3. 

### Verification Items for Future Implementation Session

1. 
2. 
3. 

## Acceptance Criteria for Implementation Session

1. Semua 14 stage mengikuti satu reusable pattern yang sama.
2. Choice card hadir konsisten dan tidak memutus lifecycle.
3. Artifact lifecycle berjalan lengkap dan terverifikasi.
4. Validation lifecycle berjalan lengkap dan terverifikasi.
5. Revisi via chat dan validation panel sama-sama valid.
6. Edit+resend prompt tidak memutus flow.
7. Versioned artifact tercipta bila memang diperlukan.
8. Tidak ada false claim dari assistant.
9. Regex utama telah dihapus dari flow inti dan diganti instruction contract terstruktur.
10. System prompt utama dan stage skills sinkron dengan arsitektur target.

## Evidence Appendix

### Code Evidence

- 

### Prompt and Skill Evidence

- 

### Backend Evidence

- 

### Frontend Evidence

- 

### Logs and Runtime Evidence

- 

## Final Recommendation Summary

### Critical Actions

1. 
2. 
3. 

### High-Priority Actions

1. 
2. 
3. 

### Medium / Low Follow-Ups

1. 
2. 
3. 

## Document Sign-Off

- Review completed:
- Ready for implementation session:
- Requires additional evidence:
- Notes:
