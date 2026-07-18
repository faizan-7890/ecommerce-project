const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Queue to hold requests while refreshing token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleRefresh = async (): Promise<string> => {
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // sends HttpOnly refresh cookie
  });

  if (!res.ok) {
    throw new Error('Refresh session expired');
  }

  const data = await res.json();
  localStorage.setItem('token', data.token);
  return data.token;
};

const customFetch = async (endpoint: string, options: RequestInit): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getHeaders();
  
  const mergedOptions = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: 'include' as RequestCredentials, // Enforce cross-origin cookie sharing
  };

  const res = await fetch(url, mergedOptions);

  if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          // Retry the request with the new access token
          if (mergedOptions.headers) {
            (mergedOptions.headers as any)['Authorization'] = `Bearer ${token}`;
          }
          return fetch(url, mergedOptions).then((r) => r.json());
        })
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;

    try {
      const newToken = await handleRefresh();
      processQueue(null, newToken);
      
      // Retry original request
      if (mergedOptions.headers) {
        (mergedOptions.headers as any)['Authorization'] = `Bearer ${newToken}`;
      }
      const retryRes = await fetch(url, mergedOptions);
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({}));
        throw new Error(err.message || 'Retry request failed');
      }
      return retryRes.json();
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        // Force reload page to clear user state
        window.location.href = '/login?expired=true';
      }
      throw refreshErr;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'API request failed');
  }

  return res.json();
};

export const api = {
  get(endpoint: string) {
    return customFetch(endpoint, { method: 'GET' });
  },

  post(endpoint: string, data: any) {
    return customFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint: string, data?: any) {
    return customFetch(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete(endpoint: string) {
    return customFetch(endpoint, { method: 'DELETE' });
  },
};
