import apiClient from "./apiClient"

export const getModels = () => {
  return apiClient.get("/models/list/")
}