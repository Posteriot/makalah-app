/**
 * ChatMiniFooter - Minimal footer for chat workspace
 *
 * Design: Mechanical Grace
 * Reference: docs/makalah-design-system/docs/ai-elements.md
 *
 * Specs:
 * - Single line copyright
 * - Geist Mono typography (text-interface utility)
 * - No logo, brand name only
 * - Height: ~24-32px (h-8)
 * - Industrial minimal aesthetic
 */
export function ChatMiniFooter() {
  return (
    <footer className="h-[var(--shell-footer-h)] px-4 flex items-center justify-end border-t border-[color:var(--chat-border)] bg-[var(--chat-sidebar)] shrink-0">
      <span className="text-interface text-[10px] text-[var(--chat-muted-foreground)] tracking-wider uppercase">
        &copy; {new Date().getFullYear()} Makalah AI
      </span>
    </footer>
  )
}

export default ChatMiniFooter
