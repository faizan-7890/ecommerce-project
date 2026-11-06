import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrdersTab from '../OrdersTab';
import { api } from '@/lib/api';
import type { AdminOrdersResponse } from '@/types';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn() },
}));

const addToast = vi.fn();
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ addToast }) }));

const ordersResponse: AdminOrdersResponse = {
  orders: [
    {
      id: 7,
      orderNumber: 'ORD-1730000000-AB12C',
      userId: 3,
      user: { name: 'Asha', email: 'asha@example.com' },
      total: 1080,
      orderStatus: 'processing',
      paymentStatus: 'paid',
      shipmentStatus: 'unfulfilled',
      itemCount: 1,
      items: [{ id: 1, productNameSnapshot: 'Tee (M/Black)', quantity: 2 }],
      createdAt: '2026-10-30T10:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  totalPages: 1,
};

describe('OrdersTab', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue(ordersResponse);
    vi.mocked(api.put).mockResolvedValue({ message: 'Order status updated' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads and lists orders with customer and items', async () => {
    render(<OrdersTab />);

    expect(await screen.findByText('ORD-1730000000-AB12C')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/admin/orders');
    expect(screen.getByText('Asha')).toBeTruthy();
    expect(screen.getByText(/Tee \(M\/Black\)/)).toBeTruthy();
  });

  it('marking an order shipped sends that field only, then reloads', async () => {
    render(<OrdersTab />);
    await screen.findByText('ORD-1730000000-AB12C');

    const shipmentSelect = screen.getByDisplayValue('Unfulfilled');
    fireEvent.change(shipmentSelect, { target: { value: 'shipped' } });

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/admin/orders/7/status', { shipmentStatus: 'shipped' }),
    );
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(addToast).toHaveBeenCalledWith("Order shipmentStatus updated to 'shipped'", 'info');
  });

  it('shows the API error when an update fails', async () => {
    vi.mocked(api.put).mockRejectedValue(new Error('Order not found'));
    render(<OrdersTab />);
    await screen.findByText('ORD-1730000000-AB12C');

    fireEvent.change(screen.getByDisplayValue('Processing'), { target: { value: 'delivered' } });

    await waitFor(() => expect(addToast).toHaveBeenCalledWith('Order not found', 'error'));
  });
});
