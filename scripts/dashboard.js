/**
 * ============================================
 * OlimpX - Dashboard Page Script
 * ============================================
 */

import { requireAuth, getCurrentUser, logout, syncProfile } from './modules/auth.js';
import { initTheme, toast, getTheme } from './modules/ui.js';
import { formatRelativeTime, formatDateTime, escapeHtml } from './modules/utils.js';

import { renderNavbar } from '../components/Navbar.js';
import { initPageTransitions, navigateTo } from '../components/PageTransition.js';
import { api } from './modules/api.js';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check authentication
    if (!requireAuth()) return;

    // Sync latest profile from server
    // We sync if it's the first visit of the session or after a test
    const hasJustFinishedTest = sessionStorage.getItem('last_quiz_result');
    const lastSync = localStorage.getItem('olimpx_last_sync');
    const now = Date.now();
    
    // Always sync if just finished a test OR first time in session OR 1 minute passed
    if (hasJustFinishedTest || !lastSync || (now - parseInt(lastSync)) > 60000) {
      await syncProfile();
      localStorage.setItem('olimpx_last_sync', now.toString());
      // Clear the flag so we don't sync on every dashboard visit
      if (hasJustFinishedTest) sessionStorage.removeItem('last_quiz_result');
    }

    // Initialize UI
    initTheme();
    initPageTransitions();
    renderNavbar('dashboard');

    // Get current user
    const user = getCurrentUser();
    if (!user) {
      logout();
      navigateTo('login.html');
      return;
    }

  // Cache DOM elements
  const userNameEl = document.getElementById('userName');
  const themeToggleBtn = document.getElementById('themeToggle');
  const logoutBtn = document.getElementById('logoutBtn');
  const startOlympiadBtn = document.getElementById('startOlympiadBtn');

  // Stats elements
  const totalOlympiadsEl = document.getElementById('totalOlympiads');
  const completedOlympiadsEl = document.getElementById('completedOlympiads');
  const totalScoreEl = document.getElementById('totalScore');
  const averageScoreEl = document.getElementById('averageScore');
  const activityListEl = document.getElementById('activityList');

  // ============================================
  // USER DATA DISPLAY
  // ============================================

  // Display user name
  userNameEl.textContent = user.fullName || 'Foydalanuvchi';

  // Load user stats
  const stats = user.stats || {
    totalOlympiads: 0,
    completedOlympiads: 0,
    totalScore: 0,
    averageScore: 0
  };

  totalOlympiadsEl.textContent = stats.totalOlympiads;
  completedOlympiadsEl.textContent = stats.completedOlympiads;
  totalScoreEl.textContent = stats.totalScore;
  averageScoreEl.textContent = stats.averageScore + '%';

  // ============================================
  // START OLYMPIAD WITH COUNTDOWN
  // ============================================

  const countdownModal = document.getElementById('countdownModal');
  const countdownNumber = document.getElementById('countdownNumber');
  const startButtons = document.querySelectorAll('.btn--start');

  startButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Reset and show modal
      let count = 5;
      const totalDuration = 5000; // 5 seconds
      let startTime = Date.now();
      
      countdownNumber.textContent = count;
      countdownModal.classList.add('modal-overlay--active');
      
      const circle = countdownModal.querySelector('circle');
      const circumference = 377; // 2 * PI * 60
      circle.style.strokeDashoffset = 0;

      // Update modal title for clarity
      const modalTitle = countdownModal.querySelector('.modal-title');
      if (modalTitle) modalTitle.textContent = 'Tayyorlaning!';

      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = totalDuration - elapsed;
        const currentCount = Math.ceil(remaining / 1000);
        
        if (remaining <= 0) {
          clearInterval(timer);
          circle.style.strokeDashoffset = circumference;
          countdownModal.classList.remove('modal-overlay--active');
          
          // Small delay to let modal close animation start
          setTimeout(async () => {
            try {
              // Fetch a real olympiad ID from the database
              const response = await api.olympiads.getAll('active');
              if (response.success && response.data.length > 0) {
                const firstOlympiadId = response.data[0].id;
                navigateTo(`quiz.html?id=${firstOlympiadId}`);
              } else {
                toast.error('Hozircha faol olimpiadalar yo\'q');
                navigateTo('olympiads.html');
              }
            } catch (error) {
              toast.error('Olimpiadani yuklashda xatolik yuz berdi');
            }
          }, 100);
          return;
        }

        // Update number if changed
        if (parseInt(countdownNumber.textContent) !== currentCount && currentCount > 0) {
          countdownNumber.textContent = currentCount;
          countdownNumber.classList.remove('animate-zoom');
          void countdownNumber.offsetWidth;
          countdownNumber.classList.add('animate-zoom');
        }

        // Update circle stroke-dashoffset for perfect sync
        const progress = Math.min(1, elapsed / totalDuration);
        circle.style.strokeDashoffset = circumference * progress;
      }, 16);
    });
  });

  // ============================================
  // ACTUAL ACTIVITIES
  // ============================================

  const history = user.results || [];
  
  if (history.length === 0) {
    activityListEl.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-tertiary);">
        <p>Hozircha faoliyat mavjud emas.</p>
        <a href="olympiads.html" class="btn btn--sm btn--primary mt-4">Testni boshlash</a>
      </div>
    `;
  } else {
    activityListEl.innerHTML = history.slice(0, 3).map(res => `
      <div class="activity-item animate-fadeIn" onclick="window.location.href='history.html'">
        <div class="activity-item__icon ${res.score >= 70 ? 'activity-item__icon--success' : 'activity-item__icon--warning'}">
          ${res.score >= 70 ? '🏆' : '📝'}
        </div>
        <div class="activity-item__content">
          <h4 class="activity-item__title">${escapeHtml(res.olympiad?.title) || 'Olimpiada natijasi'}</h4>
          <p class="activity-item__time">
            <span>📅 ${formatDateTime(res.createdAt)}</span>
            <span style="margin-left: 10px; opacity: 0.8;">⏱️ ${escapeHtml(res.timeTaken) || '10:00'}</span>
          </p>
        </div>
        <div class="activity-item__value">
          <span class="font-bold ${res.score >= 70 ? 'text-success-600' : 'text-primary-600'}">${res.score}%</span>
        </div>
      </div>
    `).join('');
  }

  // Simulate updating stats (for demo purposes)
  function animateNumber(element, target, suffix = '') {
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const current = Math.round(start + (target - start) * easeOut);

      element.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // Animate stats on load
  setTimeout(() => {
    animateNumber(totalOlympiadsEl, stats.totalOlympiads);
    animateNumber(completedOlympiadsEl, stats.completedOlympiads);
    animateNumber(totalScoreEl, stats.totalScore);
  }, 300);

  // Welcome toast on first visit
  const hasVisited = sessionStorage.getItem('olimpx_dashboard_visited');
  if (!hasVisited) {
    setTimeout(() => {
      toast.success(`Xush kelibsiz, ${user.fullName}!`, 'OlimpX');
      sessionStorage.setItem('olimpx_dashboard_visited', 'true');
    }, 1000);
  }

  // ============================================
  // PERFORMANCE CHART
  // ============================================

  function initPerformanceChart() {
    const canvas = document.getElementById('performanceChart');
    if (!canvas || typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded or canvas missing');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    const isDark = getTheme() === 'dark';
    
    // Real data from history
    const history = user.results || [];
    const chartData = history.slice(0, 7).reverse(); // Last 7 attempts, chronological order

    if (chartData.length === 0) {
      // Show empty state or some placeholder if needed
      ctx.font = '14px Inter';
      ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
      ctx.textAlign = 'center';
      ctx.fillText('Hozircha grafik uchun ma\'lumot yo\'q', canvas.width / 2, canvas.height / 2);
      return;
    }

    const labels = chartData.map(h => {
      const d = new Date(h.createdAt);
      const day = d.getDate();
      const uzMonths = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
      const month = uzMonths[d.getMonth()];
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day}-${month} ${hours}:${minutes}`;
    });
    const data = chartData.map(h => h.score);

    const chartConfig = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Natija (%)',
          data: data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#fff',
          pointHoverRadius: 6,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: isDark ? '#1f2937' : '#fff',
            titleColor: isDark ? '#f9fafb' : '#111827',
            bodyColor: isDark ? '#f9fafb' : '#111827',
            borderColor: isDark ? '#374151' : '#e5e7eb',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: function(context) {
                return `Natija: ${context.parsed.y}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              color: isDark ? '#9ca3af' : '#6b7280',
              callback: value => value + '%'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: isDark ? '#9ca3af' : '#6b7280'
            }
          }
        }
      }
    };

    const performanceChart = new Chart(ctx, chartConfig);

    // Re-render chart when theme changes
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const isDark = getTheme() === 'dark';
        performanceChart.options.plugins.tooltip.backgroundColor = isDark ? '#1f2937' : '#fff';
        performanceChart.options.plugins.tooltip.titleColor = isDark ? '#f9fafb' : '#111827';
        performanceChart.options.plugins.tooltip.bodyColor = isDark ? '#f9fafb' : '#111827';
        performanceChart.options.plugins.tooltip.borderColor = isDark ? '#374151' : '#e5e7eb';
        performanceChart.options.scales.y.grid.color = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        performanceChart.options.scales.y.ticks.color = isDark ? '#9ca3af' : '#6b7280';
        performanceChart.options.scales.x.ticks.color = isDark ? '#9ca3af' : '#6b7280';
        performanceChart.update();
      });
    }
  }

  // Wait a bit for the card animation before rendering chart
  setTimeout(initPerformanceChart, 500);

  } catch (error) {
    console.error('Dashboard Initialization Error:', error);
    // Attempt to reveal body if stuck
    document.body.classList.add('page-enter--active');
  }
});
