import apiClient from "./apiClient"

export const getDashboardSummary = () =>
  apiClient.get("/dashboard/summary/")