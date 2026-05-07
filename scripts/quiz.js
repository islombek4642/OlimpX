/**
 * ============================================
 * OlimpX - Quiz Page Script
 * ============================================
 */

import { requireAuth, getCurrentUser } from './modules/auth.js';
import { initTheme, toast, showConfirmModal } from './modules/ui.js';
import { getOlympiadById, getQuestionsByOlympiadId } from './modules/questions.js';
import { escapeHtml } from './modules/utils.js';

import { initPageTransitions, navigateTo } from '../components/PageTransition.js';
import { api } from './modules/api.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!requireAuth()) return;

    initTheme();
    initPageTransitions();

    const user = getCurrentUser();
    
    // For demo/simplicity, we'll use a fixed olympiad or get from URL
    const urlParams = new URLSearchParams(window.location.search);
    const olympiadId = urlParams.get('id');
    
    if (!olympiadId) {
      toast.error('Olimpiada ID ko\'rsatilmadi');
      navigateTo('dashboard.html');
      return;
    }

    const olympiad = await getOlympiadById(olympiadId);
    const originalQuestions = await getQuestionsByOlympiadId(olympiadId);
    
    if (!olympiad || !originalQuestions.length) {
      toast.error('Olimpiada ma\'lumotlari topilmadi');
      navigateTo('dashboard.html');
      return;
    }

    // Prepare questions with shuffled options
    const questions = originalQuestions.map(q => {
      // Create objects with original index
      const optionsWithIdx = q.options.map((text, idx) => ({ text, idx }));
      
      // Shuffle options
      for (let i = optionsWithIdx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithIdx[i], optionsWithIdx[j]] = [optionsWithIdx[j], optionsWithIdx[i]];
      }

      return {
        ...q,
        shuffledOptions: optionsWithIdx
      };
    });


    // State
    let currentIdx = 0;
    let questionsPool = [...questions];
    let answers = new Array(originalQuestions.length).fill(null);
    let skippedIdxs = [];
    let timeLeft = questionsPool[0].duration || 30;
    let totalTimeSpentSecs = 0;
    let timerInterval = null;
    let isWaitingForNext = false;

    // Check for active attempt
    try {
      const attemptRes = await api.attempts.get(olympiadId);
      if (attemptRes.success && attemptRes.data) {
        const attempt = attemptRes.data;
        const resume = await showConfirmModal({
          title: 'Davom ettirish?',
          message: `Sizda tugallanmagan urinish bor (${attempt.currentIdx + 1}-savolda). Uni davom ettirmoqchimisiz?`,
          confirmText: 'Ha, davom ettirish',
          cancelText: 'Yo\'q, boshidan boshlash',
          type: 'info'
        });

        if (resume) {
          currentIdx = attempt.currentIdx;
          answers = attempt.answers;
          timeLeft = attempt.timeLeft;
          totalTimeSpentSecs = attempt.totalTimeSpent;
          
          // Restore skipped questions pool if any
          const savedSkippedIds = attempt.skippedIdxs || [];
          savedSkippedIds.forEach(id => {
            if (!skippedIdxs.includes(id)) {
              const q = questions.find(item => item.id === id);
              if (q) {
                skippedIdxs.push(id);
                questionsPool.push(q);
              }
            }
          });
          
          toast.success('Test tiklandi');
        } else {
          // Clear the old attempt if user chooses to start fresh
          await api.attempts.clear(olympiadId);
        }
      }
    } catch (err) {
      console.warn('Attempt check failed:', err);
    }

    async function saveProgress() {
      try {
        await api.attempts.save({
          olympiadId,
          currentIdx,
          answers,
          timeLeft,
          totalTimeSpent: totalTimeSpentSecs,
          skippedIdxs
        });
      } catch (err) {
        console.warn('Progress save failed:', err);
      }
    }

    // Elements
    const olympiadTitleEl = document.getElementById('olympiadTitle');
    const counterEl = document.getElementById('questionCounter');
    const timerEl = document.getElementById('timer');
    const progressBar = document.getElementById('progressBar');
    const quizContainer = document.getElementById('quizContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const exitBtn = document.getElementById('exitBtn');
    const stopBtn = document.getElementById('stopQuizBtn');

    // Hide old navigation
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';

    olympiadTitleEl.textContent = olympiad.title;

    function startTimer() {
      if (timerInterval) clearInterval(timerInterval);
      
      timerInterval = setInterval(() => {
        totalTimeSpentSecs++;
        if (isWaitingForNext) return;

        timeLeft--;
        
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 5) {
          timerEl.style.animation = 'pulse 0.5s infinite';
          timerEl.classList.add('timer-warning');
        } else {
          timerEl.style.animation = 'none';
          timerEl.classList.remove('timer-warning');
        }

        if (timeLeft <= 0) {
          handleTimeout();
        }

        // Auto-save every 10 seconds
        if (totalTimeSpentSecs % 10 === 0) {
          saveProgress();
        }
      }, 1000);
    }

    function handleTimeout() {
      toast.warning('Vaqt tugadi!');
      moveToNext();
    }

    function updateUI() {
      isWaitingForNext = false;
      const q = questionsPool[currentIdx];
      const progress = ((currentIdx + 1) / questionsPool.length) * 100;
      
      // Reset individual timer
      timeLeft = q.duration || 30;
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      counterEl.textContent = `Savol ${currentIdx + 1}/${questionsPool.length}`;
      progressBar.style.width = `${progress}%`;
      
      quizContainer.innerHTML = `
        <div class="question-card">
          <div class="mb-4" style="display: flex; justify-content: space-between; align-items: center;">
             <span class="status-badge" style="background: var(--color-primary-50); color: var(--color-primary-600);">
               Soniya: ${q.duration || 30}s
             </span>
          </div>
          <h3 style="font-size: 20px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-8); line-height: 1.5;">${escapeHtml(q.text)}</h3>
          <div class="options-list" id="optionsList">
            ${q.shuffledOptions.map((opt, i) => `
              <button class="option-btn" data-idx="${i}">
                <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                <span class="option-text">${escapeHtml(opt.text)}</span>
              </button>
            `).join('')}
          </div>
          
          <div class="mt-8" style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <button class="btn btn--secondary" id="skipQuestionBtn" style="background: #facc15; color: #854d0e; border: none; font-weight: 600; width: 220px;">
               ⏭️ O'tkazib yuborish
            </button>
            <button class="btn btn--outline" id="stopQuizBtnDynamic" style="border-color: rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 14px; width: 220px; border-radius: 12px;">
               🛑 Testni yakunlash
            </button>
          </div>
        </div>
      `;

      // Event listeners for options
      quizContainer.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => handleOptionClick(parseInt(btn.dataset.idx), btn));
      });

      // Skip button
      document.getElementById('skipQuestionBtn').addEventListener('click', () => {
        handleSkip();
      });

      // Dynamic stop button
      const dynamicStopBtn = document.getElementById('stopQuizBtnDynamic');
      if (dynamicStopBtn) {
        dynamicStopBtn.addEventListener('click', async () => {
          const confirmed = await showConfirmModal({
            title: 'Testni to\'xtatish',
            message: 'Testni hozir tugatib, natijalarni ko\'rmoqchimisiz?',
            confirmText: 'Tugatish',
            cancelText: 'Davom ettirish',
            type: 'info'
          });

          if (confirmed) {
            finishQuiz();
          }
        });
      }
    }

    async function handleOptionClick(selectedShuffledIdx, btn) {
      if (isWaitingForNext) return;
      isWaitingForNext = true;

      const q = questionsPool[currentIdx];
      
      // Get the original option index (before shuffle)
      const originalOptionIdx = q.shuffledOptions[selectedShuffledIdx].idx;

      // Call API to verify (SECURE)
      let isCorrect = false;
      let realCorrectIdx = -1;

      try {
        const response = await api.questions.verify({
          questionId: q.id,
          selectedOption: originalOptionIdx
        });

        if (response.success) {
          isCorrect = response.isCorrect;
          // Find which shuffled index corresponds to the real correct answer
          realCorrectIdx = q.shuffledOptions.findIndex(opt => opt.idx === response.correctAnswer);
        }
      } catch (error) {
        console.error('Verification error:', error);
        // Fallback or handle error
      }

      // Store original answer index for final submission
      const originalQIdx = originalQuestions.findIndex(orig => orig.id === q.id);
      answers[originalQIdx] = originalOptionIdx;

      // Show feedback
      const allBtns = document.querySelectorAll('.option-btn');
      allBtns.forEach((b, i) => {
        b.style.pointerEvents = 'none';
        if (i === realCorrectIdx) {
          b.classList.add('option-btn--correct');
        } else if (i === selectedShuffledIdx && !isCorrect) {
          b.classList.add('option-btn--wrong');
        }
      });

      if (isCorrect) {
        toast.success('To\'g\'ri!');
      } else {
        toast.error('Xato!');
      }

      // Auto-advance after delay
      setTimeout(() => {
        saveProgress(); // Save before moving
        moveToNext();
      }, 1500);
    }

    function handleSkip() {
      if (isWaitingForNext) return;
      const q = questionsPool[currentIdx];
      
      // Only queue for later if it's the first time skipping
      if (!skippedIdxs.includes(q.id)) {
        skippedIdxs.push(q.id);
        questionsPool.push(q); // Add to end of pool
        toast.info('Savol oxiriga olib qo\'yildi');
      }
      
      saveProgress();
      moveToNext();
    }

    function moveToNext() {
      if (currentIdx < questionsPool.length - 1) {
        currentIdx++;
        updateUI();
      } else {
        finishQuiz();
      }
    }

    async function finishQuiz() {
      if (timerInterval) clearInterval(timerInterval);
      
      const timeTakenMins = Math.floor(totalTimeSpentSecs / 60);
      const timeTakenSecs = totalTimeSpentSecs % 60;
      const timeTakenStr = `${timeTakenMins.toString().padStart(2, '0')}:${timeTakenSecs.toString().padStart(2, '0')}`;

      const submissionData = {
        olympiadId: olympiad.id,
        answers: answers.slice(0, questions.length), // Send original order
        timeTaken: timeTakenStr
      };

      try {
        const response = await api.results.submit(submissionData);
        
        if (response.success) {
          const result = response.data;
          sessionStorage.setItem('last_quiz_result', JSON.stringify({
            ...result,
            title: olympiad.title,
            date: new Date().toISOString()
          }));
          // Clear active attempt on success
          await api.attempts.clear(olympiadId);
          navigateTo('results.html?id=' + result.id);
        }
      } catch (error) {
        console.error('Quiz Submission Error:', error);
        toast.error('Natijani saqlashda xatolik yuz berdi');
        navigateTo('dashboard.html');
      }
    }

    if (exitBtn) {
      exitBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmModal({
          title: 'Testdan chiqish',
          message: 'Haqiqatan ham testdan chiqmoqchimisiz? Bajarilmagan savollar saqlanmaydi.',
          confirmText: 'Ha, chiqish',
          cancelText: 'Davom ettirish'
        });
        
        if (confirmed) {
          navigateTo('dashboard.html');
        }
      });
    }

    // Old stopBtn removed from header

    startTimer();
    updateUI();

  } catch (error) {
    console.error('Quiz Script Error:', error);
  }
});
