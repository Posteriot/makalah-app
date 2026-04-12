/**
 * Naskah DOCX export route.
 *
 * POST /api/naskah/export/word
 * Body: { title: string, sections: NaskahSection[] }
 *
 * Returns a DOCX response (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
 * The body is the snapshot the user is currently viewing — passed
 * verbatim from the client so the downloaded file matches what's on
 * screen at click time, with no race against a newer revision sitting
 * in Convex.
 *
 * Auth: requires a logged-in BetterAuth session.
 *
 * Response codes:
 * - 200: DOCX stream
 * - 400: malformed body
 * - 401: not signed in
 * - 500: build error
 */

import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth-server"
import {
  generateNaskahWordStream,
  getNaskahWordFilename,
} from "@/lib/naskah/export/naskah-word-builder"
import type { NaskahSection } from "@/lib/naskah/types"

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export async function POST(request: NextRequest) {
  try {
    const isAuthed = await isAuthenticated()
    if (!isAuthed) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please sign in" },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => null)
    const validation = validateBody(body)
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      )
    }

    const { title, sections } = validation
    const stream = await generateNaskahWordStream({ title, sections })
    const filename = getNaskahWordFilename(title)

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[Naskah Word Export] Server error:", error)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

interface ValidationOk {
  ok: true
  title: string
  sections: NaskahSection[]
}

interface ValidationError {
  ok: false
  error: string
}

/**
 * Lightweight runtime shape check on the request body. Same approach
 * as the PDF route — see the comment there for rationale.
 */
function validateBody(body: unknown): ValidationOk | ValidationError {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" }
  }
  const record = body as Record<string, unknown>

  if (typeof record.title !== "string" || record.title.trim().length === 0) {
    return { ok: false, error: "title is required" }
  }
  if (!Array.isArray(record.sections)) {
    return { ok: false, error: "sections must be an array" }
  }

  const sections: NaskahSection[] = []
  for (const raw of record.sections) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "each section must be an object" }
    }
    const s = raw as Record<string, unknown>
    if (typeof s.key !== "string" || typeof s.label !== "string") {
      return { ok: false, error: "section.key and section.label must be strings" }
    }
    if (typeof s.content !== "string") {
      return { ok: false, error: "section.content must be a string" }
    }
    sections.push({
      key: s.key as NaskahSection["key"],
      label: s.label as NaskahSection["label"],
      content: s.content,
      sourceStage:
        typeof s.sourceStage === "string"
          ? (s.sourceStage as NaskahSection["sourceStage"])
          : (s.key as NaskahSection["sourceStage"]),
      sourceArtifactId:
        typeof s.sourceArtifactId === "string"
          ? (s.sourceArtifactId as NaskahSection["sourceArtifactId"])
          : undefined,
    })
  }

  return { ok: true, title: record.title, sections }
}
