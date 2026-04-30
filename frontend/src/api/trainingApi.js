import apiClient from "./apiClient"

export const startTraining = (data) =>
  apiClient.post("/training/start/", data)

export const getTrainingRuns = () =>
  apiClient.get("/training/runs/")

export const getRun = (id) =>
  apiClient.get(`/training/runs/${id}/`)

