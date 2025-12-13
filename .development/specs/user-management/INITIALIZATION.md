# Initialization Checklist - User Management System

## Pre-Implementation Setup

### 1. Environment Verification

**Check Existing Environment Variables:**
```bash
# Already configured (verify in .env.local)
✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
✓ CLERK_SECRET_KEY
✓ CONVEX_DEPLOYMENT
✓ NEXT_PUBLIC_CONVEX_URL
```

**NEW Environment Variables Needed:**
```bash
# Add to .env.local
RESEND_API_KEY=re_***                    # Get from resend.com
RESEND_FROM_EMAIL=noreply@makalahapp.com # Configure sender email
```

**Steps to Get Resend API Key:**
1. Go to https://resend.com
2. Sign up / Login
3. Navigate to API Keys
4. Create new API key dengan name: "Makalah App - Production"
5. Copy API key ke .env.local
6. Verify sender email domain di Resend dashboard

---

### 2. Clerk Dashboard Configuration

**Required Clerk Settings:**

**2.1 Enable Email & Password Authentication:**
1. Go to Clerk Dashboard: https://dashboard.clerk.com
2. Select your Makalah App project
3. Navigate to: **User & Authentication** → **Email, Phone, Username**
4. Enable: ✅ **Email address**
5. Settings:
   - ✅ Require email verification
   - Password minimum length: 8 characters
6. Save changes

**2.2 Configure Email Provider (Resend):**
1. Go to: **Email & SMS** → **Email**
2. Select delivery method:
   - Option A: **Resend** (if native integration available)
   - Option B: **Custom SMTP** (configure manually)
3. Enter Resend credentials:
   - API Key: (from step 1)
   - From Email: noreply@makalahapp.com
   - From Name: Makalah App
4. Test email delivery
5. Save configuration

**2.3 Configure Redirect URLs:**
1. Go to: **Paths**
2. Set redirect URLs:
   - After sign-up: `/settings`
   - After sign-in: `/dashboard`
   - After sign-out: `/`
3. Save settings

**2.4 Customize Email Templates (Optional but Recommended):**
1. Go to: **Customization** → **Emails**
2. Edit templates:
   - **Verification Email:**
     - Subject: `Verifikasi Email Anda - Makalah App`
     - Body: Use Indonesian language
     - Include {{verificationLink}}
   - **Password Reset Email:**
     - Subject: `Reset Password - Makalah App`
     - Body: Use Indonesian language
     - Include {{resetLink}}
3. Add Makalah App branding (logo, colors)
4. Save templates

---

### 3. Development Environment Setup

**3.1 Install Required Packages:**
```bash
# Verify shadcn/ui components installed
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add card

# All other dependencies already installed
```

**3.2 Start Development Servers:**
```bash
# Terminal 1: Convex dev mode
npx convex dev

# Terminal 2: Next.js dev server
npm run dev
```

**3.3 Verify Services Running:**
- ✅ Next.js: http://localhost:3000
- ✅ Convex Dashboard: https://dashboard.convex.dev
- ✅ Clerk Dashboard: https://dashboard.clerk.com

---

### 4. Database Preparation

**4.1 Backup Current Database:**
```bash
# Export existing users (before schema change)
npx convex data users > backup-users-$(date +%Y%m%d).json
```

**4.2 Review Current Users:**
```bash
# Check how many users exist
npx convex data users --limit 50

# Identify users that will need migration
# (users created before role field added)
```

---

### 5. Test Accounts Preparation

**5.1 Create Test Email Accounts:**

Prepare test email accounts for testing flows:
- `erik.supit@gmail.com` - Will be auto-promoted to superadmin
- `makalah.app@gmail.com` - Test admin (manual creation)
- `posteriot@gmail.com` - Test user 1
- `1200pixels@gmail.com` - Test user 2
- `tokayakuwi@gmail.com` - Test user 3

**5.2 Verify Email Access:**
- Ensure you can access inbox untuk all test emails
- Check spam filtering settings
- Prepare to receive verification emails

---

### 6. Resend Domain Configuration

**6.1 Verify Sender Domain:**

If using custom domain (makalahapp.com):
1. Go to Resend Dashboard → Domains
2. Add domain: makalahapp.com
3. Configure DNS records:
   - SPF record: `v=spf1 include:_spf.resend.com ~all`
   - DKIM records: (provided by Resend)
   - DMARC record: (recommended)
4. Verify domain ownership
5. Wait for DNS propagation (up to 24 hours)

**Alternative: Use Resend's Default Domain:**
- If custom domain not ready, use Resend's sending domain temporarily
- Update RESEND_FROM_EMAIL accordingly

---

### 7. File Structure Verification

**Verify Directory Structure Exists:**
```bash
# Check directories exist
ls -la convex/
ls -la convex/admin/           # Will be created
ls -la src/app/(dashboard)/
ls -la src/components/
ls -la src/lib/hooks/

# Create missing directories
mkdir -p convex/admin
mkdir -p convex/migrations
mkdir -p src/components/settings
mkdir -p src/components/admin
mkdir -p src/lib/hooks
```

---

### 8. Git Workflow Setup

**8.1 Create Feature Branch:**
```bash
git checkout -b feature/user-management-system
```

**8.2 Verify .gitignore:**
```bash
# Ensure .env.local is ignored
grep -q ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

**8.3 Initial Commit:**
```bash
git add .development/specs/user-management/
git commit -m "docs: add user management system specification"
git push origin feature/user-management-system
```

---

### 9. Implementation Checklist

**Ready to Start Implementation:**
- [ ] All environment variables configured
- [ ] Clerk dashboard fully configured
- [ ] Resend API key obtained
- [ ] Domain verified (or using default)
- [ ] Development servers running
- [ ] Database backed up
- [ ] Test accounts prepared
- [ ] shadcn/ui components installed
- [ ] Feature branch created
- [ ] Spec documents reviewed

**If All Checked ✅, Proceed to Phase 1:**
→ Begin with tasks.md: **USER-001** (Update Convex Schema)

---

## Quick Reference

### Important URLs
- **Clerk Dashboard:** https://dashboard.clerk.com
- **Resend Dashboard:** https://resend.com/dashboard
- **Convex Dashboard:** https://dashboard.convex.dev
- **Local Dev:** http://localhost:3000

### Key Files to Create
1. `convex/permissions.ts` - Permission helpers
2. `convex/admin/userManagement.ts` - Admin mutations
3. `convex/admin/manualUserCreation.ts` - Admin creation script
4. `src/app/(dashboard)/settings/page.tsx` - Settings page
5. `src/app/(dashboard)/admin/page.tsx` - Admin panel
6. `src/components/settings/*` - Settings components
7. `src/components/admin/*` - Admin components
8. `src/lib/hooks/useCurrentUser.ts` - User hook
9. `src/lib/hooks/usePermissions.ts` - Permission hook

### Command Reference
```bash
# Convex commands
npx convex dev                          # Start dev mode
npx convex deploy                       # Deploy to production
npx convex data users                   # View users table
npx convex run <function> --args '{}'  # Run mutation
npx convex logs                         # View logs

# Next.js commands
npm run dev                             # Start dev server
npm run build                           # Production build
npm run lint                            # Run linter

# Git commands
git checkout -b feature/user-management # Create branch
git add .                               # Stage changes
git commit -m "message"                 # Commit
git push origin feature/user-management # Push branch
```

---

## Troubleshooting

### Issue: Resend API key tidak valid
**Solution:** Regenerate API key di Resend dashboard, update .env.local, restart server

### Issue: Email tidak terkirim
**Solution:** Verify domain di Resend, check SPF/DKIM records, check spam folder

### Issue: Convex schema error
**Solution:** Stop npx convex dev, fix schema.ts, restart

### Issue: Clerk user tidak sync ke Convex
**Solution:** Check ensureConvexUser() di dashboard layout, verify clerkUserId mapping

---

**Ready to implement?** → Go to [tasks.md](./tasks.md) and start with **USER-001**

**Need help?** → Review [spec.md](./spec.md) for detailed architecture

**Last Updated:** 2025-12-13
