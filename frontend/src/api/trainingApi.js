import apiClient from "./apiClient"

export const startTraining = (data) => {
  return apiClient.post("/training/start/", data)
}

export const getTrainingRuns = () => {
  return apiClient.get("/training/runs/")
}
