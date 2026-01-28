# Subscription Page Structure

Dokumentasi struktur halaman subscription untuk user.

## Route Structure

```
/subscription                    → Redirect ke /subscription/overview
/subscription/overview           → Dashboard: usage, balance, tier info
/subscription/topup              → Top up credit (Xendit payment)
/subscription/history            → Transaction history
/subscription/upgrade            → Upgrade ke Pro subscription
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Route path | `/subscription` | English, consistent with codebase |
| Sidebar | Always visible, collapsible mobile | Easy navigation |
| Quota warning | Banner di atas chat | Visible tanpa mengganggu |

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     GlobalHeader                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────────────────────────┐  │
│  │ Sidebar  │  │              Content Area               │  │
│  │          │  │                                         │  │
│  │ 📊 Over  │  │  [Page-specific content]                │  │
│  │ 💳 Top   │  │                                         │  │
│  │ 📜 Hist  │  │                                         │  │
│  │ ⬆️ Upgr  │  │                                         │  │
│  │          │  │                                         │  │
│  └──────────┘  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Sidebar Navigation

| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| LayoutDashboard | Overview | /subscription/overview | Usage dashboard |
| CreditCard | Top Up | /subscription/topup | Add credit balance |
| History | Riwayat | /subscription/history | Transaction history |
| ArrowUpCircle | Upgrade | /subscription/upgrade | Upgrade to Pro |

## Pages Specification

### 1. Overview Page (`/subscription/overview`)

**Cards:**
1. **Tier Card** - Current tier + upgrade CTA
2. **Credit Card** - Balance + top up CTA
3. **Usage Progress** - Monthly token usage with progress bar
4. **Usage Breakdown** - Table: operation type, tokens, cost

**Data Needed:**
- `user.subscriptionStatus` - Current tier
- `userQuotas` - Token allocation & usage
- `creditBalances` - Credit balance (for BPP)
- `usageEvents` - Aggregated by operation type

### 2. Top Up Page (`/subscription/topup`)

**Flow:**
1. Select amount (Rp 25K, 50K, 100K)
2. Select payment method (QRIS default)
3. Show QR code / VA number
4. Poll for payment status
5. Success → redirect to overview

**Components:**
- Amount selector (radio group)
- Payment method tabs
- QR code display
- Loading/success states

### 3. History Page (`/subscription/history`)

**Table Columns:**
- Tanggal
- Tipe (Top Up, Deduct, Refund)
- Deskripsi
- Jumlah (+ green, - red)
- Saldo Setelah

**Filters:**
- Date range
- Transaction type

### 4. Upgrade Page (`/subscription/upgrade`)

**Content:**
- Current tier display
- Pro tier benefits
- Price: Rp 99,000/bulan
- Payment form
- FAQ accordion

## Mobile Responsiveness

### Sidebar Behavior
- Desktop (≥768px): Always visible, 200px width
- Mobile (<768px): Collapsed by default, hamburger toggle

### Collapse Toggle
- Hamburger icon top-left of content (mobile only)
- Click outside or X to close
- Backdrop overlay when open

## Component Files

```
src/
├── app/
│   └── (dashboard)/
│       └── subscription/
│           ├── layout.tsx          # SubscriptionLayout with sidebar
│           ├── page.tsx            # Redirect to /overview
│           ├── overview/
│           │   └── page.tsx
│           ├── topup/
│           │   └── page.tsx
│           ├── history/
│           │   └── page.tsx
│           └── upgrade/
│               └── page.tsx
├── components/
│   └── subscription/
│       ├── SubscriptionSidebar.tsx
│       ├── TierCard.tsx
│       ├── CreditBalanceCard.tsx
│       ├── UsageProgressCard.tsx
│       ├── UsageBreakdownTable.tsx
│       ├── TopUpAmountSelector.tsx
│       ├── PaymentQRDisplay.tsx
│       └── TransactionHistoryTable.tsx
```

## Styling

Follow existing admin panel patterns:
- Cards: `.card`, `.card-header`, `.card-content`
- Tables: Similar to UserList.tsx
- Colors: Use CSS variables from globals.css
- Icons: lucide-react

## Integration Points

### UserDropdown.tsx
Add new menu item:
```tsx
<Link href="/subscription/overview" onClick={() => setIsOpen(false)}>
  <CreditCard className="h-4 w-4" />
  <span>Subskripsi</span>
</Link>
```

### QuotaWarningBanner
Location: Above chat messages in ChatWindow.tsx
Trigger: When `remainingTokens < allottedTokens * 0.2`

## Implementation Phases

### Phase 1: Core Structure
- [x] Create documentation
- [ ] Create subscription layout with sidebar
- [ ] Create overview page with mock data
- [ ] Update UserDropdown with new menu item

### Phase 2: Real Data
- [ ] Connect to Convex queries
- [ ] Implement usage tracking display
- [ ] Add credit balance display

### Phase 3: Payment
- [ ] Create top up page
- [ ] Integrate Xendit payment
- [ ] Handle webhooks

### Phase 4: Polish
- [ ] History page
- [ ] Upgrade page
- [ ] QuotaWarningBanner in chat
