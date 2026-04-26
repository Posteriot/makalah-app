# Visual Flow: Makalah AI 14-Stage Lifecycle

Diagram ini menggambarkan alur kerja ideal pengguna dari awal gagasan hingga naskah final, mencakup mekanisme validasi dan logika lintas stage.

```mermaid
graph TD
    %% Global Styles
    classDef preparatory fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef writing fill:#f3e5f5,stroke:#4a148c,stroke-width:2px;
    classDef finalization fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px;
    classDef validation fill:#fff3e0,stroke:#e65100,stroke-width:2px,stroke-dasharray: 5 5;
    classDef critical fill:#ffebee,stroke:#b71c1c,stroke-width:2px;

    subgraph "Fase 1: Preparatory (Stage 1-3)"
        S1[Stage 1: Gagasan<br/>Active Dual Search]:::preparatory
        S2[Stage 2: Topik<br/>Passive Derivation]:::preparatory
        S3[Stage 3: Outline<br/>Blueprint Naskah]:::preparatory
        
        S1 --> S2 --> S3
    end

    subgraph "Inner Loop: Per-Stage Logic"
        direction TB
        Draft[Drafting Status<br/>AI Discussions & Plans]
        Choice{User Choice?}
        Artifact[Artifact Creation<br/>createArtifact]
        Pending[Pending Validation<br/>submitStageForValidation]
        Decision{User Decision}
        
        Draft --> Choice --> Artifact --> Pending --> Decision
        Decision -- "Revise" --> Revision[Revision Status<br/>requestRevision]
        Revision --> Artifact
        Decision -- "Approve" --> Approved[Approved Status]
    end

    S3 --> Draft

    subgraph "Fase 2: Writing (Stage 4-11)"
        S4[Stage 4: Abstrak]:::writing
        S5[Stage 5: Pendahuluan]:::writing
        S6[Stage 6: Tinjauan Literatur<br/>Active Academic Search]:::writing
        S7[Stage 7: Metodologi]:::writing
        S8[Stage 8: Hasil]:::writing
        S9[Stage 9: Diskusi]:::writing
        S10[Stage 10: Kesimpulan]:::writing
        S11[Stage 11: Pembaruan Abstrak]:::writing

        Approved --> S4
        S4 --> S5 --> S6 --> S7 --> S8 --> S9 --> S10 --> S11
    end

    subgraph "Fase 3: Finalization (Stage 12-14)"
        S12[Stage 12: Daftar Pustaka<br/>Compilation Mode]:::finalization
        S13[Stage 13: Lampiran]:::finalization
        S14[Stage 14: Judul Akhir<br/>Sync paperTitle]:::finalization
        Done((COMPLETED)):::finalization

        S11 --> S12 --> S13 --> S14 --> Done
    end

    %% Cross-Stage Logic
    Rewind{Rewind Request?}:::critical
    Rewind -- "Lompat Mundur" --> S1
    Rewind -- "Invalidate Future Stages" --> S14

    %% Legend/Notes
    Note1[Note: Memory Digest ensures past<br/>decisions are not contradicted]
    Note2[Note: isDirty flag warns AI if<br/>context is out of sync]

    style Inner Loop fill:#fafafa,stroke:#333,stroke-width:1px
```

---

## 🔍 Rujukan Kode (Audit Forensik)

Berdasarkan pembacaan kode langsung (tanpa mengandalkan komentar), berikut adalah rujukan implementasi faktual:

| Komponen | File Path | Baris/Logika |
| :--- | :--- | :--- |
| **Stage Order** | [constants.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions/constants.ts) | `STAGE_ORDER` (L1-16) berisi 14 tahapan kronologis. |
| **Search Policy** | [skill-contracts.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/stage-skill-contracts.ts) | `ACTIVE_SEARCH_STAGES` (L3) & `PASSIVE_SEARCH_STAGES` (L7). |
| **Inner Loop Logic** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | `approveStage` (L1321) & `requestRevision` (L1477) status guard. |
| **Memory Digest** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | `updatedDigest` (L1390) menyimpan keputusan untuk konteks masa depan. |

---

## Referensi Dokumen Sumber
- [User Flows 00: General Mechanisms](./user-flows-00.md)
- [Lifecycle States Documentation](./03-lifecycle-states.md)

---
> [!TIP]
> Alur ini didesain supaya AI nggak pernah kerja sendirian tanpa pengawasan lo. Lo adalah "Pawang", AI adalah "Tukangnya". Transisi antar status dijamin oleh *Backend Enforcer* di level database.
