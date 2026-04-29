import apiClient from "./apiClient"

export const createExperiment = (data) => {
  return apiClient.post("/experiments/create/", data)
}

export const getExperiments = () => {
  return apiClient.get("/experiments/")
}

export const deleteExperiment = (id) => {
  return apiClient.delete(`/experiments/${id}/delete/`)
}