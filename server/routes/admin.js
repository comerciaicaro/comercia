import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { executeQuery } from '../config/database.js';

const router = express.Router();

// Aplicar middleware de autenticação e admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard administrativo
router.get('/dashboard', async (req, res) => {
  try {
    const [userStats] = await executeQuery(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(CASE WHEN is_active = true THEN 1 END) as activeUsers,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as adminUsers,
        COUNT(CASE WHEN role = 'barbearia' THEN 1 END) as barbeariaUsers
      FROM users
    `);

    const [agentStats] = await executeQuery(`
      SELECT COUNT(*) as totalAgents FROM agents
    `);

    const [conversationStats] = await executeQuery(`
      SELECT COUNT(*) as totalConversations FROM conversations
    `);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers: userStats.totalUsers || 0,
          activeUsers: userStats.activeUsers || 0,
          adminUsers: userStats.adminUsers || 0,
          barbeariaUsers: userStats.barbeariaUsers || 0,
          totalAgents: agentStats.totalAgents || 0,
          totalConversations: conversationStats.totalConversations || 0
        }
      }
    });
  } catch (error) {
    console.error('Erro no dashboard admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Gerenciamento de usuários
router.get('/users', async (req, res) => {
  try {
    const { limit = 50, offset = 0, search, role, is_active } = req.query;
    
    let query = `
      SELECT id, name, email, role, plan, company, phone, is_active, 
             email_verified, last_login, created_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ? OR company LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = ?`;
      params.push(is_active === 'true');
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const users = await executeQuery(query, params);

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar usuário
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, plan, role } = req.body;

    const updates = [];
    const params = [];

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (plan) {
      updates.push('plan = ?');
      params.push(plan);
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum campo para atualizar'
      });
    }

    params.push(id);

    await executeQuery(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `, params);

    res.json({
      success: true,
      message: 'Usuário atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Excluir usuário
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se não é admin
    const [user] = await executeQuery('SELECT role FROM users WHERE id = ?', [id]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Não é possível excluir usuário administrador'
      });
    }

    await executeQuery('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Configurações globais
router.get('/configs', async (req, res) => {
  try {
    const configs = await executeQuery('SELECT config_key, config_value FROM global_configs WHERE is_active = true');
    
    const configObj = {};
    configs.forEach(config => {
      configObj[config.config_key] = config.config_value;
    });

    res.json({
      success: true,
      data: configObj
    });
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Salvar configuração global
router.post('/configs', async (req, res) => {
  try {
    const { config_key, config_value } = req.body;

    if (!config_key) {
      return res.status(400).json({
        success: false,
        error: 'Chave de configuração é obrigatória'
      });
    }

    await executeQuery(`
      INSERT INTO global_configs (config_key, config_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE 
        config_value = VALUES(config_value),
        updated_at = NOW()
    `, [config_key, config_value]);

    res.json({
      success: true,
      message: 'Configuração salva com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;