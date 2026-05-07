/**
 * Admin Header Component
 */
export function renderAdminHeader() {
  const header = document.getElementById('adminHeader');
  if (!header) return;

  header.innerHTML = `
    <div class="admin-header__left">
    <button class="navbar__toggle admin-sidebar-toggle" id="adminSidebarToggle" aria-label="Menu">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>
    </div>

    <div class="admin-header__actions">
      <button class="theme-toggle" id="themeToggle" aria-label="Mavzuni o'zgartirish">
        <svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>
        </svg>
        <svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </button>

      <div class="admin-header__divider"></div>

      <a href="/admin/settings" class="admin-header__user" style="text-decoration: none; cursor: pointer; color: inherit;">
        <div class="admin-header__user-text">
          <div class="admin-header__user-name">Administrator</div>
          <div class="admin-header__user-role">Super Admin</div>
        </div>
        <div class="admin-header__user-avatar">A</div>
      </a>

    </div>
  `;

  // Attach theme toggle listener
  const toggleBtn = header.querySelector('#themeToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (window.toggleTheme) window.toggleTheme();
    });
  }
}
