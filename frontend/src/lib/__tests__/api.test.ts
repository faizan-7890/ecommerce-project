import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setAccessToken } from '../api';

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('api client', () => {
  it('sends the Clerk token as a bearer header and JSON bodies', async () => {
    const fetchMock = mockFetch(200, { ok: true });
    setAccessToken('jwt-123');

    await api.post('/cart/items', { productId: 1 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/cart\/items$/);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer jwt-123', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ productId: 1 });
  });

  it('surfaces FastAPI string details as the error message', async () => {
    mockFetch(400, { detail: 'Your shopping cart is empty' });

    const error = (await api.post('/orders', {}).catch((e) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Your shopping cart is empty');
    expect(error.status).toBe(400);
  });

  it('surfaces the first FastAPI validation error', async () => {
    mockFetch(422, { detail: [{ loc: ['body', 'quantity'], msg: 'Input should be greater than 0' }] });

    await expect(api.post('/cart/items', {})).rejects.toThrow('Input should be greater than 0');
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })));

    await expect(api.get('/products')).rejects.toThrow('API request failed');
  });

  it('returns null for 204 responses', async () => {
    mockFetch(204, undefined);

    await expect(api.delete('/cart')).resolves.toBeNull();
  });
});
