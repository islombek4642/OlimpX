/**
 * Professional Form Validation System
 * Implements pristine/touched/dirty state management
 */

export class FormValidator {
  constructor(form, config) {
    this.form = form;
    this.config = config;
    this.fields = new Map();
    this.isSubmitted = false;
    
    this.init();
  }

  init() {
    // Initialize field states
    Object.entries(this.config.fields).forEach(([fieldName, fieldConfig]) => {
      const input = this.form.querySelector(`[name="${fieldName}"]`);
      if (input) {
        this.fields.set(fieldName, {
          element: input,
          config: fieldConfig,
          state: {
            pristine: true,
            touched: false,
            dirty: false,
            valid: false,
            error: null
          }
        });
        this.attachFieldEvents(fieldName);
      }
    });

    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  attachFieldEvents(fieldName) {
    const field = this.fields.get(fieldName);
    const { element, config } = field;

    // Focus → mark as touched
    element.addEventListener('focus', () => {
      field.state.touched = true;
      this.updateFieldUI(fieldName);
    });

    // Input → mark as dirty and validate
    element.addEventListener('input', () => {
      field.state.dirty = true;
      field.state.pristine = false;
      
      // Smart validation timing
      if (this.shouldValidateOnInput(fieldName)) {
        this.validateField(fieldName);
      }
      
      // Special: Password strength callback
      if (config.type === 'password' && config.onPasswordChange) {
        config.onPasswordChange(element.value);
      }
    });

    // Blur → always validate if touched
    element.addEventListener('blur', () => {
      if (field.state.touched) {
        this.validateField(fieldName);
      }
    });
  }

  shouldValidateOnInput(fieldName) {
    const { element, config } = this.fields.get(fieldName);
    const value = element.value;
    
    // Full Name: validate if user started typing
    if (config.type === 'text') {
      return value.length > 0;
    }
    
    // Email: SOFT validation only - no hard errors on input
    if (config.type === 'email') {
      return value.length > 0; // Always show hints, but no hard errors
    }
    
    // Password: SOFT validation - show requirements, no hard errors
    if (config.type === 'password') {
      return value.length > 0; // Update strength, no hard errors
    }
    
    // Confirm Password: smart validation - only when substantial input
    if (config.type === 'confirmPassword') {
      const passwordField = this.fields.get('password');
      const passwordValue = passwordField?.element.value || '';
      return value.length >= passwordValue.length && value.length > 0;
    }
    
    return true;
  }

  validateField(fieldName, forceHardValidation = false) {
    const field = this.fields.get(fieldName);
    const { element, config, state } = field;
    const value = element.value;
    const isInputEvent = !forceHardValidation && state.dirty && !state.touched;
    
    // Don't validate pristine empty fields (unless submitted)
    if (state.pristine && value.length === 0 && !this.isSubmitted) {
      state.valid = true;
      state.error = null;
      state.hint = null;
      this.updateFieldUI(fieldName);
      return true;
    }
    
    // Don't show "required" error on empty blur (only on submit)
    if (state.touched && !state.dirty && value.length === 0 && !this.isSubmitted) {
      state.valid = true;
      state.error = null;
      state.hint = null;
      this.updateFieldUI(fieldName);
      return true;
    }

    // Run validation with soft/hard mode
    const result = this.runValidation(value, config.rules, isInputEvent && !forceHardValidation);
    
    state.valid = result.valid;
    state.error = result.error;
    state.hint = result.hint;
    
    this.updateFieldUI(fieldName);
    return result.valid;
  }

  runValidation(value, rules, softMode = false) {
    let hasError = false;
    let firstError = null;
    let hint = null;
    
    for (const rule of rules) {
      const ruleConfig = typeof rule === 'function' ? rule(value) : rule;
      
      if (!ruleConfig.validate(value)) {
        hasError = true;
        firstError = ruleConfig.message;
        break;
      }
    }
    
    // Soft mode: return hints instead of errors
    if (softMode && hasError) {
      return this.generateSoftHint(value, rules);
    }
    
    return { 
      valid: !hasError, 
      error: hasError ? firstError : null,
      hint: hint
    };
  }

  generateSoftHint(value, rules) {
    // Email soft hints
    if (value.length > 0 && !value.includes('@')) {
      return { valid: true, error: null, hint: "Email manzilida '@' belgisi bo'lishi kerak" };
    }
    
    if (value.includes('@') && !value.includes('.')) {
      return { valid: true, error: null, hint: "Email manzilida domen nomi bo'lishi kerak" };
    }
    
    // Password soft hints
    if (value.length > 0 && value.length < 8) {
      return { valid: true, error: null, hint: "Parol kamida 8 ta belgidan iborat bo'lishi kerak" };
    }
    
    return { valid: true, error: null, hint: null };
  }

  updateFieldUI(fieldName) {
    const field = this.fields.get(fieldName);
    const { element, state } = field;
    const formGroup = element.closest('.form-group');
    
    // Clear all state classes
    formGroup.classList.remove('is-error', 'is-valid', 'is-touched', 'is-dirty', 'has-hint');
    
    // Add appropriate classes
    if (state.touched) formGroup.classList.add('is-touched');
    if (state.dirty) formGroup.classList.add('is-dirty');
    
    // Clear existing messages
    this.clearAllMessages(formGroup);
    
    if (state.valid && state.dirty) {
      formGroup.classList.add('is-valid');
    } else if (state.error) {
      formGroup.classList.add('is-error');
      this.showError(formGroup, state.error);
    } else if (state.hint) {
      formGroup.classList.add('has-hint');
      this.showHint(formGroup, state.hint);
    }
  }

  clearAllMessages(formGroup) {
    this.clearError(formGroup);
    this.clearHint(formGroup);
  }

  showHint(formGroup, hint) {
    this.clearHint(formGroup);
    
    const hintEl = document.createElement('div');
    hintEl.className = 'form-hint';
    hintEl.textContent = hint;
    hintEl.setAttribute('aria-live', 'polite');
    formGroup.appendChild(hintEl);
  }

  clearHint(formGroup) {
    const existingHint = formGroup.querySelector('.form-hint');
    if (existingHint) {
      existingHint.remove();
    }
  }

  showError(formGroup, error) {
    this.clearError(formGroup);
    
    const errorEl = document.createElement('div');
    errorEl.className = 'form-error';
    errorEl.textContent = error;
    formGroup.appendChild(errorEl);
  }

  clearError(formGroup) {
    const existingError = formGroup.querySelector('.form-error');
    if (existingError) {
      existingError.remove();
    }
  }

  validateAll() {
    let isValid = true;
    
    this.fields.forEach((field, fieldName) => {
      if (!this.validateField(fieldName)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  handleSubmit() {
    this.isSubmitted = true;
    
    if (this.validateAll()) {
      if (this.config.onSubmit) {
        this.config.onSubmit(this.getFormData());
      }
    } else {
      // Find first invalid field
      const firstInvalidField = this.findFirstInvalidField();
      if (firstInvalidField) {
        this.scrollToAndFocus(firstInvalidField);
        this.addShakeAnimation(firstInvalidField);
      }
      
      // Shake animation for submit button
      const submitBtn = this.form.querySelector('[type="submit"]');
      submitBtn?.classList.add('animate-shake');
      setTimeout(() => submitBtn?.classList.remove('animate-shake'), 500);
    }
  }

  findFirstInvalidField() {
    for (const [fieldName, field] of this.fields) {
      if (!field.state.valid) {
        return field.element;
      }
    }
    return null;
  }

  scrollToAndFocus(element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => element.focus(), 300);
  }

  addShakeAnimation(element) {
    const formGroup = element.closest('.form-group');
    formGroup?.classList.add('animate-shake');
    setTimeout(() => formGroup?.classList.remove('animate-shake'), 500);
  }

  getFormData() {
    const data = {};
    this.fields.forEach((field, fieldName) => {
      data[fieldName] = field.element.value;
    });
    return data;
  }

  // Public API
  reset() {
    this.isSubmitted = false;
    this.fields.forEach((field, fieldName) => {
      field.state = {
        pristine: true,
        touched: false,
        dirty: false,
        valid: false,
        error: null
      };
      field.element.value = '';
      this.updateFieldUI(fieldName);
    });
  }
}

// Factory function for easier usage
export function createValidator(form, config) {
  return new FormValidator(form, config);
}
