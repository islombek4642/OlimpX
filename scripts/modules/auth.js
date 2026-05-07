/**
 * ============================================
 * OlimpX - Authentication Module
 * Now using Backend API instead of localStorage
 * ============================================
 */

import { storageSet, storageGet, storageRemove } from './utils.js';
import { api } from './api.js';

// Storage keys
const STORAGE_KEYS = {
  CURRENT_USER: 'olimpx_current_user',
  TOKEN: 'olimpx_token',
};

/**
 * Register a new user
 */
export async function register(userData) {
  try {
    const result = await api.auth.register(userData);
    if (result.success) {
      // After successful registration, we login automatically
      return await login(userData.email, userData.password);
    }
    return { success: false, error: 'Ro\'yxatdan o\'tishda xatolik yuz berdi' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Login user
 */
export async function login(email, password) {
  try {
    const result = await api.auth.login({ email, password });
    
    if (result.success) {
      // Save session - backend returns data.token and data.user
      storageSet(STORAGE_KEYS.CURRENT_USER, result.data.user);
      localStorage.setItem(STORAGE_KEYS.TOKEN, result.data.accessToken);
      return { success: true, user: result.data.user };
    }
    return { success: false, error: 'Email yoki parol noto\'g\'ri' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Logout current user
 */
export function logout() {
  storageRemove(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email) {
  try {
    const result = await api.auth.requestPasswordReset({ email });
    if (result.success) {
      return { success: true, message: 'Parolni tiklash linki emailingizga yuborildi' };
    }
    return { success: false, error: 'Email topilmadi yoki xatolik yuz berdi' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper to decode JWT without a library
 */
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replaceAll('-', '+').replaceAll('_', '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.codePointAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Check if user is authenticated and token is valid
 */
export function isAuthenticated() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const currentUser = storageGet(STORAGE_KEYS.CURRENT_USER);
  
  if (!token || !currentUser) return false;

  // Check expiration
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp < now) {
    logout();
    return false;
  }

  return true;
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  return storageGet(STORAGE_KEYS.CURRENT_USER);
}

/**
 * Require authentication
 */
export function requireAuth(redirectUrl = window.location.pathname) {
  if (!isAuthenticated()) {
    const params = new URLSearchParams();
    if (redirectUrl && !redirectUrl.includes('login.html')) {
      params.set('redirect', redirectUrl);
    }
    const query = params.toString();
    const loginPath = '/pages/login.html';
    window.location.href = `${loginPath}${query ? '?' + query : ''}`;
    return false;
  }
  return true;
}

/**
 * Check if current user is admin
 */
export function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

/**
 * Require admin role
 */
export function requireAdmin() {
  if (!requireAuth()) return false;
  
  if (!isAdmin()) {
    window.location.href = '/pages/dashboard.html';
    return false;
  }
  return true;
}

/**
 * Redirect if authenticated
 */
export function redirectIfAuthenticated() {
  if (isAuthenticated()) {
    if (isAdmin()) {
      window.location.href = '/admin/index.html';
    } else {
      window.location.href = '/pages/dashboard.html';
    }
    return true;
  }
  return false;
}

/**
 * Fetch latest profile from server
 */
export async function syncProfile() {
  if (!isAuthenticated()) return null;
  try {
    const result = await api.auth.getMe();
    if (result.success) {
      storageSet(STORAGE_KEYS.CURRENT_USER, result.data.user);
      return result.data.user;
    }
  } catch (error) {
    console.error('Profile sync failed:', error);
    // If token is invalid, logout
    if (error.message.includes('Token')) {
      logout();
      window.location.reload();
    }
  }
  return null;
}
