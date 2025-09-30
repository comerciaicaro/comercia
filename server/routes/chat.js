import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import chatController from '../controllers/chatController.js';

const router = express.Router();

// Aplicar middleware de autenticação
router.use(authMiddleware);

// Rotas de chat
router.post('/send', chatController.sendMessage);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post('/conversations', chatController.createConversation);
router.get('/knowledge', chatController.searchKnowledge);
router.post('/knowledge', chatController.addKnowledge);

export default router;