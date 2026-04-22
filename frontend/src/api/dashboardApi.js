import apiClient from "./apiClient"

export const getSummary = () => {
  return apiClient.get("/dashboard/summary/")
}

export const getAllocation = () => {
  return apiClient.get("/dashboard/allocation/")
}

export const getPerformance = () => {
  return apiClient.get("/dashboard/performance/")
}

export const getRecommendation = () => {
  return apiClient.get("/dashboard/recommendation/")
}
