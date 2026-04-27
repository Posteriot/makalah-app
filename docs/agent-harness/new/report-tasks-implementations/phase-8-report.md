PHASE 8 — PAUSE/RESUME INFRASTRUCTURE                                         
  
  Status: ✅ COMPLETE                                                           
  Branch: agent-harness                                     
  HEAD: 722faed9                                                                
  Range: 07eacc96..722faed9                                 
                                                                                
  ---
  Eksekutif Summary                                                             
                                                            
  Phase 8 establishes durable pause/resume primitives: new harnessDecisions    
  Convex table matching research doc DecisionState contract, pauseRun/resumeRun 
  mutations, adapter composed methods, orchestrator resume detection via
  x-harness-resume header, UI wiring ke validation panel.                       
                                                            
  Scope decision (Q1=C): Infrastructure only. NO enforcer sets                  
  requiresApproval=true di Phase 8 — pause seam latent. Siap triggered kapanpun
  future enforcer butuh pause.                                                  
                                                            
  5 commits, 16 files (+1804/-48 lines). Zero behavior change. 219/219 tests    
  pass. Production build clean.
                                                                                
  ---                                                       
  Pre-Verify Decision Frame (User-Approved)                                    
                                                                                
  Reviewer pre-verify nemu 5 BLOCKERS di terse 50-line original spec. Lo putusin
   6 design decisions:                                                          
                                                            
  ┌─────┬─────────────────────┬─────────────────────────────────────────────┐   
  │  Q  │        Topic        │                  Decision                   │
  ├─────┼─────────────────────┼─────────────────────────────────────────────┤   
  │ Q1  │ requiresApproval    │ C — leave latent. Phase 8 implement         │
  │     │ trigger             │ infrastructure only                         │   
  ├─────┼─────────────────────┼─────────────────────────────────────────────┤   
  │ Q2  │ Decision table      │ A — new harnessDecisions Convex table per   │  
  │     │ design              │ research DecisionState (lines 838-862)      │   
  ├─────┼─────────────────────┼─────────────────────────────────────────────┤
  │     │                     │ A — NEW POST /api/chat dengan               │   
  │ Q3  │ Resume mechanics    │ x-harness-resume header. Orchestrator skip  │   
  │     │                     │ step 2 only                                 │  
  ├─────┼─────────────────────┼─────────────────────────────────────────────┤   
  │     │                     │ ADDITION — resumeRun BEFORE approveStage    │
  │ Q4  │ UI wiring pattern   │ (not replacement). Paper workflow tetap     │   
  │     │                     │ orthogonal                                  │
  ├─────┼─────────────────────┼─────────────────────────────────────────────┤   
  │ Q5  │ Event emission      │ YES — emit run_paused + run_resumed         │
  │     │                     │ (canonical 29 events dari Phase 6 registry) │   
  ├─────┼─────────────────────┼─────────────────────────────────────────────┤
  │ Q6  │ Step lifecycle      │ No active step — Phase 7 pause seam (step   │   
  │     │ during pause        │ 8.5) runs BEFORE buildStepStream            │   
  └─────┴─────────────────────┴─────────────────────────────────────────────┘  
                                                                                
  ---                                                                           
  Per-Task Status                                                              
                                                                                
  Task 8.0 — Pre-Verify Patch (688f6b8a)                    
                                                                                
  Plan diperluas dari ~50 → ~340 lines. 3 tasks → 5 tasks:                      
  - Task 8.1: schema + Convex mutations (was combined)                          
  - Task 8.2: persistence adapter (new split)                                   
  - Task 8.3: orchestrator + entry (expanded)                                  
  - Task 8.4: UI wiring (new split)                                             
  - Task 8.5: 10-point review                                                   
                                                                                
  Task 8.1 — Schema + Convex Mutations (1d22c89c)                               
                                                                                
  Single commit, 6 files, +930 lines.                                           
                                                                                
  Schema additions (convex/schema.ts):                                          
  - harnessDecisions table — 10 fields matching DecisionState contract, 3      
  indexes (by_run, by_run_status, by_decisionId)                                
  - harnessRuns.pendingDecisionId stays opaque string (stable semantic ID, not
  v.id)                                                                         
  - Zero changes ke domain tables                                               
                                                                               
  New mutations/queries (convex/harnessDecisions.ts, 6 ops):                    
  - createDecision — mints UUID via crypto.randomUUID() w/ v4 fallback          
  - resolveDecision — pending → resolved|declined transition, throws on         
  non-pending (idempotency guard)                                               
  - invalidateDecision — idempotent no-op on non-pending                        
  - getDecision, getPendingByRun, getDecisionsByRun — query trio               
                                                                                
  Extensions ke convex/harnessRuns.ts:                                          
  - pauseRun(runId, reason, decisionId) — throws if status≠running, stamps      
  reason ke policyState.lastPolicyReason                                        
  - resumeRun(runId, ownerToken) — strict ownerToken check, throws on           
  non-paused, clears pendingDecisionId+pausedAt via undefined-patch semantics   
                                                                                
  Tests: 26 new (18 harnessDecisions + 8 pauseRun/resumeRun).                  
                                                                                
  Task 8.2 — Persistence Adapter (d78036fb)                                     
                                                                                
  Single commit, 4 files, +233 lines.                                           
                                                                               
  Type contracts (persistence/types.ts):                                        
  - DecisionType, DecisionResolution, DecisionPrompt, DecisionPromptOption
  - PauseRunParams, ResumeRunParams                                             
  - RunStore extended with 2 methods
                                                                                
  Adapter impl (persistence/run-store.ts):                                      
  - pauseRun: composes createDecision → pauseRun Convex mutations in order.     
  Returns decisionId.                                                           
  - resumeRun: composes resolveDecision → resumeRun. Omits response when       
  undefined (Convex validator safety).                                          
  - Inline design note: unlike startStep (collapsed to atomic Phase 6 audit),   
  decision+run state live in DIFFERENT tables. Atomicity via Convex per-call   
  transaction + explicit ordering.                                              
                                                            
  Tests: 4 new (10→14).                                                         
                                                                                
  Task 8.3 — Orchestrator + Entry (ed74b4f6)                                    
                                                                                
  Single agent dispatch (clean, no stash collision). 4 files, +226/-16.         
                                                                               
  Entry extensions (entry/accept-chat-request.ts):                              
  - Parse x-harness-resume header                           
  - Fetch run via new api.harnessRuns.getRunById query                          
  - Validate: exists, status=paused, ownership → populate accepted.resumeContext
  - 403 unconditionally for missing-run (avoid info leak), 409 for wrong status 
                                                                                
  Orchestrator resume path (runtime/orchestrate-sync-run.ts):                   
  - isResume = !!accepted.resumeContext at top                                  
  - Step 2 branches: resume reconstructs RunLane from persisted state + emits   
  run_resumed; fresh path unchanged                                             
  - Step 8.5 pause populates REAL decisionId via runStore.pauseRun + emits      
  run_paused                                                                   
  - Steps 1, 3-13 run normally on both paths                                    
  - Safety guard: orchestrator throws if resumeContext.conversationId ≠ resolved
   conversation.conversationId (client tampering check)                         
                                                                                
  Agent deviations (documented):                                                
  - sessionId NOT on resumeContext — schema v1 doesn't persist sessionId. Mint  
  fresh via mintResumeSessionId(). Correlation preserved via runId +            
  correlationId (requestId).                                                   
  - 403 unconditionally instead of 404 — avoids leaking run existence to        
  attackers guessing runIds.                                            
  - Extra conversationId cross-check — defensive guard beyond spec.             
  
  Task 8.4 — UI Wiring (722faed9)                                               
                                                            
  Single agent dispatch. 2 files, +105/-2.                                      
                                                            
  Hook extension (hooks/usePaperSession.ts):                                    
  - resolveDecisionMutation + resumeRunMutation bindings    
  - pausedHarnessRun query via api.harnessRuns.getRunByConversation with        
  statusFilter: "paused"                                                
  - resolveAndResume(resolution, response?) helper — no-op when no pausedRun,   
  composes both mutations in order                                           
                                                                                
  UI wiring (ChatWindow.tsx):                               
  - handleApprove: resolveAndResume("resolved", { decision: "approve" }) BEFORE 
  existing approveStage(userId)                                                 
  - handleRevise: same pattern before requestRevision                           
  - F1-DEBUG logs preserved verbatim                                            
  - DefaultChatTransport extended with dynamic headers callback — adds          
  x-harness-resume: <runId> when paused run exists                              
  - useMemo dependency includes pausedHarnessRun?._id so transport rebuilds     
  reactively                                                                    
                                                                                
  ai-sdk finding: DefaultChatTransport.headers supports Resolvable<T> callback 
  form (verified in node_modules/ai/dist/index.d.ts). No custom transport       
  needed.                                                   
                                                                                
  202 handling: ai-sdk SSE parser absorbs non-SSE JSON body silently (no events 
  emit, stream resolves clean). Known limitation: PaperValidationPanel only    
  renders on stageStatus === "pending_validation" — current pause point (step   
  8.5) coincides with this in practice. Dedicated harness decision panel out of
  scope.                                                                       

  Task 8.5 — Post-Phase Audit                                                   
  
  Reviewer agent 10-point audit — all ✅ OK:                                    
                                                            
  1. Schema fidelity ✅                                                         
  2. Decision table separation ✅                           
  3. Mutation correctness ✅                                                    
  4. Adapter thinness ✅                                    
  5. Orchestrator resume (only step 2 skipped) ✅                               
  6. Event emission (correlationId + payload shape) ✅                          
  7. UI ADDITION pattern ✅                                                     
  8. No partial step state ✅                                                   
  9. paperSessions untouched ✅                                                 
  10. Observability (5 new log lines) ✅                                        
                                                                               
  Scope limits confirmed: NO subagents, NO worker farm, NO paper workflow       
  redesign, paperSessions authoritative. Zero unused exports, zero silent
  failures, zero new type holes.                                                
                                                            
  ---                                                                          
  Test Results — Comprehensive
                                                                                
  Final Suite: 17 files, 219/219 pass
                                                                                
  Test Files  17 passed (17)                                
  Tests       219 passed (219)                                                  
  Duration    5.84s                                         
                                                                                
  Phase 8 additions: +30 tests
  - convex/harnessDecisions.test.ts: 18 tests (new file)                        
  - convex/harnessRuns.test.ts: +8 tests (pauseRun × 4, resumeRun × 4)          
  - src/lib/chat-harness/persistence/run-store.test.ts: +4 tests (pauseRun × 2,
  resumeRun × 2)                                                                
                                                                                
  TypeScript + Build                                                            
                                                                                
  npx tsc --noEmit → exit 0                                                    
  npx next build   → 51 pages, clean (35.1s)                                    
                                                                                
  ---                                                                          
  Observability — 5 New Logs                                                    
                                                            
  [HARNESS][persistence] pauseRun runId=<id> decisionId=<id> reason="..."      
  [HARNESS][persistence] resumeRun runId=<id> decisionId=<id>                   
  resolution=resolved
  [HARNESS][persistence] resumeLane runId=<id> requestId=<id>                   
  [HARNESS][entry] resume header detected runId=<id> workflowStage=<stage>      
  [HARNESS][event] run_paused eventId=<id> ... (with decisionId in payload)     
  [HARNESS][event] run_resumed eventId=<id> ... (with previousRunStatus,        
  resumeReason)                                                                 
  [HARNESS][ui] resumed paused run runId=<id> on approve  (from ChatWindow      
  handleApprove/handleRevise)                                                   
                                                                               
  Existing Phase 1-7 logs unchanged.                                            
                                                            
  ---                                                                          
  Final Commit Stack Phase 8
                                                                                
  722faed9 feat(harness): wire approval UI to resumeRun path (Task 8.4)
  ed74b4f6 feat(harness): orchestrator pause/resume wiring (Task 8.3)           
  d78036fb feat(harness): add RunStore pause/resume adapter methods (Task 8.2)  
  1d22c89c feat(harness): add pause/resume schema + Convex mutations (Task 8.1) 
  688f6b8a docs(harness): patch Phase 8 design decisions (pre-verify)           
                                                                                
  ---                                                                           
  Architectural Wins Phase 8                                                   
                                                                                
  1. Decision registry as separate durable contract. harnessDecisions table
  mirrors research doc. Runtime facts stay clean of domain workflow             
  (paperSessions untouched).
  2. Pause is infrastructure, not feature. Q1=C — no enforcer triggers it today.
   But everything is plumbed end-to-end: enable trigger anywhere, pause flow    
  works immediately.                                                           
  3. Resume = normal request + 1 skipped step. No background worker, no state   
  rehydration magic. Client controls via header; orchestrator only skips        
  resolveRunLane.                                                              
  4. Q4 ADDITION pattern. Runtime resume + domain approval are orthogonal. UI   
  calls both in sequence; each has clean responsibility.                        
  5. Strict ownerToken on resume. Double-check at Convex mutation layer prevents
   resume hijacking even if runId leaks.                                        
  6. Convex reactive subscription handles "paused" state update. No custom
  client state machine needed — transport rebuilds with x-harness-resume header 
  reactively when pausedHarnessRun query updates.           
                                                                                
  ---                                                       
  Outstanding Items                                                            
                   
  Manual UI Smoke (BELUM — butuh lo)
                                                                                
  Phase 8 pause path nggak punya trigger aktif (Q1=C). Manual verification      
  butuh:                                                                        
  - Sementara hardcode requiresApproval = true di salah satu enforcer untuk test
  - Trigger chat, verify 202 response                                           
  - Convex dashboard: verify harnessDecisions row (pending) +                  
  harnessRuns.status=paused                                                     
  - UI: click approve di validation panel → verify resolveAndResume runs        
  - Next POST: verify x-harness-resume header sent                             
  - Orchestrator: verify run_resumed event + skip step 2                        
  - Revert the test trigger                                                     
                                                                                
  Real Pause Triggers (BELUM — future phase)                                    
                                                                                
  Ketika ada use case konkret (misal destructive tool approval, paper-stage     
  confirmation beyond pending_validation), add enforcer yang set                
  requiresApproval = true. Pause flow ready.                                    
                                                                               
  ---                                                                          
  Lessons Captured
                  
  1. Terse specs need pre-verify. Original Phase 8 spec was 50 lines; reviewer
  found 5 BLOCKERS requiring 6 design decisions. Always pre-verify before       
  commit.
  2. Separate Convex mutations for composed operations. Unlike startStepAtomic  
  (Phase 6 collapsed 3→1 atomic), pause/resume span 2 tables — kept as 2        
  mutations with explicit ordering because Convex can't atomic across tables   
  cleanly.                                                                      
  3. ai-sdk transport supports callbacks. Don't assume static config only —
  Resolvable<T> type allows dynamic headers.                                    
  4. Decision identity = stable string, not Convex ID. decisionId as UUID lets
  us surface it in events, 202 responses, URLs without exposing internal _id.   
  5. Agent deviations can be improvements. Agent 8.3 made 3 defensible
  deviations (session minting, 403 response code, conversationId cross-check) — 
  all safer than literal spec.