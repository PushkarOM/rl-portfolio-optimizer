import apiClient from "./apiClient"
 
export const runBacktest = (runId) =>
  apiClient.post("/backtest/run/", { run_id: runId })
 
export const getBacktestStatus = (runId) =>
  apiClient.get(`/backtest/status/${runId}/`)
 