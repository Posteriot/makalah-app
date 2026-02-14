# Clerk Cleanup — Design Doc

**Date:** 2026-02-14
**Approach:** Single Sweep (one atomic commit)
**Risk:** Low — pure dead code removal, no behavior change

## Context

BetterAuth migration complete (PR #33 merged). Clerk code fully removed from `src/`. Remaining Clerk artifacts are legacy schema fields, env vars, one package, and one migration script.

## Scope

### Remove (Code)

| File | What | Detail |
|------|------|--------|
| `convex/schema.ts` | 3 legacy fields | `clerkUserId`, `clerkSyncStatus`, `clerkDeletedAt` |
| `convex/users.ts` | `clerkDeletedAt` filter | In `createAppUser` account linking logic |
| `package.json` | `@clerk/localizations` | Unused dependency |
| `scripts/reconcile-clerk-users.mjs` | Entire file | One-time migration script |

### Remove (Env)

| File | What |
|------|------|
| `.env.local` | 8 Clerk vars (BACKEND_API_URL, CLERK_SECRET_KEY, FRONTEND_API_URL, JWKS_URL, NEXT_PUBLIC_CLERK_*) |
| `.env.local.bak` | Entire file |
| `.env.example` | 4 commented Clerk vars |

### Out of Scope

- **Vercel env vars** — user handles manually via dashboard
- **Documentation** — not part of this cleanup
- **Convex env vars** — already clean

## Deploy Sequence

1. Edit all files
2. `npm install` (update lockfile)
3. `npx convex deploy --yes` (push schema without Clerk fields)
4. Commit → Push → PR → Merge

## Preconditions

- Clerk user data already cleaned from Convex database (confirmed by user)
- No production users with `clerkUserId` populated
- `by_clerkUserId` index already dropped in previous Convex deploy
