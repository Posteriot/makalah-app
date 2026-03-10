# Email Templates Admin Integration — Design Document

**Date:** 2026-03-09
**Status:** Approved
**Branch:** email-templates

## Overview

Integrasi email template management ke admin panel (`/dashboard`), sehingga superadmin/admin bisa mengedit layout, warna, font, spacing, dan konten seluruh email yang dikirim ke user — secara visual dan konsisten dari satu tempat.

## Key Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope editing | Full visual editor (layout, colors, fonts, spacing, content) |
| 2 | Location | Admin Panel (`/dashboard`) — new tab |
| 3 | Technology | React Email + Custom Form Builder (zero new dependency) |
| 4 | Granularity | Global branding + per-template content editing |
| 5 | Convex handling | Pre-render HTML with placeholders, stored in DB |
| 6 | Phase 1 scope | All 12 emails at once |
| 7 | Preview & testing | Live preview + send test email to admin |

## Data Model

### Table: `emailBrandSettings`

Single row — global branding applied to all emails.

```typescript
emailBrandSettings: defineTable({
  // Branding
  logoUrl: v.optional(v.string()),
  logoStorageId: v.optional(v.id("_storage")),
  appName: v.string(),                     // "Makalah AI"

  // Colors (hex)
  primaryColor: v.string(),                // CTA button, links — default "#2563eb"
  secondaryColor: v.string(),              // Secondary accents — default "#16a34a"
  backgroundColor: v.string(),             // Email body bg — default "#f8fafc"
  contentBackgroundColor: v.string(),      // Content area bg — default "#ffffff"
  textColor: v.string(),                   // Body text — default "#1e293b"
  mutedTextColor: v.string(),              // Secondary text — default "#64748b"

  // Typography
  fontFamily: v.string(),                  // default "Geist, Arial, sans-serif"

  // Footer
  footerText: v.string(),                  // "© 2026 Makalah AI. All rights reserved."
  footerLinks: v.array(v.object({
    label: v.string(),
    url: v.string(),
  })),

  // Meta
  updatedBy: v.id("users"),
  updatedAt: v.number(),
})
```

### Table: `emailTemplates`

One row per email type (12 rows total).

```typescript
emailTemplates: defineTable({
  templateType: v.string(),   // unique: "verification" | "magic_link" | etc.

  // Content
  subject: v.string(),        // supports {{placeholders}}
  sections: v.array(v.object({
    id: v.string(),           // unique within template
    type: v.string(),         // "heading" | "paragraph" | "button" | "divider" | "info_box" | "otp_code" | "detail_row"
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

  // Placeholders metadata
  availablePlaceholders: v.array(v.object({
    key: v.string(),
    description: v.string(),
    example: v.string(),
  })),

  // Pre-rendered output
  preRenderedHtml: v.string(),

  // Meta
  isActive: v.boolean(),
  version: v.number(),
  updatedBy: v.id("users"),
  updatedAt: v.number(),
})
.index("by_templateType", ["templateType"])
.index("by_active", ["isActive", "templateType"])
```

### Section Types

| Type | Purpose | Fields Used |
|------|---------|-------------|
| `heading` | Large title | `content` |
| `paragraph` | Body text | `content` |
| `button` | CTA button | `label`, `url` |
| `divider` | Separator line | — |
| `info_box` | Highlighted box | `content`, `style.backgroundColor` |
| `otp_code` | OTP display (Geist Mono, large) | `content` (placeholder `{{otpCode}}`) |
| `detail_row` | Key-value data table | `rows` |

### Placeholders Per Template

| Template | Type | Placeholders |
|----------|------|-------------|
| `verification` | Auth | `userName`, `verificationUrl`, `appName` |
| `magic_link` | Auth | `email`, `magicLinkUrl`, `appName`, `expiryMinutes` |
| `password_reset` | Auth | `resetUrl`, `appName` |
| `two_factor_otp` | Auth | `otpCode`, `appName` |
| `signup_success` | Auth | `userName`, `appName`, `loginUrl` |
| `waitlist_confirmation` | Auth | `firstName`, `appName` |
| `waitlist_invite` | Notification | `firstName`, `signupUrl`, `appName` |
| `waitlist_admin` | Notification | `eventLabel`, `entryEmail`, `entryName`, `appName` |
| `technical_report_dev` | Notification | `reportId`, `status`, `userEmail`, `summary`, `appUrl` |
| `technical_report_user` | Notification | `reportId`, `status`, `appName` |
| `payment_success` | Payment | `userName`, `amount`, `credits`, `newTotalCredits`, `subscriptionPlanLabel`, `transactionId`, `paidAt`, `appUrl` |
| `payment_failed` | Payment | `userName`, `amount`, `failureReason`, `transactionId`, `appUrl` |

## Pre-Render Pipeline

### Save Flow (Admin → DB)

```
Admin Save Template
        │
        ▼
  POST /api/admin/email-templates/render
        │
        ├─ Fetch emailBrandSettings from Convex
        ├─ Build React Email component tree from sections + brand
        ├─ render() → HTML string (placeholders kept as literal text)
        │
        ▼
  Return preRenderedHtml
        │
        ▼
  Convex mutation: saveEmailTemplate
        └─ Store sections + preRenderedHtml + metadata
```

### Send Flow (Runtime)

```
Trigger (auth callback / webhook / action)
        │
        ▼
  Fetch emailTemplates.by_templateType(type) from Convex
        │
        ├─ Get preRenderedHtml + subject
        ├─ Replace {{placeholders}} with actual values
        │   └─ regex: html.replace(/\{\{(\w+)\}\}/g, replacer)
        │
        ▼
  Send via Resend API (fetch)
        └─ { from, to, subject, html }
```

### Helper Function

```typescript
function renderEmailWithData(
  preRenderedHtml: string,
  subject: string,
  data: Record<string, string>
): { html: string; subject: string } {
  const replacer = (_: string, key: string) => data[key] ?? `{{${key}}}`
  return {
    html: preRenderedHtml.replace(/\{\{(\w+)\}\}/g, replacer),
    subject: subject.replace(/\{\{(\w+)\}\}/g, replacer),
  }
}
```

## Admin UI

### Tab Structure in Admin Panel

```
Admin Sidebar
├── ...existing tabs...
├── Email Templates              ← NEW (parent)
│   ├── Brand Settings           ← Global branding editor
│   ├── Auth Emails              ← 6 auth templates
│   ├── Payment Emails           ← 2 payment templates
│   └── Notification Emails      ← 4 notification templates
└── Content Manager → /cms
```

### Editor Layout (Split View)

```
┌─────────────────────────────────────────────────────┐
│  Email Templates > Auth Emails > Verifikasi Email   │
├──────────────────────┬──────────────────────────────┤
│   FORM EDITOR (50%)  │   LIVE PREVIEW (50%)         │
│                      │                              │
│   Subject Line       │   ┌────────────────────┐    │
│   [________________] │   │   Makalah AI Logo   │    │
│                      │   │                      │    │
│   Sections:          │   │   Verifikasi Email   │    │
│   ┌ heading ──────┐  │   │                      │    │
│   │ [edit]    [x]  │  │   │   Halo {{userName}} │    │
│   └───────────────┘  │   │                      │    │
│   ┌ paragraph ────┐  │   │   [Verifikasi Email] │    │
│   │ [edit]    [x]  │  │   │                      │    │
│   └───────────────┘  │   │   © 2026 Makalah AI │    │
│   ┌ button ───────┐  │   └────────────────────┘    │
│   │ [edit]    [x]  │  │                              │
│   └───────────────┘  │                              │
│                      │                              │
│   [+ Tambah Section] │                              │
│                      │                              │
│   Placeholders:      │                              │
│   {{userName}} {{..}}│                              │
│                      │                              │
│  [Kirim Test] [Save] │                              │
└──────────────────────┴──────────────────────────────┘
```

### Component Hierarchy

```
EmailTemplatesManager (tab router)
├── EmailBrandSettingsEditor
│   ├── Logo upload (CmsImageUpload)
│   ├── Color pickers (6 colors)
│   ├── Font family selector
│   ├── Footer text + links editor
│   ├── Live preview (brand preview card)
│   └── CmsSaveButton
│
├── EmailTemplateList (per group: auth/payment/notification)
│   └── List of template cards with status badge
│
└── EmailTemplateEditor (individual template)
    ├── SubjectField (input + placeholder chips)
    ├── SectionEditor (sortable list)
    │   ├── HeadingSectionEditor
    │   ├── ParagraphSectionEditor
    │   ├── ButtonSectionEditor
    │   ├── DividerSectionEditor
    │   ├── InfoBoxSectionEditor
    │   ├── OtpCodeSectionEditor
    │   └── DetailRowSectionEditor
    ├── AddSectionButton (dropdown menu)
    ├── PlaceholderReference (available placeholders panel)
    ├── EmailPreviewPanel (iframe, real-time via debounced POST)
    ├── SendTestEmailButton
    └── CmsSaveButton
```

### Live Preview Mechanism

```
Form state change → debounce 300ms → POST /api/admin/email-templates/preview
→ render React Email → return HTML → set iframe srcdoc
```

### Send Test Email

```
POST /api/admin/email-templates/send-test
Body: { templateType, sections, brandSettings }
  → Render → replace placeholders with example values
  → Send via Resend to admin's email
  → Subject prefixed with "[TEST]"
  → Rate limit: 5/min per admin
```

## Migration Strategy

### Phase 1: Build Infrastructure (no changes to email sending)

1. Create schema tables
2. Create seed migration (12 default templates + brand settings from existing HTML)
3. Build admin UI (brand editor, template editor, preview, send test)
4. Build API routes (preview, send-test, render)
5. Build React Email dynamic renderer component

### Phase 2: Wire Up (gradual switch per email function)

6. Create helper: `fetchTemplateAndRender(templateType, data)`
   - Fetch from DB → replace placeholders → return `{subject, html}`
   - Fallback: return `null` (caller uses old inline HTML)

7. Update each sender function:
```typescript
// Each function in authEmails.ts, sendPaymentEmail.ts, etc.
const rendered = await fetchTemplateAndRender("verification", { userName, verificationUrl })
const html = rendered?.html ?? `<html>...hardcoded fallback...</html>`
const subject = rendered?.subject ?? "Verifikasi Email — Makalah AI"
```

### Phase 3: Cleanup

8. Inline HTML kept as fallback constants (not deleted)
9. Monitor `systemAlerts` for fallback activations
10. Deprecate inline HTML after stable period

### Fallback Chain

```
fetchTemplateAndRender(templateType, data)
  │
  ├─ Query emailTemplates by templateType (isActive=true)
  │
  ├─ Found + preRenderedHtml? → replace placeholders → return {subject, html}
  │
  └─ Not found → log systemAlert (severity: "warning") → return null
        │
        ▼
  Caller uses hardcoded HTML (existing behavior preserved)
```

## Files

### Modified (Existing)

| File | Change |
|------|--------|
| `convex/schema.ts` | Add 2 tables |
| `convex/authEmails.ts` | 10 functions: add DB template fetch + fallback |
| `src/lib/email/sendPaymentEmail.ts` | 2 functions: add DB template fetch + fallback |
| `src/app/api/support/technical-report/route.ts` | Add DB template fetch + fallback |
| `src/components/admin/adminPanelConfig.ts` | Add "Email Templates" tab with children |
| `src/components/admin/AdminContentSection.tsx` | Add render case for email-templates |

### Created (New)

| File | Purpose |
|------|---------|
| `convex/emailTemplates.ts` | CRUD mutations + queries |
| `convex/emailBrandSettings.ts` | Brand settings CRUD |
| `convex/migrations/seedEmailTemplates.ts` | Seed 12 templates + brand defaults |
| `src/lib/email/template-renderer.ts` | Dynamic React Email renderer (sections → component tree) |
| `src/lib/email/template-helpers.ts` | `fetchTemplateAndRender()`, `renderEmailWithData()` |
| `src/app/api/admin/email-templates/preview/route.ts` | Preview render API |
| `src/app/api/admin/email-templates/send-test/route.ts` | Send test email API |
| `src/app/api/admin/email-templates/render/route.ts` | Pre-render on save API |
| `src/components/admin/email-templates/EmailTemplatesManager.tsx` | Tab router |
| `src/components/admin/email-templates/EmailBrandSettingsEditor.tsx` | Brand editor |
| `src/components/admin/email-templates/EmailTemplateList.tsx` | Template list per group |
| `src/components/admin/email-templates/EmailTemplateEditor.tsx` | Split-view editor |
| `src/components/admin/email-templates/EmailPreviewPanel.tsx` | Iframe preview |
| `src/components/admin/email-templates/SendTestEmailButton.tsx` | Test email button |
| `src/components/admin/email-templates/PlaceholderReference.tsx` | Placeholder chips panel |
| `src/components/admin/email-templates/section-editors/HeadingSectionEditor.tsx` | Heading editor |
| `src/components/admin/email-templates/section-editors/ParagraphSectionEditor.tsx` | Paragraph editor |
| `src/components/admin/email-templates/section-editors/ButtonSectionEditor.tsx` | Button editor |
| `src/components/admin/email-templates/section-editors/DividerSectionEditor.tsx` | Divider editor |
| `src/components/admin/email-templates/section-editors/InfoBoxSectionEditor.tsx` | Info box editor |
| `src/components/admin/email-templates/section-editors/OtpCodeSectionEditor.tsx` | OTP code editor |
| `src/components/admin/email-templates/section-editors/DetailRowSectionEditor.tsx` | Detail row editor |

## API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/admin/email-templates/preview` | POST | Render preview HTML | admin/superadmin |
| `/api/admin/email-templates/send-test` | POST | Render + send test email | admin/superadmin |
| `/api/admin/email-templates/render` | POST | Pre-render HTML for save | admin/superadmin |

## Dependencies

No new dependencies required. Uses existing:
- `resend@^6.6.0`
- `@react-email/components@^1.0.6`
