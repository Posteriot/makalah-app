# Account Linking UX Communication Design

**Date:** 2026-02-13
**Status:** Approved
**Problem:** Clerk auto-links OAuth accounts (Google) to existing email+password accounts without user awareness

## Context

Clerk's account linking is a built-in, non-configurable behavior. When a user who registered with email+password later signs in via Google OAuth with the same email, Clerk automatically merges both identities into one account — bypassing password verification. This is industry standard (Google, GitHub, Notion, Figma all do this), but can feel confusing to users who expect password-only access.

**Decision:** Accept Clerk's behavior (secure, industry standard) and add UX communication to make users aware of account linking.

## Design

### Component 1: Toast Notification (AccountLinkingNotice)

**Trigger Conditions:**
- Clerk `user.passwordEnabled === true`
- Clerk `user.externalAccounts.length > 0`
- Convex `hasSeenLinkingNotice !== true`

**Copy:**
> **Akun terhubung dengan Google**
> Anda sekarang bisa masuk pakai Google atau password — keduanya terhubung ke akun yang sama. Kelola di Pengaturan Profil.

**Visual (Mechanical Grace):**
- Toast position: bottom-right
- Border: 1px solid sky (info signal)
- Icon: Iconoir `InfoCircle` (16px, sky)
- Font: Geist Sans, 12px
- Duration: persistent (manual dismiss)
- Action link: "Pengaturan Profil" -> Clerk UserProfile

**Placement:** All authenticated pages post-login. Component mounted at layout level shared across `/chat`, `/dashboard`, `/settings`, etc.

**Behavior:**
1. On mount, check Clerk user data + Convex flag
2. If conditions met, show persistent toast
3. On dismiss, call `markLinkingNoticeSeen` mutation
4. Never show again for that user

### Component 2: Sign-In Page Micro-Copy

**Copy:**
> Akun Anda akan otomatis terhubung Google jika masuk menggunakan alamat email yang sama.

**Visual:**
- Font: Geist Sans, 10px, `text-muted-foreground`
- Position: sibling below `<SignIn />` component inside `<AuthWideCard>`
- Alignment: center
- Margin: `mt-3`

**Placement:** Both sign-in and sign-up pages for consistency.

## Implementation Scope

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `hasSeenLinkingNotice?: boolean` to users table |
| `convex/users.ts` | Add `markLinkingNoticeSeen` mutation |
| `src/components/auth/AccountLinkingNotice.tsx` | New client component: detection + toast |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Add micro-copy sibling |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Add micro-copy sibling |
| Authenticated layout wrapper(s) | Mount `<AccountLinkingNotice />` |

## Alternatives Considered

| Option | Verdict |
|--------|---------|
| Remove Google OAuth from sign-in | Rejected — hurts UX and market appeal |
| Migrate to Better Auth | Rejected — disproportionate effort for this issue |
| Clerk Elements (headless) | Rejected — deprecated, no longer maintained |
| Custom flow with `useSignIn` hooks | Rejected — significant rebuild for one micro-copy placement |
| Block Google sign-in for password users | Not possible with Clerk |

## References

- [Clerk Account Linking Docs](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/account-linking)
- [Clerk Elements Status (deprecated)](https://clerk.com/docs/guides/customizing-clerk/elements/overview)
- [Clerk Custom Flows](https://clerk.com/docs/guides/development/custom-flows/authentication/sign-in-or-up)
