# PaperValidationPanel - Referensi Teknis

Dokumentasi komprehensif untuk komponen PaperValidationPanel - UI approval/revisi yang muncul di setiap pergantian tahap dalam paper workflow.

## Daftar Isi

1. [Ikhtisar](#ikhtisar)
2. [Tampilan Visual](#tampilan-visual)
3. [Komponen React](#komponen-react)
4. [Props dan Interface](#props-dan-interface)
5. [State Management](#state-management)
6. [Handler Functions](#handler-functions)
7. [Backend Mutations](#backend-mutations)
8. [Visibility Logic](#visibility-logic)
9. [State Flow Diagram](#state-flow-diagram)
10. [AI Tool Trigger](#ai-tool-trigger)
11. [Guards dan Validasi](#guards-dan-validasi)
12. [Styling](#styling)
13. [Rujukan File](#rujukan-file)

---

## Ikhtisar

PaperValidationPanel adalah komponen UI yang muncul saat status tahap berubah ke `pending_validation` (dipicu oleh AI lewat `submitStageForValidation`). Panel ini berfungsi sebagai **Human-in-the-Loop (HITL)** checkpoint, memastikan user punya kontrol penuh atas transisi tahap.

**Fitur Utama:**
- **Approval button** untuk menyetujui draf dan lanjut ke tahap berikutnya
- **Revisi button** untuk meminta AI merevisi dengan feedback spesifik
- **Feedback form** untuk mengirim detail revisi ke AI
- **Loading states** untuk UX yang responsif
- **Toast notifications** untuk feedback instan ke user

---

## Tampilan Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Validasi Tahap: Penentuan Topik                                           │
│  Periksa draft di artifact. Apakah sudah   [ Revisi ] [ Approve & Lanjut ] │
│  sesuai atau perlu revisi?                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Elemen UI:**
- **Title**: "Validasi Tahap: {stageLabel}" (dinamis berdasarkan tahap)
- **Description**: "Periksa draft di artifact. Apakah sudah sesuai atau perlu revisi?"
- **Tombol Revisi**: Outline merah, icon Edit3, trigger revision form
- **Tombol Approve & Lanjut**: Solid hijau, icon Check, approve langsung

**Saat Revision Form Aktif:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Validasi Tahap: Penentuan Topik                                       [X] │
│  Periksa draft di artifact. Apakah sudah sesuai atau perlu revisi?         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Kasih tau AI yang mana yang kudu diganti...                         │   │
│  │                                                                     │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                              [ Kirim Feedback ]                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Komponen React

### File: `src/components/paper/PaperValidationPanel.tsx`

```typescript
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Check, Edit3, Send, X } from "lucide-react";
import { toast } from "sonner";

export const PaperValidationPanel: React.FC<PaperValidationPanelProps> = ({
    stageLabel,
    onApprove,
    onRevise,
    isLoading = false,
}) => {
    // ... implementation
};
```

**Dependencies:**
- `@/components/ui/button` - Button component (shadcn/ui)
- `@/components/ui/textarea` - Textarea component (shadcn/ui)
- `@/components/ui/card` - Card container (shadcn/ui)
- `lucide-react` - Icons (Check, Edit3, Send, X)
- `sonner` - Toast notifications

---

## Props dan Interface

### PaperValidationPanelProps (Line 10-15)

```typescript
interface PaperValidationPanelProps {
    stageLabel: string;                           // Nama tahap (e.g., "Penentuan Topik")
    onApprove: () => Promise<void>;               // Handler saat Approve diklik
    onRevise: (feedback: string) => Promise<void>; // Handler saat Revisi + feedback dikirim
    isLoading?: boolean;                          // Optional loading state dari parent
}
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `stageLabel` | `string` | Yes | Label tahap dari `getStageLabel()` |
| `onApprove` | `() => Promise<void>` | Yes | Async handler untuk approval |
| `onRevise` | `(feedback: string) => Promise<void>` | Yes | Async handler untuk revision dengan feedback |
| `isLoading` | `boolean` | No | Disable buttons saat loading (default: `false`) |

---

## State Management

### Internal State (Line 23-25)

```typescript
const [showRevisionForm, setShowRevisionForm] = useState(false);  // Toggle revision form
const [feedback, setFeedback] = useState("");                      // Feedback text
const [isSubmitting, setIsSubmitting] = useState(false);          // Submission loading
```

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `showRevisionForm` | `boolean` | `false` | Toggle visibility revision form |
| `feedback` | `string` | `""` | User feedback untuk revisi |
| `isSubmitting` | `boolean` | `false` | Loading state saat submit |

### Parent State (via usePaperSession Hook)

```typescript
// Di ChatWindow.tsx, line 41-51
const {
    isPaperMode,           // boolean - ada paper session aktif?
    currentStage,          // stage aktif (PaperStageId | "completed")
    stageStatus,           // "drafting" | "pending_validation" | "revision" | "approved"
    stageLabel,            // string - label tahap untuk display
    stageData,             // data stage (untuk context + permission)
    approveStage,          // async function - mutation wrapper
    requestRevision,       // async function - mutation wrapper
    markStageAsDirty,      // sync flag edit/regenerate
    getStageStartIndex,    // helper index untuk permission edit
} = usePaperSession(conversationId as Id<"conversations">);
```

### Loading State dari useChat (bukan dari hook)

```typescript
// Di ChatWindow.tsx
const { status } = useChat({ /* ... */ })
const isLoading = status !== "ready" && status !== "error"
```

---

## Handler Functions

### handleApprove() (Line 27-37)

```typescript
const handleApprove = async () => {
    setIsSubmitting(true);
    try {
        await onApprove();
        toast.success(`Mantap! Tahap "${stageLabel}" disetujui. Lanjut ke tahap berikutnya.`);
    } catch {
        toast.error("Gagal nyetujui tahap ini. Coba lagi, ya.");
    } finally {
        setIsSubmitting(false);
    }
};
```

**Flow:**
1. Set `isSubmitting = true`
2. Call `onApprove()` prop (dari ChatWindow)
3. Toast success atau error
4. Reset `isSubmitting = false`

### handleRevise() (Line 39-55)

```typescript
const handleRevise = async () => {
    if (!feedback.trim()) {
        toast.error("Isi feedback dulu biar AI tau apa yang harus diperbaiki.");
        return;
    }
    setIsSubmitting(true);
    try {
        await onRevise(feedback);
        toast.success("Feedback lo udah dikirim. AI bakal segera revisi.");
        setShowRevisionForm(false);
        setFeedback("");
    } catch {
        toast.error("Gagal ngirim feedback. Coba lagi.");
    } finally {
        setIsSubmitting(false);
    }
};
```

**Flow:**
1. Validate feedback tidak kosong
2. Set `isSubmitting = true`
3. Call `onRevise(feedback)` prop (dari ChatWindow)
4. Toast success, reset form & feedback
5. Reset `isSubmitting = false`

### Parent Handlers di ChatWindow.tsx

**handleApprove (Line 316-326):**
```typescript
const handleApprove = async () => {
    if (!userId) return;
    try {
        await approveStage(userId);
        // Auto-send message agar AI aware dan bisa lanjutkan ke tahap berikutnya
        sendMessage({ text: `[Approved: ${stageLabel}] Lanjut ke tahap berikutnya.` });
    } catch (error) {
        console.error("Failed to approve stage:", error);
        toast.error("Gagal menyetujui tahap.");
    }
};
```

**Catatan:** Setelah approval berhasil, sistem otomatis mengirim message ke AI agar conversation tetap interaktif. AI akan menerima notifikasi approval dan bisa langsung merespons untuk melanjutkan ke tahap berikutnya.

**handleRevise (Line 328-339):**
```typescript
const handleRevise = async (feedback: string) => {
    if (!userId) return;
    try {
        await requestRevision(userId, feedback);
        // Send feedback as user message so AI can see it
        sendMessage({ text: `[Revisi untuk ${stageLabel}]\n\n${feedback}` });
        toast.info("Feedback revisi telah dikirim ke AI.");
    } catch (error) {
        console.error("Failed to request revision:", error);
        toast.error("Gagal mengirim feedback revisi.");
    }
};
```

---

## Backend Mutations

### submitForValidation (Line 427-460)

**Trigger:** AI panggil tool `submitStageForValidation`

```typescript
export const submitForValidation = mutation({
    args: { sessionId: v.id("paperSessions") },
    handler: async (ctx, args) => {
        // Guard: Ringkasan wajib ada
        if (!ringkasan || ringkasan.trim() === "") {
            throw new Error("submitForValidation gagal: Ringkasan wajib diisi...");
        }

        // Set status
        await ctx.db.patch(args.sessionId, {
            stageStatus: "pending_validation",
            updatedAt: Date.now(),
        });

        return { success: true, stage: currentStage };
    },
});
```

### approveStage (Line 465-587)

**Trigger:** User klik "Approve & Lanjut"

```typescript
export const approveStage = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Guards:
        // 1. Verify user ownership
        // 2. Verify stageStatus === "pending_validation"
        // 3. Verify ringkasan exists
        // 4. Optional: Budget enforcement

        // Actions:
        // 1. Mark stage validatedAt
        // 2. Add to paperMemoryDigest
        // 3. Advance currentStage → nextStage
        // 4. Set stageStatus → "drafting" (atau "approved" jika completed)
        // 5. Reset isDirty flag

        return { previousStage, nextStage, isCompleted };
    },
});
```

### requestRevision (Line 592-629)

**Trigger:** User klik "Revisi" + submit feedback

```typescript
export const requestRevision = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        feedback: v.string(),
    },
    handler: async (ctx, args) => {
        // Guards:
        // 1. Verify user ownership

        // Actions:
        // 1. Increment revisionCount
        // 2. Set stageStatus → "revision"

        return { stage, revisionCount };
    },
});
```

---

## Visibility Logic

### Kondisi Panel Tampil (ChatWindow.tsx:479-495 - Virtuoso Footer)

```typescript
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

| Condition | Description |
|-----------|-------------|
| `isPaperMode` | Ada paper session aktif untuk conversation ini |
| `stageStatus === "pending_validation"` | AI sudah submit draf, menunggu validasi user |
| `userId` | User sudah login (authenticated) |
| `status !== 'streaming'` | AI tidak sedang mengetik (streaming response) |

**Panel TIDAK tampil jika:**
- Tidak ada paper session (`isPaperMode = false`)
- Stage sedang drafting (`stageStatus = "drafting"`)
- Stage sedang revision (`stageStatus = "revision"`)
- User belum login (`userId = undefined`)
- AI sedang streaming response (`status === 'streaming'`)

---

## State Flow Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         STAGE STATUS TRANSITIONS                           │
└───────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │  drafting   │ ← AI aktif menyusun draf
                              └──────┬──────┘
                                     │
                     AI calls submitStageForValidation
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │  pending_validation    │ ← PANEL TAMPIL DI SINI
                        └───────────┬────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            User: [Approve]                 User: [Revise]
                    │                               │
                    ▼                               ▼
          ┌─────────────────┐           ┌─────────────────┐
          │    drafting     │           │    revision     │
          │  (next stage)   │           │ (same stage)    │
          └─────────────────┘           └────────┬────────┘
                    │                            │
                    │                    AI menerima feedback
          Auto-send message:             AI revisi + updateStageData
          "[Approved: ...]"                      │
                    │            AI calls submitStageForValidation
                    │                            │
                    ▼                            ▼
          AI receives msg &         ┌────────────────────────┐
          responds to continue      │  pending_validation    │ ← PANEL TAMPIL LAGI
          next stage                └────────────────────────┘
                    │                            │
                    └────────────────────────────┘
                              (loop sampai approve)
```

### StageStatus Type

```typescript
// convex/paperSessions/types.ts:6
export type StageStatus = "drafting" | "pending_validation" | "approved" | "revision";
```

| Status | Description | Panel Visible |
|--------|-------------|---------------|
| `drafting` | AI sedang menyusun/merevisi draf | No |
| `pending_validation` | Draf siap, menunggu validasi user | **Yes** |
| `revision` | User minta revisi; stageStatus tetap `revision` sampai AI submit lagi | No |
| `approved` | Workflow selesai (hanya di tahap judul) | No |

---

## AI Tool Trigger

### submitStageForValidation Tool (paper-tools.ts:155-181)

```typescript
submitStageForValidation: tool({
    description: "Kirim draf tahap saat ini ke user untuk divalidasi. " +
                 "Ini akan memunculkan panel persetujuan di UI user. " +
                 "AI akan berhenti ngetik setelah ini.",
    inputSchema: z.object({}),  // Tidak butuh parameter
    execute: async () => {
        try {
            const session = await fetchQuery(api.paperSessions.getByConversation, {
                conversationId: context.conversationId
            });
            if (!session) return { success: false, error: "Sesi paper tidak ditemukan." };

            await fetchMutation(api.paperSessions.submitForValidation, {
                sessionId: session._id,
            });

            return {
                success: true,
                message: "Draf telah dikirim ke user. Menunggu validasi (Approve/Revise) dari user sebelum bisa lanjut ke tahap berikutnya."
            };
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : "Gagal mengirim sinyal validasi.";
            return { success: false, error: errorMessage };
        }
    },
}),
```

**Kapan AI panggil tool ini:**
1. Setelah AI selesai menulis draf tahap
2. Setelah AI panggil `updateStageData` dengan `ringkasan`
3. Saat AI merasa draf sudah siap untuk validasi user

### Force submit saat konfirmasi (server-side)

Untuk mencegah kasus AI hanya menulis teks konfirmasi tanpa memanggil tool, server memaksa submit jika syarat terpenuhi.

**Lokasi:** `src/app/api/chat/route.ts`

**Kondisi force submit:**
- Paper mode aktif
- User mengirim konfirmasi
- `stageStatus === "drafting"`
- `ringkasan` untuk stage aktif sudah ada
- Web search tidak aktif

Jika semua terpenuhi, server mengatur:
```
toolChoice: { type: "tool", toolName: "submitStageForValidation" }
```
Hasilnya `stageStatus` berubah ke `pending_validation` dan panel muncul deterministik.

---

## Guards dan Validasi

### Backend Guards

| Guard | Location | Error Message |
|-------|----------|---------------|
| Session not found (submit) | `submitForValidation:431` | "Session not found" |
| Ringkasan required (submit) | `submitForValidation:442-447` | "submitForValidation gagal: Ringkasan wajib diisi..." |
| Session not found (approve) | `approveStage:472` | "Session not found" |
| Ownership check (approve) | `approveStage:473` | "Unauthorized" |
| Status check | `approveStage:474-476` | "Stage is not pending validation" |
| Unknown current stage | `approveStage:478-480` | "Unknown current stage: ..." |
| Ringkasan required (approve) | `approveStage:489-493` | "approveStage gagal: Ringkasan wajib diisi..." |
| Budget enforcement | `approveStage:522-528` | "approveStage gagal: Konten melebihi budget outline..." |
| Session not found (revision) | `requestRevision:600` | "Session not found" |
| Ownership check (revision) | `requestRevision:601` | "Unauthorized" |
| Unknown current stage (revision) | `requestRevision:605-607` | "Unknown current stage: ..." |

### Frontend Guards

| Guard | Location | Behavior |
|-------|----------|----------|
| Empty feedback | `handleRevise:40-43` | Toast error, return early |
| Button disabled (approve/revisi) | JSX | `disabled={isSubmitting \|\| isLoading}` |
| Button disabled (submit feedback) | JSX | `disabled={isSubmitting \|\| !feedback.trim()}` |

---

## Styling

### Card Container (Line 58)

```tsx
<Card className="m-4 p-4 max-w-[80%] mx-auto bg-card border border-border shadow-none
                animate-in fade-in slide-in-from-bottom-4 duration-500">
```

- `max-w-[80%] mx-auto` - Responsive width, centered (menyesuaikan message bubble)
- `bg-card` - Solid background (non-transparan)
- `border border-border` - Border solid yang jelas
- `shadow-none` - Tanpa shadow untuk tampilan bersih
- `animate-in fade-in slide-in-from-bottom-4` - Entry animation (dipertahankan)

### Tombol Revisi (Line 68-76)

```tsx
<Button
    variant="outline"
    size="sm"
    className="gap-2 border-red-500/50 text-red-500 hover:bg-red-500/10"
>
    <Edit3 size={14} /> Revisi
</Button>
```

### Tombol Approve (Line 77-84)

```tsx
<Button
    size="sm"
    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
>
    <Check size={14} /> Approve & Lanjut
</Button>
```

### Revision Form Animation (Line 101)

```tsx
<div className="flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
```

---

## Rujukan File

Untuk daftar file lengkap dengan line numbers, lihat:
- `.references/paper-validation-panel/files-index.md`

Dokumentasi terkait paper workflow:
- `.references/paper-workflow/README.md`
- `.references/paper-workflow/files-index.md`
- `.references/paper-workflow-hitl-ringkasan/README.md`

---

*Last updated: 2026-01-14*
