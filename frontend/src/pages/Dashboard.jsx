// Dashboard.jsx
import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"

import { getDashboardSummary } from "@/api/dashboardApi"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

import {
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts"

import ChartCard from "@/components/results/ChartCard"
import CustomTooltip from "@/components/results/CustomTooltip"

const STATUS_STYLES = {
  pending:   "bg-gray-400",
  running:   "bg-yellow-500",
  completed: "bg-green-500",
  failed:    "bg-red-500",
}

const ALGO_STYLES = {
  ppo: "bg-green-500",
  dqn: "bg-yellow-500",
  a2c: "bg-pink-500",
  sac: "bg-cyan-500",
}

const ACTIVITY_ICONS = {
  dataset:    "📦",
  experiment: "🧪",
  run:        "🤖",
}

const fmt = (iso) => iso
  ? new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  : "—"

const fmtValue = (val) =>
  val != null ? Number(val).toFixed(4) : "—"

const Dashboard = () => {
  const navigate  = useNavigate()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    getDashboardSummary()
      .then(res => setSummary(res.data))
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false))
  }, [])

  // Build portfolio curve chart data from best run
  const portfolioCurve = useMemo(() => {
    const curve = summary?.best_run?.portfolio_curve
    if (!Array.isArray(curve) || curve.length === 0) return []
    return curve.map((value, i) => ({ step: i + 1, value }))
  }, [summary])

  //  loading 
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    )
  }

  const hasRuns     = summary.total_runs > 0
  const hasBestRun  = !!summary.best_run
  const bestValue   = summary.best_run?.final_portfolio_value

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/*  STAT CARDS  */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <StatCard
          label="Ready Datasets"
          value={summary.total_datasets}
          sub="datasets available"
        />
        <StatCard
          label="Model Configs"
          value={summary.total_models}
          sub="configured"
        />
        <StatCard
          label="Experiments"
          value={summary.total_experiments}
          sub={`${summary.completed_runs} runs completed`}
        />
        <StatCard
          label="Best Portfolio Value"
          value={hasBestRun ? fmtValue(bestValue) : "—"}
          sub={hasBestRun ? summary.best_run.experiment_name : "No completed runs yet"}
          highlight={hasBestRun}
        />

      </div>

      {/*  BEST RUN CHART  */}
      <ChartCard
        title={hasBestRun
          ? `Best Run — ${summary.best_run.experiment_name}`
          : "Best Run Portfolio Curve"}
        description={hasBestRun
          ? `${summary.best_run.model_name} · ${summary.best_run.model_algorithm?.toUpperCase()} · Completed ${fmt(summary.best_run.completed_at)}`
          : "No completed runs yet"}
        height={280}
      >
        {portfolioCurve.length > 0 ? (
          <ResponsiveContainer width="99%" height="100%">
            <LineChart data={portfolioCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="step"
                tick={{ fontSize: 11 }}
                tickLine={false}
                label={{ value: "Step", position: "insideBottomRight", offset: -5, fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip prefix="" suffix="" decimals={4} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Complete a training run to see the portfolio curve here.
          </div>
        )}
      </ChartCard>

      {/*  RECENT RUNS + ACTIVITY FEED  */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-left">Recent Training Runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.recent_runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No training runs yet.</p>
            ) : (
              summary.recent_runs.map(run => (
                <div
                  key={run.id}
                  className="p-3 border rounded-md flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{run.experiment_name}</p>
                      <Badge className={`${STATUS_STYLES[run.status] ?? "bg-gray-400"} text-white text-xs`}>
                        {run.status}
                      </Badge>
                      {run.model_algorithm && (
                        <Badge className={`${ALGO_STYLES[run.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                          {run.model_algorithm}
                        </Badge>
                      )}
                    </div>
                    {run.status === "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => navigate(`/results?run=${run.id}`)}
                      >
                        View →
                      </Button>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{run.model_name}</span>
                      <span>{Math.round(run.progress ?? 0)}%</span>
                    </div>
                    <Progress value={run.progress ?? 0} />
                  </div>

                  {/* Metrics */}
                  {run.status === "completed" && run.final_portfolio_value != null && (
                    <div className="flex gap-2 text-xs">
                      <div className="flex-1 rounded border px-2 py-1 text-center">
                        <p className="text-muted-foreground">Final Value</p>
                        <p className="font-mono font-semibold">
                          {fmtValue(run.final_portfolio_value)}
                        </p>
                      </div>
                      {run.avg_reward != null && (
                        <div className="flex-1 rounded border px-2 py-1 text-center">
                          <p className="text-muted-foreground">Avg Reward</p>
                          <p className="font-mono font-semibold">
                            {fmtValue(run.avg_reward)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-left">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.activity_feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              summary.activity_feed.map((event, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 border-b last:border-0"
                >
                  <span className="text-base mt-0.5">
                    {ACTIVITY_ICONS[event.type] ?? "•"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-left truncate">{event.label}</p>
                    <p className="text-xs text-muted-foreground text-left">
                      {fmt(event.timestamp)}
                    </p>
                  </div>
                  {event.status && (
                    <Badge className={`${STATUS_STYLES[event.status] ?? "bg-gray-400"} text-white text-xs shrink-0`}>
                      {event.status}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

//  StatCard 
const StatCard = ({ label, value, sub, highlight }) => (
  <Card>
    <CardContent className="pt-6 pb-4 px-4 flex flex-col gap-1 text-left">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-green-500" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </CardContent>
  </Card>
)

export default Dashboard
