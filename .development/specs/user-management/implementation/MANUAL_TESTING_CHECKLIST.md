# Manual Testing Checklist - User Management System

**Date:** 2025-12-13
**Phase:** 6 - Data Migration & Testing
**Status:** AWAITING MANUAL TESTING

---

## Overview

Phase 6 Task Groups 6.2-6.6 memerlukan **manual testing** via browser dan email verification. Document ini adalah checklist lengkap untuk semua manual tests yang harus dilakukan.

**Automated Tasks (COMPLETED):**
- ✅ USER-040: Audit existing users
- ✅ USER-041: Create migration script
- ✅ USER-042: Run migration script (0/2 users needed migration)
- ✅ USER-044: Create test admin via script (makalah.app@gmail.com pending admin created)

**Manual Testing Tasks (PENDING):**
- ⏳ USER-043: Verify erik.supit@gmail.com auto-promoted to superadmin
- ⏳ USER-045: Test admin signup flow
- ⏳ USER-046: Test public user registration flow
- ⏳ USER-047: Test superadmin promote user flow
- ⏳ USER-048: Test superadmin demote admin flow
- ⏳ USER-049: Test password reset flow
- ⏳ USER-050: Test admin cannot promote/demote
- ⏳ USER-051: Test cannot modify superadmin role
- ⏳ USER-052: Test regular user cannot access admin panel
- ⏳ USER-053: Test email already exists error
- ⏳ USER-054: Test promote already admin
- ⏳ USER-055: Test demote already user
- ⏳ USER-056: Test email verification expired link
- ⏳ USER-057: Deploy to staging environment
- ⏳ USER-058: Production deployment & verification

---

## Test Credentials

### Superadmin Account (To Be Created):
- **Email:** erik.supit@gmail.com
- **Role:** superadmin (auto-promoted)
- **Password:** [Choose your own password during signup]
- **Status:** NOT YET CREATED

### Admin Account (Pending - Already Created in Database):
- **Email:** makalah.app@gmail.com
- **Role:** admin (preserved from pending record)
- **Password:** M4k4l4h2025 (suggested)
- **Status:** PENDING (created in DB, awaiting signup)
- **Database ID:** `jn711ghvnk8r9x3dts9yp3wcg57x795q`
- **Clerk User ID:** `pending_makalah.app@gmail.com_1765639569317`

### Test User Account (To Be Created):
- **Email:** posteriot@gmail.com
- **Role:** user (default)
- **Password:** [Choose your own password during signup]
- **Status:** NOT YET CREATED

---

## Task Group 6.2: Manual User Creation Testing

### ✅ USER-044: Create Test Admin via Manual Script [COMPLETED]

**Status:** ✅ COMPLETED

**Result:**
```json
{
  "message": "Admin user created. Instruksikan makalah.app@gmail.com untuk signup via Clerk.",
  "userId": "jn711ghvnk8r9x3dts9yp3wcg57x795q"
}
```

**Verification:**
- ✅ Pending admin record created in database
- ✅ `clerkUserId` starts with `"pending_makalah.app@gmail.com_1765639569317"`
- ✅ `role` = "admin"
- ✅ `emailVerified` = false
- ✅ `subscriptionStatus` = "pro"
- ✅ `firstName` = "Makalah", `lastName` = "App"

---

### ⏳ USER-045: Test Admin Signup Flow [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-044 completed (pending admin created)
- ✅ Local dev server running (`npm run dev`)
- ✅ Email access to makalah.app@gmail.com

**Test Steps:**

1. **Navigate to Signup Page**
   ```
   URL: http://localhost:3000/sign-up
   ```

2. **Fill Signup Form**
   - Email: `makalah.app@gmail.com`
   - Password: `M4k4l4h2025`
   - First Name: `Makalah`
   - Last Name: `App`

3. **Submit Form**
   - Click "Sign Up" button
   - Should create account and send verification email

4. **Check Email Inbox**
   - Open makalah.app@gmail.com inbox
   - Find verification email from Clerk
   - Click verification link

5. **Verify Email**
   - Email should be verified
   - Should redirect to sign-in or dashboard

6. **Login**
   - Email: `makalah.app@gmail.com`
   - Password: `M4k4l4h2025`
   - Should redirect to `/dashboard` → auto-redirect to `/settings`

7. **Check Convex Database**
   ```bash
   npx convex data users --limit 10
   ```
   **Expected Results:**
   - `clerkUserId` updated to real Clerk ID (no longer starts with "pending_")
   - `role` = "admin" (PRESERVED from pending record)
   - `emailVerified` = true
   - `subscriptionStatus` = "pro"

8. **Access Settings Page**
   ```
   URL: http://localhost:3000/settings
   ```
   **Expected Results:**
   - ✅ Can access settings
   - ✅ Email displayed correctly
   - ✅ Role badge shows "Admin"
   - ✅ Subscription shows "pro"
   - ✅ No email verification banner (emailVerified = true)

9. **Access Admin Panel**
   ```
   URL: http://localhost:3000/admin
   ```
   **Expected Results:**
   - ✅ Can access admin panel
   - ✅ User list displayed
   - ✅ Read-only mode (NO promote/demote buttons)
   - ✅ Action column shows "View only" text

10. **Verify Dashboard Layout**
    **Expected Results:**
    - ✅ Admin Panel link visible in navigation
    - ✅ Shield icon displayed

**Success Criteria:**
- [ ] Pending admin record updated correctly
- [ ] Role preserved as "admin"
- [ ] Can access admin panel
- [ ] Cannot promote/demote (buttons hidden - read-only mode)
- [ ] All data synced correctly from Clerk to Convex

---

## Task Group 6.3: User Flow Testing

### ⏳ USER-043: Verify Superadmin Auto-Promotion [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-042 completed (migration ran)
- ✅ Local dev server running
- ✅ Email access to erik.supit@gmail.com

**Test Steps:**

1. **Navigate to Signup Page**
   ```
   URL: http://localhost:3000/sign-up
   ```

2. **Fill Signup Form**
   - Email: `erik.supit@gmail.com`
   - Password: [Choose your own secure password]
   - First Name: `Erik`
   - Last Name: `Supit`

3. **Submit and Verify Email**
   - Click "Sign Up"
   - Check erik.supit@gmail.com inbox
   - Click verification link

4. **Login**
   - Email: `erik.supit@gmail.com`
   - Password: [Your password]

5. **Check Convex Database**
   ```bash
   npx convex data users --limit 10
   ```
   **Expected Results:**
   - New user record for erik.supit@gmail.com
   - `role` = **"superadmin"** (auto-promoted by createUser mutation)
   - `emailVerified` = true
   - `subscriptionStatus` = "pro" (auto-set for superadmin)

6. **Access Admin Panel**
   ```
   URL: http://localhost:3000/admin
   ```
   **Expected Results:**
   - ✅ Can access admin panel
   - ✅ User list displayed
   - ✅ **Promote/Demote buttons visible** (superadmin has full access)
   - ✅ Can see all users including self

7. **Verify Own User Row**
   - Find erik.supit@gmail.com in user list
   - **Expected Results:**
     - ✅ Role badge shows "Superadmin"
     - ✅ Action column shows "Cannot modify" (cannot modify own superadmin role)
     - ✅ No promote/demote buttons for superadmin row

**Success Criteria:**
- [ ] erik.supit@gmail.com has role "superadmin"
- [ ] Auto-promotion logic working
- [ ] Can access admin panel
- [ ] Promote/demote buttons visible for other users
- [ ] Cannot modify own superadmin role

---

### ⏳ USER-046: Test Public User Registration Flow [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ Local dev server running
- ✅ Email access to posteriot@gmail.com (or any test email)

**Test Steps:**

1. **Navigate to Signup Page**
   ```
   URL: http://localhost:3000/sign-up
   ```

2. **Fill Signup Form**
   - Email: `posteriot@gmail.com`
   - Password: [Choose password]
   - First Name: `Posteriot`
   - Last Name: `Test`

3. **Submit and Verify Email**
   - Click "Sign Up"
   - Check inbox
   - Click verification link

4. **Login (First Time)**
   - Email: `posteriot@gmail.com`
   - Password: [Your password]
   - **Expected:** Redirect to `/dashboard` → auto-redirect to `/settings`

5. **Check Settings Page**
   ```
   URL: http://localhost:3000/settings
   ```
   **Expected Results:**
   - ✅ Can access settings
   - ✅ Role badge shows "User"
   - ✅ Subscription shows "free"
   - ✅ No email verification banner

6. **Complete Profile**
   - Edit First Name / Last Name if needed
   - Click "Simpan Perubahan"
   - **Expected:** Toast notification "Profil berhasil diperbarui"

7. **Navigate to Chat**
   ```
   URL: http://localhost:3000/chat
   ```
   **Expected Results:**
   - ✅ Can access chat page
   - ✅ Chat interface loads correctly

8. **Try to Access Admin Panel**
   ```
   URL: http://localhost:3000/admin
   ```
   **Expected Results:**
   - ❌ Shows "Akses Ditolak" alert
   - ❌ Cannot access admin panel
   - ✅ Clear error message displayed

9. **Verify Dashboard Layout**
   **Expected Results:**
   - ❌ No Admin Panel link in navigation (hidden for regular users)
   - ✅ Only Chat and Settings links visible

**Success Criteria:**
- [ ] Signup successful
- [ ] Email verification working
- [ ] Redirect to /settings on first login
- [ ] Can access /chat
- [ ] Cannot access /admin
- [ ] Admin panel link hidden in navigation

---

### ⏳ USER-047: Test Superadmin Promote User Flow [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-043 completed (erik.supit@gmail.com is superadmin)
- ✅ USER-046 completed (posteriot@gmail.com is regular user)

**Test Steps:**

1. **Login as Superadmin**
   - Email: `erik.supit@gmail.com`
   - Password: [Your password]

2. **Navigate to Admin Panel**
   ```
   URL: http://localhost:3000/admin
   ```

3. **Find Target User**
   - Locate `posteriot@gmail.com` in user list
   - **Expected:** Role badge shows "User"

4. **Click Promote Button**
   - Find posteriot@gmail.com row
   - Click "Promote" button (with ArrowUp icon)
   - **Expected:** Confirmation dialog appears

5. **Confirm Promotion**
   - Dialog title: "Promote ke Admin"
   - Dialog message: "Apakah Anda yakin ingin promote posteriot@gmail.com menjadi admin?"
   - Click "Konfirmasi" button

6. **Verify Success**
   **Expected Results:**
   - ✅ Toast notification: "User posteriot@gmail.com berhasil dipromosikan menjadi admin"
   - ✅ User list updates (role badge changes to "Admin")
   - ✅ Promote button replaced with Demote button
   - ✅ Real-time update (no page refresh needed)

7. **Check Convex Database**
   ```bash
   npx convex data users --limit 10
   ```
   **Expected:**
   - posteriot@gmail.com role = "admin"
   - subscriptionStatus = "pro"
   - updatedAt timestamp updated

8. **Logout and Login as Promoted User**
   - Logout from erik.supit@gmail.com
   - Login as `posteriot@gmail.com`

9. **Verify Admin Access**
   ```
   URL: http://localhost:3000/admin
   ```
   **Expected Results:**
   - ✅ Can access admin panel now
   - ✅ User list displayed
   - ✅ Read-only mode (no promote/demote buttons)
   - ✅ Action column shows "View only"

10. **Verify Dashboard Layout**
    **Expected Results:**
    - ✅ Admin Panel link now visible in navigation

**Success Criteria:**
- [ ] Promote successful
- [ ] User list updates real-time
- [ ] Toast notification shown
- [ ] Promoted user can access /admin
- [ ] Promoted user cannot promote others (read-only mode)

---

### ⏳ USER-048: Test Superadmin Demote Admin Flow [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-047 completed (posteriot@gmail.com is admin)

**Test Steps:**

1. **Login as Superadmin**
   - Email: `erik.supit@gmail.com`
   - Password: [Your password]

2. **Navigate to Admin Panel**
   ```
   URL: http://localhost:3000/admin
   ```

3. **Find Target Admin**
   - Locate `posteriot@gmail.com` in user list
   - **Expected:** Role badge shows "Admin"
   - **Expected:** Demote button visible (ArrowDown icon)

4. **Click Demote Button**
   - Click "Demote" button
   - **Expected:** Confirmation dialog appears

5. **Confirm Demotion**
   - Dialog title: "Demote ke User"
   - Dialog message: "Apakah Anda yakin ingin demote posteriot@gmail.com menjadi user biasa?"
   - Click "Konfirmasi" button

6. **Verify Success**
   **Expected Results:**
   - ✅ Toast notification: "User posteriot@gmail.com berhasil diturunkan menjadi user biasa"
   - ✅ User list updates (role badge changes to "User")
   - ✅ Demote button replaced with Promote button
   - ✅ Real-time update

7. **Check Convex Database**
   ```bash
   npx convex data users --limit 10
   ```
   **Expected:**
   - posteriot@gmail.com role = "user"
   - updatedAt timestamp updated

8. **Logout and Login as Demoted User**
   - Logout from erik.supit@gmail.com
   - Login as `posteriot@gmail.com`

9. **Try to Access Admin Panel**
   ```
   URL: http://localhost:3000/admin
   ```
   **Expected Results:**
   - ❌ Shows "Akses Ditolak" alert
   - ❌ Cannot access admin panel anymore

10. **Verify Dashboard Layout**
    **Expected Results:**
    - ❌ Admin Panel link no longer visible in navigation

**Success Criteria:**
- [ ] Demote successful
- [ ] User list updates
- [ ] Demoted user cannot access /admin anymore
- [ ] Admin panel link hidden from demoted user

---

### ⏳ USER-049: Test Password Reset Flow [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-046 completed (posteriot@gmail.com exists)
- ✅ Email access to posteriot@gmail.com

**Test Steps:**

1. **Navigate to Sign-In Page**
   ```
   URL: http://localhost:3000/sign-in
   ```

2. **Click "Forgot Password?"**
   - Find and click "Forgot password?" link
   - Should navigate to password reset page

3. **Enter Email**
   - Email: `posteriot@gmail.com`
   - Click "Send reset link" or similar button

4. **Check Email Inbox**
   - Open posteriot@gmail.com inbox
   - Find password reset email from Clerk
   - **Expected:** Email received within 1 minute

5. **Click Reset Link**
   - Click password reset link in email
   - Should navigate to reset password page

6. **Enter New Password**
   - New Password: [Choose new password]
   - Confirm Password: [Same password]
   - Click "Reset password" button

7. **Verify Reset Success**
   **Expected Results:**
   - ✅ Password reset successful message
   - ✅ Redirected to sign-in page

8. **Login with New Password**
   - Email: `posteriot@gmail.com`
   - Password: [New password]
   - Click "Sign In"

9. **Verify Login Success**
   **Expected Results:**
   - ✅ Login successful
   - ✅ Redirected to /dashboard → /settings
   - ✅ Can access account normally

**Success Criteria:**
- [ ] Reset email received within 1 minute
- [ ] Reset link works
- [ ] New password accepted
- [ ] Login successful with new password

---

## Task Group 6.4: Permission Boundary Testing

### ⏳ USER-050: Test Admin Cannot Promote/Demote [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-045 completed (makalah.app@gmail.com is admin)

**Test Steps:**

**Part 1: UI Test**

1. **Login as Admin**
   - Email: `makalah.app@gmail.com`
   - Password: `M4k4l4h2025`

2. **Navigate to Admin Panel**
   ```
   URL: http://localhost:3000/admin
   ```

3. **Verify UI State**
   **Expected Results:**
   - ✅ Can access admin panel
   - ✅ User list displayed
   - ❌ NO promote/demote buttons visible
   - ✅ Action column shows "View only" for all users

**Part 2: Server-Side Permission Test**

4. **Open Convex Dashboard**
   ```bash
   npx convex dashboard
   ```

5. **Navigate to Functions Tab**
   - Find `adminUserManagement:promoteToAdmin` function

6. **Try to Call Mutation Directly**
   - Get posteriot@gmail.com user ID from database
   - Get makalah.app@gmail.com user ID (requestor)
   - Try to call:
   ```json
   {
     "targetUserId": "[posteriot_user_id]"
   }
   ```

7. **Verify Error**
   **Expected Results:**
   - ❌ Mutation fails with error
   - ✅ Error message: "Unauthorized: superadmin access required"
   - ✅ Server-side permission check blocks mutation

**Success Criteria:**
- [ ] UI hides buttons correctly (read-only mode)
- [ ] Server-side permission check blocks mutation
- [ ] Clear error message shown
- [ ] Admin cannot bypass permission via direct API call

---

### ⏳ USER-051: Test Cannot Modify Superadmin Role [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-043 completed (erik.supit@gmail.com is superadmin)

**Test Steps:**

**Part 1: UI Test**

1. **Login as Superadmin**
   - Email: `erik.supit@gmail.com`
   - Password: [Your password]

2. **Navigate to Admin Panel**
   ```
   URL: http://localhost:3000/admin
   ```

3. **Find Own User Row**
   - Locate erik.supit@gmail.com in user list

4. **Verify UI State**
   **Expected Results:**
   - ✅ Role badge shows "Superadmin"
   - ✅ Action column shows "Cannot modify" text
   - ❌ NO promote/demote buttons for superadmin row

**Part 2: Server-Side Permission Test**

5. **Open Convex Dashboard**
   ```bash
   npx convex dashboard
   ```

6. **Navigate to Functions Tab**
   - Find `adminUserManagement:demoteToUser` function

7. **Try to Demote Superadmin**
   - Get erik.supit@gmail.com user ID
   - Try to call:
   ```json
   {
     "targetUserId": "[erik_superadmin_user_id]"
   }
   ```

8. **Verify Error**
   **Expected Results:**
   - ❌ Mutation fails with error
   - ✅ Error message: "Tidak bisa mengubah role superadmin"
   - ✅ Server-side validation blocks modification

**Success Criteria:**
- [ ] UI prevents modification (shows "Cannot modify")
- [ ] Server-side blocks mutation
- [ ] Error message: "Tidak bisa mengubah role superadmin"
- [ ] Superadmin role is protected

---

### ⏳ USER-052: Test Regular User Cannot Access Admin Panel [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-046 completed (posteriot@gmail.com is regular user)

**Test Steps:**

1. **Login as Regular User**
   - Email: `posteriot@gmail.com`
   - Password: [Your password]

2. **Check Dashboard Layout**
   **Expected Results:**
   - ❌ Admin Panel link NOT visible in navigation
   - ✅ Only Chat and Settings links visible

3. **Try Direct URL Access**
   ```
   URL: http://localhost:3000/admin
   ```
   **Expected Results:**
   - ❌ Shows "Akses Ditolak" alert (red destructive variant)
   - ❌ User list NOT displayed
   - ✅ Clear error message: "Anda tidak memiliki akses ke halaman ini"

4. **Verify Middleware Protection**
   - Middleware should allow access (authenticated user)
   - Page-level permission check should block access

**Success Criteria:**
- [ ] Permission check blocks access
- [ ] Clear error message shown
- [ ] Admin link hidden in UI
- [ ] Cannot bypass via direct URL

---

## Task Group 6.5: Edge Cases & Error Handling

### ⏳ USER-053: Test Email Already Exists Error [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-046 completed (posteriot@gmail.com exists)

**Test Steps:**

1. **Open Convex Dashboard**
   ```bash
   npx convex dashboard
   ```

2. **Navigate to Functions Tab**
   - Find `adminManualUserCreation:createAdminUser`

3. **Try to Create Admin with Existing Email**
   ```json
   {
     "email": "posteriot@gmail.com",
     "role": "admin",
     "firstName": "Test",
     "lastName": "User"
   }
   ```

4. **Verify Error**
   **Expected Results:**
   - ❌ Mutation fails with error
   - ✅ Error message: "User dengan email posteriot@gmail.com sudah terdaftar"
   - ✅ No pending record created

**Success Criteria:**
- [ ] Proper error handling
- [ ] Clear error message
- [ ] Cannot create duplicate admin with existing email

---

### ⏳ USER-054: Test Promote Already Admin [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-045 completed (makalah.app@gmail.com is admin)
- ✅ USER-043 completed (erik.supit@gmail.com is superadmin)

**Test Steps:**

1. **Open Convex Dashboard**
   ```bash
   npx convex dashboard
   ```

2. **Navigate to Functions Tab**
   - Find `adminUserManagement:promoteToAdmin`

3. **Try to Promote Already Admin**
   - Get makalah.app@gmail.com user ID (already admin)
   ```json
   {
     "targetUserId": "[makalah_admin_user_id]"
   }
   ```

4. **Verify Error**
   **Expected Results:**
   - ❌ Mutation fails with error
   - ✅ Error message: "User sudah menjadi admin"
   - ✅ No changes to database

**Success Criteria:**
- [ ] Error handled gracefully
- [ ] Toast shows error message (if via UI)
- [ ] Clear error message

---

### ⏳ USER-055: Test Demote Already User [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-046 completed (posteriot@gmail.com is user)

**Test Steps:**

1. **Open Convex Dashboard**
   ```bash
   npx convex dashboard
   ```

2. **Navigate to Functions Tab**
   - Find `adminUserManagement:demoteToUser`

3. **Try to Demote Already User**
   - Get posteriot@gmail.com user ID (already user)
   ```json
   {
     "targetUserId": "[posteriot_user_id]"
   }
   ```

4. **Verify Error**
   **Expected Results:**
   - ❌ Mutation fails with error
   - ✅ Error message: "User sudah berstatus user biasa"
   - ✅ No changes to database

**Success Criteria:**
- [ ] Error handled gracefully
- [ ] Toast shows error message (if via UI)
- [ ] Clear error message

---

### ⏳ USER-056: Test Email Verification Expired Link [MANUAL TESTING REQUIRED]

**Status:** ⏳ PENDING - LOW PRIORITY

**Prerequisites:**
- ✅ Email access for testing

**Test Steps:**

1. **Signup New User**
   - Create new test account
   - Email: [test email]

2. **Wait for Verification Link to Expire**
   - Option 1: Wait for actual expiration (may take hours/days)
   - Option 2: Manually expire via Clerk Dashboard (if possible)

3. **Try to Click Expired Link**
   - Click verification link after expiration
   **Expected Results:**
   - ❌ Error message shown
   - ✅ Clear message about expired link

4. **Verify Can Resend Verification**
   - Find resend verification option
   - Click resend
   **Expected Results:**
   - ✅ New verification email sent
   - ✅ New link works correctly

**Success Criteria:**
- [ ] Expired link handled properly
- [ ] User can resend verification email
- [ ] New link works

**Note:** This test is LOW PRIORITY and may be skipped if Clerk handles this automatically.

---

## Task Group 6.6: Production Deployment

### ⏳ USER-057: Deploy to Staging Environment [MANUAL DEPLOYMENT]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ All USER-040 to USER-056 tests passed
- ✅ All env vars documented

**Steps:**

1. **Verify Environment Variables**
   - Check all required env vars in staging:
     ```bash
     # Convex
     NEXT_PUBLIC_CONVEX_URL
     CONVEX_DEPLOYMENT

     # Clerk
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
     CLERK_SECRET_KEY
     CLERK_WEBHOOK_SECRET
     NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL
     NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
     NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL

     # AI
     AI_GATEWAY_URL
     AI_GATEWAY_API_KEY
     OPENROUTER_API_KEY

     # Resend
     RESEND_API_KEY
     RESEND_FROM_EMAIL
     ```

2. **Run Local Build**
   ```bash
   npm run build
   ```
   **Expected:** Build successful, 0 errors

3. **Deploy Convex to Production**
   ```bash
   npx convex deploy
   ```

4. **Deploy Next.js to Vercel Staging**
   - Use Vercel CLI or dashboard
   - Deploy to staging environment

5. **Run Smoke Tests on Staging**
   - Test homepage loads
   - Test sign-up flow
   - Test sign-in flow
   - Test admin panel access
   - Test basic functionality

6. **Check Logs**
   - Check Convex logs for errors
   - Check Vercel logs for errors

**Success Criteria:**
- [ ] Build successful
- [ ] Convex deployed
- [ ] Staging accessible
- [ ] No critical errors in logs
- [ ] Basic flows working

---

### ⏳ USER-058: Production Deployment & Verification [MANUAL DEPLOYMENT]

**Status:** ⏳ PENDING

**Prerequisites:**
- ✅ USER-057 completed (staging deployed and tested)

**Steps:**

1. **Final QA Review on Staging**
   - Review all critical flows
   - Verify all tests passed
   - Check for any issues

2. **Deploy to Production**
   - Deploy Convex to production
   - Deploy Next.js to Vercel production

3. **Create Superadmin Test Account**
   - Signup with production superadmin email
   - Verify auto-promotion

4. **Create Test Users**
   - Create admin user
   - Create regular user
   - Test promote/demote

5. **Test Critical Flows**
   - Signup + verification
   - Login + redirect
   - Admin panel access
   - Promote/demote
   - Password reset

6. **Monitor Error Logs**
   - Convex dashboard
   - Vercel dashboard
   - Check for any errors

7. **Verify Email Delivery**
   - Test verification emails
   - Test password reset emails
   - Test welcome emails (webhook)
   - Verify delivery within 1 minute

**Success Criteria:**
- [ ] Production deployment successful
- [ ] All critical flows working
- [ ] No errors in production logs
- [ ] Emails delivering within 1 minute
- [ ] All features working as expected

---

## Summary

### Automated Tasks (COMPLETED):
- ✅ USER-040: Audit existing users
- ✅ USER-041: Create migration script
- ✅ USER-042: Run migration script
- ✅ USER-044: Create test admin via script

### Manual Testing Required:
- ⏳ 13 manual testing tasks (USER-043, USER-045 to USER-056)
- ⏳ 2 deployment tasks (USER-057 to USER-058)

### Total Remaining:
**15 tasks** requiring manual execution via browser and deployment

---

## Quick Start Guide for Manual Testing

**For Quick Testing (Minimal Path):**

1. **Create Superadmin** (USER-043)
   - Signup: erik.supit@gmail.com
   - Verify role = "superadmin"

2. **Signup Admin** (USER-045)
   - Signup: makalah.app@gmail.com with password M4k4l4h2025
   - Verify role preserved as "admin"

3. **Create Test User** (USER-046)
   - Signup: posteriot@gmail.com
   - Verify role = "user"

4. **Test Promote/Demote** (USER-047, USER-048)
   - Login as superadmin
   - Promote posteriot@gmail.com → admin
   - Demote posteriot@gmail.com → user

5. **Test Permissions** (USER-050, USER-051, USER-052)
   - Verify admin cannot promote
   - Verify cannot modify superadmin
   - Verify user cannot access admin panel

**For Complete Testing:**
- Follow all tasks in order
- Check off each success criteria
- Document any issues found
- Report results

---

**Document Version:** 1.0
**Last Updated:** 2025-12-13
**Status:** Ready for manual testing execution
