import axios from "axios"

const apiClient = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: false, 
})

// Request interceptor để tự động thêm JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor để xử lý lỗi 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
    }
    return Promise.reject(error)
  }
)

export default apiClient



