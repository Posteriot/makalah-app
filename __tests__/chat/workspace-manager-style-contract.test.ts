import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const projectRoot = resolve(__dirname, "..", "..")
const workspaceManagerFiles = [
  "src/components/chat/workspace-manager/WorkspaceManagerShell.tsx",
  "src/components/chat/workspace-manager/WorkspaceManagerHeader.tsx",
  "src/components/chat/workspace-manager/WorkspaceManagerSidebar.tsx",
  "src/components/chat/workspace-manager/WorkspaceManagerConversationPanel.tsx",
  "src/components/chat/workspace-manager/ConversationManagerTable.tsx",
  "src/components/chat/workspace-manager/DeleteSelectedDialog.tsx",
  "src/components/chat/workspace-manager/DeleteAllConversationsDialog.tsx",
]

describe("workspace manager style contract", () => {
  it("memakai token chat dan tidak membawa amber atau token core", () => {
    for (const relativePath of workspaceManagerFiles) {
      const source = readFileSync(resolve(projectRoot, relativePath), "utf8")

      expect(source).toMatch(/--chat-/)
      expect(source.toLowerCase()).not.toContain("amber")
      expect(source).not.toMatch(/core[-_]/)
      expect(source).not.toContain("bg-slate-")
      expect(source).not.toContain("text-slate-")
    }
  })
})
