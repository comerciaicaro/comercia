import Conversation from '../models/Conversation.js';

const conversationController = {
  async create(req, res) {
    try {
      const conversationData = req.body;
      const userId = req.userId;

      const conversation = await Conversation.create(userId, conversationData);
      
      res.status(201).json({
        success: true,
        message: 'Conversa criada com sucesso',
        data: { conversation }
      });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  },

  async getAll(req, res) {
    try {
      const { limit = 50, offset = 0, status, channel_type, agent_id, search } = req.query;
      const userId = req.userId;
      
      const filters = {};
      if (status) filters.status = status;
      if (channel_type) filters.channel_type = channel_type;
      if (agent_id) filters.agent_id = agent_id;
      if (search) filters.search = search;

      const conversations = await Conversation.findAll(userId, parseInt(limit), parseInt(offset), filters);

      res.json({ 
        success: true,
        data: { conversations }
      });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      
      const conversation = await Conversation.findById(userId, id);
      
      if (!conversation) {
        return res.status(404).json({ 
          success: false, 
          error: 'Conversa não encontrada' 
        });
      }

      res.json({ 
        success: true,
        data: { conversation }
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.userId;

      const conversation = await Conversation.update(userId, id, updates);
      
      if (!conversation) {
        return res.status(404).json({ 
          success: false, 
          error: 'Conversa não encontrada' 
        });
      }

      res.json({
        success: true,
        message: 'Conversa atualizada com sucesso',
        data: { conversation }
      });
    } catch (error) {
      console.error('Update conversation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const success = await Conversation.delete(userId, id);
      
      if (!success) {
        return res.status(404).json({ 
          success: false, 
          error: 'Conversa não encontrada' 
        });
      }

      res.json({ 
        success: true,
        message: 'Conversa excluída com sucesso' 
      });
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  },

  async getStats(req, res) {
    try {
      const userId = req.userId;
      const stats = await Conversation.getStats(userId);
      
      res.json({ 
        success: true,
        data: { stats }
      });
    } catch (error) {
      console.error('Get conversation stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  }
};

export default conversationController;