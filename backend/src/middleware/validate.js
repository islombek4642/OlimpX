import Joi from 'joi';

/**
 * Validation schemas for different routes
 */
export const schemas = {
  // Auth validations
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email noto\'g\'ri formatda',
      'any.required': 'Email kiritilishi shart'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak',
      'any.required': 'Parol kiritilishi shart'
    })
  }),

  register: Joi.object({
    fullName: Joi.string().min(3).max(50).required().messages({
      'string.min': 'Ism kamida 3 ta belgidan iborat bo\'lishi kerak',
      'any.required': 'To\'liq ism kiritilishi shart'
    }),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  // Olympiad validations
  olympiad: Joi.object({
    title: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).allow(''),
    duration: Joi.number().min(5).max(300).optional(),
    category: Joi.string().default('Boshqa'),
    icon: Joi.string().default('📚'),
    status: Joi.string().valid('active', 'inactive').default('active')
  }),

  // Question validations
  question: Joi.object({
    olympiadId: Joi.string().required(),
    text: Joi.string().min(3).required(),
    options: Joi.array().items(Joi.string()).min(2).max(10).required(),
    correctAnswer: Joi.number().integer().min(0).required(),
    duration: Joi.number().integer().min(5).max(600).optional()
  }),

  bulkQuestions: Joi.object({
    questions: Joi.array().items(Joi.object({
      olympiadId: Joi.string().required(),
      text: Joi.string().min(3).required(),
      options: Joi.array().items(Joi.string()).min(2).required(),
      correctAnswer: Joi.number().integer().min(0).required(),
      duration: Joi.number().integer().min(5).max(600).optional()
    })).min(1).required()
  }),

  // Result submission
  resultSubmit: Joi.object({
    olympiadId: Joi.string().required(),
    answers: Joi.array().items(Joi.number().integer().allow(null)).required(),
    timeTaken: Joi.string().required()
  })
};

/**
 * Validation middleware
 * @param {string} schemaKey - Key from schemas object
 */
export const validate = (schemaKey) => {
  return (req, res, next) => {
    const schema = schemas[schemaKey];
    if (!schema) {
      return next();
    }

    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ 
        success: false, 
        error: errorMessage,
        details: error.details 
      });
    }

    next();
  };
};
