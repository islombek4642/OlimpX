/**
 * ============================================
 * OlimpX - Toast Component
 * ============================================
 */

let toastContainer;

function createToastContainer() {
  if (toastContainer) return toastContainer;
  
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.id = 'toastContainer';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

function showToast({ type = 'info', title, message, duration = 3000 }) {
  const container = createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast--${type} animate-slideInRight`;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <div class="toast__icon">${icons[type]}</div>
    <div class="toast__content">
      ${title ? `<div class="toast__title">${title}</div>` : ''}
      <div class="toast__message">${message}</div>
    </div>
    <button class="toast__close">&times;</button>
  `;

  container.appendChild(toast);

  // Auto remove
  const timeout = setTimeout(() => {
    removeToast(toast);
  }, duration);

  // Close button
  toast.querySelector('.toast__close').addEventListener('click', () => {
    clearTimeout(timeout);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';
  toast.style.transition = 'all 0.3s ease';
  setTimeout(() => toast.remove(), 300);
}

export const toast = {
  success: (message, title) => showToast({ type: 'success', title, message }),
  error: (message, title) => showToast({ type: 'error', title, message }),
  warning: (message, title) => showToast({ type: 'warning', title, message }),
  info: (message, title) => showToast({ type: 'info', title, message })
};
