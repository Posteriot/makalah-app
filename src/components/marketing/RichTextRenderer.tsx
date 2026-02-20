"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"

type RichTextRendererProps = {
  content: string // TipTap JSON string from DB
}

export function RichTextRenderer({ content }: RichTextRendererProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-primary underline hover:text-primary/80 transition-colors",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: content ? JSON.parse(content) : undefined,
    editable: false,
  })

  if (!editor) return null

  return (
    <EditorContent
      editor={editor}
      className="prose prose-sm max-w-none text-narrative text-sm leading-relaxed text-muted-foreground [&_.ProseMirror]:outline-none [&_.ProseMirror_h1]:text-narrative [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-medium [&_.ProseMirror_h1]:tracking-tight [&_.ProseMirror_h1]:text-foreground [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:mt-8 [&_.ProseMirror_h2]:text-interface [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-medium [&_.ProseMirror_h2]:text-foreground [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h3]:text-interface [&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-medium [&_.ProseMirror_h3]:text-foreground [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_p]:mb-4 [&_.ProseMirror_p]:break-words [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:space-y-2 [&_.ProseMirror_ul]:mb-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:space-y-2 [&_.ProseMirror_ol]:mb-4 [&_.ProseMirror_li]:break-words [&_.ProseMirror_li]:leading-relaxed [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_strong]:font-semibold [&_.ProseMirror_strong]:text-foreground [&_.ProseMirror_code]:rounded-badge [&_.ProseMirror_code]:bg-muted [&_.ProseMirror_code]:px-1.5 [&_.ProseMirror_code]:py-0.5 [&_.ProseMirror_code]:text-interface [&_.ProseMirror_code]:text-xs"
    />
  )
}
