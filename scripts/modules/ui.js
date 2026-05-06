/**
 * ============================================
 * OlimpX - UI Components Module
 * Toast notifications, theme toggle, loading states
 * ============================================
 */

import { storageGet, storageSet, escapeHtml } from './utils.js';


import { toast } from '../../components/Toast.js';

export { toast };

/**
 * Show a premium confirmation modal
 */
export function showConfirmModal({ title, message, confirmText = 'Ha', cancelText = 'Yo\'q', type = 'warning' }) {
  const icon = type === 'warning' ? '⚠️' : '❓';
  const iconClass = type === 'warning' ? 'modal-icon--warning' : 'modal-icon--info';
  
  return new Promise((resolve) => {
    const modalHtml = `
      <div class="modal-overlay" id="confirmModal">
        <div class="modal-content">
          <div class="modal-icon ${iconClass}">${icon}</div>
          <h3 class="modal-title">${escapeHtml(title)}</h3>
          <p class="modal-text">${escapeHtml(message)}</p>
          <div class="modal-actions">
            <button class="btn btn--secondary" id="modalCancel">${escapeHtml(cancelText)}</button>
            <button class="btn btn--primary" id="modalConfirm">${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </div>
    `;


    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('confirmModal');
    
    // Animate in
    setTimeout(() => modal.classList.add('modal-overlay--active'), 10);

    const cleanup = (result) => {
      modal.classList.remove('modal-overlay--active');
      setTimeout(() => {
        modal.remove();
        resolve(result);
      }, 300);
    };

    document.getElementById('modalConfirm').onclick = () => cleanup(true);
    document.getElementById('modalCancel').onclick = () => cleanup(false);
    
    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) cleanup(false);
    };
  });
}

// ============================================
// THEME TOGGLE (Dark/Light Mode)
// ============================================

const THEME_KEY = 'olimpx_theme';

/**
 * Initialize theme based on saved preference or system preference
 */
export function initTheme() {
  const savedTheme = storageGet(THEME_KEY);

  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}

/**
 * Toggle between dark and light theme
 */
export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  storageSet(THEME_KEY, newTheme);
}

/**
 * Get current theme
 * @returns {string} - Current theme
 */
export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

// Make theme functions globally accessible for components
if (typeof window !== 'undefined') {
  window.initTheme = initTheme;
  window.toggleTheme = toggleTheme;
  window.getTheme = getTheme;
}

/**
 * Create theme toggle button
 * @param {HTMLElement} container - Container to append button to
 */
export function createThemeToggle(container) {
  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.setAttribute('aria-label', 'Mavzuni o\'zgartirish');
  button.innerHTML = `
    <svg class="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
    <svg class="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  `;

  const sunIcon = button.querySelector('.theme-icon-sun');
  const moonIcon = button.querySelector('.theme-icon-moon');

  // Update icon based on current theme
  function updateIcon() {
    const isDark = getTheme() === 'dark';
    sunIcon.style.display = isDark ? 'none' : 'block';
    moonIcon.style.display = isDark ? 'block' : 'none';
  }

  updateIcon();

  button.addEventListener('click', () => {
    toggleTheme();
    updateIcon();
  });

  container.appendChild(button);
  return button;
}

// ============================================
// LOADING STATES
// ============================================

/**
 * Set loading state on a button
 * @param {HTMLElement} button - Button element
 * @param {boolean} isLoading - Loading state
 * @param {string} loadingText - Text to show while loading
 */
export function setButtonLoading(button, isLoading, loadingText = '') {
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.classList.add('btn--loading');
    button.innerHTML = `
      <span class="spinner spinner-sm"></span>
      ${loadingText ? `<span class="btn__text">${loadingText}</span>` : ''}
    `;
  } else {
    button.disabled = false;
    button.classList.remove('btn--loading');
    button.innerHTML = button.dataset.originalText || '';
  }
}

/**
 * Create loading overlay
 * @returns {object} - Overlay controller { show, hide }
 */
export function createLoadingOverlay() {
  let overlay = null;

  return {
    show(text = 'Yuklanmoqda...') {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
          <div class="loading-overlay__content">
            <div class="loading-overlay__spinner"></div>
            <p class="loading-overlay__text"></p>
          </div>
        `;
        document.body.appendChild(overlay);
      }

      overlay.querySelector('.loading-overlay__text').textContent = text;
      overlay.classList.add('loading-overlay--active');
    },

    hide() {
      if (overlay) {
        overlay.classList.remove('loading-overlay--active');
      }
    }
  };
}

// ============================================
// FORM HELPERS
// ============================================

/**
 * Set field error state
 * @param {HTMLElement} formGroup - Form group element
 * @param {string|null} error - Error message or null to clear
 */
export function setFieldError(formGroup, error) {
  // Remove existing states
  formGroup.classList.remove('form-group--error', 'form-group--success');
  const existingError = formGroup.querySelector('.form-error');
  if (existingError) {
    existingError.remove();
  }

  if (error) {
    formGroup.classList.add('form-group--error');
    const errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.textContent = error;
    formGroup.appendChild(errorEl);
  }
}

/**
 * Set field success state
 * @param {HTMLElement} formGroup - Form group element
 * @param {boolean} isSuccess - Success state
 */
export function setFieldSuccess(formGroup, isSuccess) {
  formGroup.classList.toggle('form-group--success', isSuccess);
}

/**
 * Toggle password visibility
 * @param {HTMLInputElement} input - Password input
 * @param {HTMLElement} toggleBtn - Toggle button
 */
export function togglePasswordVisibility(input, toggleBtn) {
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  // Update icon
  const icon = isPassword ? getEyeOffIcon() : getEyeIcon();
  toggleBtn.innerHTML = icon;
  toggleBtn.setAttribute('aria-label', isPassword ? 'Parolni yashirish' : 'Parolni ko\'rsatish');
}

/**
 * Get eye icon SVG
 */
function getEyeIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;
}

/**
 * Get eye-off icon SVG
 */
function getEyeOffIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>`;
}

/**
 * Create password toggle button
 * @param {HTMLInputElement} input - Password input
 * @returns {HTMLElement} - Toggle button
 */
export function createPasswordToggle(input) {
  input.classList.add('form-input--password');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'password-toggle';
  button.setAttribute('aria-label', 'Parolni ko\'rsatish');
  button.innerHTML = getEyeIcon();

  button.addEventListener('click', () => togglePasswordVisibility(input, button));

  return button;
}

// ============================================
// HELPER FUNCTIONS
// ============================================


