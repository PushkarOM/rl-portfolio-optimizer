import apiClient from "./apiClient"

export const createDataset = (data) => {
  return apiClient.post("/data/create-dataset/", data)
}

export const getDatasets = () => {
  return apiClient.get("/data/datasets/")
}

export const getDataset = (id) => {
  return apiClient.get(`/data/datasets/${id}/`)
}

export const deleteDataset = (id) => {
  return apiClient.delete(`/data/datasets/${id}/delete/`)
}

export const previewDataset = (id) => {
  return apiClient.get(`/data/datasets/${id}/preview/`)
}