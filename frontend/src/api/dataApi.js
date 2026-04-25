import apiClient from "./apiClient"

// Create dataset
export const createDataset = (data) => {
  return apiClient.post("/data/create-dataset/", data)
}

// Get all datasets
export const getDatasets = () => {
  return apiClient.get("/data/datasets/")
}

// Get single dataset (optional)
export const getDataset = (id) => {
  return apiClient.get(`/data/dataset/${id}/`)
}
