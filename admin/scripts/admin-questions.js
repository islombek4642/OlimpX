/**
 * Admin Questions Management Script
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
  renderAdminSidebar('questions', true);
  renderAdminHeader();

  const tableBody = document.getElementById('questionsTableBody');
  const olympiadFilter = document.getElementById('olympiadFilter');
  const qOlympiadSelect = document.getElementById('qOlympiad');
  const searchInput = document.getElementById('questionSearch');
  const modal = document.getElementById('questionModal');
  const addBtn = document.getElementById('addQuestionBtn');
  const closeModal = document.getElementById('closeModal');
  const form = document.getElementById('questionForm');

  let allQuestions = [];
  let allOlympiads = [];
  let editingId = null;

  async function loadData() {
    try {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;"><div class="spinner"></div></td></tr>';

      const [olympiadsRes, questionsRes] = await Promise.all([
        api.olympiads.getAll(),
        api.questions.getAll()
      ]);

      allOlympiads = olympiadsRes.success ? olympiadsRes.data : [];
      allQuestions = questionsRes.success ? questionsRes.data : [];

      // Populate Filters & Selects
      const olympiadOptions = allOlympiads.map(ol => `<option value="${ol.id}">${ol.title}</option>`).join('');
      olympiadFilter.innerHTML = '<option value="all">Barcha olimpiadalar</option>' + olympiadOptions;
      qOlympiadSelect.innerHTML = olympiadOptions;

      renderTable(allQuestions);
    } catch (error) {
      console.error('Failed to load questions/olympiads:', error);
      toast.error('Ma\'lumotlarni yuklashda xatolik');
    }
  }

  function renderTable(dataToRender) {
    if (dataToRender.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-tertiary);">Savollar topilmadi.</td></tr>';
      return;
    }

    tableBody.innerHTML = dataToRender.map((q, idx) => `
      <tr>
        <td><code>#${idx + 1}</code></td>
        <td style="max-width: 400px; line-height: 1.4;">
          <div style="font-weight: 600;">${q.text}</div>
          <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">Vaqt: ${q.duration || 30} soniya</div>
        </td>
        <td><span class="status-badge status-badge--inactive">${q.olympiad?.title || 'Noma\'lum'}</span></td>
        <td><span class="status-badge status-badge--success">${String.fromCharCode(65 + q.correctAnswer)}</span></td>
        <td>
          <div class="table-action-btns">
            <button class="btn btn--icon edit-btn" data-id="${q.id}" title="Tahrirlash">✏️</button>
            <button class="btn btn--icon delete-btn" data-id="${q.id}" title="O'chirish">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Attach listeners
    tableBody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    tableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteQuestion(btn.dataset.id));
    });
  }

  function openEditModal(id) {
    const q = allQuestions.find(item => item.id === id);
    if (!q) return;

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Savolni tahrirlash';
    document.getElementById('qText').value = q.text;
    document.getElementById('qOlympiad').value = q.olympiadId;
    document.getElementById('opt0').value = q.options[0];
    document.getElementById('opt1').value = q.options[1];
    document.getElementById('opt2').value = q.options[2];
    document.getElementById('opt3').value = q.options[3];
    document.getElementById('qCorrect').value = q.correctAnswer;
    document.getElementById('qDuration').value = q.duration || 30;

    modal.classList.add('modal-overlay--active');
  }

  async function deleteQuestion(id) {
    const confirmed = await showConfirmModal({
      title: 'Savolni o\'chirish',
      message: 'Ushbu savolni butunlay o\'chirmoqchimisiz?',
      confirmText: 'O\'chirish',
      type: 'danger'
    });

    if (confirmed) {
      try {
        const res = await api.questions.delete(id);
        if (res.success) {
          toast.success('Savol o\'chirildi');
          loadData();
        }
      } catch (error) {
        toast.error(error.message);
      }
    }
  }

  function filterAndRender() {
    const filterVal = olympiadFilter.value;
    const searchVal = searchInput.value.toLowerCase();

    let filtered = allQuestions;

    if (filterVal !== 'all') {
      filtered = filtered.filter(q => q.olympiadId === filterVal);
    }

    if (searchVal) {
      filtered = filtered.filter(q => q.text.toLowerCase().includes(searchVal));
    }

    renderTable(filtered);
  }

  // Event Listeners
  olympiadFilter.addEventListener('change', filterAndRender);
  searchInput.addEventListener('input', filterAndRender);

  addBtn.addEventListener('click', () => {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Yangi savol qo\'shish';
    form.reset();
    modal.classList.add('modal-overlay--active');
  });

  closeModal.addEventListener('click', () => {
    modal.classList.remove('modal-overlay--active');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const qText = document.getElementById('qText').value.trim();
    const options = [
      document.getElementById('opt0').value.trim(),
      document.getElementById('opt1').value.trim(),
      document.getElementById('opt2').value.trim(),
      document.getElementById('opt3').value.trim()
    ];

    // Validatsiya
    if (qText.length < 5) {
      return toast.error('Savol matni kamida 5 ta belgidan iborat bo\'lishi kerak', 'Xatolik');
    }

    for (let i = 0; i < options.length; i++) {
      if (options[i].length < 1) {
        return toast.error(`Variant ${String.fromCharCode(65 + i)} bo'sh bo'lmasligi kerak`, 'Xatolik');
      }
    }

    const data = {
      olympiadId: qOlympiadSelect.value,
      text: qText,
      options: options,
      correctAnswer: parseInt(document.getElementById('qCorrect').value),
      duration: parseInt(document.getElementById('qDuration').value)
    };


    try {
      let res;
      if (editingId) {
        res = await api.questions.update(editingId, data);
      } else {
        res = await api.questions.create(data);
      }

      if (res.success) {
        toast.success(editingId ? 'Savol yangilandi' : 'Yangi savol qo\'shildi');
        modal.classList.remove('modal-overlay--active');
        form.reset();
        loadData();
      }
    } catch (error) {
      toast.error(error.message);
    }
  });


  loadData();
});
