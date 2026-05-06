/**
 * ============================================
 * OlimpX - Form Validation Module
 * ============================================
 */

/**
 * Validation Rules Configuration
 */
export const validationRules = {
  required: {
    validate: (value) => value.trim().length > 0,
    message: 'Bu maydon to\'ldirilishi shart'
  },

  email: {
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message: 'Yaroqli email manzil kiriting'
  },

  minLength: (min) => ({
    validate: (value) => value.length >= min,
    message: `Kamida ${min} ta belgi bo'lishi kerak`
  }),

  maxLength: (max) => ({
    validate: (value) => value.length <= max,
    message: `Ko'pi bilan ${max} ta belgi bo'lishi mumkin`
  }),

  password: {
    validate: (value) => {
      // At least 8 chars, one uppercase, one lowercase, one number
      const hasMinLength = value.length >= 8;
      const hasUppercase = /[A-Z]/.test(value);
      const hasLowercase = /[a-z]/.test(value);
      const hasNumber = /\d/.test(value);
      return hasMinLength && hasUppercase && hasLowercase && hasNumber;
    },
    message: 'Parol kamida 8 ta belgi, bitta katta harf, kichik harf va raqamdan iborat bo\'lishi kerak'
  },

  passwordStrength: (value) => {
    const checks = {
      minLength: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(value)
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;
    let strength = 'weak';
    if (passedChecks === 5) strength = 'strong';
    else if (passedChecks >= 3) strength = 'medium';

    return { strength, checks };
  },

  match: (compareValue) => ({
    validate: (value) => value === compareValue,
    message: 'Qiymatlar mos kelmayapti'
  }),

  phone: {
    validate: (value) => {
      const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
      return phoneRegex.test(value.replace(/\s/g, ''));
    },
    message: 'Yaroqli telefon raqami kiriting'
  },

  name: {
    validate: (value) => {
      // Allow letters, spaces, apostrophes, hyphens (for names like O'zbekiston, Alisher Navoiy)
      const nameRegex = /^[a-zA-Zа-яА-ЯёЎғҒқҚҳҲ'\s\-]+$/;
      const trimmedValue = value.trim();
      return nameRegex.test(trimmedValue) && trimmedValue.length >= 2 && trimmedValue.length <= 50;
    },
    message: 'Ism 2-50 ta belgidan iborat bo\'lishi kerak va faqat harflardan tashkil topishi lozim'
  }
};

/**
 * Validate a single field
 * @param {string} value - Field value
 * @param {Array} rules - Array of validation rules
 * @returns {object} - Validation result { valid: boolean, error: string|null }
 */
export function validateField(value, rules) {
  for (const rule of rules) {
    const ruleConfig = typeof rule === 'function' ? rule(value) : rule;

    if (!ruleConfig.validate(value)) {
      return {
        valid: false,
        error: ruleConfig.message
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validate an entire form
 * @param {object} values - Form values { fieldName: value }
 * @param {object} schema - Validation schema { fieldName: rules[] }
 * @returns {object} - Validation result { valid: boolean, errors: object }
 */
export function validateForm(values, schema) {
  const errors = {};
  let valid = true;

  for (const [fieldName, rules] of Object.entries(schema)) {
    const value = values[fieldName] || '';
    const result = validateField(value, rules);

    if (!result.valid) {
      errors[fieldName] = result.error;
      valid = false;
    }
  }

  return { valid, errors };
}

/**
 * Real-time validation helper with debounce
 * @param {HTMLElement} input - Input element
 * @param {Array} rules - Validation rules
 * @param {Function} onResult - Callback with result
 * @param {number} delay - Debounce delay
 */
export function attachRealTimeValidation(input, rules, onResult, delay = 300) {
  let timeout;

  const validate = () => {
    const result = validateField(input.value, rules);
    onResult(result);
  };

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(validate, delay);
  });

  input.addEventListener('blur', () => {
    clearTimeout(timeout);
    validate();
  });
}

/**
 * Common validation schemas for auth forms
 */
export const authSchemas = {
  login: {
    email: [validationRules.required, validationRules.email],
    password: [validationRules.required, validationRules.minLength(6)]
  },

  register: {
    fullName: [validationRules.required, validationRules.name],
    email: [validationRules.required, validationRules.email],
    password: [validationRules.required, validationRules.password],
    confirmPassword: [validationRules.required]
  },

  forgotPassword: {
    email: [validationRules.required, validationRules.email]
  },

  resetPassword: {
    password: [validationRules.required, validationRules.password],
    confirmPassword: [validationRules.required]
  }
};

/**
 * Get password strength label and color
 * @param {string} strength - Strength level ('weak', 'medium', 'strong')
 * @returns {object} - Label and color info
 */
export function getPasswordStrengthInfo(strength) {
  const info = {
    weak: { label: 'Kuchsiz', color: '#ef4444', width: '33%' },
    medium: { label: 'O\'rtacha', color: '#f59e0b', width: '66%' },
    strong: { label: 'Kuchli', color: '#22c55e', width: '100%' }
  };

  return info[strength] || info.weak;
}
