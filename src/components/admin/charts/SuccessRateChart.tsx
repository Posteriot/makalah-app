"use client"

import { cn } from "@/lib/utils"

type DailyRate = {
  date: string
  rate: number
  total: number
}

type SuccessRateChartProps = {
  dailyRates: DailyRate[]
  successRate: number
  totalRequests: number
  failureCount: number
}

function getRateColor(rate: number): string {
  if (rate >= 95) return "text-emerald-600 dark:text-emerald-400"
  if (rate >= 80) return "text-amber-600 dark:text-amber-400"
  return "text-rose-600 dark:text-rose-400"
}

function getStrokeColor(rate: number): string {
  if (rate >= 95) return "#059669"
  if (rate >= 80) return "#d97706"
  return "#e11d48"
}

export function SuccessRateChart({
  dailyRates,
  successRate,
  totalRequests,
  failureCount,
}: SuccessRateChartProps) {
  const rates = dailyRates.map((d) => d.rate)
  const minRate = rates.length > 0 ? Math.min(...rates) : 0
  const yMin = Math.max(0, minRate - 5)
  const yMax = 100
  const yRange = yMax - yMin || 1

  const width = 200
  const height = 60
  const padX = 4
  const padY = 4
  const plotW = width - padX * 2
  const plotH = height - padY * 2

  const points = rates.map((rate, i) => {
    const x = padX + (rates.length > 1 ? (i / (rates.length - 1)) * plotW : plotW / 2)
    const y = padY + plotH - ((rate - yMin) / yRange) * plotH
    return `${x},${y}`
  })

  const polylinePoints = points.join(" ")
  const strokeColor = getStrokeColor(successRate)

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-3xl font-semibold",
            getRateColor(successRate)
          )}
        >
          {successRate.toFixed(1)}%
        </span>
        <span className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
          TINGKAT KEBERHASILAN
        </span>
      </div>

      <div className="mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`Grafik tingkat keberhasilan 7 hari: ${successRate.toFixed(1)}%`}
        >
          {/* Grid lines */}
          <line
            x1={padX}
            y1={padY}
            x2={width - padX}
            y2={padY}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={0.5}
          />
          <line
            x1={padX}
            y1={padY + plotH / 2}
            x2={width - padX}
            y2={padY + plotH / 2}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={0.5}
          />
          <line
            x1={padX}
            y1={padY + plotH}
            x2={width - padX}
            y2={padY + plotH}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={0.5}
          />

          {/* Sparkline */}
          {rates.length > 1 && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {points.map((point, i) => {
            const [cx, cy] = point.split(",")
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={2.5}
                fill={strokeColor}
              />
            )
          })}
        </svg>
      </div>

      <p className="mt-2 font-mono text-xs text-muted-foreground">
        {totalRequests.toLocaleString("id-ID")} permintaan, {failureCount} gagal
      </p>
    </div>
  )
}
