/**
 * ============================================
 * OlimpX - Login Page Script
 * ============================================
 */

import { redirectIfAuthenticated, login } from './modules/auth.js';
import { validateField, attachRealTimeValidation, authSchemas } from './modules/validation.js';
import {
  setButtonLoading,
  setFieldError,
  togglePasswordVisibility,
  toast,
  initTheme,
  createThemeToggle
} from './modules/ui.js';
import { initPageTransitions, navigateTo } from '../components/PageTransition.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if already logged in
    if (redirectIfAuthenticated()) return;

    // Initialize UI
    initTheme();
    const actionsContainer = document.querySelector('.auth-header-actions');
    if (actionsContainer) createThemeToggle(actionsContainer);
    
    initPageTransitions();

    // Cache elements
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const submitBtn = document.getElementById('submitBtn');

    // Load saved email
    const savedEmail = localStorage.getItem('olimpx_remembered_email');
    if (savedEmail && emailInput) {
      emailInput.value = savedEmail;
      if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const emailValidation = validateField(emailInput.value, authSchemas.login.email);
        const passwordValidation = validateField(passwordInput.value, authSchemas.login.password);

        setFieldError(emailInput.closest('.form-group'), emailValidation.error);
        setFieldError(passwordInput.closest('.form-group'), passwordValidation.error);

        if (!emailValidation.valid || !passwordValidation.valid) return;

        // Handle Remember Me
        if (rememberMeCheckbox && rememberMeCheckbox.checked) {
          localStorage.setItem('olimpx_remembered_email', emailInput.value);
        } else {
          localStorage.removeItem('olimpx_remembered_email');
        }

        setButtonLoading(submitBtn, true, 'Kirish...');
        
        const result = await login(emailInput.value, passwordInput.value);

        if (result.success) {
          setButtonLoading(submitBtn, false);
          toast.success('Xush kelibsiz!');
          
          // Role-based redirection
          setTimeout(() => {
            if (result.user && result.user.role === 'admin') {
              navigateTo('/admin');
            } else {
              navigateTo('/dashboard');
            }
          }, 500);
        } else {
          setButtonLoading(submitBtn, false);
          toast.error(result.error);
        }
      });
    }

    if (togglePasswordBtn) {
      togglePasswordBtn.addEventListener('click', () => {
        togglePasswordVisibility(passwordInput, togglePasswordBtn);
      });
    }

    // Enter key navigation between inputs
    if (emailInput) {
      emailInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          passwordInput?.focus();
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitBtn?.click();
        }
      });
    }

  } catch (err) {
    console.error('Login Error:', err);
  }
});
