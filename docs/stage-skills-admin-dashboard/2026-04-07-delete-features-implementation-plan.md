# Implementation Plan: Stage Skills Admin — Delete Features

**Date:** 2026-04-07
**Design Doc:** `2026-04-07-delete-features-design.md`
**Branch:** `stage-skills-admin`
**Status:** Approved (Codex second pass clear, 2026-04-07)
**Reviewer:** Codex GPT 5.4

---

## Implementation Order

Tasks are ordered by dependency — backend first, then frontend. Each task is independently testable.

---

### Task 1: Backend — `deleteVersion` mutation

**File:** `convex/stageSkills.ts`

**What to implement:**
1. Add `deleteVersion` mutation after `archiveVersion` (line ~697)
2. Follow the exact guard order from design doc:
   - `requireRole(db, requestorUserId, "admin")`
   - Skill lookup via `getSkillBySkillId` → throw if not found
   - Validate `reason.trim()` non-empty → throw if empty
   - Version lookup via `getVersionByNumber` → throw if not found
   - Check `target.status !== "active"` → throw if active
3. Execute:
   - `db.delete(target._id)`
   - Count remaining versions: query `by_skillRefId` index, collect, get length
   - Find active version number (if any) from remaining
   - `db.patch(skill._id, { updatedAt: Date.now() })`
4. Audit log via `appendAuditLog`:
   - action: `"delete_version"`
   - metadata: `{ deletedVersion, deletedStatus, reason, remainingVersions, activeVersion }`
5. Return: `{ skillId, deletedVersion, deletedStatus, remainingVersions, activeVersion, message }`

**Error messages (exact):**
- `"Skill tidak ditemukan."`
- `"Alasan penghapusan wajib diisi."`
- `` `Versi ${args.version} tidak ditemukan.` ``
- `"Versi active tidak boleh dihapus."`

**Verify:** Convex typecheck passes (`npx convex dev` or `npx convex typecheck`)

---

### Task 2: Backend — `deleteAllVersionHistory` mutation

**File:** `convex/stageSkills.ts`

**What to implement:**
1. Add `deleteAllVersionHistory` mutation after `deleteVersion`
2. Guards:
   - `requireRole(db, requestorUserId, "admin")`
   - Skill lookup → throw if not found
   - Validate `reason.trim()` non-empty → throw if empty
3. Execute:
   - Query all versions via `by_skillRefId` index
   - Split into `deletable` (status !== "active") and `active` (status === "active")
   - Delete all deletable: `for (const v of deletable) await db.delete(v._id)`
   - `db.patch(skill._id, { updatedAt: Date.now() })`
4. Audit log:
   - action: `"delete_all_versions"`
   - metadata: `{ deletedVersions, deletedStatuses, deletedCount, preservedActiveVersion, reason }`
5. Return: `{ skillId, deletedVersions, deletedCount, preservedActiveVersion, message }`
6. Message logic:
   - `deletedCount > 0` → `` `Berhasil menghapus ${deletedCount} version history.` ``
   - `deletedCount === 0` → `"Tidak ada version history non-active yang bisa dihapus."`

**Verify:** Convex typecheck passes

---

### Task 3: Backend — `deleteSkillEntirely` mutation

**File:** `convex/stageSkills.ts`

**What to implement:**
1. Add `deleteSkillEntirely` mutation after `deleteAllVersionHistory`
2. Guards (exact order):
   - `requireRole(db, requestorUserId, "admin")`
   - Skill lookup → throw if not found
   - Validate `reason.trim()` non-empty
   - Validate `confirmationText === \`DELETE ${skill.skillId}\`` → throw with instructional message
   - Check `skill.isEnabled === false` → `"Skill harus dinonaktifkan sebelum dihapus."`
   - Check no active version exists → `"Skill dengan active version tidak boleh dihapus."`
3. Execute (exact order):
   a. Collect all versions for this skill
   b. Delete all version rows
   c. Collect all audit logs with matching `skillRefId` → patch each to set `skillRefId: undefined`
   d. Insert terminal audit log: action `"delete_skill"`, with full metadata. **Critical: pass `skillRefId: undefined`** (not `skill._id`) — the master row is about to be deleted, so writing `skill._id` here would create a dangling reference.
   e. Delete the stageSkills master row: `db.delete(skill._id)`
4. Return: `{ deletedSkillId, deletedStageScope, deletedVersionNumbers, deletedVersionCount, message }`

**Audit log query for patching:**
- Use `by_skillId_createdAt` index to find logs by `skillId`, then filter by `skillRefId` match
- Iterate and patch each row where `skillRefId === skill._id` to set `skillRefId: undefined`
- The terminal `delete_skill` audit log must be inserted with `skillRefId: undefined` explicitly — do NOT use `appendAuditLog` with `skill._id` since the row will be deleted immediately after

**Verify:** Convex typecheck passes

---

### Task 4: Frontend — Delete per-version in `StageSkillVersionHistoryDialog.tsx`

**File:** `src/components/admin/StageSkillVersionHistoryDialog.tsx`

**What to implement:**
1. Import: `AlertDialog*` components, `Trash` icon from `iconoir-react`, `deleteVersion` mutation
2. Add state: `deleteTarget` (version object or null), `deleteReason` (string), `isDeleting` (boolean)
3. Per version row — add Trash button:
   - **Only render** when `version.status !== "active"` (not disabled — not rendered at all)
   - onClick: set `deleteTarget` to this version
4. Add `AlertDialog` for delete confirmation:
   - Title: `"Hapus version ini?"`
   - Description with version number and permanence warning
   - Show status badge of version being deleted
   - Reason `<Input>` — required, with placeholder
   - Confirm button: `` `Hapus v${deleteTarget.version}` ``, destructive, disabled until `deleteReason.trim()` is non-empty
   - Cancel: reset state
5. handleDeleteVersion:
   - Call `deleteVersion` mutation with `{ requestorUserId, skillId, version, reason }`
   - On success: toast with result message, reset delete state
   - On error: toast error
6. Style: follow `StyleConstitutionVersionHistoryDialog.tsx` pattern — `text-destructive hover:text-destructive` for Trash button

**Verify:** Dialog opens, reason required, delete succeeds for non-active, version disappears from list

---

### Task 5: Frontend — Delete All History in `StageSkillVersionHistoryDialog.tsx`

**File:** `src/components/admin/StageSkillVersionHistoryDialog.tsx`

**What to implement:**
1. Import `deleteAllVersionHistory` mutation
2. Add state: `showDeleteAll` (boolean), `deleteAllReason` (string)
3. Add "Hapus Semua History" button near dialog header or footer:
   - Destructive variant
   - Disabled when `isDeleting` or no non-active versions exist
4. Add `AlertDialog` for bulk delete confirmation:
   - Title: `"Hapus semua version history non-active?"`
   - Description with permanence warning
   - Summary: count of versions to delete + preserved active version info
   - Reason input required
   - Confirm: `"Hapus Semua History"` (destructive), disabled until reason filled
5. handleDeleteAllHistory:
   - Call `deleteAllVersionHistory` mutation
   - Toast with actual result (count deleted or "nothing to delete")
   - Reset state

**Verify:** Button appears, confirmation shows correct counts, active version preserved after delete

---

### Task 6: Frontend — Delete Skill Entirely in `StageSkillsManager.tsx`

**File:** `src/components/admin/StageSkillsManager.tsx`

**What to implement:**
1. Import: `AlertDialog*` components, `Trash` icon, `deleteSkillEntirely` mutation
2. Add state: `deleteSkillTarget` (skill object or null), `deleteSkillReason`, `deleteSkillConfirmation`, `isDeletingSkill`
3. Per skill row — add Delete Skill button:
   - Destructive variant, positioned after Enable/Disable button
   - **Disabled** when `skill.isEnabled || skill.activeVersion !== null`
   - When disabled, show inline helper text (small `<p>` below or beside button) explaining why — NOT tooltip, since disabled native buttons don't trigger hover events
   - onClick: set `deleteSkillTarget`
4. Add `AlertDialog`:
   - Title: `"Hapus skill sepenuhnya?"`
   - Description with skill name, permanence warning, audit log preservation note
   - Guard warnings displayed (disabled requirement, no active version)
   - Reason input: required
   - Confirmation input: label `` `Ketik "DELETE ${skillId}" untuk mengaktifkan tombol hapus.` ``
   - Confirm button: `"Delete Skill Entirely"` (destructive), disabled until reason filled AND confirmation matches `` `DELETE ${skillId}` ``
   - Cancel: reset state
5. handleDeleteSkillEntirely:
   - Call mutation
   - Toast success with result
   - Reset state, skill disappears from list via Convex reactivity

**Verify:** Button disabled when skill enabled or has active version, confirmation text validation works, skill removed from list after delete

---

### Task 7: Test coverage

**File:** `convex/stageSkills.test.ts` (extend existing)

**Prerequisite — upgrade mock DB harness:**
The existing `createMockDb()` in `convex/stageSkills.test.ts` only implements `insert`, `patch`, `get`, and `query`. The new delete mutations require `db.delete()`. Add the following to `createMockDb()`:
```typescript
async delete(id: string) {
  const target = byId.get(id);
  if (!target) throw new Error(`record ${id} not found`);
  const rows = tables.get(target.table)!;
  const idx = rows.indexOf(target.record);
  if (idx >= 0) rows.splice(idx, 1);
  byId.delete(id);
},
```
This must be done before any delete test can run. Also import `deleteVersion`, `deleteAllVersionHistory`, `deleteSkillEntirely` from `./stageSkills` and `setSkillEnabled` if not already imported.

**What to test:**
1. `deleteVersion` success for draft, published, archived
2. `deleteVersion` rejection for active version
3. `deleteVersion` rejection for empty reason
4. `deleteAllVersionHistory` preserves active version
5. `deleteAllVersionHistory` no-op when no non-active versions (deletedCount: 0)
6. `deleteAllVersionHistory` rejection for empty reason
7. `deleteSkillEntirely` rejection when `isEnabled === true`
8. `deleteSkillEntirely` rejection when active version exists
9. `deleteSkillEntirely` rejection when confirmation text wrong
10. `deleteSkillEntirely` success: skill + versions deleted, audit logs preserved
11. Audit log actions and metadata shape for all 3 mutations

**Note:** Existing test harness uses `createMockDb()` + `callMutation()` pattern with vitest. All new tests must follow this pattern. The `db.delete()` upgrade to the mock is a hard prerequisite — without it, none of these tests can execute.

---

## File Change Summary

| File | Change Type | Lines Est. |
|------|-------------|-----------|
| `convex/stageSkills.ts` | Edit — add 3 mutations | ~180 |
| `src/components/admin/StageSkillVersionHistoryDialog.tsx` | Edit — add delete UI + 2 AlertDialogs | ~150 |
| `src/components/admin/StageSkillsManager.tsx` | Edit — add delete skill UI + AlertDialog | ~100 |
| `convex/stageSkills.test.ts` | Edit — add `db.delete()` to mock + delete tests | ~150 |

**Total estimated new code:** ~530 lines

---

## Dependency Graph

```
Task 1 (deleteVersion)
  └─→ Task 4 (UI per-version delete)

Task 2 (deleteAllVersionHistory)
  └─→ Task 5 (UI delete all history)

Task 3 (deleteSkillEntirely)
  └─→ Task 6 (UI delete skill entirely)

Tasks 1-3 are logically independent but write to the same file (`convex/stageSkills.ts`), so they must be implemented sequentially to avoid merge conflicts.
Tasks 4-6 depend on their respective backend task.
Task 7 depends on Tasks 1-3.
```

---

## Verification Checklist (post-implementation)

- [ ] `npx convex typecheck` passes
- [ ] All 3 mutations enforce `requireRole(..., "admin")`
- [ ] Active version never deleted in any code path
- [ ] Audit logs written for all destructive actions
- [ ] `deleteSkillEntirely` preserves audit logs and patches `skillRefId`
- [ ] UI: Trash button NOT rendered for active versions
- [ ] UI: Delete Skill button disabled for enabled skills / skills with active version
- [ ] UI: All confirmation dialogs require reason input
- [ ] UI: Delete Skill confirmation requires exact `DELETE ${skillId}` text
- [ ] UI: Toast messages reflect actual operation result
- [ ] Convex reactive queries auto-refresh after mutations (no manual reload)
