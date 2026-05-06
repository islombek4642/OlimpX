/**
 * ============================================
 * OlimpX - Register Page Script
 * With real-time validation and password strength
 * ============================================
 */

import { redirectIfAuthenticated, register } from './modules/auth.js';
import {
  validateField,
  attachRealTimeValidation,
  validationRules,
  authSchemas,
  getPasswordStrengthInfo
} from './modules/validation.js';
import {
  setButtonLoading,
  setFieldError,
  togglePasswordVisibility,
  toast,
  initTheme,
  createThemeToggle
} from './modules/ui.js';

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  // Check if already logged in
  if (redirectIfAuthenticated()) return;

  // Initialize theme
  initTheme();
  const actionsContainer = document.querySelector('.auth-header-actions');
  if (actionsContainer) createThemeToggle(actionsContainer);

  // Cache DOM elements
  const form = document.getElementById('registerForm');
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
  const submitBtn = document.getElementById('submitBtn');
  const agreeTermsCheckbox = document.getElementById('agreeTerms');

  // Password strength elements
  const passwordStrength = document.getElementById('passwordStrength');
  const strengthLabel = document.getElementById('strengthLabel');
  const strengthPercent = document.getElementById('strengthPercent');
  const strengthFill = document.getElementById('strengthFill');
  const strengthChecks = document.getElementById('strengthChecks');

  // ============================================
  // PASSWORD TOGGLE
  // ============================================

  togglePasswordBtn.addEventListener('click', () => {
    togglePasswordVisibility(passwordInput, togglePasswordBtn);
  });

  toggleConfirmPasswordBtn.addEventListener('click', () => {
    togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordBtn);
  });

  // ============================================
  // PASSWORD STRENGTH METER
  // ============================================

  function updatePasswordStrength(password) {
    if (password.length === 0) {
      passwordStrength.style.display = 'none';
      return;
    }

    passwordStrength.style.display = 'block';

    const { strength, checks } = validationRules.passwordStrength(password);
    const info = getPasswordStrengthInfo(strength);
    const passedCount = Object.values(checks).filter(Boolean).length;
    const percent = (passedCount / 5) * 100;

    // Update strength bar
    strengthLabel.textContent = `Parol kuchi: ${info.label}`;
    strengthLabel.style.color = info.color;
    strengthPercent.textContent = `${Math.round(percent)}%`;
    strengthFill.style.width = `${percent}%`;
    strengthFill.style.backgroundColor = info.color;

    // Update check indicators
    const checkElements = strengthChecks.querySelectorAll('.strength-check');
    checkElements.forEach(el => {
      const checkName = el.dataset.check;
      const isPassed = checks[checkName];
      const icon = el.querySelector('.strength-check__icon');
      const text = el.querySelector('.strength-check__text');

      if (isPassed) {
        icon.textContent = '✓';
        icon.style.color = 'var(--color-success-600)';
        text.style.color = 'var(--color-success-600)';
        text.style.textDecoration = 'line-through';
        el.classList.add('passed');
      } else {
        icon.textContent = '○';
        icon.style.color = 'var(--text-muted)';
        text.style.color = 'var(--text-secondary)';
        text.style.textDecoration = 'none';
        el.classList.remove('passed');
      }
    });

    return strength === 'strong' || strength === 'medium';
  }

  passwordInput.addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value);
    checkFormValidity();
  });

  // ============================================
  // REAL-TIME VALIDATION
  // ============================================

  // Full Name validation - only on blur, not real-time
  fullNameInput.addEventListener('blur', () => {
    const result = validateField(fullNameInput.value, authSchemas.register.fullName);
    const formGroup = fullNameInput.closest('.form-group');
    setFieldError(formGroup, result.error);
    checkFormValidity();
  });

  // Email validation - only on blur, not real-time
  emailInput.addEventListener('blur', () => {
    const result = validateField(emailInput.value, authSchemas.register.email);
    const formGroup = emailInput.closest('.form-group');
    setFieldError(formGroup, result.error);
    checkFormValidity();
  });

  // Password validation
  passwordInput.addEventListener('blur', () => {
    const result = validateField(passwordInput.value, authSchemas.register.password);
    const formGroup = passwordInput.closest('.form-group');
    setFieldError(formGroup, result.error);
    checkFormValidity();
  });

  // Confirm Password validation
  confirmPasswordInput.addEventListener('input', () => {
    const result = validateField(
      confirmPasswordInput.value,
      [validationRules.required, validationRules.match(passwordInput.value)]
    );
    const formGroup = confirmPasswordInput.closest('.form-group');
    if (confirmPasswordInput.value.length > 0) {
      setFieldError(formGroup, result.error);
    }
    checkFormValidity();
  });

  confirmPasswordInput.addEventListener('blur', () => {
    const result = validateField(
      confirmPasswordInput.value,
      [validationRules.required, validationRules.match(passwordInput.value)]
    );
    const formGroup = confirmPasswordInput.closest('.form-group');
    if (confirmPasswordInput.value.length > 0) {
      setFieldError(formGroup, result.error);
    }
    checkFormValidity();
  });

  // ============================================
  // FORM VALIDITY CHECK
  // ============================================

  function checkFormValidity() {
    const fullNameValid = validateField(fullNameInput.value, authSchemas.register.fullName).valid;
    const emailValid = validateField(emailInput.value, authSchemas.register.email).valid;
    const passwordValid = validateField(passwordInput.value, authSchemas.register.password).valid;
    const confirmPasswordValid = confirmPasswordInput.value === passwordInput.value && confirmPasswordInput.value.length > 0;
    const termsAgreed = agreeTermsCheckbox.checked;

    const isValid = fullNameValid && emailValid && passwordValid && confirmPasswordValid && termsAgreed;
    submitBtn.disabled = !isValid;
  }

  agreeTermsCheckbox.addEventListener('change', checkFormValidity);

  // ============================================
  // FORM SUBMISSION
  // ============================================

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (submitBtn.disabled) return;

    // Validate all fields one more time
    const validations = {
      fullName: validateField(fullNameInput.value, authSchemas.register.fullName),
      email: validateField(emailInput.value, authSchemas.register.email),
      password: validateField(passwordInput.value, authSchemas.register.password),
      confirmPassword: validateField(
        confirmPasswordInput.value,
        [validationRules.required, validationRules.match(passwordInput.value)]
      )
    };

    // Show errors
    setFieldError(fullNameInput.closest('.form-group'), validations.fullName.error);
    setFieldError(emailInput.closest('.form-group'), validations.email.error);
    setFieldError(passwordInput.closest('.form-group'), validations.password.error);
    setFieldError(confirmPasswordInput.closest('.form-group'), validations.confirmPassword.error);

    // Check if all valid
    const allValid = Object.values(validations).every(v => v.valid) && agreeTermsCheckbox.checked;

    if (!allValid) {
      submitBtn.classList.add('animate-shake');
      setTimeout(() => submitBtn.classList.remove('animate-shake'), 500);
      return;
    }

    // Set loading state
    setButtonLoading(submitBtn, true, 'Ro\'yxatdan o\'tish...');

    // Attempt registration
    const result = await register({
      fullName: fullNameInput.value.trim(),
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

    if (result.success) {
      toast.success('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!', 'Tabriklaymiz');

      // Reset form after successful registration
      form.reset();
      // Remove filled class from form groups
      document.querySelectorAll('.form-group--filled').forEach(group => {
        group.classList.remove('form-group--filled');
      });
      // Hide password strength meter
      passwordStrength.style.display = 'none';

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    } else {
      setButtonLoading(submitBtn, false);
      toast.error(result.error, 'Xatolik');

      if (result.error.includes('email')) {
        setFieldError(emailInput.closest('.form-group'), result.error);
      }

      // Shake animation
      const card = document.querySelector('.auth-card');
      card.classList.add('animate-shake');
      setTimeout(() => card.classList.remove('animate-shake'), 500);
    }
  });

  // ============================================
  // INPUT FOCUS HANDLING
  // ============================================

  [fullNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
    // Handle input changes
    input.addEventListener('input', () => {
      const formGroup = input.closest('.form-group');
      if (input.value.length > 0) {
        formGroup.classList.add('form-group--filled');
      } else {
        formGroup.classList.remove('form-group--filled');
      }
    });

    // Handle focus
    input.addEventListener('focus', () => {
      const formGroup = input.closest('.form-group');
      formGroup.classList.add('form-group--focused');
    });

    // Handle blur - check if input has value
    input.addEventListener('blur', () => {
      const formGroup = input.closest('.form-group');
      formGroup.classList.remove('form-group--focused');
      
      // Ensure filled class is based on actual value
      if (input.value.length > 0) {
        formGroup.classList.add('form-group--filled');
      } else {
        formGroup.classList.remove('form-group--filled');
      }
    });
  });

  // ============================================
  // ENTER KEY NAVIGATION
  // ============================================

  // Handle Enter key to move to next input
  fullNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      emailInput.focus();
    }
  });

  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmPasswordInput.focus();
    }
  });

  confirmPasswordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus on terms checkbox if not checked, otherwise submit
      const termsCheckbox = document.getElementById('agreeTerms');
      if (termsCheckbox && !termsCheckbox.checked) {
        termsCheckbox.focus();
      } else {
        form.dispatchEvent(new Event('submit'));
      }
    }
  });

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !submitBtn.disabled) {
      form.dispatchEvent(new Event('submit'));
    }
  });

  console.log('OlimpX Register page initialized');
});
