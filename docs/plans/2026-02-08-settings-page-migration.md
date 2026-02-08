# Settings Page Migration: Modal → Full Page

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Konversi UserSettingsModal dari overlay modal ke dedicated full-page di `/settings`, menggunakan desain dan styling yang sama dengan halaman `/sign-in` (AuthWideCard two-column pattern).

**Architecture:** Buat route group `(account)` baru dengan layout auth-like (centered, grid pattern, tanpa GlobalHeader/Footer). Settings page menggunakan two-column card layout: kolom kiri = branding + navigation + back link, kolom kanan = konten tab aktif. Komponen tab existing (ProfileTab, SecurityTab, StatusTab) diadaptasi untuk konteks page (hapus props modal-specific). Consumer (GlobalHeader, UserDropdown) beralih dari state-driven modal ke `<Link href="/settings">`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Clerk, Convex

**Reference Files:**
- Auth layout: `src/app/(auth)/layout.tsx`
- AuthWideCard: `src/components/auth/AuthWideCard.tsx`
- Sign-in page: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Dashboard layout: `src/app/(dashboard)/layout.tsx` (for ensureConvexUser pattern)
- Current tab components: `src/components/settings/ProfileTab.tsx`, `SecurityTab.tsx`, `StatusTab.tsx`
- Consumers: `src/components/layout/header/GlobalHeader.tsx`, `UserDropdown.tsx`

---

### Task 1: Create `(account)` route group layout

**Files:**
- Create: `src/app/(account)/layout.tsx`

**Konteks:** Layout ini meniru visual `src/app/(auth)/layout.tsx` (full viewport, centered, grid pattern) tapi dengan server-side auth check dan `ensureConvexUser()` dari `src/app/(dashboard)/layout.tsx`. Tidak ada GlobalHeader/Footer — ini pengalaman full-page seperti sign-in.

**Step 1: Create layout file**

```tsx
// src/app/(account)/layout.tsx
import type { ReactNode } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

/**
 * Sync Clerk user ke Convex database (same pattern as dashboard layout).
 * Timeout 5 detik, idempotent — gagal tidak block user.
 */
async function ensureConvexUser() {
  try {
    const { userId: clerkUserId, getToken } = await auth()
    if (!clerkUserId) return

    let convexToken: string | null = null
    try {
      convexToken = await getToken({ template: "convex" })
    } catch {
      return
    }
    if (!convexToken) return

    const user = await currentUser()
    if (!user) return

    const primaryEmailAddress =
      user.primaryEmailAddress ?? user.emailAddresses[0]
    const primaryEmail = primaryEmailAddress?.emailAddress
    if (!primaryEmail) return

    const emailVerified =
      primaryEmailAddress?.verification?.status === "verified"
    const firstName = user.firstName ?? undefined
    const lastName = user.lastName ?? undefined

    const syncPromise = fetchMutation(api.users.createUser, {
      clerkUserId: user.id,
      email: primaryEmail,
      firstName,
      lastName,
      emailVerified,
    }, { token: convexToken })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Convex sync timeout (5s)")), 5000)
    )

    await Promise.race([syncPromise, timeoutPromise])
  } catch (error) {
    console.error("[ensureConvexUser] Sync failed:", error)
  }
}

export default async function AccountLayout({
  children,
}: {
  children: ReactNode
}) {
  await ensureConvexUser()

  return (
    <div className="min-h-dvh relative bg-background text-foreground flex items-center justify-center p-4 md:p-6">
      {/* Industrial Grid Pattern — same as auth layout */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-[1]"
        style={{
          backgroundImage: `
            linear-gradient(var(--border-hairline) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-hairline) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
        aria-hidden="true"
      />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-5xl flex justify-center">
        {children}
      </div>
    </div>
  )
}
```

**Step 2: Verify structure**

Run: `ls src/app/(account)/layout.tsx`
Expected: file exists

**Step 3: Type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

**Step 4: Commit**

```bash
git add src/app/\(account\)/layout.tsx
git commit -m "feat(settings): create (account) route group layout with auth-like visual"
```

---

### Task 2: Create settings page with two-column card layout

**Files:**
- Create: `src/app/(account)/settings/page.tsx`

**Konteks:** Page ini menggunakan two-column card layout yang terinspirasi dari `src/components/auth/AuthWideCard.tsx`. Kolom kiri (4/12): logo, heading "Atur Akun", subtitle, navigation tabs (Profile/Keamanan/Status), dan link "Kembali". Kolom kanan (8/12): konten tab aktif via ProfileTab/SecurityTab/StatusTab. Mendukung deep-linking via query param `?tab=security`.

**Visual reference — kolom kiri:**
```
┌─────────────────┐
│ [Logo]           │  ← top (link ke /)
│                  │
│ Atur Akun        │  ← heading (text-signal)
│ Kelola akun...   │  ← subtitle (text-narrative)
│                  │
│ ● Profil         │  ← nav items dengan active-nav indicator
│ ○ Keamanan       │
│ ○ Status Akun    │
│                  │
│                  │  ← spacer (flex-grow)
│ ← Kembali        │  ← bottom (link back)
└─────────────────┘
```

**Tokens yang dipakai (dari justification doc):**
- Card outer: `rounded-lg border border-border bg-card` (konsisten dengan AuthWideCard)
- Left column: `bg-muted/30` + diagonal stripes (sama dengan AuthWideCard left)
- Right column: `bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-800)]` (sama dengan AuthWideCard right)
- Nav item: `relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-interface text-sm` + active-nav indicator
- Active indicator: `absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary`

**Step 1: Create page file**

```tsx
// src/app/(account)/settings/page.tsx
"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  BadgeCheck,
  NavArrowLeft,
  Shield,
  User as UserIcon,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ProfileTab } from "@/components/settings/ProfileTab"
import { SecurityTab } from "@/components/settings/SecurityTab"
import { StatusTab } from "@/components/settings/StatusTab"

type SettingsTab = "profile" | "security" | "status"

const VALID_TABS: SettingsTab[] = ["profile", "security", "status"]

function parseTabParam(param: string | null): SettingsTab {
  if (param && VALID_TABS.includes(param as SettingsTab)) {
    return param as SettingsTab
  }
  return "profile"
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    () => parseTabParam(searchParams.get("tab"))
  )

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? ""

  return (
    <div className="w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-lg border border-border bg-card shadow-none relative">
      {/* Left Column: Branding & Navigation */}
      <div className="md:w-4/12 bg-muted/30 p-6 md:p-8 relative flex flex-col">
        {/* Diagonal Stripes — same as AuthWideCard */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)'
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col flex-grow">
          {/* Logo — top */}
          <Link href="/" className="inline-flex items-center gap-2 group w-fit">
            <Image
              src="/logo/makalah_logo_light.svg"
              alt=""
              width={28}
              height={28}
              className="transition-transform group-hover:scale-105 brightness-[.88] sepia-[.06] hue-rotate-[185deg] saturate-[3]"
            />
          </Link>

          {/* Heading + Subtitle */}
          <div className="mt-6 md:mt-8">
            <h1 className="text-signal text-lg">Atur Akun</h1>
            <p className="mt-1 text-sm font-mono text-muted-foreground">
              Kelola informasi akun Anda.
            </p>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex flex-col gap-1 max-md:flex-row max-md:flex-wrap" aria-label="Navigasi akun">
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "profile" && "bg-accent text-foreground"
              )}
              onClick={() => setActiveTab("profile")}
              type="button"
            >
              {activeTab === "profile" && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />}
              <UserIcon className="h-4 w-4" />
              <span>Profil</span>
            </button>
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "security" && "bg-accent text-foreground"
              )}
              onClick={() => setActiveTab("security")}
              type="button"
            >
              {activeTab === "security" && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />}
              <Shield className="h-4 w-4" />
              <span>Keamanan</span>
            </button>
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "status" && "bg-accent text-foreground"
              )}
              onClick={() => setActiveTab("status")}
              type="button"
            >
              {activeTab === "status" && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />}
              <BadgeCheck className="h-4 w-4" />
              <span>Status Akun</span>
            </button>
          </nav>

          {/* Spacer */}
          <div className="flex-grow" />

          {/* Back link — bottom */}
          <Link
            href="/chat"
            className="mt-6 inline-flex items-center gap-2 text-sm font-mono text-muted-foreground transition-colors hover:text-foreground w-fit"
          >
            <NavArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </Link>
        </div>
      </div>

      {/* Right Column: Tab Content */}
      <div className="md:w-8/12 p-6 md:p-8 flex flex-col bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-800)] relative overflow-y-auto max-h-[70vh] md:max-h-[80vh]">
        <div className="w-full relative z-10">
          <div className={cn(activeTab === "profile" ? "block" : "hidden")}>
            <ProfileTab user={user} isLoaded={isLoaded} />
          </div>

          <div className={cn(activeTab === "security" ? "block" : "hidden")}>
            <SecurityTab user={user} isLoaded={isLoaded} />
          </div>

          <div className={cn(activeTab === "status" ? "block" : "hidden")}>
            <StatusTab
              primaryEmail={primaryEmail}
              convexUser={convexUser}
              isConvexLoading={isConvexLoading}
            />
          </div>

          {!isLoaded && (
            <div className="text-interface text-sm text-muted-foreground">Memuat...</div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: errors terkait props yang belum diupdate (Task 3 akan fix ini)

**Step 3: Commit (setelah Task 3 selesai)**

Commit digabung dengan Task 3.

---

### Task 3: Adapt tab components for page context

**Files:**
- Modify: `src/components/settings/ProfileTab.tsx`
- Modify: `src/components/settings/SecurityTab.tsx`
- Modify: `src/components/settings/StatusTab.tsx`

**Konteks:** Tab components saat ini punya props modal-specific (`open` untuk reset state, `onCloseModal` untuk close modal saat navigate). Di page context: state auto-reset karena page mount fresh saat navigasi, dan `onCloseModal` tidak diperlukan karena Link navigation bekerja langsung.

**Step 1: Update ProfileTab — remove `open` prop and reset effect**

Di `src/components/settings/ProfileTab.tsx`:

1. Hapus `open` dari interface dan props:
```tsx
// BEFORE:
interface ProfileTabProps {
  user: UserResource | null | undefined
  isLoaded: boolean
  open: boolean
}
export function ProfileTab({ user, isLoaded, open }: ProfileTabProps) {

// AFTER:
interface ProfileTabProps {
  user: UserResource | null | undefined
  isLoaded: boolean
}
export function ProfileTab({ user, isLoaded }: ProfileTabProps) {
```

2. Hapus useEffect reset yang bergantung pada `open`:
```tsx
// DELETE this entire block:
useEffect(() => {
  if (!open || !user) return
  setIsEditing(false)
  setFirstName(user.firstName ?? "")
  setLastName(user.lastName ?? "")
  setProfileImage(null)
}, [open, user])
```

3. Ganti dengan useEffect yang sync firstName/lastName dari user data (untuk initial values):
```tsx
useEffect(() => {
  if (!user) return
  setFirstName(user.firstName ?? "")
  setLastName(user.lastName ?? "")
}, [user])
```

**Step 2: Update SecurityTab — remove `open` prop and reset effect**

Di `src/components/settings/SecurityTab.tsx`:

1. Hapus `open` dari interface dan props:
```tsx
// BEFORE:
interface SecurityTabProps {
  user: UserResource | null | undefined
  isLoaded: boolean
  open: boolean
}
export function SecurityTab({ user, isLoaded, open }: SecurityTabProps) {

// AFTER:
interface SecurityTabProps {
  user: UserResource | null | undefined
  isLoaded: boolean
}
export function SecurityTab({ user, isLoaded }: SecurityTabProps) {
```

2. Hapus useEffect reset yang bergantung pada `open`:
```tsx
// DELETE this entire block:
useEffect(() => {
  if (!open) return
  setIsEditing(false)
  setCurrentPassword("")
  setNewPassword("")
  setConfirmPassword("")
  setSignOutOthers(true)
  setShowCurrentPassword(false)
  setShowNewPassword(false)
  setShowConfirmPassword(false)
}, [open])
```

Tidak perlu replacement — useState defaults sudah benar untuk page mount.

**Step 3: Update StatusTab — remove `onCloseModal` prop**

Di `src/components/settings/StatusTab.tsx`:

1. Hapus `onCloseModal` dari interface dan props:
```tsx
// BEFORE:
interface StatusTabProps {
  primaryEmail: string
  convexUser: { role: string; subscriptionStatus?: string } | null | undefined
  isConvexLoading: boolean
  onCloseModal: () => void
}
export function StatusTab({ primaryEmail, convexUser, isConvexLoading, onCloseModal }: StatusTabProps) {

// AFTER:
interface StatusTabProps {
  primaryEmail: string
  convexUser: { role: string; subscriptionStatus?: string } | null | undefined
  isConvexLoading: boolean
}
export function StatusTab({ primaryEmail, convexUser, isConvexLoading }: StatusTabProps) {
```

2. Hapus `onClick={onCloseModal}` dari Upgrade link:
```tsx
// BEFORE:
<Link
  href="/subscription/upgrade"
  onClick={onCloseModal}
  className="..."
>

// AFTER:
<Link
  href="/subscription/upgrade"
  className="..."
>
```

**Step 4: Type check + Lint**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

Run: `npx eslint src/components/settings/ src/app/\(account\)/ --no-error-on-unmatched-pattern 2>&1 | head -20`
Expected: no errors

**Step 5: Commit**

```bash
git add src/app/\(account\)/settings/page.tsx src/components/settings/ProfileTab.tsx src/components/settings/SecurityTab.tsx src/components/settings/StatusTab.tsx
git commit -m "feat(settings): create /settings page and adapt tab components for page context"
```

---

### Task 4: Update consumers — modal state → Link navigation

**Files:**
- Modify: `src/components/layout/header/GlobalHeader.tsx`
- Modify: `src/components/layout/header/UserDropdown.tsx`

**Konteks:** Kedua consumer saat ini menggunakan `useState(false)` untuk `isSettingsOpen` dan merender `<UserSettingsModal>`. Kita ganti dengan `<Link href="/settings">` — lebih simpel, gak perlu state, gak perlu import modal.

**Step 1: Update GlobalHeader.tsx**

Perubahan yang harus dilakukan:

1. **Hapus import** UserSettingsModal:
```tsx
// DELETE:
import { UserSettingsModal } from "@/components/settings/UserSettingsModal"
```

2. **Hapus state** `isSettingsOpen`:
```tsx
// DELETE:
const [isSettingsOpen, setIsSettingsOpen] = useState(false)
```

3. **Ganti button mobile "Atur Akun"** dari onClick handler ke Link (sekitar line 415-425):
```tsx
// BEFORE:
<button
  onClick={() => {
    setMobileMenuState({ isOpen: false, pathname })
    setIsSettingsOpen(true)
  }}
  className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-[color:var(--slate-200)] dark:hover:bg-[color:var(--slate-800)] transition-colors"
  type="button"
>
  <User className="icon-interface" />
  <span>Atur Akun</span>
</button>

// AFTER:
<Link
  href="/settings"
  onClick={() => setMobileMenuState({ isOpen: false, pathname })}
  className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-[color:var(--slate-200)] dark:hover:bg-[color:var(--slate-800)] transition-colors"
>
  <User className="icon-interface" />
  <span>Atur Akun</span>
</Link>
```

4. **Hapus UserSettingsModal render** (sekitar line 474-477):
```tsx
// DELETE:
<UserSettingsModal
  open={isSettingsOpen}
  onOpenChange={setIsSettingsOpen}
/>
```

**Step 2: Update UserDropdown.tsx**

Perubahan yang harus dilakukan:

1. **Hapus import** UserSettingsModal, tambah Link:
```tsx
// DELETE:
import { UserSettingsModal } from "@/components/settings/UserSettingsModal"
// ADD (if not already imported):
import Link from "next/link"
```

2. **Hapus state** `isSettingsOpen`:
```tsx
// DELETE:
const [isSettingsOpen, setIsSettingsOpen] = useState(false)
```

3. **Ganti button "Atur Akun"** dari onClick handler ke Link (sekitar line 136-146):
```tsx
// BEFORE:
<button
  onClick={() => {
    setIsOpen(false)
    setIsSettingsOpen(true)
  }}
  className="flex items-center gap-dense p-dense text-[12px] text-narrative text-foreground hover:bg-slate-800 hover:text-slate-100 transition-colors w-full rounded-action"
  type="button"
>
  <User className="icon-interface" />
  <span>Atur Akun</span>
</button>

// AFTER:
<Link
  href="/settings"
  onClick={() => setIsOpen(false)}
  className="flex items-center gap-dense p-dense text-[12px] text-narrative text-foreground hover:bg-slate-800 hover:text-slate-100 transition-colors w-full rounded-action"
>
  <User className="icon-interface" />
  <span>Atur Akun</span>
</Link>
```

4. **Hapus UserSettingsModal render** (sekitar line 191-194):
```tsx
// DELETE:
<UserSettingsModal
  open={isSettingsOpen}
  onOpenChange={setIsSettingsOpen}
/>
```

**Step 3: Type check + Lint**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

Run: `npx eslint src/components/layout/header/ --no-error-on-unmatched-pattern 2>&1 | head -20`
Expected: no errors

**Step 4: Commit**

```bash
git add src/components/layout/header/GlobalHeader.tsx src/components/layout/header/UserDropdown.tsx
git commit -m "refactor(settings): replace modal triggers with Link to /settings page"
```

---

### Task 5: Delete UserSettingsModal

**Files:**
- Delete: `src/components/settings/UserSettingsModal.tsx`

**Konteks:** Komponen modal sudah sepenuhnya digantikan oleh `/settings` page. Tidak ada consumer lain — konfirmasi dengan grep sebelum delete.

**Step 1: Verify no remaining imports**

Run: `grep -r "UserSettingsModal" src/ --include="*.tsx" --include="*.ts"`
Expected: HANYA menampilkan `src/components/settings/UserSettingsModal.tsx` sendiri (export definition). Tidak ada import dari file lain.

**Step 2: Delete file**

Run: `rm src/components/settings/UserSettingsModal.tsx`

**Step 3: Type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: no errors

**Step 4: Commit**

```bash
git add src/components/settings/UserSettingsModal.tsx
git commit -m "refactor(settings): remove deprecated UserSettingsModal component"
```

---

### Task 6: Build verification + QC audit

**Files:** None (verification only)

**Step 1: Full build**

Run: `npm run build 2>&1 | tail -30`
Expected: build succeeds, no errors

**Step 2: Full lint**

Run: `npm run lint 2>&1 | tail -20`
Expected: no errors

**Step 3: Grep for stale references**

Run: `grep -r "UserSettingsModal\|isSettingsOpen\|onCloseModal" src/ --include="*.tsx" --include="*.ts"`
Expected: no results (semua referensi sudah dihapus)

**Step 4: Verify route exists**

Run: `ls src/app/(account)/settings/page.tsx`
Expected: file exists

**Step 5: QC Checklist**

- [ ] **Route**: `/settings` accessible (protected by proxy.ts, not in public routes)
- [ ] **Layout**: Grid pattern background, centered, no GlobalHeader/Footer
- [ ] **Card**: Two-column layout matching AuthWideCard visual DNA
- [ ] **Left column**: Logo + heading + nav + diagonal stripes + back link
- [ ] **Right column**: Tab content with slate background
- [ ] **Deep-linking**: `?tab=security` correctly activates Security tab
- [ ] **Responsive**: Mobile — stacked columns (nav on top, content below)
- [ ] **Nav items**: Active-nav indicator (amber bar) on selected tab
- [ ] **Tab content**: ProfileTab, SecurityTab, StatusTab render correctly
- [ ] **Consumer migration**: GlobalHeader uses `<Link href="/settings">`
- [ ] **Consumer migration**: UserDropdown uses `<Link href="/settings">`
- [ ] **Cleanup**: UserSettingsModal.tsx deleted, no stale imports
- [ ] **Typography**: text-signal, text-interface, text-narrative sesuai hierarki
- [ ] **Tokens**: rounded-action, border-border, bg-muted/30 konsisten

**Step 6: Commit (if any fixes)**

```bash
git add -A
git commit -m "fix(settings): QC audit fixes for settings page migration"
```
