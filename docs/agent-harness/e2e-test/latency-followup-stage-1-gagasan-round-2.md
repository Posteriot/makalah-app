# Stage 1 Gagasan Round 2 — Latency & Robustness Follow-up

## Status
- Non-blocking follow-up
- To be investigated in a separate worktree branch after this branch is pushed

## Reason for separation
- Current branch priority is end-to-end functional completion.
- The Stage 1 round-2 artifacts show the main user-facing regression is fixed.
- However, the run still contains clear latency and recovery-path signals that should be analyzed deeply without expanding the scope of this branch.

## Source artifacts
- Next.js terminal:
  - `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-2/nextjs-terminal-log.txt`
- Browser console:
  - `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-2/console-browser-log.txt`
- Convex terminal:
  - `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-2/convex-terminal-log.txt`
- UI screenshots:
  - `/Users/eriksupit/Desktop/makalahapp/.worktrees/agent-harness/screenshots/test-e2e/stage-1/test-2/`

## Verified findings

### 1. Query/result delivery latency is high
- Browser console shows repeated slow query delivery warnings:
  - `53003ms`
  - `52470ms`
  - `47893ms`
  - `24063ms`
  - `23562ms`
  - `23491ms`
- Evidence:
  - `console-browser-log.txt:61-75`

### 2. Stream smoothness fails on the later turn
- Next.js terminal shows:
  - `gap=16719ms after chunk#309 reasoningBetween=true`
  - `[⏱ STREAM-SMOOTHNESS] pass=n reason=inter_chunk_gap_exceeded`
- Evidence:
  - `nextjs-terminal-log.txt:351`
  - `nextjs-terminal-log.txt:406-407`

### 3. Artifact/validation ordering is not clean
- Submit validation fired before artifact was ready:
  - `[submitStageForValidation] Blocked: no artifact yet for stage gagasan`
- The system later recovered:
  - artifact created
  - validation retried
  - validation passed
- Evidence:
  - `nextjs-terminal-log.txt:344-380`

### 4. Recovery leakage occurred during stream generation
- Next.js terminal shows:
  - `[PAPER][recovery-leakage-first-detected]`
  - leakage snippet includes `Maaf, sepertinya ada sedikit kendala teknis`
  - outcome guard later corrected the result
- Evidence:
  - `nextjs-terminal-log.txt:352-405`

### 5. Artifact ordering verdict is explicitly reversed
- Next.js terminal:
  - `[⏱ ARTIFACT-ORDERING] verdict=reversed`
- Evidence:
  - `nextjs-terminal-log.txt:408`

### 6. UI still flickers into skeleton after settled state
- Browser console:
  - `conversation-skeleton — messages not loaded yet, blocking TemplateGrid`
- Evidence:
  - `console-browser-log.txt:94-100`

### 7. Progress semantics shift during the same stage
- Browser console shows stage progress moving:
  - `1/2`
  - `3/4`
  - `5/5`
- This may be logically valid due to plan evolution, but it creates unstable user mental-modeling.
- Evidence:
  - `console-browser-log.txt:64-65`
  - `console-browser-log.txt:76-77`
  - `console-browser-log.txt:84-85`

## Current interpretation
- This is not a blocker for continuing cross-stage E2E testing.
- This is a real robustness/performance problem set.
- The correct classification is:
  - functional flow passed,
  - latency and sequencing quality still need separate investigation.

## Investigation goals for the future branch
1. Determine why browser-side query hydration/subscription delivery is taking 20-53 seconds.
2. Identify whether the 16.7s stream gap is dominated by reasoning, tool sequencing, persistence waits, or client rendering.
3. Analyze why `submitStageForValidation` is attempted before artifact readiness in this turn.
4. Determine whether reversed artifact ordering is expected recovery behavior or an avoidable sequencing bug.
5. Trace the root cause of `recovery-leakage-first-detected` and why the leakage exists before outcome guard cleanup.
6. Investigate why settled UI still re-enters `conversation-skeleton`.
7. Review whether plan/progress semantics should stay fluid or should be stabilized once shown to the user.

## Suggested work items for the future branch
1. Add a targeted observability review around:
   - `STREAM-SMOOTHNESS`
   - `ARTIFACT-ORDERING`
   - `STEP-TIMING`
   - query hydration timing in `ChatWindow`
2. Reproduce Stage 1 round 2 with profiling enabled.
3. Build a timing breakdown document per turn:
   - query hydration
   - search retrieval
   - compose
   - tool sequencing
   - artifact creation
   - validation submission
   - post-finish UI stabilization
4. Decide whether fixes belong in:
   - orchestration ordering
   - client hydration/rendering
   - Convex subscription behavior
   - progress-plan UX semantics

## Short handoff summary
- The choice-card regression appears fixed.
- Stage 1 round 2 still shows severe latency and recovery-path behavior.
- Investigate later in a dedicated branch; do not expand the scope of the current branch for this alone.
