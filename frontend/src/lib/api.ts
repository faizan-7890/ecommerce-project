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


async function parseJsonSafe(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

const customFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    ...getHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const mergedOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'omit', // Clerk uses Bearer token, we don't need cookies here
  };

  const res = await fetch(url, mergedOptions);

  if (!res.ok) {
    const err = (await parseJsonSafe(res)) as { message?: string; detail?: any };
    const detailMessage = typeof err.detail === 'string'
      ? err.detail
      : Array.isArray(err.detail) && err.detail[0]?.msg
      ? err.detail[0].msg
      : undefined;
    throw new ApiError(detailMessage || err.message || 'API request failed', res.status);
  }

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
