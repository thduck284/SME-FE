import { useRoutes } from "react-router-dom"
import { authRoutes } from "@/pages/auth/route"
import { feedRoutes } from "@/pages/main/route"
import { Toaster } from "react-hot-toast"

function App() {
  const element = useRoutes([...authRoutes, ...feedRoutes])

  return (
    <>
      {element}
      <Toaster position="top-right" />
    </>
  )
}

export default App