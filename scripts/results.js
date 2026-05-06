/**
 * ============================================
 * OlimpX - Results Page Script
 * ============================================
 */

import { requireAuth, getCurrentUser } from './modules/auth.js';
import { initTheme, toast, setButtonLoading } from './modules/ui.js';
import { getOlympiadById } from './modules/questions.js';
import { renderNavbar } from '../components/Navbar.js';
import { initPageTransitions, navigateTo } from '../components/PageTransition.js';
import { escapeHtml } from './modules/utils.js';
import { api } from './modules/api.js';


document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!requireAuth()) return;

    initTheme();
    initPageTransitions();
    renderNavbar('history');

    const user = getCurrentUser();
    
    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('id');
    
    let result = null;
    
    if (resultId) {
      try {
        const response = await api.results.getById(resultId);
        if (response.success) {
          result = response.data;
          // Sync with storage for consistency
          sessionStorage.setItem('last_quiz_result', JSON.stringify(result));
        }
      } catch (err) {
        console.error('Failed to fetch result by ID:', err);
      }
    }
    
    // Fallback to sessionStorage if no ID or fetch failed
    if (!result) {
      result = JSON.parse(sessionStorage.getItem('last_quiz_result'));
    }
    
    if (!result) {
      navigateTo('dashboard.html');
      return;
    }

    const olympiad = result.olympiad || { title: 'Olimpiada natijasi' };
    
    // UI Elements
    const finalScoreEl = document.getElementById('finalScore');
    const scoreCircle = document.getElementById('scoreCircle');
    const correctEl = document.getElementById('correctCount');
    const incorrectEl = document.getElementById('incorrectCount');
    const skippedEl = document.getElementById('skippedCount');
    const totalEl = document.getElementById('totalQuestions');
    const timeEl = document.getElementById('timeTaken');
    const avgTimeEl = document.getElementById('averageTime');
    const statusEl = document.getElementById('resultStatus');
    const olympiadTitleEl = document.getElementById('olympiadTitle');
    const reviewListEl = document.getElementById('reviewList');

    // Populate data
    if (correctEl) correctEl.textContent = result.correctCount || 0;
    if (incorrectEl) incorrectEl.textContent = result.incorrectCount || 0;
    if (skippedEl) skippedEl.textContent = result.skippedCount || 0;
    if (totalEl) totalEl.textContent = result.totalQuestions || 0;
    if (timeEl) timeEl.textContent = result.timeTaken || '00:00';
    if (avgTimeEl) avgTimeEl.textContent = (result.averageTime || 0) + 's';
    
    if (olympiadTitleEl) olympiadTitleEl.textContent = result.title || 'Olimpiada';

    // Animate score and circle
    if (finalScoreEl && scoreCircle) {
      const targetScore = result.score;
      let currentScore = 0;
      const duration = 1500;
      const startTime = performance.now();

      function animate(time) {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        currentScore = Math.round(targetScore * easedProgress);
        finalScoreEl.innerHTML = `${currentScore}<span>%</span>`;
        scoreCircle.style.setProperty('--score-deg', `${currentScore * 3.6}deg`);

        if (progress < 1) requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    }


    if (statusEl) {
      if (result.score >= 90) statusEl.textContent = 'Mukammal natija! 💎';
      else if (result.score >= 70) statusEl.textContent = 'Ajoyib natija! 🏆';
      else if (result.score >= 50) statusEl.textContent = 'Yaxshi urinish! 💪';
      else statusEl.textContent = 'Hali o\'sish kerak! 📚';
    }


    // Review List with Expandable Items
    if (reviewListEl && result.details) {
      reviewListEl.innerHTML = result.details.map((item, idx) => {
        let statusClass = item.isCorrect ? 'review-item--correct' : 'review-item--wrong';
        let statusColor = item.isCorrect ? '#059669' : '#b91c1c';
        
        if (item.userAnswerText === 'Belgilanmagan') {
          statusClass = 'review-item--skipped';
          statusColor = '#d97706'; // Amber/Yellow
        }

        return `
          <div class="review-item ${statusClass} animate-fadeIn" data-idx="${idx}">
            <div class="review-item__header">
              <div class="review-item__num">${idx + 1}</div>
              <p style="font-weight: 600; color: var(--text-primary); flex-grow: 1;">${escapeHtml(item.questionText)}</p>
              <span class="review-item__indicator">↓</span>
            </div>
            <div class="review-item__details">
              <div style="display: flex; flex-direction: column; gap: var(--space-2); font-size: 14px;">
                <p style="color: var(--text-secondary);">Sizning javobingiz: <span style="font-weight: 700; color: ${statusColor};">${escapeHtml(item.userAnswerText)}</span></p>
                ${!item.isCorrect ? `<p style="color: var(--text-secondary);">To'g'ri javob: <span style="font-weight: 700; color: #059669;">${escapeHtml(item.correctAnswerText)}</span></p>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');


      // Add click listeners for expansion
      const items = reviewListEl.querySelectorAll('.review-item');
      items.forEach(item => {
        item.addEventListener('click', () => {
          const isActive = item.classList.contains('is-active');
          
          // Close other items
          items.forEach(i => i.classList.remove('is-active'));
          
          // Toggle current item
          if (!isActive) {
            item.classList.add('is-active');
          }
        });
      });
    }

    // Download Certificate Logic
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        try {
          setButtonLoading(downloadBtn, true, 'Sertifikat yaratilmoqda...');
          
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
          });

          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();

          // 1. RICH BACKGROUND
          doc.setFillColor(15, 23, 42); 
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          
          // 2. DECORATIVE PATTERN
          doc.setFillColor(30, 41, 59);
          doc.triangle(0, 0, 100, 0, 0, 100, 'F');
          doc.triangle(pageWidth, pageHeight, pageWidth - 100, pageHeight, pageWidth, pageHeight - 100, 'F');

          // 3. GOLD BORDER
          doc.setDrawColor(212, 175, 55); 
          doc.setLineWidth(1.5);
          doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
          doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

          // 5. HEADER
          doc.setTextColor(212, 175, 55);
          doc.setFont('times', 'italic');
          doc.setFontSize(22);
          doc.text('OlimpX Ta\'lim Platformasi', pageWidth / 2, 35, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(54);
          doc.setTextColor(255, 255, 255);
          doc.text('SERTIFIKAT', pageWidth / 2, 60, { align: 'center', charSpace: 2 });

          // 6. BODY
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(18);
          doc.setTextColor(148, 163, 184);
          doc.text('Ushbu yutuq sertifikati munosib egaligini tasdiqlaydi:', pageWidth / 2, 85, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(38);
          doc.setTextColor(255, 255, 255);
          doc.text(user.fullName.toUpperCase(), pageWidth / 2, 110, { align: 'center' });

          doc.setFontSize(18);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(148, 163, 184);
          const certTitle = result.title || (olympiad ? olympiad.title : 'Olimpiada');
          doc.text(`"${certTitle}" olimpiadasidagi yuksak ishtiroki uchun.`, pageWidth / 2, 125, { align: 'center' });


          // 7. SCORE
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(pageWidth / 2 - 25, 135, 50, 22, 5, 5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(28);
          doc.setTextColor(255, 255, 255);
          doc.text(`${result.score}%`, pageWidth / 2, 151, { align: 'center' });

          // 8. SEAL
          doc.setDrawColor(212, 175, 55);
          doc.setLineWidth(1);
          doc.circle(pageWidth - 45, pageHeight - 50, 20, 'D');
          doc.setFontSize(8);
          doc.setTextColor(212, 175, 55);
          doc.text('APPROVED', pageWidth - 45, pageHeight - 48, { align: 'center' });

          // 9. FOOTER
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text(`ID: OX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 25, pageHeight - 20);
          const displayDate = result.createdAt ? new Date(result.createdAt).toLocaleDateString() : (result.date || new Date().toLocaleDateString());
          doc.text(`Sana: ${displayDate}`, pageWidth - 25, pageHeight - 20, { align: 'right' });

          doc.save(`OlimpX_Sertifikat_${user.fullName.replace(/\s+/g, '_')}.pdf`);
          
          setButtonLoading(downloadBtn, false);
          toast.success('Sertifikat muvaffaqiyatli yuklandi!');

        } catch (error) {
          console.error('Download Error:', error);
          setButtonLoading(downloadBtn, false);
          toast.error('Sertifikatni yaratishda xatolik yuz berdi');
        }
      });
    }

  } catch (error) {
    console.error('Results Script Error:', error);
  }
});
