/**
 * Admin Dashboard Script
 * Now fetching real data from the Backend API
 */
import { initTheme } from '../../scripts/modules/ui.js';
import { renderAdminSidebar } from '../components/AdminSidebar.js';
import { renderAdminHeader } from '../components/AdminHeader.js';
import { requireAdmin } from '../../scripts/modules/auth.js';
import { api } from '../../scripts/modules/api.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  
  // 1. Initialize Core UI
  initTheme();
  renderAdminSidebar('dashboard');
  renderAdminHeader();

  // 2. Load Data from API
  try {
    const [usersRes, olympiadsRes, resultsRes] = await Promise.all([
      api.users.getAll(),
      api.olympiads.getAll(),
      api.results.getAllResults()
    ]);

    const users = usersRes.success ? usersRes.data : [];
    const olympiads = olympiadsRes.success ? olympiadsRes.data : [];
    const results = resultsRes.success ? resultsRes.data : [];

    // 3. Update Stats UI
    animateValue('totalUsers', users.length);
    animateValue('totalOlympiads', olympiads.length);
    animateValue('totalAttempts', results.length);

    // 4. Render Recent Users
    const recentUsersList = document.getElementById('recentUsersList');
    if (recentUsersList) {
      if (users.length === 0) {
        recentUsersList.innerHTML = '<p class="admin-card__empty">Foydalanuvchilar topilmadi.</p>';
      } else {
        const recent = users.slice(0, 5); // Already sorted by createdAt desc in backend
        recentUsersList.innerHTML = recent.map(user => `
          <div class="admin-user-row">
            <div class="admin-user-row__info">
              <div class="admin-user-row__avatar">
                ${user.fullName[0]}
              </div>
              <div>
                <div class="admin-user-row__name">${user.fullName}</div>
                <div class="admin-user-row__email">${user.email}</div>
              </div>
            </div>
            <div class="admin-user-row__stats">
              <div class="admin-user-row__count">${user._count?.results || 0} urinish</div>
              <div class="admin-user-row__date">${new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Admin Dashboard Data Loading Error:', error);
  }
});

/**
 * Helper to animate numbers
 */
function animateValue(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  let start = 0;
  const duration = 1000;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.round(start + (target - start) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
