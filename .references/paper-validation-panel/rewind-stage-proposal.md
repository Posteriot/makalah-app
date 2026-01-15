# Paper Workflow: Rewind Stage & Artifact Update - Proposal

> **STATUS: ✅ IMPLEMENTED (2026-01-11)**
>
> Fitur ini sudah diimplementasi. Lihat:
> - `.development/specs/2026-01-11-paper-workflow-rewind/` untuk spec dan tasks
> - Task Groups 1-11 completed, 91 tests documented
> - Key files modified: `convex/paperSessions.ts`, `src/lib/ai/paper-tools.ts`, `src/lib/hooks/usePaperSession.ts`, UI components

Dokumentasi lengkap masalah rewind stage dan artifact update dalam paper workflow, beserta solusi yang diusulkan.

## Daftar Isi

1. [Problem Statement](#problem-statement)
2. [Current Constraints](#current-constraints)
3. [Impact & Symptoms](#impact--symptoms)
4. [Root Cause Analysis](#root-cause-analysis)
5. [Proposed Solution](#proposed-solution)
6. [Design Decisions](#design-decisions)
7. [MessageBubble Edit-Send Permission Rules](#messagebubble-edit-send-permission-rules)
8. [Implementation Scope](#implementation-scope)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Open Questions](#open-questions)
11. [References](#references)

---

## Problem Statement

### Core Issue

Paper workflow saat ini bersifat **one-way only** (maju terus, tidak bisa mundur). Setelah user meng-approve sebuah stage dan advance ke stage berikutnya, **tidak ada mekanisme untuk kembali merevisi stage sebelumnya**.

### Scenario

```
Timeline:
─────────────────────────────────────────────────────────────────────────────

1. User di stage "Topik" (stage 2)
   - AI dan user berdiskusi
   - AI panggil updateStageData({ stage: "topik", data: {...} })
   - AI panggil submitStageForValidation()
   - User klik [Approve & Lanjut]
   - Artifact "Topik: AI dalam Pendidikan" dibuat

2. Stage advance ke "Outline" (stage 3)
   - currentStage = "outline"
   - stageStatus = "drafting"
   - stageData.topik.validatedAt = timestamp

3. User berubah pikiran, ingin revisi topik
   - User edit message atau bilang "Aku mau ganti angle topiknya"
   - AI mencoba updateStageData({ stage: "topik", data: {...} })

4. ❌ BLOCKED
   - Error: "Hanya bisa update stage yang sedang aktif"
   - AI tidak bisa update stage "topik" karena currentStage = "outline"
   - Artifact "Topik: AI dalam Pendidikan" tetap exist tapi sudah tidak relevan
   - Workflow stuck
```

### Inconsistency dengan MessageBubble Edit

UI MessageBubble memungkinkan user untuk **edit dan resend prompt kapan saja**, bahkan untuk message di awal percakapan. Ini menciptakan ekspektasi bahwa user bisa merevisi keputusan kapan saja, tapi workflow tidak mendukung ini.

---

## Current Constraints

### 1. updateStageData Constraint

**File:** `convex/paperSessions.ts`

```typescript
export const updateStageData = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        stage: v.string(),
        data: v.any(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);

        // ❌ CONSTRAINT: Hanya boleh update currentStage
        if (args.stage !== session.currentStage) {
            throw new Error("Hanya bisa update stage yang sedang aktif");
        }

        // ... rest of handler
    },
});
```

**Rationale awal:** Memastikan linear workflow, mencegah data race.

**Problem:** Terlalu restrictive, tidak mengakomodasi kebutuhan revisi.

### 2. Artifact Creation Without Update Tool

**Current AI Tools:**

| Tool | Available | Description |
|------|-----------|-------------|
| `createArtifact` | ✅ Yes | Membuat artifact baru |
| `updateArtifact` | ❌ No | Tidak ada |
| `deleteArtifact` | ❌ No | Tidak ada |

**File:** `src/app/api/chat/route.ts`

AI hanya bisa `createArtifact`, tidak bisa update atau delete. Jika stage di-rewind dan keputusan berubah, artifact lama tetap exist tapi sudah stale.

### 3. No Rewind Mechanism

Tidak ada mutation atau UI untuk kembali ke stage sebelumnya. Satu-satunya "rewind" yang mungkin adalah menghapus seluruh paper session dan mulai dari awal.

### 4. Artifact-Stage Relationship

**File:** `convex/paperSessions/types.ts`

```typescript
// Setiap stage bisa punya artifactId
stageData: {
    gagasan: { artifactId?: Id<"artifacts">, ... },
    topik: { artifactId?: Id<"artifacts">, ... },
    outline: { artifactId?: Id<"artifacts">, ... },
    // ...
}
```

Artifact linked ke stage via `stageData.{stage}.artifactId`, tapi tidak ada mekanisme untuk:
- Track apakah artifact masih valid
- Update artifact saat stage direvisi
- Cascade invalidation ke artifacts dependent

---

## Impact & Symptoms

### User Experience

1. **Workflow terasa kaku** - User tidak bisa berubah pikiran
2. **Inkonsistensi UX** - Bisa edit message tapi tidak bisa revisi stage
3. **Frustration** - Harus mulai ulang jika salah di stage awal
4. **Artifact confusion** - Artifact lama masih tampil meski sudah tidak relevan

### AI Behavior

1. **AI stuck** - Tidak bisa memenuhi permintaan user untuk revisi
2. **Error messages** - AI harus jelaskan keterbatasan sistem
3. **Workarounds** - AI mungkin coba workaround yang tidak ideal

### Data Integrity

1. **Stale artifacts** - Artifacts tidak mencerminkan keputusan terkini
2. **Inconsistent state** - Stage data dan artifacts tidak sinkron
3. **Memory digest outdated** - `paperMemoryDigest` berisi keputusan lama

---

## Root Cause Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROOT CAUSE DIAGRAM                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │     DESIGN ASSUMPTION           │
                    │                                 │
                    │  "Workflow adalah LINEAR"       │
                    │  "User tidak akan berubah       │
                    │   pikiran setelah approve"      │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐     ┌───────────────────────┐
        │ updateStageData       │     │ Artifact System       │
        │ CONSTRAINT            │     │ LIMITATION            │
        │                       │     │                       │
        │ • Hanya currentStage  │     │ • Hanya createArtifact│
        │ • Tidak ada rewind    │     │ • Tidak ada update    │
        │ • Tidak ada exception │     │ • Tidak ada invalidate│
        └───────────────────────┘     └───────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │         SYMPTOMS                │
                    │                                 │
                    │ • User tidak bisa revisi        │
                    │ • AI stuck / blocked            │
                    │ • Stale artifacts               │
                    │ • Poor UX                       │
                    └─────────────────────────────────┘
```

**Core assumption yang salah:** Paper writing adalah proses iteratif, bukan linear. User sering berubah pikiran, menemukan insight baru, atau mendapat feedback yang mengubah keputusan sebelumnya.

---

## Proposed Solution

### Overview

Implementasi **Rewind Stage** mechanism yang memungkinkan user kembali ke stage sebelumnya, dengan proper handling untuk:
- Stage data reset/update
- Artifact invalidation & update
- AI awareness & instructions

### Solution Components

#### 1. `rewindToStage` Mutation

Mutation baru untuk kembali ke stage sebelumnya:

```typescript
// convex/paperSessions.ts

export const rewindToStage = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        targetStage: v.string(), // Stage yang dituju
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);

        // Guards
        if (session.userId !== args.userId) throw new Error("Unauthorized");
        if (!isValidRewindTarget(session.currentStage, args.targetStage)) {
            throw new Error("Invalid rewind target");
        }

        // 1. Get stages to invalidate (targetStage dan setelahnya)
        const stagesToInvalidate = getStagesToInvalidate(
            args.targetStage,
            session.currentStage
        );

        // 2. Mark artifacts as invalidated
        await invalidateArtifactsForStages(ctx, session, stagesToInvalidate);

        // 3. Clear validatedAt untuk stages yang di-invalidate
        const updatedStageData = clearValidatedAt(session.stageData, stagesToInvalidate);

        // 4. Update session
        await ctx.db.patch(args.sessionId, {
            currentStage: args.targetStage,
            stageStatus: "drafting",
            stageData: updatedStageData,
            updatedAt: Date.now(),
        });

        return {
            previousStage: session.currentStage,
            newStage: args.targetStage,
            invalidatedStages: stagesToInvalidate,
        };
    },
});
```

#### 2. `updateArtifact` AI Tool

Tool baru untuk AI update artifact existing:

```typescript
// src/app/api/chat/route.ts

updateArtifact: tool({
    description: `Update existing artifact dengan konten baru.

WAJIB gunakan tool ini jika:
• Ada artifact yang ditandai "invalidated" untuk stage saat ini
• User meminta revisi artifact yang sudah ada
• Setelah rewind, artifact perlu di-update

JANGAN gunakan createArtifact jika artifact untuk stage ini sudah ada.
Immutable versioning: update membuat versi baru, history preserved.`,

    inputSchema: z.object({
        artifactId: z.string().describe("ID artifact yang akan di-update"),
        content: z.string().describe("Konten baru"),
        title: z.string().optional().describe("Judul baru (opsional)"),
    }),

    execute: async ({ artifactId, content, title }) => {
        try {
            const result = await fetchMutation(api.artifacts.update, {
                artifactId: artifactId as Id<"artifacts">,
                userId: userId as Id<"users">,
                content,
                ...(title && { title }),
            });

            // Clear invalidation flag
            await fetchMutation(api.artifacts.clearInvalidation, {
                artifactId: artifactId as Id<"artifacts">,
            });

            return {
                success: true,
                artifactId: result.artifactId,
                version: result.version,
                message: `Artifact berhasil di-update ke versi ${result.version}.`,
            };
        } catch (error) {
            return {
                success: false,
                error: `Gagal update artifact: ${error.message}`,
            };
        }
    },
}),
```

#### 3. Artifact Invalidation Schema

Extend artifact schema untuk tracking invalidation:

```typescript
// convex/schema.ts

artifacts: defineTable({
    // ... existing fields ...

    // NEW: Invalidation tracking
    invalidatedAt: v.optional(v.number()),
    invalidatedByRewindToStage: v.optional(v.string()),
})
```

#### 4. UI: Rewind Trigger di PaperStageProgress

Tambah click handler di stage badges untuk trigger rewind:

```tsx
// src/components/paper/PaperStageProgress.tsx

// Stage badge yang sudah dilewati bisa di-klik untuk rewind
<button
    onClick={() => onRewindRequest(stage)}
    className={cn(
        "cursor-pointer hover:ring-2 hover:ring-primary",
        isCompleted && "opacity-80"
    )}
>
    <StageIcon stage={stage} />
</button>

// Confirmation dialog
<AlertDialog open={rewindDialogOpen}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Kembali ke tahap {targetStageLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
                Artifact dari tahap {targetStageLabel} dan setelahnya akan ditandai
                "perlu di-update". AI akan membantu merevisi saat tahap dijalani.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRewind}>
                Ya, Kembali ke {targetStageLabel}
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

#### 5. UI: Artifact Invalidation Warning

Warning indicator di ArtifactViewer untuk artifact yang invalidated:

```tsx
// src/components/chat/ArtifactViewer.tsx

{artifact.invalidatedAt && (
    <Alert variant="warning" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Artifact perlu di-update</AlertTitle>
        <AlertDescription>
            Tahap "{artifact.invalidatedByRewindToStage}" telah di-rewind.
            Artifact ini mungkin tidak lagi akurat.
            AI akan meng-update saat tahap terkait dijalani.
        </AlertDescription>
    </Alert>
)}
```

#### 6. Stage Instructions Update

Inject context tentang invalidated artifacts ke AI:

```typescript
// src/lib/ai/paper-mode-prompt.ts

function getInvalidatedArtifactsContext(session: PaperSession): string {
    const invalidatedArtifacts = getInvalidatedArtifactsForCurrentStage(session);

    if (invalidatedArtifacts.length === 0) return "";

    return `
═══════════════════════════════════════════════════════════════════════════════
ARTIFACT YANG PERLU DI-UPDATE
═══════════════════════════════════════════════════════════════════════════════

Artifact berikut ditandai "invalidated" karena rewind.
WAJIB gunakan updateArtifact (BUKAN createArtifact) untuk merevisi:

${invalidatedArtifacts.map(a => `• [${a._id}] "${a.title}" (${a.type})`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
`;
}
```

---

## Design Decisions

Keputusan yang sudah disepakati:

### 1. AI Update vs Create New Artifact

**Decision:** AI bisa **update** artifact existing (bukan create new setiap revisi)

**Rationale:**
- Immutable versioning tetap berlaku (update = create new version)
- History preserved
- artifactId tetap sama (version chain)
- Lebih clean daripada multiple artifacts untuk hal yang sama

### 2. Artifact Invalidation Handling

**Decision:** Keep artifacts with warning + **AI wajib update** saat stage dijalani ulang

**Rationale:**
- User bisa lihat history/referensi
- Tidak destructive (data tidak hilang)
- Clear indication bahwa artifact perlu update
- AI responsibility untuk update, bukan manual user

### 3. Rewind Scope

**Decision:** Rewind ke stage X = invalidate artifacts dari stage X **dan semua stage setelahnya**

**Rationale:**
- Stages saling dependent (outline depends on topik, dll)
- Konsisten dengan linear workflow principle
- Avoid partial invalidation yang bisa confusing

### 4. Rewind Trigger

**Decision:** UI button di PaperStageProgress (explicit user action)

**Rationale:**
- Clear, intentional action
- User in control
- Avoid unexpected rewinds dari AI misinterpretation

---

## MessageBubble Edit-Send Permission Rules

### Latar Belakang

MessageBubble menyediakan fitur **edit-send** (edit message → resend ke AI) dan **regenerate** (minta AI ulang response). Namun dalam paper mode, fitur ini berpotensi menciptakan **inkonsistensi** jika tidak dibatasi:

1. **Stage sudah approved** → User edit message lama → AI response baru → Tapi stage data sudah locked
2. **Banyak turns ke belakang** → Edit → AI response outdated karena context sudah berubah drastis
3. **Inconsistency** → Chat history tidak mencerminkan actual paper state

### Core Problem

```
Timeline Paper Session:
─────────────────────────────────────────────────────────────────────────────

Stage: Gagasan (approved) │ Stage: Topik (approved) │ Stage: Outline (current)
                          │                          │
[Msg 1] User: "..."       │ [Msg 5] User: "..."      │ [Msg 10] User: "..."
[Msg 2] AI: "..."         │ [Msg 6] AI: "..."        │ [Msg 11] AI: "..."
[Msg 3] User: "..."       │ [Msg 7] User: "..."      │ [Msg 12] User: "..."  ← 2 turns back
[Msg 4] AI: "..."         │ [Msg 8] AI: "..."        │ [Msg 13] AI: "..."    ← 1 turn back
                          │ [Msg 9] AI: artifact     │ [Msg 14] User: "..."  ← CURRENT
                          │                          │

Tanpa restriction:
- Edit Msg 1 (stage approved) → ❌ Problematic: stage sudah locked
- Edit Msg 5 (stage approved) → ❌ Problematic: stage sudah locked
- Edit Msg 10 (> 2 turns back) → ❌ Problematic: context sudah terlalu berubah
- Edit Msg 12 (≤ 2 turns back) → ✅ OK: masih dalam konteks recent
- Edit Msg 14 (current) → ✅ OK: pesan terakhir
```

### Permission Rules (PAPER MODE ONLY)

**IMPORTANT:** Rules ini HANYA berlaku untuk **paper mode** (isPaperMode === true). Regular chat tidak terpengaruh.

#### Rule 1: Messages di Stage yang Sudah APPROVED

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RULE 1: MESSAGE DI STAGE YANG SUDAH APPROVED                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Kondisi:                                                                   │
│  • Message berada di conversation SEBELUM stage transition ke current stage│
│  • Stage tempat message berada sudah berstatus "approved"                   │
│                                                                             │
│  Permission:                                                                │
│  • Edit-Send: ❌ DISABLED                                                   │
│  • Regenerate: ❌ DISABLED                                                  │
│                                                                             │
│  UI Behavior:                                                               │
│  • Button disabled (grayed out)                                             │
│  • Tooltip: "Tahap ini sudah disetujui. Gunakan Rewind untuk merevisi."    │
│                                                                             │
│  Rationale:                                                                 │
│  • Stage sudah final, editing message tidak akan mengubah stage data       │
│  • Mencegah confusion antara chat state vs paper state                     │
│  • Jika mau revisi, gunakan explicit Rewind mechanism                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Rule 2: Messages di Current Stage, > 2 Turns ke Belakang

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RULE 2: MESSAGE DI CURRENT STAGE, > 2 TURNS KE BELAKANG                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Kondisi:                                                                   │
│  • Message berada di current stage                                          │
│  • Position message > 2 turns dari message terakhir                        │
│                                                                             │
│  Definition "Turn":                                                         │
│  • Turn = 1 round user message + AI response                               │
│  • Turn 0 = message saat ini (terkini)                                     │
│  • Turn 1 = 1 pair sebelumnya                                              │
│  • Turn 2 = 2 pair sebelumnya                                              │
│  • Turn 3+ = > 2 turns ke belakang                                         │
│                                                                             │
│  Permission:                                                                │
│  • Edit-Send: ❌ DISABLED                                                   │
│  • Regenerate: ❌ DISABLED                                                  │
│                                                                             │
│  UI Behavior:                                                               │
│  • Button disabled (grayed out)                                             │
│  • Tooltip: "Hanya bisa edit/regenerate 2 pesan terakhir dalam tahap ini"  │
│                                                                             │
│  Rationale:                                                                 │
│  • Context sudah berubah signifikan                                        │
│  • Editing message lama akan menghasilkan response yang tidak konsisten    │
│  • 2 turn = sweet spot untuk "recent enough" context                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Rule 3: Messages di Current Stage, ≤ 2 Turns Terakhir

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RULE 3: MESSAGE DI CURRENT STAGE, ≤ 2 TURNS TERAKHIR                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Kondisi:                                                                   │
│  • Message berada di current stage                                          │
│  • Position message ≤ 2 turns dari message terakhir                        │
│                                                                             │
│  Permission:                                                                │
│  • Edit-Send: ✅ ENABLED                                                    │
│  • Regenerate: ✅ ENABLED                                                   │
│                                                                             │
│  UI Behavior:                                                               │
│  • Button enabled (normal styling)                                          │
│  • No tooltip needed                                                        │
│                                                                             │
│  Rationale:                                                                 │
│  • Context masih fresh dan relevant                                        │
│  • Normal iterative workflow                                                │
│  • User bisa refine prompt atau minta regenerate response                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Rules Summary Table

| Lokasi Message | Turn Distance | Edit-Send | Regenerate | UI State |
|----------------|---------------|-----------|------------|----------|
| Stage APPROVED | Any | ❌ | ❌ | Disabled + tooltip |
| Current stage | > 2 turns | ❌ | ❌ | Disabled + tooltip |
| Current stage | ≤ 2 turns | ✅ | ✅ | Enabled |

### Scope Clarification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SCOPE: PAPER MODE ONLY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ TERPENGARUH:                                                            │
│  • Conversations dengan isPaperMode === true                                │
│  • Conversations yang memiliki linked paperSession                         │
│                                                                             │
│  ❌ TIDAK TERPENGARUH:                                                      │
│  • Regular chat conversations (isPaperMode === false)                      │
│  • Conversations tanpa paperSession                                        │
│                                                                             │
│  Implementation:                                                            │
│  • Check isPaperMode dari usePaperSession hook                             │
│  • If not paper mode → all edit/regenerate enabled as usual               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Turn Calculation Algorithm

```typescript
// Pseudocode untuk menghitung turn distance

function calculateTurnDistance(
    messages: Message[],
    targetMessageIndex: number
): number {
    const currentIndex = messages.length - 1;

    if (targetMessageIndex >= currentIndex) return 0;

    // Count user messages between target and current
    let turnCount = 0;
    for (let i = targetMessageIndex + 1; i <= currentIndex; i++) {
        if (messages[i].role === 'user') {
            turnCount++;
        }
    }

    return turnCount;
}

function isEditAllowed(
    messages: Message[],
    messageIndex: number,
    isPaperMode: boolean,
    messageStageStatus: StageStatus | undefined,
    currentStageStartIndex: number
): { allowed: boolean; reason?: string } {
    // Non-paper mode: always allowed
    if (!isPaperMode) {
        return { allowed: true };
    }

    // Rule 1: Message in approved stage
    if (messageIndex < currentStageStartIndex) {
        return {
            allowed: false,
            reason: "Tahap ini sudah disetujui. Gunakan Rewind untuk merevisi."
        };
    }

    // Rule 2 & 3: Check turn distance
    const turnDistance = calculateTurnDistance(messages, messageIndex);

    if (turnDistance > 2) {
        return {
            allowed: false,
            reason: "Hanya bisa edit/regenerate 2 pesan terakhir dalam tahap ini"
        };
    }

    // Rule 3: Within 2 turns
    return { allowed: true };
}
```

### Visual Example

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      VISUAL EXAMPLE: EDIT PERMISSIONS                        │
└─────────────────────────────────────────────────────────────────────────────┘

Paper Session State:
• currentStage: "outline" (stage 3)
• gagasan: approved
• topik: approved
• outline: drafting (current)

Message Timeline:
─────────────────────────────────────────────────────────────────────────────

STAGE: GAGASAN (approved)                              │ Edit-Send │
─────────────────────────────────────────────────────  │───────────│
[1] User: "Aku mau nulis paper tentang AI"             │    ❌     │ Rule 1
[2] AI: "Baik, mari kita eksplorasi..."                │    ❌     │ Rule 1
[3] User: "Fokusnya ke pendidikan"                     │    ❌     │ Rule 1
[4] AI: [artifact: Gagasan]                            │    ❌     │ Rule 1
─── APPROVED ───                                       │           │

STAGE: TOPIK (approved)                                │ Edit-Send │
─────────────────────────────────────────────────────  │───────────│
[5] User: [Approved] Lanjut ke tahap berikutnya        │    ❌     │ Rule 1
[6] AI: "Sekarang kita tentukan topik..."              │    ❌     │ Rule 1
[7] User: "Gimana kalau tentang kemandirian belajar?"  │    ❌     │ Rule 1
[8] AI: [artifact: Topik]                              │    ❌     │ Rule 1
─── APPROVED ───                                       │           │

STAGE: OUTLINE (current, drafting)                     │ Edit-Send │
─────────────────────────────────────────────────────  │───────────│
[9]  User: [Approved] Lanjut ke tahap berikutnya       │    ❌     │ Rule 2 (Turn 4)
[10] AI: "Mari susun outline..."                       │    ❌     │ Rule 2 (Turn 4)
[11] User: "Pendahuluan dulu gimana?"                  │    ❌     │ Rule 2 (Turn 3)
[12] AI: "Untuk pendahuluan, kita bisa..."             │    ❌     │ Rule 2 (Turn 3)
[13] User: "Oke, lanjut ke bab 2"                      │    ✅     │ Rule 3 (Turn 2)
[14] AI: "Bab 2 tentang tinjauan literatur..."         │    ✅     │ Rule 3 (Turn 2)
[15] User: "Tambahin section tentang metode AI"        │    ✅     │ Rule 3 (Turn 1)
[16] AI: "Baik, saya tambahkan..."                     │    ✅     │ Rule 3 (Turn 1)
[17] User: "Kayaknya terlalu panjang"                  │    ✅     │ Rule 3 (Turn 0)
                                                       │           │ ← CURRENT

─────────────────────────────────────────────────────────────────────────────
```

### Integration dengan Rewind

Edit-Send permission rules ini **bekerja bersama** dengan Rewind mechanism:

1. **Edit disabled karena approved stage** → User bisa klik Rewind di PaperStageProgress
2. **Setelah Rewind** → Message di stage tersebut kembali enabled (sesuai turn rules)
3. **Consistency** → Tidak ada cara bypass permission kecuali explicit Rewind

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REWIND vs EDIT: DECISION MATRIX                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User ingin revisi...           │ Recommended Action                       │
│  ───────────────────────────────┼──────────────────────────────────────────│
│  Recent message (≤2 turns)      │ Edit-Send (langsung)                     │
│  Old message in current stage   │ Consider Rewind untuk clean context      │
│  Message in approved stage      │ Rewind (mandatory)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Scope

### Phase 1: Core Backend

| Task | File | Priority |
|------|------|----------|
| Add invalidation fields to schema | `convex/schema.ts` | High |
| Create `rewindToStage` mutation | `convex/paperSessions.ts` | High |
| Create `clearInvalidation` mutation | `convex/artifacts.ts` | High |
| Update `artifacts.update` to clear invalidation | `convex/artifacts.ts` | High |

### Phase 2: AI Tool

| Task | File | Priority |
|------|------|----------|
| Add `updateArtifact` tool | `src/app/api/chat/route.ts` | High |
| Update tool descriptions | `src/app/api/chat/route.ts` | Medium |

### Phase 3: UI Components

| Task | File | Priority |
|------|------|----------|
| Add rewind click handler | `src/components/paper/PaperStageProgress.tsx` | High |
| Add confirmation dialog | `src/components/paper/PaperStageProgress.tsx` | High |
| Add invalidation warning | `src/components/chat/ArtifactViewer.tsx` | Medium |
| Add warning badge | `src/components/chat/ArtifactIndicator.tsx` | Low |

### Phase 4: AI Instructions

| Task | File | Priority |
|------|------|----------|
| Add invalidated artifacts context | `src/lib/ai/paper-mode-prompt.ts` | High |
| Update stage instructions | `src/lib/ai/paper-stages/*.ts` | Medium |

### Phase 5: Hook & Integration

| Task | File | Priority |
|------|------|----------|
| Add `rewindToStage` to usePaperSession | `src/lib/hooks/usePaperSession.ts` | High |
| Query invalidated artifacts | `convex/artifacts.ts` | Medium |

### Phase 6: MessageBubble Edit Permissions (Paper Mode)

| Task | File | Priority |
|------|------|----------|
| Add `isEditAllowed` utility function | `src/lib/utils/paperPermissions.ts` (new) | High |
| Track stage transition timestamps | `convex/paperSessions.ts` | High |
| Add `currentStageStartIndex` calculation | `src/lib/hooks/usePaperSession.ts` | High |
| Integrate permission check in MessageBubble | `src/components/chat/MessageBubble.tsx` | High |
| Add disabled state + tooltip UI | `src/components/chat/MessageBubble.tsx` | Medium |
| Pass isPaperMode to MessageBubble | `src/components/chat/ChatWindow.tsx` | Medium |

### Phase Implementation Order

```
Phase 1 (Core Backend)     ──────────────────────────────────────────►
     │
     ▼
Phase 2 (AI Tool)          ──────────────────────────────────────────►
     │
     ├────────────────────────────────┐
     ▼                                ▼
Phase 3 (UI Components)    ───►  Phase 6 (MessageBubble Permissions) ───►
     │                                │
     ▼                                │
Phase 4 (AI Instructions)  ───►       │
     │                                │
     ▼                                ▼
Phase 5 (Hook & Integration) ◄────────┘
```

**Notes:**
- Phase 6 bisa paralel dengan Phase 3 & 4 karena tidak ada dependency langsung
- Phase 5 menjadi integration point untuk semua phases

---

## Data Flow Diagrams

### Rewind Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REWIND FLOW                                        │
└─────────────────────────────────────────────────────────────────────────────┘

User di Stage: Outline (stage 3)
Artifacts:
  - [A1] Gagasan artifact (stage 1) ✓ valid
  - [A2] Topik artifact (stage 2) ✓ valid
  - [A3] Outline artifact (stage 3) ✓ valid
                    │
                    ▼
User clicks stage "Topik" di PaperStageProgress
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Confirmation Dialog:                                                         │
│                                                                             │
│ "Kembali ke tahap Penentuan Topik?"                                         │
│                                                                             │
│ Artifact dari tahap Topik, Outline akan ditandai "perlu di-update".        │
│ AI akan membantu merevisi saat tahap dijalani.                             │
│                                                                             │
│ [Batal]  [Ya, Kembali]                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
            User clicks [Ya, Kembali]
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ rewindToStage({ targetStage: "topik" })                                     │
│                                                                             │
│ 1. Identify stages to invalidate: ["topik", "outline"]                      │
│                                                                             │
│ 2. Mark artifacts invalidated:                                              │
│    - [A2] Topik artifact: invalidatedAt = now, invalidatedByRewindToStage = "topik"
│    - [A3] Outline artifact: invalidatedAt = now, invalidatedByRewindToStage = "topik"
│                                                                             │
│ 3. Clear validatedAt:                                                       │
│    - stageData.topik.validatedAt = undefined                               │
│    - stageData.outline.validatedAt = undefined                             │
│                                                                             │
│ 4. Update session:                                                          │
│    - currentStage = "topik"                                                 │
│    - stageStatus = "drafting"                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Auto-send message to AI:                                                     │
│                                                                             │
│ "[Rewind ke Topik] User kembali ke tahap Penentuan Topik untuk revisi."    │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ AI receives context (via paper-mode-prompt):                                 │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
│ ARTIFACT YANG PERLU DI-UPDATE                                               │
│ ═══════════════════════════════════════════════════════════════════════════ │
│                                                                             │
│ Artifact berikut ditandai "invalidated" karena rewind.                      │
│ WAJIB gunakan updateArtifact (BUKAN createArtifact) untuk merevisi:         │
│                                                                             │
│ • [A2] "Topik: AI dalam Pendidikan" (outline)                              │
│                                                                             │
│ ═══════════════════════════════════════════════════════════════════════════ │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
AI responds: "Oke, kita kembali ke tahap Topik.
             Apa yang mau direvisi dari topik sebelumnya?"
                    │
                    ▼
            [Dialog AI + User]
                    │
                    ▼
AI calls: updateArtifact({
    artifactId: "A2",
    content: "Topik baru: Dampak AI pada Kemandirian Belajar..."
})
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ artifacts.update + clearInvalidation:                                        │
│                                                                             │
│ - Create new version (A2-v2)                                                │
│ - Clear invalidatedAt                                                        │
│ - Clear invalidatedByRewindToStage                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
AI calls: updateStageData({ stage: "topik", data: {...} })
AI calls: submitStageForValidation()
                    │
                    ▼
PaperValidationPanel appears
User clicks [Approve & Lanjut]
                    │
                    ▼
Stage advances to "outline"
[A3] Outline artifact still invalidated → AI will update when outline stage runs
```

### Artifact Lifecycle with Rewind

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ARTIFACT LIFECYCLE WITH REWIND                            │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │    CREATED      │
                    │                 │
                    │ invalidatedAt:  │
                    │   undefined     │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │     VALID       │           │   INVALIDATED   │
    │                 │           │                 │
    │ Stage approved  │  REWIND   │ invalidatedAt:  │
    │ Artifact shown  │ ────────► │   timestamp     │
    │ normally        │           │                 │
    │                 │           │ UI shows        │
    │                 │           │ warning banner  │
    └─────────────────┘           └────────┬────────┘
              ▲                            │
              │                            │
              │         AI calls           │
              │      updateArtifact        │
              │                            │
              │           ┌────────────────┘
              │           │
              │           ▼
              │  ┌─────────────────┐
              │  │    UPDATED      │
              │  │                 │
              │  │ New version     │
              │  │ created         │
              └──┤                 │
                 │ invalidatedAt:  │
                 │   cleared       │
                 └─────────────────┘
```

---

## Open Questions

### Sudah Diputuskan ✅

1. **Edit-Send Permission Rules**
   - ✅ **DECIDED:** Paper mode only, stage-based + turn-based restrictions
   - Rules: Approved stages disabled, current stage > 2 turns disabled, ≤ 2 turns enabled
   - See [MessageBubble Edit-Send Permission Rules](#messagebubble-edit-send-permission-rules)

2. **Artifact Update vs Create**
   - ✅ **DECIDED:** AI bisa update artifact existing
   - Immutable versioning tetap berlaku (version chain preserved)
   - See [Design Decisions](#design-decisions) point 1

3. **Artifact Invalidation Handling**
   - ✅ **DECIDED:** Keep with warning + AI wajib update saat stage dijalani ulang
   - See [Design Decisions](#design-decisions) point 2

4. **Notification ke AI saat rewind?**
   - ✅ **DECIDED:** Auto-send message seperti approval
   - Format: `[Rewind ke {stageLabel}] User kembali ke tahap {stageLabel} untuk revisi.`
   - Konsisten dengan pattern auto-message saat approval

### Masih Perlu Diputuskan

1. **Rewind limit?**
   - Boleh rewind ke stage manapun yang sudah dilewati?
   - Atau ada batasan (misal: hanya 1-2 stage ke belakang)?
   - **Recommendation:** Allow rewind ke stage manapun (user in control, explicit action dengan confirmation dialog sudah cukup safeguard)

2. **Multiple rewinds?**
   - Jika user sudah rewind, boleh rewind lagi?
   - Track rewind history?
   - **Recommendation:** Allow multiple rewinds, track history for analytics/debugging only

3. **Partial stage data?**
   - Saat rewind, stageData di-clear atau di-keep?
   - Keep: AI bisa lihat data lama sebagai referensi
   - Clear: Fresh start, tapi kehilangan context
   - **Recommendation:** Keep data (AI needs context for meaningful revision)

4. **paperMemoryDigest?**
   - Digest berisi keputusan dari stage yang sudah approved
   - Saat rewind, digest entry untuk stage tersebut:
     - Remove?
     - Mark as "superseded"?
     - Keep with note?
   - **Recommendation:** Mark as "superseded" (preserve history, AI aware of previous decision)

### Implementation Notes

Untuk Open Questions yang masih perlu diputuskan, recommendations di atas dapat digunakan sebagai default jika tidak ada keputusan eksplisit dari user. Implementer dapat mengkonfirmasi atau override via agent-os workflow.

---

## References

### Related Documentation

- `.references/paper-validation-panel/README.md` - PaperValidationPanel documentation
- `.references/paper-validation-panel/files-index.md` - Files index
- `.references/paper-workflow/README.md` - Paper workflow documentation
- `.references/artifact/README.md` - Artifact system documentation

### Existing Files (To Be Modified)

**Backend:**
- `convex/paperSessions.ts` - Paper session mutations (+rewindToStage, +stage transition tracking)
- `convex/artifacts.ts` - Artifact mutations (+update, +clearInvalidation)
- `convex/schema.ts` - Database schema (+invalidation fields)

**Frontend:**
- `src/components/paper/PaperStageProgress.tsx` - Stage progress UI (+rewind trigger)
- `src/components/paper/PaperValidationPanel.tsx` - Validation panel (unchanged)
- `src/components/chat/ArtifactViewer.tsx` - Artifact viewer (+invalidation warning)
- `src/components/chat/MessageBubble.tsx` - Message bubble (+edit permission checks)
- `src/components/chat/ChatWindow.tsx` - Chat window (+pass isPaperMode)
- `src/lib/hooks/usePaperSession.ts` - Paper session hook (+rewindToStage, +currentStageStartIndex)

**AI:**
- `src/app/api/chat/route.ts` - Chat API with tools (+updateArtifact tool)
- `src/lib/ai/paper-mode-prompt.ts` - Paper mode prompt injection (+invalidated artifacts context)
- `src/lib/ai/paper-stages/*.ts` - Stage instructions

### New Files (To Be Created)

- `src/lib/utils/paperPermissions.ts` - Edit-send permission logic for paper mode

---

*Created: 2026-01-11*
*Last Updated: 2026-01-11*
*Status: ✅ IMPLEMENTED*

### Change Log

| Date | Changes |
|------|---------|
| 2026-01-11 | Initial proposal created |
| 2026-01-11 | Added MessageBubble Edit-Send Permission Rules section |
| 2026-01-11 | Added Phase 6 (MessageBubble Permissions) to Implementation Scope |
| 2026-01-11 | Resolved Open Questions: Edit-Send rules, Artifact handling, Rewind notification |
| 2026-01-11 | **IMPLEMENTED**: All 11 Task Groups completed (91 tests documented) |
| 2026-01-11 | **POST-IMPL FIX**: `updateStageData` AUTO-STAGE (Option B) - stage param removed from AI tool |
