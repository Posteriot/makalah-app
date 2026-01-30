# BPP Credit System - Implementation Log

## 2026-01-30

### Task 1.1: Update Billing Constants - DONE

**Time:** ~15 minutes
**Commit:** `2f9d83d`
**Status:** Completed

**Changes Made:**
- Added credit system constants:
  - `TOKENS_PER_CREDIT = 1_000`
  - `PAPER_CREDITS = 300`
  - `PAPER_TOKENS = 300_000`
  - `PAPER_PRICE_IDR = 80_000`
  - `CREDIT_COST_IDR = 22.40`
- Added `CREDIT_PACKAGES` array with 3 packages:
  - Paper (300 kredit, Rp 80.000)
  - Extension S (50 kredit, Rp 25.000)
  - Extension M (100 kredit, Rp 50.000)
- Added helper functions:
  - `tokensToCredits()` - ceiling conversion
  - `creditsToTokens()` - direct multiplication
  - `getPackageByType()` - find package by type
  - `isValidPackageType()` - type guard
- Updated `TOKEN_PRICE_PER_1K_IDR` from 3 to 22.40 (actual Gemini 2.5 Flash pricing)
- Marked legacy constants as `@deprecated`
- Preserved `calculateCostIDR()` for usage.ts compatibility

**Verification:**
- TypeScript: PASS
- Lint: PASS
- Build: PASS

**Notes:**
- Backup created: `constants.ts.bak`
- File reorganized with clear section headers
- All existing helpers preserved

---

### Task 1.2: Update Schema - creditBalances Table - DONE

**Time:** ~10 minutes
**Commit:** `4c97ca9`
**Status:** Completed

**Changes Made:**
- Updated `creditBalances` table in `convex/schema.ts`:
  - Added new required fields: `totalCredits`, `usedCredits`, `remainingCredits`
  - Added lifetime stats: `totalPurchasedCredits`, `totalSpentCredits`
  - Added purchase tracking: `lastPurchaseAt`, `lastPurchaseType`, `lastPurchaseCredits`
  - Made legacy fields optional: `balanceIDR`, `balanceTokens`, `totalTopUpIDR`, `totalSpentIDR`
- Added minimal compatibility fix to `credits.ts`:
  - Added new required fields with default value 0 to insert calls
  - Added null coalescing (`?? 0`) for optional legacy field accesses

**Verification:**
- TypeScript: PASS
- Lint: PASS
- Build: PASS

**Notes:**
- Schema is backward compatible (legacy fields are optional)
- `credits.ts` will be fully rewritten in Task 2.1
- Current fix is minimal to ensure compilation

---

### Task 1.3: Update Schema - paperSessions Soft-Block Fields - DONE

**Time:** ~5 minutes
**Commit:** `031aa52`
**Status:** Completed

**Changes Made:**
- Added 5 new optional fields to `paperSessions` table:
  - `creditAllotted` - Kredit yang dialokasikan (default: 300)
  - `creditUsed` - Kredit yang sudah terpakai di session
  - `creditRemaining` - Sisa kredit session (computed)
  - `isSoftBlocked` - True jika kredit habis
  - `softBlockedAt` - Timestamp saat soft-blocked

**Verification:**
- TypeScript: PASS
- Lint: PASS
- Build: PASS

**Notes:**
- All fields optional (existing paper sessions unaffected)
- Fields added after `estimatedTokenUsage` section
- Will be used by `deductCredits` mutation in Task 2.1

---

### Task 1.4: Update Schema - payments Table - DONE

**Time:** ~5 minutes
**Commit:** `365baf8`
**Status:** Completed

**Changes Made:**
- Added 2 new optional fields to `payments` table:
  - `packageType` - Union: "paper" | "extension_s" | "extension_m"
  - `credits` - Number (300, 50, or 100)

**Verification:**
- TypeScript: PASS
- Lint: PASS
- Build: PASS

**Notes:**
- Both fields optional (existing payments unaffected)
- Fields added after `paymentType` field
- Will be used by webhook handler to add correct credits

---

### Task 1.5: Update Schema - pricingPlans Table - DONE

**Time:** ~5 minutes
**Commit:** `73bf3ba`
**Status:** Completed

**Changes Made:**
- Added `creditPackages` array field to `pricingPlans` table
- Field structure: type, credits, tokens, priceIDR, label, description, ratePerCredit, popular
- Marked `topupOptions` as `@deprecated`

**Verification:**
- TypeScript: PASS
- Lint: PASS
- Build: PASS

**Notes:**
- Deploy skipped - will batch deploy after Phase 1 complete
- `topupOptions` kept for backward compat
- `creditPackages` will be populated by migration in Task 2.4
