/**
 * ============================================
 * OlimpX - Olympiads List Script
 * Now connected to the real Backend API
 * ============================================
 */

import { requireAuth } from './modules/auth.js';
import { initTheme, toast } from './modules/ui.js';
import { getOlympiads } from './modules/questions.js';
import { renderNavbar } from '../components/Navbar.js';
import { initPageTransitions, navigateTo } from '../components/PageTransition.js';
import { escapeHtml } from './modules/utils.js';


document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!requireAuth()) return;

    initTheme();
    initPageTransitions();
    renderNavbar('olympiads');

    const grid = document.getElementById('olympiadsGrid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    if (!grid) return;

    // Show loading skeleton
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px;">Yuklanmoqda...</div>';

    let allOlympiads = [];

    async function loadOlympiads(category = 'all') {
      try {
        console.log('Loading olympiads...');
        allOlympiads = await getOlympiads();
        console.log('Received olympiads:', allOlympiads);
        renderOlympiads(category);
      } catch (error) {
        console.error('Load olympiads error:', error);
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-error);">Ma\'lumotlarni yuklashda xatolik yuz berdi.</div>';
      }
    }

    function renderOlympiads(category = 'all') {
      const filtered = category === 'all' 
        ? allOlympiads 
        : allOlympiads.filter(ol => ol.category === category);

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-tertiary);">
            <p style="font-size: 18px;">Ushbu turkumda olimpiadalar topilmadi.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(ol => `
        <div class="olympiad-card animate-fadeIn">
          <div class="olympiad-card__badge">${escapeHtml(ol.category) || 'Olimpiada'}</div>
          <div class="olympiad-card__icon">
            ${escapeHtml(ol.icon) || '📚'}
          </div>
          <h3 class="olympiad-card__title">${escapeHtml(ol.title)}</h3>
          <p class="olympiad-card__desc">${escapeHtml(ol.description || 'Bu olimpiada haqida qo\'shimcha ma\'lumot yo\'q')}</p>
          
          <div style="margin-top: auto; padding-top: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6);">
              <div style="font-size: 13px; color: var(--text-tertiary);">
                <span style="display: block; font-weight: 600; color: var(--text-secondary);">${ol.totalDuration ? ol.totalDuration + ' daqiqa' : 'Individual vaqt'}</span>
                <span>${ol._count?.questions || 0} ta savol</span>
              </div>
              <div style="font-size: 13px; text-align: right; color: var(--text-tertiary);">
                <span style="display: block; font-weight: 600; color: var(--color-primary-600);">Bepul</span>
                <span>Online</span>
              </div>
            </div>
            
            <button class="btn btn--primary btn--full btn-start-olympiad" 
                    data-id="${ol.id}" 
                    style="padding: 12px; border-radius: 12px; font-weight: 600; box-shadow: var(--shadow-brand);">
              Olimpiadani boshlash
            </button>
          </div>
        </div>
      `).join('');

      // Re-attach event listeners
      attachStartListeners();
    }

    function attachStartListeners() {
      const countdownModal = document.getElementById('countdownModal');
      const countdownNumber = document.getElementById('countdownNumber');

      grid.querySelectorAll('.btn-start-olympiad').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          
          countdownModal.classList.add('modal-overlay--active');
          
          let count = 5;
          const totalDuration = 5000;
          const startTime = Date.now();
          
          countdownNumber.textContent = count;
          const circle = countdownModal.querySelector('circle');
          const circumference = 377;
          circle.style.strokeDashoffset = 0;

          const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = totalDuration - elapsed;
            const currentCount = Math.ceil(remaining / 1000);

            if (remaining <= 0) {
              clearInterval(timer);
              circle.style.strokeDashoffset = circumference;
              countdownModal.classList.remove('modal-overlay--active');
              
              setTimeout(() => {
                navigateTo(`quiz.html?id=${id}`);
              }, 100);
              return;
            }

            if (parseInt(countdownNumber.textContent) !== currentCount && currentCount > 0) {
              countdownNumber.textContent = currentCount;
              countdownNumber.classList.remove('animate-zoom');
              void countdownNumber.offsetWidth;
              countdownNumber.classList.add('animate-zoom');
            }

            const progress = Math.min(1, elapsed / totalDuration);
            circle.style.strokeDashoffset = circumference * progress;
          }, 16);
        });
      });
    }

    // Filter logic
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('filter-btn--active'));
        btn.classList.add('filter-btn--active');
        renderOlympiads(btn.dataset.category);
      });
    });

    // Initial load
    await loadOlympiads();

  } catch (error) {
    console.error('Olympiads List Error:', error);
  }
});
