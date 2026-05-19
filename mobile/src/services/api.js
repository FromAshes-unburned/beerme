// mobile/src/services/api.js
// All API calls for the Beer Me mobile app

import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const BASE_URL = __DEV__ ? 'http://localhost:3000/api' : 'https://api.beermelou.com/api';
const SOCKET_URL = __DEV__ ? 'http://localhost:3000' : 'https://api.beermelou.com';

// ---- Token management ----
let _token = null;

export const setToken = async (token) => {
  _token = token;
  await AsyncStorage.setItem('beerme_token', token);
};

export const loadToken = async () => {
  _token = await AsyncStorage.getItem('beerme_token');
  return _token;
};

export const clearToken = async () => {
  _token = null;
  await AsyncStorage.removeItem('beerme_token');
};

// ---- Base fetch ----
const request = async (method, path, body = null) => {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

// ---- Auth ----
export const register = (email, password, fullName, phone, role = 'customer') =>
  request('POST', '/auth/register', { email, password, fullName, phone, role });

export const login = async (email, password) => {
  const data = await request('POST', '/auth/login', { email, password });
  await setToken(data.token);
  return data;
};

export const getMe = () => request('GET', '/auth/me');

export const startIdVerification = () => request('POST', '/auth/start-id-verification');

// ---- Breweries ----
export const getBreweries = (lat, lng) =>
  request('GET', `/breweries?lat=${lat}&lng=${lng}`);

export const getBrewery = (id) => request('GET', `/breweries/${id}`);

// ---- Orders ----
export const placeOrder = (breweryId, items, deliveryAddressId, tip, notes) =>
  request('POST', '/orders', { breweryId, items, deliveryAddressId, tip, notes });

export const getOrder = (id) => request('GET', `/orders/${id}`);

export const getMyOrders = () => request('GET', '/orders');

export const updateOrderStatus = (id, status, note) =>
  request('PATCH', `/orders/${id}/status`, { status, note });

// ---- Brewery admin ----
export const getBreweryOrders = (breweryId, status) =>
  request('GET', `/breweries/${breweryId}/orders${status ? `?status=${status}` : ''}`);

export const addMenuItem = (breweryId, item) =>
  request('POST', `/breweries/${breweryId}/menu`, item);

export const updateMenuItem = (breweryId, itemId, updates) =>
  request('PATCH', `/breweries/${breweryId}/menu/${itemId}`, updates);

export const getBreweryAnalytics = (breweryId) =>
  request('GET', `/breweries/${breweryId}/analytics`);

// ---- Driver ----
export const setDriverOnline = (isOnline) =>
  request('PATCH', '/drivers/online', { isOnline });

export const updateDriverLocation = (lat, lng, orderId) =>
  request('PATCH', '/drivers/location', { lat, lng, orderId });

export const getAvailableOrders = () => request('GET', '/drivers/available-orders');

export const acceptOrder = (orderId) =>
  request('POST', `/drivers/accept-order/${orderId}`);

export const verifyCustomerId = (orderId, scanData, manualVerified) =>
  request('POST', `/drivers/verify-id/${orderId}`, { scanData, manualVerified });

export const getDriverEarnings = () => request('GET', '/drivers/earnings');

// ---- Real-time (Socket.io) ----
let socket = null;

export const connectSocket = () => {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    auth: { token: _token },
    transports: ['websocket'],
  });
  return socket;
};

export const trackOrder = (orderId, onLocation, onStatus) => {
  const s = connectSocket();
  s.emit('join_order', orderId);
  s.on('driver_location', onLocation);
  s.on('status_update', onStatus);
  return () => {
    s.off('driver_location', onLocation);
    s.off('status_update', onStatus);
  };
};

export const emitDriverLocation = (orderId, lat, lng) => {
  const s = connectSocket();
  s.emit('driver_location', { orderId, lat, lng });
};
