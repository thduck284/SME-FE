import { useRoutes, Navigate } from "react-router-dom"
import { authRoutes } from "@/pages/auth/route"
import { feedRoutes } from "@/pages/main/route"
import { Toaster } from "react-hot-toast"
import { useAuthContext } from "@/lib/context/AuthContext"

function App() {
  const { accessToken } = useAuthContext()
  
  const protectedFeedRoutes = feedRoutes.map(route => ({
    ...route,
    element: accessToken ? route.element : <Navigate to="/login" replace />
  }))

  const publicAuthRoutes = authRoutes.map(route => ({
    ...route,
    element: !accessToken ? route.element : <Navigate to="/" replace />
  }))

  const element = useRoutes([
    ...publicAuthRoutes,
    ...protectedFeedRoutes,
    { path: "*", element: <Navigate to={accessToken ? "/" : "/login"} replace /> }
  ])

  return (
    <>
      {element}
      <Toaster position="top-right" />
    </>
  )
}

export default App