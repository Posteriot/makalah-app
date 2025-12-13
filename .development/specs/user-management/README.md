# User Management & Role-Based Access Control - Makalah App

## Overview
Sistem user management dengan role hierarchy (superadmin > admin > user) terintegrasi dengan Clerk authentication dan Resend email service.

## Dokumentasi
- **[spec.md](./spec.md)** - Complete technical specification
- **[tasks.md](./tasks.md)** - Detailed task breakdown dengan 58 tasks
- **[implementation/](./implementation/)** - Implementation logs dan reports

## Quick Start

### Prerequisites
```bash
# Environment variables required
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_SECRET_KEY=sk_test_***
RESEND_API_KEY=re_***
RESEND_FROM_EMAIL=noreply@makalahapp.com
```

### Implementation Phases
1. **Phase 1:** Database Schema & Permission System (1-2 hours)
2. **Phase 2:** Clerk + Resend Integration (2-3 hours)
3. **Phase 3:** User Settings Page (2-3 hours)
4. **Phase 4:** Admin Panel (3-4 hours)
5. **Phase 5:** Authentication & Routing (2-3 hours)
6. **Phase 6:** Data Migration & Testing (2-3 hours)

**Total Estimated Time:** 12-18 hours

## Key Features

### Role Hierarchy
- **Superadmin** (highest)
  - Auto-promoted: erik.supit@gmail.com
  - Can promote user → admin
  - Can demote admin → user
  - Full admin panel access
  - Cannot modify other superadmins

- **Admin**
  - Manual creation via script
  - Read-only admin panel access
  - Cannot promote/demote users
  - Can manage content (future)

- **User** (default)
  - Public signup via Clerk
  - Access /settings and /chat
  - Cannot access /admin panel

### Authentication Flow
1. **Public Users:**
   - Signup via Clerk → Email verification (Resend) → Login → /settings → /chat

2. **Admin/Superadmin:**
   - Manual creation → Signup via Clerk → Email verification → Login → /settings → /admin → /chat

### Access Control

| Feature | User | Admin | Superadmin |
|---------|------|-------|------------|
| /settings | ✅ | ✅ | ✅ |
| /chat | ✅ | ✅ | ✅ |
| /admin (view) | ❌ | ✅ | ✅ |
| Promote/Demote | ❌ | ❌ | ✅ |

## Database Schema Changes

```typescript
users: defineTable({
  clerkUserId: v.string(),
  email: v.string(),
  role: v.string(), // NEW: "superadmin" | "admin" | "user"
  firstName: v.optional(v.string()), // NEW
  lastName: v.optional(v.string()), // NEW
  emailVerified: v.boolean(), // NEW
  subscriptionStatus: v.string(),
  createdAt: v.number(),
  lastLoginAt: v.optional(v.number()), // NEW
  updatedAt: v.optional(v.number()), // NEW
})
  .index("by_clerkUserId", ["clerkUserId"])
  .index("by_role", ["role"]) // NEW
  .index("by_email", ["email"]) // NEW
```

## API (Convex Functions)

### Permission Helpers
```typescript
// convex/permissions.ts
hasRole(db, userId, requiredRole)
requireRole(db, userId, requiredRole)
isSuperAdmin(db, userId)
isAdmin(db, userId)
```

### User Management
```typescript
// convex/users.ts
getUserByClerkId(clerkUserId)
getUserRole(userId)
checkIsAdmin(userId)
checkIsSuperAdmin(userId)
listAllUsers(requestorUserId) // admin+
createUser(...) // auto-sync from Clerk
updateProfile(userId, firstName, lastName)
```

### Admin Actions
```typescript
// convex/admin/userManagement.ts
promoteToAdmin(targetUserId, requestorUserId) // superadmin only
demoteToUser(targetUserId, requestorUserId) // superadmin only
```

### Manual Admin Creation
```typescript
// convex/admin/manualUserCreation.ts
createAdminUser(email, role, firstName, lastName)
```

## Components Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── settings/page.tsx           # User settings (all users)
│   │   └── admin/page.tsx              # Admin panel (admin/superadmin only)
│   └── middleware.ts                   # Route protection
├── components/
│   ├── settings/
│   │   ├── SettingsContainer.tsx
│   │   ├── ProfileForm.tsx
│   │   └── EmailVerificationBanner.tsx
│   └── admin/
│       ├── AdminPanelContainer.tsx
│       ├── UserList.tsx
│       ├── RoleBadge.tsx
│       └── PromoteDialog.tsx
└── lib/
    └── hooks/
        ├── useCurrentUser.ts
        └── usePermissions.ts
```

## Testing Checklist

### Phase 1
- [ ] Schema deployed tanpa error
- [ ] Permission helpers working
- [ ] createUser handles all scenarios
- [ ] Auto-superadmin promotion working

### Phase 2
- [ ] Clerk + Resend configured
- [ ] Email verification working
- [ ] Password reset working
- [ ] Email templates customized

### Phase 3
- [ ] /settings accessible
- [ ] Profile edit working
- [ ] Email verification banner shown
- [ ] Role badge displayed

### Phase 4
- [ ] /admin protected properly
- [ ] User list displayed
- [ ] Promote/demote working (superadmin only)
- [ ] Confirmation dialogs working
- [ ] Manual admin creation tested

### Phase 5
- [ ] Middleware protecting routes
- [ ] Post-login redirect working
- [ ] Permission gates hiding UI elements
- [ ] No auth bypass

### Phase 6
- [ ] Existing users migrated
- [ ] All flows tested
- [ ] Permission boundaries verified
- [ ] Production deployed
- [ ] Email delivery working

## Manual Admin Creation

```bash
# Create admin user
npx convex run admin:manualUserCreation:createAdminUser '{
  "email": "makalah.app@gmail.com",
  "role": "admin",
  "firstName": "Makalah",
  "lastName": "App"
}'

# Instruksikan admin untuk signup via Clerk
# Email: makalah.app@gmail.com
# Password: (admin sets own password)

# After signup, pending record akan di-update dengan real Clerk ID
# Role "admin" akan preserved
```

## Security Notes

⚠️ **CRITICAL SECURITY RULES:**

1. **ALL permission checks MUST be server-side** (Convex mutations)
2. **Client-side UI hiding is UX only**, NOT security
3. **Never bypass requireRole() checks**
4. **Superadmin role CANNOT be modified** (hard-coded protection)
5. **Always validate requestorUserId in admin mutations**
6. **Email verification REQUIRED before allowing full access**

## Troubleshooting

### Email not received
- Check Resend API key
- Verify sender email: noreply@makalahapp.com
- Check spam folder
- Verify SPF/DKIM records for domain

### Permission denied errors
- Verify user role in Convex database
- Check server-side permission helpers
- Ensure requestorUserId passed correctly

### Pending admin not updating
- Verify email match exactly (case-sensitive)
- Check clerkUserId starts with "pending_"
- Manually update via Convex dashboard if needed

### Migration failed
- Backup database first
- Check migration script syntax
- Run with `--verbose` flag
- Rollback schema if needed

## Support

- **Spec Document:** [spec.md](./spec.md)
- **Task Breakdown:** [tasks.md](./tasks.md)
- **Implementation Logs:** [implementation/](./implementation/)
- **Clerk Docs:** https://clerk.com/docs
- **Resend Docs:** https://resend.com/docs
- **Convex Docs:** https://docs.convex.dev

---

**Version:** 1.0
**Last Updated:** 2025-12-13
**Status:** Ready for Implementation
