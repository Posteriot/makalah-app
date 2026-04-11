# Tier-Aware Promote/Demote — Design

Date: 2026-04-10

## Problem

Admin panel User Management has a binary promote/demote system: promote user → admin (unlimited), demote admin → user (free). No way to promote/demote between intermediate subscription tiers (free ↔ bpp ↔ pro) through the Promote column. A hidden tier change exists (clickable subscription badge) but is not discoverable.

## Design

### Tier Hierarchy

`free` → `bpp` → `pro` → `unlimited` (admin)

### Actions Matrix

| Current Tier | Promote Options | Demote Options | Who Can Act |
|---|---|---|---|
| GRATIS (free) | BPP, PRO, Admin | — | Admin/Superadmin (tier), Superadmin (admin) |
| BPP | PRO, Admin | Gratis | Admin/Superadmin (tier), Superadmin (admin) |
| PRO | Admin | BPP, Gratis | Admin/Superadmin (tier), Superadmin (admin) |
| Admin (unlimited) | — | PRO, BPP, Gratis | Superadmin only |

Rules:
- Promote = all tiers above current tier
- Demote = all tiers below current tier
- Promote/demote to/from Admin = superadmin only
- Promote/demote between free/bpp/pro = admin + superadmin
- GRATIS has no Demote (lowest tier)
- Admin has no Promote (highest tier; superadmin cannot be modified)

### UI Behavior

**Buttons per user in Promote column:**

| Current Tier | Buttons |
|---|---|
| GRATIS | `↑ Promote` (green) |
| BPP | `↑ Promote` (green) + `↓ Demote` (amber) |
| PRO | `↑ Promote` (green) + `↓ Demote` (amber) |
| Admin | `↓ Demote` (amber) |
| Superadmin | `— Cannot modify` |

**Dialog behavior:**
- Click Promote/Demote → opens dialog with available tier options (per matrix above)
- Tier options displayed as button cards (reuse existing `changeTier` dialog pattern)
- "Admin" option styled differently (warning border) with text: "User akan mendapatkan akses admin panel"
- Demote from Admin also shows warning: "User akan kehilangan akses admin panel"
- Current tier → disabled with "Saat ini" label

**Removed:**
- Clickable subscription badge — badge becomes static label. All tier changes go through Promote/Demote buttons.

### Backend Changes

**Refactor `demoteToUser` → `demoteFromAdmin`:**
- New arg: `targetTier: "free" | "bpp" | "pro"`
- Requires superadmin role
- Validates target is admin (not superadmin, not regular user)
- Patches: `role = "user"`, `subscriptionStatus = targetTier`

**No changes to:**
- `promoteToAdmin` — works as-is (set role=admin, subscription=unlimited)
- `updateSubscriptionTier` — works as-is (handles free/bpp/pro for regular users)

### Files Changed

| File | Change |
|---|---|
| `convex/adminUserManagement.ts` | Refactor `demoteToUser` → `demoteFromAdmin` with `targetTier` arg |
| `src/components/admin/UserList.tsx` | Refactor promote/demote to tier-aware, unified dialog, remove clickable badge |
| `src/components/admin/UserListFullscreen.tsx` | Verify if changes needed (uses `renderDynamicCell` from parent props) |

### Files NOT Changed

- `convex/schema.ts` — no new fields
- `convex/permissions.ts` — permission hierarchy unchanged
- `convex/billing/constants.ts` — tier definitions unchanged
- `src/lib/utils/subscription.ts` — `getEffectiveTier()` unchanged
