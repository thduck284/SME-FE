import { useAuthContext } from '@/lib/context/AuthContext'

export const authFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = input.toString();
  
  const excludeRoutes = ['/auth/login', '/auth/register'];
  const shouldExclude = excludeRoutes.some(route => url.includes(route));

  const token = useAuthContext().accessToken || '';
  
  const config: RequestInit = {
    ...init,
    headers: {
      ...init?.headers,
      ...(token && !shouldExclude && { Authorization: `Bearer ${token}` })
    }
  };
  
  return fetch(input, config);
};