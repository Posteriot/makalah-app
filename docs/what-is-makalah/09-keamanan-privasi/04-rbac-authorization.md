# 04 — RBAC & Authorization

**Sumber kode**: `convex/permissions.ts`, `convex/authHelpers.ts`, `convex/adminUserManagement.ts`

---

## Gambaran Umum

Makalah AI menerapkan **Role-Based Access Control (RBAC)** dengan tiga tingkatan role. Setiap operasi Convex yang memerlukan izin tertentu menggunakan fungsi dari `convex/permissions.ts` untuk memeriksa role sebelum menjalankan logika bisnis.

Di atas RBAC role, ada lapisan **ownership enforcement** — setiap user hanya bisa mengakses resource miliknya sendiri, terlepas dari role-nya.

---

## Role Hierarchy

```typescript
// convex/permissions.ts — baris 4–10
export type Role = "superadmin" | "admin" | "user"

export const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 3,
  admin: 2,
  user: 1,
}
```

Perbandingan menggunakan **nilai numerik**, bukan string:

```typescript
// convex/permissions.ts — baris 23–26
const userRoleLevel = ROLE_HIERARCHY[user.role as Role] ?? 0
const requiredRoleLevel = ROLE_HIERARCHY[requiredRole]
return userRoleLevel >= requiredRoleLevel
```

Menggunakan `?? 0` sebagai fallback: jika `user.role` tidak dikenal atau `undefined`, level-nya adalah 0 — lebih rendah dari semua role yang valid, sehingga otomatis ditolak.

---

## Fungsi Otorisasi

### `hasRole()` — Check non-throwing

```typescript
// convex/permissions.ts — baris 15–27
export async function hasRole(
  db: DatabaseReader,
  userId: Id<"users">,
  requiredRole: Role
): Promise<boolean>
```

Mengembalikan `boolean`. Tidak melempar error. Digunakan untuk conditional logic.

### `requireRole()` — Check throwing

```typescript
// convex/permissions.ts — baris 32–41
export async function requireRole(
  db: DatabaseReader,
  userId: Id<"users">,
  requiredRole: Role
): Promise<void>
```

Melempar `Error("Unauthorized: <role> access required")` jika check gagal. Digunakan sebagai guard di awal mutation/query yang memerlukan role minimal tertentu.

### `isSuperAdmin()` dan `isAdmin()` — Shorthand

```typescript
// convex/permissions.ts — baris 46–62
export async function isSuperAdmin(db, userId): Promise<boolean>
// Cek role === "superadmin" (exact, bukan >=)

export async function isAdmin(db, userId): Promise<boolean>
// Memanggil hasRole(db, userId, "admin") → level >= 2
```

`isSuperAdmin` menggunakan **exact match** (`=== "superadmin"`), bukan numeric comparison. Ini berarti admin (level 2) tidak memenuhi `isSuperAdmin()`.

---

## Ownership Enforcement

Ownership diperiksa di lapisan terpisah dari role check. Setiap resource memiliki fungsi `require*Owner()` sendiri:

### Conversation Ownership

```typescript
// convex/authHelpers.ts — baris 66–72
export async function requireConversationOwner(ctx, conversationId) {
  const authUser = await requireAuthUser(ctx)
  const conversation = await ctx.db.get(conversationId)
  if (!conversation) throw new Error("Conversation tidak ditemukan")
  if (conversation.userId !== authUser._id) throw new Error("Tidak memiliki akses ke conversation ini")
  return { authUser, conversation }
}
```

### Paper Session Ownership

```typescript
// convex/authHelpers.ts — baris 94–99
export async function requirePaperSessionOwner(ctx, sessionId) {
  const authUser = await requireAuthUser(ctx)
  const session = await ctx.db.get(sessionId)
  if (!session) throw new Error("Session not found")
  if (session.userId !== authUser._id) throw new Error("Unauthorized")
  return { authUser, session }
}
```

### File Ownership

```typescript
// convex/authHelpers.ts — baris 106–112
export async function requireFileOwner(ctx, fileId) {
  const authUser = await requireAuthUser(ctx)
  const file = await ctx.db.get(fileId)
  if (!file) throw new Error("File tidak ditemukan")
  if (file.userId !== authUser._id) throw new Error("Unauthorized")
  return { authUser, file }
}
```

**Pattern ownership check yang konsisten**:
1. Auth dulu via `requireAuthUser()` — jika tidak login, throw sebelum menyentuh data
2. Fetch resource — jika tidak ada, throw (404-like)
3. Bandingkan `resource.userId !== authUser._id` — jika tidak cocok, throw (403-like)

### Graceful Variant

```typescript
// convex/authHelpers.ts — baris 78–88
export async function getConversationIfOwner(
  ctx,
  conversationId
): Promise<{ authUser, conversation } | null> {
  const authUser = await getAuthUser(ctx)
  if (!authUser) return null
  const conversation = await ctx.db.get(conversationId)
  if (!conversation) return null
  if (conversation.userId !== authUser._id) return null
  return { authUser, conversation }
}
```

Varian ini mengembalikan `null` alih-alih throw — digunakan di query yang perlu handle unauthenticated state secara graceful (misalnya: real-time subscription yang bisa aktif sebelum user login).

---

## Internal Key Guard (Admin Mutations)

Operasi sensitif yang dipanggil dari webhook atau sistem internal diamankan menggunakan `CONVEX_INTERNAL_KEY`:

```typescript
// convex/authRecovery.ts — baris 14–17
function isInternalKeyValid(internalKey?: string) {
  const expected = process.env.CONVEX_INTERNAL_KEY
  return Boolean(expected && internalKey === expected)
}
```

Pattern penggunaannya di setiap internal mutation:

```typescript
if (!isInternalKeyValid(args.internalKey)) {
  throw new Error("Unauthorized")
}
```

`CONVEX_INTERNAL_KEY` hanya diketahui oleh:
- Next.js server (via env var) untuk webhook payment
- Convex action internal (via env var)

Sehingga client browser tidak bisa memanggil internal mutation secara langsung.

---

## Tabel Role vs Aksi

| Aksi | Role Minimum | Mekanisme |
|---|---|---|
| Akses resource sendiri (conversation, paper session, file) | `user` | Ownership check `userId === authUser._id` |
| Manajemen user (lihat, edit role, dll.) | `admin` | `requireRole(db, userId, "admin")` |
| Operasi destruktif (hapus semua data user) | `superadmin` | `isSuperAdmin()` exact check |
| Internal mutation (payment, quota) | N/A — key-based | `isInternalKeyValid(internalKey)` |

---

## Kesimpulan

Model otorisasi Makalah AI menerapkan dua lapis independen:

1. **RBAC** — siapa yang boleh melakukan jenis operasi tertentu (berdasarkan role numerik)
2. **Ownership** — siapa yang boleh mengakses resource tertentu (berdasarkan `userId` match)

Kedua lapis ini **tidak saling menggantikan**. Admin sekalipun tidak bisa mengakses conversation user lain kecuali ownership check-nya di-bypass secara eksplisit oleh kode admin-specific.
