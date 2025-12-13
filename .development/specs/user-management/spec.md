# Specification: User Management & Role-Based Access Control - Makalah App

## 1. Overview

### 1.1 Tujuan
Membangun sistem user management dengan role hierarchy (superadmin > admin > user) yang terintegrasi dengan Clerk authentication dan Resend email service. Sistem ini mengatur permissions, user registration, email verification, dan role-based access control untuk seluruh aplikasi Makalah App.

### 1.2 Scope
**In Scope:**
- Role hierarchy system (superadmin, admin, user)
- Public user registration via Clerk dengan email verification (Resend)
- Manual admin/superadmin creation (database-level)
- User settings page (accessible by all authenticated users)
- Admin panel (accessible only by admin & superadmin)
- Promote/demote user functionality (superadmin only)
- Post-login redirect flow (settings → chat)
- Forgot password & reset password via Resend
- Permission-based routing dan UI controls
- Email verification status tracking

**Out of Scope:**
- Two-factor authentication (2FA)
- Social login (Google, GitHub, etc.)
- User profile pictures/avatars
- User activity logs
- Advanced permission system (custom roles, granular permissions)
- User suspension/ban functionality
- Bulk user operations
- User export/import
- Password strength enforcement UI
- Session management dashboard

### 1.3 User Stories

**Public User:**
> Sebagai user baru, saya ingin mendaftar akun sendiri via email, menerima email verifikasi, dan setelah login diarahkan ke settings page untuk melengkapi profil saya, kemudian dapat mengakses chatpage.

**Admin:**
> Sebagai admin yang dibuat manual oleh superadmin, saya ingin login dan dapat mengakses admin panel untuk melihat daftar users dan mengelola conversations, tapi tidak dapat promote/demote users.

**Superadmin:**
> Sebagai superadmin, saya ingin memiliki akses penuh ke admin panel, dapat melihat semua users, promote user biasa menjadi admin, dan demote admin kembali ke user biasa, tanpa bisa mengubah role superadmin lainnya.

---

## 2. Technical Architecture

### 2.1 Tech Stack
- **Frontend:** Next.js 16 App Router, React 19, TypeScript
- **UI Components:** shadcn/ui (Button, Dialog, Form, Input, Label, Table, Badge, Card)
- **Styling:** Tailwind CSS 4
- **Backend:** Convex (real-time database + serverless functions)
- **Authentication:** Clerk (v6+)
- **Email Service:** Resend (via Clerk integration)
- **State Management:** React hooks + Convex real-time subscriptions
- **Routing:** Next.js App Router + Middleware

### 2.2 Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── sign-up/
│   │   │   └── [[...sign-up]]/
│   │   │       └── page.tsx              # Clerk SignUp component
│   │   └── sign-in/
│   │       └── [[...sign-in]]/
│   │           └── page.tsx              # Clerk SignIn component
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # Dashboard layout (auth check + user sync)
│   │   ├── page.tsx                      # Dashboard home (redirect hub)
│   │   ├── settings/
│   │   │   └── page.tsx                  # User settings (all users)
│   │   └── admin/
│   │       ├── page.tsx                  # Admin panel (admin/superadmin only)
│   │       └── layout.tsx                # Admin layout dengan permission check
│   ├── chat/
│   │   └── page.tsx                      # Chat page (authenticated users)
│   └── middleware.ts                     # Route protection

├── components/
│   ├── settings/
│   │   ├── ProfileForm.tsx               # Edit profile (name, email)
│   │   ├── PasswordForm.tsx              # Change password
│   │   └── EmailVerificationBanner.tsx   # Verification status banner
│   ├── admin/
│   │   ├── UserList.tsx                  # Admin user list table
│   │   ├── UserRow.tsx                   # Individual user row dengan actions
│   │   ├── RoleBadge.tsx                 # Role badge component
│   │   └── PromoteDialog.tsx             # Confirmation dialog
│   └── auth/
│       ├── ProtectedRoute.tsx            # Client-side route guard
│       └── PermissionGate.tsx            # Conditional rendering by role

├── lib/
│   ├── auth/
│   │   ├── permissions.ts                # Permission helpers (client-side)
│   │   └── redirect-helpers.ts           # Post-login redirect logic
│   └── hooks/
│       ├── useCurrentUser.ts             # Get current user dari Convex
│       └── usePermissions.ts             # Client permission checks

convex/
├── schema.ts                             # Updated dengan role field
├── users.ts                              # User CRUD + permission queries
├── permissions.ts                        # Server-side permission helpers
└── admin/
    ├── userManagement.ts                 # Admin-only mutations
    └── manualUserCreation.ts             # Script untuk create admin/superadmin
```

### 2.3 System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION                            │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │ Clerk SignUp │────────▶│   Resend     │─── Verification Email│
│  │   (Public)   │         │ Email Service│                      │
│  └──────────────┘         └──────────────┘                      │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │ Clerk SignIn │                                               │
│  │   (Public)   │                                               │
│  └──────────────┘                                               │
│         │                                                        │
└─────────┼────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POST-LOGIN REDIRECT FLOW                      │
│                                                                  │
│         ┌─────────────────┐                                     │
│         │  First Login?   │                                     │
│         └────────┬────────┘                                     │
│                  │                                               │
│          ┌───────┴────────┐                                     │
│          │                │                                     │
│          ▼                ▼                                     │
│      ┌───────┐      ┌────────────┐                             │
│      │  YES  │──────▶│ /settings  │                             │
│      └───────┘      │ (Configure)│                             │
│                     └────────────┘                             │
│                           │                                     │
│                           ▼                                     │
│                     ┌────────────┐                             │
│                     │   /chat    │                             │
│                     │ (Available)│                             │
│                     └────────────┘                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ROLE-BASED ACCESS CONTROL                     │
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   User       │     │    Admin     │     │  Superadmin  │    │
│  │              │     │              │     │              │    │
│  │ - /settings  │     │ - /settings  │     │ - /settings  │    │
│  │ - /chat      │     │ - /chat      │     │ - /chat      │    │
│  │              │     │ - /admin     │     │ - /admin     │    │
│  │              │     │   (read-only)│     │   (full)     │    │
│  └──────────────┘     └──────────────┘     │ - Promote    │    │
│                                             │ - Demote     │    │
│                                             └──────────────┘    │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (CONVEX)                         │
│                                                                  │
│  ┌──────────────┐           ┌──────────────┐                    │
│  │ users table  │           │ permissions  │                    │
│  │ - role field │───────────│   helpers    │                    │
│  │ - indexes    │           │ (server-side)│                    │
│  └──────────────┘           └──────────────┘                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema (Convex)

### 3.1 Updated Users Table

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),

    // NEW FIELDS
    role: v.string(), // "superadmin" | "admin" | "user"
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    emailVerified: v.boolean(), // Synced from Clerk

    // EXISTING FIELDS
    subscriptionStatus: v.string(), // "free" | "pro" | "canceled"
    createdAt: v.number(),

    // OPTIONAL TRACKING
    lastLoginAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_role", ["role"])
    .index("by_email", ["email"]),

  // ... existing tables (papers, conversations, messages, files)
})
```

### 3.2 Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clerkUserId` | string | ✅ | Unique ID dari Clerk |
| `email` | string | ✅ | Email address |
| `role` | string | ✅ | User role: "superadmin", "admin", atau "user" |
| `firstName` | string | ❌ | First name (optional, dari Clerk) |
| `lastName` | string | ❌ | Last name (optional, dari Clerk) |
| `emailVerified` | boolean | ✅ | Email verification status (synced dari Clerk) |
| `subscriptionStatus` | string | ✅ | Subscription tier |
| `createdAt` | number | ✅ | Creation timestamp |
| `lastLoginAt` | number | ❌ | Last login timestamp (tracking) |
| `updatedAt` | number | ❌ | Last update timestamp |

### 3.3 Role Hierarchy Rules

```typescript
// Permission hierarchy
type Role = "superadmin" | "admin" | "user"

const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 3,
  admin: 2,
  user: 1,
}

// Validation rules
- Superadmin dapat:
  - Promote user → admin
  - Demote admin → user
  - Access semua admin panel features
  - TIDAK BISA modify superadmin lain

- Admin dapat:
  - View admin panel (read-only mode untuk user management)
  - Manage conversations, papers (future)
  - TIDAK BISA promote/demote users

- User dapat:
  - Access settings page
  - Access chat page
  - TIDAK BISA access admin panel
```

### 3.4 Indexing Strategy
- `by_clerkUserId` - Primary lookup untuk sync Clerk → Convex
- `by_role` - Efficient query untuk admin lists, role filtering
- `by_email` - Email-based searches (admin panel)

---

## 4. Authentication Flow

### 4.1 Clerk Configuration

**Required Clerk Settings:**
1. **Email & Password** authentication enabled
2. **Email verification** required before sign-in
3. **Email provider**: Resend integration
4. **Password reset**: Enabled via Resend

**Environment Variables:**
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_SECRET_KEY=sk_test_***

# Resend (for Clerk integration)
RESEND_API_KEY=re_***
RESEND_FROM_EMAIL=noreply@makalahapp.com
```

### 4.2 Clerk + Resend Integration

**Setup Steps:**
1. Go to Clerk Dashboard → Email & SMS
2. Select "Custom SMTP" atau "Resend" (if available)
3. Configure Resend API key
4. Customize email templates:
   - Welcome email (post-verification)
   - Password reset email
   - Email verification email

**Email Templates (Resend):**
```typescript
// Email verification
Subject: Verifikasi Email Anda - Makalah App
Body:
  Halo {{firstName}},

  Klik link berikut untuk verifikasi email Anda:
  {{verificationLink}}

  Link berlaku selama 24 jam.

  Salam,
  Tim Makalah App

// Password reset
Subject: Reset Password - Makalah App
Body:
  Halo {{firstName}},

  Kami menerima permintaan reset password untuk akun Anda.
  Klik link berikut untuk reset password:
  {{resetLink}}

  Link berlaku selama 1 jam.
  Jika bukan Anda yang meminta, abaikan email ini.

  Salam,
  Tim Makalah App
```

### 4.3 User Registration Flow (Public)

```
1. User akses /sign-up
2. Clerk SignUp form:
   - Email
   - Password (min 8 chars)
   - First Name
   - Last Name
3. Submit → Clerk creates user
4. Clerk triggers Resend email verification
5. User receives email dengan verification link
6. User klik verification link
7. Email verified → emailVerified = true di Clerk
8. User redirected to /sign-in
9. User login → First time login redirect to /settings
10. User completes profile di settings
11. User dapat navigate ke /chat
```

### 4.4 Admin/Superadmin Creation Flow (Manual)

**Tidak ada UI public untuk create admin/superadmin.**

**Method 1: Convex Dashboard Mutation**
```typescript
// Run di Convex dashboard
npx convex run admin:manualUserCreation:createAdminUser '{
  "email": "makalah.app@gmail.com",
  "role": "admin",
  "firstName": "Makalah",
  "lastName": "App"
}'
```

**Method 2: Direct Database Insert (via script)**
```typescript
// convex/admin/manualUserCreation.ts
export const createAdminUser = mutationGeneric({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("superadmin")),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async ({ db }, { email, role, firstName, lastName }) => {
    // Check if email already exists
    const existing = await db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .unique()

    if (existing) {
      throw new Error(`User dengan email ${email} sudah ada`)
    }

    // Generate temporary clerkUserId (akan di-update pas first login)
    const tempClerkId = `pending_${email}_${Date.now()}`

    const now = Date.now()
    const userId = await db.insert("users", {
      clerkUserId: tempClerkId,
      email,
      role,
      firstName,
      lastName,
      emailVerified: false, // Admin harus verify via Clerk signup
      subscriptionStatus: "pro", // Admin/superadmin otomatis pro
      createdAt: now,
    })

    return {
      userId,
      message: `Admin created. Instruksikan user untuk signup di Clerk menggunakan email ${email}`,
    }
  },
})
```

**Flow:**
1. Superadmin run script untuk create admin user dengan email tertentu
2. Record created di Convex dengan `clerkUserId: pending_*`
3. Admin signup via Clerk normal flow menggunakan email yang sama
4. Saat login pertama kali, `ensureConvexUser()` update record:
   - Match by email
   - Update `clerkUserId` dengan real Clerk ID
   - Preserve `role` field (tidak overwrite)

### 4.5 Post-Login Redirect Logic

**File:** `src/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api(.*)",
])

const isAdminRoute = createRouteMatcher(["/admin(.*)"])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()

  // Public routes: allow
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Protected routes: require auth
  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("redirect_url", request.url)
    return NextResponse.redirect(signInUrl)
  }

  // Admin routes: check permission server-side
  if (isAdminRoute(request)) {
    // TODO: Fetch user role dari Convex dan check permission
    // For now, allow (akan di-check di page level)
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
```

**Dashboard Layout Redirect:**

```typescript
// src/app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  await ensureConvexUser()

  const user = await currentUser()
  const pathname = headers().get("x-pathname") // Custom header

  // First login redirect
  if (pathname === "/dashboard" && user) {
    redirect("/settings")
  }

  return <div>{children}</div>
}
```

### 4.6 Email Verification Status Sync

**Clerk Webhook (Optional):**
Setup Clerk webhook untuk sync `emailVerified` status ke Convex real-time.

**Webhook Events:**
- `user.created`
- `user.updated` (email verification completed)

**Alternative: Poll on Login**
```typescript
// ensureConvexUser() di dashboard layout
const user = await currentUser()
const emailVerified = user.emailAddresses[0]?.verification?.status === "verified"

await fetchMutation(api.users.createUser, {
  clerkUserId: user.id,
  email: primaryEmail,
  emailVerified, // Sync status
})
```

---

## 5. API Design (Convex Functions)

### 5.1 Permission Helper Functions

**File:** `convex/permissions.ts`

```typescript
import { Doc, Id } from "./_generated/dataModel"
import { DatabaseReader } from "./_generated/server"

export type Role = "superadmin" | "admin" | "user"

export const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 3,
  admin: 2,
  user: 1,
}

// Check if user has at least the required role
export async function hasRole(
  db: DatabaseReader,
  userId: Id<"users">,
  requiredRole: Role
): Promise<boolean> {
  const user = await db.get(userId)
  if (!user) return false

  const userRoleLevel = ROLE_HIERARCHY[user.role as Role] ?? 0
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole]

  return userRoleLevel >= requiredRoleLevel
}

// Throw error if user doesn't have required role
export async function requireRole(
  db: DatabaseReader,
  userId: Id<"users">,
  requiredRole: Role
): Promise<void> {
  const hasPermission = await hasRole(db, userId, requiredRole)
  if (!hasPermission) {
    throw new Error(`Unauthorized: ${requiredRole} access required`)
  }
}

// Check if user is superadmin specifically
export async function isSuperAdmin(
  db: DatabaseReader,
  userId: Id<"users">
): Promise<boolean> {
  const user = await db.get(userId)
  return user?.role === "superadmin"
}

// Check if user is at least admin
export async function isAdmin(
  db: DatabaseReader,
  userId: Id<"users">
): Promise<boolean> {
  return await hasRole(db, userId, "admin")
}
```

### 5.2 User Management Queries

**File:** `convex/users.ts`

```typescript
import { v } from "convex/values"
import { mutationGeneric, queryGeneric } from "convex/server"
import { requireRole, isSuperAdmin } from "./permissions"

// Get user by Clerk ID
export const getUserByClerkId = queryGeneric({
  args: { clerkUserId: v.string() },
  handler: async ({ db }, { clerkUserId }) => {
    return await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()
  },
})

// Get user role
export const getUserRole = queryGeneric({
  args: { userId: v.id("users") },
  handler: async ({ db }, { userId }) => {
    const user = await db.get(userId)
    return user?.role ?? "user"
  },
})

// Check if user is admin
export const checkIsAdmin = queryGeneric({
  args: { userId: v.id("users") },
  handler: async ({ db }, { userId }) => {
    const user = await db.get(userId)
    return user?.role === "admin" || user?.role === "superadmin"
  },
})

// Check if user is superadmin
export const checkIsSuperAdmin = queryGeneric({
  args: { userId: v.id("users") },
  handler: async ({ db }, { userId }) => {
    const user = await db.get(userId)
    return user?.role === "superadmin"
  },
})

// List all users (admin/superadmin only)
export const listAllUsers = queryGeneric({
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    await requireRole(db, requestorUserId, "admin")

    const users = await db.query("users").order("desc").collect()

    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      emailVerified: u.emailVerified,
      subscriptionStatus: u.subscriptionStatus,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }))
  },
})

// Create or update user (called by ensureConvexUser)
export const createUser = mutationGeneric({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    subscriptionStatus: v.optional(v.string()),
  },
  handler: async (
    { db },
    { clerkUserId, email, firstName, lastName, emailVerified, subscriptionStatus }
  ) => {
    // Check if user exists
    const existing = await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()

    const now = Date.now()

    if (existing) {
      // Update existing user (preserve role!)
      await db.patch(existing._id, {
        email,
        firstName,
        lastName,
        emailVerified: emailVerified ?? existing.emailVerified,
        lastLoginAt: now,
        updatedAt: now,
      })
      return existing._id
    }

    // Check if pending admin/superadmin exists with this email
    const pendingAdmin = await db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .filter((q) => q.eq(q.field("clerkUserId"), q.field("clerkUserId").startsWith("pending_")))
      .unique()

    if (pendingAdmin) {
      // Update pending admin dengan real Clerk ID
      await db.patch(pendingAdmin._id, {
        clerkUserId,
        firstName,
        lastName,
        emailVerified: emailVerified ?? false,
        lastLoginAt: now,
        updatedAt: now,
      })
      return pendingAdmin._id
    }

    // Auto-promote superadmin by hardcoded email
    const SUPERADMIN_EMAIL = "erik.supit@gmail.com"
    const role = email === SUPERADMIN_EMAIL ? "superadmin" : "user"

    // Create new regular user
    const userId = await db.insert("users", {
      clerkUserId,
      email,
      firstName,
      lastName,
      role,
      emailVerified: emailVerified ?? false,
      subscriptionStatus: subscriptionStatus ?? "free",
      createdAt: now,
      lastLoginAt: now,
    })

    return userId
  },
})

// Update user profile (self-edit)
export const updateProfile = mutationGeneric({
  args: {
    userId: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async ({ db }, { userId, firstName, lastName }) => {
    const updates: any = { updatedAt: Date.now() }
    if (firstName !== undefined) updates.firstName = firstName
    if (lastName !== undefined) updates.lastName = lastName

    await db.patch(userId, updates)
    return { success: true }
  },
})
```

### 5.3 Admin Management Mutations

**File:** `convex/admin/userManagement.ts`

```typescript
import { v } from "convex/values"
import { mutationGeneric } from "convex/server"
import { requireRole, isSuperAdmin } from "../permissions"

// Promote user to admin (superadmin only)
export const promoteToAdmin = mutationGeneric({
  args: {
    targetUserId: v.id("users"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { targetUserId, requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "superadmin")

    const targetUser = await db.get(targetUserId)
    if (!targetUser) {
      throw new Error("User tidak ditemukan")
    }

    // Cannot modify superadmin
    if (targetUser.role === "superadmin") {
      throw new Error("Tidak bisa mengubah role superadmin")
    }

    // Already admin
    if (targetUser.role === "admin") {
      throw new Error("User sudah menjadi admin")
    }

    // Promote
    await db.patch(targetUserId, {
      role: "admin",
      subscriptionStatus: "pro", // Admin auto-pro
      updatedAt: Date.now(),
    })

    return { success: true, message: `${targetUser.email} berhasil dipromote menjadi admin` }
  },
})

// Demote admin to user (superadmin only)
export const demoteToUser = mutationGeneric({
  args: {
    targetUserId: v.id("users"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { targetUserId, requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "superadmin")

    const targetUser = await db.get(targetUserId)
    if (!targetUser) {
      throw new Error("User tidak ditemukan")
    }

    // Cannot demote superadmin
    if (targetUser.role === "superadmin") {
      throw new Error("Tidak bisa mengubah role superadmin")
    }

    // Already user
    if (targetUser.role === "user") {
      throw new Error("User sudah berstatus user biasa")
    }

    // Demote
    await db.patch(targetUserId, {
      role: "user",
      updatedAt: Date.now(),
    })

    return { success: true, message: `${targetUser.email} berhasil didemote menjadi user` }
  },
})
```

### 5.4 Manual Admin Creation

**File:** `convex/admin/manualUserCreation.ts`

```typescript
import { v } from "convex/values"
import { mutationGeneric } from "convex/server"

// Create admin user (manual, via script/dashboard)
export const createAdminUser = mutationGeneric({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("superadmin")),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async ({ db }, { email, role, firstName, lastName }) => {
    // Check if email already exists
    const existingByEmail = await db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .unique()

    if (existingByEmail && !existingByEmail.clerkUserId.startsWith("pending_")) {
      throw new Error(`User dengan email ${email} sudah terdaftar`)
    }

    if (existingByEmail) {
      // Update existing pending user
      await db.patch(existingByEmail._id, {
        role,
        firstName,
        lastName,
        updatedAt: Date.now(),
      })
      return {
        userId: existingByEmail._id,
        message: `Admin user updated. Instruksikan ${email} untuk signup via Clerk.`,
      }
    }

    // Create pending admin
    const tempClerkId = `pending_${email}_${Date.now()}`
    const now = Date.now()

    const userId = await db.insert("users", {
      clerkUserId: tempClerkId,
      email,
      role,
      firstName,
      lastName,
      emailVerified: false,
      subscriptionStatus: "pro",
      createdAt: now,
    })

    return {
      userId,
      message: `Admin user created. Instruksikan ${email} untuk signup via Clerk menggunakan email ini.`,
    }
  },
})
```

---

## 6. Component Architecture

### 6.1 Settings Page

**File:** `src/app/(dashboard)/settings/page.tsx`

```typescript
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { SettingsContainer } from "@/components/settings/SettingsContainer"

export default async function SettingsPage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in")

  const convexUser = await fetchQuery(api.users.getUserByClerkId, {
    clerkUserId: user.id,
  })

  if (!convexUser) redirect("/sign-in")

  return <SettingsContainer user={convexUser} clerkUser={user} />
}
```

**Client Component:** `src/components/settings/SettingsContainer.tsx`

```typescript
"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ProfileForm } from "./ProfileForm"
import { EmailVerificationBanner } from "./EmailVerificationBanner"
import { RoleBadge } from "../admin/RoleBadge"

export function SettingsContainer({ user, clerkUser }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan Akun</h1>
        <p className="text-muted-foreground">
          Kelola profil dan preferensi akun Anda
        </p>
      </div>

      {/* Email verification warning */}
      {!user.emailVerified && <EmailVerificationBanner />}

      {/* Role badge */}
      <Card>
        <CardHeader>
          <CardTitle>Status Akun</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Role:</span>
            <RoleBadge role={user.role} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Subscription:</span>
            <span className="text-sm font-medium capitalize">{user.subscriptionStatus}</span>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <ProfileForm user={user} />

      {/* Password change handled by Clerk */}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Untuk mengubah password, gunakan fitur reset password di halaman login.
          </p>
          <a
            href="/sign-in"
            className="text-sm text-primary hover:underline"
          >
            Reset Password
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 6.2 Admin Panel

**File:** `src/app/(dashboard)/admin/page.tsx`

```typescript
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { AdminPanelContainer } from "@/components/admin/AdminPanelContainer"

export default async function AdminPage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in?redirect_url=/admin")

  const convexUser = await fetchQuery(api.users.getUserByClerkId, {
    clerkUserId: user.id,
  })

  if (!convexUser) redirect("/sign-in")

  // Permission check
  const isAdmin = await fetchQuery(api.users.checkIsAdmin, {
    userId: convexUser._id,
  })

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Akses Ditolak</h1>
        <p className="text-muted-foreground">
          Anda tidak memiliki akses ke halaman admin.
        </p>
      </div>
    )
  }

  return <AdminPanelContainer userId={convexUser._id} userRole={convexUser.role} />
}
```

**Client Component:** `src/components/admin/AdminPanelContainer.tsx`

```typescript
"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { UserList } from "./UserList"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AdminPanelContainer({ userId, userRole }) {
  const users = useQuery(api.users.listAllUsers, { requestorUserId: userId })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          Kelola users dan sistem Makalah App
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="stats">Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserList
            users={users ?? []}
            currentUserId={userId}
            currentUserRole={userRole}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-6">
          <div className="text-muted-foreground">
            Statistik akan ditampilkan di sini (future enhancement)
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**User List Component:** `src/components/admin/UserList.tsx`

```typescript
"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RoleBadge } from "./RoleBadge"
import { Badge } from "@/components/ui/badge"

export function UserList({ users, currentUserId, currentUserRole }) {
  const promoteToAdmin = useMutation(api.admin.userManagement.promoteToAdmin)
  const demoteToUser = useMutation(api.admin.userManagement.demoteToUser)

  const handlePromote = async (targetUserId: string) => {
    try {
      const result = await promoteToAdmin({
        targetUserId,
        requestorUserId: currentUserId,
      })
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDemote = async (targetUserId: string) => {
    try {
      const result = await demoteToUser({
        targetUserId,
        requestorUserId: currentUserId,
      })
      toast.success(result.message)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const canModifyRoles = currentUserRole === "superadmin"

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Status Email</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>
                {user.firstName} {user.lastName}
              </TableCell>
              <TableCell>
                <RoleBadge role={user.role} />
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {user.subscriptionStatus}
                </Badge>
              </TableCell>
              <TableCell>
                {user.emailVerified ? (
                  <Badge variant="default">Verified</Badge>
                ) : (
                  <Badge variant="secondary">Not Verified</Badge>
                )}
              </TableCell>
              <TableCell>
                {canModifyRoles && user.role === "user" && (
                  <Button
                    size="sm"
                    onClick={() => handlePromote(user._id)}
                  >
                    Promote to Admin
                  </Button>
                )}
                {canModifyRoles && user.role === "admin" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDemote(user._id)}
                  >
                    Demote to User
                  </Button>
                )}
                {user.role === "superadmin" && (
                  <span className="text-xs text-muted-foreground">
                    Cannot modify
                  </span>
                )}
                {!canModifyRoles && user.role !== currentUserRole && (
                  <span className="text-xs text-muted-foreground">
                    View only
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### 6.3 Supporting Components

**Role Badge:** `src/components/admin/RoleBadge.tsx`

```typescript
import { Badge } from "@/components/ui/badge"

export function RoleBadge({ role }: { role: string }) {
  const variants = {
    superadmin: "destructive",
    admin: "default",
    user: "secondary",
  } as const

  const labels = {
    superadmin: "Superadmin",
    admin: "Admin",
    user: "User",
  }

  return (
    <Badge variant={variants[role as keyof typeof variants]}>
      {labels[role as keyof typeof labels] ?? role}
    </Badge>
  )
}
```

**Email Verification Banner:** `src/components/settings/EmailVerificationBanner.tsx`

```typescript
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function EmailVerificationBanner() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Email Belum Diverifikasi</AlertTitle>
      <AlertDescription>
        Silakan cek inbox email Anda dan klik link verifikasi yang telah
        dikirimkan. Jika tidak menemukan email, cek folder spam.
      </AlertDescription>
    </Alert>
  )
}
```

---

## 7. User Flows

### 7.1 Flow: Public User Registration

```
1. User akses /sign-up
2. Fill form:
   - Email: posteriot@gmail.com
   - Password: M4k4l4h2025
   - First Name: Posteriot
   - Last Name: App
3. Submit form
4. Clerk creates user dengan emailVerified = false
5. Resend sends verification email via Clerk
6. User receives email:
   Subject: "Verifikasi Email Anda - Makalah App"
   Body: Link verifikasi
7. User clicks verification link
8. Clerk marks email as verified
9. Redirect to /sign-in
10. User login dengan credentials
11. ensureConvexUser() creates record di Convex:
    - clerkUserId: user_abc123
    - email: posteriot@gmail.com
    - role: "user" (default)
    - emailVerified: true
    - subscriptionStatus: "free"
12. First login redirect to /settings
13. User completes profile (optional)
14. User navigates to /chat
15. Chat page accessible
```

### 7.2 Flow: Admin Manual Creation & First Login

```
STEP 1: Superadmin creates admin (manual)
1. Superadmin runs Convex mutation:
   npx convex run admin:manualUserCreation:createAdminUser '{
     "email": "makalah.app@gmail.com",
     "role": "admin",
     "firstName": "Makalah",
     "lastName": "App"
   }'
2. Convex creates record:
   - clerkUserId: "pending_makalah.app@gmail.com_1234567890"
   - email: makalah.app@gmail.com
   - role: "admin"
   - emailVerified: false
   - subscriptionStatus: "pro"
3. Superadmin notifies admin: "Silakan signup di https://app.makalahapp.com/sign-up menggunakan email makalah.app@gmail.com"

STEP 2: Admin signup via Clerk
4. Admin akses /sign-up
5. Fill form dengan email: makalah.app@gmail.com
6. Clerk creates user
7. Verification email sent (Resend)
8. Admin verifies email
9. Redirect to /sign-in

STEP 3: Admin first login
10. Admin login
11. ensureConvexUser() detects:
    - Clerk user: makalah.app@gmail.com
    - Existing Convex record dengan pending_* clerkUserId
12. Update Convex record:
    - clerkUserId: user_xyz789 (real Clerk ID)
    - PRESERVE role: "admin" (tidak overwrite!)
    - emailVerified: true
13. Redirect to /settings
14. Admin completes profile
15. Admin can navigate to /admin panel
16. Admin sees user list tapi CANNOT promote/demote (view-only mode)
```

### 7.3 Flow: Superadmin Promote User to Admin

```
1. Superadmin login & access /admin
2. Admin panel loads dengan user list
3. Superadmin finds target user:
   - Email: posteriot@gmail.com
   - Role: User
4. Clicks "Promote to Admin" button
5. Confirmation dialog (optional):
   "Apakah Anda yakin ingin promote posteriot@gmail.com menjadi admin?"
6. Superadmin confirms
7. Frontend calls mutation:
   promoteToAdmin({
     targetUserId: "user123",
     requestorUserId: "superadmin456",
   })
8. Backend validates:
   - Requestor is superadmin? ✅
   - Target is not superadmin? ✅
   - Target is not already admin? ✅
9. Update database:
   - role: "user" → "admin"
   - subscriptionStatus: → "pro"
   - updatedAt: now
10. Return success
11. Frontend shows toast: "posteriot@gmail.com berhasil dipromote menjadi admin"
12. User list auto-updates (Convex reactivity)
13. Target user (posteriot@gmail.com) on next login sees:
    - /admin panel now accessible
    - Role badge updated to "Admin"
```

### 7.4 Flow: Password Reset

```
1. User forgets password
2. User akses /sign-in
3. Clicks "Forgot password?" link
4. Clerk redirects to forgot password page
5. User enters email: posteriot@gmail.com
6. Clerk triggers Resend email
7. User receives email:
   Subject: "Reset Password - Makalah App"
   Body: Reset link (valid 1 hour)
8. User clicks reset link
9. Redirected to Clerk password reset page
10. User enters new password (2x confirmation)
11. Submit
12. Clerk updates password
13. Redirect to /sign-in
14. User login dengan new password
15. Success
```

### 7.5 Flow: Post-Login Navigation

```
┌─────────────────────────────────────────────────────────────┐
│                      User Logs In                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │ First Login Check       │
         │ (via middleware/layout) │
         └─────────┬───────────────┘
                   │
        ┌──────────┴────────────┐
        │                       │
        ▼                       ▼
   ┌────────┐             ┌──────────┐
   │ YES    │             │ NO       │
   │ (New)  │             │ (Return) │
   └───┬────┘             └────┬─────┘
       │                       │
       ▼                       ▼
┌──────────────┐        ┌──────────────┐
│ /settings    │        │ /dashboard   │
│ (Configure)  │        │ or /chat     │
└──────────────┘        └──────────────┘
       │                       │
       │                       │
       └───────┬───────────────┘
               │
               ▼
       ┌───────────────┐
       │ User navigates│
       │ freely:       │
       │ - /chat       │
       │ - /settings   │
       │ - /admin (*)  │
       └───────────────┘

(*) Only if role = admin/superadmin
```

---

## 8. Implementation Plan

### Phase 1: Database Schema & Permission System
**Estimated Time:** 1-2 hours
**Priority:** HIGH

**Tasks:**
1. Update `convex/schema.ts` dengan role field
2. Create `convex/permissions.ts` helpers
3. Update `convex/users.ts`:
   - Modify `createUser` untuk auto-promote superadmin
   - Add permission queries (isSuperAdmin, isAdmin, getUserRole)
4. Test schema deployment

**Deliverables:**
- Schema deployed ke Convex
- Permission helpers ready
- Auto-superadmin promotion working

### Phase 2: Clerk + Resend Integration
**Estimated Time:** 2-3 hours
**Priority:** HIGH

**Tasks:**
1. Configure Clerk Email & SMS settings:
   - Setup Resend as email provider
   - Enable email verification requirement
   - Enable password reset
2. Customize email templates (optional)
3. Test email flows:
   - Signup → verification email
   - Forgot password → reset email
4. Update `ensureConvexUser()` untuk sync emailVerified status

**Deliverables:**
- Clerk + Resend fully integrated
- Email verification working
- Password reset working

### Phase 3: User Settings Page
**Estimated Time:** 2-3 hours
**Priority:** HIGH

**Tasks:**
1. Create `/settings` route
2. Build SettingsContainer component:
   - ProfileForm (edit name)
   - EmailVerificationBanner (if not verified)
   - Role display
   - Subscription status
3. Implement update profile mutation
4. Add navigation link to settings dari dashboard

**Deliverables:**
- Settings page accessible
- Users can edit profile
- Email verification status shown

### Phase 4: Admin Panel
**Estimated Time:** 3-4 hours
**Priority:** HIGH

**Tasks:**
1. Create admin CRUD mutations:
   - `promoteToAdmin`
   - `demoteToUser`
   - `listAllUsers`
2. Create `/admin` route dengan permission check
3. Build AdminPanelContainer:
   - UserList table
   - RoleBadge component
   - Promote/Demote buttons (conditional)
4. Add confirmation dialogs
5. Create manual admin creation script (`manualUserCreation.ts`)

**Deliverables:**
- Admin panel accessible by admin/superadmin
- Superadmin can promote/demote
- Admin sees read-only view
- Manual admin creation script ready

### Phase 5: Authentication & Routing
**Estimated Time:** 2-3 hours
**Priority:** HIGH

**Tasks:**
1. Update `middleware.ts`:
   - Protect `/admin` route
   - Implement post-login redirect logic
2. Update dashboard layout:
   - First login detection
   - Redirect to `/settings` for new users
3. Add permission gates to UI:
   - Hide admin panel link for regular users
   - Show role badges
4. Test all routing scenarios

**Deliverables:**
- Post-login redirect working
- Admin panel protected
- UI adapts based on role

### Phase 6: Data Migration & Testing
**Estimated Time:** 2-3 hours
**Priority:** HIGH

**Tasks:**
1. Migrate existing users:
   - Add `role: "user"` to existing records
   - Set `emailVerified` based on Clerk data
2. Create test users:
   - 1 superadmin (erik.supit@gmail.com)
   - 1 admin (makalah.app@gmail.com)
   - 3 regular users
3. Manual testing:
   - Public signup flow
   - Email verification
   - Password reset
   - Admin panel (promote/demote)
   - Permission boundaries
4. Fix bugs

**Deliverables:**
- All existing users migrated
- Test users created
- All flows tested dan working
- Production-ready

---

## 9. Success Criteria

### 9.1 Functional Requirements
- [ ] Public users dapat signup via Clerk
- [ ] Email verification required dan working
- [ ] Password reset via Resend working
- [ ] Admin/superadmin can be created manually
- [ ] Post-login redirects to /settings for first-time users
- [ ] All users can access /settings page
- [ ] All users can access /chat page
- [ ] Only admin/superadmin can access /admin panel
- [ ] Superadmin can promote user → admin
- [ ] Superadmin can demote admin → user
- [ ] Admin cannot promote/demote (read-only)
- [ ] Cannot modify superadmin role
- [ ] Role badges displayed correctly
- [ ] Email verification status shown

### 9.2 Technical Requirements
- [ ] Schema deployed dengan role field
- [ ] Server-side permission checks working
- [ ] Clerk + Resend integration complete
- [ ] Email templates configured
- [ ] Middleware route protection working
- [ ] ensureConvexUser() handles pending admin updates
- [ ] Real-time UI updates via Convex reactivity
- [ ] No permission bypass vulnerabilities

### 9.3 UX Requirements
- [ ] Clear error messages (Indonesian)
- [ ] Toast notifications for user actions
- [ ] Loading states during mutations
- [ ] Responsive design (mobile-friendly)
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Empty states when no users
- [ ] Confirmation dialogs for destructive actions

### 9.4 Security Requirements
- [ ] All admin mutations require server-side permission checks
- [ ] Cannot bypass middleware protection
- [ ] No sensitive data exposed to client unnecessarily
- [ ] Superadmin role cannot be modified
- [ ] Clerk sessions properly validated
- [ ] CSRF protection (built-in Next.js)

### 9.5 Email Requirements
- [ ] Verification emails delivered within 1 minute
- [ ] Password reset emails delivered within 1 minute
- [ ] Email templates branded (Makalah App)
- [ ] Emails readable on mobile dan desktop
- [ ] Links expire properly (24h verification, 1h reset)

---

## 10. Future Enhancements (Post-MVP)

### 10.1 Advanced Permissions
- Custom roles beyond superadmin/admin/user
- Granular permissions (per-feature access control)
- Role templates

### 10.2 User Management Features
- Bulk user operations (bulk promote, bulk email)
- User suspension/ban
- User activity logs (audit trail)
- Session management (force logout)

### 10.3 Email Enhancements
- Custom email templates (WYSIWYG editor)
- Email queue monitoring
- Resend webhook integration (delivery status)
- Email preview before sending

### 10.4 Profile Features
- Profile pictures/avatars
- Bio/about section
- Social links
- User preferences (theme, language)

### 10.5 Security Enhancements
- Two-factor authentication (2FA)
- Login history
- Password strength meter
- Account recovery options
- IP whitelisting for admin panel

---

## 11. Dependencies & Prerequisites

### 11.1 Environment Variables

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_SECRET_KEY=sk_test_***

# Convex
CONVEX_DEPLOYMENT=***
NEXT_PUBLIC_CONVEX_URL=https://***

# Resend Email Service
RESEND_API_KEY=re_***
RESEND_FROM_EMAIL=noreply@makalahapp.com

# App Config
APP_URL=https://makalahapp.com
```

### 11.2 NPM Packages (Already Installed)
- `@clerk/nextjs` (authentication)
- `convex` (database)
- `@radix-ui/*` (UI primitives)
- `tailwindcss` (styling)
- `lucide-react` (icons)
- `sonner` (toast notifications)

### 11.3 Additional Packages Needed
```bash
# None - all dependencies already installed
```

### 11.4 Clerk Configuration Steps

1. **Enable Email & Password Authentication:**
   - Clerk Dashboard → User & Authentication → Email, Phone, Username
   - Enable "Email address"
   - Require email verification

2. **Configure Resend Integration:**
   - Clerk Dashboard → Email & SMS → Email
   - Select "Custom SMTP" atau "Resend" (if native integration available)
   - Enter Resend API key
   - Configure sender email: noreply@makalahapp.com

3. **Customize Email Templates:**
   - Clerk Dashboard → Customization → Email Templates
   - Edit "Verification Email"
   - Edit "Password Reset Email"
   - Use Indonesian language
   - Add Makalah App branding

4. **Configure Redirect URLs:**
   - Clerk Dashboard → Paths
   - Sign-up redirect: `/settings`
   - Sign-in redirect: `/dashboard`
   - After sign-out: `/`

---

## 12. Risk Mitigation

### 12.1 Technical Risks

**Risk:** Clerk + Resend integration tidak compatible
- **Mitigation:** Test integration di staging environment first, fallback to Clerk default email jika Resend gagal
- **Monitoring:** Track email delivery rates

**Risk:** Pending admin tidak ter-sync saat first login
- **Mitigation:** Robust email matching logic di `ensureConvexUser()`, manual update script available
- **Monitoring:** Log semua pending admin updates

**Risk:** Permission bypass via client-side manipulation
- **Mitigation:** ALL permission checks di server-side (Convex mutations), client-side UI hiding hanya UX
- **Monitoring:** Audit logs untuk failed permission checks

### 12.2 UX Risks

**Risk:** Users bingung dengan post-login redirect
- **Mitigation:** Clear onboarding flow, toast notification: "Silakan lengkapi profil Anda"
- **Monitoring:** Track user completion rate di settings page

**Risk:** Email verification emails masuk spam
- **Mitigation:** Configure SPF/DKIM for makalahapp.com, instruksikan users check spam folder
- **Monitoring:** Track verification completion rate

### 12.3 Security Risks

**Risk:** Superadmin accidentally locked out (role change)
- **Mitigation:** Hard-coded protection: cannot modify superadmin role, always have backup superadmin
- **Monitoring:** Alert on superadmin role changes

**Risk:** Unauthorized admin creation
- **Mitigation:** Manual creation script requires Convex admin access, no public endpoint
- **Monitoring:** Log all admin creations

---

## 13. Testing Checklist

### 13.1 Public User Registration
- [ ] User dapat signup via /sign-up
- [ ] Email verification email terkirim
- [ ] User dapat verify email via link
- [ ] Login setelah verification berhasil
- [ ] First login redirect ke /settings
- [ ] User dapat complete profile
- [ ] User dapat navigate ke /chat
- [ ] User TIDAK dapat access /admin

### 13.2 Admin Creation & Login
- [ ] Superadmin dapat run script create admin
- [ ] Pending admin record created di database
- [ ] Admin dapat signup dengan email yang sama
- [ ] Verification email terkirim
- [ ] Admin verify email
- [ ] First login update clerkUserId
- [ ] Role "admin" preserved (tidak overwrite)
- [ ] Admin dapat access /admin panel
- [ ] Admin sees read-only user list
- [ ] Admin TIDAK dapat promote/demote

### 13.3 Superadmin Functions
- [ ] Auto-promote erik.supit@gmail.com on first login
- [ ] Superadmin dapat access /admin panel
- [ ] Superadmin sees full user list
- [ ] Superadmin dapat promote user → admin
- [ ] Toast confirmation after promote
- [ ] User list auto-updates
- [ ] Superadmin dapat demote admin → user
- [ ] Toast confirmation after demote
- [ ] TIDAK dapat modify superadmin role
- [ ] Error message jika try to modify superadmin

### 13.4 Password Reset
- [ ] User klik "Forgot password?"
- [ ] Enter email address
- [ ] Reset email terkirim
- [ ] User klik reset link
- [ ] User enter new password
- [ ] Password updated successfully
- [ ] User dapat login dengan new password

### 13.5 Permission Boundaries
- [ ] Regular user cannot access /admin route
- [ ] Middleware redirects to /sign-in
- [ ] Admin cannot call promoteToAdmin mutation
- [ ] Server throws permission error
- [ ] Client shows error toast
- [ ] UI hides admin panel link for regular users
- [ ] Role badges displayed correctly for all roles

### 13.6 Edge Cases
- [ ] User signup dengan email admin yang pending
- [ ] Handle gracefully (notify duplicate)
- [ ] Promote user yang already admin
- [ ] Show error toast
- [ ] Demote user yang already user
- [ ] Show error toast
- [ ] Try to modify own role (superadmin)
- [ ] Should succeed (allowed)
- [ ] Email verification link expired
- [ ] Show error, allow resend

---

## 14. Appendix

### 14.1 Role Comparison Table

| Feature | User | Admin | Superadmin |
|---------|------|-------|------------|
| Access /settings | ✅ | ✅ | ✅ |
| Access /chat | ✅ | ✅ | ✅ |
| Access /admin panel | ❌ | ✅ (read-only) | ✅ (full) |
| View user list | ❌ | ✅ | ✅ |
| Promote user to admin | ❌ | ❌ | ✅ |
| Demote admin to user | ❌ | ❌ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ |
| Modify superadmin role | ❌ | ❌ | ❌ |
| Create admin manually | ❌ | ❌ | ✅ (script) |

### 14.2 Email Template Examples

**Verification Email (Bahasa Indonesia):**
```
From: Makalah App <noreply@makalahapp.com>
Subject: Verifikasi Email Anda - Makalah App

Halo {{firstName}},

Terima kasih telah mendaftar di Makalah App!

Untuk menyelesaikan registrasi, silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda:

[TOMBOL: Verifikasi Email] ({{verificationLink}})

Link verifikasi berlaku selama 24 jam.

Jika Anda tidak mendaftar di Makalah App, abaikan email ini.

Salam,
Tim Makalah App
https://makalahapp.com
```

**Password Reset Email:**
```
From: Makalah App <noreply@makalahapp.com>
Subject: Reset Password - Makalah App

Halo {{firstName}},

Kami menerima permintaan untuk reset password akun Anda.

Klik tombol di bawah ini untuk membuat password baru:

[TOMBOL: Reset Password] ({{resetLink}})

Link reset berlaku selama 1 jam.

Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tetap aman.

Salam,
Tim Makalah App
https://makalahapp.com
```

### 14.3 Manual Admin Creation Script Example

```bash
# Create admin user
npx convex run admin:manualUserCreation:createAdminUser '{
  "email": "makalah.app@gmail.com",
  "role": "admin",
  "firstName": "Makalah",
  "lastName": "App"
}'

# Expected output:
# {
#   userId: "jx7...",
#   message: "Admin user created. Instruksikan makalah.app@gmail.com untuk signup via Clerk."
# }

# Notify admin:
# "Hi Makalah, silakan signup di https://app.makalahapp.com/sign-up
#  menggunakan email makalah.app@gmail.com.
#  Setelah verify email, Anda akan memiliki akses admin panel."
```

### 14.4 Permission Check Example (Server-Side)

```typescript
// In any Convex mutation that requires admin access
export const someAdminAction = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    /* other args */
  },
  handler: async ({ db }, { requestorUserId, /* ... */ }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    // Proceed with action only if permission check passes
    // ...
  },
})
```

---

## 15. Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-13 | Spec Team | Initial specification document |

---

**END OF SPECIFICATION DOCUMENT**
