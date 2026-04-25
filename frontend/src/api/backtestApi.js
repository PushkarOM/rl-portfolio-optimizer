import apiClient from "./apiClient"

export const getBacktestResult = () => {
  return apiClient.get("/backtest/result/")
}
