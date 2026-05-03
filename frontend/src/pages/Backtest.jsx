import { useState, useEffect, useRef, useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, Brush,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import StatCard      from "@/components/results/StatCard"
import ChartCard     from "@/components/results/ChartCard"
import CustomTooltip from "@/components/results/CustomTooltip"
import GlossaryTip   from "@/components/GlossaryTip"

import { getTrainingRuns } from "@/api/trainingApi"
import { runBacktest, getBacktestStatus } from "@/api/backtestApi"
import { Download } from "lucide-react"

const ALGO_STYLES = {
  ppo: "bg-green-500",
  dqn: "bg-yellow-500",
  a2c: "bg-pink-500",
  sac: "bg-cyan-500",
}

function exportBacktestCSV(result) {
  const pc    = result.portfolio_curve ?? []
  const bc    = result.baseline_curve  ?? []
  const rc    = result.reward_curve    ?? []
  const dates = result.dates           ?? []
  const maxLen = Math.max(pc.length, bc.length)

  const rows = [["day", "date", "portfolio_value", "baseline_value", "reward"]]
  for (let i = 0; i < maxLen; i++) {
    rows.push([i, dates[i] ?? "", pc[i] ?? "", bc[i] ?? "", rc[i] ?? ""])
  }

  const csv  = rows.map(r => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `backtest_run_${result.run_id}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Backtest() {
  const [completedRuns, setCompletedRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState("")
  const [result, setResult]     = useState(null)
  const [status, setStatus]     = useState("idle")  // idle | pending | running | completed | failed
  const [error, setError]       = useState(null)
  const [activeRunId, setActiveRunId] = useState(null)

  const pollRef = useRef(null)

  useEffect(() => {
    getTrainingRuns().then(res => {
      const done = res.data.filter(r => r.status === "completed")
      setCompletedRuns(done)
      if (done.length > 0) setSelectedRunId(String(done[0].id))
    })
    return () => stopPolling()
  }, [])

  const startPolling = (runId) => {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await getBacktestStatus(runId)
        const s   = res.data.status

        setStatus(s)

        if (s === "completed") {
          setResult(res.data.result)
          stopPolling()
        } else if (s === "failed") {
          setError(res.data.error ?? "Backtest failed.")
          stopPolling()
        }
      } catch {
        setError("Lost connection while polling.")
        stopPolling()
      }
    }, 3000)
  }

  const stopPolling = () => {
    clearInterval(pollRef.current)
    pollRef.current = null
  }

  const handleRun = async () => {
    if (!selectedRunId) return
    setError(null)
    setResult(null)
    setStatus("pending")
    setActiveRunId(selectedRunId)

    try {
      await runBacktest(selectedRunId)
      startPolling(selectedRunId)
    } catch (e) {
      setError(e.response?.data?.error ?? "Failed to queue backtest.")
      setStatus("failed")
    }
  }

  const chartData = useMemo(() => {
    if (!result) return []
    const pc    = result.portfolio_curve ?? []
    const bc    = result.baseline_curve  ?? []
    const dates = result.dates           ?? []
    const len   = Math.max(pc.length, bc.length)
    return Array.from({ length: len }, (_, i) => ({
      day:       i,
      date:      dates[i] ?? i,
      portfolio: pc[i] ?? null,
      baseline:  bc[i] ?? null,
    }))
  }, [result])

  const selectedRun = completedRuns.find(r => r.id.toString() === selectedRunId)
  const isRunning   = status === "pending" || status === "running"

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Backtest</h1>

      {/* Run selector + trigger */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">

            <div className="flex-1 space-y-1">
              <label className="text-sm text-muted-foreground">Select Completed Run</label>
              <Select
                value={selectedRunId}
                onValueChange={setSelectedRunId}
                disabled={isRunning}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a run..." />
                </SelectTrigger>
                <SelectContent>
                  {completedRuns.length === 0
                    ? <SelectItem value="__none" disabled>No completed runs</SelectItem>
                    : completedRuns.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          #{r.id} — {r.experiment_name} · {r.model_algorithm?.toUpperCase()}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button onClick={handleRun} disabled={!selectedRunId || isRunning}>
                {isRunning ? "Running Backtest..." : "Run Backtest"}
              </Button>
              {result && (
                <Button variant="outline" onClick={() => exportBacktestCSV(result)}>
                  <Download size={14} className="mr-1" /> Export CSV
                </Button>
              )}
            </div>
          </div>

          {/* Selected run meta */}
          {selectedRun && (
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <Badge className={`${ALGO_STYLES[selectedRun.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                {selectedRun.model_algorithm}
              </Badge>
              <span className="text-muted-foreground">{selectedRun.dataset_name}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                #{selectedRun.id} — {selectedRun.experiment_name}
              </span>
            </div>
          )}

          {/* Status indicator while running */}
          {isRunning && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {status === "pending" ? "Queued — waiting for worker..." : "Running backtest on test set..."}
            </p>
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <>
          {/* Info bar */}
          <div className="rounded-md border px-4 py-3 flex flex-wrap gap-6 text-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium w-full">
              Backtest — Test Set Only (last 10% of dates)
            </p>
            <div>
              <span className="text-muted-foreground">Dataset: </span>
              <span className="font-medium">{result.dataset_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Test days: </span>
              <span className="font-medium">{result.test_days}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Algorithm: </span>
              <span className="font-medium uppercase">{result.model_algorithm}</span>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Final Portfolio Value"
              value={`${result.final_value?.toFixed(4)}x`}
              sub="vs 1.0 starting"
              positive={result.final_value >= 1}
            />
            <StatCard
              label="Total Return"
              value={`${result.total_return_pct >= 0 ? "+" : ""}${result.total_return_pct?.toFixed(2)}%`}
              sub={`Baseline: ${result.baseline_return_pct >= 0 ? "+" : ""}${result.baseline_return_pct?.toFixed(2)}%`}
              positive={result.total_return_pct >= 0}
            />
            <StatCard
              label={<GlossaryTip term="Sharpe Ratio">Sharpe Ratio</GlossaryTip>}
              value={result.sharpe_ratio?.toFixed(4)}
              sub={`Baseline: ${result.baseline_sharpe?.toFixed(4)}`}
              positive={result.sharpe_ratio >= 0}
            />
            <StatCard
              label={<GlossaryTip term="Win Rate">Win Rate</GlossaryTip>}
              value={`${result.win_rate?.toFixed(1)}%`}
              sub="steps with positive reward"
              positive={result.win_rate >= 50}
            />
            <StatCard
              label={<GlossaryTip term="Max Drawdown">Max Drawdown</GlossaryTip>}
              value={`${(result.max_drawdown * 100)?.toFixed(2)}%`}
              sub={`Baseline: ${(result.baseline_max_drawdown * 100)?.toFixed(2)}%`}
              positive={false}
            />
            <StatCard
              label={<GlossaryTip term="Volatility">Volatility</GlossaryTip>}
              value={`${(result.volatility * 100)?.toFixed(4)}%`}
              sub={`Baseline: ${(result.baseline_volatility * 100)?.toFixed(4)}%`}
              positive={null}
            />
            <StatCard
              label="vs Equal-Weight Baseline"
              value={`${(result.total_return_pct - result.baseline_return_pct) >= 0 ? "+" : ""}${(result.total_return_pct - result.baseline_return_pct)?.toFixed(2)}%`}
              sub="outperformance"
              positive={(result.total_return_pct - result.baseline_return_pct) >= 0}
            />
            <StatCard
              label="Baseline Final Value"
              value={`${result.baseline_final_value?.toFixed(4)}x`}
              sub="equal-weight buy-and-hold"
              positive={result.baseline_final_value >= 1}
            />
          </div>

          {/* Chart */}
          <ChartCard
            title="Backtest: RL Agent vs Equal-Weight Baseline"
            description="Both curves start at 1.0. Evaluated on the held-out test set (last 10% of dates)."
            height={360}
          >
            <ResponsiveContainer width="99%" height={360}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval={Math.floor(chartData.length / 6)}
                  label={{ value: "Date", position: "insideBottomRight", offset: -5, fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `${v.toFixed(2)}x`}
                  width={62}
                />
                <Tooltip content={<CustomTooltip suffix="x" decimals={4} />} />
                <Legend verticalAlign="top" height={28} />
                <ReferenceLine
                  y={1}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  label={{ value: "Start", fontSize: 10 }}
                />
                <Brush
                  dataKey="date"
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
                  name="RL Agent"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#ffffff"
                  dot={false}
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  name="Equal-Weight Baseline"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

      {status === "idle" && !result && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-2">
          <p className="text-muted-foreground">Select a completed run and click Run Backtest.</p>
          <p className="text-sm text-muted-foreground">
            The saved model will be loaded and evaluated on the held-out test set.
          </p>
        </div>
      )}
    </div>
  )
}