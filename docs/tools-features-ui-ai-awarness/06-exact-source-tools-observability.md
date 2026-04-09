# Observability Patch: Exact Source Tools

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`

---

## File Changed

`src/lib/ai/paper-tools.ts` — added `console.log` calls to execute functions of 3 tools.

## Log Format

All logs use prefix `[EXACT-SOURCE]` followed by tool name, START/END marker, and structured fields.

### inspectSourceDocument

```
START: [EXACT-SOURCE] inspectSourceDocument START conversationId=<id> sourceId=<id> paragraphIndex=<n|none>
END:   [EXACT-SOURCE] inspectSourceDocument END conversationId=<id> sourceId=<id> success=<bool> mode=<metadata|full|paragraph> paragraphCount=<n> | reason=<not_found|paragraph_not_found|exception>
```

Fields: `conversationId`, `sourceId`, `paragraphIndex`, `success`, `mode` (on success), `paragraphCount` (on full mode), `reason` (on failure).

### quoteFromSource

```
START: [EXACT-SOURCE] quoteFromSource START conversationId=<id> sourceId=<id> query="<first 80 chars>"
END:   [EXACT-SOURCE] quoteFromSource END conversationId=<id> sourceId=<id> success=<bool> chunks=<n> | reason=<no_matches|exception>
```

Fields: `conversationId`, `sourceId`, `query` (truncated to 80 chars), `success`, `chunks` (on success), `reason` (on failure).

### searchAcrossSources

```
START: [EXACT-SOURCE] searchAcrossSources START conversationId=<id> query="<first 80 chars>" sourceType=<web|upload|all>
END:   [EXACT-SOURCE] searchAcrossSources END conversationId=<id> success=<bool> chunks=<n> uniqueSources=<n> | reason=<no_matches|exception>
```

Fields: `conversationId`, `query` (truncated to 80 chars), `sourceType`, `success`, `chunks` (on success), `uniqueSources` (on success), `reason` (on failure).

## Why This Is Sufficient for Audit

1. **Invocation tracking:** START log confirms the model called the tool and with what parameters.
2. **Outcome tracking:** END log confirms success/failure and result size (chunk count, source count).
3. **Correlation:** `conversationId` links tool calls to specific chat sessions for debugging.
4. **No payload bloat:** Query truncated to 80 chars, no full chunk content logged.
5. **Grep-friendly:** `[EXACT-SOURCE]` prefix allows `grep "\[EXACT-SOURCE\]"` to isolate all exact source tool activity from other logs.

## Behavior Unchanged

- No return values modified
- No error handling changed
- No tool descriptions changed
- No execution flow altered
- Logging is fire-and-forget (`console.log`), cannot affect tool outcome
