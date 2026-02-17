W8 Final Design: AI Ops Dashboard — Halaman Terpisah                                                                                                                                                      
                                                                                                                                                                                                            
  Arsitektur                                                                                                                                                                                                
                                                                                                                                                                                                            
  Route:          /ai-ops (protected: admin/superadmin only)                                                                                                                                                
  Layout:         Full-width, tanpa sidebar admin                                                                                                                                                           
  Components:     src/components/ai-ops/                                                                                                                                                                    
  Page:           src/app/(dashboard)/ai-ops/page.tsx
  Access points:  1) User dropdown menu (admin/superadmin)
                  2) Quick link di Admin Panel overview

  Struktur File

  src/app/(dashboard)/ai-ops/
  └── page.tsx                          # Route entry point

  src/components/ai-ops/
  ├── AiOpsContainer.tsx                # Main container + layout
  ├── AiOpsOverview.tsx                 # Level 1: Agregat panels
  ├── MemoryHealthPanel.tsx             # Digest stats, dirty sessions
  ├── ContextBudgetPanel.tsx            # Token usage, pruning events
  ├── AntiHallucinationPanel.tsx        # Referensi validation stats
  ├── ArtifactSyncPanel.tsx             # Invalidation, orphan tracking
  ├── WorkflowProgressPanel.tsx         # Stage distribution, completion rate
  ├── SessionDrillDown.tsx              # Level 2: Per-session detail
  ├── SessionTimeline.tsx               # 13-stage visual timeline
  ├── SessionDigestViewer.tsx           # Memory digest entries viewer
  ├── SessionContextChart.tsx           # Context size over time
  ├── SessionStageInspector.tsx         # Stage data detail
  └── SessionRewindHistory.tsx          # Rewind audit trail

  Navigation Touchpoints

  1. User Dropdown (header): Menu item "AI Ops" — hanya muncul untuk admin/superadmin
  2. Admin Panel Overview: Card/link "AI Ops Dashboard →" di AdminOverviewContent
  3. Back navigation: Header AI Ops punya link kembali ke Admin Panel

  Layout

  ┌─────────────────────────────────────────────────────┐
  │  ← Admin Panel    AI OPS DASHBOARD     [user menu]  │  Header
  ├─────────────────────────────────────────────────────┤
  │                                                      │
  │  [Memory Health] [Context Budget] [Anti-Hallucin.]  │  Level 1:
  │  [Artifact Sync] [Workflow Progress]                 │  5 summary panels
  │                                                      │
  ├─────────────────────────────────────────────────────┤
  │  Active Paper Sessions                    [filter]   │
  │  ┌─────────────────────────────────────────────┐    │
  │  │ Session #1 | User X | Stage: metodologi     │←── │  Session list
  │  │ Session #2 | User Y | Stage: diskusi        │    │  (clickable)
  │  └─────────────────────────────────────────────┘    │
  │                                                      │
  ├─────────────────────────────────────────────────────┤
  │  SESSION DRILL-DOWN (expanded)                       │
  │  ┌──────────┬──────────┬──────────┐                 │  Level 2:
  │  │ Timeline │ Digest   │ Context  │                 │  Tabbed detail
  │  │          │ Viewer   │ Chart    │                 │  per session
  │  └──────────┴──────────┴──────────┘                 │
  └─────────────────────────────────────────────────────┘