/**
 * Admin Users Management Script
 * Now connected to real backend API
 */
import { initTheme, toast, showConfirmModal } from '../../scripts/modules/ui.js';
import { renderAdminSidebar } from '../components/AdminSidebar.js';
import { renderAdminHeader } from '../components/AdminHeader.js';
import { requireAdmin } from '../../scripts/modules/auth.js';
import { api } from '../../scripts/modules/api.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  initTheme();
  renderAdminSidebar('users');
  renderAdminHeader();

  const tableBody = document.getElementById('usersTableBody');
  const searchInput = document.getElementById('userSearch');

  let allUsers = [];

  async function loadUsers() {
    try {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><div class="spinner"></div></td></tr>';
      const response = await api.users.getAll();
      allUsers = response.success ? response.data : [];
      renderUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Foydalanuvchilarni yuklashda xatolik');
    }
  }

  function renderUsers(usersToRender) {
    if (usersToRender.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">Foydalanuvchilar topilmadi.</td></tr>';
      return;
    }

    tableBody.innerHTML = usersToRender.map(user => {
      const totalResults = user._count?.results || 0;
      const isAdmin = user.role === 'ADMIN';
      const lastLoginDate = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Hech qachon';
      
      return `
        <tr>
          <td>
            <div class="admin-user-row__info">
              <div class="admin-user-row__avatar">
                ${user.fullName[0]}
              </div>
              <div style="display: flex; flex-direction: column;">
                <span class="admin-user-row__name">
                  ${user.fullName} 
                  ${isAdmin ? '<span class="status-badge status-badge--success" style="font-size: 10px; padding: 2px 8px; margin-left: 8px;">ADMIN</span>' : ''}
                </span>
              </div>
            </div>
          </td>
          <td>${user.email}</td>
          <td>
            <span style="font-weight: 600;">${totalResults}</span> ta
          </td>
          <td>
            <span style="font-size: 13px; color: var(--text-secondary);">${lastLoginDate}</span>
          </td>
          <td>${new Date(user.createdAt).toLocaleDateString()}</td>
          <td>
            <div class="table-action-btns">
              <button class="btn btn--icon delete-btn" data-id="${user.id}" title="O'chirish" ${isAdmin ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');


    // Attach Delete Listeners
    tableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const confirmed = await showConfirmModal({
          title: 'Foydalanuvchini o\'chirish',
          message: 'Ushbu foydalanuvchini tizimdan butunlay o\'chirmoqchimisiz? Ushbu amalni ortga qaytarib bo\'lmaydi.',
          confirmText: 'O\'chirish',
          type: 'danger'
        });

        if (confirmed) {
          try {
            const res = await api.users.delete(id);
            if (res.success) {
              toast.success('Foydalanuvchi o\'chirildi');
              loadUsers();
            }
          } catch (error) {
            toast.error(error.message);
          }
        }
      });
    });
  }

  // Search Functionality
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => 
      u.fullName.toLowerCase().includes(term) || 
      u.email.toLowerCase().includes(term)
    );
    renderUsers(filtered);
  });

  loadUsers();
});
