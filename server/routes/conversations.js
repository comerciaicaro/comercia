import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import conversationController from '../controllers/conversationController.js';
import { validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Aplicar middleware de autenticação
router.use(authMiddleware);

// Rotas de conversas
router.get('/', validatePagination, conversationController.getAll);
router.post('/', conversationController.create);
router.get('/stats', conversationController.getStats);
router.get('/:id', conversationController.getById);
router.put('/:id', conversationController.update);
router.delete('/:id', conversationController.delete);

export default router;