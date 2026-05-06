/**
 * Admin Olympiads Script
 * Now connected to real backend API
 */
import { initTheme, toast, showConfirmModal } from '../../scripts/modules/ui.js';
import { renderAdminSidebar } from '../components/AdminSidebar.js';
import { renderAdminHeader } from '../components/AdminHeader.js';
import { requireAdmin } from '../../scripts/modules/auth.js';
import { api } from '../../scripts/modules/api.js';
import { escapeHtml } from '../../scripts/modules/utils.js';


document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  initTheme();
  renderAdminSidebar('olympiads', true);
  renderAdminHeader();

  const tableBody = document.getElementById('olympiadsTableBody');
  const modal = document.getElementById('olympiadModal');
  const addBtn = document.getElementById('addOlympiadBtn');
  const closeModal = document.getElementById('closeModal');
  const form = document.getElementById('olympiadForm');
  const modalTitle = document.getElementById('modalTitle');

  // Bulk Modal Elements
  const bulkModal = document.getElementById('bulkUploadModal');
  const bulkUploadBtn = document.getElementById('bulkUploadBtn');
  const closeBulkModal = document.getElementById('closeBulkModal');
  const bulkOlymTitle = document.getElementById('bulkOlymTitle');
  const bulkOlymDescription = document.getElementById('bulkOlymDescription');
  const bulkOlymDuration = document.getElementById('bulkOlymDuration');
  const bulkOlymFile = document.getElementById('bulkOlymFile');
  const startBulkUpload = document.getElementById('startBulkUpload');
  const bulkStatus = document.getElementById('bulkStatus');

  let allOlympiads = [];
  let editingId = null;

  async function loadOlympiads() {
    try {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><div class="spinner"></div></td></tr>';
      const response = await api.olympiads.getAll();
      allOlympiads = response.success ? response.data : [];
      renderTable(allOlympiads);
    } catch (error) {
      console.error('Failed to load olympiads:', error);
      toast.error('Olimpiadalarni yuklashda xatolik');
    }
  }

  function renderTable(data) {
    if (data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-tertiary);">Olimpiadalar topilmadi.</td></tr>';
      return;
    }

    tableBody.innerHTML = data.map(ol => `
      <tr>
        <td><code>${ol.id.slice(0, 8)}...</code></td>
        <td style="font-weight: 600;">${escapeHtml(ol.title)}</td>
        <td>${ol._count?.questions || 0} ta</td>
        <td>${ol.duration} s</td>
        <td>
          <span class="status-badge ${ol.status === 'active' ? 'status-badge--success' : 'status-badge--warning'}">
            ${ol.status === 'active' ? 'Faol' : 'Nofaol'}
          </span>
        </td>
        <td>
          <div class="table-action-btns">
            <button class="btn btn--icon edit-btn" data-id="${ol.id}" title="Tahrirlash">✏️</button>
            <button class="btn btn--icon delete-btn" data-id="${ol.id}" title="O'chirish">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach listeners
    tableBody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    tableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteOlympiad(btn.dataset.id));
    });
  }




  function openEditModal(id) {
    const ol = allOlympiads.find(o => o.id === id);
    if (!ol) return;

    editingId = id;
    modalTitle.textContent = 'Olimpiadani tahrirlash';
    document.getElementById('olymTitle').value = ol.title;
    document.getElementById('olymDuration').value = ol.duration;
    document.getElementById('olymCategory').value = ol.category || 'Boshqa';
    
    modal.classList.add('modal-overlay--active');
  }

  async function deleteOlympiad(id) {
    const confirmed = await showConfirmModal({
      title: 'Olimpiadani o\'chirish',
      message: 'Ushbu olimpiadani butunlay o\'chirmoqchimisiz? Barcha bog\'liq ma\'lumotlar ham o\'chirilishi mumkin.',
      confirmText: 'O\'chirish',
      type: 'danger'
    });

    if (confirmed) {
      try {
        const res = await api.olympiads.delete(id);
        if (res.success) {
          toast.success('Olimpiada o\'chirildi');
          loadOlympiads();
        }
      } catch (error) {
        toast.error(error.message);
      }
    }
  }

  addBtn.addEventListener('click', () => {
    editingId = null;
    modalTitle.textContent = 'Yangi Olimpiada';
    form.reset();
    modal.classList.add('modal-overlay--active');
  });

  closeModal.addEventListener('click', () => {
    modal.classList.remove('modal-overlay--active');
  });

  // --- Bulk Upload Listeners ---
  bulkUploadBtn.addEventListener('click', () => {
    bulkModal.classList.add('modal-overlay--active');
  });

  closeBulkModal.addEventListener('click', () => {
    bulkModal.classList.remove('modal-overlay--active');
    bulkStatus.style.display = 'none';
    bulkOlymFile.value = '';
    startBulkUpload.disabled = true;
  });

  [bulkOlymTitle, bulkOlymFile].forEach(input => {
    if (!input) return;
    input.addEventListener('input', validateBulkForm);
    if (input.type === 'file') input.addEventListener('change', validateBulkForm);
  });

  function validateBulkForm() {
    const titleValid = bulkOlymTitle.value.trim().length >= 3;
    const fileSelected = bulkOlymFile.files.length > 0;
    startBulkUpload.disabled = !(titleValid && fileSelected);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('olymTitle').value,
      duration: parseInt(document.getElementById('olymDuration').value),
      category: document.getElementById('olymCategory').value,
      icon: '📚'
    };

    try {
      let res;
      if (editingId) {
        res = await api.olympiads.update(editingId, data);
      } else {
        res = await api.olympiads.create(data);
      }

      if (res.success) {
        toast.success(editingId ? 'Olimpiada yangilandi' : 'Yangi olimpiada qo\'shildi');
        modal.classList.remove('modal-overlay--active');
        form.reset();
        loadOlympiads();
      }
    } catch (error) {
      toast.error(error.message);
    }
  });

  startBulkUpload.addEventListener('click', async () => {
    const title = bulkOlymTitle.value.trim();
    const description = bulkOlymDescription.value.trim();
    const file = bulkOlymFile.files[0];
    const defaultDuration = document.getElementById('bulkQuestionDuration').value;

    if (!title) return toast.error('Iltimos, olimpiada nomini kiriting');
    if (!file) return toast.error('Iltimos, Word faylni tanlang');

    try {
      showBulkStatus('Fayl yuborilmoqda...', 'info');
      startBulkUpload.disabled = true;

      // Use FormData for file upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('defaultDuration', defaultDuration);
      formData.append('file', file);

      // Call Backend Import API (Secure & Powerful)
      const res = await api.olympiads.import(formData);
      
      if (res.success) {
        toast.success(res.message || `"${title}" muvaffaqiyatli yuklandi!`);
        bulkModal.classList.remove('modal-overlay--active');
        loadOlympiads();
        
        // Reset form
        bulkOlymTitle.value = '';
        bulkOlymFile.value = '';
        bulkStatus.style.display = 'none';
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      showBulkStatus('Xatolik: ' + error.message, 'danger');
      toast.error('Yuklashda xatolik yuz berdi');
    } finally {
      startBulkUpload.disabled = false;
    }
  });

  function showBulkStatus(msg, type) {
    bulkStatus.textContent = msg;
    bulkStatus.style.display = 'block';
    bulkStatus.style.backgroundColor = type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
    bulkStatus.style.color = type === 'danger' ? 'var(--color-danger-600)' : 'var(--color-primary-600)';
    bulkStatus.style.border = `1px solid ${type === 'danger' ? 'var(--color-danger-500)' : 'var(--color-primary-500)'}`;
  }

  loadOlympiads();
});
