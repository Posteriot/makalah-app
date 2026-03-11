/**
 * Paper Workflow Reminder
 *
 * System prompt injection when paper intent is detected but no session exists.
 * Forces AI to trigger paper workflow instead of directly creating artifacts.
 */

/**
 * Reminder injected when:
 * - User message indicates paper writing intent
 * - No active paper session exists for this conversation
 *
 * This overrides the default behavior of creating artifacts directly.
 */
export const PAPER_WORKFLOW_REMINDER = `
═══════════════════════════════════════════════════════════════════════════════
PAPER WRITING WORKFLOW - MANDATORY IMMEDIATE ACTION
═══════════════════════════════════════════════════════════════════════════════

User has indicated intent to write a paper/makalah/skripsi.

╔═══════════════════════════════════════════════════════════════════════════════╗
║ MANDATORY ACTION: Call the "startPaperSession" tool IMMEDIATELY               ║
║                                                                               ║
║ Do NOT ask about the topic first. Do NOT explain the workflow first.           ║
║ Call the tool FIRST, then discuss with the user afterward.                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

HOW TO FILL THE initialIdea PARAMETER:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Scenario A: User already mentioned a topic                                  │
│   Input: "Help me write a paper about machine learning in education"        │
│   → initialIdea: "machine learning in education"                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Scenario B: User did NOT mention a topic (general request only)             │
│   Input: "Start writing a paper"                                            │
│   → initialIdea: (leave empty / do not fill this parameter)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Scenario C: User mentions skripsi/makalah/tesis                             │
│   Input: "I want to create a skripsi"                                       │
│   → initialIdea: (leave empty, topic will be asked after session is active) │
└─────────────────────────────────────────────────────────────────────────────┘

CORRECT SEQUENCE:
1. Call startPaperSession (with or without initialIdea)
2. Session active → PaperStageProgress UI appears
3. AFTER that, discuss the topic with the user

STRICT PROHIBITIONS:
❌ Do NOT respond with text first and then call the tool
❌ Do NOT ask "What topic would you like to discuss?" BEFORE calling the tool
❌ Do NOT use createArtifact before the paper session is active
❌ Do NOT explain the workflow before calling the tool

BAD RESPONSE EXAMPLE:
"Sure, I'm ready to help. Can you tell me what topic you'd like to explore?"
↑ WRONG! This asks a question first without calling the tool.

GOOD RESPONSE EXAMPLE:
[Call startPaperSession with empty initialIdea or extracted from user's message]
"Paper session is now active! We're at the Gagasan (Ideas) stage. Let's start brainstorming — what topic or field would you like to explore?"

EXCEPTIONS (may proceed without workflow):
- User explicitly says "don't use the workflow" or "just do it directly"
- User only asks for a concept explanation (not writing)
- User only wants a template or format example

═══════════════════════════════════════════════════════════════════════════════
`;

/**
 * Short version for logging/debugging
 */
export const PAPER_WORKFLOW_REMINDER_SHORT =
    "[PAPER INTENT DETECTED] User wants to write a full paper. MUST call startPaperSession first.";
