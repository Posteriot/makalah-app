# Auth Redesign: Mechanical Grace Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Auth Section (Sign-in, Sign-up, Waitlist) dari legacy styling ke standar Makalah-Carbon (Mechanical Grace).

**Architecture:** Migration bertahap dari luar ke dalam — Layout → AuthWideCard → WaitlistForm → Clerk Appearance. Setiap step memiliki verification checkpoint untuk memastikan tidak ada visual breakage.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS v4, Clerk Auth, Makalah-Carbon Design Tokens

**Branch:** `feat/auth-redesign-mechanical-grace`

---

## Reference Documents

- Design System: `docs/makalah-design-system/docs/MANIFESTO.md`
- Migration Protocol: `docs/makalah-design-system/justification-docs/auth-redesign.md`
- Color Tokens: `docs/makalah-design-system/docs/justifikasi-warna.md`
- Typography: `docs/makalah-design-system/docs/typografi.md`
- Shape & Layout: `docs/makalah-design-system/docs/shape-layout.md`

---

## Task 1: Migrate Auth Layout Background

**Files:**
- Modify: `src/app/(auth)/layout.tsx`

**Step 1: Remove legacy hero-vivid and dark overlay**

Replace the entire layout content. Change from:
```tsx
<div className="min-h-screen relative overflow-hidden bg-background text-foreground flex items-center justify-center p-6 hero-vivid">
    {/* Dark Overlay for Aurora - provide "transparency to black" feel */}
    <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" aria-hidden="true" />

    {/* Grid Overlay */}
    <div
        className="hero-grid-thin absolute inset-0 pointer-events-none opacity-20 z-[1]"
        aria-hidden="true"
    />

    {/* Content Container */}
    <div className="relative z-10 w-full max-w-5xl flex justify-center">
        {children}
    </div>
</div>
```

To:
```tsx
<div className="min-h-screen relative overflow-hidden bg-background text-foreground flex items-center justify-center p-6">
    {/* Industrial Grid Pattern - Mechanical Grace */}
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
```

**Step 2: Visual verification**

Run: `npm run dev`
Check: Navigate to `/sign-in` and `/sign-up`
Expected:
- Background should be clean `bg-background` (no aurora/vivid effect)
- Subtle 48px grid pattern visible
- No dark overlay blocking content

**Step 3: Commit**

```bash
git add src/app/\(auth\)/layout.tsx
git commit -m "refactor(auth): migrate layout to Mechanical Grace grid pattern

- Remove legacy hero-vivid aurora effect
- Remove dark overlay (bg-black/60)
- Add industrial 48px grid pattern with hairline opacity
- Align with Makalah-Carbon design system"
```

---

## Task 2: Refactor AuthWideCard Shell & Typography

**Files:**
- Modify: `src/components/auth/AuthWideCard.tsx`

**Step 1: Update card shell classes**

Change the main container from:
```tsx
<div className="w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-2xl border border-border bg-card shadow-2xl relative">
```

To:
```tsx
<div className="w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-shell border border-border bg-card shadow-none relative">
```

**Step 2: Update left column border to hairline**

Change the left column from:
```tsx
<div className="md:w-5/12 bg-muted/30 p-8 md:p-12 border-b md:border-b-0 md:border-r border-border relative flex flex-col">
```

To:
```tsx
<div className="md:w-5/12 bg-muted/30 p-8 md:p-12 border-b md:border-b-0 md:border-r border-hairline relative flex flex-col">
```

**Step 3: Update decorative grid pattern**

Change the decorative grid from:
```tsx
<div className="absolute inset-0 opacity-40 pointer-events-none hero-grid-thin" />
```

To:
```tsx
{/* Diagonal Stripes - Industrial Texture */}
<div
    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
    style={{
        backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)'
    }}
    aria-hidden="true"
/>
```

**Step 4: Update title typography to Mechanical Grace**

Change the h1 from:
```tsx
<h1 className="font-hero text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-[1.1]">
```

To:
```tsx
<h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tighter text-foreground leading-[1.1]">
```

**Step 5: Update subtitle styling**

Change the subtitle paragraph container from:
```tsx
<p className="text-sm leading-relaxed max-w-[280px]">
    <span className="text-muted-foreground font-normal">
        {subtitleLead}
    </span>{" "}
    {subtitleEmphasis && (
        <span className="text-brand font-bold">
            {subtitleEmphasis}
        </span>
    )}
</p>
```

To:
```tsx
<p className="text-sm leading-relaxed max-w-[280px] font-sans">
    <span className="text-muted-foreground font-normal">
        {subtitleLead}
    </span>{" "}
    {subtitleEmphasis && (
        <span className="text-primary font-semibold">
            {subtitleEmphasis}
        </span>
    )}
</p>
```

**Step 6: Visual verification**

Run: `npm run dev`
Check: Navigate to `/sign-in`, `/sign-up`, `/waiting-list`
Expected:
- Card has 16px radius (rounded-shell), no heavy shadow
- Left column has subtle hairline border (0.5px visual)
- Diagonal stripes texture on left column (very subtle)
- Title uses Geist Mono font
- Subtitle uses Geist Sans with primary color emphasis

**Step 7: Commit**

```bash
git add src/components/auth/AuthWideCard.tsx
git commit -m "refactor(auth): migrate AuthWideCard to Mechanical Grace

- Apply rounded-shell (16px) and remove shadow-2xl
- Change border-r to border-hairline (0.5px)
- Replace hero-grid-thin with diagonal stripes texture
- Update title to font-mono (Geist Mono)
- Update subtitle to font-sans with primary emphasis"
```

---

## Task 3: Standardize WaitlistForm Components

**Files:**
- Modify: `src/components/auth/WaitlistForm.tsx`

**Step 1: Update success state icon container**

Change from:
```tsx
<div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
    <CheckCircle className="w-8 h-8 text-brand" />
</div>
```

To:
```tsx
<div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
    <CheckCircle className="w-8 h-8 text-success" />
</div>
```

**Step 2: Update success state typography**

Change from:
```tsx
<h3 className="text-lg font-semibold text-foreground mb-2">
    Pendaftaran Berhasil!
</h3>
```

To:
```tsx
<h3 className="text-lg font-mono font-bold text-foreground mb-2 tracking-tight">
    Pendaftaran Berhasil!
</h3>
```

**Step 3: Update input field styling**

Change from:
```tsx
<Input
    type="email"
    placeholder="Masukkan email kamu"
    value={email}
    onChange={(e) => {
        setEmail(e.target.value)
        setError(null)
    }}
    disabled={formState === "loading"}
    className="pl-10 h-11 rounded-lg border-border bg-background focus:ring-brand focus:border-brand"
    aria-invalid={!!error}
    required
/>
```

To:
```tsx
<Input
    type="email"
    placeholder="Masukkan email kamu"
    value={email}
    onChange={(e) => {
        setEmail(e.target.value)
        setError(null)
    }}
    disabled={formState === "loading"}
    className="pl-10 h-10 rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary"
    aria-invalid={!!error}
    required
/>
```

**Step 4: Update submit button styling**

Change from:
```tsx
<Button
    type="submit"
    disabled={formState === "loading" || !email}
    className="w-full h-11 bg-brand hover:bg-brand/90 text-white font-semibold rounded-lg"
>
    {formState === "loading" ? (
        <>
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Mendaftar...</span>
        </>
    ) : (
        <span>Daftar Waiting List</span>
    )}
</Button>
```

To:
```tsx
<Button
    type="submit"
    disabled={formState === "loading" || !email}
    className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold text-xs uppercase tracking-widest rounded-action hover-slash"
>
    {formState === "loading" ? (
        <>
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>MENDAFTAR...</span>
        </>
    ) : (
        <span>DAFTAR WAITING LIST</span>
    )}
</Button>
```

**Step 5: Update footer text styling**

Change from:
```tsx
<p className="text-xs text-center text-muted-foreground">
    Dengan mendaftar, kamu akan menerima email undangan saat giliran kamu tiba.
</p>
```

To:
```tsx
<p className="text-xs text-center text-muted-foreground font-sans">
    Dengan mendaftar, kamu akan menerima email undangan saat giliran kamu tiba.
</p>
```

**Step 6: Visual verification**

Run: `npm run dev`
Check: Navigate to `/waiting-list`
Expected:
- Input has 8px radius (rounded-action), h-10, mono font
- Button has 8px radius, mono font, uppercase, wide tracking
- Button shows hover-slash diagonal pattern on hover
- Success state uses emerald/success color, mono font

**Step 7: Commit**

```bash
git add src/components/auth/WaitlistForm.tsx
git commit -m "refactor(auth): migrate WaitlistForm to Mechanical Grace

- Update input to rounded-action (8px), h-10, font-mono
- Update button to font-mono, uppercase, tracking-widest
- Add hover-slash class for industrial hover effect
- Change success icon to use success color (emerald)
- Ensure footer uses font-sans for narrative text"
```

---

## Task 4: Update Clerk Appearance - Sign In Page

**Files:**
- Modify: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

**Step 1: Update Clerk appearance object**

Replace the entire appearance prop in SignIn component from:
```tsx
appearance={{
    baseTheme: isDark ? dark : undefined,
    elements: {
        rootBox: "w-full",
        card: "shadow-none border-none bg-transparent p-0 w-full",
        headerTitle: "hidden",
        headerSubtitle: "hidden",
        main: "p-0",
        socialButtonsBlockButton: `rounded-lg border-border hover:bg-muted transition-colors text-sm font-medium ${isDark ? "bg-muted/50" : ""}`,
        formButtonPrimary: "bg-brand hover:opacity-90 transition-opacity text-sm font-bold h-10 shadow-none",
        formFieldInput: `rounded-lg border-border bg-background focus:ring-brand focus:border-brand transition-all ${isDark ? "bg-muted/20" : ""}`,
        footerActionLink: "text-brand hover:text-brand/80 font-bold",
        identityPreviewText: "text-foreground",
        identityPreviewEditButtonIcon: "text-brand",
        formFieldLabel: "hidden",
        formFieldHintText: "hidden",
        socialButtonsBlockButtonBadge: "hidden",
        identifierFieldInputOptionLastUsed: "hidden",
        alternativeMethodsBlockButtonBadge: "hidden",
        formFieldInputGroupSuffix: "hidden",
        formFieldSuccessText: "hidden",
        dividerText: "text-muted-foreground",
        footer: "bg-transparent mt-4",
        footerActionText: "text-muted-foreground",
    },
    variables: {
        colorPrimary: "oklch(0.711 0.181 125.2)",
        colorTextSecondary: "#a1a1aa",
        colorBackground: "transparent",
        colorTextOnPrimaryBackground: "white",
    }
}}
```

To:
```tsx
appearance={{
    baseTheme: isDark ? dark : undefined,
    elements: {
        rootBox: "w-full",
        card: "shadow-none border-none bg-transparent p-0 w-full",
        headerTitle: "hidden",
        headerSubtitle: "hidden",
        main: "p-0",
        socialButtonsBlockButton: `rounded-action border-border hover:bg-muted transition-colors font-mono text-xs uppercase tracking-wider ${isDark ? "bg-muted/50" : ""}`,
        formButtonPrimary: "bg-primary hover:bg-primary/90 transition-colors font-mono text-xs font-bold uppercase tracking-widest h-10 shadow-none rounded-action",
        formFieldInput: `rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary transition-all ${isDark ? "bg-muted/20" : ""}`,
        footerActionLink: "text-primary hover:text-primary/80 font-bold",
        identityPreviewText: "text-foreground font-mono",
        identityPreviewEditButtonIcon: "text-primary",
        formFieldLabel: "hidden",
        formFieldHintText: "hidden",
        socialButtonsBlockButtonBadge: "hidden",
        identifierFieldInputOptionLastUsed: "hidden",
        alternativeMethodsBlockButtonBadge: "hidden",
        formFieldInputGroupSuffix: "hidden",
        formFieldSuccessText: "hidden",
        dividerText: "text-muted-foreground font-mono text-xs uppercase tracking-wider",
        footer: "bg-transparent mt-4",
        footerActionText: "text-muted-foreground font-sans text-xs",
    },
    variables: {
        colorPrimary: "oklch(0.769 0.188 70.08)",
        colorTextSecondary: "#a1a1aa",
        colorBackground: "transparent",
        colorTextOnPrimaryBackground: "white",
    }
}}
```

**Step 2: Visual verification**

Run: `npm run dev`
Check: Navigate to `/sign-in`
Expected:
- Social buttons (Google/GitHub) have rounded-action (8px), mono font, uppercase
- Primary button (Continue/Sign In) has Amber color, mono font, uppercase, wide tracking
- Input fields have rounded-action (8px), mono font
- Divider text ("atau") is mono, uppercase
- Footer link uses primary color (Amber)

**Step 3: Commit**

```bash
git add src/app/\(auth\)/sign-in/\[\[...sign-in\]\]/page.tsx
git commit -m "refactor(auth): migrate sign-in Clerk appearance to Mechanical Grace

- Update colorPrimary to Amber 500 (oklch 0.769 0.188 70.08)
- Apply rounded-action to buttons and inputs
- Use font-mono for form elements and buttons
- Apply uppercase + tracking-widest to primary button
- Update divider text to mono uppercase style"
```

---

## Task 5: Update Clerk Appearance - Sign Up Page

**Files:**
- Modify: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Step 1: Update clerkAppearance object**

Replace the clerkAppearance const from:
```tsx
const clerkAppearance = {
    baseTheme: isDark ? dark : undefined,
    elements: {
        rootBox: "w-full",
        card: "shadow-none border-none bg-transparent p-0 w-full",
        headerTitle: "hidden",
        headerSubtitle: "hidden",
        main: "p-0",
        formFieldRow: "!flex !flex-col !gap-4",
        socialButtonsBlockButtonBadge: "hidden",
        socialButtonsBlockButton: `rounded-lg border-border hover:bg-muted transition-colors text-sm font-medium ${isDark ? "bg-muted/50" : ""}`,
        formButtonPrimary: "bg-brand hover:opacity-90 transition-opacity text-sm font-bold h-10 shadow-none",
        formFieldInput: `rounded-lg border-border bg-background focus:ring-brand focus:border-brand transition-all ${isDark ? "bg-muted/20" : ""}`,
        footerActionLink: "text-brand hover:text-brand/80 font-bold",
        identityPreviewText: "text-foreground",
        identityPreviewEditButtonIcon: "text-brand",
        formFieldLabel: "hidden",
        formFieldHintText: "hidden",
        dividerText: "text-muted-foreground",
        footer: "bg-transparent mt-4",
        footerActionText: "text-muted-foreground",
    },
    variables: {
        colorPrimary: "oklch(0.711 0.181 125.2)",
        colorTextSecondary: "#a1a1aa",
        colorBackground: "transparent",
        colorTextOnPrimaryBackground: "white",
    }
}
```

To:
```tsx
const clerkAppearance = {
    baseTheme: isDark ? dark : undefined,
    elements: {
        rootBox: "w-full",
        card: "shadow-none border-none bg-transparent p-0 w-full",
        headerTitle: "hidden",
        headerSubtitle: "hidden",
        main: "p-0",
        formFieldRow: "!flex !flex-col !gap-4",
        socialButtonsBlockButtonBadge: "hidden",
        socialButtonsBlockButton: `rounded-action border-border hover:bg-muted transition-colors font-mono text-xs uppercase tracking-wider ${isDark ? "bg-muted/50" : ""}`,
        formButtonPrimary: "bg-primary hover:bg-primary/90 transition-colors font-mono text-xs font-bold uppercase tracking-widest h-10 shadow-none rounded-action",
        formFieldInput: `rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary transition-all ${isDark ? "bg-muted/20" : ""}`,
        footerActionLink: "text-primary hover:text-primary/80 font-bold",
        identityPreviewText: "text-foreground font-mono",
        identityPreviewEditButtonIcon: "text-primary",
        formFieldLabel: "hidden",
        formFieldHintText: "hidden",
        dividerText: "text-muted-foreground font-mono text-xs uppercase tracking-wider",
        footer: "bg-transparent mt-4",
        footerActionText: "text-muted-foreground font-sans text-xs",
    },
    variables: {
        colorPrimary: "oklch(0.769 0.188 70.08)",
        colorTextSecondary: "#a1a1aa",
        colorBackground: "transparent",
        colorTextOnPrimaryBackground: "white",
    }
}
```

**Step 2: Update InvitedUserLeftContent typography**

Change the title in InvitedUserLeftContent from:
```tsx
<h1 className="font-hero text-3xl md:text-4xl font-bold tracking-tighter text-foreground leading-[1.1]">
    Selamat datang!
</h1>
```

To:
```tsx
<h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tighter text-foreground leading-[1.1]">
    Selamat datang!
</h1>
```

**Step 3: Update InvitedUserLeftContent success badge**

Change from:
```tsx
<div className="flex items-center gap-2 text-brand">
    <CheckCircle className="h-5 w-5" />
    <span className="text-sm font-medium">Undangan Valid</span>
</div>
```

To:
```tsx
<div className="flex items-center gap-2 text-success">
    <CheckCircle className="h-5 w-5" />
    <span className="font-mono text-xs font-bold uppercase tracking-widest">UNDANGAN VALID</span>
</div>
```

**Step 4: Update email display box**

Change from:
```tsx
<div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
    <Mail className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm font-medium">{email}</span>
</div>
```

To:
```tsx
<div className="flex items-center gap-2 bg-muted/50 rounded-action px-3 py-2 border border-hairline">
    <Mail className="h-4 w-4 text-muted-foreground" />
    <span className="font-mono text-sm">{email}</span>
</div>
```

**Step 5: Update InvalidTokenContent button**

Change from:
```tsx
<Link
    href="/auth/waiting-list"
    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
>
    Daftar Waiting List
</Link>
```

To:
```tsx
<Link
    href="/waiting-list"
    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-action font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
>
    DAFTAR WAITING LIST
</Link>
```

**Step 6: Visual verification**

Run: `npm run dev`
Check: Navigate to `/sign-up` (both with and without invite token)
Expected:
- Same Mechanical Grace styling as sign-in page
- Invited user view: title in Geist Mono, success badge in emerald with mono uppercase
- Email display box has rounded-action and mono font
- Invalid token button has mono uppercase style

**Step 7: Commit**

```bash
git add src/app/\(auth\)/sign-up/\[\[...sign-up\]\]/page.tsx
git commit -m "refactor(auth): migrate sign-up Clerk appearance to Mechanical Grace

- Update colorPrimary to Amber 500
- Apply rounded-action and font-mono to form elements
- Update InvitedUserLeftContent with mono typography
- Change success badge to emerald with uppercase tracking
- Fix invalid token button styling and link path"
```

---

## Task 6: Final Verification & Documentation Update

**Files:**
- Modify: `docs/makalah-design-system/justification-docs/auth-redesign.md`

**Step 1: Run full visual verification**

Run: `npm run dev`
Check all pages:
1. `/sign-in` - Light and Dark mode
2. `/sign-up` - Light and Dark mode
3. `/sign-up?invite=test` - Invited user view
4. `/waiting-list` - Light and Dark mode

Verification checklist:
- [ ] Grid Audit: Card centered in grid system
- [ ] Typo Audit: Titles/Labels/Buttons = Geist Mono, Descriptions = Geist Sans
- [ ] Radius Audit: Card = 16px (rounded-shell), Form elements = 8px (rounded-action)
- [ ] Color Audit: Primary buttons = Amber 500, Success states = Emerald 500
- [ ] Icon Audit: All icons are Iconoir
- [ ] Interaction Audit: hover-slash on primary buttons
- [ ] Responsive Audit: 2-column layout works on mobile

**Step 2: Update migration tracker**

In `docs/makalah-design-system/justification-docs/auth-redesign.md`, update the checklist at section 4:

Change all `- [ ]` to `- [x]` for completed items.

**Step 3: Run lint check**

Run: `npm run lint`
Expected: No errors related to auth files

**Step 4: Final commit**

```bash
git add docs/makalah-design-system/justification-docs/auth-redesign.md
git commit -m "docs(auth): mark auth redesign migration as complete

- Update verification checklist in auth-redesign.md
- All auth pages migrated to Mechanical Grace standard"
```

---

## Summary

| Task | Files Modified | Key Changes |
|------|----------------|-------------|
| 1 | `layout.tsx` | Remove hero-vivid, add 48px grid pattern |
| 2 | `AuthWideCard.tsx` | rounded-shell, hairline border, mono title, diagonal stripes |
| 3 | `WaitlistForm.tsx` | rounded-action, mono fonts, hover-slash, success color |
| 4 | `sign-in/page.tsx` | Clerk appearance: Amber primary, mono fonts, rounded-action |
| 5 | `sign-up/page.tsx` | Clerk appearance + InvitedUserLeftContent styling |
| 6 | `auth-redesign.md` | Mark checklist complete |

**Total commits:** 6
**Estimated time:** 30-45 minutes
