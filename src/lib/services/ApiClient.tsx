import axios from "axios"

const apiClient = axios.create({
  baseURL: "/",
  withCredentials: false, 
})

export default apiClient



