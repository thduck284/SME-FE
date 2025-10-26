import axios from "axios"

const publicApiClient = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: false,
})

export default publicApiClient
