const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** In-memory access token — never written to localStorage / sessionStorage */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const getHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return headers;
};

type QueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    } else {
      prom.reject(new Error('No token after refresh'));
    }
  });
  failedQueue = [];
};

const handleRefresh = async (): Promise<string> => {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new ApiError('Refresh session expired', res.status);
  }

  const data = await res.json();
  setAccessToken(data.token);
  return data.token as string;
};

async function parseJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const customFetch = async (endpoint: string, options: RequestInit = {}): Promise<unknown> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const mergedOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  const res = await fetch(url, mergedOptions);

  if (
    res.status === 401 &&
    !endpoint.includes('/auth/login') &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/register') &&
    !endpoint.includes('/auth/forgot-password') &&
    !endpoint.includes('/auth/reset-password')
  ) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            const retryHeaders = {
              ...headers,
              Authorization: `Bearer ${token}`,
            };
            fetch(url, { ...mergedOptions, headers: retryHeaders })
              .then(async (retryRes) => {
                if (!retryRes.ok) {
                  const err = (await parseJsonSafe(retryRes)) as { message?: string };
                  reject(new ApiError(err.message || 'Retry request failed', retryRes.status));
                  return;
                }
                resolve(await retryRes.json());
              })
              .catch(reject);
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const newToken = await handleRefresh();
      processQueue(null, newToken);

      const retryRes = await fetch(url, {
        ...mergedOptions,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
      });

      if (!retryRes.ok) {
        const err = (await parseJsonSafe(retryRes)) as { message?: string };
        throw new ApiError(err.message || 'Retry request failed', retryRes.status);
      }
      return retryRes.json();
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login?expired=true';
      }
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const err = (await parseJsonSafe(res)) as { message?: string };
    throw new ApiError(err.message || 'API request failed', res.status);
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
};

export const api = {
  get(endpoint: string) {
    return customFetch(endpoint, { method: 'GET' });
  },

  post(endpoint: string, data?: unknown, headers?: HeadersInit) {
    return customFetch(endpoint, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      headers,
    });
  },

  put(endpoint: string, data?: unknown, headers?: HeadersInit) {
    return customFetch(endpoint, {
      method: 'PUT',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      headers,
    });
  },

  delete(endpoint: string) {
    return customFetch(endpoint, { method: 'DELETE' });
  },
};
