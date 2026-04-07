# Design Doc: Stage Skills Admin — Delete Features

**Date:** 2026-04-07
**Branch:** `stage-skills-admin` (from main@b2281fce)
**Status:** Approved (Codex second pass clear, 2026-04-07)
**Reviewer:** Codex GPT 5.4

---

## 1. Problem Statement

Admin Stage Skills tab di `/dashboard` hanya mendukung lifecycle `draft → published → active → archived`. Tidak ada kemampuan hard-delete untuk:
- Version lama yang sudah obsolete (draft duplikat, archived yang clutter)
- Skill catalog yang sudah deprecated dan tidak digunakan

Admin membutuhkan guarded destructive actions untuk full cleanup.

## 2. Scope

### In Scope
- `deleteVersion` — hapus satu non-active version
- `deleteAllVersionHistory` — hapus semua non-active versions, preserve active
- `deleteSkillEntirely` — hapus skill catalog + semua versions, preserve audit logs
- UI delete buttons + confirmation dialogs di `StageSkillVersionHistoryDialog` dan `StageSkillsManager`
- Audit trail untuk semua destructive actions

### Out of Scope (YAGNI)
- Soft delete / trash / undo
- Batch delete across multiple skills
- Archive-then-delete workflow (archive sudah ada sebagai fitur terpisah)

## 3. Data Model Impact

### No Schema Changes Required
- `stageSkillVersions` rows: hard-deleted via `db.delete()`
- `stageSkills` rows: hard-deleted via `db.delete()` (deleteSkillEntirely only)
- `stageSkillAuditLogs`: **preserved** — `skillRefId` is already `v.optional(v.id("stageSkills"))`, so dangling refs are handled by patching to `undefined` before master row deletion

### Audit Log Actions (new)
| Action | Mutation | Description |
|--------|----------|-------------|
| `delete_version` | deleteVersion | Single version deleted |
| `delete_all_versions` | deleteAllVersionHistory | Bulk non-active versions deleted |
| `delete_skill` | deleteSkillEntirely | Terminal: skill + versions deleted |

## 4. Backend Mutations

### 4.1 `deleteVersion`

```typescript
export const deleteVersion = mutation({
  args: {
    requestorUserId: v.id("users"),
    skillId: v.string(),
    version: v.number(),
    reason: v.string(),
  },
  handler: async ({ db }, args) => {
    // Guards: admin, skill exists, version exists, reason non-empty, status !== "active"
    // Action: db.delete(version._id), patch stageSkills.updatedAt
    // Audit: action "delete_version"
    return {
      skillId: string,
      deletedVersion: number,
      deletedStatus: "draft" | "published" | "archived",
      remainingVersions: number,
      activeVersion: number | null,
      message: string,
    }
  },
})
```

**Guards:**
1. `requireRole(db, requestorUserId, "admin")`
2. Skill must exist → `"Skill tidak ditemukan."`
3. Reason must be non-empty → `"Alasan penghapusan wajib diisi."`
4. Version must exist → `` `Versi ${args.version} tidak ditemukan.` ``
5. Version status must not be `"active"` → `"Versi active tidak boleh dihapus."`

**Audit metadata:**
```json
{
  "deletedVersion": 3,
  "deletedStatus": "archived",
  "reason": "draft duplikat",
  "remainingVersions": 5,
  "activeVersion": 2
}
```

### 4.2 `deleteAllVersionHistory`

```typescript
export const deleteAllVersionHistory = mutation({
  args: {
    requestorUserId: v.id("users"),
    skillId: v.string(),
    reason: v.string(),
  },
  handler: async ({ db }, args) => {
    // Guards: admin, skill exists, reason non-empty
    // Action: delete all non-active versions, preserve active
    // No-op success if deletedCount === 0
    return {
      skillId: string,
      deletedVersions: number[],
      deletedCount: number,
      preservedActiveVersion: number | null,
      message: string,
    }
  },
})
```

**Guards:**
1. `requireRole(db, requestorUserId, "admin")`
2. Skill must exist → `"Skill tidak ditemukan."`
3. Reason must be non-empty → `"Alasan penghapusan wajib diisi."`

**Behavior:**
- Delete all versions where `status !== "active"`
- If active version exists, preserve it
- If nothing to delete → success no-op with `deletedCount: 0`

**Messages:**
- `deletedCount > 0` → `` `Berhasil menghapus ${deletedCount} version history.` ``
- `deletedCount === 0` → `"Tidak ada version history non-active yang bisa dihapus."`

**Audit metadata:**
```json
{
  "deletedVersions": [1, 3, 4],
  "deletedStatuses": [
    { "version": 1, "status": "published" },
    { "version": 3, "status": "draft" },
    { "version": 4, "status": "archived" }
  ],
  "deletedCount": 3,
  "preservedActiveVersion": 2,
  "reason": "cleanup history"
}
```

### 4.3 `deleteSkillEntirely`

```typescript
export const deleteSkillEntirely = mutation({
  args: {
    requestorUserId: v.id("users"),
    skillId: v.string(),
    reason: v.string(),
    confirmationText: v.string(),
  },
  handler: async ({ db }, args) => {
    // Guards: admin, skill exists, reason non-empty, confirmation match,
    //         skill disabled, no active version
    // Action: delete all versions, patch audit log skillRefIds,
    //         insert terminal audit log, delete skill row
    return {
      deletedSkillId: string,
      deletedStageScope: string,
      deletedVersionNumbers: number[],
      deletedVersionCount: number,
      message: string,
    }
  },
})
```

**Guards (ordered):**
1. `requireRole(db, requestorUserId, "admin")`
2. Skill must exist → `"Skill tidak ditemukan."`
3. Reason must be non-empty → `"Alasan penghapusan wajib diisi."`
4. Confirmation text must match → `` `Ketik "DELETE ${args.skillId}" untuk konfirmasi penghapusan skill.` ``
5. Skill must be disabled → `"Skill harus dinonaktifkan sebelum dihapus."`
6. No active version → `"Skill dengan active version tidak boleh dihapus."`

**Execution order:**
1. Collect all versions for the skill
2. Delete all version rows
3. Patch all audit log rows for this skill: set `skillRefId` to `undefined`
4. Insert terminal audit log with action `"delete_skill"` — **must use `skillRefId: undefined`** (not `skill._id`) to avoid dangling reference since master row will be deleted next
5. Delete the stageSkills master row

**Audit metadata:**
```json
{
  "deletedSkillId": "gagasan-skill",
  "stageScope": "gagasan",
  "deletedVersionNumbers": [1, 2, 3],
  "deletedVersionStatuses": [
    { "version": 1, "status": "published" },
    { "version": 2, "status": "archived" },
    { "version": 3, "status": "draft" }
  ],
  "deletedVersionCount": 3,
  "reason": "skill deprecated",
  "deletedBy": "<requestorUserId>"
}
```

## 5. Frontend Changes

### 5.1 StageSkillVersionHistoryDialog.tsx

**New elements:**
- **Per-version delete button**: Trash icon, only rendered for non-active versions (CTA not shown at all for active). Uses `AlertDialog` with reason input field.
- **Delete All History button**: In dialog header/footer area. Opens `AlertDialog` with summary of what will be deleted + reason field.

**Confirmation dialog — per-version:**
- Title: `"Hapus version ini?"`
- Description: `` `Version v${version} akan dihapus permanen dari riwayat skill. Aksi ini tidak bisa dibatalkan.` ``
- Shows current status badge
- Reason input: required, placeholder `"Contoh: draft duplikat, versi obsolete, cleanup history"`
- Confirm button: `` `Hapus v${version}` `` (destructive variant), disabled until reason filled
- Cancel button: `"Batal"`

**Confirmation dialog — delete all:**
- Title: `"Hapus semua version history non-active?"`
- Description: `"Semua version dengan status draft, published, dan archived akan dihapus permanen. Version active, jika ada, akan tetap dipertahankan."`
- Summary block: count to delete + preserved active version
- Reason input: required, placeholder `"Contoh: menyisakan active version saja untuk mengurangi clutter"`
- Confirm button: `"Hapus Semua History"` (destructive variant), disabled until reason filled
- Cancel button: `"Batal"`

### 5.2 StageSkillsManager.tsx

**New element:**
- **Delete Skill Entirely button**: Per skill row, destructive variant. Only enabled when `!skill.isEnabled && skill.activeVersion === null`. Source of truth for eligibility is backend guard.

**Confirmation dialog:**
- Title: `"Hapus skill sepenuhnya?"`
- Description: `` `Skill "${skillId}" beserta seluruh version-nya akan dihapus permanen dari katalog admin. Audit log tetap dipertahankan. Aksi ini tidak bisa dibatalkan.` ``
- Guard warnings displayed: skill harus disabled, tidak boleh punya active version
- Reason input: required
- Confirmation input: `` `Ketik "DELETE ${skillId}" untuk mengaktifkan tombol hapus.` ``
- Confirm button: `"Delete Skill Entirely"` (destructive variant), disabled until reason filled AND confirmation text matches
- Cancel button: `"Batal"`

### 5.3 UI Design Rules
- Delete CTA for active version: **not rendered** (not just disabled)
- Delete Skill button: rendered but **disabled** when conditions not met, with inline helper text below the button row explaining why (not tooltip — disabled buttons don't trigger hover events)
- All destructive buttons use `variant="destructive"` or `text-destructive` styling
- Successful delete → close modal → toast with actual result count
- Convex reactive queries auto-refresh lists after mutation

## 6. Existing Patterns Referenced

| Pattern | Source File | What We Reuse |
|---------|------------|---------------|
| AlertDialog confirmation | `StyleConstitutionVersionHistoryDialog.tsx` | Trash icon, delete state, AlertDialog structure |
| Guard pattern | `archiveVersion` in `stageSkills.ts` | requireRole, skill lookup, version lookup, status guard |
| Audit logging | `appendAuditLog` helper in `stageSkills.ts` | Same helper, same metadata structure |
| Icon | `Trash` from `iconoir-react` | Already used in codebase |

## 7. Non-Goals / Hard Guards

- No soft delete for versions or skills
- No deleting active versions in any form
- No deleting enabled skills
- No deleting skills with active versions
- No destructive actions without audit record
- No destructive CTA without confirmation modal
- Audit logs are NEVER deleted (even on deleteSkillEntirely)
