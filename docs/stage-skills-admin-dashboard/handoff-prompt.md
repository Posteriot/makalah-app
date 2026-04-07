# Handoff Prompt: Stage Skills Admin — Delete History & Versions

## Context

Kamu bekerja di worktree branch `stage-skills-admin` (branched from `main` at `b2281fce`).
Working directory: `/Users/eriksupit/Desktop/makalahapp/.worktrees/stage-skills-admin`

Cek memory file `project_stage_skills_admin.md` untuk scope lengkap tugas ini.

## Scope

Menyempurnakan tab admin **"Stage Skills"** di `/dashboard` dengan menambah fitur **delete** untuk seluruh history dan version di masing-masing skills. Screenshot kondisi saat ini: `screenshots/Screen Shot 2026-04-07 at 19.30.16.png`

### Tujuan Bisnis
- Memudahkan admin mengupdate skills lama
- Membersihkan skills yang archive atau tidak digunakan di versi lama
- Mengurangi clutter di version history

## Current Architecture

### Database Tables (convex/schema.ts)
- **`stageSkills`** (lines 299-327): Master skill catalog, 1 per stage. Key fields: skillId, stageScope, isEnabled
- **`stageSkillVersions`** (lines 329-348): Version history with content snapshots. Status: draft | published | active | archived. Indexed by `by_skillRefId` and `by_skillRefId_status`
- **`stageSkillAuditLogs`** (lines 351-361): Audit trail. Indexed by `by_skillId_createdAt`

### Backend (convex/stageSkills.ts — 883 lines)
Existing mutations: createOrUpdateDraft, publishVersion, activateVersion, rollbackVersion, setSkillEnabled, archiveVersion. **No delete mutations exist yet.**

### Frontend Components
- **`src/components/admin/StageSkillsManager.tsx`** (256 lines): Main list view with Draft/History/Publish Draft/Activate/Disable buttons per skill
- **`src/components/admin/StageSkillFormDialog.tsx`** (390 lines): Create/edit skill drafts
- **`src/components/admin/StageSkillVersionHistoryDialog.tsx`** (191 lines): Version history dialog — this is where delete per-version UI should live

### Version Lifecycle
```
draft → published → active → archived
```
- Active versions should NOT be deletable (they're in use by paper sessions)
- Draft, published, and archived versions are candidates for deletion

## What Needs To Be Built

### 1. Convex Mutations (convex/stageSkills.ts)
- **`deleteVersion`**: Hard-delete a single version from `stageSkillVersions`. Guard: cannot delete active versions. Log to audit.
- **`deleteAllVersionHistory`**: Hard-delete ALL non-active versions for a skill. Guard: preserve active version. Log to audit.
- **`deleteSkillEntirely`** (optional): Delete skill + all versions + audit logs. Guard: skill must be disabled and have no active version. Only if admin wants full cleanup.

### 2. Frontend — Version History Dialog (StageSkillVersionHistoryDialog.tsx)
- Add delete button per version row (except active versions)
- Add "Delete All History" button to clear all non-active versions at once
- Confirmation dialog before any delete action

### 3. Frontend — Skills List (StageSkillsManager.tsx)
- Consider adding a delete/cleanup action per skill row for bulk operations

### 4. Audit Trail
- All deletes must be logged to `stageSkillAuditLogs` with action "delete_version" or "delete_all_versions"
- Log metadata should include: what was deleted, version numbers, reason

## Key Files to Read First
1. `convex/schema.ts` (lines 298-361) — data model
2. `convex/stageSkills.ts` — all existing backend logic
3. `src/components/admin/StageSkillsManager.tsx` — main admin UI
4. `src/components/admin/StageSkillVersionHistoryDialog.tsx` — version history UI
5. `screenshots/Screen Shot 2026-04-07 at 19.30.16.png` — current UI state

## Constraints
- Admin role required for all mutations (use existing `requireRole()` pattern)
- Never delete an active version — it's being used in live paper sessions
- All actions must have audit trail
- Follow existing code patterns in convex/stageSkills.ts
- UI should match existing dark theme and button patterns in the admin panel
