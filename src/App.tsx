import { useRoutes, Navigate } from "react-router-dom"
import '@/lib/api/auth/AutoFetch';
import { authRoutes } from "@/pages/auth/route"
import { feedRoutes } from "@/pages/main/route"
import { Toaster } from "react-hot-toast"
import { SocketProvider } from "@/lib/context/SocketContext"

function App() {
  const accessToken = localStorage.getItem('accessToken');
  
  const protectedFeedRoutes = feedRoutes.map(route => ({
    ...route,
    element: accessToken ? route.element : <Navigate to="/login" replace />
  }))

  const publicAuthRoutes = authRoutes.map(route => ({
    ...route,
    element: !accessToken ? route.element : <Navigate to="/home" replace />  
  }))

  const element = useRoutes([
    ...publicAuthRoutes,
    ...protectedFeedRoutes,
    { path: "*", element: <Navigate to={accessToken ? "/home" : "/login"} replace /> }
  ])

  return (
    <SocketProvider>
      {element}
      <Toaster position="top-right" />
    </SocketProvider>
  )
}

export default App