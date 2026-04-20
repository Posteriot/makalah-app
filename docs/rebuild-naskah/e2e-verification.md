# E2E VERIFICATION

---

## Task 11: End-to-End Verification

**Step 1: Full TypeScript check**

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors

**Step 2: Run ChatLayout test**

Run: `npx vitest run src/components/chat/layout/ChatLayout.sidebar-tree.test.tsx`
Expected: All tests pass

**Step 3: Verify Convex schema + generated types**

Run: `npx convex dev --once 2>&1 | tail -10`
Expected: Schema pushed, API types include naskah entries

**Step 4: Dev server smoke test**

Run `npm run dev` and verify:
1. Chat page loads without errors
2. TopBar shows "Pratinjau" button (muted when no naskah available)
3. Clicking Pratinjau opens `/naskah/:id` in new tab
4. Naskah page renders (empty state "Belum ada section..." is fine)
5. Approve/cancel/rewind still work correctly

---

## Execution Order Summary

```
FASE 1 — STANDALONE (zero risk)
  Task 1:  schema.ts          → 2 new tables (additive)
  Task 2:  src/lib/naskah/    → 8 new files (pure lib)
  Task 3:  convex/naskah*.ts  → 2 new files (backend)
  Task 4:  useNaskah.ts       → 1 new file (hook)
  Task 5:  components/naskah/ → 9 new files (UI)
  Task 6:  app/naskah/        → 4 new files (routes)
  Task 7:  next.config.ts     → 1 line additive
  ─── CHECKPOINT: typecheck + dev server ───

FASE 2 — SHARED FILES (controlled risk, one at a time)
  Task 8:  TopBar.tsx          → replace file (1 caller, optional props)
  Task 9:  ChatLayout.tsx      → add hooks + props + test mocks
  Task 10: paperSessions.ts    → 4x try-catch rebuild (LAST, highest risk)
  ─── E2E VERIFICATION ───

  Task 11: Full verification
```
