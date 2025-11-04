import { useRoutes, Navigate } from "react-router-dom"
import '@/lib/api/auth/AutoFetch';
import { authRoutes } from "@/pages/auth/route"
import { feedRoutes } from "@/pages/main/route"
import { PostDetailPage } from "@/pages/main/post/PostDetailPage"
import { Toaster } from "react-hot-toast"
import { SocketProvider } from "@/lib/context/SocketContext"
import { LivenessProvider } from "@/lib/context/LivenessSocketContext"
import { ChatProvider } from "@/lib/context/ChatSocketContext"
import { ChatWindowsManager } from "@/components/chat/ChatWindowsManager"

function App() {
  const accessToken = localStorage.getItem('accessToken');
  
  // Tách route /post/:postId ra khỏi protected routes
  const publicPostRoute = {
    path: "/post/:postId",
    element: <PostDetailPage />
  }
  
  const protectedFeedRoutes = feedRoutes
    .filter(route => route.path !== "/post/:postId")
    .map(route => ({
      ...route,
      element: accessToken ? route.element : <Navigate to="/login" replace />
    }))

  const publicAuthRoutes = authRoutes.map(route => ({
    ...route,
    element: !accessToken ? route.element : <Navigate to="/home" replace />  
  }))

  const element = useRoutes([
    ...publicAuthRoutes,
    publicPostRoute, // Route public cho bài viết
    ...protectedFeedRoutes,
    { path: "*", element: <Navigate to={accessToken ? "/home" : "/login"} replace /> }
  ])

  return (
    <SocketProvider>
      <LivenessProvider>
        <ChatProvider>
          {element}
          <ChatWindowsManager />
          <Toaster position="top-right" />
        </ChatProvider>
      </LivenessProvider>
    </SocketProvider>
  )
}

export default App