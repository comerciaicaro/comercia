import User from '../models/User.js';
import { executeMainQuery, executeUserQuery } from '../config/database.js';

const adminController = {
  // Dashboard com estatísticas gerais do sistema
  async getDashboard(req, res) {
    try {
      // Estatísticas básicas de usuários
      const [userCount] = await executeMainQuery('SELECT COUNT(*) as total FROM users WHERE role != "admin"');
      const [activeUserCount] = await executeMainQuery('SELECT COUNT(*) as active FROM users WHERE is_active = true AND role != "admin"');
      const [adminCount] = await executeMainQuery('SELECT COUNT(*) as admins FROM users WHERE role = "admin"');

      // Buscar usuários ativos para calcular estatísticas agregadas
      const users = await executeMainQuery('SELECT id FROM users WHERE is_active = true AND role != "admin"');
      
      let totalAgents = 0;
      let totalConversations = 0;
      let totalMessages = 0;

      for (const user of users) {
        try {
          const [agentCount] = await executeUserQuery(user.id, 'SELECT COUNT(*) as count FROM agents');
          const [convCount] = await executeUserQuery(user.id, 'SELECT COUNT(*) as count FROM conversations');
          const [msgCount] = await executeUserQuery(user.id, 'SELECT COUNT(*) as count FROM messages');

          totalAgents += agentCount.count || 0;
          totalConversations += convCount.count || 0;
          totalMessages += msgCount.count || 0;
        } catch (error) {
          // Usuário pode não ter banco ainda
          console.log(`Usuário ${user.id} não possui banco de dados ainda`);
        }
      }

      res.json({
        success: true,
        data: {
          overview: {
            totalUsers: userCount.total || 0,
            activeUsers: activeUserCount.active || 0,
            adminUsers: adminCount.admins || 0,
            totalAgents,
            totalConversations,
            totalMessages
          }
        }
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao carregar dashboard administrativo' 
      });
    }
  },

  // Obter todos os usuários do sistema
  async getUsers(req, res) {
    try {
      const { limit = 50, offset = 0, search, role, plan, is_active } = req.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (role) filters.role = role;
      if (plan) filters.plan = plan;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const users = await User.findAll(parseInt(limit), parseInt(offset), filters);
      
      // Contar total para paginação
      let totalQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
      const totalParams = [];
      
      if (search) {
        totalQuery += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
        totalParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (role) {
        totalQuery += ' AND role = ?';
        totalParams.push(role);
      }
      if (plan) {
        totalQuery += ' AND plan = ?';
        totalParams.push(plan);
      }
      if (is_active !== undefined) {
        totalQuery += ' AND is_active = ?';
        totalParams.push(is_active === 'true');
      }

      const totalResult = await executeMainQuery(totalQuery, totalParams);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total: totalResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Erro ao buscar usuários' 
      });
    }
  },

  // Excluir usuário
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const success = await User.delete(id);
      
      if (!success) {
        return res.status(404).json({ 
          success: false, 
          error: 'Usuário não encontrado' 
        });
      }

      res.json({
        success: true,
        message: 'Usuário excluído com sucesso'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Erro ao excluir usuário' 
      });
    }
  }
};

export default adminController;