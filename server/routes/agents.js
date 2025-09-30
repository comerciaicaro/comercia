import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import agentController from '../controllers/agentController.js';
import { validateAgent, validatePagination } from '../middleware/validation.js';

const router = express.Router();

// Aplicar middleware de autenticação
router.use(authMiddleware);

// Rotas de agentes
router.get('/', validatePagination, agentController.getAll);
router.post('/', validateAgent, agentController.create);
router.get('/stats', agentController.getStats);
router.get('/:id', agentController.getById);
router.put('/:id', agentController.update);
router.delete('/:id', agentController.delete);

export default router;