import axios from "axios"

const userApiClient = axios.create({
  baseURL: "http://localhost:3001",
  withCredentials: false,
})

export default userApiClient


