import { body, param, query, validationResult } from 'express-validator';

// Middleware para capturar e formatar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Validações para autenticação
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Nome deve conter apenas letras e espaços'),
  
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email muito longo'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Senha deve ter entre 6 e 128 caracteres'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Nome da empresa muito longo'),
  
  body('plan')
    .optional()
    .isIn(['free', 'basic', 'premium', 'enterprise'])
    .withMessage('Plano deve ser: free, basic, premium ou enterprise'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email deve ter um formato válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  
  handleValidationErrors
];

// Validações para agentes
const validateAgent = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome do agente deve ter entre 2 e 100 caracteres'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Descrição muito longa (máximo 500 caracteres)'),
  
  body('ai_provider')
    .isIn(['chatgpt', 'gemini', 'huggingface'])
    .withMessage('Provedor de IA deve ser: chatgpt, gemini ou huggingface'),
  
  body('model')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Modelo é obrigatório e deve ter no máximo 100 caracteres'),
  
  body('system_prompt')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Prompt do sistema muito longo (máximo 2000 caracteres)'),
  
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperatura deve estar entre 0 e 2'),
  
  body('max_tokens')
    .optional()
    .isInt({ min: 1, max: 8000 })
    .withMessage('Máximo de tokens deve estar entre 1 e 8000'),
  
  handleValidationErrors
];

// Validações para queries de paginação
const validatePagination = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset deve ser um número maior ou igual a 0'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Termo de busca muito longo'),
  
  handleValidationErrors
];

// Rate limiting removido - sem limitação de requisições

// Sanitização de dados
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && Object.keys(req.query).length > 0) {
    const sanitizedQuery = sanitizeObject(req.query);
    Object.keys(req.query).forEach(key => {
      delete req.query[key];
    });
    Object.assign(req.query, sanitizedQuery);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Middleware de tratamento de erros global
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: err.details || err.errors
    });
  }

  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  // Erro de banco de dados
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Registro já existe'
    });
  }

  // Erro genérico do servidor
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Middleware para capturar rotas não encontradas
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Rota ${req.method} ${req.path} não encontrada`
  });
};

export {
  validateRegister,
  validateLogin,
  validateAgent,
  validatePagination,
  handleValidationErrors,
  sanitizeInput,
  errorHandler,
  notFoundHandler
};