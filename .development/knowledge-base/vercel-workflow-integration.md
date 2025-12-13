# Vercel Workflow Integration Concept

## Overview

This document provides the conceptual foundation and justification for integrating the 8-phase academic paper generation workflow (defined in `workflow.md`) with Vercel Workflow platform. This serves as a knowledge base for future implementation decisions and architectural understanding.

## Why Vercel Workflow?

### Problem Statement

The academic paper generation workflow defined in `workflow.md` has several critical requirements that standard API endpoints cannot handle effectively:

1. **Long-running, multi-step processes**: Each paper generation may take hours or days, spanning 8 distinct phases
2. **State persistence**: User may pause at Phase 3, close browser, and resume days later at Phase 3 with all context preserved
3. **Human-in-the-loop checkpoints**: Each phase requires user review/approval before proceeding to the next
4. **Durability**: Process must survive server restarts, deployments, or crashes
5. **Complex orchestration**: AI agent must coordinate web search, LLM calls, database updates, and user interactions

### Why Not Standard Approaches?

**Standard REST API:**
- ❌ Request timeout limits (typically 30s-60s)
- ❌ No built-in state persistence across requests
- ❌ Cannot pause mid-execution and resume later
- ❌ Complex to implement retry logic and error recovery

**Server-Sent Events (SSE) / WebSockets:**
- ❌ Connection drops if user closes browser
- ❌ State lost on server restart
- ❌ Complex to implement durable execution

**Background Jobs (e.g., Bull, BullMQ):**
- ✅ Can handle long-running tasks
- ✅ Retry logic supported
- ❌ Requires managing separate queue infrastructure (Redis)
- ❌ Complex state management across jobs
- ❌ No built-in pause/resume for multi-day workflows

### Why Vercel Workflow is the Right Choice

**Vercel Workflow** is a managed platform specifically designed for durable, stateful, multi-step processes:

1. **Durable Execution**: Functions can run for hours/days without timeout
2. **Automatic State Persistence**: State is automatically saved and can survive restarts
3. **Pause/Resume Built-in**: Workflow can wait for external input (user approval) indefinitely
4. **Managed Infrastructure**: No need to manage queues, workers, or state storage separately
5. **TypeScript-Native**: Seamless integration with existing Next.js/TypeScript codebase
6. **Observability**: Built-in monitoring and debugging for workflow execution
7. **Optimized for AI Workloads**: Fluid compute model handles LLM API calls efficiently

**Cost-Benefit Analysis:**

| Aspect | Custom Implementation | Vercel Workflow |
|--------|----------------------|-----------------|
| Development Time | 4-6 weeks | 1-2 weeks |
| Infrastructure Management | Manual (Redis, workers, DB) | Fully managed |
| State Persistence | Custom implementation | Built-in |
| Error Recovery | Manual retry logic | Automatic |
| Observability | Custom logging/monitoring | Built-in dashboard |
| Scalability | Manual scaling | Auto-scaling |

**Conclusion:** Vercel Workflow significantly reduces development complexity and operational overhead while providing exactly the features needed for the academic workflow.

---

## Conceptual Mapping: 8-Phase Workflow → Vercel Workflow

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface (Next.js)                  │
│  - Dashboard to start/monitor workflow                      │
│  - Phase output displays (topic options, outlines, drafts)  │
│  - Approval/feedback forms for each phase                   │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP API calls
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Vercel Workflow Orchestrator                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Phase 1: Brainstorming                             │   │
│  │  - Input: user field, interests                     │   │
│  │  - Tools: web search, literature discovery          │   │
│  │  - Output: 3-5 topic options                        │   │
│  │  - Wait: user selects topic ────────────────┐       │   │
│  └─────────────────────────────────────────────┼───────┘   │
│                                                 │           │
│  ┌─────────────────────────────────────────────┼───────┐   │
│  │  Phase 2: Topic Clarification               │       │   │
│  │  - Input: selected topic from Phase 1       │       │   │
│  │  - Tools: web search for validation         │       │   │
│  │  - Output: definitive topic                 │       │   │
│  │  - Wait: user approves ─────────────────────┤       │   │
│  └─────────────────────────────────────────────┴───────┘   │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Phase 3: Research Foundation                     │     │
│  │  - Tools: web search, literature discovery        │     │
│  │  - Output: sources, methodology, citations        │     │
│  │  - Wait: user approves ────────────────────┐      │     │
│  └───────────────────────────────────────────┼──────┘     │
│                                               │            │
│  ... (Phases 4-8 follow similar pattern)      │            │
│                                               │            │
└───────────────────────────────────────────────┼────────────┘
                                                │
                                                ▼
                              State persisted automatically
                              (can pause/resume anytime)
```

### Phase-to-Step Mapping

Each of the 8 phases in `workflow.md` maps to a **Workflow Step** in Vercel Workflow:

| Academic Phase | Workflow Step | Input Source | Output Destination | Wait Condition |
|----------------|---------------|--------------|-------------------|----------------|
| Phase 1: Brainstorming | `step_brainstorming` | User initial data | State: `topicOptions[]` | User selects topic |
| Phase 2: Topic Clarification | `step_topicClarification` | State: `selectedTopicId` | State: `definiteTopic` | User approves topic |
| Phase 3: Research Foundation | `step_researchFoundation` | State: `definiteTopic` | State: `references[]`, `methodology` | User approves foundation |
| Phase 4: Structure Planning | `step_structurePlanning` | State: `methodology`, `references[]` | State: `outline` | User approves outline |
| Phase 5: Content Creation | `step_contentCreation` | State: `outline` | State: `sections[]` | User approves all sections |
| Phase 6: Document Integration | `step_documentIntegration` | State: `sections[]` | State: `manuscript` | User approves draft |
| Phase 7: Final Polish | `step_finalPolish` | State: `manuscript` | State: `finalPaper` | User approves final paper |
| Phase 8: Delivery | `step_delivery` | State: `finalPaper` | State: `deliveryPackage` | User acknowledges receipt |

**Key Insight:** Each step can **pause indefinitely** while waiting for user input, and the workflow state is automatically persisted. This perfectly matches the human-in-the-loop nature of academic paper creation.

---

## State Management Concept

### Global Workflow State Structure

The workflow maintains a **single, versioned state object** that accumulates data across all phases:

```typescript
WorkflowState {
  // Metadata
  workflowId: string
  userId: string
  currentPhase: 1-8
  status: 'active' | 'paused' | 'completed' | 'failed'
  
  // Phase 1 artifacts
  phase1: {
    userField: string
    topicOptions: TopicOption[]
    selectedTopicId?: string
  }
  
  // Phase 2 artifacts
  phase2: {
    definiteTopic: {
      title: string
      scope: string
      researchQuestion: string
    }
  }
  
  // Phase 3 artifacts
  phase3: {
    references: Reference[]
    methodology: Methodology
    researchGaps: string[]
  }
  
  // Phases 4-8 artifacts
  phase4: { outline: Outline }
  phase5: { sections: Section[] }
  phase6: { manuscript: string }
  phase7: { finalPaper: string }
  phase8: { deliveryPackage: DeliveryPackage }
  
  // Audit trail
  history: PhaseTransition[]
}
```

### State Evolution Across Phases

The state **grows incrementally** as the workflow progresses. Each phase:
1. **Reads** from previous phase artifacts
2. **Performs** AI operations (LLM calls, web search)
3. **Writes** new artifacts to state
4. **Pauses** for user input
5. **Resumes** when user provides feedback

**Example State Evolution:**

```
Start: { workflowId, userId, currentPhase: 1, phase1: {} }
        ↓ (Phase 1 completes)
After Phase 1: { ..., currentPhase: 1, phase1: { topicOptions: [...] } }
        ↓ (User selects topic)
        ↓ (Phase 2 completes)
After Phase 2: { ..., currentPhase: 2, phase2: { definiteTopic: {...} } }
        ↓ (User approves)
        ... (continues through Phase 8)
```

**Key Benefits:**
- **No data loss**: All artifacts from previous phases remain accessible
- **Audit trail**: Complete history of user decisions and AI outputs
- **Resume capability**: Workflow can resume at exact point of pause with full context

---

## Tools Integration Concept

### Tool Definition Philosophy

The workflow uses **two primary tool categories**:

1. **Web Search Tool** (Phases 1-3)
   - Purpose: Grounded exploration and validation
   - Implementation: Google Search API or alternative
   - Output: Structured search results with metadata

2. **Literature Discovery Tool** (Phases 1-3)
   - Purpose: Academic source discovery
   - Implementation: Semantic Scholar API (free), Google Scholar scraping
   - Output: Academic papers with citations, abstracts, metadata

**Why Only Two Tools?**

- **Simplicity**: Focus on core capabilities needed for research phase
- **Cost-effective**: Both can be implemented with free/low-cost APIs
- **Custom to makalah**: Not dependent on expensive third-party academic tools
- **Indonesian-friendly**: Can customize for Indonesian language and academic standards

### Tool Execution Pattern

Each tool follows a consistent pattern:

```
User Input → LLM generates queries → Tool executes → LLM synthesizes results → Output to state
```

**Example (Phase 1 Brainstorming):**

```
1. User provides: "Computer Science", "AI, Machine Learning"
2. LLM generates exploratory queries:
   - "Recent AI research trends in Computer Science"
   - "Machine Learning applications in Indonesian context"
   - "Emerging topics in AI for Southeast Asia"
3. Web Search Tool executes each query
4. Literature Discovery Tool finds related papers
5. LLM synthesizes findings into 3-5 topic options:
   - "AI for Indonesian Language Processing"
   - "Machine Learning in Indonesian Healthcare"
   - "Ethical AI Frameworks for Southeast Asia"
6. Output saved to state.phase1.topicOptions
7. Workflow pauses, user selects topic
```

**Tool Execution is Non-blocking:** Tools execute within workflow steps, results cached in state.

---

## Context Switching Concept

The workflow defines **three context levels** as specified in `workflow.md`:

1. **Research Context** (Phases 1-3)
   - Focus: Exploration, discovery, validation
   - Tools: Web search, literature discovery active
   - AI behavior: Curious, exploratory, citation-focused

2. **Writing Context** (Phases 4-6)
   - Focus: Content creation, structure, integration
   - Tools: None (uses artifacts from Research Context)
   - AI behavior: Structured, coherent, academic writing style

3. **Review Context** (Phases 7-8)
   - Focus: Quality assurance, compliance, delivery
   - Tools: None (evaluates artifacts from Writing Context)
   - AI behavior: Critical, evaluative, quality-focused

### Context Implementation

**Context is implemented through LLM system prompts:**

Each phase uses a different system prompt optimized for its context:

```typescript
// Research Context (Phases 1-3)
systemPrompt: `You are an Academic Research Agent specialized in Indonesian academic standards. Your goal is to discover, validate, and synthesize academic sources. Use web search and literature discovery tools actively. Focus on credibility and relevance.`

// Writing Context (Phases 4-6)
systemPrompt: `You are an Academic Writing Agent specialized in Indonesian academic prose. Your goal is to create well-structured, coherent academic content following Indonesian conventions. Integrate citations from research foundation naturally.`

// Review Context (Phases 7-8)
systemPrompt: `You are an Academic Review Agent specialized in Indonesian academic quality standards. Your goal is to validate, polish, and certify academic work for publication readiness. Apply rigorous quality criteria.`
```

**Why Context Switching Matters:**

- Different phases require different AI capabilities
- Tool usage patterns differ across contexts
- Quality criteria and evaluation methods change
- Separating contexts improves AI performance and output quality

---

## User Interaction Points

### Pause/Resume Mechanism

The workflow has **8 user interaction checkpoints** (one per phase):

```
Phase Completes → Workflow Pauses → Notification to User → User Reviews → User Provides Feedback → Workflow Resumes
```

**Technical Implementation Concept:**

1. **Pause**: Workflow calls `pauseAndWaitForUserInput(phaseNumber, outputData)`
   - State is automatically persisted
   - Workflow execution stops
   - Webhook/notification sent to user

2. **User Reviews**: User accesses dashboard, sees phase output
   - View topic options (Phase 1)
   - Review definitive topic (Phase 2)
   - Validate references and methodology (Phase 3)
   - Approve outline (Phase 4)
   - Review section drafts (Phase 5)
   - Check integrated manuscript (Phase 6)
   - Approve final paper (Phase 7)
   - Acknowledge delivery (Phase 8)

3. **Resume**: User submits approval/feedback
   - API call triggers workflow resume: `resumeWorkflow(workflowId, userFeedback)`
   - Workflow continues from exact pause point
   - User feedback incorporated into state
   - Next phase begins

**Key Advantage:** User can take hours, days, or weeks between phases. Workflow state remains intact.

### Feedback Integration

User feedback at each checkpoint can influence subsequent phases:

- **Reject and modify**: User can request changes, workflow loops back within the same phase
- **Approve**: Workflow proceeds to next phase
- **Pause indefinitely**: User can postpone without losing progress

**Example (Phase 1 feedback loop):**

```
Phase 1 generates 3 topics → User: "None of these are specific enough"
→ Workflow re-executes Phase 1 with refined search
→ Generates 3 new topics → User: "Topic 2 looks good"
→ Workflow proceeds to Phase 2
```

---

## Data Persistence Strategy

### Two-Layer Persistence

**Layer 1: Vercel Workflow Managed State**
- **What**: Workflow execution state (current phase, intermediate variables)
- **Where**: Vercel's managed persistence layer
- **Lifecycle**: Exists during workflow execution, cleaned up after completion
- **Purpose**: Enable pause/resume, durable execution

**Layer 2: Application Database (Supabase)**
- **What**: Academic artifacts (topics, references, manuscripts, final papers)
- **Where**: Supabase PostgreSQL tables
- **Lifecycle**: Permanent storage for user's academic work
- **Purpose**: Long-term access, querying, user library of papers

### Persistence Flow

```
Workflow Phase Completes
    ↓
Artifacts saved to Vercel Workflow State (Layer 1)
    ↓
Workflow pauses for user input
    ↓
[IF user approves]
    ↓
Artifacts also persisted to Supabase Database (Layer 2)
    ↓
User can access artifacts from dashboard even if workflow is deleted
```

**Key Design Decision:** Workflow state is temporary/transient, but academic artifacts are permanently stored in Supabase. This ensures users never lose their work even if workflow execution fails or is manually cancelled.

### Database Schema Concept

**`academic_workflows` table:**
- Tracks active workflows
- Links to Vercel workflow ID
- Stores current phase and status
- References user and paper

**`academic_papers` table:**
- Stores final artifacts per phase
- Topic, outline, sections, manuscript, final paper
- References stored as JSONB
- Enables querying user's paper library

**Relationship:**
```
User (1) ──── (many) Academic Workflows ──── (many) Academic Papers
```

A user can have multiple workflows (concurrent or historical), each producing a paper.

---

## Error Handling & Resilience

### Workflow-Level Error Handling

Vercel Workflow provides automatic retry logic, but we layer additional resilience:

**LLM API Failures:**
- Automatic retry with exponential backoff
- Fallback to alternative LLM provider if primary fails
- Partial output saved to state before retry

**Tool Failures (Web Search, Literature Discovery):**
- Retry up to 3 times
- Graceful degradation: If search fails, LLM proceeds with cached/reduced data
- User notified of degraded results

**State Corruption:**
- Workflow validates state schema before each phase
- If corruption detected, workflow pauses and notifies user
- Manual intervention required (restore from backup state)

### User-Initiated Cancellation

User can cancel workflow at any checkpoint:
- State is saved to database as "cancelled"
- Partial artifacts retained
- User can restart from scratch or resume from last checkpoint

---

## Scalability Considerations

### Handling Multiple Concurrent Workflows

**Challenge:** Multiple users starting workflows simultaneously

**Solution:**
- Vercel Workflow handles concurrency automatically
- Each workflow instance is isolated with unique `workflowId`
- No resource contention between users

**LLM Rate Limits:**
- Implement request queuing per user
- Graceful backoff if rate limit hit
- User notified of slight delay

### Long-Term Growth

As makalah app grows to hundreds/thousands of users:

**Workflow Management:**
- Archive completed workflows after N days
- Retain only active/recent workflows in memory
- Historical data in Supabase for querying

**Cost Optimization:**
- Monitor LLM token usage per workflow
- Implement token usage caps per user tier
- Cache common search results to reduce redundant API calls

---

## Integration with Existing Makalah Codebase

### Minimal Disruption Principle

The Vercel Workflow integration is designed as an **additive feature**, not a rewrite:

**Existing Features Unchanged:**
- User authentication (Supabase Auth)
- Dashboard UI
- Database schema (only additions, no modifications)

**New Components:**
- `/workflows/academic-paper/` directory for workflow logic
- API routes: `/api/workflow/*` for workflow control
- UI components: Workflow status display, phase output viewers

### Integration Points

**1. Dashboard:**
- Add "Start New Paper" button
- Display active workflows with current phase
- Show completed papers library

**2. API Layer:**
- `POST /api/workflow/start` - Start new workflow
- `GET /api/workflow/:id/status` - Get workflow status
- `POST /api/workflow/:id/resume` - Submit user feedback and resume
- `DELETE /api/workflow/:id` - Cancel workflow

**3. Database:**
- New tables: `academic_workflows`, `academic_papers`
- Foreign keys to existing `users` table

**4. Authentication:**
- All workflow APIs protected by existing auth middleware
- Workflows scoped to authenticated user

---

## Future Extensibility

While this concept focuses on the core 8-phase workflow, the architecture supports extensions:

**Potential Extensions:**
1. **Collaborative workflows**: Multiple users (e.g., student + supervisor) approve phases
2. **Custom phase insertion**: Users add custom validation steps
3. **Template workflows**: Pre-configured workflows for specific disciplines (e.g., "Medical Research Paper", "Computer Science Thesis")
4. **Multi-language support**: Extend beyond Indonesian to English, etc.
5. **Integration with institutional repositories**: Auto-submit completed papers

**Extensibility is enabled by:**
- Modular phase design (easy to add/modify phases)
- Flexible state schema (JSONB allows dynamic fields)
- Tool abstraction (easy to add new tools without changing workflow logic)

---

## Success Criteria

This integration is considered successful if:

1. ✅ **User can start a workflow and pause/resume at any phase without data loss**
2. ✅ **Workflow survives server restarts and deployments**
3. ✅ **Each phase produces expected artifacts (topic, outline, manuscript, etc.)**
4. ✅ **Web search and literature discovery tools return relevant results**
5. ✅ **Final paper meets Indonesian academic standards**
6. ✅ **Workflow execution is observable (user can see progress)**
7. ✅ **Total development time is under 2 weeks**
8. ✅ **No external infrastructure required (fully managed by Vercel)**

---

## Conclusion

Vercel Workflow is the optimal platform for implementing the 8-phase academic workflow due to its:
- **Durable execution model** perfectly suited for long-running, multi-day processes
- **Built-in state persistence** eliminating complex state management code
- **Pause/resume capabilities** enabling human-in-the-loop at every phase
- **Managed infrastructure** reducing operational overhead
- **TypeScript-native** seamless integration with existing Next.js codebase

The conceptual mapping is straightforward: each academic phase becomes a workflow step, state accumulates artifacts across phases, and user checkpoints are natural pause points. This architecture provides a solid foundation for implementing a robust, scalable academic paper generation system tailored for Indonesian academic standards.
