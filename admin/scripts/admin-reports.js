/**
 * Admin Reports Script
 * Handles fetching and rendering audit logs
 */
import { initTheme } from '../../scripts/modules/ui.js';
import { renderAdminSidebar } from '../components/AdminSidebar.js';
import { renderAdminHeader } from '../components/AdminHeader.js';
import { requireAdmin } from '../../scripts/modules/auth.js';
import { api } from '../../scripts/modules/api.js';
import { escapeHtml } from '../../scripts/modules/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  
  initTheme();
  renderAdminSidebar('reports'); // We should add 'reports' to sidebar items if not present
  renderAdminHeader();

  const logsTableBody = document.getElementById('logsTableBody');
  const resultsTableBody = document.getElementById('resultsTableBody');
  const refreshLogsBtn = document.getElementById('refreshLogs');
  const refreshResultsBtn = document.getElementById('refreshResults');

  const loadStats = async () => {
    loadLogs();
    loadResults();
  };

  const loadLogs = async () => {
    logsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">Yuklanmoqda...</td></tr>';
    try {
      const res = await api.reports.getStats();
      if (res.success) {
        renderLogs(res.data.recentLogs);
      }
    } catch (error) {
      logsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--color-danger-600);">${error.message}</td></tr>`;
    }
  };

  const loadResults = async () => {
    resultsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">Yuklanmoqda...</td></tr>';
    try {
      const res = await api.results.getAllResults();
      if (res.success) {
        renderResults(res.data);
      }
    } catch (error) {
      resultsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--color-danger-600);">${error.message}</td></tr>`;
    }
  };

  const renderResults = (results) => {
    if (!results || results.length === 0) {
      resultsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">Natijalar topilmadi.</td></tr>';
      return;
    }

    resultsTableBody.innerHTML = results.map(res => `
      <tr>
        <td><small>${new Date(res.createdAt).toLocaleString()}</small></td>
        <td>
          <div class="user-info-cell">
            <strong>${res.user ? escapeHtml(res.user.fullName) : 'User'}</strong>
            <small>${res.user ? escapeHtml(res.user.email) : '-'}</small>
          </div>
        </td>
        <td>${res.olympiad ? escapeHtml(res.olympiad.title) : '-'}</td>
        <td>
           <div class="score-badge ${res.score >= 70 ? 'status-badge--success' : (res.score >= 40 ? 'status-badge--warning' : 'status-badge--danger')}">
             ${res.score}%
           </div>
        </td>
        <td>
           <div style="font-size: 12px; line-height: 1.4;">
             <span style="color: #059669;">✅ ${res.correctCount}</span> | 
             <span style="color: #dc2626;">❌ ${res.incorrectCount || 0}</span> | 
             <span style="color: #d97706;">⏭️ ${res.skippedCount || 0}</span>
           </div>
        </td>
        <td>
           <div style="font-size: 12px;">
             ⏱️ ${res.timeTaken} <br>
             <small style="color: var(--text-tertiary);">Avg: ${res.averageTime || 0}s</small>
           </div>
        </td>
      </tr>
    `).join('');
  };

  const renderLogs = (logs) => {
    if (!logs || logs.length === 0) {
      logsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">Loglar topilmadi.</td></tr>';
      return;
    }

    logsTableBody.innerHTML = logs.map(log => `
      <tr>
        <td><small>${new Date(log.createdAt).toLocaleString()}</small></td>
        <td>
          <div class="user-info-cell">
            <strong>${log.user ? escapeHtml(log.user.fullName) : 'System'}</strong>
            <small>${log.user ? escapeHtml(log.user.email) : '-'}</small>
          </div>
        </td>
        <td><span class="status-badge ${getActionBadgeClass(log.action)}">${log.action}</span></td>
        <td>${log.resourceType || '-'}</td>
        <td><small>${log.resourceId ? log.resourceId.slice(0, 8) + '...' : '-'}</small></td>
        <td><small>${log.ipAddress === '::1' ? 'Localhost' : (log.ipAddress || '-')}</small></td>
      </tr>
    `).join('');
  };

  const getActionBadgeClass = (action) => {
    if (action.startsWith('CREATE')) return 'status-badge--success';
    if (action.startsWith('DELETE')) return 'status-badge--danger';
    if (action.startsWith('UPDATE')) return 'status-badge--warning';
    if (action === 'SUBMIT_TEST') return 'status-badge--info';
    return '';
  };

  refreshLogsBtn.addEventListener('click', loadLogs);
  refreshResultsBtn.addEventListener('click', loadResults);
  loadStats();
});
