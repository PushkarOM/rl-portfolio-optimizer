import apiClient from "./apiClient"

export const createModel = (data) =>
  apiClient.post("/models/create/", data)

export const getModels = () =>
  apiClient.get("/models/list/")

export const getModel = (id) =>
  apiClient.get(`/models/${id}/`)

export const deleteModel = (id) =>
  apiClient.delete(`/models/${id}/delete/`)
