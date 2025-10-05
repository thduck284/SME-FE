import axios from "axios"

const apiClient = axios.create({
  baseURL: "http://localhost:3003",
  withCredentials: true, 
})

export default apiClient



