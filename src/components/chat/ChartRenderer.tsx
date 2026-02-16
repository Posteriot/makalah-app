"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
  content: string
}

function detectSeries(data: Record<string, string | number>[]): { dataKey: string; name: string; color: string }[] {
  if (!data || !data[0]) return []
  const numericKeys = Object.keys(data[0]).filter(
    (key) => key !== "name" && typeof data[0][key] === "number"
  )
  return numericKeys.map((key, i) => ({
    dataKey: key,
    name: key,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))
}

export function ChartRenderer({ content }: ChartRendererProps) {
  let config: ChartConfig
  try {
    config = JSON.parse(content)
  } catch {
    return (
      <div className="rounded-action border border-destructive/30 bg-destructive/5 p-4">
        <p className="mb-2 font-mono text-xs font-semibold text-destructive">
          Gagal parse chart JSON
        </p>
        <pre className="overflow-x-auto text-xs leading-relaxed text-muted-foreground">
          {content}
        </pre>
      </div>
    )
  }

  const { chartType, title, xAxisLabel, yAxisLabel, data } = config

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-action border border-destructive/30 bg-destructive/5 p-4">
        <p className="font-mono text-xs text-destructive">
          Data chart kosong atau tidak valid.
        </p>
      </div>
    )
  }

  const series = config.series?.map((s, i) => ({
    ...s,
    color: s.color || CHART_COLORS[i % CHART_COLORS.length],
    name: s.name || s.dataKey,
  })) ?? detectSeries(data)

  if (!["bar", "line", "pie"].includes(chartType)) {
    return (
      <div className="rounded-action border border-destructive/30 bg-destructive/5 p-4">
        <p className="font-mono text-xs text-destructive">
          Tipe chart tidak didukung: &quot;{chartType}&quot;. Gunakan &quot;bar&quot;, &quot;line&quot;, atau &quot;pie&quot;.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-action border border-border bg-background p-4">
      {title && (
        <h3 className="mb-3 text-center font-mono text-sm font-semibold text-foreground">
          {title}
        </h3>
      )}
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                outerRadius={120}
                dataKey={series[0]?.dataKey ?? "value"}
                nameKey="name"
                style={{ fontSize: "12px", fontFamily: "var(--font-geist-mono)" }}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  fontFamily: "var(--font-geist-mono)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: "11px",
                  fontFamily: "var(--font-geist-mono)",
                }}
              />
            </PieChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                label={
                  xAxisLabel
                    ? { value: xAxisLabel, position: "insideBottom", offset: -5, style: { fontSize: 11, fontFamily: "var(--font-geist-mono)" } }
                    : undefined
                }
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                label={
                  yAxisLabel
                    ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fontFamily: "var(--font-geist-mono)" } }
                    : undefined
                }
              />
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  fontFamily: "var(--font-geist-mono)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: "11px",
                  fontFamily: "var(--font-geist-mono)",
                }}
              />
              {series.map((s) => (
                <Line
                  key={s.dataKey}
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                label={
                  xAxisLabel
                    ? { value: xAxisLabel, position: "insideBottom", offset: -5, style: { fontSize: 11, fontFamily: "var(--font-geist-mono)" } }
                    : undefined
                }
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                label={
                  yAxisLabel
                    ? { value: yAxisLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fontFamily: "var(--font-geist-mono)" } }
                    : undefined
                }
              />
              <Tooltip
                contentStyle={{
                  fontSize: "12px",
                  fontFamily: "var(--font-geist-mono)",
                  borderRadius: "8px",
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: "11px",
                  fontFamily: "var(--font-geist-mono)",
                }}
              />
              {series.map((s) => (
                <Bar
                  key={s.dataKey}
                  dataKey={s.dataKey}
                  name={s.name}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
