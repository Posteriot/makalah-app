# 04. Kontrol Admin & Manajemen User

Dokumen ini menjelaskan sistem kontrol admin Makalah AI: arsitektur RBAC (Role-Based Access Control), kekuasaan superadmin dan admin, operasi yang tersedia, serta batasan yang ditegakkan oleh kode. Seluruh fakta divalidasi dari audit forensik `convex/adminUserManagement.ts` dan `convex/permissions.ts`.

---

## 1. Sistem RBAC (`convex/permissions.ts`)

Makalah AI menggunakan hirarki peran 3-level:

```
superadmin (3)
    ↓ mencakup
admin (2)
    ↓ mencakup
user (1)
```

Hirarki ini dikonfigurasikan di `ROLE_HIERARCHY`:

```typescript
const ROLE_HIERARCHY = {
  superadmin: 3,
  admin: 2,
  user: 1,
}
```

### Fungsi Pemeriksa Peran

| Fungsi | Signature | Deskripsi |
|--------|-----------|-----------|
| `hasRole(db, userId, requiredRole)` | `→ Promise<boolean>` | Cek apakah user memiliki setidaknya `requiredRole` |
| `requireRole(db, userId, requiredRole)` | `→ Promise<void>` | Throw `"Unauthorized: X access required"` jika tidak memiliki peran |
| `isSuperAdmin(db, userId)` | `→ Promise<boolean>` | Cek apakah user adalah superadmin spesifik |
| `isAdmin(db, userId)` | `→ Promise<boolean>` | Cek apakah user setidaknya admin (termasuk superadmin) |

Karena menggunakan nilai numerik `>=`, seorang **superadmin otomatis lolos** semua check yang hanya membutuhkan `"admin"`.

---

## 2. Kekuasaan Superadmin

Operasi berikut **hanya bisa dilakukan oleh superadmin** (level 3).

### `promoteToAdmin` — Promosikan User ke Admin

```
superadmin → promoteToAdmin(targetUserId)
```

**Guard yang berlaku:**
- Requestor harus superadmin
- Target tidak boleh superadmin (tidak bisa promosi sesama superadmin)
- Target tidak boleh sudah admin

**Efek:** `role = "admin"`, `subscriptionStatus = "unlimited"` — admin mendapat akses unlimited secara otomatis.

### `demoteFromAdmin` — Turunkan Admin ke User

```
superadmin → demoteFromAdmin(targetUserId, targetTier: "free" | "bpp" | "pro")
```

**Guard yang berlaku:**
- Requestor harus superadmin
- Target tidak boleh superadmin
- Target harus admin (bukan user biasa — gunakan `updateSubscriptionTier` untuk user)

**Efek:** `role = "user"`, `subscriptionStatus = targetTier` — superadmin menentukan tier yang diberikan saat diturunkan.

---

## 3. Kekuasaan Admin

Operasi berikut bisa dilakukan oleh **admin dan superadmin** (level ≥ 2).

### `updateSubscriptionTier` — Update Tier User

```
admin/superadmin → updateSubscriptionTier(targetUserId, newTier: "free" | "bpp" | "pro")
```

**Guard yang berlaku:**
- Requestor harus admin (atau superadmin)
- Target tidak boleh admin atau superadmin (admin/superadmin selalu `unlimited` via `getEffectiveTier()`)
- Tidak bisa mengubah ke tier yang sudah dimiliki (no-op check)

**Efek:** Update `subscriptionStatus` user di DB. Tidak membuat/mengubah subscription record di tabel `subscriptions`.

> [!NOTE]
> Operasi ini mengubah `subscriptionStatus` secara langsung tanpa melalui alur pembayaran. Digunakan untuk pemberian akses manual, koreksi data, atau keperluan support.

### `softDeleteUser` — Hapus User (Soft Delete)

```
admin → softDeleteUser(targetUserId)
```

**Guard yang berlaku:**
- Admin: hanya bisa hapus user biasa (`role = "user"`)
- Superadmin: bisa hapus admin atau user (tidak bisa hapus superadmin)
- Tidak bisa hapus diri sendiri
- Tidak bisa hapus superadmin (oleh siapapun kecuali... tidak ada kecualinya)

**Efek:** `ctx.db.delete(targetUserId)` — record user dihapus dari Convex DB.

> [!CAUTION]
> Ini adalah **hard delete** dari tabel `users` Convex — bukan soft delete dengan flag. Nama "softDeleteUser" mengacu pada fakta bahwa data auth di Better Auth tidak ikut dihapus, hanya record Convex-nya.

---

## 4. Matriks Kekuasaan (Ringkasan)

| Operasi | Superadmin | Admin | User |
|---------|------------|-------|------|
| Promosikan user ke admin | ✅ | ❌ | ❌ |
| Turunkan admin ke user | ✅ | ❌ | ❌ |
| Update tier subscription user | ✅ | ✅ | ❌ |
| Hapus user biasa | ✅ | ✅ | ❌ |
| Hapus admin | ✅ | ❌ | ❌ |
| Hapus superadmin | ❌ | ❌ | ❌ |
| Lihat statistik pembayaran | ✅ | ✅ | ❌ |
| Konfigurasi payment provider | ✅ | ✅ | ❌ |
| Bypass kuota dan billing | ✅ | ✅ | ❌ |

---

## 5. Pola Autentikasi di `adminUserManagement.ts`

Berbeda dengan fungsi Convex pada umumnya yang menerima `userId` dari args, seluruh fungsi di `adminUserManagement.ts` mengidentifikasi requestor dari **auth identity**:

```typescript
const identity = await ctx.auth.getUserIdentity()
const requestor = await ctx.db.query("users")
  .withIndex("by_betterAuthUserId", q => q.eq("betterAuthUserId", identity.subject))
  .unique()
```

Ini lebih aman karena requestor tidak bisa memalsukan `userId` mereka sendiri — identity berasal dari JWT sesi Better Auth yang sudah diverifikasi oleh Convex.

---

## 6. Hubungan dengan `getEffectiveTier`

Admin control berinteraksi langsung dengan fungsi `getEffectiveTier` (`src/lib/utils/subscription.ts`):

1. Saat `promoteToAdmin` → user mendapat `role = "admin"` → `getEffectiveTier` akan selalu return `"unlimited"` terlepas dari `subscriptionStatus`
2. Saat `demoteFromAdmin` → user mendapat `role = "user"` → `getEffectiveTier` kembali membaca `subscriptionStatus`
3. Saat `updateSubscriptionTier` → hanya mengubah `subscriptionStatus` → hanya berlaku untuk user (bukan admin)

Ini membentuk **lapisan keamanan ganda**: kode backend (`checkQuota`, `deductQuota`) punya bypass role tersendiri, dan `getEffectiveTier` di frontend/utils juga memiliki bypass role yang independen.
