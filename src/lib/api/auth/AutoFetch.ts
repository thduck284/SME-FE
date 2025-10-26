declare global {
  interface Window {
    _originalFetch?: typeof fetch;
    _isRefreshing?: boolean;
    _refreshSubscribers?: Array<(token: string) => void>;
  }
}

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRES_KEY = 'tokenExpires';

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  if (!window._refreshSubscribers) {
    window._refreshSubscribers = [];
  }
  window._refreshSubscribers.push(callback);
};

const notifyTokenRefresh = (token: string) => {
  if (window._refreshSubscribers) {
    window._refreshSubscribers.forEach(callback => callback(token));
    window._refreshSubscribers = [];
  }
};

const shouldRefreshToken = (): boolean => {
  const expires = localStorage.getItem(TOKEN_EXPIRES_KEY);
  if (!expires) return true;
  return Date.now() >= parseInt(expires);
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    clearAllTokens();
    return null;
  }

  try {
    const res = await window._originalFetch!(`/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAllTokens();
      return null;
    }

    const data = await res.json();
    
    if (!data.accessToken || !data.expiresIn) {
      clearAllTokens();
      return null;
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    localStorage.setItem(TOKEN_EXPIRES_KEY, (Date.now() + data.expiresIn * 1000).toString());

    return data.accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    clearAllTokens();
    return null;
  }
};

const clearAllTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRES_KEY);
};

if (typeof window !== 'undefined' && !window._originalFetch) {
  window._originalFetch = window.fetch;
  window._isRefreshing = false;
  window._refreshSubscribers = [];

  window.fetch = async (input: any, init?: RequestInit): Promise<Response> => {
    const url = input.toString();

    const excludeRoutes = ['/auth/login', '/auth/register', '/auth/refresh-token', '/auth/logout'];
    const shouldExclude = excludeRoutes.some(route => url.includes(route));

    if (!shouldExclude && shouldRefreshToken()) {
      if (!window._isRefreshing) {
        window._isRefreshing = true;
        
        try {
          const newToken = await refreshAccessToken();
          window._isRefreshing = false;

          if (newToken) {
            notifyTokenRefresh(newToken);
          } else {
            // Chỉ redirect nếu không phải đang ở trang login
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return new Response('Unauthorized', { status: 401 });
          }
        } catch (error) {
          window._isRefreshing = false;
          throw error;
        }
      } else {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            const newInit: RequestInit = {
              ...init,
              headers: {
                ...init?.headers,
                Authorization: `Bearer ${token}`,
              },
            };
            resolve(window._originalFetch!(input, newInit));
          });
        });
      }
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const config: RequestInit = {
      ...init,
      headers: {
        ...init?.headers,
        ...(token && !shouldExclude && { Authorization: `Bearer ${token}` }),
      },
    };

    return window._originalFetch!(input, config);
  };
}

export {};