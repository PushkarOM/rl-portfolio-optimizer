import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, ReferenceLine
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import { getRun, getTrainingRuns } from "@/api/trainingApi"

// ── helpers ────────────────────────────────────────────────────────────────

const ALGO_STYLES = {
  ppo: "bg-green-500",
  dqn: "bg-yellow-500",
  a2c: "bg-pink-500",
  sac: "bg-cyan-500",
}

const fmt = (iso) => iso
  ? new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  : "—"

// Smooth an array with a rolling average window
const smooth = (arr, window = 20) =>
  arr.map((_, i) => {
    const start = Math.max(0, i - window)
    const slice = arr.slice(start, i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })

// Downsample array to max N points evenly
const downsample = (arr, max = 500) => {
  if (arr.length <= max) return arr
  const step = Math.ceil(arr.length / max)
  return arr.filter((_, i) => i % step === 0)
}

// Calculate drawdown series from portfolio curve
const calcDrawdown = (curve) => {
  let peak = curve[0]
  return curve.map(v => {
    if (v > peak) peak = v
    return peak === 0 ? 0 : ((v - peak) / peak) * 100
  })
}

// Build chart-ready data arrays
const buildChartData = (metrics) => {
  if (!metrics) return { portfolio: [], reward: [], drawdown: [] }

  const pCurve   = metrics.portfolio_curve  ?? []
  const rCurve   = metrics.reward_curve     ?? []
  const ddCurve  = calcDrawdown(pCurve)
  const rSmooth  = smooth(rCurve, 20)

  const len = Math.max(pCurve.length, rCurve.length)

  const raw = Array.from({ length: len }, (_, i) => ({
    step:      i + 1,
    portfolio: pCurve[i]  ?? null,
    reward:    rCurve[i]  ?? null,
    rSmooth:   rSmooth[i] ?? null,
    drawdown:  ddCurve[i] ?? null,
  }))

  return downsample(raw, 500)
}

// Compute summary metrics from result_metrics
const computeStats = (metrics) => {
  if (!metrics) return null

  const curve   = metrics.portfolio_curve ?? []
  const rewards = metrics.reward_curve    ?? []
  const dd      = calcDrawdown(curve)

  const totalReturn   = curve.length > 0
    ? ((curve[curve.length - 1] - curve[0]) / curve[0]) * 100
    : 0
  const maxDrawdown   = Math.min(...dd)
  const avgReward     = rewards.length > 0
    ? rewards.reduce((a, b) => a + b, 0) / rewards.length
    : 0
  const bestReward    = Math.max(...rewards)
  const worstReward   = Math.min(...rewards)
  const winRate       = rewards.length > 0
    ? (rewards.filter(r => r > 0).length / rewards.length) * 100
    : 0

  return {
    finalValue:   metrics.final_portfolio_value ?? curve[curve.length - 1] ?? 0,
    totalReturn,
    maxDrawdown,
    avgReward,
    bestReward,
    worstReward,
    winRate,
    totalSteps:   metrics.total_steps ?? curve.length,
    timesteps:    metrics.total_timesteps_trained ?? 0,
  }
}

// ── sub components ─────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, positive }) => (
  <div className="rounded-md border px-4 py-3 text-center space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-lg font-bold font-mono ${
      positive === true  ? "text-green-500" :
      positive === false ? "text-red-500"   : ""
    }`}>
      {value}
    </p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
)

const ChartCard = ({ title, children, description }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
)

const CustomTooltip = ({ active, payload, label, prefix = "", suffix = "", decimals = 4 }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-md space-y-1">
      <p className="text-muted-foreground">Step {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {prefix}{Number(p.value).toFixed(decimals)}{suffix}
        </p>
      ))}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────

const Results = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [completedRuns, setCompletedRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(
    searchParams.get("run") ?? ""
  )
  const [run, setRun]         = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // Derived
  const chartData = buildChartData(run?.result_metrics)
  const stats     = computeStats(run?.result_metrics)

  // ── fetch all completed runs for the selector ──────────────────────────
  useEffect(() => {
    getTrainingRuns().then(res => {
      const done = res.data.filter(r => r.status === "completed")
      setCompletedRuns(done)

      // If no run selected yet, default to most recent completed
      if (!selectedRunId && done.length > 0) {
        setSelectedRunId(String(done[0].id))
      }
    })
  }, [])

  // ── fetch selected run detail ──────────────────────────────────────────
  const fetchRun = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await getRun(id)
      setRun(res.data)
    } catch {
      setError("Failed to load run.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedRunId) {
      setSearchParams({ run: selectedRunId })
      fetchRun(selectedRunId)
    }
  }, [selectedRunId])

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Results</h1>

      {/* Run selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">

            <div className="flex-1 space-y-1">
              <label className="text-sm text-muted-foreground">Select Run</label>
              <Select
                value={selectedRunId}
                onValueChange={setSelectedRunId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a completed run" />
                </SelectTrigger>
                <SelectContent>
                  {completedRuns.length === 0
                    ? <SelectItem value="__none" disabled>No completed runs</SelectItem>
                    : completedRuns.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          #{r.id} — {r.experiment_name} · {r.model_name}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Run meta */}
            {run && (
              <div className="flex flex-wrap gap-2 items-center text-sm">
                <Badge className={`${ALGO_STYLES[run.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                  {run.model_algorithm}
                </Badge>
                <span className="text-muted-foreground">
                  {run.dataset_name}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  Started {fmt(run.started_at)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  Completed {fmt(run.completed_at)}
                </span>
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Loading / error states */}
      {loading && (
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading run data...
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!loading && run && stats && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <StatCard
              label="Final Value"
              value={`${stats.finalValue.toFixed(4)}x`}
              positive={stats.finalValue >= 1}
            />
            <StatCard
              label="Total Return"
              value={`${stats.totalReturn >= 0 ? "+" : ""}${stats.totalReturn.toFixed(2)}%`}
              positive={stats.totalReturn >= 0}
            />
            <StatCard
              label="Max Drawdown"
              value={`${stats.maxDrawdown.toFixed(2)}%`}
              positive={false}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              positive={stats.winRate >= 50}
            />
            <StatCard
              label="Avg Reward"
              value={stats.avgReward.toFixed(6)}
              positive={stats.avgReward >= 0}
            />
            <StatCard
              label="Best Reward"
              value={stats.bestReward.toFixed(4)}
              positive={true}
            />
            <StatCard
              label="Worst Reward"
              value={stats.worstReward.toFixed(4)}
              positive={false}
            />
            <StatCard
              label="Steps"
              value={stats.totalSteps.toLocaleString()}
              sub={`${(stats.timesteps / 1000).toFixed(0)}k timesteps`}
            />
          </div>

          {/* Chart 1 — Portfolio Value */}
          <ChartCard
            title="Portfolio Value"
            description="Drag on the chart to zoom into a specific range. Portfolio starts at 1.0 (100%)."
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${v}`}
                  label={{ value: "Step", position: "insideBottomRight", offset: -5, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${v.toFixed(2)}x`}
                  width={60}
                />
                <Tooltip content={<CustomTooltip suffix="x" decimals={4} />} />
                <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Brush
                  dataKey="step"
                  height={24}
                  stroke="hsl(var(--border))"
                  fill="hsl(var(--muted))"
                  travellerWidth={8}
                />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                  name="Portfolio"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 2 — Reward */}
          <ChartCard
            title="Reward per Step"
            description="Raw reward (faint) vs 20-step smoothed reward (bold). Positive trend means the agent is improving."
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={70}
                  tickFormatter={v => v.toFixed(4)}
                />
                <Tooltip content={<CustomTooltip decimals={6} />} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Brush
                  dataKey="step"
                  height={24}
                  stroke="hsl(var(--border))"
                  fill="hsl(var(--muted))"
                  travellerWidth={8}
                />
                {/* Raw — faint */}
                <Line
                  type="monotone"
                  dataKey="reward"
                  stroke="#a855f7"
                  dot={false}
                  strokeWidth={1}
                  strokeOpacity={0.3}
                  name="Raw Reward"
                  connectNulls
                />
                {/* Smoothed — bold */}
                <Line
                  type="monotone"
                  dataKey="rSmooth"
                  stroke="#a855f7"
                  dot={false}
                  strokeWidth={2.5}
                  name="Smoothed"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 3 — Drawdown */}
          <ChartCard
            title="Drawdown"
            description="How far the portfolio dropped from its peak at each step. Closer to 0% is better."
          >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={60}
                  tickFormatter={v => `${v.toFixed(1)}%`}
                />
                <Tooltip content={<CustomTooltip suffix="%" decimals={2} />} />
                <Brush
                  dataKey="step"
                  height={24}
                  stroke="hsl(var(--border))"
                  fill="hsl(var(--muted))"
                  travellerWidth={8}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.15}
                  dot={false}
                  strokeWidth={1.5}
                  name="Drawdown"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Model params used */}
          {run.model_parameters && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Model Parameters Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {Object.entries(run.model_parameters).map(([key, val]) => (
                    <div key={key} className="rounded-md border px-3 py-2">
                      <p className="text-xs text-muted-foreground">{key}</p>
                      <p className="text-sm font-mono font-medium">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </>
      )}

      {/* Empty state */}
      {!loading && !run && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
          <p className="text-muted-foreground">No run selected.</p>
          <p className="text-sm text-muted-foreground">
            Select a completed run from the dropdown above.
          </p>
        </div>
      )}

    </div>
  )
}

export default Results