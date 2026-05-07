/**
 * ============================================
 * OlimpX - Navbar Component
 * ============================================
 */

import { logout, getCurrentUser, isAdmin } from '../scripts/modules/auth.js';
import { navigateTo } from './PageTransition.js';
import { showConfirmModal } from '../scripts/modules/ui.js';
import { escapeHtml } from '../scripts/modules/utils.js';


export function renderNavbar(activePage = 'dashboard') {
  const user = getCurrentUser();
  const isUserAdmin = isAdmin();
  const navContainer = document.querySelector('.navbar');
  
  if (!navContainer) return;

  const userFullName = user?.fullName || '';
  const userInitial = userFullName.charAt(0) || 'U';

  navContainer.innerHTML = `
    <div class="navbar__container">
      <a href="/dashboard" class="navbar__brand">
        <div class="navbar__logo">OX</div>
        <span>OlimpX</span>
      </a>

      <!-- Hamburger Button (Mobile Only) -->
      <button class="navbar__toggle" id="navToggle" aria-label="Menu">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>

      <div class="navbar__menu" id="navMenu">
        <a href="/dashboard" class="navbar__item ${activePage === 'dashboard' ? 'navbar__item--active' : ''}">Bosh sahifa</a>
        <a href="/olympiads" class="navbar__item ${activePage === 'olympiads' ? 'navbar__item--active' : ''}">Olimpiadalar</a>
        <a href="/history" class="navbar__item ${activePage === 'history' ? 'navbar__item--active' : ''}">Natijalar</a>
        <a href="/profile" class="navbar__item ${activePage === 'profile' ? 'navbar__item--active' : ''}">Profil</a>
        ${isUserAdmin ? `<a href="/admin/" class="navbar__item" style="color: var(--color-primary-600); font-weight: 700;">🔧 Admin</a>` : ''}
        
        <div class="navbar__user-mobile">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
            <a href="/profile" class="navbar__user-info">
              <div class="navbar__user-avatar">${escapeHtml(userInitial)}</div>
              <span>${escapeHtml(userFullName || 'Foydalanuvchi')}</span>
            </a>
            <button class="theme-toggle" id="themeToggleMobile" aria-label="Mavzuni o'zgartirish">
              <svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
              </svg>
              <svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>
          </div>
          <button class="btn btn--danger btn--full" id="logoutBtnMobile">Chiqish</button>
        </div>

        <div class="navbar__actions">
          <button class="theme-toggle" id="themeToggle" aria-label="Mavzuni o'zgartirish">
            <svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button class="btn btn--danger btn--sm" id="logoutBtn" style="padding: 8px 16px;">Chiqish</button>
          <a href="/profile" class="navbar__avatar" title="Profilni ko'rish">${escapeHtml(userInitial)}</a>
        </div>
      </div>
    </div>
    <!-- Overlay for mobile menu -->
    <div class="navbar__overlay" id="navOverlay"></div>
  `;

  // --- Navbar Logic ---
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navOverlay = document.getElementById('navOverlay');
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutBtnMobile = document.getElementById('logoutBtnMobile');
  const themeToggle = document.getElementById('themeToggle');
  const themeToggleMobile = document.getElementById('themeToggleMobile');

  const toggleMenu = () => {
    navToggle.classList.toggle('is-active');
    navMenu.classList.toggle('is-active');
    navOverlay.classList.toggle('is-active');
    document.body.classList.toggle('no-scroll');
  };

  if (navToggle) navToggle.addEventListener('click', toggleMenu);
  if (navOverlay) navOverlay.addEventListener('click', toggleMenu);

  // Theme Toggle Logic
  const handleThemeToggle = () => {
    if (window.toggleTheme) {
      window.toggleTheme();
    }
  };

  if (themeToggle) themeToggle.addEventListener('click', handleThemeToggle);
  if (themeToggleMobile) themeToggleMobile.addEventListener('click', handleThemeToggle);

  const handleLogout = async () => {
    const confirmed = await showConfirmModal({
      title: 'Tizimdan chiqish',
      message: 'Haqiqatan ham o\'z hisobingizdan chiqmoqchimisiz?',
      confirmText: 'Ha, chiqish',
      cancelText: 'Bekor qilish',
      type: 'warning'
    });

    if (confirmed) {
      logout();
      navigateTo('/login');
    }
  };

  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout);

  // --- Keyboard Navigation ---
  // Allow switching between main pages using Arrow keys
  const pages = ['dashboard', 'olympiads', 'history', 'profile'];
  const currentIndex = pages.indexOf(activePage);

  const handleKeyDown = (e) => {
    // Ignore if user is typing in an input or textarea
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || 
                     document.activeElement.isContentEditable;
    if (isTyping) return;

    if (currentIndex === -1) return; // Not a main page

    if (e.key === 'ArrowRight' && currentIndex < pages.length - 1) {
      navigateTo(`/${pages[currentIndex + 1]}`);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      navigateTo(`/${pages[currentIndex - 1]}`);
    }
  };

  // Remove existing listener if any (to avoid duplicates)
  document.removeEventListener('keydown', window._olimpxNavHandler);
  window._olimpxNavHandler = handleKeyDown;
  document.addEventListener('keydown', handleKeyDown);
}
