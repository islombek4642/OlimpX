/**
 * ============================================
 * OlimpX - History Script
 * Now fetching quiz results from the Backend API
 * ============================================
 */

import { requireAuth } from './modules/auth.js';
import { initTheme, toast } from './modules/ui.js';
import { formatDateTime } from './modules/utils.js';
import { renderNavbar } from '../components/Navbar.js';
import { initPageTransitions } from '../components/PageTransition.js';
import { api } from './modules/api.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!requireAuth()) return;

    initTheme();
    initPageTransitions();
    renderNavbar('history');

    const historyList = document.getElementById('historyList');
    
    // Fetch real results from API
    let results = [];
    try {
      const response = await api.results.getMyResults();
      results = response.success ? response.data : [];
    } catch (error) {
      console.error('Failed to fetch results:', error);
      toast.error('Natijalarni yuklashda xatolik yuz berdi');
    }

    if (results.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 100px; background: var(--bg-secondary); border-radius: 30px; border: 2px dashed var(--border-medium);">
          <div style="font-size: 64px; margin-bottom: 20px;">📊</div>
          <h4 style="font-size: 20px; font-weight: 600;">Natijalar hali yo'q</h4>
          <p style="color: var(--text-secondary); margin-bottom: 30px;">Siz hali birorta ham olimpiadada qatnashmadingiz.</p>
          <a href="dashboard.html" class="btn btn--primary" style="padding: 12px 30px; border-radius: 100px;">Olimpiadani boshlash</a>
        </div>
      `;
      return;
    }

    historyList.innerHTML = results.map((res, idx) => `
      <div class="history-card animate-fadeIn" data-idx="${idx}">
        <div class="history-card__header">
          <div class="history-card__icon ${res.score >= 70 ? 'history-card__icon--success' : 'history-card__icon--warning'}">
            ${res.score >= 70 ? '🏆' : '📝'}
          </div>
          <div class="history-card__info">
            <h4 class="history-card__title">${res.olympiad?.title || 'Olimpiada natijasi'}</h4>
            <div class="history-card__meta">
              <span>📅 ${formatDateTime(res.createdAt)}</span>
              <span style="color: #059669;">✅ ${res.correctCount}</span>
              <span style="color: #dc2626;">❌ ${res.incorrectCount || 0}</span>
              <span style="color: #d97706;">⏭️ ${res.skippedCount || 0}</span>
              <span>⏱️ ${res.timeTaken} (Avg: ${res.averageTime || 0}s)</span>
            </div>
          </div>
          <div class="history-card__score">
            <span class="score-value ${res.score >= 70 ? 'score-value--success' : (res.score >= 40 ? 'score-value--warning' : 'score-value--danger')}">${res.score}%</span>
          </div>
          <span class="history-card__indicator">↓</span>
        </div>
        
        <div class="history-card__details">
          <h5 style="font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">Savollar tahlili:</h5>
          ${res.details ? res.details.map((d, dIdx) => {
            let statusText = d.isCorrect ? '✅ To\'g\'ri' : '❌ Noto\'g\'ri';
            let statusColor = d.isCorrect ? '#059669' : '#b91c1c';
            
            if (d.userAnswerText === 'Belgilanmagan') {
              statusText = '⏭️ O\'tkazildi';
              statusColor = '#d97706';
            }

            return `
              <div class="history-detail-item" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 15px;">
                <span style="max-width: 80%; color: var(--text-secondary);">
                  <strong style="color: var(--text-primary); margin-right: 8px;">${dIdx + 1}.</strong> ${d.questionText}
                </span>
                <span style="font-weight: 600; white-space: nowrap; font-size: 13px; color: ${statusColor};">
                  ${statusText}
                </span>
              </div>
            `;
          }).join('') : '<p style="font-style: italic; color: var(--text-tertiary);">Batafsil ma\'lumot mavjud emas.</p>'}

          
          <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
             ${res.score >= 70 ? `<button class="btn btn--cert" style="border-radius: 100px; padding: 8px 20px;">Sertifikatni yuklash</button>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    // Add interactivity
    const cards = document.querySelectorAll('.history-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn--cert')) {
          toast.info('Sertifikat yuklanmoqda...');
          return;
        }

        const isActive = card.classList.contains('is-active');
        cards.forEach(c => c.classList.remove('is-active'));
        if (!isActive) card.classList.add('is-active');
      });
    });

  } catch (error) {
    console.error('History Initialization Error:', error);
  }
});
