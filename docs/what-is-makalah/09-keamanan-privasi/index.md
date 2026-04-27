# Kategori 09: Keamanan & Privasi

Dokumentasi ini menjelaskan arsitektur keamanan Makalah AI secara menyeluruh. Seluruh klaim telah diverifikasi langsung terhadap kode produksi melalui forensic audit.

## 🗺️ Peta Navigasi

| File | Topik | Sumber Kode Utama |
|---|---|---|
| [01-route-protection.md](./01-route-protection.md) | Middleware & gating request unauthenticated | `src/proxy.ts` |
| [02-auth-architecture.md](./02-auth-architecture.md) | Arsitektur BetterAuth + cross-domain session | `convex/auth.ts`, `src/lib/auth-server.ts` |
| [03-two-factor-auth.md](./03-two-factor-auth.md) | Sistem 2FA OTP + cross-domain bypass | `convex/twoFactorHttp.ts`, `convex/twoFactorOtp.ts`, `convex/twoFactorBypass.ts` |
| [04-rbac-authorization.md](./04-rbac-authorization.md) | Role hierarchy + ownership enforcement | `convex/permissions.ts`, `convex/authHelpers.ts` |
| [05-webhook-security.md](./05-webhook-security.md) | Keamanan webhook pembayaran Xendit | `src/app/api/webhooks/payment/route.ts`, `src/lib/payment/adapters/xendit.ts` |
| [06-rate-limiting.md](./06-rate-limiting.md) | Rate limiting auth recovery & OTP | `convex/authRecovery.ts`, `convex/twoFactorOtp.ts` |

---

## 🛡️ Postur Keamanan Makalah AI

Makalah AI menerapkan **defense-in-depth** — berlapis, bukan monolitik. Tidak ada satu titik tunggal yang menentukan seluruh keamanan sistem.

### Layer Keamanan (Urutan Eksekusi)

```
HTTP Request
     │
     ▼
┌─────────────────────────────────┐
│  Layer 1: Route Protection      │  src/proxy.ts
│  Cookie presence check          │  Gerbang kasar — blokir tanpa cookie
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Layer 2: Auth Architecture     │  convex/auth.ts + auth-server.ts
│  Session token validation       │  Verifikasi session aktual via Convex
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Layer 3: 2FA Enforcement       │  convex/twoFactor*.ts
│  OTP verification + bypass flow │  Default-on 2FA, cross-domain safe
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Layer 4: RBAC Authorization    │  convex/permissions.ts
│  Role hierarchy + ownership     │  Numeric comparison, tidak bisa bypass
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  Layer 5: Abuse Prevention      │  convex/authRecovery.ts
│  Rate limiting multi-dimensi    │  Per-key, per-email, per-IP
└─────────────────────────────────┘

Jalur terpisah (Webhook):
     │
     ▼
┌─────────────────────────────────┐
│  Webhook Security               │  src/app/api/webhooks/payment/
│  Token verification + idempotency│  Header `x-callback-token` + status check
└─────────────────────────────────┘
```

### Prinsip Desain Keamanan

1. **No Single Point of Trust** — Middleware hanya cek cookie presence; validasi session sesungguhnya ada di Convex backend.
2. **Default Secure** — 2FA auto-enabled setelah email verification; user yang tidak mau harus opt-out aktif.
3. **Email Privacy** — Sistem tidak mengungkap apakah email terdaftar atau tidak pada alur 2FA OTP send.
4. **One-Time Tokens** — Semua bypass token dan OTT (one-time token) adalah single-use dengan TTL ketat.
5. **Defense Against Brute Force** — Rate limiting berlapis: per-key, per-email, per-IP dengan cooldown escalating.
6. **Idempotent Webhooks** — Webhook payment Xendit dilindungi dari replay attack via status idempotency check.

---

> [!NOTE]
> Semua file di kategori ini adalah hasil **forensic audit** terhadap kode produksi. Kebenaran tertinggi adalah kode, bukan komentar atau dokumentasi lain.
