import { useEffect, useState, useCallback, memo, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, ReferenceLine, Legend,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

import StatCard    from "@/components/results/StatCard"
import ChartCard   from "@/components/results/ChartCard"
import CustomTooltip from "@/components/results/CustomTooltip"

import { getRun, getTrainingRuns } from "@/api/trainingApi"

//  constants 

const ALGO_STYLES = {
  ppo: "bg-green-500",
  dqn: "bg-yellow-500",
  a2c: "bg-pink-500",
  sac: "bg-cyan-500",
}

//  helpers 

const fmt = (iso) => iso
  ? new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  : "—"

const fmtDuration = (start, end) => {
  if (!start || !end) return "—"
  const ms  = new Date(end) - new Date(start)
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`
}

// Smooth array with rolling average
const smooth = (arr, window = 20) =>
  arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - window), i + 1)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })

// Downsample to max N points
const downsample = (arr, max = 500) => {
  if (arr.length <= max) return arr
  const step = Math.ceil(arr.length / max)
  return arr.filter((_, i) => i % step === 0)
}

// Drawdown series from portfolio curve
const calcDrawdown = (curve) => {
  let peak = -Infinity
  return curve.map(v => {
    if (v > peak) peak = v
    return peak === 0 ? 0 : ((v - peak) / peak) * 100
  })
}

// Rolling sharpe over a window
const rollingMetric = (arr, window = 30, fn) =>
  arr.map((_, i) => {
    if (i < window) return null
    const slice = arr.slice(i - window, i)
    return fn(slice)
  })

const rollingSharpeFn = (slice) => {
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length
  const std  = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length)
  return std < 1e-8 ? 0 : mean / std
}

// Reward histogram buckets
const buildHistogram = (rewards, bins = 40) => {
  if (!rewards.length) return []
  const min   = Math.min(...rewards)
  const max   = Math.max(...rewards)
  const width = (max - min) / bins || 1
  const counts = Array(bins).fill(0)
  rewards.forEach(r => {
    const idx = Math.min(Math.floor((r - min) / width), bins - 1)
    counts[idx]++
  })
  return counts.map((count, i) => ({
    bin:   parseFloat((min + i * width).toFixed(5)),
    count,
    positive: (min + i * width) >= 0,
  }))
}

// Build all chart data in one pass
const buildChartData = (metrics) => {
  if (!metrics) return {
    combined: [], histogram: [], rollingSharpe: []
  }

  const pCurve  = metrics.portfolio_curve  ?? []
  const bCurve  = metrics.baseline_curve   ?? []
  const rCurve  = metrics.reward_curve     ?? []
  const ddCurve = calcDrawdown(pCurve)
  const rSmooth = smooth(rCurve, 20)
  const rSharpe = rollingMetric(rCurve, 30, rollingSharpeFn)

  const len = Math.max(pCurve.length, rCurve.length)

  const raw = Array.from({ length: len }, (_, i) => ({
    step:        i + 1,
    portfolio:   pCurve[i]  ?? null,
    baseline:    bCurve[i]  ?? null,
    reward:      rCurve[i]  ?? null,
    rSmooth:     rSmooth[i] ?? null,
    drawdown:    ddCurve[i] ?? null,
    rollSharpe:  rSharpe[i] ?? null,
  }))

  return {
    combined:     downsample(raw, 500),
    histogram:    buildHistogram(rCurve, 40),
  }
}

//  main component 

const Results = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [completedRuns, setCompletedRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(searchParams.get("run") ?? "")
  const [run, setRun]         = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const { combined, histogram } = useMemo(
    () => buildChartData(run?.result_metrics),
    [run?.result_metrics]
  )

  const m = run?.result_metrics ?? {}

  // Pre-computed server-side metrics — read directly, no recomputation
  const stats = run ? {
    finalValue:       m.final_portfolio_value       ?? 0,
    finalBaseline:    m.final_baseline_value        ?? 0,
    totalReturn:      m.total_return_pct            ?? 0,
    baselineReturn:   m.baseline_return_pct         ?? 0,
    vsBaseline:       (m.total_return_pct ?? 0) - (m.baseline_return_pct ?? 0),
    sharpe:           m.sharpe_ratio                ?? 0,
    maxDrawdown:      (m.max_drawdown ?? 0) * 100,  // stored as fraction
    volatility:       (m.volatility   ?? 0) * 100,
    avgReward:        m.avg_reward                  ?? 0,
    totalSteps:       m.total_steps                 ?? 0,
    timesteps:        m.total_timesteps_trained     ?? 0,
    trainDays:        m.train_days                  ?? 0,
    devDays:          m.dev_days                    ?? 0,
    testDays:         m.test_days                   ?? 0,
    winRate: (() => {
      const r = m.reward_curve ?? []
      return r.length > 0
        ? (r.filter(x => x > 0).length / r.length) * 100
        : 0
    })(),
  } : null

  // Fetch completed runs for selector
  useEffect(() => {
    getTrainingRuns().then(res => {
      const done = res.data.filter(r => r.status === "completed")
      setCompletedRuns(done)
      if (!selectedRunId && done.length > 0) {
        setSelectedRunId(String(done[0].id))
      }
    })
  }, [])

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

  const hasBaseline = (m.baseline_curve ?? []).length > 0

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Results</h1>

      {/*  Run selector  */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 space-y-1">
              <label className="text-sm text-muted-foreground">Select Run</label>
              <Select value={selectedRunId} onValueChange={setSelectedRunId}>
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

            {run && (
              <div className="flex flex-wrap gap-2 items-center text-sm">
                <Badge className={`${ALGO_STYLES[run.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                  {run.model_algorithm}
                </Badge>
                <span className="text-muted-foreground">{run.dataset_name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">Started {fmt(run.started_at)}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  Duration: {fmtDuration(run.started_at, run.completed_at)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <p className="text-sm text-muted-foreground animate-pulse">Loading run data...</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && run && stats && (
        <>
          {/*  Data split info bar  */}
          <div className="rounded-md border px-4 py-3 flex flex-wrap gap-6 text-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium w-full">
              Train / Dev / Test Split
            </p>
            <div>
              <span className="text-muted-foreground">Train: </span>
              <span className="font-medium">{stats.trainDays} days</span>
              <span className="text-xs text-muted-foreground ml-1">(80%)</span>
            </div>
            <div>
              <span className="text-muted-foreground">Dev: </span>
              <span className="font-medium">{stats.devDays} days</span>
              <span className="text-xs text-muted-foreground ml-1">(10%)</span>
            </div>
            <div>
              <span className="text-muted-foreground">Test: </span>
              <span className="font-medium">{stats.testDays} days</span>
              <span className="text-xs text-muted-foreground ml-1">(10% — evaluated here)</span>
            </div>
            <div>
              <span className="text-muted-foreground">Timesteps trained: </span>
              <span className="font-medium">{stats.timesteps.toLocaleString()}</span>
            </div>
          </div>

          {/*  Stat cards  */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

            {/* Row 1 — return metrics */}
            <StatCard
              label="Final Portfolio Value"
              value={`${stats.finalValue.toFixed(4)}x`}
              sub="vs 1.0 starting"
              positive={stats.finalValue >= 1}
            />
            <StatCard
              label="Total Return (Test)"
              value={`${stats.totalReturn >= 0 ? "+" : ""}${stats.totalReturn.toFixed(2)}%`}
              sub={`Baseline: ${stats.baselineReturn >= 0 ? "+" : ""}${stats.baselineReturn.toFixed(2)}%`}
              positive={stats.totalReturn >= 0}
            />
            <StatCard
              label="vs Equal-Weight Baseline"
              value={`${stats.vsBaseline >= 0 ? "+" : ""}${stats.vsBaseline.toFixed(2)}%`}
              sub="outperformance"
              positive={stats.vsBaseline >= 0}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              sub="steps with positive reward"
              positive={stats.winRate >= 50}
            />

            {/* Row 2 — risk metrics */}
            <StatCard
              label="Sharpe Ratio"
              value={stats.sharpe.toFixed(4)}
              sub="risk-adjusted return"
              positive={stats.sharpe >= 0}
            />
            <StatCard
              label="Max Drawdown"
              value={`${stats.maxDrawdown.toFixed(2)}%`}
              sub="worst peak-to-trough"
              positive={false}
            />
            <StatCard
              label="Volatility"
              value={`${stats.volatility.toFixed(4)}%`}
              sub="std of step returns"
              positive={null}
            />
            <StatCard
              label="Avg Reward / Step"
              value={stats.avgReward.toFixed(6)}
              sub={`over ${stats.totalSteps.toLocaleString()} test steps`}
              positive={stats.avgReward >= 0}
            />

          </div>

          {/*  Chart 1 — RL vs Baseline  */}
          <ChartCard
            title="Portfolio Value — RL Agent vs Equal-Weight Baseline"
            description={
              hasBaseline
                ? "Blue = RL agent on test set. Gray dashed = equal-weight baseline. Both start at 1.0."
                : "Portfolio curve on test set. Starts at 1.0 (= initial capital)."
            }
            height={320}
          >
            <ResponsiveContainer width="99%" height={320}>
              <LineChart data={combined}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="step"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Test Step", position: "insideBottomRight", offset: -5, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${v.toFixed(2)}x`}
                  width={60}
                />
                <Tooltip content={<CustomTooltip suffix="x" decimals={4} />} />
                <Legend verticalAlign="top" height={28} />
                <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "Start", fontSize: 10 }} />
                <Brush dataKey="step" height={24} stroke="hsl(var(--border))" fill="hsl(var(--muted))" travellerWidth={8} />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                  name="RL Agent"
                  connectNulls
                />
                {hasBaseline && (
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    stroke="hsl(var(--muted-foreground))"
                    dot={false}
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    name="Equal-Weight Baseline"
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/*  Chart 2 — Reward per step  */}
          <ChartCard
            title="Reward per Step"
            description="Raw reward (faint) vs 20-step smoothed reward (bold). Upward trend means the agent is learning to hold better positions."
            height={300}
          >
            <ResponsiveContainer width="99%" height={300}>
              <LineChart data={combined}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="step" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={v => v.toFixed(4)} />
                <Tooltip content={<CustomTooltip decimals={6} />} />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Brush dataKey="step" height={24} stroke="hsl(var(--border))" fill="hsl(var(--muted))" travellerWidth={8} />
                <Line type="monotone" dataKey="reward"  stroke="#a855f7" dot={false} strokeWidth={1}   strokeOpacity={0.25} name="Raw"      connectNulls />
                <Line type="monotone" dataKey="rSmooth" stroke="#a855f7" dot={false} strokeWidth={2.5} name="Smoothed (20)" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/*  Chart 3 + 4 side by side — Drawdown + Rolling Sharpe  */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Drawdown */}
            <ChartCard
              title="Drawdown (%)"
              description="How far below peak at each step. Closer to 0% is better."
              height={260}
            >
              <ResponsiveContainer width="99%" height={260}>
                <AreaChart data={combined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={55} tickFormatter={v => `${v.toFixed(1)}%`} />
                  <Tooltip content={<CustomTooltip suffix="%" decimals={2} />} />
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

            {/* Rolling Sharpe */}
            <ChartCard
              title="Rolling Sharpe Ratio (30-step)"
              description="Consistency of risk-adjusted returns over time. Above 0 = positive risk-adjusted performance."
              height={260}
            >
              <ResponsiveContainer width="99%" height={260}>
                <LineChart data={combined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={55} tickFormatter={v => v.toFixed(2)} />
                  <Tooltip content={<CustomTooltip decimals={3} />} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="rollSharpe"
                    stroke="#f59e0b"
                    dot={false}
                    strokeWidth={2}
                    name="Rolling Sharpe"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

          </div>

          {/*  Chart 5 — Reward distribution histogram  */}
          <ChartCard
            title="Reward Distribution"
            description="Frequency of reward values across all test steps. Right-skewed with mass above 0 = agent is profitable more often than not."
            height={260}
          >
            <ResponsiveContainer width="99%" height={260}>
              <BarChart data={histogram} barCategoryGap="2%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="bin"
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => v.toFixed(3)}
                  label={{ value: "Reward", position: "insideBottomRight", offset: -5, fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 10 }} width={40} label={{ value: "Count", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip
                  formatter={(val, name, props) => [val, "Count"]}
                  labelFormatter={v => `Reward ≈ ${Number(v).toFixed(5)}`}
                />
                <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                <Bar dataKey="count" name="Count" radius={[2, 2, 0, 0]}>
                  {histogram.map((entry, i) => (
                    <rect
                      key={i}
                      fill={entry.positive ? "#22c55e" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/*  Training logs  */}
          {run.logs && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-left">Training Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-muted rounded-md p-4 max-h-64 overflow-y-auto">
                  {run.logs}
                </pre>
              </CardContent>
            </Card>
          )}

          {/*  Model parameters  */}
          {run.model_parameters && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-left">Model Parameters</CardTitle>
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

      {!loading && !run && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
          <p className="text-muted-foreground">No run selected.</p>
          <p className="text-sm text-muted-foreground">Select a completed run above.</p>
        </div>
      )}

    </div>
  )
}

export default memo(Results)
