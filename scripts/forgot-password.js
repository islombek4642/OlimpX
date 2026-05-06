/**
 * ============================================
 * OlimpX - Forgot Password Page Script
 * ============================================
 */

import { redirectIfAuthenticated, requestPasswordReset } from './modules/auth.js';
import { validateField, authSchemas } from './modules/validation.js';
import {
  setButtonLoading,
  setFieldError,
  toast,
  initTheme
} from './modules/ui.js';
import { initPageTransitions } from '../components/PageTransition.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    if (redirectIfAuthenticated()) return;

    initTheme();
    initPageTransitions();

    const form = document.getElementById('forgotForm');
    const emailInput = document.getElementById('email');
    const submitBtn = document.getElementById('submitBtn');
    const requestStep = document.getElementById('requestStep');
    const successStep = document.getElementById('successStep');

    if (!form || !emailInput || !submitBtn) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const validation = validateField(emailInput.value, authSchemas.forgotPassword.email);
      setFieldError(emailInput.closest('.form-group'), validation.error);

      if (!validation.valid) return;

      setButtonLoading(submitBtn, true, 'Yuborilmoqda...');
      await new Promise(r => setTimeout(r, 1000));

      const result = requestPasswordReset(emailInput.value);

      if (result.success) {
        if (requestStep) requestStep.style.display = 'none';
        if (successStep) successStep.style.display = 'block';
        toast.success('Yo\'riqnoma yuborildi');
      } else {
        setButtonLoading(submitBtn, false);
        toast.error(result.error);
      }
    });

  } catch (err) {
    console.error('Forgot Password Error:', err);
  }
});
