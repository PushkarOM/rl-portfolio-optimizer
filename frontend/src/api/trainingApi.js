import apiClient from "./apiClient"

export const startTraining = (data) =>
  apiClient.post("/training/start/", data)

export const getTrainingRuns = () =>
  apiClient.get("/training/runs/")

export const getRun = (id) =>
  apiClient.get(`/training/runs/${id}/`)

export const downloadModel = (id) => {
  const base = import.meta.env.VITE_BASE_API_URL ?? ""
  window.open(`${base}/training/runs/${id}/download-model/`, "_blank")
}
 
