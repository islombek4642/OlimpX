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
    const statsRes = await api.reports.getStats();

    if (!statsRes.success) throw new Error(statsRes.error || 'Statistikani yuklab bo\'lmadi');

    const { stats, recentLogs } = statsRes.data;

    // 3. Update Stats UI
    animateValue('totalUsers', stats.totalUsers);
    animateValue('totalOlympiads', stats.totalOlympiads);
    animateValue('totalAttempts', stats.totalResults);

    // 4. Render Recent Activities (using audit logs instead of user list)
    const recentUsersList = document.getElementById('recentUsersList');
    if (recentUsersList) {
      if (!recentLogs || recentLogs.length === 0) {
        recentUsersList.innerHTML = '<p class="admin-card__empty">Faoliyat topilmadi.</p>';
      } else {
        const recent = recentLogs.slice(0, 5);
        recentUsersList.innerHTML = recent.map(log => `
          <div class="admin-user-row">
            <div class="admin-user-row__info">
              <div class="admin-user-row__avatar">
                ${log.user?.fullName?.[0] || '?'}
              </div>
              <div>
                <div class="admin-user-row__name">${log.user?.fullName || 'Tizim'}</div>
                <div class="admin-user-row__email">${log.action.replace(/_/g, ' ')}</div>
              </div>
            </div>
            <div class="admin-user-row__stats">
              <div class="admin-user-row__date">${new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch (error) {
    console.error('Admin Dashboard Data Loading Error:', error);
  }

  // 5. Setup Real-time Updates via WebSocket
  try {
    const { ws } = await import('../../scripts/modules/websocket.js');
    const token = localStorage.getItem('olimpx_token');
    
    ws.connect(token);
    
    ws.on('open', () => {
      ws.subscribe(['admin:stats']);
    });

    // Listen for real-time statistical updates
    ws.on('channel:admin:stats', (data) => {
      console.log('🔔 Real-time Update Received:', data.type);
      
      // Notify admin with a small toast or log if needed
      // For now, just refresh the dashboard data silently to keep it up to date
      refreshDashboardData();
    });
  } catch (wsError) {
    console.warn('WebSocket Initialization Failed:', wsError);
  }
});

/**
 * Fetch and refresh dashboard data
 */
async function refreshDashboardData() {
  try {
    const statsRes = await api.reports.getStats();
    if (statsRes.success) {
      const { stats, recentLogs } = statsRes.data;
      animateValue('totalUsers', stats.totalUsers);
      animateValue('totalOlympiads', stats.totalOlympiads);
      animateValue('totalAttempts', stats.totalResults);
      // Optional: update recent activity list here too
    }
  } catch (err) {
    console.error('Refresh Failed:', err);
  }
}

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
