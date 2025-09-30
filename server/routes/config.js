import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { executeQuery } from '../config/database.js';

const router = express.Router();

// Aplicar middleware de autenticação
router.use(authMiddleware);

// ==================== WHATSAPP CONFIGURATIONS ====================

// GET /api/config/whatsapp - Listar configurações WhatsApp
router.get('/whatsapp', async (req, res) => {
  try {
    const userId = req.userId;
    
    const configs = await executeQuery(`
      SELECT id, name, phone_number_id, business_account_id, is_active, created_at
      FROM whatsapp_configs 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    console.error('Erro ao buscar configurações WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/config/whatsapp - Adicionar configuração WhatsApp
router.post('/whatsapp', async (req, res) => {
  try {
    const userId = req.userId;
    const { name, access_token, phone_number_id, webhook_verify_token, business_account_id } = req.body;
    
    if (!name || !access_token || !phone_number_id) {
      return res.status(400).json({
        success: false,
        error: 'Nome, access token e phone number ID são obrigatórios'
      });
    }

    // Verificar limite de WhatsApps por usuário
    const [countResult] = await executeQuery(`
      SELECT COUNT(*) as count FROM whatsapp_configs WHERE user_id = ?
    `, [userId]);

    const maxWhatsApp = 3; // Limite padrão
    if (countResult.count >= maxWhatsApp) {
      return res.status(400).json({
        success: false,
        error: `Limite máximo de ${maxWhatsApp} WhatsApps por usuário atingido`
      });
    }

    const result = await executeQuery(`
      INSERT INTO whatsapp_configs (
        user_id, name, access_token, phone_number_id, 
        webhook_verify_token, business_account_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, name, access_token, phone_number_id, webhook_verify_token, business_account_id]);

    const newConfig = {
      id: result.insertId,
      name,
      phone_number_id,
      business_account_id,
      is_active: true,
      created_at: new Date()
    };

    res.json({
      success: true,
      data: newConfig,
      message: 'Configuração WhatsApp adicionada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao adicionar WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/config/whatsapp/:id - Remover configuração WhatsApp
router.delete('/whatsapp/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const result = await executeQuery(`
      DELETE FROM whatsapp_configs 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Configuração não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Configuração WhatsApp removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/config/test-whatsapp - Testar conexão WhatsApp
router.post('/test-whatsapp', async (req, res) => {
  try {
    const { access_token, phone_number_id } = req.body;

    if (!access_token || !phone_number_id) {
      return res.status(400).json({
        success: false,
        error: 'Access token e phone number ID são obrigatórios'
      });
    }

    // Testar conexão com WhatsApp Business API
    const testResponse = await fetch(`https://graph.facebook.com/v18.0/${phone_number_id}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (testResponse.ok) {
      const data = await testResponse.json();
      res.json({
        success: true,
        message: 'WhatsApp conectado com sucesso',
        data: {
          phone_number: data.display_phone_number,
          verified_name: data.verified_name
        }
      });
    } else {
      res.json({
        success: false,
        error: 'Erro na conexão com WhatsApp. Verifique suas credenciais.'
      });
    }
  } catch (error) {
    console.error('Erro ao testar WhatsApp:', error);
    res.json({
      success: false,
      error: 'Erro ao testar conexão WhatsApp'
    });
  }
});

// ==================== EMAIL CONFIGURATIONS ====================

// GET /api/config/email - Obter configurações de email
router.get('/email', async (req, res) => {
  try {
    const userId = req.userId;
    
    const configs = await executeQuery(`
      SELECT chave, valor FROM configuracoes 
      WHERE user_id = ? AND chave LIKE 'email_%'
    `, [userId]);
    
    const emailConfig = {};
    configs.forEach(config => {
      const key = config.chave.replace('email_', '');
      emailConfig[key] = config.valor;
    });
    
    res.json({
      success: true,
      data: emailConfig
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de email:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/config/email - Salvar configurações de email
router.post('/email', async (req, res) => {
  try {
    const userId = req.userId;
    const { smtp_host, smtp_port, smtp_user, smtp_pass, from_name, from_email } = req.body;

    const emailConfigs = [
      { key: 'email_smtp_host', value: smtp_host },
      { key: 'email_smtp_port', value: smtp_port },
      { key: 'email_smtp_user', value: smtp_user },
      { key: 'email_smtp_pass', value: smtp_pass },
      { key: 'email_from_name', value: from_name },
      { key: 'email_from_email', value: from_email },
    ];

    for (const config of emailConfigs) {
      if (config.value) {
        await executeQuery(`
          INSERT INTO configuracoes (user_id, chave, valor)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()
        `, [userId, config.key, config.value]);
      }
    }

    res.json({
      success: true,
      message: 'Configurações de email salvas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de email:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;