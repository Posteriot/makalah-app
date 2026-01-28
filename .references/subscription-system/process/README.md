# Subscription System Specification

Dokumentasi lengkap untuk sistem subscription, billing, dan enforcement di Makalah App.

## Status Dokumen

| Versi | Tanggal | Status |
|-------|---------|--------|
| 1.0 | 2026-01-25 | Draft Spec |

---

## 1. Overview

### Tujuan
Mengimplementasikan sistem subscription yang:
1. Membatasi penggunaan berdasarkan tier (Gratis, BPP, Pro)
2. Track token usage untuk cost control
3. Integrate dengan Xendit untuk pembayaran Indonesia
4. Enforce limits secara real-time

### Pricing Tiers

| Tier | Slug | Harga | Model | Status |
|------|------|-------|-------|--------|
| Gratis | `gratis` | Rp 0 | Free tier dengan limit | ✅ Enabled |
| Bayar Per Paper | `bpp` | ~Rp 50,000/paper | Pay-as-you-go | ⏸️ TBD |
| Pro | `pro` | ~Rp 99,000/bulan | Monthly subscription | ⏸️ TBD |

---

## 2. Tier Specifications

### 2.1 Gratis Tier

**Target User:** Mahasiswa yang ingin coba dulu

**Limits:**
- 100,000 tokens/bulan
- 5,000 tokens/hari (rolling window)
- Max 2 paper drafts/bulan
- Hard limit: Block saat quota habis

**Features:**
- Chat dengan AI assistant
- Draft paper hingga tahap tertentu
- Web search (limited)
- Export draft (watermarked)

**Enforcement:**
- Hard block saat quota exceeded
- Upgrade prompt di UI
- Reset: Monthly (tanggal signup anniversary)

---

### 2.2 BPP Tier (Bayar Per Paper)

**Target User:** Mahasiswa yang butuh 1-2 paper saja

**Pricing Model Options:**

#### Option A: Fixed Price Per Paper
```
Rp 50,000 per paper completion
- Bayar saat paper selesai (semua stage complete)
- Unlimited tokens untuk paper tersebut (max 2M safety cap)
- Tidak ada monthly fee
```

#### Option B: Token-Based (Pay-As-You-Go)
```
Rp 0.10 per 1,000 tokens (Rp 100/1K tokens)
- Prepaid credit system
- Top-up balance: Rp 25K, 50K, 100K packs
- Deduct per operation
- No expiry
```

**Recommended: Hybrid Approach**
```
- Minimum purchase: Rp 25,000 = 250K tokens
- 1 paper completion ~50K-200K tokens = Rp 5K-20K
- Sisa credit bisa dipakai untuk paper lain
- Lebih predictable untuk user
```

**Features:**
- Semua fitur Gratis
- Full paper completion (semua 13 stages)
- Export tanpa watermark (PDF, DOCX)
- Priority web search

---

### 2.3 Pro Tier

**Target User:** Power users, dosen, researcher

**Pricing:**
- Rp 99,000/bulan (auto-renew)
- Rp 990,000/tahun (hemat 2 bulan)

**Limits:**
- 5,000,000 tokens/bulan
- 200,000 tokens/hari
- Unlimited papers
- Soft limit: Overage charged Rp 0.05/1K tokens

**Features:**
- Semua fitur BPP
- Priority AI response
- Advanced citation tools
- Bulk export
- Priority support

**Enforcement:**
- Soft limit: Allow overage, charge extra
- Warning at 80%, 50%, 20% remaining
- Invoice breakdown end of month

---

## 3. Token Tracking Architecture

### 3.1 How Tokens Work

**Token = Unit of text processed by AI**
- ~4 characters = 1 token (English)
- ~2-3 characters = 1 token (Indonesian)
- 1 page text ~500-750 tokens

**Cost Calculation (Gemini 2.5 Flash):**
```
Input:  $0.075 / 1M tokens = Rp 1.20 / 1K tokens
Output: $0.30 / 1M tokens  = Rp 4.80 / 1K tokens
Average: ~Rp 3/1K tokens (blended rate)
```

### 3.2 Tracking Implementation

**Location:** `src/app/api/chat/route.ts`

```typescript
const result = await streamText({
  model: getGatewayModel(),
  messages: convertToModelMessages(messages),

  onFinish: async (completion) => {
    const { promptTokens, completionTokens, totalTokens } = completion.usage;

    // Record to Convex
    await fetchMutation(api.usage.recordTokenUsage, {
      userId,
      conversationId,
      sessionId: paperSessionId,
      promptTokens,
      completionTokens,
      totalTokens,
      model: 'google/gemini-2.5-flash-lite',
      operationType: paperSessionId ? 'paper_generation' : 'chat_message',
    });
  },
});
```

### 3.3 Pre-flight Estimation

Sebelum operasi mahal (paper generation), estimate dulu:

```typescript
// Gemini countTokens API (free, 3000 req/min)
const estimated = await estimateTokens(systemPrompt + userMessage);

const check = await checkQuota(userId, estimated);
if (!check.allowed) {
  throw new QuotaExceededError(check.reason);
}
```

---

## 4. Database Schema

### 4.1 New Tables

```typescript
// convex/schema.ts additions

// Track setiap operasi token
usageEvents: defineTable({
  userId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  sessionId: v.optional(v.id("paperSessions")),

  // Token tracking
  promptTokens: v.number(),
  completionTokens: v.number(),
  totalTokens: v.number(),

  // Cost tracking
  costIDR: v.number(),

  // Metadata
  model: v.string(),
  operationType: v.union(
    v.literal("chat_message"),
    v.literal("paper_generation"),
    v.literal("web_search")
  ),

  createdAt: v.number(),
})
  .index("by_user_time", ["userId", "createdAt"])
  .index("by_session", ["sessionId"])
  .index("by_user_period", ["userId", "createdAt"]),

// User quota state
userQuotas: defineTable({
  userId: v.id("users"),

  // Period tracking
  periodStart: v.number(),
  periodEnd: v.number(),

  // Token quota
  allottedTokens: v.number(),
  usedTokens: v.number(),
  remainingTokens: v.number(),

  // Paper quota (untuk Gratis tier)
  allottedPapers: v.number(),
  completedPapers: v.number(),

  // Tier info
  tier: v.string(),

  // Overage (untuk Pro tier)
  overageTokens: v.number(),
  overageCostIDR: v.number(),

  updatedAt: v.number(),
})
  .index("by_user", ["userId"]),

// Credit balance (untuk BPP tier)
creditBalances: defineTable({
  userId: v.id("users"),

  balanceIDR: v.number(),
  balanceTokens: v.number(),

  // Top-up history reference
  lastTopUpAt: v.optional(v.number()),

  updatedAt: v.number(),
})
  .index("by_user", ["userId"]),

// Payment records
payments: defineTable({
  userId: v.id("users"),
  sessionId: v.optional(v.id("paperSessions")),

  // Xendit reference
  xenditPaymentRequestId: v.string(),
  xenditReferenceId: v.string(),

  // Payment details
  amount: v.number(),
  currency: v.string(),
  paymentMethod: v.string(),

  // Status
  status: v.union(
    v.literal("PENDING"),
    v.literal("SUCCEEDED"),
    v.literal("FAILED"),
    v.literal("EXPIRED")
  ),

  // Type
  paymentType: v.union(
    v.literal("credit_topup"),
    v.literal("paper_completion"),
    v.literal("subscription")
  ),

  // Timestamps
  createdAt: v.number(),
  paidAt: v.optional(v.number()),

  // Idempotency
  idempotencyKey: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_xendit_id", ["xenditPaymentRequestId"])
  .index("by_reference", ["xenditReferenceId"]),
```

### 4.2 Update Existing Tables

```typescript
// users table - sudah ada subscriptionStatus
// Tambahan field:
users: defineTable({
  // ... existing fields ...

  // Credit system
  stripeCustomerId: v.optional(v.string()),  // Untuk future Stripe
  xenditCustomerId: v.optional(v.string()),  // Xendit customer reference
})
```

---

## 5. Quota Enforcement Logic

### 5.1 Tier Limits Constants

```typescript
// convex/billing/constants.ts

export const TIER_LIMITS = {
  gratis: {
    monthlyTokens: 100_000,
    dailyTokens: 5_000,
    monthlyPapers: 2,
    hardLimit: true,
    overageAllowed: false,
  },
  bpp: {
    // No monthly limit - credit based
    monthlyTokens: Infinity,
    dailyTokens: Infinity,
    monthlyPapers: Infinity,
    hardLimit: false,
    creditBased: true,
  },
  pro: {
    monthlyTokens: 5_000_000,
    dailyTokens: 200_000,
    monthlyPapers: Infinity,
    hardLimit: false,
    overageAllowed: true,
    overageRatePerToken: 0.00005, // Rp 0.05/1K = Rp 50/1M
  },
} as const;
```

### 5.2 Enforcement Middleware

```typescript
// src/lib/billing/enforcement.ts

export async function enforceQuota(
  userId: string,
  estimatedTokens: number,
  operationType: 'chat' | 'paper'
): Promise<QuotaCheckResult> {
  const user = await getUser(userId);
  const tier = user.subscriptionStatus as keyof typeof TIER_LIMITS;
  const limits = TIER_LIMITS[tier];

  // Admin/Superadmin bypass
  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, tier: 'pro' };
  }

  // BPP: Check credit balance
  if (tier === 'bpp' || limits.creditBased) {
    const balance = await getCreditBalance(userId);
    const estimatedCost = calculateCost(estimatedTokens);

    if (balance.balanceIDR < estimatedCost) {
      return {
        allowed: false,
        reason: 'insufficient_credit',
        message: `Saldo tidak cukup. Butuh Rp ${estimatedCost}, saldo: Rp ${balance.balanceIDR}`,
        action: 'topup',
      };
    }
    return { allowed: true, tier: 'bpp' };
  }

  // Gratis/Pro: Check quota
  const quota = await getUserQuota(userId);

  // Daily limit check
  const todayUsage = await getTodayUsage(userId);
  if (todayUsage + estimatedTokens > limits.dailyTokens) {
    return {
      allowed: false,
      reason: 'daily_limit',
      message: `Limit harian tercapai. Reset besok.`,
      action: 'wait',
    };
  }

  // Monthly limit check
  if (quota.remainingTokens < estimatedTokens) {
    if (limits.hardLimit) {
      return {
        allowed: false,
        reason: 'monthly_limit',
        message: `Quota bulanan habis. Upgrade ke Pro?`,
        action: 'upgrade',
      };
    }

    // Soft limit (Pro): Allow with overage
    if (limits.overageAllowed) {
      const overage = estimatedTokens - quota.remainingTokens;
      const overageCost = overage * limits.overageRatePerToken;

      return {
        allowed: true,
        tier: 'pro',
        warning: `Overage: ${overage} tokens = Rp ${overageCost.toFixed(0)}`,
      };
    }
  }

  return { allowed: true, tier };
}
```

### 5.3 Chat API Integration

```typescript
// src/app/api/chat/route.ts

export async function POST(req: Request) {
  const { userId } = await auth();
  const { messages, conversationId, paperSessionId } = await req.json();

  // 1. Pre-flight quota check
  const lastMessage = messages[messages.length - 1];
  const estimatedTokens = await estimateTokens(lastMessage.content);

  const quotaCheck = await enforceQuota(
    userId,
    estimatedTokens * 2, // Estimate output ~= input
    paperSessionId ? 'paper' : 'chat'
  );

  if (!quotaCheck.allowed) {
    return NextResponse.json({
      error: 'quota_exceeded',
      ...quotaCheck,
    }, { status: 402 }); // 402 Payment Required
  }

  // 2. Stream response
  const result = await streamText({
    model: getGatewayModel(),
    messages: convertToModelMessages(messages),

    onFinish: async (completion) => {
      // 3. Record actual usage
      await recordUsage(userId, completion.usage, {
        conversationId,
        paperSessionId,
      });

      // 4. Deduct from quota/credit
      await deductQuota(userId, completion.usage.totalTokens);
    },
  });

  return result.toUIMessageStreamResponse();
}
```

---

## 6. Xendit Payment Integration

### 6.1 Supported Payment Methods

| Method | Type | Fee | Best For |
|--------|------|-----|----------|
| QRIS | QR Code | 0.7% | Quick payments, small amounts |
| Virtual Account | Bank Transfer | Rp 4,000-5,000 | Larger payments |
| E-Wallet (OVO, DANA) | Direct | 1.5-3% | Convenience |

### 6.2 Payment Flows

#### Credit Top-Up Flow (BPP)

```
1. User click "Top Up Rp 50,000"
2. Frontend → POST /api/payments/topup
3. Backend create Xendit payment request
4. Return QR code / VA number to frontend
5. User scan/transfer
6. Xendit webhook → /api/webhooks/xendit
7. Backend update credit balance
8. Real-time update via Convex subscription
```

#### Paper Completion Payment (BPP Alternative)

```
1. User complete semua 13 stages
2. System calculate total tokens used
3. Show payment dialog: "Paper ini: Rp 45,000"
4. User click "Bayar & Download"
5. Xendit payment flow
6. On success: Unlock export, mark paper paid
```

#### Pro Subscription Flow

```
1. User click "Upgrade ke Pro"
2. Show subscription dialog: "Rp 99,000/bulan"
3. Xendit recurring payment setup
4. User authorize e-wallet/card
5. Monthly auto-debit
6. Webhook update subscription status
```

### 6.3 API Routes

```typescript
// src/app/api/payments/topup/route.ts
// src/app/api/payments/paper/route.ts
// src/app/api/payments/subscribe/route.ts
// src/app/api/webhooks/xendit/route.ts
```

### 6.4 Webhook Handler

```typescript
// src/app/api/webhooks/xendit/route.ts

export async function POST(req: Request) {
  // 1. Verify webhook token
  const token = req.headers.get('x-callback-token');
  if (token !== process.env.XENDIT_WEBHOOK_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { type, data } = await req.json();

  // 2. Handle event types
  switch (type) {
    case 'payment_request.succeeded':
      await handlePaymentSuccess(data);
      break;
    case 'payment_request.failed':
      await handlePaymentFailed(data);
      break;
    case 'recurring.cycle.succeeded':
      await handleSubscriptionRenewal(data);
      break;
  }

  return new Response('OK', { status: 200 });
}

async function handlePaymentSuccess(data: XenditPaymentData) {
  const payment = await getPaymentByXenditId(data.id);

  switch (payment.paymentType) {
    case 'credit_topup':
      // Add credits to user balance
      await addCredits(payment.userId, payment.amount);
      break;

    case 'paper_completion':
      // Unlock paper export
      await unlockPaperExport(payment.sessionId);
      break;

    case 'subscription':
      // Activate Pro subscription
      await activateProSubscription(payment.userId);
      break;
  }

  // Update payment status
  await updatePaymentStatus(payment._id, 'SUCCEEDED', data.paid_at);
}
```

### 6.5 Environment Variables

```bash
# .env.local additions
XENDIT_SECRET_KEY=xnd_production_xxx
XENDIT_WEBHOOK_TOKEN=xxx
XENDIT_PUBLIC_KEY=xnd_public_xxx
```

---

## 7. UI Components

### 7.1 Quota Warning Banner

```tsx
// src/components/billing/QuotaWarningBanner.tsx

export function QuotaWarningBanner() {
  const { user } = useCurrentUser();
  const quota = useQuery(api.quotas.getUserQuota, { userId: user?._id });

  if (!quota || quota.remainingTokens > quota.allottedTokens * 0.2) {
    return null; // Don't show if > 20% remaining
  }

  const percentage = (quota.usedTokens / quota.allottedTokens) * 100;

  return (
    <Alert variant={percentage > 90 ? "destructive" : "warning"}>
      <AlertTitle>Quota hampir habis</AlertTitle>
      <AlertDescription>
        Sisa {quota.remainingTokens.toLocaleString()} tokens ({100 - percentage}%)
        <Button variant="link" asChild>
          <Link href="/pricing">Upgrade</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

### 7.2 Usage Dashboard

```tsx
// src/components/billing/UsageDashboard.tsx

export function UsageDashboard() {
  const { user } = useCurrentUser();
  const quota = useQuery(api.quotas.getUserQuota, { userId: user?._id });
  const usage = useQuery(api.usage.getMonthlyBreakdown, { userId: user?._id });

  return (
    <div className="space-y-6">
      {/* Quota Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Penggunaan Bulan Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={(quota.usedTokens / quota.allottedTokens) * 100}
          />
          <p className="text-sm text-muted-foreground mt-2">
            {quota.usedTokens.toLocaleString()} / {quota.allottedTokens.toLocaleString()} tokens
          </p>
        </CardContent>
      </Card>

      {/* Breakdown by operation */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Penggunaan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipe</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Estimasi Biaya</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.map((item) => (
                <TableRow key={item.type}>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>{item.tokens.toLocaleString()}</TableCell>
                  <TableCell>Rp {item.cost.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 7.3 Payment Dialog

```tsx
// src/components/billing/TopUpDialog.tsx

const TOP_UP_OPTIONS = [
  { amount: 25000, tokens: 250000, label: "Rp 25.000" },
  { amount: 50000, tokens: 500000, label: "Rp 50.000" },
  { amount: 100000, tokens: 1000000, label: "Rp 100.000" },
];

export function TopUpDialog() {
  const [selected, setSelected] = useState(TOP_UP_OPTIONS[1]);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const handleTopUp = async () => {
    setLoading(true);
    const response = await fetch('/api/payments/topup', {
      method: 'POST',
      body: JSON.stringify({ amount: selected.amount }),
    });
    const data = await response.json();
    setQrCode(data.qrCodeUrl);
    setLoading(false);
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Top Up Credit</DialogTitle>
        </DialogHeader>

        {!qrCode ? (
          <>
            <RadioGroup value={selected.amount.toString()}>
              {TOP_UP_OPTIONS.map((option) => (
                <RadioGroupItem
                  key={option.amount}
                  value={option.amount.toString()}
                  onClick={() => setSelected(option)}
                >
                  {option.label} = {option.tokens.toLocaleString()} tokens
                </RadioGroupItem>
              ))}
            </RadioGroup>

            <Button onClick={handleTopUp} disabled={loading}>
              {loading ? "Loading..." : "Lanjut Bayar"}
            </Button>
          </>
        ) : (
          <div className="text-center">
            <p>Scan QR Code untuk bayar:</p>
            <img src={qrCode} alt="QRIS" className="mx-auto" />
            <p className="text-sm text-muted-foreground">
              Menunggu pembayaran...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 8. Implementation Phases

### Phase 1: Token Tracking (Week 1)
- [ ] Add `onFinish` callback ke chat API
- [ ] Create `usageEvents` table
- [ ] Create `recordTokenUsage` mutation
- [ ] Test: Verify tokens recorded correctly

### Phase 2: Quota System (Week 2)
- [ ] Create `userQuotas` table
- [ ] Create quota check/deduct mutations
- [ ] Add enforcement middleware to chat API
- [ ] Add QuotaWarningBanner component
- [ ] Test: Gratis user blocked at 100K

### Phase 3: Xendit Integration (Week 3)
- [ ] Setup Xendit account & API keys
- [ ] Create payment API routes
- [ ] Create webhook handler
- [ ] Create `payments` table
- [ ] Test: QRIS payment flow end-to-end

### Phase 4: BPP Credit System (Week 4)
- [ ] Create `creditBalances` table
- [ ] Create TopUpDialog component
- [ ] Integrate credit check in enforcement
- [ ] Test: Top up → use credits → deduct

### Phase 5: Pro Subscription (Week 5)
- [ ] Create Xendit recurring payment
- [ ] Create subscription management UI
- [ ] Add overage tracking for Pro
- [ ] Test: Subscribe → monthly renewal

### Phase 6: Polish & Analytics (Week 6)
- [ ] Usage dashboard for users
- [ ] Admin analytics panel
- [ ] Email notifications (low quota, payment success)
- [ ] Documentation & testing

---

## 9. Security Considerations

### 9.1 Webhook Security
- Always verify `x-callback-token`
- Validate payment amount matches database
- Use idempotency keys to prevent double-processing

### 9.2 Quota Manipulation Prevention
- Server-side enforcement only (never trust client)
- Audit log semua quota changes
- Rate limit API endpoints

### 9.3 Payment Security
- HTTPS only for all payment endpoints
- Never log full payment details
- PCI compliance via Xendit (no card data stored locally)

---

## 10. Monitoring & Alerts

### Metrics to Track
- Daily/monthly token usage per tier
- Payment success/failure rate
- Quota exceeded events
- Overage revenue (Pro tier)

### Alerts
- Payment failure rate > 5%
- Webhook delivery failures
- Unusual usage spikes
- Refund requests

---

## References

- `.references/subscription-system/xendit-integration.md` - Xendit API details
- `.references/subscription-system/token-billing.md` - Token tracking patterns
- `convex/migrations/seedPricingPlans.ts` - Current pricing data
- `convex/adminUserManagement.ts` - Admin auto-pro logic
