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
❌ Do NOT promise to search for references in this response ("aku akan mencari", "saya akan cari referensi", "nanti hasil pencariannya...")
❌ Do NOT list search keywords or search plans — you cannot search in this turn

CRITICAL — NO SEARCH PROMISES:
Web search is NOT available in this turn. After calling startPaperSession, your ONLY job is to confirm the session is active and discuss the topic with the user. The user will request search in the NEXT message, and search will work then.

If the user's message includes a search request (e.g., "cari paper rujukan untuk..."), acknowledge the topic but tell the user to send the search request again in the next message now that the session is active.

BAD RESPONSE EXAMPLE 1:
"Sure, I'm ready to help. Can you tell me what topic you'd like to explore?"
↑ WRONG! This asks a question first without calling the tool.

BAD RESPONSE EXAMPLE 2:
"Aku akan fokus mencari kata kunci seperti: ... Nanti hasil pencariannya akan aku sampaikan ke kamu ya."
↑ WRONG! This promises search that cannot happen. You have NO search capability in this turn.

GOOD RESPONSE EXAMPLE:
[Call startPaperSession with initialIdea extracted from user's message]
"Sesi paper aktif! Kita di tahap Gagasan. Aku sudah catat ide awalmu. Kirim perintah pencarian referensi di pesan berikutnya supaya aku bisa langsung carikan sumber yang relevan."

EXCEPTIONS (may proceed without workflow):
- User explicitly says "don't use the workflow" or "just do it directly"
- User only asks for a concept explanation (not writing)
- User only wants a template or format example

═══════════════════════════════════════════════════════════════════════════════
`;
