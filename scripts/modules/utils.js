/**
 * ============================================
 * OlimpX - Utility Functions
 * ============================================
 */

/**
 * Generate a simple hash from a string (for simulating password hashing)
 * Note: This is NOT cryptographically secure, only for demo purposes
 * @param {string} str - String to hash
 * @returns {string} - Hashed string
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Generate a unique ID
 * @returns {string} - Unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format date to locale string
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string
 */
export function formatDate(date, options = {}) {
  const d = new Date(date);
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  return d.toLocaleDateString('uz-UZ', defaultOptions);
}

/**
 * Format date and time (e.g., "14:30, 4-may, 2026")
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date and time string
 */
export function formatDateTime(date) {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const day = d.getDate();
  const year = d.getFullYear();
  
  const uzMonths = [
    'yan', 'fev', 'mar', 'apr', 'may', 'iyn', 
    'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'
  ];
  const month = uzMonths[d.getMonth()];
  
  return `${hours}:${minutes}, ${day}-${month}, ${year}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const d = new Date(date);
  const diffInSeconds = Math.floor((now - d) / 1000);

  if (diffInSeconds < 60) return 'Hozirgina';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} daqiqa oldin`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} soat oldin`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} kun oldin`;

  return formatDate(date);
}

/**
 * Store data in localStorage with JSON serialization
 * @param {string} key - Storage key
 * @param {*} value - Value to store
 */
export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage set error:', e);
  }
}

/**
 * Get data from localStorage with JSON parsing
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @returns {*} - Parsed value or default
 */
export function storageGet(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    try {
      return JSON.parse(item);
    } catch (parseError) {
      // If it's not valid JSON, it's likely a raw string from a previous manual save
      return item;
    }
  } catch (e) {
    console.error('localStorage get error:', e);
    return defaultValue;
  }
}

/**
 * Remove data from localStorage
 * @param {string} key - Storage key
 */
export function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('localStorage remove error:', e);
  }
}

/**
 * Check if running in browser environment
 * @returns {boolean}
 */
export function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Add keyboard shortcut listener
 * @param {string} key - Key combination (e.g., 'ctrl+k')
 * @param {Function} callback - Callback function
 */
export function addKeyboardShortcut(key, callback) {
  if (!isBrowser()) return;

  const keys = key.toLowerCase().split('+');

  document.addEventListener('keydown', (e) => {
    const keyMatch = keys.every(k => {
      if (k === 'ctrl') return e.ctrlKey;
      if (k === 'shift') return e.shiftKey;
      if (k === 'alt') return e.altKey;
      if (k === 'meta') return e.metaKey;
      return e.key.toLowerCase() === k;
    });

    if (keyMatch) {
      e.preventDefault();
      callback(e);
    }
  });
}


/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}
/**
 * Escape HTML entities to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    // We intentionally DON'T escape quotes here to support Uzbek o' and g' 
    // when rendering inside text nodes via innerHTML.
}
