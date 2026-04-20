## Audit Fixes Summary

| ID | Type | Location | Fix |
|----|------|----------|-----|
| B1 | BLOCKER | ChatLayout.tsx, NaskahShell.tsx, naskah page.tsx | Replace `/^[a-z0-9]{32}$/` with `conversationId.length > 0` |
| B2 | BLOCKER | ChatLayout.sidebar-tree.test.tsx | Add mocks for `usePaperSession` and `useNaskah` |
| B3 | BLOCKER | paperSessions.ts (4 call sites) | Wrap `rebuildNaskahSnapshot` in try-catch — preview failure must not block core workflows |
| R1 | RISK | paperSessions.ts:980 (unapproveStage) | No orphaned comment — insert fresh |
| R2 | RISK | All verbatim restore tasks | Added explicit `git show` commands |
