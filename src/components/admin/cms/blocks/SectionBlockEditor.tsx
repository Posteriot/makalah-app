"use client"

import { useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  Bold,
  Italic,
  List,
  NumberedListLeft,
  QuoteMessage,
  Link as LinkIcon,
  MediaImage,
  Undo,
  Redo,
} from "iconoir-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionBlock = {
  type: "section"
  title: string
  description?: string
  paragraphs?: string[]
  list?: {
    variant: "bullet" | "numbered"
    items: Array<{ text: string; subItems?: string[] }>
  }
  richContent?: string
}

type Props = {
  block: SectionBlock
  onChange: (block: SectionBlock) => void
  userId: Id<"users">
}

// ---------------------------------------------------------------------------
// Legacy content converter
// ---------------------------------------------------------------------------

function convertLegacyToTipTap(block: SectionBlock): string {
  const nodes: Record<string, unknown>[] = []

  if (block.description) {
    nodes.push({
      type: "paragraph",
      content: [{ type: "text", text: block.description }],
    })
  }

  if (block.paragraphs) {
    for (const p of block.paragraphs) {
      nodes.push({
        type: "paragraph",
        content: [{ type: "text", text: p }],
      })
    }
  }

  if (block.list) {
    const listType =
      block.list.variant === "numbered" ? "orderedList" : "bulletList"
    nodes.push({
      type: listType,
      content: block.list.items.map((item) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: item.text }],
          },
          ...(item.subItems?.length
            ? [
                {
                  type: "bulletList",
                  content: item.subItems.map((sub) => ({
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: sub }],
                      },
                    ],
                  })),
                },
              ]
            : []),
        ],
      })),
    })
  }

  return JSON.stringify({
    type: "doc",
    content: nodes.length ? nodes : [{ type: "paragraph" }],
  })
}

// ---------------------------------------------------------------------------
// Toolbar helpers (same pattern as TipTapEditor.tsx)
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-action transition-colors duration-50 ${
        isActive
          ? "bg-emerald-600/10 text-emerald-600"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px bg-border" />
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SectionBlockEditor({ block, onChange, userId }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateDocUploadUrl = useMutation(
    api.documentationSections.generateDocUploadUrl
  )
  const getImageUrl = useMutation(
    api.documentationSections.getDocImageUrlMutation
  )

  // Determine initial editor content: richContent > legacy conversion
  const initialContent = block.richContent
    ? block.richContent
    : block.paragraphs || block.list || block.description
      ? convertLegacyToTipTap(block)
      : undefined

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline",
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-action max-w-full my-4",
        },
      }),
    ],
    immediatelyRender: false,
    content: initialContent ? JSON.parse(initialContent) : undefined,
    editable: true,
    onUpdate: ({ editor: ed }) => {
      onChange({
        ...block,
        richContent: JSON.stringify(ed.getJSON()),
      })
    },
  })

  // Image upload handler
  async function handleImageUpload(file: File) {
    setIsUploading(true)
    try {
      const uploadUrl = await generateDocUploadUrl({ requestorId: userId })
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await res.json()
      const url = await getImageUrl({ storageId })
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
    e.target.value = ""
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Title
        </label>
        <input
          type="text"
          value={block.title}
          onChange={(e) => onChange({ ...block, title: e.target.value })}
          placeholder="Judul section (accordion)"
          className="w-full rounded-action border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>

      {/* Rich Content Editor */}
      <div>
        <label className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Konten
        </label>

        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="overflow-hidden rounded-action border border-border">
          {/* Toolbar */}
          {editor && (
            <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                isActive={editor.isActive("heading", { level: 2 })}
                title="Heading 2"
              >
                <span className="text-interface text-[10px] font-bold">
                  H2
                </span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                isActive={editor.isActive("heading", { level: 3 })}
                title="Heading 3"
              >
                <span className="text-interface text-[10px] font-bold">
                  H3
                </span>
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive("bold")}
                title="Bold"
              >
                <Bold className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive("italic")}
                title="Italic"
              >
                <Italic className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleBulletList().run()
                }
                isActive={editor.isActive("bulletList")}
                title="Bullet List"
              >
                <List className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleOrderedList().run()
                }
                isActive={editor.isActive("orderedList")}
                title="Ordered List"
              >
                <NumberedListLeft className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().toggleBlockquote().run()
                }
                isActive={editor.isActive("blockquote")}
                title="Blockquote"
              >
                <QuoteMessage className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => {
                  const url = window.prompt("URL:")
                  if (url) {
                    editor.chain().focus().setLink({ href: url }).run()
                  }
                }}
                isActive={editor.isActive("link")}
                title="Link"
              >
                <LinkIcon className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>

              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Sisipkan Gambar"
              >
                {isUploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
                ) : (
                  <MediaImage className="h-4 w-4" strokeWidth={1.5} />
                )}
              </ToolbarButton>

              <ToolbarSeparator />

              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                title="Undo"
              >
                <Undo className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                title="Redo"
              >
                <Redo className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
            </div>
          )}

          {/* Editor area */}
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none p-comfort text-interface text-sm leading-relaxed text-foreground [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:outline-none [&_.ProseMirror_h2]:text-interface [&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-medium [&_.ProseMirror_h3]:text-interface [&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-medium [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-primary [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_img]:rounded-action [&_.ProseMirror_img]:max-w-full"
          />
        </div>
      </div>
    </div>
  )
}
