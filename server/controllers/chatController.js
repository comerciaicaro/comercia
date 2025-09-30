import AIService from '../services/aiService.js';
import { executeUserQuery } from '../config/database.js';

const chatController = {
  async sendMessage(req, res) {
    try {
      const { conversationId, message, agentId } = req.body;
      const userId = req.userId;

      if (!message || !agentId || !conversationId) {
        return res.status(400).json({
          success: false,
          error: 'Mensagem, agente e conversa são obrigatórios'
        });
      }

      // Verificar se a conversa existe e pertence ao usuário
      const conversations = await executeUserQuery(userId, 'SELECT * FROM conversations WHERE id = ?', [conversationId]);
      if (conversations.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Conversa não encontrada'
        });
      }

      // Buscar agente
      const agents = await executeUserQuery(userId, 'SELECT * FROM agents WHERE id = ? AND is_active = true', [agentId]);
      const agent = agents[0];

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agente não encontrado ou inativo'
        });
      }

      // Salvar mensagem do usuário
      const userMsgResult = await executeUserQuery(userId, `
        INSERT INTO messages (conversation_id, content, sender, message_type, timestamp)
        VALUES (?, ?, 'user', 'text', NOW())
      `, [conversationId, message]);

      // Gerar resposta da IA com RAG
      const startTime = Date.now();
      const aiResponse = await AIService.generateWithRAG(
        userId,
        agent.ai_provider,
        agent.model,
        message,
        agent,
        agent.temperature,
        agent.max_tokens
      );
      const responseTime = (Date.now() - startTime) / 1000;

      // Salvar resposta da IA
      const aiMsgResult = await executeUserQuery(userId, `
        INSERT INTO messages (conversation_id, content, sender, message_type, response_time, timestamp)
        VALUES (?, ?, 'agent', 'text', ?, NOW())
      `, [conversationId, aiResponse, responseTime]);

      // Atualizar conversa
      await executeUserQuery(userId, `
        UPDATE conversations 
        SET updated_at = NOW()
        WHERE id = ?
      `, [conversationId]);

      res.json({
        success: true,
        data: {
          userMessage: {
            id: userMsgResult.insertId,
            content: message,
            sender: 'user',
            timestamp: new Date()
          },
          aiMessage: {
            id: aiMsgResult.insertId,
            content: aiResponse,
            sender: 'agent',
            response_time: responseTime,
            timestamp: new Date()
          }
        }
      });

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro interno do servidor'
      });
    }
  },

  async getMessages(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const userId = req.userId;

      const messages = await executeUserQuery(userId, `
        SELECT id, content, sender, message_type, response_time, timestamp, created_at
        FROM messages 
        WHERE conversation_id = ?
        ORDER BY timestamp ASC
        LIMIT ? OFFSET ?
      `, [id, parseInt(limit), parseInt(offset)]);

      res.json({
        success: true,
        data: { messages }
      });

    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  async createConversation(req, res) {
    try {
      const { agentId, title } = req.body;
      const userId = req.userId;

      const result = await executeUserQuery(userId, `
        INSERT INTO conversations (agent_id, customer_name, channel_type, status, start_time)
        VALUES (?, ?, 'chat', 'active', NOW())
      `, [agentId, title || 'Nova Conversa']);

      const conversation = {
        id: result.insertId,
        agent_id: agentId,
        customer_name: title || 'Nova Conversa',
        channel_type: 'chat',
        status: 'active',
        start_time: new Date()
      };

      res.json({
        success: true,
        data: { conversation }
      });

    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  async searchKnowledge(req, res) {
    try {
      const { query, limit = 10 } = req.query;
      const userId = req.userId;

      if (!query) {
        return res.json({
          success: true,
          data: { results: [] }
        });
      }

      const results = await AIService.searchKnowledge(userId, query, parseInt(limit));

      res.json({
        success: true,
        data: { results }
      });

    } catch (error) {
      console.error('Erro ao buscar conhecimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  async addKnowledge(req, res) {
    try {
      const { title, content, category, tags } = req.body;
      const userId = req.userId;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: 'Título e conteúdo são obrigatórios'
        });
      }

      const [result] = await executeUserQuery(userId, `
        INSERT INTO knowledge_base (title, content, category, tags, is_active)
        VALUES (?, ?, ?, ?, true)
      `, [title, content, category || 'geral', JSON.stringify(tags || [])]);

      res.json({
        success: true,
        data: {
          id: result.insertId,
          title,
          content,
          category,
          tags
        }
      });

    } catch (error) {
      console.error('Erro ao adicionar conhecimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
};

export default chatController;