Mermaid Diagrams + Chart Artifacts Implementation Plan

 For Claude: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

 Goal: Tambah rendering Mermaid diagram di chat + chart artifacts (Bar, Line, Pie) via existing createArtifact tool call.

 Architecture: Dua fitur independen. Mermaid = extend MarkdownRenderer code block rendering, lazy-loaded via next/dynamic. Chart = extend artifact system (type: "chart", format: "json"), rendered via
 Recharts di ArtifactViewer.

 Tech Stack: mermaid (lazy-loaded, ~300KB), recharts (~50KB tree-shaken), dompurify (sanitize mermaid SVG output), Next.js dynamic imports

 ---
 Fitur A: Mermaid Diagram Rendering

 Mermaid diagrams di-render inline di chat bubble (MarkdownRenderer) dan artifact viewer. AI output ```mermaid fenced code blocks, parser udah capture language field — tinggal conditional render.

 Task 1: Install mermaid + dompurify dependencies

 Files:
 - Modify: package.json

 Step 1: Install

 npm install mermaid dompurify
 npm install --save-dev @types/dompurify

 Step 2: Verify

 npm ls mermaid dompurify

 Step 3: Commit

 git add package.json package-lock.json
 git commit -m "chore: add mermaid and dompurify dependencies"

 ---
 Task 2: Create MermaidRenderer component (lazy-loadable)

 Files:
 - Create: src/components/chat/MermaidRenderer.tsx

 Step 1: Write the component

 Client component yang:
 - Takes code: string prop (raw mermaid syntax)
 - Uses mermaid.render() in a useEffect to produce SVG
 - Sanitizes SVG output with DOMPurify before rendering (prevent XSS from mermaid output)
 - Shows loading skeleton while rendering
 - Shows error fallback (raw code in <pre>) if mermaid parse fails
 - Supports dark mode via mermaid theme config (theme: 'dark' when dark class on <html>)
 - Uses useId() for unique mermaid element IDs (prevent collisions when multiple diagrams)

 // Key structure:
 "use client"
 import { useEffect, useId, useState } from "react"
 import mermaid from "mermaid"
 import DOMPurify from "dompurify"

 interface MermaidRendererProps {
   code: string
 }

 export function MermaidRenderer({ code }: MermaidRendererProps) {
   const id = useId().replace(/:/g, "-")
   const [svg, setSvg] = useState<string | null>(null)
   const [error, setError] = useState<string | null>(null)

   useEffect(() => {
     const isDark = document.documentElement.classList.contains("dark")
     mermaid.initialize({
       startOnLoad: false,
       theme: isDark ? "dark" : "default",
       fontFamily: "var(--font-geist-mono)",
     })

     mermaid.render(`mermaid-${id}`, code)
       .then(({ svg: rawSvg }) => {
         const sanitized = DOMPurify.sanitize(rawSvg, { USE_PROFILES: { svg: true } })
         setSvg(sanitized)
         setError(null)
       })
       .catch((err) => { setError(String(err)); setSvg(null) })
   }, [code, id])

   if (error) {
     return (
       <pre className="my-2 overflow-x-auto rounded-action bg-background/50 p-3 text-xs leading-relaxed">
         <code>{code}</code>
       </pre>
     )
   }
   if (!svg) return <div className="my-2 h-32 animate-pulse rounded-action bg-muted" />
   return <div className="my-2 overflow-x-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
 }

 Security note: DOMPurify.sanitize() with USE_PROFILES: { svg: true } strips any malicious content while preserving valid SVG elements from mermaid output.

 Step 2: Verify file compiles

 npx tsc --noEmit

 Step 3: Commit

 git add src/components/chat/MermaidRenderer.tsx
 git commit -m "feat: add MermaidRenderer component with DOMPurify sanitization and dark mode"

 ---
 Task 3: Integrate Mermaid into MarkdownRenderer

 Files:
 - Modify: src/components/chat/MarkdownRenderer.tsx

 Step 1: Add dynamic import at top of file

 import dynamic from "next/dynamic"

 const MermaidRenderer = dynamic(
   () => import("./MermaidRenderer").then((m) => ({ default: m.MermaidRenderer })),
   { ssr: false, loading: () => <div className="my-2 h-32 animate-pulse rounded-action bg-muted" /> }
 )

 Step 2: Update renderBlocks() code case (currently at ~line 787)

 Change from:
 case "code":
   return (
     <Fragment key={k}>
       <pre className="...">
         <code>{block.code}</code>
       </pre>
       {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
     </Fragment>
   )

 To:
 case "code":
   if (block.language === "mermaid") {
     return (
       <Fragment key={k}>
         <MermaidRenderer code={block.code} />
         {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
       </Fragment>
     )
   }
   return (
     <Fragment key={k}>
       <pre className="...">
         <code>{block.code}</code>
       </pre>
       {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
     </Fragment>
   )

 Step 3: Type check + build

 npx tsc --noEmit && npm run build

 Step 4: Commit

 git add src/components/chat/MarkdownRenderer.tsx
 git commit -m "feat: render mermaid diagrams in chat via lazy-loaded MermaidRenderer"

 ---
 Fitur B: Chart Artifacts (Recharts)

 Charts di-render di ArtifactViewer panel. AI call createArtifact({ type: "chart", format: "json", content: JSON.stringify(chartConfig) }). Content adalah JSON string dengan chart config.

 Task 4: Install recharts dependency

 Files:
 - Modify: package.json

 Step 1: Install

 npm install recharts

 Step 2: Verify

 npm ls recharts

 Step 3: Commit

 git add package.json package-lock.json
 git commit -m "chore: add recharts dependency for chart artifacts"

 ---
 Task 5: Extend artifact schema — add "chart" type and "json" format

 Files:
 - Modify: convex/schema.ts (lines ~193-200 type union, lines ~206-213 format union)
 - Modify: convex/artifacts.ts (lines 8-15 artifactTypeValidator, lines 17-24 artifactFormatValidator)

 Step 1: Update convex/schema.ts

 Add v.literal("chart") to artifact type union (after "formula").
 Add v.literal("json") to format union (after "typescript").

 Step 2: Update convex/artifacts.ts

 Add v.literal("chart") to artifactTypeValidator.
 Add v.literal("json") to artifactFormatValidator.

 Step 3: Verify Convex schema compiles

 npx tsc --noEmit

 Step 4: Commit

 git add convex/schema.ts convex/artifacts.ts
 git commit -m "feat: extend artifact schema with chart type and json format"

 ---
 Task 6: Extend createArtifact tool — add "chart" to Zod enum + description

 Files:
 - Modify: src/app/api/chat/route.ts (line ~810 type enum, line ~817 format enum, tool description)

 Step 1: Update Zod schema in createArtifact tool

 Add "chart" to type enum:
 type: z.enum(["code", "outline", "section", "table", "citation", "formula", "chart"])

 Add "json" to format enum:
 format: z.enum(["markdown", "latex", "python", "r", "javascript", "typescript", "json"]).optional()

 Step 2: Update tool description — add chart usage instructions:

 Append to existing description:

 For charts/graphs: use type "chart" with format "json". Content must be a valid JSON string:
 {
   "chartType": "bar" | "line" | "pie",
   "title": "Chart title",
   "xAxisLabel": "optional X axis label",
   "yAxisLabel": "optional Y axis label",
   "data": [{ "name": "Label", "value": 100 }, ...],
   "series": [{ "dataKey": "value", "name": "Series name", "color": "#hex" }]
 }
 For pie charts: data items need "name" and "value" fields only.
 For bar/line: data items have "name" (x-axis label) and numeric field(s). Use series array to define which fields to plot.

 Step 3: Type check

 npx tsc --noEmit

 Step 4: Commit

 git add src/app/api/chat/route.ts
 git commit -m "feat: extend createArtifact tool with chart type and json format"

 ---
 Task 7: Create ChartRenderer component

 Files:
 - Create: src/components/chat/ChartRenderer.tsx

 Step 1: Define chart config interface and component

 "use client"

 import {
   BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
 } from "recharts"

 interface ChartConfig {
   chartType: "bar" | "line" | "pie"
   title?: string
   xAxisLabel?: string
   yAxisLabel?: string
   data: Record<string, string | number>[]
   series?: { dataKey: string; name?: string; color?: string }[]
 }

 const CHART_COLORS = [
   "#f59e0b", // amber (primary brand)
   "#10b981", // emerald (secondary brand)
   "#0ea5e9", // sky (AI identity)
   "#8b5cf6", // violet
   "#f43f5e", // rose
   "#06b6d4", // cyan
 ]

 interface ChartRendererProps {
   content: string // JSON string
 }

 Component logic:
 - Parse JSON from content with try-catch
 - On parse error: show error state with raw JSON in <pre>
 - Validate chartType is one of bar/line/pie
 - Auto-detect series from data keys if series not provided
 - Render appropriate Recharts component in <ResponsiveContainer width="100%" height={350}>
 - Styling: font-mono for axis labels, rounded-action container, border border-border

 Step 2: Verify file compiles

 npx tsc --noEmit

 Step 3: Commit

 git add src/components/chat/ChartRenderer.tsx
 git commit -m "feat: add ChartRenderer component with bar, line, pie support"

 ---
 Task 8: Integrate ChartRenderer into ArtifactViewer + FullsizeArtifactModal

 Files:
 - Modify: src/components/chat/ArtifactViewer.tsx (lines ~309, ~408-434)
 - Modify: src/components/chat/FullsizeArtifactModal.tsx (lines ~381, ~636-662)

 Step 1: ArtifactViewer — add chart detection + rendering

 Add import:
 import { ChartRenderer } from "./ChartRenderer"

 Add detection (near line 309):
 const isChartArtifact = artifact.type === "chart"

 Add rendering branch BEFORE isCodeArtifact check (line ~408):
 {isChartArtifact ? (
   <ChartRenderer content={artifact.content} />
 ) : isCodeArtifact && language ? (
   // existing SyntaxHighlighter ...
 ) : shouldRenderMarkdown ? (
   // existing MarkdownRenderer ...
 ) : (
   // existing pre fallback ...
 )}

 Disable Refrasa for chart artifacts (not applicable).

 Step 2: FullsizeArtifactModal — same pattern

 Add import + detection + rendering branch.

 Update contentTypeLabel:
 const contentTypeLabel = isChartArtifact
   ? "Chart"
   : isCodeArtifact
     ? `Code${language ? ` • ${language}` : ""}`
     : shouldRenderMarkdown
       ? "Markdown"
       : "Teks"

 Step 3: Type check + build

 npx tsc --noEmit && npm run build

 Step 4: Commit

 git add src/components/chat/ArtifactViewer.tsx src/components/chat/FullsizeArtifactModal.tsx
 git commit -m "feat: render chart artifacts in ArtifactViewer and FullsizeModal"

 ---
 Task 9: Final verification + build

 Step 1: Type check

 npx tsc --noEmit
 Expected: zero errors

 Step 2: Production build

 npm run build
 Expected: build succeeds

 Step 3: Manual test (Mermaid)

 Run npm run dev, open chat. Ask AI:
 Buatkan diagram flowchart sederhana menggunakan mermaid tentang proses peer review
 Expected: Mermaid diagram renders inline in chat bubble as SVG (not raw code).

 Step 4: Manual test (Bar Chart)

 Buatkan chart perbandingan jumlah publikasi per tahun 2020-2024: tahun 2020=150, 2021=200, 2022=280, 2023=350, 2024=420. Gunakan bar chart.
 Expected: AI calls createArtifact with type "chart". Bar chart renders in ArtifactViewer panel.

 Step 5: Manual test (Pie Chart)

 Buatkan pie chart distribusi metode penelitian: kualitatif 35%, kuantitatif 45%, mixed methods 20%.

 Step 6: Regression check

 - Citations still render correctly in chat
 - Bare URL badges still work
 - Non-mermaid code blocks render as plain <pre><code>
 - Existing artifacts (markdown, code, outline) still render correctly
 - Refrasa disabled for chart artifacts

 ---
 Files Summary

 Create (2 files):

 - src/components/chat/MermaidRenderer.tsx — Mermaid SVG renderer with DOMPurify sanitization
 - src/components/chat/ChartRenderer.tsx — Recharts wrapper (bar, line, pie)

 Modify (5 files):

 - src/components/chat/MarkdownRenderer.tsx — Dynamic import + mermaid code block branch
 - src/app/api/chat/route.ts — Extend createArtifact Zod enum + description
 - convex/schema.ts — Add "chart" type + "json" format to artifact unions
 - convex/artifacts.ts — Add "chart" + "json" to validators
 - src/components/chat/ArtifactViewer.tsx — Chart rendering branch
 - src/components/chat/FullsizeArtifactModal.tsx — Chart rendering branch (fullsize)

 Dependencies (3 packages):

 - mermaid — Diagram rendering (~300KB, lazy-loaded via next/dynamic)
 - dompurify + @types/dompurify — Sanitize mermaid SVG output (prevent XSS)
 - recharts — Chart library (~50KB tree-shaken)

 Existing utilities reused (no changes needed):

 - retryMutation() from src/lib/convex/retry.ts — Already used by createArtifact
 - fetchMutationWithToken() — Already used by createArtifact
 - extractArtifactSignals() in MessageBubble — Already handles createArtifact tool results
 - ArtifactIndicator — Already displays artifact creation results
 - ToolStateIndicator — Already has "Membuat artifak" label for createArtifact