// Training.jsx
import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"

import { startTraining, getTrainingRuns } from "@/api/trainingApi"
import { getExperiments } from "@/api/experimentApi"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import NextStepButton from "@/components/NextPageButton"

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

const FREQ_LABEL = { "1d": "Daily", "1h": "Hourly", "5m": "5 Min" }

const isActive = (run) => run.status === "pending" || run.status === "running"

const fmt = (iso) => iso
  ? new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  : "—"

const Training = () => {
  const navigate = useNavigate()

  const [experiments, setExperiments] = useState([])
  const [runs, setRuns]               = useState([])
  const [selectedExp, setSelectedExp] = useState("")
  const [starting, setStarting]       = useState(false)
  const [startError, setStartError]   = useState(null)
  const [search, setSearch]           = useState("")
  const [showAll, setShowAll]         = useState(false)

  const intervalRef = useRef(null)

  //  smart polling — only while active runs exist 
  const startPolling = () => {
    if (intervalRef.current) return
    intervalRef.current = setInterval(() => {
      getTrainingRuns().then(res => {
        setRuns(res.data)
        const anyActive = res.data.some(isActive)
        if (!anyActive) stopPolling()
      })
    }, 4000)
  }

  const stopPolling = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  useEffect(() => {
    getExperiments().then(res => setExperiments(res.data))

    getTrainingRuns().then(res => {
      setRuns(res.data)
      if (res.data.some(isActive)) startPolling()
    })

    return () => stopPolling()
  }, [])

  //  derived: selected experiment object 
  const expObj = experiments.find(e => String(e.id) === selectedExp) ?? null

  //  start training 
  const handleStart = async () => {
    if (!selectedExp) { setStartError("Please select an experiment."); return }

    setStarting(true)
    setStartError(null)
    try {
      await startTraining({ experiment_id: selectedExp })
      // Immediately refresh and begin polling
      const res = await getTrainingRuns()
      setRuns(res.data)
      startPolling()
    } catch (err) {
      const data = err?.response?.data
      setStartError(data?.error || "Failed to start training.")
    } finally {
      setStarting(false)
    }
  }

  //  list filtering 
  const filtered = runs.filter(r => {
    const q = search.toLowerCase()
    return (
      r.experiment_name?.toLowerCase().includes(q) ||
      r.model_name?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q)
    )
  })

  const visible   = showAll ? filtered : filtered.slice(0, 5)
  const remaining = filtered.length - 5

  const hasCompleted = runs.some(r => r.status === "completed")

  return (
    <div className="p-6 space-y-6">

      <h1 className="text-3xl font-bold">Training</h1>

      <NextStepButton
        to="/backtest"
        label="Next: Backtest"
        disabled={!hasCompleted}
        reason="Complete at least one training run first"
      />

      {/*  START FORM  */}
      <Card>
        <CardHeader>
          <CardTitle className="text-left">Start Training Run</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <div className="flex flex-col gap-1 items-start">
            <label className="text-sm text-muted-foreground">Experiment</label>
            <Select
              value={selectedExp}
              onValueChange={v => { setSelectedExp(v); setStartError(null) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an experiment" />
              </SelectTrigger>
              <SelectContent>
                {experiments.length === 0
                  ? <SelectItem value="__none" disabled>No experiments available</SelectItem>
                  : experiments.map(exp => (
                      <SelectItem key={exp.id} value={String(exp.id)}>
                        {exp.name}
                      </SelectItem>
                    ))
                }
              </SelectContent>
            </Select>
          </div>

          {/* Auto-filled model info from experiment */}
          {expObj && (
            <div className="rounded-md border px-4 py-3 flex flex-col gap-2 text-sm">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Linked from experiment
              </p>
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-muted-foreground">Dataset: </span>
                  <span className="font-medium">{expObj.dataset_name ?? "—"}</span>
                  {expObj.dataset_frequency && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      · {FREQ_LABEL[expObj.dataset_frequency] ?? expObj.dataset_frequency}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Model: </span>
                  <span className="font-medium">{expObj.model_name ?? "—"}</span>
                  {expObj.model_algorithm && (
                    <Badge className={`${ALGO_STYLES[expObj.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                      {expObj.model_algorithm}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {startError && <p className="text-sm text-red-500 text-left">{startError}</p>}

          <Button onClick={handleStart} disabled={starting} className="w-full">
            {starting ? "Queuing..." : "Start Training"}
          </Button>

        </CardContent>
      </Card>

      {/*  RUNS LIST  */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <CardTitle className="text-left">
              Training Runs
              {runs.length > 0 && (
                <span className="text-muted-foreground font-normal text-base ml-2">
                  ({runs.length})
                </span>
              )}
            </CardTitle>
            {runs.length > 0 && (
              <Input
                placeholder="Search by experiment, model, status..."
                value={search}
                onChange={e => { setSearch(e.target.value); setShowAll(false) }}
                className="md:w-64"
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {(() => {
            if (filtered.length === 0) {
              return (
                <p className="text-sm text-muted-foreground text-left">
                  {search ? `No runs matching "${search}".` : "No training runs yet."}
                </p>
              )
            }

            return (
              <>
                {visible.map(run => (
                  <div
                    key={run.id}
                    className="p-4 border rounded-md flex flex-col md:flex-row justify-between gap-4"
                  >
                    {/* Left — info */}
                    <div className="flex flex-col gap-1.5 text-left flex-1">

                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{run.experiment_name}</p>
                        <Badge className={`${STATUS_STYLES[run.status] ?? "bg-gray-400"} text-white text-xs`}>
                          {run.status}
                        </Badge>
                        {run.model_algorithm && (
                          <Badge className={`${ALGO_STYLES[run.model_algorithm] ?? "bg-gray-400"} text-white text-xs uppercase`}>
                            {run.model_algorithm}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Model:{" "}
                        <span className="text-foreground font-medium">{run.model_name}</span>
                      </p>

                      {run.dataset_name && (
                        <p className="text-sm text-muted-foreground">
                          Dataset:{" "}
                          <span className="text-foreground font-medium">{run.dataset_name}</span>
                        </p>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground pt-0.5">
                        {run.started_at && <span>Started: {fmt(run.started_at)}</span>}
                        {run.completed_at && <span>Completed: {fmt(run.completed_at)}</span>}
                        {!run.started_at && <span>Created: {fmt(run.created_at)}</span>}
                      </div>

                      {/* Error */}
                      {run.status === "failed" && run.error_message && (
                        <p className="text-xs text-red-500 mt-0.5">{run.error_message}</p>
                      )}

                    </div>

                    {/* Right — progress + actions */}
                    <div className="flex flex-col gap-2 items-end justify-between shrink-0 w-full md:w-60">

                      {/* Progress */}
                      <div className="w-full space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {run.status === "running"
                              ? "Training..."
                              : run.status === "completed"
                              ? "Complete"
                              : run.status === "failed"
                              ? "Failed"
                              : "Queued"}
                          </span>
                          <span>{Math.round(run.progress ?? 0)}%</span>
                        </div>
                        <Progress
                          value={run.progress ?? 0}
                          className={run.status === "running" ? "animate-pulse" : ""}
                        />
                      </div>

                      {/* Result metrics snapshot */}
                      {run.status === "completed" && run.result_metrics && (
                        <div className="w-full flex gap-2 text-xs">

                          {/* Final Value */}
                          {run.result_metrics.final_portfolio_value != null && (
                            <div className="flex-1 rounded border px-2 py-1 text-center">
                              <p className="text-muted-foreground">Final Value</p>
                              <p className="font-mono font-semibold">
                                {Number(run.result_metrics.final_portfolio_value).toFixed(4)}x
                              </p>
                            </div>
                          )}

                          {/* Total Return % */}
                          {run.result_metrics.portfolio_curve?.length > 0 && (
                            <div className="flex-1 rounded border px-2 py-1 text-center">
                              <p className="text-muted-foreground">Return</p>
                              <p className={`font-mono font-semibold ${
                                run.result_metrics.final_portfolio_value >= 1
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}>
                                {((run.result_metrics.final_portfolio_value - 1) * 100).toFixed(2)}%
                              </p>
                            </div>
                          )}

                          {/* Avg Reward */}
                          {run.result_metrics.reward_curve?.length > 0 && (
                            <div className="flex-1 rounded border px-2 py-1 text-center">
                              <p className="text-muted-foreground">Avg Reward</p>
                              <p className="font-mono font-semibold">
                                {(
                                  run.result_metrics.reward_curve.reduce((a, b) => a + b, 0) /
                                  run.result_metrics.reward_curve.length
                                ).toFixed(6)}
                              </p>
                            </div>
                          )}

                        </div>
                      )}

                      {run.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => navigate(`/results?run=${run.id}`)}
                        >
                          View Results →
                        </Button>
                      )}

                    </div>
                  </div>
                ))}

                {filtered.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowAll(prev => !prev)}
                  >
                    {showAll
                      ? "Show less"
                      : `Show ${remaining} more run${remaining !== 1 ? "s" : ""}`
                    }
                  </Button>
                )}
              </>
            )
          })()}
        </CardContent>
      </Card>

    </div>
  )
}

export default Training