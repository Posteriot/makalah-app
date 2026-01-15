# PaperValidationPanel - Files Index

Rujukan cepat untuk lokasi semua files terkait komponen PaperValidationPanel (UI approval/revisi tahap paper workflow).

## Quick Jump

| Kategori | Jumlah | Isi |
|----------|--------|-----|
| [Komponen UI](#komponen-ui) | 1 | Panel approval utama |
| [Parent Component](#parent-component) | 1 | ChatWindow integration |
| [Hook](#hook) | 1 | usePaperSession |
| [Backend (Convex)](#backend-convex) | 3 | mutations + types + constants |
| [AI Tools](#ai-tools) | 1 | submitStageForValidation trigger |
| [Chat API (Force Submit)](#chat-api-force-submit) | 1 | Router toolChoice submitStageForValidation |
| **Total** | **8** | |

---

## Komponen UI

```
src/components/paper/
└── PaperValidationPanel.tsx          # Panel approval/revisi (121 lines)
```

### PaperValidationPanel.tsx - Line Reference

| Line | What's There |
|------|--------------|
| 10-15 | `PaperValidationPanelProps` interface |
| 17-22 | Component declaration |
| 23-25 | State hooks internal |
| 27-37 | `handleApprove()` function |
| 39-55 | `handleRevise()` function |
| 57-119 | JSX return (Card + buttons + form) |
| 62-63 | Title "Validasi Tahap" + description |
| 68-76 | Tombol Revisi (outline merah) |
| 77-84 | Tombol Approve & Lanjut (hijau) |
| 100-117 | Revision feedback form (TextArea + Button) |

### Props Interface (Line 10-15)

```typescript
interface PaperValidationPanelProps {
    stageLabel: string;
    onApprove: () => Promise<void>;
    onRevise: (feedback: string) => Promise<void>;
    isLoading?: boolean;
}
```

---

## Parent Component

```
src/components/chat/
└── ChatWindow.tsx                     # Integrasi panel (529 lines)
```

### ChatWindow.tsx - Line Reference

| Line | What's There |
|------|--------------|
| 20 | Import `PaperValidationPanel` |
| 41-51 | `usePaperSession()` hook call |
| 316-326 | `handleApprove()` handler (with auto-message) |
| 328-339 | `handleRevise()` handler |
| 479-495 | Virtuoso Footer dengan PaperValidationPanel |

### Render in Virtuoso Footer (Line 479-495)

```tsx
components={{
  Footer: () => (
    <div className="pb-4">
      {/* Paper Validation Panel - renders before ThinkingIndicator */}
      {isPaperMode && stageStatus === "pending_validation" && userId && status !== 'streaming' && (
        <PaperValidationPanel
          stageLabel={stageLabel}
          onApprove={handleApprove}
          onRevise={handleRevise}
          isLoading={isLoading}
        />
      )}
      <ThinkingIndicator visible={status === 'submitted'} />
      <div className="h-4" />
    </div>
  )
}}
```

**Catatan:** Panel tidak muncul saat `status === 'streaming'` untuk menghindari gangguan saat AI sedang mengetik.

---

## Hook

```
src/lib/hooks/
└── usePaperSession.ts                 # Paper session hook (232 lines)
```

### usePaperSession.ts - Line Reference

| Line | What's There |
|------|--------------|
| 95-99 | Hook declaration + session query |
| 101-106 | Mutation declarations |
| 110-116 | `approveStage()` function |
| 118-125 | `requestRevision()` function |
| 214-231 | Return object |

### Return Type

```typescript
{
    session: PaperSession | null | undefined;
    isPaperMode: boolean;
    currentStage: PaperStageId | "completed";
    stageStatus: string | undefined;
    stageLabel: string;
    stageNumber: number;
    stageData: Record<string, StageDataEntry> | undefined;
    approveStage: (userId: Id<"users">) => Promise<{
        previousStage: string;
        nextStage: string;
        isCompleted: boolean;
    } | undefined>;
    requestRevision: (userId: Id<"users">, feedback: string) => Promise<{
        stage: string;
        revisionCount: number;
    } | undefined>;
    updateStageData: (stage: string, data: Record<string, unknown>) => Promise<{
        success: boolean;
        stage: string;
        warning?: string;
    } | undefined>;
    markStageAsDirty: () => Promise<{ success: boolean; error?: string } | undefined>;
    rewindToStage: (userId: Id<"users">, targetStage: PaperStageId) => Promise<{
        success: boolean;
        previousStage?: string;
        newStage?: string;
        invalidatedStages?: string[];
        invalidatedArtifactIds?: Id<"artifacts">[];
        error?: string;
    }>;
    getStageStartIndex: (messages: { createdAt: number; role?: string }[]) => number;
    checkMessageInCurrentStage: (messageCreatedAt: number) => boolean;
    isLoading: boolean;
}
```

---

## Backend (Convex)

```
convex/
├── paperSessions.ts                   # Mutations (1076 lines)
└── paperSessions/
    ├── types.ts                       # Type definitions (259 lines)
    └── constants.ts                   # Stage helpers (61 lines)
```

### paperSessions.ts - Key Mutations

| Mutation | Line | Args | Description |
|----------|------|------|-------------|
| `submitForValidation` | 427-460 | `sessionId` | AI trigger, set status pending_validation |
| `approveStage` | 465-587 | `sessionId, userId` | User approve, advance to next stage |
| `requestRevision` | 592-629 | `sessionId, userId, feedback` | User request revision |

### types.ts - StageStatus (Line 6)

```typescript
export type StageStatus = "drafting" | "pending_validation" | "approved" | "revision";
```

---

## AI Tools

```
src/lib/ai/
└── paper-tools.ts                     # Paper workflow tools (183 lines)
```

### paper-tools.ts - submitStageForValidation Tool (Line 155-181)

```typescript
submitStageForValidation: tool({
    description: "Kirim draf tahap saat ini ke user untuk divalidasi.
                  Ini akan memunculkan panel persetujuan di UI user.
                  AI akan berhenti ngetik setelah ini.",
    inputSchema: z.object({}),
    execute: async () => {
        // Calls api.paperSessions.submitForValidation
        return {
            success: true,
            message: "Draf telah dikirim ke user. Menunggu validasi (Approve/Revise) dari user sebelum bisa lanjut ke tahap berikutnya."
        };
    },
}),
```

---

## Chat API (Force Submit)

```
src/app/api/chat/
└── route.ts                          # Force submit saat user konfirmasi
```

### route.ts - Line Reference

| Line | What's There |
|------|--------------|
| 914-918 | `shouldForceSubmitValidation` guard (konfirmasi + ringkasan) |
| 980-982 | `toolChoice` → `submitStageForValidation` |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TRIGGER (AI Side)                                   │
│                                                                             │
│  AI calls submitStageForValidation tool                                     │
│       │                                                                     │
│       ▼                                                                     │
│  paper-tools.ts:155 → paperSessions.submitForValidation:427                │
│       │                                                                     │
│       ▼                                                                     │
│  stageStatus → "pending_validation"                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UI RENDER                                           │
│                                                                             │
│  ChatWindow.tsx:479-495 (Virtuoso Footer) detects:                          │
│    - stageStatus === "pending_validation"                                   │
│    - status !== 'streaming' (wait for AI to finish)                         │
│       │                                                                     │
│       ▼                                                                     │
│  PaperValidationPanel.tsx rendered in Virtuoso Footer                       │
│       │                                                                     │
│       ▼                                                                     │
│  User sees: "Validasi Tahap: [Label]"                                       │
│             [Revisi]  [Approve & Lanjut]                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│       USER: APPROVE           │   │       USER: REVISE            │
│                               │   │                               │
│  handleApprove():316          │   │  handleRevise():328           │
│       │                       │   │       │                       │
│       ▼                       │   │       ▼                       │
│  usePaperSession.approveStage │   │  usePaperSession.requestRevision
│       │                       │   │       │                       │
│       ▼                       │   │       ▼                       │
│  paperSessions.approveStage   │   │  paperSessions.requestRevision│
│  :465                         │   │  :592                         │
│       │                       │   │       │                       │
│       ▼                       │   │       ▼                       │
│  currentStage → nextStage     │   │  stageStatus → "revision"     │
│  stageStatus → "drafting"     │   │  revisionCount++              │
│       │                       │   │       │                       │
│       ▼                       │   │       ▼                       │
│  sendMessage: "[Approved...]" │   │  sendMessage feedback         │
│       │                       │   │       │                       │
│       ▼                       │   │       ▼                       │
│  AI receives approval msg     │   │  AI receives revision request │
│  AI responds to continue      │   │  AI updateStageData           │
│  to next stage                │   │  submitStageForValidation     │
│                               │   │  Panel muncul lagi            │
└───────────────────────────────┘   └───────────────────────────────┘
```

---

## Search Patterns

```bash
# Find PaperValidationPanel usages
rg "PaperValidationPanel" src/ --type ts --type tsx

# Find approval/revision handlers
rg "handleApprove|handleRevise" src/components/chat/

# Find stageStatus changes
rg "pending_validation|stageStatus" convex/ src/

# Find submitForValidation calls
rg "submitForValidation" src/ convex/
```

---

*Last updated: 2026-01-13*
