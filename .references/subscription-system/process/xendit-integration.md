# Xendit Payment Integration

Detail teknis integrasi Xendit untuk Makalah App.

## 1. Xendit Overview

### Payment Methods Indonesia

| Method | Type | Fee | Settlement |
|--------|------|-----|------------|
| **QRIS** | QR Code | 0.7% MDR | Real-time |
| **Virtual Account** | Bank Transfer | Rp 4,000-5,000 | Real-time |
| **OVO** | E-Wallet | 2.73% MDR | Real-time |
| **DANA** | E-Wallet | 1.5-3% MDR | Real-time |
| **ShopeePay** | E-Wallet | 2-4% MDR | Real-time |
| **Credit Card** | Card | 2.9% + Rp 2,000 | T+2 days |

**Rekomendasi untuk Makalah App:**
- Primary: **QRIS** (paling universal, fee rendah)
- Secondary: **Virtual Account** (untuk pembayaran besar)
- Optional: **E-Wallet** (convenience)

---

## 2. API Structure

### Base URL
- Production: `https://api.xendit.co`
- Sandbox: `https://api.xendit.co` (sama, beda API key)

### Authentication
```bash
# Basic Auth dengan secret key
curl -X POST https://api.xendit.co/v3/payment_requests \
  -u "xnd_production_xxx:"
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v3/payment_requests` | POST | Create payment |
| `/v3/payment_requests/{id}` | GET | Check status |
| `/v3/payment_requests/{id}/refunds` | POST | Create refund |
| `/v3/recurring/` | POST | Create subscription |

---

## 3. Payment Request Examples

### 3.1 QRIS Payment

```typescript
// POST /v3/payment_requests
const createQRISPayment = async (amount: number, referenceId: string) => {
  const response = await fetch('https://api.xendit.co/v3/payment_requests', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.XENDIT_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference_id: referenceId,
      amount,
      currency: 'IDR',
      payment_method: {
        type: 'QRIS',
        qris: {
          channel_code: 'QRIS'
        }
      },
      description: 'Top Up Credit Makalah',
      metadata: {
        user_id: userId,
        payment_type: 'credit_topup'
      }
    }),
  });

  return response.json();
};

// Response
{
  "id": "pr_xxx",
  "reference_id": "order_123",
  "status": "PENDING",
  "payment_method": {
    "type": "QRIS",
    "qris": {
      "channel_code": "QRIS",
      "qr_string": "00020101021226680016...",  // QR data
    }
  },
  "actions": [
    {
      "action": "DISPLAY_QR_CODE",
      "url": "https://qr.xendit.co/xxx"  // QR image URL
    }
  ]
}
```

### 3.2 Virtual Account Payment

```typescript
const createVAPayment = async (amount: number, referenceId: string) => {
  return fetch('https://api.xendit.co/v3/payment_requests', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.XENDIT_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference_id: referenceId,
      amount,
      currency: 'IDR',
      payment_method: {
        type: 'VIRTUAL_ACCOUNT',
        virtual_account: {
          channel_code: 'BCA',  // BNI, MANDIRI, BRI, etc.
          channel_properties: {
            customer_name: 'John Doe'
          }
        }
      },
      description: 'Pro Subscription',
    }),
  });
};

// Response
{
  "id": "pr_xxx",
  "status": "PENDING",
  "payment_method": {
    "type": "VIRTUAL_ACCOUNT",
    "virtual_account": {
      "channel_code": "BCA",
      "account_number": "1234567890123456"  // VA number
    }
  }
}
```

### 3.3 E-Wallet Payment

```typescript
const createEWalletPayment = async (
  amount: number,
  referenceId: string,
  channel: 'OVO' | 'DANA' | 'SHOPEEPAY'
) => {
  return fetch('https://api.xendit.co/v3/payment_requests', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.XENDIT_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference_id: referenceId,
      amount,
      currency: 'IDR',
      payment_method: {
        type: 'EWALLET',
        ewallet: {
          channel_code: channel,
          channel_properties: {
            success_redirect_url: `${APP_URL}/payment/success`,
            failure_redirect_url: `${APP_URL}/payment/failed`,
          }
        }
      },
    }),
  });
};

// Response includes redirect URL for e-wallet app
{
  "actions": [
    {
      "action": "REDIRECT",
      "url": "https://ewallet.xendit.co/xxx"  // Redirect ke app
    }
  ]
}
```

---

## 4. Webhook Handling

### 4.1 Webhook Events

| Event | Description |
|-------|-------------|
| `payment_request.succeeded` | Payment completed |
| `payment_request.failed` | Payment failed |
| `payment_request.expired` | Payment expired (timeout) |
| `recurring.cycle.succeeded` | Subscription renewal success |
| `recurring.cycle.failed` | Subscription renewal failed |

### 4.2 Webhook Payload Structure

```typescript
// payment_request.succeeded
{
  "id": "evt_xxx",
  "type": "payment_request.succeeded",
  "created": 1624000000,
  "data": {
    "id": "pr_xxx",
    "reference_id": "order_123",
    "status": "SUCCEEDED",
    "amount": 50000,
    "currency": "IDR",
    "paid_at": "2024-01-25T10:00:00Z",
    "payment_method": {
      "type": "QRIS"
    },
    "metadata": {
      "user_id": "user_123",
      "payment_type": "credit_topup"
    }
  }
}
```

### 4.3 Webhook Handler Implementation

```typescript
// src/app/api/webhooks/xendit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchMutation } from 'convex/nextjs';
import { api } from '@convex/_generated/api';

export async function POST(req: NextRequest) {
  // 1. Verify webhook token
  const callbackToken = req.headers.get('x-callback-token');

  if (callbackToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
    console.error('[Xendit Webhook] Invalid token');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse payload
  const payload = await req.json();
  const { type, data } = payload;

  console.log(`[Xendit Webhook] Received: ${type}`, data.id);

  // 3. Handle event types
  try {
    switch (type) {
      case 'payment_request.succeeded':
        await handlePaymentSuccess(data);
        break;

      case 'payment_request.failed':
        await handlePaymentFailed(data);
        break;

      case 'payment_request.expired':
        await handlePaymentExpired(data);
        break;

      case 'recurring.cycle.succeeded':
        await handleSubscriptionRenewal(data);
        break;

      default:
        console.log(`[Xendit Webhook] Unhandled event: ${type}`);
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('[Xendit Webhook] Processing error:', error);
    // Return 200 to prevent retries for processing errors
    return NextResponse.json({ status: 'error', message: String(error) });
  }
}

async function handlePaymentSuccess(data: XenditPaymentData) {
  // 1. Get payment from database
  const payment = await fetchQuery(api.payments.getByXenditId, {
    xenditId: data.id,
  });

  if (!payment) {
    console.error(`[Xendit] Payment not found: ${data.id}`);
    return;
  }

  // 2. Prevent duplicate processing
  if (payment.status === 'SUCCEEDED') {
    console.log(`[Xendit] Already processed: ${data.id}`);
    return;
  }

  // 3. Update payment status
  await fetchMutation(api.payments.updateStatus, {
    paymentId: payment._id,
    status: 'SUCCEEDED',
    paidAt: new Date(data.paid_at).getTime(),
  });

  // 4. Business logic based on payment type
  const metadata = data.metadata as PaymentMetadata;

  switch (metadata.payment_type) {
    case 'credit_topup':
      await fetchMutation(api.credits.addBalance, {
        userId: metadata.user_id,
        amountIDR: data.amount,
      });
      break;

    case 'paper_completion':
      await fetchMutation(api.papers.unlockExport, {
        sessionId: metadata.session_id,
      });
      break;

    case 'subscription':
      await fetchMutation(api.subscriptions.activate, {
        userId: metadata.user_id,
        tier: 'pro',
      });
      break;
  }

  // 5. Optional: Send confirmation email
  await sendPaymentConfirmationEmail(payment.userId, data.amount);
}

async function handlePaymentFailed(data: XenditPaymentData) {
  await fetchMutation(api.payments.updateStatus, {
    xenditId: data.id,
    status: 'FAILED',
    failureReason: data.failure_reason,
  });
}

async function handlePaymentExpired(data: XenditPaymentData) {
  await fetchMutation(api.payments.updateStatus, {
    xenditId: data.id,
    status: 'EXPIRED',
  });
}

async function handleSubscriptionRenewal(data: XenditRecurringData) {
  // Reset monthly quota
  await fetchMutation(api.quotas.resetMonthly, {
    userId: data.metadata.user_id,
  });
}
```

---

## 5. Recurring Payments (Subscriptions)

### 5.1 Create Subscription

```typescript
// POST /v3/recurring/
const createSubscription = async (
  userId: string,
  customerEmail: string
) => {
  const response = await fetch('https://api.xendit.co/v3/recurring/', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.XENDIT_SECRET_KEY + ':')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference_id: `sub_${userId}_${Date.now()}`,
      customer: {
        email: customerEmail,
      },
      recurring_action: 'PAYMENT',
      currency: 'IDR',
      amount: 99000,  // Rp 99,000/bulan
      schedule: {
        reference_id: `schedule_${userId}`,
        interval: 'MONTH',
        interval_count: 1,
        total_recurrence: null,  // Infinite
        anchor_date: new Date().toISOString(),
      },
      immediate_action_type: 'FULL_AMOUNT',
      notification_config: {
        recurring_created: ['EMAIL'],
        recurring_succeeded: ['EMAIL'],
        recurring_failed: ['EMAIL'],
      },
      metadata: {
        user_id: userId,
        tier: 'pro',
      },
    }),
  });

  return response.json();
};
```

### 5.2 Cancel Subscription

```typescript
// POST /v3/recurring/{recurring_id}/deactivate
const cancelSubscription = async (recurringId: string) => {
  return fetch(`https://api.xendit.co/v3/recurring/${recurringId}/deactivate`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(process.env.XENDIT_SECRET_KEY + ':')}`,
    },
  });
};
```

---

## 6. Error Handling

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `PAYMENT_METHOD_NOT_ACTIVE` | Payment method unavailable | Show alternative methods |
| `INVALID_AMOUNT` | Amount out of range | Validate before submit |
| `DUPLICATE_REFERENCE` | Reference ID already used | Generate new reference |
| `CHANNEL_NOT_AVAILABLE` | Bank/e-wallet down | Retry or show alternative |

### Error Handler

```typescript
// src/lib/xendit/errors.ts
export function handleXenditError(error: XenditError): {
  userMessage: string;
  retryable: boolean;
} {
  switch (error.error_code) {
    case 'PAYMENT_METHOD_NOT_ACTIVE':
      return {
        userMessage: 'Metode pembayaran tidak tersedia. Coba metode lain.',
        retryable: false,
      };

    case 'CHANNEL_NOT_AVAILABLE':
      return {
        userMessage: 'Layanan sedang gangguan. Coba beberapa menit lagi.',
        retryable: true,
      };

    case 'INVALID_AMOUNT':
      return {
        userMessage: 'Nominal tidak valid.',
        retryable: false,
      };

    default:
      return {
        userMessage: 'Terjadi kesalahan. Silakan coba lagi.',
        retryable: true,
      };
  }
}
```

---

## 7. Testing

### Sandbox Testing

```bash
# Use sandbox API key
XENDIT_SECRET_KEY=xnd_development_xxx

# Test cards
4000000000000002 - Success
4000000000000010 - Declined

# Test VA
- Any amount works
- Payment simulated via dashboard

# Test QRIS
- Scan with any QRIS app
- Simulated success via dashboard
```

### Development Webhook Testing

```bash
# 1. Start ngrok
ngrok http 3000

# 2. Update webhook URL in Xendit Dashboard
# https://xxx.ngrok.io/api/webhooks/xendit

# 3. Send test webhook
curl -X POST http://localhost:3000/api/webhooks/xendit \
  -H "x-callback-token: your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_request.succeeded",
    "data": {
      "id": "pr_test_123",
      "reference_id": "order_test_123",
      "amount": 50000,
      "status": "SUCCEEDED",
      "paid_at": "2024-01-25T10:00:00Z",
      "metadata": {
        "user_id": "test_user",
        "payment_type": "credit_topup"
      }
    }
  }'
```

---

## 8. Environment Variables

```bash
# .env.local
XENDIT_SECRET_KEY=xnd_production_xxxx
XENDIT_PUBLIC_KEY=xnd_public_xxxx
XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token

# Optional
XENDIT_CALLBACK_URL=https://your-domain.com/api/webhooks/xendit
```

---

## 9. Security Checklist

- [ ] Webhook token stored in environment variable
- [ ] Always verify `x-callback-token` header
- [ ] Cross-check payment amount with database
- [ ] Use idempotency keys for payment creation
- [ ] HTTPS only for webhook URL
- [ ] Log all webhook events for audit
- [ ] Never expose API keys in client code
