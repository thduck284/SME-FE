export const ACCESS_TOKEN_KEY = 'accessToken';
export const USER_ID_KEY = 'userId';

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);

export const parseJwt = (token: string): any | null => {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload);
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

export const getUserId = (): string | null => {
  const token = getAccessToken();
  if (!token) return null;
  const payload = parseJwt(token);
  const userId = payload?.sub || null;

  if (userId && !localStorage.getItem(USER_ID_KEY)) {
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
};

