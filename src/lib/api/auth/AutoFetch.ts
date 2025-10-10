declare global {
  interface Window {
    _originalFetch?: typeof fetch;
  }
}

if (typeof window !== 'undefined' && !window._originalFetch) {
  window._originalFetch = window.fetch;
  
  window.fetch = async (input: any, init?: RequestInit): Promise<Response> => {
    const url = input.toString();
    
    const excludeRoutes = ['/auth/login', '/auth/register'];
    const shouldExclude = excludeRoutes.some(route => url.includes(route));

    const token = localStorage.getItem('accessToken');

    const config: RequestInit = {
      ...init,
      headers: {
        ...init?.headers,
        ...(token && !shouldExclude && { Authorization: `Bearer ${token}` })
      }
    };

    return window._originalFetch!(input, config);
  };
}

export {};