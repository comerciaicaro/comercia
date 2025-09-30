import { executeUserQuery } from '../config/database.js';
import AIService from '../services/aiService.js';

class SocketHandlers {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
    this.userSockets = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      socket.on('authenticate', async (data) => {
        try {
          const { userId, token } = data;
          
          if (this.validateToken(token, userId)) {
            this.connectedUsers.set(userId, socket.id);
            this.userSockets.set(socket.id, userId);
            
            socket.userId = userId;
            socket.join(`user_${userId}`);
            
            console.log(`✅ Usuário ${userId} autenticado no socket ${socket.id}`);
            socket.emit('authenticated', { success: true, userId });
            
            await this.sendInitialData(socket, userId);
          } else {
            socket.emit('authentication_error', { error: 'Token inválido' });
          }
        } catch (error) {
          console.error('Erro na autenticação do socket:', error);
          socket.emit('authentication_error', { error: 'Erro interno' });
        }
      });

      socket.on('send_message', async (data) => {
        await this.handleSendMessage(socket, data);
      });

      socket.on('join_conversation', (data) => {
        const { conversationId } = data;
        if (conversationId) {
          socket.join(`conversation_${conversationId}`);
        }
      });

      socket.on('leave_conversation', (data) => {
        const { conversationId } = data;
        if (conversationId) {
          socket.leave(`conversation_${conversationId}`);
        }
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  validateToken(token, userId) {
    return token && userId;
  }

  async sendInitialData(socket, userId) {
    try {
      const conversations = await executeUserQuery(userId, `
        SELECT c.*, a.name as agent_name,
               COUNT(m.id) as message_count,
               MAX(m.timestamp) as last_message_time
        FROM conversations c
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN messages m ON m.conversation_id = c.id
        WHERE c.status = 'active'
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        LIMIT 20
      `);

      const agents = await executeUserQuery(userId, `
        SELECT id, name, is_active, ai_provider, model
        FROM agents
        WHERE is_active = true
        ORDER BY name
      `);

      socket.emit('initial_data', {
        conversations,
        agents,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao enviar dados iniciais:', error);
      socket.emit('error', { message: 'Erro ao carregar dados iniciais' });
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { conversationId, message, agentId } = data;
      const userId = socket.userId;

      if (!userId || !conversationId || !message || !agentId) {
        socket.emit('message_error', { error: 'Dados incompletos' });
        return;
      }

      // Verificar se a conversa existe
      const conversations = await executeUserQuery(userId, 
        'SELECT * FROM conversations WHERE id = ?', [conversationId]
      );
      
      if (conversations.length === 0) {
        socket.emit('message_error', { error: 'Conversa não encontrada' });
        return;
      }

      // Buscar agente
      const agents = await executeUserQuery(userId, 
        'SELECT * FROM agents WHERE id = ? AND is_active = true', [agentId]
      );
      
      if (agents.length === 0) {
        socket.emit('message_error', { error: 'Agente não encontrado ou inativo' });
        return;
      }

      const agent = agents[0];

      // Salvar mensagem do usuário
      const userMsgResult = await executeUserQuery(userId, `
        INSERT INTO messages (conversation_id, content, sender, message_type, timestamp)
        VALUES (?, ?, 'user', 'text', NOW())
      `, [conversationId, message]);

      const userMessage = {
        id: userMsgResult.insertId,
        conversation_id: conversationId,
        content: message,
        sender: 'user',
        message_type: 'text',
        timestamp: new Date().toISOString()
      };

      this.io.to(`conversation_${conversationId}`).emit('new_message', userMessage);

      // Gerar resposta da IA
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

      const aiMessage = {
        id: aiMsgResult.insertId,
        conversation_id: conversationId,
        content: aiResponse,
        sender: 'agent',
        message_type: 'text',
        response_time: responseTime,
        timestamp: new Date().toISOString()
      };

      this.io.to(`conversation_${conversationId}`).emit('new_message', aiMessage);

      // Atualizar conversa
      await executeUserQuery(userId, `
        UPDATE conversations SET updated_at = NOW() WHERE id = ?
      `, [conversationId]);

    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
      socket.emit('message_error', { error: 'Erro interno do servidor' });
    }
  }

  handleDisconnect(socket) {
    const userId = this.userSockets.get(socket.id);
    
    if (userId) {
      this.connectedUsers.delete(userId);
      this.userSockets.delete(socket.id);
      console.log(`🔌 Usuário ${userId} desconectado (socket: ${socket.id})`);
    } else {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    }
  }

  emitNotification(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification', notification);
  }

  emitAgentUpdate(userId, agentData) {
    this.io.to(`user_${userId}`).emit('agent_updated', agentData);
  }

  emitNewConversation(userId, conversation) {
    this.io.to(`user_${userId}`).emit('new_conversation', conversation);
  }
}

export default SocketHandlers;