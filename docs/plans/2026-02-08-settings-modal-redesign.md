# UserSettingsModal Redesign: Mechanical Grace Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrasi `UserSettingsModal` dari 52+ custom CSS classes ke Tailwind utility-first sesuai standar Makalah-Carbon (Mechanical Grace).

**Architecture:** Menghapus seluruh blok custom CSS `.user-settings-*`, `.settings-*`, `.accordion-*` di `globals.css` dan mengganti referensinya di `UserSettingsModal.tsx` dengan inline Tailwind utility classes yang sudah tokenized. Mapping 1:1 mengacu pada justification doc `docs/makalah-design-system/justification-docs/user-settings-modal-redesign.md`.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Clerk auth, iconoir-react

**Justification Doc:** `docs/makalah-design-system/justification-docs/user-settings-modal-redesign.md`

**Key References:**
- Token definitions: `src/app/globals.css` lines 2078-2226 (Mechanical Grace utility classes)
- Design system: `docs/makalah-design-system/` (MANIFESTO, typografi, shape-layout, justifikasi-warna, class-naming-convention)
- Current CSS to remove: `src/app/globals.css` lines 1320-2072

**Consumers of UserSettingsModal:**
- `src/components/layout/header/GlobalHeader.tsx` (import)
- `src/components/layout/header/UserDropdown.tsx` (import)
- Interface unchanged (`open`, `onOpenChange`) — no consumer changes needed

**External dependency (DO NOT modify):**
- `src/components/admin/RoleBadge.tsx` — uses custom CSS from `admin-styles.css`, out of scope

---

## Task 1: Structure & Layout Shell (Root, Backdrop, Container, Header)

**Files:**
- Modify: `src/components/settings/UserSettingsModal.tsx:210-237` (root → header)

**Context:** This task replaces the structural skeleton classes with Tailwind utilities. The justification doc provides exact target classes for each element.

**Step 1: Replace root modal, backdrop, and container classes**

Find the root `<div>` (line 211-216), backdrop (line 217), and container (line 218-221). Replace:

```tsx
// ROOT MODAL — was: className="user-settings-modal"
<div
  className="fixed inset-0 z-50 flex items-center justify-center"
  role="dialog"
  aria-modal="true"
  aria-label="Pengaturan akun"
>
  {/* BACKDROP — was: className="user-settings-backdrop" */}
  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={handleClose} />

  {/* CONTAINER — was: className="user-settings-container" */}
  <div
    className="relative z-10 flex w-full max-w-[720px] flex-col overflow-hidden rounded-shell border border-border bg-card shadow-lg max-md:mx-4 max-md:h-auto max-md:max-h-[calc(100vh-32px)] md:h-[560px]"
    onClick={(event) => event.stopPropagation()}
  >
```

Key decisions:
- `z-50` instead of `z-overlay(10)` because modal overlays need to sit above drawers/sidebars. The z-index system from design system uses `z-overlay=10`, `z-drawer=50`, but a settings modal should beat all page-level layers. Using `z-50` for the root and `z-10` (`relative z-10`) for the container within the overlay is correct.
- `rounded-shell` = 16px as per Hybrid Radius Scale.
- `border border-border` = 1px border using theme token (same as `border-main` but compatible with Tailwind `border` shorthand that also sets `border-style: solid`).
- Responsive: `max-md:mx-4 max-md:h-auto max-md:max-h-[calc(100vh-32px)]` replaces the old `@media (max-width: 768px)` block.
- Animation: The old `settingsModalIn` keyframe is dropped. Tailwind `animate-in` or a simple fade can be added later if needed, but the justification doc says "Motion Audit: no new keyframes" — keep it clean.

**Step 2: Replace header structure**

Find header block (line 222-237). Replace:

```tsx
{/* HEADER — was: className="user-settings-header" */}
<div className="flex shrink-0 items-start justify-between border-b border-border px-6 pb-4 pt-6">
  {/* TITLE AREA — was: className="user-settings-title-area" */}
  <div className="flex flex-col gap-1">
    {/* TITLE — was: className="user-settings-title" */}
    <h2 className="text-signal text-lg">Atur Akun</h2>
    {/* SUBTITLE — was: className="user-settings-subtitle" */}
    <p className="text-narrative text-sm text-muted-foreground">
      Kelola informasi akun Anda di Makalah AI.
    </p>
  </div>
  {/* CLOSE BUTTON — was: className="user-settings-close-btn" */}
  <button
    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-action text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground focus-ring"
    onClick={handleClose}
    aria-label="Tutup modal"
    type="button"
  >
    <Xmark className="h-4 w-4" />
  </button>
</div>
```

Key decisions:
- Header padding: `px-6 pb-4 pt-6` (24px horizontal, 24px top, 16px bottom) — matches original CSS `padding: 24px 24px 16px`.
- `text-signal` on title: Mono + uppercase + tracking as per justification doc mapping.
- `text-narrative` on subtitle: Sans font for descriptive text.
- Close button: `rounded-action` (8px), destructive hover, `focus-ring` for accessibility.

**Step 3: Verify the build compiles**

Run: `npx next build 2>&1 | head -30`
Expected: No TypeScript errors. (CSS class changes don't cause TS errors, but verify no import breaks.)

**Step 4: Commit**

```bash
git add src/components/settings/UserSettingsModal.tsx
git commit -m "refactor(settings): migrate modal shell to Tailwind utilities

Replace root, backdrop, container, and header custom CSS classes
with tokenized Tailwind utilities per Mechanical Grace standards."
```

---

## Task 2: Body Layout — Sidebar Navigation + Content Area

**Files:**
- Modify: `src/components/settings/UserSettingsModal.tsx:239-276` (body, nav, content wrapper)

**Context:** This task migrates the sidebar nav (3 tabs) and content wrapper to Tailwind utilities, including responsive behavior.

**Step 1: Replace body and sidebar nav structure**

Find the body wrapper (line 239) and nav (line 240-274). Replace:

```tsx
{/* BODY — was: className="user-settings-body" */}
<div className="flex min-h-0 flex-1 max-md:flex-col">
  {/* SIDEBAR NAV — was: className="user-settings-nav" */}
  <nav
    className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-border bg-muted/30 p-2 pt-6 max-md:w-full max-md:flex-row max-md:flex-wrap max-md:border-b max-md:border-r-0 max-md:p-3 max-md:pt-3"
    aria-label="Navigasi akun"
  >
```

Key decisions:
- `gap-1` (4px) — matches original CSS `gap: 4px`.
- `p-2 pt-6` — matches original `padding: 8px; padding-top: 24px`.
- Responsive: `max-md:` prefixes replace the `@media (max-width: 768px)` block. On mobile, nav becomes horizontal row with wrap.
- `bg-muted/30` — matches original `background: var(--sidebar)` intent (subtle muted background).

**Step 2: Replace nav items**

Replace each nav button. The pattern for all three (profile, security, status) is:

```tsx
<button
  className={cn(
    "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
    activeTab === "profile" && "bg-accent text-foreground"
  )}
  onClick={() => setActiveTab("profile")}
  type="button"
>
  {activeTab === "profile" && (
    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />
  )}
  <UserIcon className="h-4 w-4 shrink-0" />
  <span>Profil</span>
</button>
```

Repeat pattern for `security` (Shield icon, "Keamanan") and `status` (BadgeCheck icon, "Status Akun").

Key decisions:
- `text-interface` — Mono font for nav labels, as per justification mapping.
- Active indicator: Instead of CSS `::before` pseudo-element, use a conditional `<span>` with `absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary`. This is cleaner in React and avoids needing custom CSS for `::before`.
- `rounded-action` (8px) on nav items — matches original `border-radius: 6px` roughly (justification doc says `rounded-action` for interactive elements).
- `focus-ring` for keyboard accessibility.

**Step 3: Replace content wrapper**

```tsx
{/* CONTENT WRAPPER — was: className="user-settings-content" */}
<div className="flex-1 min-w-0 overflow-y-auto p-6 max-sm:p-5">
```

Key decisions:
- `p-6` (24px) — matches original CSS `padding: 24px`.
- `max-sm:p-5` (20px) — matches original `@media (max-width: 480px) { padding: 20px }`.
- Custom scrollbar styles are dropped (they were webkit-specific and non-standard). The browser's native `overflow-y-auto` is sufficient.

**Step 4: Replace tab panel visibility**

Replace each tab panel div:

```tsx
{/* TAB PANEL — was: className="user-settings-tab" + "active" */}
<div className={cn("hidden", activeTab === "profile" && "block")}>
```

Repeat for `security` and `status` tabs.

**Step 5: Verify dev server renders correctly**

Run: `npm run dev` (should already be running)
Check: Open modal in browser, verify 3 tabs render, clicking switches content, mobile responsive works.

**Step 6: Commit**

```bash
git add src/components/settings/UserSettingsModal.tsx
git commit -m "refactor(settings): migrate sidebar nav and body layout to Tailwind

Replace body, nav, content wrapper, tab panel custom CSS classes
with responsive Tailwind utilities. Active nav uses conditional span
instead of CSS ::before pseudo-element."
```

---

## Task 3: Profile Tab — Section Headers, Cards, Profile Display & Edit Mode

**Files:**
- Modify: `src/components/settings/UserSettingsModal.tsx:277-438` (profile tab content)

**Context:** This task migrates the entire Profile tab: section header, profile card (view + edit mode), and email card. This is the largest single tab with the most elements.

**Step 1: Replace section header**

```tsx
{/* SECTION HEADER — was: className="settings-content-header" */}
<div className="mb-6">
  {/* SECTION TITLE — was: className="settings-content-title" */}
  <h3 className="flex items-center gap-2 text-signal text-lg">
    <UserIcon className="h-5 w-5 text-primary" />
    Detail Profil
  </h3>
  {/* SECTION SUBTITLE — was: className="settings-content-subtitle" */}
  <p className="mt-1 text-narrative text-sm text-muted-foreground">
    Atur nama dan avatar akun Anda.
  </p>
</div>
```

Key decisions:
- `mb-6` (24px) — matches original `margin-bottom: 24px`.
- `text-signal text-lg` on title — Mono + uppercase + tracking.
- Icon inside title gets explicit `h-5 w-5 text-primary` — matches original SVG sizing (20px) with primary color accent.

**Step 2: Replace profile card shell and header**

```tsx
{/* CARD — was: className="settings-card" */}
<div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
  {/* CARD HEADER — was: className="settings-card-header" */}
  <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">
    Profil
  </div>
  {/* CARD BODY — was: className="settings-card-body" */}
  <div className="p-4">
```

Key decisions:
- `rounded-action` (8px) — matches original `border-radius: 8px`.
- `mb-4` (16px) — matches original `margin-bottom: 16px`.
- `text-interface` on card header — Mono font for structural labels.
- `px-4 py-3` — matches original `padding: 12px 16px`.

**Step 3: Replace profile view mode (non-editing)**

```tsx
{!isProfileEditing ? (
  <div className="flex items-center justify-between">
    {/* PROFILE INFO — was: className="settings-profile-info" */}
    <div className="flex items-center gap-3">
      {/* AVATAR — was: className="settings-avatar" */}
      <div className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-sm font-semibold">
        {user?.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={fullName || "User"}
            width={40}
            height={40}
            className="h-full w-full object-cover"
            unoptimized
            loader={({ src }) => src}
          />
        ) : (
          <span>{userInitial}</span>
        )}
      </div>
      {/* NAME — was: className="settings-profile-name" */}
      <span className="text-interface text-sm font-medium">
        {fullName || primaryEmail || "-"}
      </span>
    </div>
    {/* ACTION — was: className="settings-row-action" */}
    <button
      className="text-interface text-sm font-medium text-primary transition-opacity hover:opacity-80 focus-ring"
      onClick={() => setIsProfileEditing(true)}
      type="button"
    >
      Ubah profil
    </button>
  </div>
) : (
```

Key decisions:
- Avatar: `size-10` (40px), `rounded-full`, `bg-primary text-primary-foreground` — matches original.
- `text-interface` on name and action — Mono font for data display.
- Action button: `text-primary hover:opacity-80 focus-ring` — matches justification mapping.

**Step 4: Replace profile edit mode (accordion)**

```tsx
  // EDIT MODE — was: className="settings-accordion-fullwidth"
  <div className="w-full">
    {/* EDIT HEADER — was: className="accordion-fw-header" */}
    <div className="mb-4 text-interface text-sm font-semibold">Ubah profil</div>
    {/* EDIT BODY — was: className="accordion-fw-body" */}
    <div className="flex flex-col gap-4">
      {/* AVATAR ROW — was: className="accordion-avatar-row" */}
      <div className="flex items-center gap-3">
        {/* AVATAR EDIT — was: className="settings-avatar accordion-avatar" */}
        <div className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-base font-semibold">
          {profilePreviewUrl ? (
            <Image src={profilePreviewUrl} alt={fullName || "User"} width={48} height={48} className="h-full w-full object-cover" unoptimized loader={({ src }) => src} />
          ) : user?.imageUrl ? (
            <Image src={user.imageUrl} alt={fullName || "User"} width={48} height={48} className="h-full w-full object-cover" unoptimized loader={({ src }) => src} />
          ) : (
            <span>{userInitial}</span>
          )}
        </div>
        {/* AVATAR INFO — was: className="accordion-avatar-info" */}
        <div className="flex flex-col gap-1">
          {/* UPLOAD BUTTON — was: className="accordion-upload-btn" */}
          <button
            className="inline-flex w-fit rounded-action border border-border px-3 py-1.5 text-interface text-sm transition-colors hover:bg-accent focus-ring disabled:opacity-50"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isLoaded}
          >
            Upload
          </button>
          {/* UPLOAD HINT — was: className="accordion-upload-hint" */}
          <span className="text-narrative text-xs text-muted-foreground">
            Ukuran rekomendasi 1:1, maksimal 10MB.
          </span>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0] ?? null; setProfileImage(file) }} />
        </div>
      </div>
      {/* FIELD ROW — was: className="accordion-fields-row" */}
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        {/* FIELD — was: className="accordion-field" */}
        <div className="flex flex-1 flex-col gap-1.5">
          {/* LABEL — was: className="accordion-label" */}
          <label className="text-interface text-xs font-medium text-foreground">Nama depan</label>
          {/* INPUT — was: className="accordion-input" */}
          <input
            type="text"
            className="h-10 w-full rounded-action border border-border bg-background px-3 text-interface text-sm transition-colors focus-ring"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-interface text-xs font-medium text-foreground">Nama belakang</label>
          <input
            type="text"
            className="h-10 w-full rounded-action border border-border bg-background px-3 text-interface text-sm transition-colors focus-ring"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>
      </div>
    </div>
    {/* EDIT FOOTER — was: className="accordion-fw-footer" */}
    <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
      {/* CANCEL — was: className="accordion-cancel-btn" */}
      <button
        className="rounded-action border border-border bg-background px-4 py-2 text-interface text-sm transition-colors hover:bg-accent focus-ring disabled:opacity-50"
        type="button"
        onClick={() => setIsProfileEditing(false)}
        disabled={isSavingProfile}
      >
        Batal
      </button>
      {/* SAVE — was: className="accordion-save-btn" */}
      <button
        className="rounded-action bg-primary px-5 py-2 text-interface text-sm text-primary-foreground transition-colors hover:bg-primary/90 focus-ring disabled:opacity-50"
        type="button"
        onClick={handleProfileSave}
        disabled={!isLoaded || isSavingProfile}
      >
        {isSavingProfile ? "Menyimpan..." : "Simpan"}
      </button>
    </div>
  </div>
)}
```

Key decisions:
- Edit avatar: `size-12` (48px) — matches original accordion avatar size.
- Upload button: `rounded-action border border-border` — matches justification target.
- Input: `h-10 rounded-action border border-border bg-background focus-ring` — standardized form control.
- `text-interface` on ALL labels, inputs, buttons — Mono font for interface elements.
- Save button: `bg-primary text-primary-foreground` — primary CTA. Using `hover:bg-primary/90` instead of `hover-slash` because this is a standard save action, not a premium/command action.
- Grid: `gap-3` (12px) — matches original `gap: 12px`. Responsive: `max-sm:grid-cols-1`.

**Step 5: Replace email card**

```tsx
{/* EMAIL CARD — was: className="settings-card" */}
<div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
  <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Email</div>
  <div className="p-4">
    {/* EMAIL ROW — was: className="settings-email-item" */}
    <div className="flex items-center gap-2 text-interface text-sm">
      <span>{primaryEmail || "-"}</span>
      {primaryEmail && (
        {/* BADGE — was: className="settings-badge-primary" */}
        <span className="inline-flex rounded-badge border border-border bg-muted px-2 py-0.5 text-signal text-[10px]">
          Utama
        </span>
      )}
    </div>
  </div>
</div>
```

Key decisions:
- Badge: `rounded-badge` (6px), `text-signal text-[10px]` — matches justification mapping for signal badges.
- `border border-border bg-muted` — tokenized badge appearance.

**Step 6: Verify profile tab renders correctly**

Check in browser: view mode shows avatar + name + action link, edit mode shows form fields, email card shows badge.

**Step 7: Commit**

```bash
git add src/components/settings/UserSettingsModal.tsx
git commit -m "refactor(settings): migrate profile tab to Tailwind utilities

Replace section headers, cards, profile view/edit, avatar, form fields,
and email card with tokenized Tailwind classes per Mechanical Grace."
```

---

## Task 4: Security Tab — Password Card View & Edit Mode

**Files:**
- Modify: `src/components/settings/UserSettingsModal.tsx:440-600` (security tab content)

**Context:** This task migrates the Security tab: section header, password display row, and password edit mode with 3 password fields + checkbox.

**Step 1: Replace security section header**

Same pattern as profile section header:

```tsx
<div className={cn("hidden", activeTab === "security" && "block")}>
  <div className="mb-6">
    <h3 className="flex items-center gap-2 text-signal text-lg">
      <Shield className="h-5 w-5 text-primary" />
      Keamanan
    </h3>
    <p className="mt-1 text-narrative text-sm text-muted-foreground">
      Update kata sandi dan kontrol sesi.
    </p>
  </div>
```

**Step 2: Replace password card — view mode**

```tsx
  <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
    <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Kata Sandi</div>
    <div className="p-4">
    {!isPasswordEditing ? (
      {/* ROW — was: className="settings-row" */}
      <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
        {/* LABEL — was: className="settings-row-label" */}
        <span className="text-interface text-xs text-muted-foreground">Kata sandi</span>
        {/* VALUE — was: className="settings-row-value" */}
        <div className="min-w-0 text-interface text-sm text-foreground">
          {/* DOTS — was: className="settings-password-dots" */}
          <span className="tracking-[0.2em] text-muted-foreground">••••••••</span>
        </div>
        {/* ACTION — was: className="settings-row-action" */}
        <button
          className="text-interface text-sm font-medium text-primary transition-opacity hover:opacity-80 focus-ring"
          onClick={() => setIsPasswordEditing(true)}
          type="button"
        >
          Ubah kata sandi
        </button>
      </div>
    ) : (
```

**Step 3: Replace password card — edit mode**

This uses a reusable password field pattern. Each of the 3 fields (current, new, confirm) follows this structure:

```tsx
      <div className="w-full">
        <div className="mb-4 text-interface text-sm font-semibold">Ubah kata sandi</div>
        <div className="flex flex-col gap-4">
          {/* PASSWORD FIELD (repeat x3) — was: className="accordion-field accordion-field-full" */}
          <div className="flex w-full flex-col gap-1.5">
            <label className="text-interface text-xs font-medium text-foreground">Kata sandi saat ini</label>
            {/* INPUT WRAPPER — was: className="accordion-input-wrapper" */}
            <div className="relative flex items-center">
              <input
                type={showCurrentPassword ? "text" : "password"}
                className="h-10 w-full rounded-action border border-border bg-background px-3 pr-10 text-interface text-sm transition-colors focus-ring"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              {/* EYE TOGGLE — was: className="accordion-eye-btn" */}
              <button
                className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-badge text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring"
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                aria-label="Tampilkan kata sandi"
              >
                {showCurrentPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* SECOND FIELD: "Kata sandi baru" with showNewPassword/setShowNewPassword/newPassword/setNewPassword */}
          {/* THIRD FIELD: "Konfirmasi kata sandi" with showConfirmPassword/setShowConfirmPassword/confirmPassword/setConfirmPassword */}

          {/* CHECKBOX — was: className="accordion-checkbox-row" */}
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              className="mt-0.5 size-[18px] shrink-0 accent-primary"
              id="signout-checkbox"
              checked={signOutOthers}
              onChange={(event) => setSignOutOthers(event.target.checked)}
            />
            <div className="flex flex-col gap-0.5">
              <label className="text-interface text-xs font-medium text-foreground" htmlFor="signout-checkbox">
                Keluar dari semua perangkat lain
              </label>
              <span className="text-narrative text-xs leading-5 text-muted-foreground">
                Disarankan agar semua sesi lama ikut keluar setelah kata sandi diganti.
              </span>
            </div>
          </div>
        </div>
        {/* FOOTER — same pattern as profile edit footer */}
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <button
            className="rounded-action border border-border bg-background px-4 py-2 text-interface text-sm transition-colors hover:bg-accent focus-ring disabled:opacity-50"
            type="button"
            onClick={() => setIsPasswordEditing(false)}
            disabled={isSavingPassword}
          >
            Batal
          </button>
          <button
            className="rounded-action bg-primary px-5 py-2 text-interface text-sm text-primary-foreground transition-colors hover:bg-primary/90 focus-ring disabled:opacity-50"
            type="button"
            onClick={handlePasswordSave}
            disabled={!isLoaded || isSavingPassword}
          >
            {isSavingPassword ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    )}
    </div>
  </div>
</div>
```

Key decisions:
- Password input: `pr-10` (40px right padding) — matches original `padding-right: 40px` for eye button clearance.
- Eye toggle: `rounded-badge` (6px) — matches original `border-radius: 4px` approximately (justification doc says `rounded-badge`).
- Checkbox: `size-[18px] accent-primary` — matches original exactly.
- Checkbox hint: `text-narrative` (Sans) for descriptive text vs `text-interface` (Mono) for label.

**Step 4: Verify security tab renders correctly**

Check: password dots display, edit mode shows 3 fields with eye toggles, checkbox works, save/cancel buttons render.

**Step 5: Commit**

```bash
git add src/components/settings/UserSettingsModal.tsx
git commit -m "refactor(settings): migrate security tab to Tailwind utilities

Replace password view/edit, eye toggle buttons, checkbox,
and action footer with tokenized Tailwind classes."
```

---

## Task 5: Status Tab — Account Info, Role, Subscription & Tier Badges

**Files:**
- Modify: `src/components/settings/UserSettingsModal.tsx:602-700` (status tab content)

**Context:** This task migrates the Status Akun tab: email info card, role card, and subscription card with tier badges. Special attention to tier badge colors per Signal Theory.

**Step 1: Update TIER_CONFIG to use Mechanical Grace token colors**

At the top of the file (line 27-32), update the tier config:

```tsx
const TIER_CONFIG: Record<TierType, { label: string; className: string; showUpgrade: boolean }> = {
  gratis: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  free: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  bpp: { label: "BPP", className: "bg-sky-600 text-white", showUpgrade: true },
  pro: { label: "PRO", className: "bg-amber-500 text-white", showUpgrade: false },
}
```

Key changes:
- `bpp`: Changed from `bg-blue-600` to `bg-sky-600` — per Signal Theory, BPP = Sky, not generic blue.
- `pro`: Changed from `bg-amber-600` to `bg-amber-500` — per justification doc, PRO = Amber-500 (the main brand accent).

**Step 2: Replace status section header**

Same pattern as previous tabs:

```tsx
<div className={cn("hidden", activeTab === "status" && "block")}>
  <div className="mb-6">
    <h3 className="flex items-center gap-2 text-signal text-lg">
      <BadgeCheck className="h-5 w-5 text-primary" />
      Status Akun
    </h3>
    <p className="mt-1 text-narrative text-sm text-muted-foreground">
      Ringkasan akses akun Anda di Makalah AI.
    </p>
  </div>
```

**Step 3: Replace email info card**

```tsx
  {/* EMAIL CARD */}
  <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
    <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Informasi Akun</div>
    <div className="p-4">
      <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
        <span className="text-interface text-xs text-muted-foreground">Email</span>
        <div className="min-w-0 text-interface text-sm text-foreground">{primaryEmail || "-"}</div>
        <div />
      </div>
    </div>
  </div>
```

**Step 4: Replace role card**

```tsx
  {/* ROLE CARD */}
  <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
    <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Role & Akses</div>
    <div className="p-4">
      <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
        <span className="text-interface text-xs text-muted-foreground">Role</span>
        <div className="min-w-0 text-interface text-sm text-foreground">
          {isConvexLoading ? (
            <span className="text-interface text-sm text-muted-foreground">Memuat...</span>
          ) : convexUser ? (
            <RoleBadge role={convexUser.role as "superadmin" | "admin" | "user"} />
          ) : (
            "-"
          )}
        </div>
        <div />
      </div>
    </div>
  </div>
```

**Step 5: Replace subscription card with tokenized tier badges**

```tsx
  {/* SUBSCRIPTION CARD */}
  <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
    <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Subskripsi</div>
    <div className="p-4">
      {isConvexLoading ? (
        <span className="text-interface text-sm text-muted-foreground">Memuat...</span>
      ) : (
        (() => {
          const tierKey = (convexUser?.subscriptionStatus || "free").toLowerCase() as TierType
          const tierConfig = TIER_CONFIG[tierKey] || TIER_CONFIG.free
          return (
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "inline-flex items-center rounded-badge px-3 py-1 text-signal text-xs",
                  tierConfig.className
                )}
              >
                {tierConfig.label}
              </span>
              {tierConfig.showUpgrade && (
                <Link
                  href="/subscription/upgrade"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center gap-1.5 rounded-action bg-success px-4 py-2 text-interface text-sm font-medium text-white transition-colors hover:bg-success/90 focus-ring"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Upgrade
                </Link>
              )}
            </div>
          )
        })()
      )}
    </div>
  </div>
</div>
```

Key decisions:
- Tier badge: `rounded-badge text-signal text-xs` — Mechanical Grace badge styling.
- Upgrade button: `bg-success text-white hover:bg-success/90` — uses semantic `--success` token instead of inline OKLCH. `rounded-action` for button shape. `text-interface` for Mono font.
- Removed inline `bg-[var(--success)]` and hardcoded `hover:bg-[oklch(...)]` — now fully tokenized.

**Step 6: Replace loading indicator at bottom**

```tsx
{!isLoaded && (
  <div className="text-interface text-sm text-muted-foreground">Memuat...</div>
)}
```

**Step 7: Verify status tab renders correctly**

Check: Email displays, role badge renders, tier badges show correct colors (GRATIS=emerald, BPP=sky, PRO=amber), upgrade button visible for non-PRO.

**Step 8: Commit**

```bash
git add src/components/settings/UserSettingsModal.tsx
git commit -m "refactor(settings): migrate status tab and tier badges to Tailwind

Replace status cards, tier badge colors (BPP: blue->sky),
and upgrade button with tokenized Mechanical Grace utilities."
```

---

## Task 6: Remove Legacy CSS from globals.css

**Files:**
- Modify: `src/app/globals.css` — remove lines 1320-1974 (the `@layer components` block for USER SETTINGS MODAL)
- Modify: `src/app/globals.css` — remove settings-specific lines from `@media` blocks (lines 2012-2016, 2018-2026, 2061-2071)

**Context:** Now that all classes are inlined as Tailwind utilities in the component, the legacy CSS block must be removed. This is the cleanup step.

**Step 1: Identify exact removal boundaries**

The CSS to remove:
1. **Main block**: Lines 1320-1974 — the entire `/* USER SETTINGS MODAL */` section inside `@layer components`.
2. **768px responsive block**: Lines 2012-2026 — `.user-settings-container`, `.user-settings-body`, `.user-settings-nav` overrides.
3. **480px responsive block**: Lines 2061-2071 — `.user-settings-content`, `.user-settings-nav`, `.accordion-fields-row` overrides.

**IMPORTANT:** The `@media (max-width: 768px)` and `@media (max-width: 480px)` blocks also contain OTHER non-settings classes (`.dashboard-main`, `.admin-body`, `.admin-sidebar`, `.sidebar-nav`, `.sidebar-nav-item`). Only remove the settings-specific rules, NOT the entire media query blocks.

**Step 2: Remove the main block**

Delete the entire section from `/* ====... USER SETTINGS MODAL ====... */` through the closing `}` of its `@layer components` block (lines 1320-1974).

**Step 3: Remove settings rules from 768px media query**

Inside `@media (max-width: 768px)`, remove ONLY:
- `.user-settings-container { ... }` (lines 2012-2016)
- `.user-settings-body { ... }` (lines 2018-2020)
- `.user-settings-nav { ... }` (lines 2022-2026)

Keep all other rules in the media query block (dashboard, admin, sidebar).

**Step 4: Remove settings rules from 480px media query**

Inside `@media (max-width: 480px)`, remove ONLY:
- `.user-settings-content { ... }` (lines 2061-2063)
- `.user-settings-nav { ... }` (lines 2065-2067)
- `.accordion-fields-row { ... }` (lines 2069-2071)

Keep all other rules in the media query block (dashboard, admin, sidebar).

**Step 5: Also remove the `@keyframes settingsModalIn` if it exists only in the removed block**

This keyframe (lines 1355-1365) is inside the main block and should be removed with it.

**Step 6: Verify no broken references**

Run: `grep -rn "user-settings-\|settings-card\|settings-row\|settings-profile\|settings-content-header\|settings-content-title\|settings-content-subtitle\|settings-badge-primary\|settings-email\|settings-password\|settings-accordion\|accordion-fw\|accordion-avatar\|accordion-upload\|accordion-fields\|accordion-field\|accordion-label\|accordion-input\|accordion-eye\|accordion-checkbox\|accordion-cancel\|accordion-save" src/`

Expected: NO matches in any `.tsx` file. The only matches should be in this plan doc or justification docs (`.md` files).

**Step 7: Verify the build compiles**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors.

**Step 8: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor(settings): remove 650+ lines of legacy modal CSS

Delete all .user-settings-*, .settings-*, .accordion-* custom CSS
classes and their responsive overrides from globals.css.
All styling now handled by inline Tailwind utilities in the component."
```

---

## Task 7: Verification & Quality Control Audit

**Files:**
- Read: `src/components/settings/UserSettingsModal.tsx` (full audit)
- Read: `src/app/globals.css` (verify no leftover references)

**Context:** Final audit against the 8-point checklist from the justification doc. This is a read-only verification task.

**Step 1: Spacing Audit**

Verify all padding/gap in the component uses tokenized values:
- `p-4`, `p-6`, `px-3`, `py-2`, `gap-1`, `gap-2`, `gap-3`, `gap-4` — all multiples of 4px grid.
- No hardcoded pixel padding like `p-[13px]` or arbitrary values.

**Step 2: Typography Audit**

Verify font separation:
- `text-signal` on: modal title, section titles, tier badges, "Utama" badge.
- `text-interface` on: nav labels, card headers, field labels, data values, buttons, row labels.
- `text-narrative` on: subtitle descriptions, upload hint, checkbox hint.
- NO bare `font-mono` or `font-sans` without semantic class.

**Step 3: Radius Audit**

Verify radius usage:
- `rounded-shell` on: modal container only.
- `rounded-action` on: cards, buttons, inputs, nav items.
- `rounded-badge` on: badges, eye toggle buttons.
- `rounded-full` on: avatar only.
- NO generic `rounded-lg`, `rounded-xl`, `rounded-md`.

**Step 4: Border Audit**

Verify border consistency:
- `border border-border` on: container, cards, inputs, upload button, cancel button.
- `border-b border-border` on: header, card headers.
- `border-t border-border` on: edit mode footers.
- NO hardcoded border colors.

**Step 5: Interaction Audit**

Verify interaction states:
- `focus-ring` on: close button, nav items, all buttons, all inputs, upgrade link.
- `hover:bg-destructive hover:text-destructive-foreground` on: close button.
- `hover:bg-accent` on: nav items, upload button, cancel button, eye toggle.
- `hover:opacity-80` on: action links.
- `disabled:opacity-50` on: all form buttons.

**Step 6: Icon Audit**

Verify all icons are from `iconoir-react`:
- Xmark, Eye, EyeClosed, Shield, UserIcon (User), BadgeCheck, ArrowUpCircle.
- NO Lucide imports.

**Step 7: Contrast Audit**

Open browser, test in both light mode and dark mode:
- Modal text readable against card background.
- Tier badges have sufficient contrast (white text on colored bg).
- Muted text visible but de-emphasized.

**Step 8: Responsive Audit**

Test at 3 breakpoints:
- Desktop (1200px+): Side-by-side sidebar + content.
- Tablet (768px): Sidebar wraps to horizontal row.
- Mobile (480px): Full-width layout, form fields stack to single column.

**Step 9: Report results**

If all 8 audits pass, report "QC PASSED" to supervisor. If any fail, document the specific failure and fix before proceeding.

**Step 10: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(settings): QC audit fixes for Mechanical Grace compliance"
```

---

## Summary

| Task | Scope | Est. Lines Changed |
|------|-------|--------------------|
| 1 | Shell (root, backdrop, container, header) | ~30 lines |
| 2 | Body layout (nav, content, tab panels) | ~40 lines |
| 3 | Profile tab (view, edit, email) | ~160 lines |
| 4 | Security tab (password view, edit, checkbox) | ~130 lines |
| 5 | Status tab (email, role, subscription, tiers) | ~100 lines |
| 6 | Remove legacy CSS from globals.css | ~650 lines removed |
| 7 | Verification & QC audit | 0 (read-only) |

**Total:** ~460 lines of TSX rewritten + ~650 lines of CSS deleted.
**Net result:** Significantly less total code, fully tokenized, zero custom CSS for this component.
