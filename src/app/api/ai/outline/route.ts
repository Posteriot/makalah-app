import { NextRequest, NextResponse } from "next/server"
import { basicGenerateText } from "@/lib/ai/client"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const topic = typeof body.topic === "string" ? body.topic : ""

  if (!topic) {
    return NextResponse.json(
      { error: "Missing `topic` in request body" },
      { status: 400 }
    )
  }

  const prompt = [
    "You are an assistant that helps plan academic papers.",
    "Generate a structured outline (sections and subsections) for a paper about:",
    `"${topic}".`,
  ].join(" ")

  const text = await basicGenerateText(prompt)

  return NextResponse.json({ outline: text })
}

