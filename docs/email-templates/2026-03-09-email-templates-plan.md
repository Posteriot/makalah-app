# Email Templates Admin Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable superadmin/admin to visually edit all 12 email templates (layout, colors, content) from the admin panel, with live preview and test email functionality.

**Architecture:** Global brand settings + per-template content stored in Convex. Admin edits via React Email + Custom Form Builder in `/dashboard`. On save, Next.js API pre-renders React Email to HTML with `{{placeholders}}`. At send time, Convex fetches pre-rendered HTML, replaces placeholders, sends via Resend. Fallback to hardcoded HTML if template missing.

**Tech Stack:** Convex (DB + mutations), React Email (`@react-email/components`), Next.js API routes (pre-render + preview + send-test), shadcn/ui (admin form components), Iconoir (icons).

**Design Doc:** `docs/email-templates/2026-03-09-email-templates-design.md`

---

## Task 1: Add Database Schema

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add emailBrandSettings and emailTemplates tables to schema**

Add after the existing `siteConfig` table definition in `convex/schema.ts`:

```typescript
emailBrandSettings: defineTable({
  logoUrl: v.optional(v.string()),
  logoStorageId: v.optional(v.id("_storage")),
  appName: v.string(),
  primaryColor: v.string(),
  secondaryColor: v.string(),
  backgroundColor: v.string(),
  contentBackgroundColor: v.string(),
  textColor: v.string(),
  mutedTextColor: v.string(),
  fontFamily: v.string(),
  footerText: v.string(),
  footerLinks: v.array(v.object({
    label: v.string(),
    url: v.string(),
  })),
  updatedBy: v.id("users"),
  updatedAt: v.number(),
}),

emailTemplates: defineTable({
  templateType: v.string(),
  subject: v.string(),
  sections: v.array(v.object({
    id: v.string(),
    type: v.string(),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    label: v.optional(v.string()),
    style: v.optional(v.object({
      backgroundColor: v.optional(v.string()),
      textColor: v.optional(v.string()),
      fontSize: v.optional(v.string()),
      textAlign: v.optional(v.string()),
      padding: v.optional(v.string()),
    })),
    rows: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
  })),
  availablePlaceholders: v.array(v.object({
    key: v.string(),
    description: v.string(),
    example: v.string(),
  })),
  preRenderedHtml: v.string(),
  isActive: v.boolean(),
  version: v.number(),
  updatedBy: v.id("users"),
  updatedAt: v.number(),
})
.index("by_templateType", ["templateType"])
.index("by_active", ["isActive", "templateType"]),
```

**Step 2: Verify schema compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/email-templates && npx convex dev --once`
Expected: Schema pushes without errors.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(email-templates): add emailBrandSettings and emailTemplates schema tables"
```

---

## Task 2: Create Convex CRUD — emailBrandSettings

**Files:**
- Create: `convex/emailBrandSettings.ts`

**Step 1: Create the Convex file with queries and mutations**

```typescript
// convex/emailBrandSettings.ts
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"

// Default brand settings
const DEFAULTS = {
  appName: "Makalah AI",
  primaryColor: "#2563eb",
  secondaryColor: "#16a34a",
  backgroundColor: "#f8fafc",
  contentBackgroundColor: "#ffffff",
  textColor: "#1e293b",
  mutedTextColor: "#64748b",
  fontFamily: "Geist, Arial, sans-serif",
  footerText: "© 2026 Makalah AI. All rights reserved.",
  footerLinks: [
    { label: "Website", url: "https://makalah.ai" },
    { label: "Bantuan", url: "https://makalah.ai/documentation" },
  ],
} as const

export const getBrandSettings = query({
  args: {},
  handler: async ({ db }) => {
    const settings = await db.query("emailBrandSettings").first()
    if (!settings) return { ...DEFAULTS, _id: null }
    return settings
  },
})

export const getBrandSettingsInternal = query({
  args: {},
  handler: async ({ db }) => {
    const settings = await db.query("emailBrandSettings").first()
    return settings ?? DEFAULTS
  },
})

export const upsertBrandSettings = mutation({
  args: {
    requestorId: v.id("users"),
    appName: v.string(),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    backgroundColor: v.string(),
    contentBackgroundColor: v.string(),
    textColor: v.string(),
    mutedTextColor: v.string(),
    fontFamily: v.string(),
    footerText: v.string(),
    footerLinks: v.array(v.object({
      label: v.string(),
      url: v.string(),
    })),
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async ({ db }, args) => {
    await requireRole(db, args.requestorId, "admin")
    const { requestorId, ...data } = args
    const existing = await db.query("emailBrandSettings").first()
    const now = Date.now()

    if (existing) {
      await db.patch(existing._id, { ...data, updatedBy: requestorId, updatedAt: now })
      return existing._id
    }

    return await db.insert("emailBrandSettings", {
      ...data,
      updatedBy: requestorId,
      updatedAt: now,
    })
  },
})
```

**Step 2: Verify it compiles**

Run: `npx convex dev --once`
Expected: No errors.

**Step 3: Commit**

```bash
git add convex/emailBrandSettings.ts
git commit -m "feat(email-templates): add emailBrandSettings Convex CRUD"
```

---

## Task 3: Create Convex CRUD — emailTemplates

**Files:**
- Create: `convex/emailTemplates.ts`

**Step 1: Create the Convex file**

Contains:
- `getTemplateByType(templateType)` — public query
- `getAllTemplates()` — admin query (for list view)
- `getTemplatesByGroup(group)` — admin query (auth/payment/notification)
- `upsertTemplate(...)` — admin mutation (create or update)
- `getActiveTemplate(templateType)` — internal query for email sending
- Template type constants and group mapping

Key implementation details:
- `requireRole(db, requestorId, "admin")` on all admin operations
- `getActiveTemplate` used by email senders: filters `isActive=true` + exact `templateType`
- Group mapping: `auth: ["verification", "magic_link", "password_reset", "two_factor_otp", "signup_success", "waitlist_confirmation"]`, `notification: ["waitlist_invite", "waitlist_admin", "technical_report_dev", "technical_report_user"]`, `payment: ["payment_success", "payment_failed"]`

**Step 2: Verify it compiles**

Run: `npx convex dev --once`

**Step 3: Commit**

```bash
git add convex/emailTemplates.ts
git commit -m "feat(email-templates): add emailTemplates Convex CRUD with group queries"
```

---

## Task 4: Create Dynamic React Email Renderer

**Files:**
- Create: `src/lib/email/template-renderer.ts`

**Step 1: Create the dynamic renderer**

This file takes brand settings + template sections and builds a React Email component tree dynamically, then calls `render()` to produce HTML.

Key functions:
- `renderTemplateSections(brandSettings, sections)` — builds React Email JSX from section array
- `renderEmailTemplate(brandSettings, subject, sections)` — wraps in EmailLayout-like structure, returns HTML string
- Section type → React Email component mapping:
  - `heading` → `<Heading>` with brand textColor
  - `paragraph` → `<Text>` with brand textColor
  - `button` → `<Button>` with brand primaryColor
  - `divider` → `<Hr>`
  - `info_box` → `<Section>` with background
  - `otp_code` → `<Text>` with monospace, large font
  - `detail_row` → `<Section>` with label/value pairs
- Per-section `style` overrides merge with brand defaults
- `{{placeholders}}` kept as literal text in output (not replaced here)

Important: Use `render()` from `@react-email/components`. Import all needed components (`Html, Head, Preview, Body, Container, Section, Heading, Text, Button, Hr, Link`).

**Step 2: Test manually by importing in a scratch file or writing a unit test**

Create `__tests__/email-template-renderer.test.ts`:
- Test: renders heading section
- Test: renders button with brand primaryColor
- Test: preserves `{{placeholder}}` text
- Test: applies style overrides

Run: `npx vitest run __tests__/email-template-renderer.test.ts`

**Step 3: Commit**

```bash
git add src/lib/email/template-renderer.ts __tests__/email-template-renderer.test.ts
git commit -m "feat(email-templates): add dynamic React Email renderer with tests"
```

---

## Task 5: Create Template Helpers (fetch + replace placeholders)

**Files:**
- Create: `src/lib/email/template-helpers.ts`

**Step 1: Create helpers**

```typescript
// src/lib/email/template-helpers.ts
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"

/**
 * Replace {{placeholders}} in a string with actual values.
 * Unknown placeholders are left as-is.
 */
export function replacePlaceholders(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
}

/**
 * Fetch pre-rendered template from DB and replace placeholders.
 * Returns null if template not found or inactive (caller should use fallback).
 */
export async function fetchTemplateAndRender(
  templateType: string,
  data: Record<string, string>
): Promise<{ subject: string; html: string } | null> {
  try {
    const template = await fetchQuery(api.emailTemplates.getActiveTemplate, { templateType })
    if (!template || !template.preRenderedHtml) return null

    return {
      subject: replacePlaceholders(template.subject, data),
      html: replacePlaceholders(template.preRenderedHtml, data),
    }
  } catch (error) {
    console.error(`[Email Template] Failed to fetch template "${templateType}":`, error)
    return null
  }
}
```

**Step 2: Write tests**

Create `__tests__/email-template-helpers.test.ts`:
- Test: `replacePlaceholders` replaces known keys
- Test: `replacePlaceholders` preserves unknown `{{keys}}`
- Test: `replacePlaceholders` handles empty data

Run: `npx vitest run __tests__/email-template-helpers.test.ts`

**Step 3: Commit**

```bash
git add src/lib/email/template-helpers.ts __tests__/email-template-helpers.test.ts
git commit -m "feat(email-templates): add template fetch + placeholder replacement helpers"
```

---

## Task 6: Create Seed Migration

**Files:**
- Create: `convex/migrations/seedEmailTemplates.ts`

**Step 1: Create seed migration**

Pattern follows `convex/migrations/seedDefaultAIConfig.ts` — uses `internalMutationGeneric`.

The seed must:
1. Check if brand settings already exist → skip if so
2. Check if templates already exist → skip if so
3. Find first superadmin for `updatedBy`
4. Insert default brand settings (matching existing `EmailLayout.tsx` colors)
5. Insert 12 email templates with:
   - `templateType` — unique identifier
   - `subject` — from current hardcoded subjects in `authEmails.ts` / `sendPaymentEmail.ts`
   - `sections` — converted from current inline HTML structure
   - `availablePlaceholders` — per-template placeholder metadata with descriptions + examples
   - `preRenderedHtml` — empty string initially (will be populated when admin first saves)
   - `isActive: false` — not active until admin reviews and saves (fallback used until then)
   - `version: 1`

Extract content from existing emails in `convex/authEmails.ts` (lines 30-257) and `src/lib/email/templates/PaymentSuccessEmail.tsx` / `PaymentFailedEmail.tsx`.

Run with: `npx convex run migrations/seedEmailTemplates:seedEmailTemplates`

**Step 2: Verify migration runs**

Run: `npx convex run migrations/seedEmailTemplates:seedEmailTemplates`
Expected: "Success! Created 12 templates + brand settings"

**Step 3: Commit**

```bash
git add convex/migrations/seedEmailTemplates.ts
git commit -m "feat(email-templates): add seed migration for 12 default email templates"
```

---

## Task 7: Create API Routes (Preview, Render, Send Test)

**Files:**
- Create: `src/app/api/admin/email-templates/preview/route.ts`
- Create: `src/app/api/admin/email-templates/render/route.ts`
- Create: `src/app/api/admin/email-templates/send-test/route.ts`

**Step 1: Create preview route**

`POST /api/admin/email-templates/preview`

- Auth: check session via `isAuthenticated()` from `src/lib/auth-server.ts`
- Input: `{ sections, brandSettings }` (from form state, not DB)
- Process: call `renderEmailTemplate(brandSettings, "Preview", sections)` from `template-renderer.ts`
- Output: `{ html: string }`

**Step 2: Create render route**

`POST /api/admin/email-templates/render`

- Auth: same
- Input: `{ sections, brandSettings }`
- Process: same as preview but returns HTML meant for storage
- Output: `{ preRenderedHtml: string }`

Note: Preview and render are functionally identical. They could be merged into one route. But keeping separate provides clearer intent and allows future divergence (e.g., render could add email-client-specific optimizations).

**Step 3: Create send-test route**

`POST /api/admin/email-templates/send-test`

- Auth: check session + fetch user to get email and verify admin role
- Input: `{ templateType, sections, brandSettings }`
- Process:
  1. Render HTML via `renderEmailTemplate()`
  2. Get `availablePlaceholders` for templateType → use `.example` values to populate
  3. Call `replacePlaceholders(html, exampleData)`
  4. Get subject from request, `replacePlaceholders(subject, exampleData)`
  5. Send via Resend: `to: admin's email`, `subject: "[TEST] " + subject`, `html`
- Output: `{ success: boolean, sentTo: string }`
- Rate limit: track per-admin send count (simple in-memory Map, reset every 60s, max 5)

**Step 4: Commit**

```bash
git add src/app/api/admin/email-templates/
git commit -m "feat(email-templates): add preview, render, and send-test API routes"
```

---

## Task 8: Add Admin Panel Tab Configuration

**Files:**
- Modify: `src/components/admin/adminPanelConfig.ts` (lines 1-198)
- Modify: `src/components/admin/AdminContentSection.tsx` (lines 1-120)

**Step 1: Add Mail icon import and Email Templates tab to adminPanelConfig.ts**

Add `Mail` to the Iconoir import (line 1-15). Add new sidebar item before the `stats` entry (before line 136):

```typescript
{
  id: "email-templates",
  label: "Email Templates",
  icon: Mail,
  headerTitle: "Email Templates",
  headerDescription: "Kelola template email yang dikirim ke pengguna",
  headerIcon: Mail,
  defaultChildId: "email-templates.brand",
  children: [
    {
      id: "email-templates.brand",
      label: "Brand Settings",
      icon: Settings,  // already imported
      headerTitle: "Email Brand Settings",
      headerDescription: "Atur branding global untuk semua email",
      headerIcon: Settings,
    },
    {
      id: "email-templates.auth",
      label: "Auth Emails",
      icon: Mail,
      headerTitle: "Auth Emails",
      headerDescription: "Template email autentikasi (verifikasi, magic link, 2FA, dll)",
      headerIcon: Mail,
    },
    {
      id: "email-templates.payment",
      label: "Payment Emails",
      icon: CreditCard,  // already imported
      headerTitle: "Payment Emails",
      headerDescription: "Template email pembayaran berhasil dan gagal",
      headerIcon: CreditCard,
    },
    {
      id: "email-templates.notification",
      label: "Notification Emails",
      icon: WarningCircle,  // already imported
      headerTitle: "Notification Emails",
      headerDescription: "Template email notifikasi (waitlist, technical report)",
      headerIcon: WarningCircle,
    },
  ],
},
```

Update `AdminTabId` type to include new IDs:
```typescript
| "email-templates"
| "email-templates.brand"
| "email-templates.auth"
| "email-templates.payment"
| "email-templates.notification"
```

**Step 2: Add render cases in AdminContentSection.tsx**

Add import: `import { EmailTemplatesManager } from "./email-templates/EmailTemplatesManager"`

Add render blocks after `technical-report` case (after line 96):

```typescript
{activeTab === "email-templates.brand" && (
  <EmailTemplatesManager userId={userId} activeView="brand" />
)}
{activeTab === "email-templates.auth" && (
  <EmailTemplatesManager userId={userId} activeView="auth" />
)}
{activeTab === "email-templates.payment" && (
  <EmailTemplatesManager userId={userId} activeView="payment" />
)}
{activeTab === "email-templates.notification" && (
  <EmailTemplatesManager userId={userId} activeView="notification" />
)}
```

**Step 3: Commit**

```bash
git add src/components/admin/adminPanelConfig.ts src/components/admin/AdminContentSection.tsx
git commit -m "feat(email-templates): register Email Templates tab in admin panel"
```

---

## Task 9: Create EmailTemplatesManager (Tab Router)

**Files:**
- Create: `src/components/admin/email-templates/EmailTemplatesManager.tsx`

**Step 1: Create the router component**

```typescript
"use client"

import type { Id } from "@convex/_generated/dataModel"
import { EmailBrandSettingsEditor } from "./EmailBrandSettingsEditor"
import { EmailTemplateList } from "./EmailTemplateList"

type ActiveView = "brand" | "auth" | "payment" | "notification"

interface EmailTemplatesManagerProps {
  userId: Id<"users">
  activeView: ActiveView
}

export function EmailTemplatesManager({ userId, activeView }: EmailTemplatesManagerProps) {
  if (activeView === "brand") {
    return <EmailBrandSettingsEditor userId={userId} />
  }

  return <EmailTemplateList userId={userId} group={activeView} />
}
```

This is a simple router. The `activeView` prop comes from `AdminContentSection` based on which child tab is active.

**Step 2: Create stub files for sub-components**

Create `EmailBrandSettingsEditor.tsx` and `EmailTemplateList.tsx` as stubs (return placeholder text) so the import compiles.

**Step 3: Verify build compiles**

Run: `npx next build`
Expected: No TypeScript errors.

**Step 4: Commit**

```bash
git add src/components/admin/email-templates/
git commit -m "feat(email-templates): add EmailTemplatesManager router + stub components"
```

---

## Task 10: Create EmailBrandSettingsEditor

**Files:**
- Create: `src/components/admin/email-templates/EmailBrandSettingsEditor.tsx`

**Step 1: Build the brand editor form**

Pattern follows `HeroSectionEditor.tsx` — Wrapper (data fetch + loading) → Form (state + save).

Form fields:
- `appName` — Input
- 6 color fields — Input type="color" + text input (hex value) side by side
- `fontFamily` — Select dropdown (Geist / Arial / system default)
- `footerText` — Textarea
- `footerLinks` — Dynamic list (label + url pairs, add/remove)
- Logo upload — CmsImageUpload component
- Live preview card — Shows a mini email preview using brand colors
- CmsSaveButton at bottom

Data: `useQuery(api.emailBrandSettings.getBrandSettings)` for initial state.
Save: `useMutation(api.emailBrandSettings.upsertBrandSettings)`.

Use Skeleton loading when query returns `undefined`.

**Step 2: Commit**

```bash
git add src/components/admin/email-templates/EmailBrandSettingsEditor.tsx
git commit -m "feat(email-templates): add EmailBrandSettingsEditor with color pickers and footer editor"
```

---

## Task 11: Create EmailTemplateList

**Files:**
- Create: `src/components/admin/email-templates/EmailTemplateList.tsx`

**Step 1: Build the template list**

Displays a list of email templates filtered by group (`auth` | `payment` | `notification`).

Each template card shows:
- Template name (human-readable label derived from `templateType`)
- Active/inactive badge
- Last updated timestamp
- Click → navigates to `EmailTemplateEditor` (via state in parent or internal state)

Implementation:
- `useQuery(api.emailTemplates.getTemplatesByGroup, { group })` for data
- Internal `selectedTemplate` state — when clicked, render `EmailTemplateEditor` instead of list
- Back button to return to list

Template type → label mapping:
```typescript
const TEMPLATE_LABELS: Record<string, string> = {
  verification: "Verifikasi Email",
  magic_link: "Magic Link",
  password_reset: "Reset Password",
  two_factor_otp: "Kode 2FA",
  signup_success: "Pendaftaran Berhasil",
  waitlist_confirmation: "Konfirmasi Waitlist",
  waitlist_invite: "Undangan Waitlist",
  waitlist_admin: "Notifikasi Admin Waitlist",
  technical_report_dev: "Laporan Teknis (Developer)",
  technical_report_user: "Laporan Teknis (User)",
  payment_success: "Pembayaran Berhasil",
  payment_failed: "Pembayaran Gagal",
}
```

**Step 2: Commit**

```bash
git add src/components/admin/email-templates/EmailTemplateList.tsx
git commit -m "feat(email-templates): add EmailTemplateList with group filtering"
```

---

## Task 12: Create Section Editors (7 types)

**Files:**
- Create: `src/components/admin/email-templates/section-editors/HeadingSectionEditor.tsx`
- Create: `src/components/admin/email-templates/section-editors/ParagraphSectionEditor.tsx`
- Create: `src/components/admin/email-templates/section-editors/ButtonSectionEditor.tsx`
- Create: `src/components/admin/email-templates/section-editors/DividerSectionEditor.tsx`
- Create: `src/components/admin/email-templates/section-editors/InfoBoxSectionEditor.tsx`
- Create: `src/components/admin/email-templates/section-editors/OtpCodeSectionEditor.tsx`
- Create: `src/components/admin/email-templates/section-editors/DetailRowSectionEditor.tsx`
- Create: `src/components/admin/email-templates/section-editors/index.ts`

**Step 1: Create each section editor**

Each editor receives props:
```typescript
interface SectionEditorProps {
  section: EmailSection  // type from emailTemplates schema
  onChange: (updated: EmailSection) => void
  onDelete: () => void
}
```

Per editor:
- **Heading**: content Textarea (1 line)
- **Paragraph**: content Textarea (multi-line, supports `{{placeholders}}`)
- **Button**: label Input + url Input
- **Divider**: No editable fields, just a visual indicator + delete
- **InfoBox**: content Textarea + backgroundColor color picker
- **OtpCode**: content Input (default `{{otpCode}}`, usually not edited)
- **DetailRow**: Dynamic list of label + value pairs (add/remove rows)

Each has a drag handle area (for reordering), section type badge, and delete (Trash icon) button.

**Step 2: Create index barrel export**

```typescript
// index.ts
export { HeadingSectionEditor } from "./HeadingSectionEditor"
export { ParagraphSectionEditor } from "./ParagraphSectionEditor"
// ... etc
```

**Step 3: Commit**

```bash
git add src/components/admin/email-templates/section-editors/
git commit -m "feat(email-templates): add 7 section type editors for email template builder"
```

---

## Task 13: Create EmailTemplateEditor (Split-View)

**Files:**
- Create: `src/components/admin/email-templates/EmailTemplateEditor.tsx`
- Create: `src/components/admin/email-templates/EmailPreviewPanel.tsx`
- Create: `src/components/admin/email-templates/PlaceholderReference.tsx`
- Create: `src/components/admin/email-templates/SendTestEmailButton.tsx`
- Create: `src/components/admin/email-templates/AddSectionButton.tsx`

**Step 1: Create EmailTemplateEditor**

Split-view layout: left form (50%) + right preview (50%).

Left panel (scrollable):
1. Subject line Input (with placeholder chips reference)
2. Sections list — map each section to its type-specific editor from Task 12
3. AddSectionButton — dropdown with section types to add
4. PlaceholderReference panel — shows available placeholders for this template
5. Action buttons: SendTestEmailButton + CmsSaveButton

State management:
- `subject` string state
- `sections` array state (with add/remove/reorder/update)
- `isActive` boolean state

On Save:
1. POST `/api/admin/email-templates/render` with `{ sections, brandSettings }` → get `preRenderedHtml`
2. Call `useMutation(api.emailTemplates.upsertTemplate)` with all data including `preRenderedHtml`
3. Toast success/error

Data fetching:
- Template: `useQuery(api.emailTemplates.getTemplateByType, { templateType })`
- Brand settings: `useQuery(api.emailBrandSettings.getBrandSettings)` (for preview + render)

**Step 2: Create EmailPreviewPanel**

- Receives `sections` and `brandSettings` as props
- Debounces 300ms on prop changes
- POSTs to `/api/admin/email-templates/preview` → gets HTML
- Renders in `<iframe srcDoc={html} />` with fixed height, border, and `sandbox` attribute
- Shows Skeleton while loading

**Step 3: Create PlaceholderReference**

- Receives `availablePlaceholders` array
- Renders each as a clickable chip: `{{key}}` — on click, copies to clipboard
- Shows description on hover (title attribute)

**Step 4: Create SendTestEmailButton**

- Button that POSTs to `/api/admin/email-templates/send-test`
- Uses current form state (not saved state)
- Shows loading spinner during send
- Toast: "Email test terkirim ke {email}"
- Disabled if no sections

**Step 5: Create AddSectionButton**

- Dropdown menu (shadcn `DropdownMenu`) with section types
- On select, appends new section with default values to sections array
- Generates unique `id` for new section (nanoid or `crypto.randomUUID()`)

**Step 6: Commit**

```bash
git add src/components/admin/email-templates/EmailTemplateEditor.tsx \
        src/components/admin/email-templates/EmailPreviewPanel.tsx \
        src/components/admin/email-templates/PlaceholderReference.tsx \
        src/components/admin/email-templates/SendTestEmailButton.tsx \
        src/components/admin/email-templates/AddSectionButton.tsx
git commit -m "feat(email-templates): add split-view EmailTemplateEditor with preview + test + sections"
```

---

## Task 14: Wire Up Email Senders to Use DB Templates

**Files:**
- Modify: `convex/authEmails.ts` (lines 1-257)
- Modify: `src/lib/email/sendPaymentEmail.ts` (lines 1-154)

**Step 1: Create Convex-side template helper**

Add to `convex/emailTemplates.ts`:

```typescript
/**
 * Fetch active template and replace placeholders.
 * Returns null if template not found (caller uses fallback).
 * For use in Convex actions (authEmails.ts, etc.)
 */
export async function fetchAndRenderTemplate(
  db: DatabaseReader,
  templateType: string,
  data: Record<string, string>
): Promise<{ subject: string; html: string } | null> {
  const template = await db
    .query("emailTemplates")
    .withIndex("by_active", (q) => q.eq("isActive", true).eq("templateType", templateType))
    .first()

  if (!template?.preRenderedHtml) return null

  const replacer = (_: string, key: string) => data[key] ?? `{{${key}}}`
  return {
    subject: template.subject.replace(/\{\{(\w+)\}\}/g, replacer),
    html: template.preRenderedHtml.replace(/\{\{(\w+)\}\}/g, replacer),
  }
}
```

Note: This requires `DatabaseReader` — but `authEmails.ts` functions run in HTTP action context where they don't have `db`. Two solutions:
- **(A)** Change auth email functions to accept `db` parameter and pass from HTTP handler
- **(B)** Use `fetchQuery` from Convex HTTP action context

Pick the approach that fits the existing `convex/auth.ts` callback pattern. Check how `authEmails` functions are called — they're called from BetterAuth callbacks which run in HTTP action context. Use approach (B) via `internal.emailTemplates.getActiveTemplate` internalQuery.

**Step 2: Update each sender function in authEmails.ts**

For each of the 10 functions, add template fetch with fallback:

```typescript
export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  // Try DB template first
  // ... fetch active template for "verification"
  // If found, use it. If not, fall through to hardcoded HTML below.

  // Existing hardcoded HTML (kept as fallback)
  await sendViaResend(
    email,
    "Verifikasi Email — Makalah AI",
    `<p>Klik link berikut...</p>`
  );
}
```

Important: The existing `sendViaResend` helper only takes `(to, subject, html)`. The template fetch needs to happen before this call. Since these run in Convex HTTP action context, we need an approach that works without React Email runtime.

Strategy: Since `authEmails.ts` functions are called from BetterAuth callbacks in `convex/auth.ts`, and these callbacks receive `ctx` (ConvexHttpEndpointCtx), we can:
1. Pass `ctx` or `ctx.runQuery` to auth email functions
2. Use `ctx.runQuery(internal.emailTemplates.getActiveTemplate, { templateType })` to fetch template
3. If template found → use it, else → use hardcoded fallback

This is the cleanest approach and requires modifying function signatures to accept a query runner.

**Step 3: Update sendPaymentEmail.ts**

Similar pattern but simpler since this runs in Next.js server context:
- Use `fetchQuery(api.emailTemplates.getActiveTemplate, { templateType: "payment_success" })`
- If template found → `replacePlaceholders()` → send
- Else → existing React Email render flow (current behavior)

**Step 4: Log fallback alerts**

When template not found, log to `systemAlerts`:
```typescript
await fetchMutation(api.systemAlerts.createAlert, {
  alertType: "email_template_fallback",
  severity: "warning",
  message: `Template "${templateType}" not found, using fallback`,
  source: "email-templates",
})
```

**Step 5: Commit**

```bash
git add convex/authEmails.ts convex/emailTemplates.ts src/lib/email/sendPaymentEmail.ts
git commit -m "feat(email-templates): wire email senders to use DB templates with fallback"
```

---

## Task 15: End-to-End Testing

**Step 1: Run build**

Run: `npm run build`
Expected: No TypeScript or build errors.

**Step 2: Run lint**

Run: `npm run lint`
Expected: No lint errors (fix any that appear).

**Step 3: Run existing tests**

Run: `npm run test`
Expected: All existing tests pass. New tests from Tasks 4-5 also pass.

**Step 4: Manual test — seed migration**

Run: `npx convex run migrations/seedEmailTemplates:seedEmailTemplates`
Expected: 12 templates + brand settings created.

**Step 5: Manual test — admin panel**

1. Open `/dashboard` → Email Templates tab should appear in sidebar
2. Brand Settings → should load defaults → edit a color → save → verify persisted
3. Auth Emails → should list 6 templates
4. Click a template → editor opens with split view
5. Edit subject/sections → preview updates live
6. Click "Kirim Test" → check admin email inbox
7. Save → verify `preRenderedHtml` stored in Convex dashboard

**Step 6: Manual test — email sending with template**

1. Activate a template (e.g., verification)
2. Trigger the email (sign up new user)
3. Check inbox → should use DB template instead of hardcoded HTML
4. Deactivate template → trigger again → should fallback to hardcoded
5. Check system alerts → fallback alert should appear

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix(email-templates): address issues found during e2e testing"
```

---

## Task 16: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add Email Templates section to CLAUDE.md**

Add under "## Important Patterns" or as new section:

```markdown
## Email Templates

Database-driven email template system with admin panel editor and fallback to hardcoded HTML.

### Architecture
- **Brand Settings**: Global branding (colors, fonts, footer) in `emailBrandSettings` table
- **Templates**: 12 email templates with sections + pre-rendered HTML in `emailTemplates` table
- **Pre-render**: On admin save, React Email renders sections → HTML stored in DB
- **Send**: Fetch pre-rendered HTML → replace `{{placeholders}}` → send via Resend
- **Fallback**: If template not found → use hardcoded HTML + log `systemAlerts`

### Key Files
- `convex/emailBrandSettings.ts` — Brand settings CRUD
- `convex/emailTemplates.ts` — Template CRUD + `fetchAndRenderTemplate()`
- `src/lib/email/template-renderer.ts` — Dynamic React Email renderer
- `src/lib/email/template-helpers.ts` — `fetchTemplateAndRender()`, `replacePlaceholders()`
- `src/components/admin/email-templates/` — Admin UI components
- `src/app/api/admin/email-templates/` — Preview, render, send-test API routes
- `convex/migrations/seedEmailTemplates.ts` — Seed default templates

### Admin Panel
Location: `/dashboard` → Email Templates tab (4 sub-tabs: Brand, Auth, Payment, Notification)

### Template Types
auth: verification, magic_link, password_reset, two_factor_otp, signup_success, waitlist_confirmation
notification: waitlist_invite, waitlist_admin, technical_report_dev, technical_report_user
payment: payment_success, payment_failed
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Email Templates section to CLAUDE.md"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Database schema | — |
| 2 | emailBrandSettings CRUD | 1 |
| 3 | emailTemplates CRUD | 1 |
| 4 | Dynamic React Email renderer | — |
| 5 | Template helpers (fetch + replace) | 3 |
| 6 | Seed migration | 2, 3 |
| 7 | API routes (preview, render, send-test) | 4 |
| 8 | Admin panel tab config | — |
| 9 | EmailTemplatesManager router | 8 |
| 10 | EmailBrandSettingsEditor | 2, 9 |
| 11 | EmailTemplateList | 3, 9 |
| 12 | Section editors (7 types) | — |
| 13 | EmailTemplateEditor (split-view) | 7, 11, 12 |
| 14 | Wire up email senders | 3, 5 |
| 15 | End-to-end testing | All above |
| 16 | Update CLAUDE.md | All above |

**Parallelizable groups:**
- Tasks 1-3 (schema + CRUD) → sequential
- Task 4 (renderer) can run parallel with 1-3
- Task 8 (config) can run parallel with 1-4
- Tasks 10-13 (UI) can run after 8-9
- Task 14 (wire-up) after 3+5
