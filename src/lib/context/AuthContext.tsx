import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface AuthContextProps {
  accessToken: string | null
  userId: string | null
  setAccessToken: (token: string | null) => void
}

interface AuthProviderProps {
  children: ReactNode
}

const AuthContext = createContext<AuthContextProps>({
  accessToken: null,
  userId: null,
  setAccessToken: () => {},
})

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (accessToken) {
      try {
        const decoded = decodeJWT(accessToken)
        setUserId(decoded?.sub || null)
      } catch {
        setUserId(null)
      }
    } else {
      setUserId(null)
    }
  }, [accessToken])

  return (
    <AuthContext.Provider value={{ accessToken, userId, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => useContext(AuthContext)

export const decodeJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

export const getUserId = (): string | null => {
  const { userId } = useAuthContext()
  return userId
}
