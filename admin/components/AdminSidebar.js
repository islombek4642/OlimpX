/**
 * Admin Sidebar Component
 */
export function renderAdminSidebar(activePage = 'dashboard') {
  const sidebar = document.getElementById('adminSidebar');
  if (!sidebar) return;

  const menuItems = [
    { id: 'dashboard', label: 'Boshqaruv', icon: '📊', url: '/admin' },
    { id: 'olympiads', label: 'Olimpiadalar', icon: '🏆', url: '/admin/olympiads' },
    { id: 'questions', label: 'Savollar bazasi', icon: '❓', url: '/admin/questions' },
    { id: 'users', label: 'Foydalanuvchilar', icon: '👥', url: '/admin/users' },
    { id: 'results', label: 'Natijalar', icon: '📈', url: '/admin/results' },
    { id: 'reports', label: 'Hisobotlar', icon: '📋', url: '/admin/reports' },
    { id: 'settings', label: 'Sozlamalar', icon: '⚙️', url: '/admin/settings' }
  ];

  sidebar.innerHTML = `
    <div class="admin-sidebar__header">
      <a href="/admin" class="admin-sidebar__logo">
        <span>OlimpX</span>
        <span style="font-size: 10px; background: var(--color-primary-600); color: white; padding: 1px 6px; border-radius: 100px; margin-left: 4px;">ADMIN</span>
      </a>
      <button class="admin-sidebar__close" id="adminSidebarClose">&times;</button>
    </div>
    
    <nav class="admin-sidebar__nav">
      ${menuItems.map(item => `
        <a href="${item.url}" class="admin-nav-item ${activePage === item.id ? 'admin-nav-item--active' : ''}">
          <span class="admin-nav-icon">${item.icon}</span>
          <span class="admin-nav-label">${item.label}</span>
        </a>
      `).join('')}
    </nav>

    <div style="margin-top: auto; padding: var(--space-4);">
      <a href="/dashboard" class="admin-nav-item" style="color: var(--color-primary-600);">
        <span>🏠</span>
        <span class="admin-nav-label">Asosiy sayt</span>
      </a>
    </div>


  `;

  // Create overlay if it doesn't exist
  if (!document.getElementById('adminSidebarOverlay')) {
    const overlay = document.createElement('div');
    overlay.className = 'admin-sidebar__overlay';
    overlay.id = 'adminSidebarOverlay';
    document.body.appendChild(overlay);
  }

  // Toggle Logic
  const setupToggle = () => {
    const toggleBtn = document.getElementById('adminSidebarToggle');
    const closeBtn = document.getElementById('adminSidebarClose');
    const overlay = document.getElementById('adminSidebarOverlay');
    const sidebarEl = document.getElementById('adminSidebar');

    if (!toggleBtn || !sidebarEl || !overlay) return;

    const open = () => {
      sidebarEl.classList.add('is-active');
      overlay.classList.add('is-active');
      document.body.classList.add('no-scroll');
    };

    const close = () => {
      sidebarEl.classList.remove('is-active');
      overlay.classList.remove('is-active');
      document.body.classList.remove('no-scroll');
    };

    toggleBtn.onclick = open;
    if (closeBtn) closeBtn.onclick = close;
    overlay.onclick = close;
  };

  setTimeout(setupToggle, 100);
}
