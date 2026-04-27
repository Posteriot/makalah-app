# Diagnose Playbook: Log Triage, Root Cause, Permanent Fix

This file is the canonical diagnose-mode procedure. Use it whenever the user pastes terminal logs, browser console output, server traces, or stack traces from an agent runtime and asks "what's wrong" or "fix this."

The discipline here is non-negotiable: **no diagnosis from incomplete logs, no fix without root cause, no fix without regression check, no fix without instrumentation.**

## §1. Observability gate (mandatory, blocks everything else)

A log is **diagnostically usable** only if it satisfies all six requirements below. Run this gate **before** reading the log content. If any requirement fails, stop and report the gap — do not proceed to root-cause analysis on incomplete evidence.

### The six requirements

1. **Correlation ID per request/turn** — every log line tied to a unique request, run, or turn. Without this, you cannot reconstruct one cycle out of interleaved traffic.
2. **Sub-second timestamps** — every log line timestamped to ms precision (or finer). Without this, you cannot order events that happen within a single inference call.
3. **Component tag** — every log line tagged with the producing component (e.g., `[orchestrator]`, `[tool:search]`, `[context-mgr]`, `[verifier]`). Without this, you cannot map symptoms to the 13-component anatomy.
4. **Decision attribution** — when the agent chose action X over Y, the log records why (model output text, tool selection probabilities, policy gate result). Without this, you cannot tell whether the model decided wrong or the harness routed wrong.
5. **State transition log** — when persistent state changed (memory write, status change, checkpoint), a log line records the before/after. Without this, you cannot verify the State Separation invariant from logs.
6. **Error class** — errors tagged as transient / LLM-recoverable / user-fixable / unexpected (per anatomy.md component 8). Without this, you cannot tell whether retry behavior was correct.

### Gate output format

```
Observability gate: PASS / FAIL

Requirements satisfied: [list]
Requirements missing:
  - [requirement] — [evidence from log: e.g., "no component tag on lines 12-47"]
  - ...

Verdict:
  PASS → proceed to §2
  FAIL → STOP. Report gaps to user. Do NOT proceed to root cause unless user
         accepts provisional mode in writing.
```

### Why this gate exists

Debugging from incomplete logs produces **partial fixes** — exactly the failure mode the skill is contracted to prevent. The model will pattern-match against the loudest error and propose a plausible-but-wrong fix. The cost of pausing for instrumentation is one cycle. The cost of shipping a partial fix is N cycles of recurrence plus loss of trust.

When the gate fails, the productive output is **the instrumentation delta** — the minimum logging change required to make the next reproduction diagnostic-grade. Recommend this; do not guess.

## §2. Reconstruct the cycle

Once the gate passes, map log entries to REPL/PPAF stages and to the 13 components (see anatomy.md). Build a timeline.

### Standard timeline format

```
Cycle [correlation-id]:

T+0.000ms  [orchestrator]   start              — input: "..."
T+0.005ms  [context-mgr]    Read               — assembled prompt: 4823 tokens (system: 1100, tools: 800, history: 2500, user: 423)
T+0.892ms  [model-adapter]  Eval               — provider response: tool_call(name="search", args={...})
T+0.894ms  [orchestrator]   Eval/dispatch      — routing to tool: search
T+0.895ms  [policy-gate]    Eval/permission    — granted (read-only)
T+1.234ms  [tool:search]    Print              — result: 12 hits, 4.3KB
T+1.240ms  [context-mgr]    Print/observation  — observation appended; new size: 5104 tokens
T+1.245ms  [orchestrator]   Loop               — iteration 2 begin
...
T+8.901ms  [verifier]       (none)             — *** EXPECTED FIRE BUT DID NOT ***
T+8.902ms  [orchestrator]   terminate          — reason: max_turns (10)
```

### Findings to extract from the timeline

- **Gaps** — stages with no log line where one was expected. The verifier-not-firing example above is a gap finding.
- **Out-of-order events** — stages firing before their preconditions (e.g., tool dispatch before permission check).
- **Unbalanced pairs** — Read with no matching Print, dispatch with no result, write with no commit.
- **Latency anomalies** — stages taking 10× their typical duration (often the symptom of a deeper hang).
- **Component absence** — entire components silent across many cycles (often means they were never wired in production).

Each finding is a candidate root cause. Score them in §3.

## §3. 5-Whys against the strongest candidate

Pick the finding with the **earliest divergence** from expected behavior — not the loudest error. The loudest error is usually downstream consequence; the earliest divergence is closer to the root.

### The 5-Whys procedure

```
Symptom: [user-reported symptom in plain language]

Why 1: [why did the symptom occur?]
       → [observation from logs / code that answers this]

Why 2: [why did Why-1's answer happen?]
       → [next observation]

Why 3: ...
Why 4: ...
Why 5: ...
```

### Stop conditions (do NOT push past these)

Stop the 5-Whys chain when you hit one of:

1. **Missing component** — "because we have no verifier" → the chain has hit a structural gap. Switch to critique mode for that component.
2. **Violated contract** — "because the tool returned an unschemafied object" → the chain has hit a contract violation. Switch to build mode for that contract.
3. **External cause** — "because the provider's API returned a 503" → the chain has reached outside the harness boundary. Document and recommend resilience pattern (retry, circuit breaker), not a "fix" of the external system.
4. **Model decision** — "because the model chose to do X instead of Y" → if the model had no way to know better (no instructions, no observation), the harness is too thin (decision §7). The fix is structural, not a prompt tweak.

### Anti-patterns in 5-Whys

- **Stopping too early** — accepting "because the code does X" as the bottom. That's a what, not a why. Push to "why does the code do X."
- **Stopping too late** — pushing past the harness boundary into model internals or hardware. Diagnose mode does not fix model weights.
- **Branching without commitment** — running 5-Whys on three findings simultaneously. Pick one, finish, then start the next if the first fix doesn't close the symptom.

## §4. The four permanent-fix gates

Before proposing any code change, the candidate fix must pass all four. A fix passing only 1-2 is a band-aid; label it as such or refuse to deliver it as the primary recommendation.

### Gate 1 — Root-cause gate

Question: *Does the fix address the root cause from §3, or only the symptom?*

Pass evidence: the fix removes one of the stop-condition findings (missing component / violated contract / external resilience / structural thinness), not the surface error.

Failure pattern: catching the exception and logging it. That hides the symptom but leaves the cause.

### Gate 2 — Class-of-failure gate

Question: *Does the fix prevent the entire class of bug, or only this instance?*

Pass evidence: the fix can be expressed as a generalizable rule ("all tool calls now validate args against schema before dispatch") rather than a specific patch ("check that args.foo is not null when calling search").

Failure pattern: adding a null check for the specific field that broke. The next field will break next week.

### Gate 3 — Regression gate

Question: *Does the fix maintain or improve every related test/log signature, not just the failing one?*

Pass evidence: explicit list of related behaviors checked, each verified to still work after the fix.

Failure pattern: fixing the failing test by changing what the test asserts. (Distinct from genuinely incorrect tests, which should be fixed with documented justification.)

### Gate 4 — Observability gate

Question: *Does the fix add the instrumentation that would have caught this earlier?*

Pass evidence: the fix includes new log lines, metrics, or assertions such that the next occurrence of this class of bug will be detected within one cycle.

Failure pattern: shipping the fix with no new observability. The next instance will require the same expensive reconstruction.

### Reporting fix-gate results

```
Permanent-fix gate evaluation:

Gate 1 (Root cause):       PASS / FAIL — [evidence]
Gate 2 (Class of failure): PASS / FAIL — [evidence]
Gate 3 (Regression):       PASS / FAIL — [list of behaviors checked]
Gate 4 (Observability):    PASS / FAIL — [new instrumentation added]

Verdict:
  4/4 PASS  → permanent fix; proceed
  3/4 PASS  → near-permanent; identify the gap and address before shipping
  ≤2/4 PASS → band-aid; either upgrade to permanent or label explicitly as
              temporary mitigation with debt log
```

## §5. Special cases

### Browser console logs

Same gate, plus:
- **Network tab cross-reference** — UI errors often originate in failed API calls. If the user pastes only console output, ask for the network log too.
- **React/component frame** — if the harness has a UI, errors in the UI layer can mask harness errors that fired earlier on the server. Reconstruct server-side first.
- **Source maps** — minified stack traces without source maps are unreadable. If gate fails on this, request the unminified trace before guessing.

### Terminal logs from CLI/server runtime

Same gate, plus:
- **Multi-process correlation** — if the harness spawns subprocess workers, correlation ID must propagate. Logs from worker without parent-cycle ID are unreconstructable.
- **Truncation** — long logs are often clipped. Verify the log starts before the cycle of interest, not in the middle.

### Stack traces in isolation

A stack trace alone is rarely sufficient. It tells you where the error surfaced, not what caused it. Always request:
- The log lines from the same correlation ID for ~10 lines before the trace.
- The state of the relevant component at the moment of the trace (memory contents, in-flight tool calls).

If the user can provide only the stack trace, the gate fails on requirements 1 (correlation), 4 (decision attribution), and 5 (state transition). Recommend running with full logging and reproducing.

### Long-running / multi-context-window failures (pattern-match these aggressively)

Two specific failure patterns from Anthropic's effective-harnesses research are commonly **misdiagnosed** as verification or memory bugs. They are session-boundary bugs, and the fix is structural (Component 13), not a verification tweak.

**Pattern A: One-shot exhaustion.** Log signature:
- Session N starts a large task (e.g., "build a clone of X")
- Many tool calls in one session, no commits, no progress file writes
- Session N hits context limit mid-implementation
- Session N+1 starts; agent reads conversation summary (if any), tries to recover, spends most of its turns guessing what the previous session did
- Net forward progress over the two sessions: minimal

**Misdiagnosis to avoid:** "agent forgot what it did" → blamed on Memory (component 3) or Context Management (component 4). Wrong. Compaction doesn't help because the precise state of in-flight work was never persisted.

**Correct diagnosis:** missing Component 13. The agent has no Initializer-built scaffolding (init.sh / progress.txt / feature_list.json) and no incremental discipline. Fix is structural.

**Pattern B: Premature victory.** Log signature:
- Session N+M (later in project) starts
- Agent runs `ls`, sees files, runs the dev server, sees it boots
- Agent declares the project complete or near-complete
- User reports many features are missing or broken

**Misdiagnosis to avoid:** "verifier didn't catch the missing features" → blamed on Verification (component 10). Wrong. The verifier can only verify what it knows to look for; without a persistent feature inventory, it has nothing to check against.

**Correct diagnosis:** missing Component 13 *feature_list*. The agent has no inventory of what *should* exist; it can only inspect what *does* exist and reach an over-optimistic conclusion. Fix is to add a feature_list.json with `passes: false` initially for every feature, and require coding agents to flip `passes: true` only after end-to-end test.

**Diagnostic procedure for any suspected long-running failure:**

1. Look at the session boundary in the log. What happened at the start of the *new* session?
2. Did the agent run a getting-up-to-speed ritual (pwd → progress → feature list → git log → init.sh → smoke test) before doing anything else? If no, this is the gap.
3. Does the project have an init.sh, progress file, and feature list at all? If no, the harness lacks Component 13 entirely.
4. Is the feature list in JSON or Markdown? Markdown is a known failure mode (model overwrites it).
5. Is verification end-to-end (browser automation) or unit-test-only? For UI work, unit-test-only verification will produce premature-victory false positives.

**Remediation pattern (for diagnosis output):**

```
Root cause: missing Component 13 (multi-context-window continuity).
Permanent fix:
  1. Add Initializer Agent prompt (runs once on first session)
  2. Initializer produces: init.sh, claude-progress.txt, feature_list.json (JSON, not Markdown)
  3. Add Coding Agent prompt with mandatory getting-up-to-speed ritual
  4. Add clean-state-at-session-end discipline (commit + progress write)
  5. For UI work: mandate end-to-end verification via browser automation (e.g., Puppeteer MCP)
Class of failure prevented: all session-boundary continuity failures.
```

### Intermittent failures

Logs from a single failing run are insufficient. Request:
- Logs from a successful run of the same input (the diff is the signal).
- Logs from multiple failing runs (to identify whether failures share a precondition or are genuinely random).

If the failure is genuinely random (no shared precondition, no environmental correlate), the root cause is usually in the **non-deterministic** part of the system — model output variance. Fix is structural: add a verifier loop or constrain the output schema.

## §6. Output: the diagnosis artifact

Final deliverable always contains, in order:

```
1. OBSERVABILITY GATE RESULT
   - Pass/fail per requirement
   - If fail: the instrumentation delta (stop here)

2. RECONSTRUCTED TIMELINE
   - REPL/PPAF stages with timestamps and component tags
   - Findings list (gaps, out-of-order, unbalanced, latency, absence)

3. SYMPTOM → COMPONENT MAP
   - User-reported symptom translated to component(s)
   - Earliest divergence identified

4. 5-WHYS CHAIN
   - Symptom at top
   - Each why with its evidence
   - Stop condition reached at the bottom

5. PERMANENT FIX
   - The change (specific code/config)
   - Why it addresses the root cause from §4
   - Class of failure it prevents

6. PERMANENT-FIX GATE EVALUATION
   - All four gates with pass/fail and evidence

7. REGRESSION CHECK PLAN
   - List of tests/behaviors to run/observe after the fix
   - Expected log signatures post-fix

8. INSTRUMENTATION DELTA
   - New log lines / metrics added
   - How they detect the next occurrence in <1 cycle

9. RECOMMENDATION
   - Primary: ship the permanent fix
   - If user pressures for band-aid first: explicit label of debt incurred
     and ETA for permanent fix
```

## §7. When to refuse

Refuse to deliver a fix in these situations:

- Observability gate fails AND user does not accept provisional mode in writing.
- Permanent-fix gate scores ≤2/4 AND user does not accept band-aid label.
- 5-Whys terminates at "I don't know" — there is no candidate root cause; pushing further produces a guess.
- The candidate fix touches the model (prompt change as the "fix") AND the root cause is structural — refuse and recommend the structural fix even if it's larger.

Refusing is a feature. Shipping a wrong fix costs more than the friction of refusing.

## §8. Anti-patterns specific to diagnose mode

- **Pattern-matching the loudest error** — the loudest error is downstream. Look for earliest divergence.
- **Trusting the model's self-report** — if the model claims it tried X and it failed, verify in logs that the call actually went out. Models hallucinate execution.
- **Single-run diagnosis of intermittent failures** — one log of a flaky bug is insufficient. Require multiple runs or a successful run for diff.
- **Fixing what the linter complained about while debugging the actual bug** — drive-by fixes hide regressions. Stay on the root cause, file separate tickets for incidental issues.
- **Stack-trace cargo cult** — copying error messages into search engines and pattern-matching solutions. The same error message has many root causes; the timeline tells which one.
- **"It works now" as resolution** — without root cause identification, "works now" means the bug moved, not died. Require the 5-Whys chain to terminate at a stop condition before declaring resolved.
