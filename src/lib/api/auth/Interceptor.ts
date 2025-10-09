export const injectToken = (config: RequestInit): RequestInit => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    return {
      ...config,
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      },
    };
  }
  return config;
};