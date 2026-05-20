import { io, Socket } from 'socket.io-client';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

// ---- Token management ----
export const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('beerme_token') : null;

export const setToken = (token: string) =>
  localStorage.setItem('beerme_token', token);

export const clearToken = () => localStorage.removeItem('beerme_token');

// ---- Base fetch ----
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

// ---- Auth ----
export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'customer' | 'driver' | 'brewery_admin' | 'super_admin';
  idVerified: boolean;
  phone?: string;
}

export const register = (
  email: string,
  password: string,
  fullName: string,
  phone: string,
  role = 'customer'
) => request<{ token: string; user: User }>('POST', '/auth/register', { email, password, fullName, phone, role });

export const login = async (email: string, password: string) => {
  const data = await request<{ token: string; user: User }>('POST', '/auth/login', { email, password });
  setToken(data.token);
  return data;
};

export const logout = () => clearToken();

export const getMe = () => request<User>('GET', '/auth/me');

export const startIdVerification = () =>
  request<{ sessionId: string; clientSecret: string; url: string }>(
    'POST',
    '/auth/start-id-verification'
  );

// ---- Breweries ----
export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  abv?: number;
  available: boolean;
  image_url?: string;
  containerType?: string;
}

export interface Brewery {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance_miles?: number;
  logo_url?: string;
  delivery_fee?: number;
  menu?: MenuItem[];
}

export const getBreweries = (lat?: number, lng?: number) =>
  request<Brewery[]>('GET', `/breweries${lat && lng ? `?lat=${lat}&lng=${lng}` : ''}`);

export const getBrewery = (id: number | string) =>
  request<Brewery>('GET', `/breweries/${id}`);

// ---- Orders ----
export interface OrderItem {
  menuItemId: number;
  quantity: number;
  name?: string;
  price?: number;
}

export interface Order {
  id: number;
  brewery_name: string;
  status: string;
  total: number;
  items: OrderItem[];
  created_at: string;
  delivery_address?: string;
  driver_name?: string;
}

export const placeOrder = (
  breweryId: number | string,
  items: OrderItem[],
  deliveryAddressId: number | null,
  tip: number,
  notes?: string,
  deliveryAddress?: { street: string; city: string; state: string; zip: string }
) => request<Order>('POST', '/orders', { breweryId, items, tip, notes, deliveryAddress });

export const getOrder = (id: number | string) => request<Order>('GET', `/orders/${id}`);
export const getMyOrders = () => request<Order[]>('GET', '/orders');
export const updateOrderStatus = (id: number | string, status: string, note?: string) =>
  request<Order>('PATCH', `/orders/${id}/status`, { status, note });

// ---- Brewery admin ----
export const getBreweryOrders = (breweryId: number | string, status?: string) =>
  request<Order[]>('GET', `/breweries/${breweryId}/orders${status ? `?status=${status}` : ''}`);

export const addMenuItem = (breweryId: number | string, item: Partial<MenuItem>) =>
  request<MenuItem>('POST', `/breweries/${breweryId}/menu`, item);

export const updateMenuItem = (breweryId: number | string, itemId: number | string, updates: Partial<MenuItem>) =>
  request<MenuItem>('PATCH', `/breweries/${breweryId}/menu/${itemId}`, updates);

export interface Analytics {
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  orders_by_status: Record<string, number>;
}

export const getBreweryAnalytics = (breweryId: number | string) =>
  request<Analytics>('GET', `/breweries/${breweryId}/analytics`);

export const startStripeConnect = (breweryId: number | string) =>
  request<{ url: string }>('POST', `/breweries/${breweryId}/connect-stripe`);

export const getStripeStatus = (breweryId: number | string) =>
  request<{ connected: boolean; payoutsEnabled: boolean; detailsSubmitted: boolean }>('GET', `/breweries/${breweryId}/stripe-status`);

// ---- Driver ----
export interface DriverOrder {
  id: number | string;
  brewery_name: string;
  brewery_address: string;
  brewery_lat: number;
  brewery_lng: number;
  delivery_street: string;
  delivery_city: string;
  total: number;
  tip: number;
  delivery_fee: number;
  status: string;
  items?: OrderItem[];
}

export interface DriverEarnings {
  total_deliveries: number;
  total_earned: number;
  earned_today: number;
  earned_this_week: number;
}

export const setDriverOnline = (isOnline: boolean) =>
  request<{ isOnline: boolean }>('PATCH', '/drivers/online', { isOnline });

export const updateDriverLocation = (lat: number, lng: number, orderId?: number | string) =>
  request<{ ok: boolean }>('PATCH', '/drivers/location', { lat, lng, orderId });

export const getAvailableOrders = () =>
  request<DriverOrder[]>('GET', '/drivers/available-orders');

export const acceptOrder = (orderId: number | string) =>
  request<{ orderId: number | string; status: string }>('POST', `/drivers/accept-order/${orderId}`);

export const verifyCustomerId = (orderId: number | string, manualVerified: boolean) =>
  request<{ verified: boolean; message: string }>('POST', `/drivers/verify-id/${orderId}`, { manualVerified });

export const getDriverEarnings = () =>
  request<DriverEarnings>('GET', '/drivers/earnings');

// ---- Real-time ----
let socket: Socket | null = null;

export const connectSocket = () => {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token: getToken() },
    transports: ['websocket'],
  });
  return socket;
};

export const trackOrder = (
  orderId: number | string,
  onLocation: (data: { lat: number; lng: number }) => void,
  onStatus: (data: { status: string }) => void
) => {
  const s = connectSocket();
  s.emit('join_order', orderId);
  s.on('driver_location', onLocation);
  s.on('status_update', onStatus);
  return () => {
    s.off('driver_location', onLocation);
    s.off('status_update', onStatus);
  };
};
