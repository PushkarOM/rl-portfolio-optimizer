import apiClient from "./apiClient"

export const createModel = (data) => {
  return apiClient.post("/models/create/", data)
}

export const getModels = () => {
  return apiClient.get("/models/list/")
}
