# Full-Page Constitution Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the cramped dialog for creating/editing constitutions with dedicated full-page routes that give the editor maximum space.

**Architecture:** Two new Next.js routes (`/dashboard/constitution/new` and `/dashboard/constitution/[id]/edit`) share a `ConstitutionEditor` component. The existing `StyleConstitutionManager` replaces dialog opens with `router.push()` calls. Existing Convex mutations (`create`, `update`) are unchanged.

**Tech Stack:** TypeScript, Next.js 16 (App Router), React 19, Convex, Tailwind CSS 4, shadcn/ui

---

### Task 1: Create the shared ConstitutionEditor component

**Files:**
- Create: `src/components/admin/ConstitutionEditor.tsx`

**Step 1: Create the ConstitutionEditor component**

This component handles both create and edit modes. It receives an optional `constitution` prop (edit mode) or none (create mode).

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NavArrowLeft } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"

interface ConstitutionData {
  _id: Id<"styleConstitutions">
  name: string
  content: string
  description?: string
  version: number
}

interface ConstitutionEditorProps {
  userId: Id<"users">
  constitution?: ConstitutionData
}

export function ConstitutionEditor({ userId, constitution }: ConstitutionEditorProps) {
  const router = useRouter()
  const isEditing = !!constitution

  const [formName, setFormName] = useState(constitution?.name ?? "")
  const [formContent, setFormContent] = useState(constitution?.content ?? "")
  const [formDescription, setFormDescription] = useState(constitution?.description ?? "")
  const [isLoading, setIsLoading] = useState(false)

  const createMutation = useMutation(api.styleConstitutions.create)
  const updateMutation = useMutation(api.styleConstitutions.update)

  const hasChanges = isEditing
    ? formContent !== constitution.content || formDescription !== (constitution.description ?? "")
    : formName.trim() !== "" && formContent.trim() !== ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formContent.trim()) {
      toast.error("Konten constitution tidak boleh kosong")
      return
    }
    if (!isEditing && !formName.trim()) {
      toast.error("Nama constitution tidak boleh kosong")
      return
    }

    setIsLoading(true)
    try {
      if (isEditing) {
        const result = await updateMutation({
          requestorUserId: userId,
          constitutionId: constitution._id,
          content: formContent.trim(),
          description: formDescription.trim() || undefined,
        })
        toast.success(result.message)
      } else {
        const result = await createMutation({
          requestorUserId: userId,
          name: formName.trim(),
          content: formContent.trim(),
          description: formDescription.trim() || undefined,
        })
        toast.success(result.message)
      }
      router.push("/dashboard?tab=refrasa")
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/dashboard?tab=refrasa")
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--section-bg-alt)]">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="focus-ring inline-flex items-center gap-1.5 rounded-action px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <NavArrowLeft className="h-4 w-4" />
            <span className="text-interface text-xs">Kembali ke Refrasa</span>
          </button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={isLoading}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="constitution-form"
              size="sm"
              disabled={!hasChanges || isLoading}
              className="text-xs"
            >
              {isLoading
                ? "Menyimpan..."
                : isEditing
                  ? `Simpan (Buat v${constitution.version + 1})`
                  : "Buat Constitution"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">
        <h1 className="text-interface mb-1 text-lg font-semibold text-foreground">
          {isEditing
            ? `Edit: ${constitution.name} (v${constitution.version})`
            : "Buat Constitution Baru"}
        </h1>
        <p className="text-narrative mb-6 text-xs text-muted-foreground">
          {isEditing
            ? "Perubahan akan membuat versi baru. Versi sebelumnya tetap tersimpan di riwayat."
            : "Constitution baru akan tidak aktif secara default."}
        </p>

        <form id="constitution-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Metadata row: side-by-side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nama Constitution *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Makalah Style Constitution"
                disabled={isLoading || isEditing}
                className={isEditing ? "bg-muted text-muted-foreground" : ""}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Deskripsi singkat tentang constitution ini"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Editor area — fills remaining viewport */}
          <div className="space-y-2">
            <Label htmlFor="content">Konten Constitution *</Label>
            <Textarea
              id="content"
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Tulis style constitution di sini (mendukung Markdown)..."
              className="h-[calc(100vh-340px)] min-h-[50vh] resize-y font-mono text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Gunakan format Markdown. Constitution berisi aturan gaya penulisan untuk Refrasa.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Key design decisions:
- `h-[calc(100vh-340px)]` for the textarea: 340px accounts for top bar (~56px) + heading/description (~60px) + metadata row (~80px) + label/helper (~48px) + padding (~96px). `min-h-[50vh]` ensures usability on very small viewports.
- `resize-y` allows user to manually resize the textarea taller if needed.
- `form` and `submit` are connected via `id="constitution-form"` so the submit button in the sticky top bar works.
- `router.push("/dashboard?tab=refrasa")` navigates back — requires Task 3 to honor the `tab` query param.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Zero errors (component is created but not yet used).

**Step 3: Commit**

```bash
git add src/components/admin/ConstitutionEditor.tsx
git commit -m "feat(admin): add full-page ConstitutionEditor component"
```

---

### Task 2: Create the route pages

**Files:**
- Create: `src/app/(dashboard)/dashboard/constitution/new/page.tsx`
- Create: `src/app/(dashboard)/dashboard/constitution/[id]/edit/page.tsx`

**Step 1: Create the "new" route page**

```tsx
"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ConstitutionEditor } from "@/components/admin/ConstitutionEditor"

export default function NewConstitutionPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-mono">Memuat...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user.role === "admin" || user.role === "superadmin"
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Akses ditolak.</p>
      </div>
    )
  }

  return <ConstitutionEditor userId={user._id} />
}
```

**Step 2: Create the "edit" route page**

```tsx
"use client"

import { use } from "react"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { ConstitutionEditor } from "@/components/admin/ConstitutionEditor"

export default function EditConstitutionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { user, isLoading: userLoading } = useCurrentUser()

  const isAdmin = user?.role === "admin" || user?.role === "superadmin"

  const constitution = useQuery(
    api.styleConstitutions.getById,
    user && isAdmin
      ? {
          constitutionId: id as Id<"styleConstitutions">,
          requestorUserId: user._id,
        }
      : "skip"
  )

  if (userLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-mono">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Akses ditolak.</p>
      </div>
    )
  }

  if (constitution === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-mono">Memuat constitution...</p>
        </div>
      </div>
    )
  }

  if (constitution === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Constitution tidak ditemukan.</p>
      </div>
    )
  }

  return <ConstitutionEditor userId={user._id} constitution={constitution} />
}
```

Notes:
- Next.js 16: `params` is `Promise<{...}>`, must use `use()` to unwrap.
- Routes are already protected by `proxy.ts` (any `/dashboard/*` path requires `ba_session` cookie).
- Admin role check is done at component level (same pattern as `waitlist/page.tsx`).
- `getById` returns `null` for not-found (Convex throws, but we cast the ID).

**Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Zero errors.

**Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/constitution/new/page.tsx src/app/(dashboard)/dashboard/constitution/\[id\]/edit/page.tsx
git commit -m "feat(admin): add constitution editor route pages (new + edit)"
```

---

### Task 3: Update StyleConstitutionManager to use router navigation

**Files:**
- Modify: `src/components/admin/StyleConstitutionManager.tsx`

**Step 1: Replace dialog with router.push()**

Add `useRouter` import at top:
```tsx
import { useRouter } from "next/navigation"
```

Add router inside the component (after the `useQuery` calls, around line 86):
```tsx
const router = useRouter()
```

**Step 2: Replace "Buat Constitution Baru" button handler**

Change both create buttons (line 460 and line 483) from:
```tsx
onClick={() => setIsCreateDialogOpen(true)}
```
To:
```tsx
onClick={() => router.push("/dashboard/constitution/new")}
```

**Step 3: Replace edit button handler**

Change the edit button (line 306) from:
```tsx
onClick={() => setEditingConstitution(constitution)}
```
To:
```tsx
onClick={() => router.push(`/dashboard/constitution/${constitution._id}/edit`)}
```

**Step 4: Delete the Dialog and all form-related code**

Delete these state variables and their uses:
- `isCreateDialogOpen`, `setIsCreateDialogOpen` (line 87)
- `editingConstitution`, `setEditingConstitution` (line 88)
- `formName`, `setFormName` (line 97)
- `formContent`, `setFormContent` (line 98)
- `formDescription`, `setFormDescription` (line 99)
- `createMutation` (line 104)
- `updateMutation` (line 105)
- `isEditing` (line 264)
- `hasChanges` (line 265-267)
- The entire `useEffect` for form reset (lines 112-124)
- `handleFormSubmit` function (lines 213-255)
- `handleCloseFormDialog` function (lines 257-262)

Delete the entire `{/* Create/Edit Dialog */}` block (lines 625-704).

Delete now-unused imports:
- `Dialog`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle` (lines 19-25)
- `useEffect` (line 3, if not used elsewhere)
- `Input` (line 26)
- `Label` (line 27)
- `Textarea` (line 28)
- `Button` (line 7, if not used elsewhere — check)

Keep `Button` if it's still used. Check remaining usages: the component uses `<button>` elements, not `<Button>`. Remove `Button` import if unused.

**Step 5: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Zero errors.

**Step 6: Commit**

```bash
git add src/components/admin/StyleConstitutionManager.tsx
git commit -m "refactor(admin): replace constitution dialog with route navigation"
```

---

### Task 4: Support `?tab=refrasa` query param in admin panel

**Files:**
- Modify: `src/components/admin/AdminPanelContainer.tsx`

The `ConstitutionEditor` navigates back to `/dashboard?tab=refrasa`. The `AdminPanelContainer` needs to read this query param to set the initial active tab.

**Step 1: Read query param for initial tab**

Add import:
```tsx
import { useSearchParams } from "next/navigation"
```

Replace the `useState` for `activeTab` (line 22):
```tsx
const searchParams = useSearchParams()
const initialTab = (searchParams.get("tab") as AdminTabId) || "overview"
const [activeTab, setActiveTab] = useState<AdminTabId>(initialTab)
```

This ensures that navigating to `/dashboard?tab=refrasa` opens the Refrasa tab directly.

**Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Zero errors.

**Step 3: Commit**

```bash
git add src/components/admin/AdminPanelContainer.tsx
git commit -m "feat(admin): support ?tab= query param for direct tab navigation"
```

---

### Task 5: Final verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: Zero errors.

**Step 2: Lint check**

Run: `npm run lint 2>&1 | tail -20`
Expected: No new errors from our changes.

**Step 3: Run tests**

Run: `npm run test 2>&1 | tail -20`
Expected: No new test failures.
