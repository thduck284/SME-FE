import axios from "axios"

const userApiClient = axios.create({
  baseURL: "/users",
  withCredentials: false,
})

export default userApiClient


