# Token-Based Billing Patterns

Dokumentasi pola billing berbasis token untuk aplikasi AI.

## 1. Token Basics

### Apa itu Token?

Token adalah unit terkecil teks yang diproses oleh LLM:
- ~4 karakter = 1 token (English)
- ~2-3 karakter = 1 token (Indonesian)
- 1 halaman teks (~500 kata) = ~750 tokens

### Token Pricing (Gemini 2.5 Flash)

| Type | USD per 1M | IDR per 1K |
|------|-----------|------------|
| Input | $0.075 | Rp 1.20 |
| Output | $0.30 | Rp 4.80 |
| Blended | ~$0.19 | ~Rp 3.00 |

### Cost Examples

| Operation | Input | Output | Total Tokens | Cost IDR |
|-----------|-------|--------|--------------|----------|
| Simple chat | 500 | 200 | 700 | Rp 2 |
| Paper section | 2,000 | 1,500 | 3,500 | Rp 11 |
| Full paper | 50,000 | 30,000 | 80,000 | Rp 240 |

---

## 2. Tracking Implementation

### 2.1 Vercel AI SDK `onFinish`

```typescript
// src/app/api/chat/route.ts
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { messages, userId, conversationId } = await req.json();

  const result = await streamText({
    model: getGatewayModel(),
    messages,

    // Token tracking happens here
    onFinish: async (completion) => {
      const { promptTokens, completionTokens, totalTokens } = completion.usage;

      // Record to database
      await recordTokenUsage({
        userId,
        conversationId,
        promptTokens,
        completionTokens,
        totalTokens,
        model: completion.model,
        timestamp: Date.now(),
      });

      // Update quota
      await deductFromQuota(userId, totalTokens);
    },
  });

  return result.toUIMessageStreamResponse();
}
```

### 2.2 Pre-flight Token Estimation

```typescript
// src/lib/billing/token-estimator.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function estimateTokens(text: string): Promise<number> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  // countTokens is FREE (3000 requests/minute)
  const result = await model.countTokens(text);
  return result.totalTokens;
}

export async function estimateOperationCost(
  systemPrompt: string,
  userMessage: string,
  expectedOutputMultiplier: number = 1.5
): Promise<{
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  estimatedCostIDR: number;
}> {
  const inputTokens = await estimateTokens(systemPrompt + userMessage);
  const outputTokens = Math.ceil(inputTokens * expectedOutputMultiplier);
  const totalTokens = inputTokens + outputTokens;

  const costIDR = calculateCostIDR(inputTokens, outputTokens);

  return {
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedTotalTokens: totalTokens,
    estimatedCostIDR: costIDR,
  };
}
```

### 2.3 Cost Calculation

```typescript
// src/lib/billing/cost-calculator.ts

const TOKEN_COSTS = {
  'google/gemini-2.5-flash-lite': {
    inputPerMillion: 0.075,   // USD
    outputPerMillion: 0.30,   // USD
  },
  'google/gemini-2.5-flash-lite:online': {
    inputPerMillion: 0.10,    // USD (slightly higher for web search)
    outputPerMillion: 0.40,   // USD
  },
};

const USD_TO_IDR = 16000;

export function calculateCostIDR(
  inputTokens: number,
  outputTokens: number,
  model: string = 'google/gemini-2.5-flash-lite'
): number {
  const costs = TOKEN_COSTS[model];
  if (!costs) throw new Error(`Unknown model: ${model}`);

  const costUSD =
    (inputTokens * costs.inputPerMillion / 1_000_000) +
    (outputTokens * costs.outputPerMillion / 1_000_000);

  return Math.ceil(costUSD * USD_TO_IDR);
}

// Simplified: cost per 1K tokens
export function costPer1KTokens(model: string = 'google/gemini-2.5-flash-lite'): number {
  const costs = TOKEN_COSTS[model];
  // Assume 60% input, 40% output ratio
  const blendedRate = costs.inputPerMillion * 0.6 + costs.outputPerMillion * 0.4;
  return Math.ceil((blendedRate / 1000) * USD_TO_IDR); // ~Rp 3/1K tokens
}
```

---

## 3. Database Schema

### usageEvents Table

```typescript
// convex/schema.ts
usageEvents: defineTable({
  userId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  sessionId: v.optional(v.id("paperSessions")),

  // Token counts
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
    v.literal("web_search"),
    v.literal("citation_generation")
  ),

  // Timestamp
  createdAt: v.number(),
})
  .index("by_user_time", ["userId", "createdAt"])
  .index("by_session", ["sessionId"])
  .index("by_user_day", ["userId", "createdAt"]),
```

### Mutations

```typescript
// convex/usage.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const recordTokenUsage = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    sessionId: v.optional(v.id("paperSessions")),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    model: v.string(),
    operationType: v.string(),
  },
  handler: async (ctx, args) => {
    const costIDR = calculateCostIDR(args.promptTokens, args.completionTokens, args.model);

    return await ctx.db.insert("usageEvents", {
      ...args,
      costIDR,
      createdAt: Date.now(),
    });
  },
});

export const getUserUsageThisMonth = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", userId).gte("createdAt", startOfMonth.getTime())
      )
      .collect();

    const totals = events.reduce(
      (acc, event) => ({
        totalTokens: acc.totalTokens + event.totalTokens,
        totalCostIDR: acc.totalCostIDR + event.costIDR,
        count: acc.count + 1,
      }),
      { totalTokens: 0, totalCostIDR: 0, count: 0 }
    );

    return totals;
  },
});

export const getUserUsageToday = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", userId).gte("createdAt", startOfDay.getTime())
      )
      .collect();

    return events.reduce((sum, e) => sum + e.totalTokens, 0);
  },
});

export const getUsageBreakdown = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", userId).gte("createdAt", startOfMonth.getTime())
      )
      .collect();

    // Group by operation type
    const breakdown = events.reduce((acc, event) => {
      const type = event.operationType;
      if (!acc[type]) {
        acc[type] = { tokens: 0, cost: 0, count: 0 };
      }
      acc[type].tokens += event.totalTokens;
      acc[type].cost += event.costIDR;
      acc[type].count += 1;
      return acc;
    }, {} as Record<string, { tokens: number; cost: number; count: number }>);

    return Object.entries(breakdown).map(([type, data]) => ({
      type,
      ...data,
    }));
  },
});
```

---

## 4. Quota System

### Tier Limits

```typescript
// convex/billing/constants.ts
export const TIER_LIMITS = {
  gratis: {
    monthlyTokens: 100_000,    // 100K tokens/bulan
    dailyTokens: 5_000,        // 5K tokens/hari
    monthlyPapers: 2,          // Max 2 paper drafts
    hardLimit: true,           // Block when exceeded
  },
  bpp: {
    // Credit-based, no hard monthly limit
    monthlyTokens: Infinity,
    dailyTokens: Infinity,
    monthlyPapers: Infinity,
    creditBased: true,
  },
  pro: {
    monthlyTokens: 5_000_000,  // 5M tokens/bulan
    dailyTokens: 200_000,      // 200K tokens/hari
    monthlyPapers: Infinity,
    hardLimit: false,
    overageAllowed: true,
    overageRateIDR: 0.05,      // Rp 0.05 per token overage
  },
} as const;
```

### Quota Enforcement

```typescript
// src/lib/billing/enforcement.ts
export interface QuotaCheckResult {
  allowed: boolean;
  tier: string;
  reason?: string;
  message?: string;
  action?: 'upgrade' | 'topup' | 'wait';
  warning?: string;
}

export async function enforceQuota(
  userId: string,
  estimatedTokens: number
): Promise<QuotaCheckResult> {
  const user = await getUser(userId);
  const tier = user.subscriptionStatus;
  const limits = TIER_LIMITS[tier];

  // Admin bypass
  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, tier: 'pro' };
  }

  // BPP: Check credit balance
  if (tier === 'bpp') {
    const balance = await getCreditBalance(userId);
    const estimatedCost = calculateCostIDR(estimatedTokens * 0.4, estimatedTokens * 0.6);

    if (balance < estimatedCost) {
      return {
        allowed: false,
        tier: 'bpp',
        reason: 'insufficient_credit',
        message: `Saldo tidak cukup. Butuh ~Rp ${estimatedCost}`,
        action: 'topup',
      };
    }
    return { allowed: true, tier: 'bpp' };
  }

  // Check daily limit
  const todayUsage = await getUserUsageToday(userId);
  if (todayUsage + estimatedTokens > limits.dailyTokens) {
    return {
      allowed: false,
      tier,
      reason: 'daily_limit',
      message: 'Limit harian tercapai. Reset besok jam 00:00.',
      action: 'wait',
    };
  }

  // Check monthly limit
  const quota = await getUserQuota(userId);
  if (quota.remainingTokens < estimatedTokens) {
    if (limits.hardLimit) {
      return {
        allowed: false,
        tier,
        reason: 'monthly_limit',
        message: `Quota bulanan habis (${quota.allottedTokens.toLocaleString()} tokens)`,
        action: 'upgrade',
      };
    }

    // Soft limit (Pro): Allow with warning
    if (limits.overageAllowed) {
      const overage = estimatedTokens - quota.remainingTokens;
      const overageCost = Math.ceil(overage * limits.overageRateIDR);
      return {
        allowed: true,
        tier,
        warning: `Melewati quota. Overage ~${overage.toLocaleString()} tokens = Rp ${overageCost}`,
      };
    }
  }

  // Check warning threshold (20% remaining)
  if (quota.remainingTokens < quota.allottedTokens * 0.2) {
    return {
      allowed: true,
      tier,
      warning: `Sisa ${quota.remainingTokens.toLocaleString()} tokens (${Math.round(quota.remainingTokens / quota.allottedTokens * 100)}%)`,
    };
  }

  return { allowed: true, tier };
}
```

---

## 5. Credit System (BPP Tier)

### Credit Balance Table

```typescript
// convex/schema.ts
creditBalances: defineTable({
  userId: v.id("users"),
  balanceIDR: v.number(),        // Current balance in IDR
  lastTopUpAt: v.optional(v.number()),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"]),

creditTransactions: defineTable({
  userId: v.id("users"),
  type: v.union(v.literal("topup"), v.literal("deduct"), v.literal("refund")),
  amountIDR: v.number(),
  balanceAfter: v.number(),
  description: v.string(),
  referenceId: v.optional(v.string()),  // Payment ID, usage event ID, etc.
  createdAt: v.number(),
})
  .index("by_user_time", ["userId", "createdAt"]),
```

### Credit Mutations

```typescript
// convex/credits.ts
export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    amountIDR: v.number(),
    paymentId: v.optional(v.id("payments")),
  },
  handler: async (ctx, { userId, amountIDR, paymentId }) => {
    const existing = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      const newBalance = existing.balanceIDR + amountIDR;
      await ctx.db.patch(existing._id, {
        balanceIDR: newBalance,
        lastTopUpAt: now,
        updatedAt: now,
      });

      // Record transaction
      await ctx.db.insert("creditTransactions", {
        userId,
        type: "topup",
        amountIDR,
        balanceAfter: newBalance,
        description: `Top up Rp ${amountIDR.toLocaleString()}`,
        referenceId: paymentId,
        createdAt: now,
      });

      return newBalance;
    }

    // Create new balance
    await ctx.db.insert("creditBalances", {
      userId,
      balanceIDR: amountIDR,
      lastTopUpAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("creditTransactions", {
      userId,
      type: "topup",
      amountIDR,
      balanceAfter: amountIDR,
      description: `Initial top up Rp ${amountIDR.toLocaleString()}`,
      referenceId: paymentId,
      createdAt: now,
    });

    return amountIDR;
  },
});

export const deductCredits = mutation({
  args: {
    userId: v.id("users"),
    amountIDR: v.number(),
    description: v.string(),
    usageEventId: v.optional(v.id("usageEvents")),
  },
  handler: async (ctx, { userId, amountIDR, description, usageEventId }) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!balance || balance.balanceIDR < amountIDR) {
      throw new Error("Insufficient credit balance");
    }

    const newBalance = balance.balanceIDR - amountIDR;
    const now = Date.now();

    await ctx.db.patch(balance._id, {
      balanceIDR: newBalance,
      updatedAt: now,
    });

    await ctx.db.insert("creditTransactions", {
      userId,
      type: "deduct",
      amountIDR: -amountIDR,
      balanceAfter: newBalance,
      description,
      referenceId: usageEventId,
      createdAt: now,
    });

    return newBalance;
  },
});

export const getCreditBalance = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return balance?.balanceIDR ?? 0;
  },
});
```

---

## 6. Monthly Quota Reset

### Cron Job Setup

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Reset quotas at 00:00 UTC on 1st of each month
crons.monthly(
  "reset monthly quotas",
  { day: 1, hourUTC: 0, minuteUTC: 0 },
  internal.quotas.resetAllMonthlyQuotas
);

export default crons;
```

### Reset Mutation

```typescript
// convex/quotas.ts
export const resetAllMonthlyQuotas = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

    // Get all active quotas
    const quotas = await ctx.db.query("userQuotas").collect();

    for (const quota of quotas) {
      // Get user's tier
      const user = await ctx.db.get(quota.userId);
      if (!user) continue;

      const tier = user.subscriptionStatus;
      const limits = TIER_LIMITS[tier] || TIER_LIMITS.gratis;

      // Skip credit-based tiers
      if (limits.creditBased) continue;

      // Reset quota
      await ctx.db.patch(quota._id, {
        periodStart: now,
        periodEnd: thirtyDaysFromNow,
        allottedTokens: limits.monthlyTokens,
        usedTokens: 0,
        remainingTokens: limits.monthlyTokens,
        allottedPapers: limits.monthlyPapers,
        completedPapers: 0,
        overageTokens: 0,
        overageCostIDR: 0,
        updatedAt: now,
      });
    }

    console.log(`[Quota Reset] Reset ${quotas.length} quotas at ${new Date(now).toISOString()}`);
  },
});
```

---

## 7. UI Components

### Usage Progress Bar

```tsx
// src/components/billing/UsageProgress.tsx
export function UsageProgress({ userId }: { userId: string }) {
  const quota = useQuery(api.quotas.getUserQuota, { userId });

  if (!quota) return null;

  const percentage = (quota.usedTokens / quota.allottedTokens) * 100;
  const isLow = percentage > 80;
  const isCritical = percentage > 95;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Token Usage</span>
        <span className={cn(
          isCritical && "text-destructive",
          isLow && !isCritical && "text-warning"
        )}>
          {quota.usedTokens.toLocaleString()} / {quota.allottedTokens.toLocaleString()}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          isCritical && "bg-destructive/20 [&>div]:bg-destructive",
          isLow && !isCritical && "bg-warning/20 [&>div]:bg-warning"
        )}
      />
      {isLow && (
        <p className="text-xs text-muted-foreground">
          {isCritical ? "Quota hampir habis!" : "Sisa kurang dari 20%"}
          {" "}
          <Link href="/pricing" className="underline">Upgrade</Link>
        </p>
      )}
    </div>
  );
}
```

### Credit Balance Display

```tsx
// src/components/billing/CreditBalance.tsx
export function CreditBalance({ userId }: { userId: string }) {
  const balance = useQuery(api.credits.getCreditBalance, { userId });

  if (balance === undefined) return <Skeleton className="h-6 w-24" />;

  const isLow = balance < 10000; // Less than Rp 10K

  return (
    <div className="flex items-center gap-2">
      <Wallet className="h-4 w-4" />
      <span className={cn(isLow && "text-warning")}>
        Rp {balance.toLocaleString()}
      </span>
      {isLow && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/billing/topup">Top Up</Link>
        </Button>
      )}
    </div>
  );
}
```

---

## 8. Real-World References

### ChatGPT Plus vs Free

| Aspect | Free | Plus ($20/mo) |
|--------|------|---------------|
| Model Access | GPT-4o mini | All models |
| Usage | Soft cap | Generous limits |
| Speed | Standard | Faster |
| Features | Basic | Advanced (memory, etc.) |

### Claude Pro vs Free

| Aspect | Free | Pro ($20/mo) |
|--------|------|--------------|
| Messages | ~20/day | 5x more |
| Priority | Standard | Priority |
| Features | Basic | Projects, etc. |

### GitHub Copilot

| Tier | Completions | Chat |
|------|-------------|------|
| Free | 2,000/month | 50/month |
| Pro ($10/mo) | Unlimited | Unlimited |

---

## 9. Sources

- [Vercel AI SDK - Record Token Usage](https://ai-sdk.dev/cookbook/rsc/stream-ui-record-token-usage)
- [Gemini Token Counting API](https://ai.google.dev/gemini-api/docs/tokens)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Stripe Usage-Based Billing](https://docs.stripe.com/billing/subscriptions/usage-based)
