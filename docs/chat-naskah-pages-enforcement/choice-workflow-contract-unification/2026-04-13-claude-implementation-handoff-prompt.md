# Claude Implementation Handoff Prompt

You are the implementer and executor for this branch. Codex has already completed review and audit of the problem framing, solution design, and implementation plan. Your job is to execute, verify, and only re-open design questions if runtime evidence proves the current documents wrong.

Read these three documents first, in this order:

1. `docs/chat-naskah-pages-enforcement/choice-workflow-contract-unification/2026-04-13-problem-context-choice-artifact-desync.md`
2. `docs/chat-naskah-pages-enforcement/choice-workflow-contract-unification/2026-04-13-reusable-patch-design-choice-workflow.md`
3. `docs/chat-naskah-pages-enforcement/choice-workflow-contract-unification/2026-04-13-choice-workflow-contract-unification.md`

Your working contract for this branch:

- Treat the three documents above as the current reviewed source for problem context, durable solution design, and execution order.
- Do not narrow scope to frontend-only, backend-only, or prompt-only if the dependency chain crosses those boundaries.
- Do not replace the unified workflow contract design with another partial fix such as adding one more special-case branch or another keyword-based heuristic.
- Do not treat `decisionMode` as the lasting source of truth. The intended target is a unified typed workflow contract centered on `workflowAction`, with a temporary legacy bridge only where explicitly planned.
- Do not ship a fix that updates prompts but leaves runtime contract drift, or vice versa.
- Do not deploy to prod until dev verification is complete and the implementation is proven end-to-end.

Implementation expectations:

- Execute the implementation plan task-by-task.
- Preserve TDD discipline from the plan. Start with failing tests where the plan says so.
- Keep the runtime design centralized:
  - typed choice contract
  - submit event schema
  - single workflow resolver
  - workflow registry
  - unified rescue path for server-owned/special stages
  - action-aware outcome guard
  - observability for resolved workflow action, contract version, and rescue execution
- Migrate the active prompt source in `.references/system-prompt-skills-active/updated-5`
- Keep fallback prompt code and Convex seed/migration source aligned with the same contract
- Update deploy scripts if they still point to an older prompt source

Files and areas that must be treated as potentially in scope if the code confirms they are still active:

- `src/lib/json-render/choice-payload.ts`
- `src/lib/json-render/choice-catalog.ts`
- `src/components/chat/ChatWindow.tsx`
- `src/lib/chat/choice-request.ts`
- `src/lib/chat/*workflow*`
- `src/app/api/chat/route.ts`
- `src/lib/ai/stage-skill-resolver.ts`
- `src/lib/ai/paper-stages/**`
- `convex/migrations/wipeAndReseedStageSkills.ts`
- `.references/system-prompt-skills-active/updated-5/**`
- `scripts/deploy-skills-dev.py`
- `scripts/deploy-skills-prod.py`
- focused tests and any adjacent coverage required by the plan

Verification bar:

- Run the focused tests required by the implementation plan.
- Verify legacy compatibility where planned.
- Verify observability assertions, not just output behavior.
- Verify prompt deployment in dev uses `updated-5` and completes without activation failure.
- If dev verification reveals design drift, update the problem-context and design docs before asking for prod deployment.

Escalation rule:

- If you discover the reviewed documents are wrong, do not silently improvise. Patch the documents so the implementation and documentation stay aligned.
- If you discover unrelated branch noise, work around it and do not revert user changes.

Definition of done:

- Code, tests, prompt sources, fallback sources, and deploy scripts are aligned under the same workflow contract.
- Dev deployment for `wary-ferret-59` is verified.
- Remaining prod deployment step is clearly gated behind successful dev validation and final approval.
