# Subscription Tier: Determination Logic & Inconsistency Audit

## The Correct Pattern (Pattern A)

Admin/superadmin harus selalu diperlakukan sebagai PRO, regardless of `subscriptionStatus` di database. Baru setelah itu, cek `subscriptionStatus` untuk user biasa.

```typescript
function getEffectiveTier(role?: string, subscriptionStatus?: string): "gratis" | "bpp" | "pro" {
  // Admin and superadmin are always treated as PRO (unlimited access)
  if (role === "superadmin" || role === "admin") return "pro"

  // Regular users: check subscriptionStatus
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"

  return "gratis" // default for "free", "canceled", undefined
}
```

**Kenapa**: Admin/superadmin di database tetap `subscriptionStatus: "free"` (default saat user creation). Tidak ada mutation yang auto-update field ini berdasarkan role. Backend billing (Convex) sudah bypass quota untuk admin, tapi frontend display banyak yang tidak.

---

## Audit: Mana yang Benar, Mana yang Bug

### Implementasi yang BENAR (Pattern A)

| Lokasi | Function | Line | Keterangan |
|--------|----------|------|------------|
| `src/components/layout/header/GlobalHeader.tsx` | `getSegmentFromUser()` | 64-70 | Cek role dulu, baru subscriptionStatus |
| `src/components/ui/SegmentBadge.tsx` | `getSubscriptionTier()` | 47-56 | Logic identik dengan GlobalHeader |
| `src/components/chat/shell/ShellHeader.tsx` | (pakai SegmentBadge) | 60-64 | Pass `role` + `subscriptionStatus` ke SegmentBadge |
| `convex/billing/quotas.ts` | `deductQuota()` | 170-172 | Admin bypass: `return { success: true, bypassed: true }` |
| `convex/billing/quotas.ts` | `checkQuota()` | 304-306 | Admin bypass: `return { allowed: true, tier: "pro" }` |
| `convex/billing/quotas.ts` | `getQuotaStatus()` | 422-429 | Admin: `return { tier: "pro", unlimited: true }` |

### Implementasi yang BUG (Pattern B — hanya baca `subscriptionStatus`)

| Lokasi | Line | Code | Impact |
|--------|------|------|--------|
| `src/components/settings/StatusTab.tsx` | 80 | `const tierKey = (convexUser?.subscriptionStatus \|\| "free")` | Admin terlihat GRATIS + tombol Upgrade muncul |
| `src/app/(dashboard)/subscription/overview/page.tsx` | 125 | `const tier = (user?.subscriptionStatus \|\| "free")` | Admin terlihat GRATIS + Upgrade CTA muncul |
| `src/components/chat/QuotaWarningBanner.tsx` | 60 | `const tier = user.subscriptionStatus \|\| "free"` | Admin bisa lihat quota warning |
| `src/lib/billing/enforcement.ts` | 128 | `const tier = user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus` | Tier determination salah untuk admin |

### Implementasi Kosmetik (admin panel, display-only)

| Lokasi | Line | Keterangan |
|--------|------|------------|
| `src/components/admin/AdminPanelContainer.tsx` | 211-214 | Count users by raw status (admin panel stats) |
| `src/components/admin/UserList.tsx` | 128 | Shows raw `subscriptionStatus` text |

Dua lokasi admin panel di atas adalah **display-only** di admin view. Tidak kritis karena admin melihat data raw dari DB untuk manajemen, tapi tetap perlu awareness bahwa angka count bisa misleading (admin yang `subscriptionStatus: "free"` dihitung sebagai gratis).

---

## Duplicate Logic Problem

Saat ini, Pattern A di-copy-paste di 2 tempat terpisah:

1. `GlobalHeader.tsx:getSegmentFromUser()` (line 64-70)
2. `SegmentBadge.tsx:getSubscriptionTier()` (line 47-56)

Kedua function ini logic-nya **identik** tapi masing-masing define ulang. Ini melanggar DRY — kalau ada perubahan aturan tier, harus update di semua tempat.

**Solusi**: Satu shared utility function di `src/lib/utils/subscription.ts` yang dipakai oleh semua consumer.

---

## Upgrade Button Logic

### Aturan saat ini (di TIER_CONFIG `StatusTab.tsx`)

| Tier Efektif | Show Upgrade? | Link Tujuan |
|-------------|---------------|-------------|
| gratis | Ya | `/subscription/upgrade` |
| bpp | Ya | `/subscription/upgrade` |
| pro | Tidak | — |

### Catatan bisnis

- **Gratis** bisa upgrade ke BPP (beli credit) atau langsung ke Pro (subscribe)
- **BPP** bisa upgrade ke Pro (subscribe)
- **Pro** tidak perlu upgrade (tier tertinggi)
- **Admin/superadmin** diperlakukan sebagai Pro — tidak perlu tombol Upgrade

---

## Recommended Fix Strategy

### Phase 1: Shared utility (saat ini)
1. Buat `src/lib/utils/subscription.ts` dengan `getEffectiveTier(role, subscriptionStatus)`
2. Refactor `StatusTab.tsx` untuk pakai utility ini
3. Tidak sentuh file lain yang di luar scope

### Phase 2: Konsistensi seluruh codebase (future)
4. Refactor `GlobalHeader.tsx` dan `SegmentBadge.tsx` untuk pakai utility yang sama
5. Fix `subscription/overview/page.tsx`
6. Fix `QuotaWarningBanner.tsx`
7. Fix `billing/enforcement.ts`
8. Review admin panel display (AdminPanelContainer, UserList)
