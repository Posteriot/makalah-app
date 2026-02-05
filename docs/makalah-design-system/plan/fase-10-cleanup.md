# FASE 10: Cleanup & Verification - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ⏳ Pending
> **Total Tasks**: 5
> **Prerequisite**: FASE 9 (Admin) completed

**Goal:** Finalisasi migrasi dengan menghapus dependencies lama, membersihkan backup files, dan melakukan visual audit menyeluruh.

**Architecture:**
- Remove lucide-react package completely
- Delete legacy backups setelah verifikasi stable
- Full visual audit semua halaman dan breakpoints
- Update documentation

**Tech Stack:** N/A (cleanup phase)

---

## Reference Documents

### Design System Specs (docs/)
All documents for final verification checklist.

### Files to Clean
| Action | Target |
|--------|--------|
| Uninstall | `lucide-react` package |
| Delete | `src/styles/legacy/globals.legacy.css` |
| Delete | `src/styles/legacy/tailwind.config.legacy.ts` |
| Delete | `src/styles/legacy/` directory |
| Update | `CLAUDE.md` if needed |
| Update | `README.md` if needed |

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Removed lucide-react | `package.json` |
| Deleted legacy backups | `src/styles/legacy/` removed |
| Visual audit report | `docs/makalah-design-system/implementation/report/fase-10-visual-audit.md` |
| Updated documentation | Various |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-10-task-*.md` |

---

## Tasks

### Task 10.1: Final Lucide Import Audit

**Step 1: Search for any remaining lucide-react imports**

```bash
grep -r "lucide-react" src/
grep -r "from 'lucide-react'" src/
grep -r 'from "lucide-react"' src/
```

**Step 2: Document any remaining usages**

If any imports found, they were missed in previous phases. Document and fix.

**Step 3: Search for Lucide type references**

```bash
grep -r "LucideIcon" src/
grep -r "LucideProps" src/
```

**Step 4: Fix any remaining issues**

Replace with Iconoir equivalents.

**Step 5: Verify no lucide imports remain**

Re-run search to confirm clean.

**Step 6: Update progress.md & write report**

**Step 7: Commit (if fixes needed)**

```bash
git add src/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(cleanup): fix remaining lucide-react imports"
```

---

### Task 10.2: Remove lucide-react Package

**Step 1: Verify build still works**

```bash
npm run build
```

Must pass before removing package.

**Step 2: Uninstall lucide-react**

```bash
npm uninstall lucide-react
```

**Step 3: Verify build still works after removal**

```bash
npm run build
```

Must pass. If fails, there are still imports somewhere.

**Step 4: Verify dev server works**

```bash
npm run dev
```

Test manually that app loads.

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add package.json package-lock.json
git add docs/makalah-design-system/implementation/
git commit -m "refactor(cleanup): remove lucide-react package"
```

---

### Task 10.3: Delete Legacy Backups

**Step 1: Verify app is stable**

Run thorough manual testing first.

**Step 2: Delete legacy backup files**

```bash
rm -rf src/styles/legacy/
```

**Step 3: Verify build still works**

```bash
npm run build
```

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(cleanup): delete legacy CSS backups"
```

---

### Task 10.4: Full Visual Audit

**Step 1: Create audit checklist**

Create `docs/makalah-design-system/implementation/report/fase-10-visual-audit.md` with checklist below.

**Step 2: Test all pages at Desktop breakpoint (1440px)**

| Page | Status | Issues |
|------|--------|--------|
| Home (/) | | |
| Pricing | | |
| About | | |
| Blog | | |
| Documentation | | |
| Sign In | | |
| Sign Up | | |
| Get Started | | |
| Checkout BPP | | |
| Checkout Pro | | |
| Dashboard | | |
| Subscription Overview | | |
| Subscription Plans | | |
| Subscription History | | |
| TopUp Success/Failed | | |
| User Settings Modal | | |
| Chat (empty) | | |
| Chat (with messages) | | |
| Chat (with artifacts) | | |
| Admin Panel | | |

**Step 3: Test all pages at Tablet breakpoint (768px)**

Repeat checklist.

**Step 4: Test all pages at Mobile breakpoint (375px)**

Repeat checklist.

**Step 5: Test dark mode on all pages**

Toggle theme and verify styling.

**Step 6: Document any issues found**

If issues found, create tasks to fix.

**Step 7: Update progress.md & write report**

---

### Task 10.5: Final Verification & Documentation Update

**Step 1: Run final verification checklist**

**Mechanical Grace Compliance:**
- [ ] Tidak ada `rounded` selain skala standar (0/2/4/6/8/12/16/24/32/full)
- [ ] Semua ikon menggunakan Iconoir
- [ ] Angka & harga menggunakan Geist Mono
- [ ] Header/Footer tidak muncul di Chat
- [ ] Tidak ada hardcoded hex colors
- [ ] Border hairline (0.5px) used correctly
- [ ] Active states use Amber indicator
- [ ] AI elements use Sky/dashed styling

**Step 2: Update CLAUDE.md if needed**

Add any new patterns or conventions discovered during migration.

**Step 3: Update README.md if needed**

Update if there are new setup instructions.

**Step 4: Update MASTER-PLAN.md progress tracker**

Mark all phases as complete with dates.

**Step 5: Update progress.md**

Mark FASE 10 and entire migration as complete.

**Step 6: Create final summary report**

Create `docs/makalah-design-system/implementation/report/migration-complete.md`:

```markdown
# Mechanical Grace Migration - Complete

> **Completed**: [DATE]
> **Duration**: [START_DATE] to [END_DATE]

## Summary

Successfully migrated Makalah App to Mechanical Grace design system.

### Phases Completed

| Phase | Completed |
|-------|-----------|
| FASE 0 - Foundation | [DATE] |
| FASE 1 - Global Shell | [DATE] |
| FASE 2 - Marketing | [DATE] |
| FASE 3 - Auth & Onboarding | [DATE] |
| FASE 4 - Dashboard | [DATE] |
| FASE 5 - Chat Shell | [DATE] |
| FASE 6 - Chat Interaction | [DATE] |
| FASE 7 - Chat Artifacts | [DATE] |
| FASE 8 - Chat Tools | [DATE] |
| FASE 9 - Admin | [DATE] |
| FASE 10 - Cleanup | [DATE] |

### Key Changes

- Replaced lucide-react with iconoir-react
- Implemented Makalah-Carbon color tokens (OKLCH)
- Applied Hybrid Radius system (Shell 16px, Action 8px)
- Implemented Geist Mono for all data/metadata
- Added industrial textures and patterns
- Implemented AI identity (Sky/dashed borders)

### Files Changed

[Summary of major file changes]

### Lessons Learned

[Any insights for future maintenance]
```

**Step 7: Final commit**

```bash
git add -A
git commit -m "refactor(migration): complete Mechanical Grace migration"
```

---

## Final Verification Checklist

### Package.json
- [ ] `lucide-react` removed from dependencies
- [ ] `iconoir-react` present in dependencies

### File System
- [ ] `src/styles/legacy/` directory deleted
- [ ] No `.legacy.` files remaining

### Code Quality
- [ ] No lucide imports in codebase
- [ ] No hardcoded hex colors
- [ ] No non-standard radius values
- [ ] All data in Mono font

### Visual Consistency
- [ ] All pages render correctly
- [ ] All breakpoints tested
- [ ] Dark mode works
- [ ] No visual regressions

### Documentation
- [ ] MASTER-PLAN.md updated
- [ ] progress.md complete
- [ ] All task reports written
- [ ] CLAUDE.md updated if needed

---

## Rollback Note

Setelah FASE 10 selesai dan legacy backups dihapus, rollback harus dilakukan via git revert. Pastikan semua commits terorganisir dengan baik untuk memudahkan rollback jika diperlukan.

---

## Migration Complete

Selamat! Migrasi Mechanical Grace telah selesai.

Update MASTER-PLAN.md:

```markdown
| 10 - Cleanup | ✅ Done | [DATE] | [DATE] |
```

---

## Post-Migration

Setelah migrasi selesai, tim dapat:

1. **Maintain consistency** - Gunakan utility classes yang sudah didefinisikan
2. **Reference docs** - Selalu cek design system docs sebelum styling baru
3. **Component library** - Pertimbangkan membuat Storybook untuk komponen standar
4. **Design tokens** - Token sudah tersentralisasi di globals.css
