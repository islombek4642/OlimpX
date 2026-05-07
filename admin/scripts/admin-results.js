/**
 * Admin Results Analysis Script
 */
import { storageGet, formatDateTime } from '../../scripts/modules/utils.js';
import { initTheme, toast, showConfirmModal } from '../../scripts/modules/ui.js';
import { renderAdminSidebar } from '../components/AdminSidebar.js';
import { renderAdminHeader } from '../components/AdminHeader.js';
import { requireAdmin } from '../../scripts/modules/auth.js';
import { api } from '../../scripts/modules/api.js';


document.addEventListener('DOMContentLoaded', () => {
  if (!requireAdmin()) return;
  initTheme();
  renderAdminSidebar('results');
  renderAdminHeader();

  const tableBody = document.getElementById('resultsTableBody');
  const olympiadFilter = document.getElementById('resOlympiadFilter');
  const scoreFilter = document.getElementById('resScoreFilter');
  const searchInput = document.getElementById('resUserSearch');

  let allResults = [];

  let allOlympiads = [];

  async function loadData() {
    try {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;"><div class="spinner"></div></td></tr>';
      
      const [olympiadsRes, resultsRes] = await Promise.all([
        api.olympiads.getAll(),
        api.results.getAllResults()
      ]);

      allOlympiads = olympiadsRes.success ? olympiadsRes.data : [];
      allResults = resultsRes.success ? resultsRes.data : [];

      // Populate Olympiad Filter
      const olympiadOptions = allOlympiads.map(ol => `<option value="${ol.id}">${ol.title}</option>`).join('');
      olympiadFilter.innerHTML = '<option value="all">Barcha olimpiadalar</option>' + olympiadOptions;

      renderTable(allResults);
    } catch (error) {
      console.error('Failed to load results:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    }
  }

  function renderTable(dataToRender) {
    if (dataToRender.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-tertiary);">Natijalar topilmadi.</td></tr>';
      return;
    }

    tableBody.innerHTML = dataToRender.map(res => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; color: var(--text-primary);">
              ${res.user?.fullName?.[0] || '?'}
            </div>
            <div>
              <div style="font-weight: 600;">${res.user?.fullName || 'Noma\'lum'}</div>
              <div style="font-size: 11px; color: var(--text-tertiary);">${res.user?.email || ''}</div>
            </div>
          </div>
        </td>
        <td><span style="font-weight: 500;">${res.olympiad?.title || 'Olimpiada'}</span></td>
        <td>
          <div style="font-weight: 800; font-size: 16px; color: ${res.score >= 70 ? 'var(--color-success-600)' : 'var(--color-primary-600)'};">
            ${res.score}%
          </div>
        </td>
        <td><span style="font-family: monospace; font-weight: 600;">${res.timeTaken || '00:00'}</span></td>
        <td style="font-size: 13px; color: var(--text-secondary);">${formatDateTime(res.createdAt)}</td>
        <td>
          <span class="status-badge ${res.score >= 70 ? 'status-badge--success' : 'status-badge--warning'}">
            ${res.score >= 70 ? 'O\'tdi' : 'Yiqildi'}
          </span>
        </td>
        <td>
          <div class="table-action-btns">
            <button class="btn btn--icon delete-btn" data-id="${res.id}" title="O'chirish">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach Delete Listeners
    tableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteResult(btn.dataset.id));
    });
  }

  async function deleteResult(id) {
    const confirmed = await showConfirmModal({
      title: 'Natijani o\'chirish',
      message: 'Ushbu natijani butunlay o\'chirmoqchimisiz?',
      confirmText: 'O\'chirish',
      type: 'danger'
    });

    if (confirmed) {
      try {
        const res = await api.results.delete(id);
        if (res.success) {
          toast.success('Natija o\'chirildi');
          loadData();
        }
      } catch (error) {
        toast.error(error.message);
      }
    }
  }


  function filterResults() {
    const olVal = olympiadFilter.value;
    const scoreVal = scoreFilter.value;
    const searchVal = searchInput.value.toLowerCase();

    let filtered = allResults;

    if (olVal !== 'all') {
      filtered = filtered.filter(r => r.olympiadId === olVal);
    }

    if (scoreVal === 'high') {
      filtered = filtered.filter(r => r.score >= 70);
    } else if (scoreVal === 'low') {
      filtered = filtered.filter(r => r.score < 70);
    }

    if (searchVal) {
      filtered = filtered.filter(r => 
        r.user?.fullName.toLowerCase().includes(searchVal) || 
        r.user?.email.toLowerCase().includes(searchVal)
      );
    }

    renderTable(filtered);
  }

  // Event Listeners
  olympiadFilter.addEventListener('change', filterResults);
  scoreFilter.addEventListener('change', filterResults);
  searchInput.addEventListener('input', filterResults);
  

  document.getElementById('exportResultsBtn').addEventListener('click', () => {
    exportToExcel();
  });

  function exportToExcel() {
    if (allResults.length === 0) {
      toast.error('Eksport qilish uchun ma\'lumotlar mavjud emas');
      return;
    }

    try {
      // 1. Ma'lumotlarni Excel formatiga tayyorlash
      const excelData = allResults.map((res, index) => ({
        '#': index + 1,
        'Foydalanuvchi': res.user?.fullName || 'Noma\'lum',
        'Email': res.user?.email || '',
        'Olimpiada': res.olympiad?.title || 'Olimpiada',
        'Ball (%)': res.score,
        'To\'g\'ri javoblar': res.correctCount,
        'Umumiy savollar': res.totalQuestions,
        'Sarflangan vaqt': res.timeTaken || '00:00',
        'Sana': formatDateTime(res.createdAt),
        'Holat': res.score >= 70 ? 'O\'tdi' : 'Yiqildi'
      }));

      // 2. Workbook va Worksheet yaratish
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Natijalar");

      // 3. Faylni yuklab olish
      const fileName = `OlimpX_Natijalar_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Excel fayli muvaffaqiyatli yuklandi');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Excelga eksport qilishda xatolik yuz berdi');
    }
  }

  loadData();
});


