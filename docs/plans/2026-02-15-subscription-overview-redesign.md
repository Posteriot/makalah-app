# Trust-First Subscription UI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign subscription overview & history pages to hide token-level details from regular users (gratis/bpp/pro), showing only credits. Admin/superadmin retain full observability. History page pivots to payment records with PDF receipt download.

**Architecture:** Conditional rendering based on `isUnlimited` flag. Regular users see simplified credit-only UI using `useCreditMeter()` hook. Unlimited (admin) sees current full view unchanged. History page uses existing `getPaymentHistory` query from payments table. Receipt PDF generated server-side via pdfkit.

**Tech Stack:** Next.js App Router, Convex queries, Tailwind CSS, pdfkit (already in project)

---

## Task 1: Simplify Overview Page for Regular Users

**Files:**
- Modify: `src/app/(dashboard)/subscription/overview/page.tsx`

**Context:** The overview page currently shows: tier card, credit/quota card, usage progress bar with tokens, BPP credit detail card, breakdown table (tokens/biaya per operation), conversion note, payment model info. For regular users we keep only: tier card, progress bar (kredit only). Admin sees everything unchanged.

**Step 1:** Read the current file to confirm structure:

```bash
cat src/app/(dashboard)/subscription/overview/page.tsx
```

**Step 2:** Restructure the page with an `isUnlimited` conditional. The page already has `const isUnlimited = quotaStatus?.unlimited === true` at line 122.

Replace the entire return JSX (lines 148-505) with this structure:

```tsx
return (
  <div className="space-y-6">
    {/* Page Header */}
    <div>
      <h1 className="text-interface text-xl font-semibold flex items-center gap-2">
        <Sparks className="h-5 w-5 text-primary" />
        Subskripsi
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Kelola langganan dan pantau penggunaan Anda
      </p>
    </div>

    {isUnlimited ? (
      <AdminOverviewView
        quotaStatus={quotaStatus}
        usageBreakdown={usageBreakdown}
        creditBalance={creditBalance}
        tier={tier}
        tierConfig={tierConfig}
      />
    ) : (
      <RegularOverviewView
        tier={tier}
        tierConfig={tierConfig}
        user={user}
      />
    )}
  </div>
)
```

**Step 3:** Create `AdminOverviewView` as a component within the same file. This is the CURRENT code (lines 161-503) extracted as-is into a component. It receives `quotaStatus`, `usageBreakdown`, `creditBalance`, `tier`, `tierConfig` as props. No changes to its content — admin sees exactly what they see now.

**Step 4:** Create `RegularOverviewView` component within the same file. This uses `useCreditMeter()` hook:

```tsx
function RegularOverviewView({
  tier,
  tierConfig,
  user,
}: {
  tier: EffectiveTier
  tierConfig: { label: string; description: string; color: string; textColor: string }
  user: { _id: string }
}) {
  const meter = useCreditMeter()

  return (
    <>
      {/* Tier Card */}
      <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-signal text-[10px] text-muted-foreground">Tier Saat Ini</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-badge text-white", tierConfig.color)}>
                {tierConfig.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{tierConfig.description}</p>
          </div>
          <GraphUp className="h-5 w-5 text-muted-foreground" />
        </div>

        {tier === "gratis" && (
          <Link
            href="/subscription/upgrade"
            className="focus-ring text-interface mt-4 inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Upgrade
          </Link>
        )}

        {(tier === "bpp" || tier === "pro") && (
          <Link
            href="/subscription/topup?from=overview"
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-mono font-medium rounded-action hover:bg-amber-400 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Top Up Kredit
          </Link>
        )}
      </div>

      {/* Penggunaan Kredit */}
      <div className="rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 p-4">
        <h2 className="text-interface text-sm font-medium text-foreground mb-3">Penggunaan Kredit</h2>

        {/* Progress Bar */}
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "absolute left-0 top-0 h-full rounded-full transition-all",
              meter.level === "depleted" ? "bg-destructive"
                : meter.level === "critical" ? "bg-destructive"
                : meter.level === "warning" ? "bg-amber-500"
                : "bg-primary"
            )}
            style={{ width: `${Math.min(meter.percentage, 100)}%` }}
          />
        </div>

        {/* Kredit text */}
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-xl font-bold">
            <span className={cn("text-foreground", (meter.level === "warning" || meter.level === "critical" || meter.level === "depleted") && "text-destructive")}>
              {meter.used.toLocaleString("id-ID")}
            </span>
            <span className="text-muted-foreground"> / {meter.total.toLocaleString("id-ID")}</span>
            {" "}
            <span className="text-signal text-[10px] text-muted-foreground">kredit</span>
          </span>
        </div>

        {/* Pro: subtle reset note */}
        {tier === "pro" && (
          <p className="font-mono text-[10px] text-muted-foreground mt-1">Direset setiap bulan</p>
        )}

        {/* Blocked state */}
        {meter.level === "depleted" && (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-destructive">
              {tier === "gratis"
                ? "Kredit habis. Upgrade untuk melanjutkan."
                : "Kredit habis. Top up untuk melanjutkan."}
            </p>
            <Link
              href={tier === "gratis" ? "/subscription/upgrade" : "/subscription/topup?from=overview"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-mono font-medium rounded-action hover:bg-amber-400 transition-colors"
            >
              <CreditCard className="h-3.5 w-3.5" />
              {tier === "gratis" ? "Upgrade" : "Top Up Kredit"}
            </Link>
          </div>
        )}

        {/* Warning state */}
        {(meter.level === "warning" || meter.level === "critical") && meter.level !== "depleted" && (
          <p className="text-xs text-amber-600 mt-2">
            Kredit hampir habis. {tier === "gratis" ? "Pertimbangkan upgrade." : "Pertimbangkan top up."}
          </p>
        )}
      </div>
    </>
  )
}
```

**Step 5:** Update imports. Add `useCreditMeter` import. The `usageBreakdown` query can remain (used by AdminOverviewView), but for RegularOverviewView it's not needed.

**Step 6:** Remove unused imports if any (check after refactor).

**Step 7:** Verify: `npx tsc --noEmit` — zero errors

**Step 8:** Manual test: Open `/subscription/overview` as a regular user → should see only tier card + progress bar. Open as admin → should see full current view.

**Step 9:** Commit:
```bash
git add src/app/(dashboard)/subscription/overview/page.tsx
git commit -m "refactor: simplify subscription overview for regular users, keep admin full view"
```

---

## Task 2: Make Sidebar Menu Conditional by Tier

**Files:**
- Modify: `src/app/(dashboard)/subscription/layout.tsx`

**Context:** Current sidebar has 3 static items: Overview, Riwayat, Upgrade. We need to conditionally show items based on tier. The layout is a client component so we can use `useCurrentUser()`.

**Step 1:** Add `useCurrentUser` and `getEffectiveTier` imports.

**Step 2:** Replace static `SIDEBAR_ITEMS` array with a function that returns items based on tier:

```tsx
function getSidebarItems(tier: EffectiveTier) {
  const items = [
    {
      href: "/subscription/overview",
      label: "Overview",
      icon: Dashboard,
    },
  ]

  // Riwayat Pembayaran: only for BPP, Pro, Unlimited (not Gratis)
  if (tier === "bpp" || tier === "pro" || tier === "unlimited") {
    items.push({
      href: "/subscription/history",
      label: tier === "unlimited" ? "Riwayat" : "Riwayat Pembayaran",
      icon: Clock,
    })
  }

  // Upgrade: only for Gratis
  if (tier === "gratis") {
    items.push({
      href: "/subscription/upgrade",
      label: "Upgrade",
      icon: ArrowUpCircle,
    })
  }

  // Top Up: for BPP and Pro
  if (tier === "bpp" || tier === "pro") {
    items.push({
      href: "/subscription/topup",
      label: "Top Up",
      icon: CreditCard,
    })
  }

  return items
}
```

**Step 3:** Import `CreditCard` from iconoir-react, `useCurrentUser` from hooks, `getEffectiveTier` from subscription utils.

**Step 4:** In `SubscriptionLayout`, call `useCurrentUser()` and compute tier:

```tsx
const { user } = useCurrentUser()
const tier = getEffectiveTier(user?.role, user?.subscriptionStatus)
```

**Step 5:** Pass `tier` to `SidebarNav`. Update `SidebarNav` to accept `tier` prop and call `getSidebarItems(tier)` instead of using static `SIDEBAR_ITEMS`.

**Step 6:** Verify: `npx tsc --noEmit` — zero errors

**Step 7:** Manual test: Login as Gratis user → sidebar shows Overview + Upgrade. Login as BPP → Overview + Riwayat Pembayaran + Top Up. Login as admin → Overview + Riwayat.

**Step 8:** Commit:
```bash
git add src/app/(dashboard)/subscription/layout.tsx
git commit -m "feat: conditional sidebar menu based on subscription tier"
```

---

## Task 3: Redesign History Page for Regular Users (Payment History)

**Files:**
- Modify: `src/app/(dashboard)/subscription/history/page.tsx`

**Context:** Current history page shows credit usage events (chat -5 kredit, etc). For regular users (BPP/Pro), replace with payment history from `payments` table using existing `getPaymentHistory` query (`convex/billing/payments.ts:193`). Admin keeps current view unchanged.

**Step 1:** Read existing `getPaymentHistory` query to understand return shape. It returns raw payment documents from the `payments` table with fields: `amount`, `paymentMethod`, `paymentChannel`, `status`, `paymentType`, `packageType`, `credits`, `description`, `xenditReferenceId`, `_creationTime`.

**Step 2:** Restructure the page with admin/regular conditional:

```tsx
export default function TransactionHistoryPage() {
  const { user, isLoading: userLoading } = useCurrentUser()
  const tier = user ? getEffectiveTier(user.role, user.subscriptionStatus) : "gratis"
  const isUnlimited = user?.role === "admin" || user?.role === "superadmin"

  // ... loading/auth guards ...

  if (isUnlimited) {
    return <AdminHistoryView user={user} />
  }

  return <RegularHistoryView user={user} tier={tier} />
}
```

**Step 3:** `AdminHistoryView` — extract current page content as-is (uses `getCreditHistory`). No changes.

**Step 4:** `RegularHistoryView` — new component using `getPaymentHistory`:

```tsx
function RegularHistoryView({ user, tier }: { user: any; tier: EffectiveTier }) {
  const payments = useQuery(
    api.billing.payments.getPaymentHistory,
    user?._id ? { userId: user._id, limit: 30 } : "skip"
  )

  // Loading...
  if (payments === undefined) { /* spinner */ }

  // Status label mapping
  const statusLabel = {
    SUCCEEDED: { text: "Berhasil", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
    PENDING: { text: "Menunggu", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    FAILED: { text: "Gagal", color: "text-rose-400 bg-rose-500/15 border-rose-500/30" },
    EXPIRED: { text: "Kedaluwarsa", color: "text-muted-foreground bg-muted border-border" },
    REFUNDED: { text: "Refund", color: "text-sky-400 bg-sky-500/15 border-sky-500/30" },
  }

  // Payment method display
  const methodLabel = (method: string, channel?: string) => {
    if (method === "QRIS") return "QRIS"
    if (method === "VIRTUAL_ACCOUNT") return `VA ${channel ?? ""}`
    if (method === "EWALLET") return channel ?? "E-Wallet"
    return method
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Riwayat Pembayaran</h1>
        <p>Riwayat pembelian kredit</p>
      </div>

      {payments.length === 0 ? (
        /* Empty state */
      ) : (
        <div className="divide-y divide-border">
          {payments.map((payment) => (
            <div key={payment._id} className="flex items-center gap-4 p-4">
              {/* Icon: green for succeeded, amber for pending, red for failed */}
              {/* Details: description, date, method + amount + status badge */}
              {/* Download receipt button (only for SUCCEEDED) */}
              {payment.status === "SUCCEEDED" && (
                <a
                  href={`/api/export/receipt/${payment._id}`}
                  target="_blank"
                  className="... text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Kwitansi
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 5:** Full implementation with proper Tailwind styling matching Mechanical Grace design system (rounded-shell, border-main, text-interface, text-signal, font-mono for numbers, etc).

**Step 6:** Verify: `npx tsc --noEmit` — zero errors

**Step 7:** Manual test: Login as BPP/Pro → see payment history (may be empty if no purchases). Login as admin → see current transaction view.

**Step 8:** Commit:
```bash
git add src/app/(dashboard)/subscription/history/page.tsx
git commit -m "feat: redesign history page as payment history for regular users"
```

---

## Task 4: Create Convex Query for Payment by ID

**Files:**
- Modify: `convex/billing/payments.ts`

**Context:** The receipt PDF route needs to fetch a single payment by ID. Add a simple `getPaymentById` query.

**Step 1:** Add query to `convex/billing/payments.ts`:

```typescript
/**
 * Get a single payment by ID
 * Used for receipt generation
 */
export const getPaymentById = query({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) return null

    // Auth check: verify requester owns this payment
    await requireAuthUserId(ctx, payment.userId)
    return payment
  },
})
```

**Step 2:** Push to Convex: `npx convex dev --once`

**Step 3:** Verify: `npx tsc --noEmit` — zero errors

**Step 4:** Commit:
```bash
git add convex/billing/payments.ts
git commit -m "feat: add getPaymentById query for receipt generation"
```

---

## Task 5: Create Receipt PDF API Route

**Files:**
- Create: `src/app/api/export/receipt/[paymentId]/route.ts`
- Reference: `src/lib/export/pdf-builder.ts` (existing pdfkit usage)

**Context:** Server-side API route that generates a payment receipt PDF. Uses pdfkit (already installed). Auth via `isAuthenticated()` + verify payment belongs to user. Uses `fetchQuery` for server-side Convex access.

**Step 1:** Create the route file:

```typescript
/**
 * Receipt PDF Export API Route
 * GET /api/export/receipt/[paymentId]
 *
 * Generates a PDF receipt for a specific payment.
 * Auth: must be logged in, payment must belong to user.
 */

import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import PDFDocument from "pdfkit"

function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp))
}

function getMethodLabel(method: string, channel?: string): string {
  if (method === "QRIS") return "QRIS"
  if (method === "VIRTUAL_ACCOUNT") return `Virtual Account ${channel ?? ""}`.trim()
  if (method === "EWALLET") return channel ?? "E-Wallet"
  return method
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    // 1. Auth check
    const isAuthed = await isAuthenticated()
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const convexToken = await getToken()
    if (!convexToken) {
      return NextResponse.json({ error: "Token missing" }, { status: 500 })
    }

    const { paymentId } = await params

    // 2. Fetch payment (query also verifies ownership)
    const payment = await fetchQuery(
      api.billing.payments.getPaymentById,
      { paymentId: paymentId as Id<"payments"> },
      { token: convexToken }
    )

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    if (payment.status !== "SUCCEEDED") {
      return NextResponse.json({ error: "Receipt only available for completed payments" }, { status: 400 })
    }

    // 3. Fetch user for name
    const user = await fetchQuery(
      api.users.getById,
      { userId: payment.userId },
      { token: convexToken }
    )

    const buyerName = user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
      : "Pengguna Makalah"

    // 4. Generate PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Kwitansi - ${payment.xenditReferenceId}`,
        Author: "Makalah AI",
      },
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk) => chunks.push(chunk))

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("MAKALAH AI", { align: "center" })
    doc.moveDown(0.3)
    doc.fontSize(14).font("Helvetica-Bold").text("KWITANSI PEMBAYARAN", { align: "center" })
    doc.moveDown(1)

    // Horizontal line
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(1)

    // Details table
    const leftX = 50
    const rightX = 200
    doc.fontSize(10).font("Helvetica")

    const addRow = (label: string, value: string) => {
      doc.font("Helvetica-Bold").text(label, leftX, doc.y, { continued: false, width: 140 })
      const savedY = doc.y - doc.currentLineHeight()
      doc.font("Helvetica").text(value, rightX, savedY)
      doc.moveDown(0.3)
    }

    addRow("No. Referensi", payment.xenditReferenceId)
    addRow("Tanggal", formatDate(payment._creationTime))
    addRow("Nama", buyerName)
    addRow("Paket", payment.description || `Paket Paper — ${payment.credits ?? 300} kredit`)
    addRow("Metode Pembayaran", getMethodLabel(payment.paymentMethod, payment.paymentChannel))
    addRow("Jumlah", formatCurrency(payment.amount))
    addRow("Status", "Lunas")

    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown(1)

    // Footer
    doc.fontSize(8).font("Helvetica").fillColor("#888888")
    doc.text("Kwitansi ini dibuat secara otomatis oleh Makalah AI.", { align: "center" })
    doc.text("https://makalah.ai", { align: "center" })

    doc.end()

    // 5. Collect and return
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)))
    })

    const filename = `kwitansi-${payment.xenditReferenceId}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[Receipt] Error:", error)
    return NextResponse.json({ error: "Gagal membuat kwitansi" }, { status: 500 })
  }
}
```

**Step 2:** Verify: `npx tsc --noEmit` — zero errors

**Step 3:** Manual test: If there are SUCCEEDED payments in the database, visit `/api/export/receipt/[paymentId]` → should download PDF. If no succeeded payments exist yet, test with a cURL call that returns 404 or appropriate error.

**Step 4:** Commit:
```bash
git add src/app/api/export/receipt/
git commit -m "feat: add receipt PDF generation API route"
```

---

## Task 6: Final Verification

**Step 1:** TypeScript check:
```bash
npx tsc --noEmit
```
Expected: zero errors

**Step 2:** Run all tests:
```bash
npm run test
```
Expected: 13 files, 86 tests pass (no regressions)

**Step 3:** Manual verification checklist:

| Scenario | Expected |
|----------|----------|
| Gratis user → Overview | Tier card (GRATIS) + progress bar (X / 100 kredit) + Upgrade button |
| Gratis user → Sidebar | Overview + Upgrade (no Riwayat) |
| BPP user → Overview | Tier card (BPP) + progress bar (X / 300 kredit) + Top Up button |
| BPP user → Sidebar | Overview + Riwayat Pembayaran + Top Up |
| Pro user → Overview | Tier card (PRO) + progress bar (X / 5.000 kredit) + "Direset setiap bulan" + Top Up |
| Pro user → Sidebar | Overview + Riwayat Pembayaran + Top Up |
| Admin → Overview | FULL current view (breakdown table, tokens, all sections) |
| Admin → Sidebar | Overview + Riwayat (current label) |
| Admin → Riwayat | Current transaction history (unchanged) |
| Regular → Riwayat | Payment history from payments table |
| Receipt download | PDF with correct payment details |

**Step 4:** Commit final (if any adjustments needed)

---

## File Summary

| Task | File | Change |
|------|------|--------|
| 1 | `src/app/(dashboard)/subscription/overview/page.tsx` | Split into AdminOverviewView + RegularOverviewView |
| 2 | `src/app/(dashboard)/subscription/layout.tsx` | Conditional sidebar items by tier |
| 3 | `src/app/(dashboard)/subscription/history/page.tsx` | Split into AdminHistoryView + RegularHistoryView (payments) |
| 4 | `convex/billing/payments.ts` | Add `getPaymentById` query |
| 5 | `src/app/api/export/receipt/[paymentId]/route.ts` | New receipt PDF API route |
