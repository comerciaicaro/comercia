import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../config/supabase.js';
import AIService from '../services/aiService.js';

const router = express.Router();

// Middleware para verificar se é usuário da barbearia
const verificarUsuarioBarbearia = (req, res, next) => {
  if (req.user.role !== 'barbearia') {
    return res.status(403).json({ 
      success: false, 
      error: 'Acesso negado. Apenas usuários da barbearia podem acessar esta funcionalidade.' 
    });
  }
  next();
};

// Aplicar middleware de autenticação e verificação em todas as rotas
router.use(authMiddleware);
router.use(verificarUsuarioBarbearia);

// ==================== AGENDAMENTOS ====================

// GET /api/barbearia/agendamentos - Listar agendamentos
router.get('/agendamentos', async (req, res) => {
  try {
    const { data, status } = req.query;
    const userId = req.user.id;
    
    const filters = {};
    if (data) filters.data = data;
    if (status) filters.status = status;
    
    const agendamentos = await db.agendamentos.findByUserId(userId, filters);
    
    res.json({
      success: true,
      data: agendamentos
    });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/barbearia/agendamentos - Criar agendamento
router.post('/agendamentos', async (req, res) => {
  try {
    const { cliente, telefone, email, data, horario, servico, observacoes } = req.body;
    const userId = req.user.id;
    
    if (!cliente || !telefone || !data || !horario || !servico) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: cliente, telefone, data, horario, servico'
      });
    }

    // Verificar conflito de horário
    const agendamentosExistentes = await db.agendamentos.findByUserId(userId, { data });
    const conflito = agendamentosExistentes.find(ag => 
      ag.horario === horario && ag.status !== 'cancelado'
    );

    if (conflito) {
      return res.status(400).json({
        success: false,
        error: 'Horário já ocupado'
      });
    }

    // Buscar preço do serviço
    const servicosUsuario = await db.servicos.findByUserId(userId);
    const servicoInfo = servicosUsuario.find(s => s.nome === servico || s.id === servico);
    const valor = servicoInfo?.preco || 0;

    const agendamento = await db.agendamentos.create(userId, {
      cliente,
      telefone,
      email,
      data,
      horario,
      servico,
      valor,
      observacoes,
      status: 'confirmado'
    });
    
    res.json({
      success: true,
      data: agendamento,
      message: 'Agendamento criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// PUT /api/barbearia/agendamentos/:id - Atualizar agendamento
router.put('/agendamentos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const agendamento = await db.agendamentos.update(id, updates);
    
    res.json({
      success: true,
      data: agendamento,
      message: 'Agendamento atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ==================== SERVIÇOS ====================

// GET /api/barbearia/servicos - Listar serviços
router.get('/servicos', async (req, res) => {
  try {
    const userId = req.user.id;
    const servicos = await db.servicos.findByUserId(userId);
    
    res.json({
      success: true,
      data: servicos
    });
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ==================== CLIENTES ====================

// GET /api/barbearia/clientes - Listar clientes
router.get('/clientes', async (req, res) => {
  try {
    const userId = req.user.id;
    const clientes = await db.clientes.findByUserId(userId);
    
    res.json({
      success: true,
      data: clientes
    });
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ==================== AGENTES ====================

// GET /api/barbearia/agents - Listar agentes
router.get('/agents', async (req, res) => {
  try {
    const userId = req.user.id;
    const agents = await db.agents.findByUserId(userId);
    
    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/barbearia/agents - Criar agente
router.post('/agents', async (req, res) => {
  try {
    const userId = req.user.id;
    const agentData = req.body;
    
    const agent = await db.agents.create(userId, agentData);
    
    res.json({
      success: true,
      data: agent,
      message: 'Agente criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar agente:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ==================== CONFIGURAÇÕES ====================

// GET /api/barbearia/configuracao - Obter configurações
router.get('/configuracao', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const geminiApiKey = await db.configs.get(userId, 'gemini_api_key');
    
    res.json({
      success: true,
      data: {
        gemini_api_key: geminiApiKey || ''
      }
    });
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// POST /api/barbearia/configuracao - Salvar configurações
router.post('/configuracao', async (req, res) => {
  try {
    const userId = req.user.id;
    const { gemini_api_key } = req.body;
    
    if (gemini_api_key) {
      await db.configs.set(userId, 'gemini_api_key', gemini_api_key);
    }
    
    res.json({
      success: true,
      message: 'Configurações salvas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// ==================== CHAT IA PARA AGENDAMENTOS ====================

// POST /api/barbearia/chat - Chat IA para agendamentos
router.post('/chat', async (req, res) => {
  try {
    const { message, agent_id, gemini_api_key } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Mensagem é obrigatória'
      });
    }

    if (!gemini_api_key) {
      return res.status(400).json({
        success: false,
        error: 'Configure a API Key do Gemini primeiro'
      });
    }

    // Buscar agente
    const agents = await db.agents.findByUserId(userId);
    const agent = agents.find(a => a.id === agent_id);

    if (!agent) {
      return res.status(400).json({
        success: false,
        error: 'Agente não encontrado'
      });
    }

    // Buscar serviços disponíveis
    const servicos = await db.servicos.findByUserId(userId);

    // Buscar agendamentos existentes
    const agendamentosExistentes = await db.agendamentos.findByUserId(userId);

    // Construir prompt contextual
    const systemPrompt = `${agent.system_prompt}

SERVIÇOS DISPONÍVEIS:
${servicos.map(s => `- ${s.nome}: R$ ${s.preco} (${s.duracao} min)`).join('\n')}

HORÁRIOS JÁ OCUPADOS:
${agendamentosExistentes
  .filter(a => a.status !== 'cancelado')
  .map(a => `- ${a.data} às ${a.horario}`)
  .join('\n')}

Para confirmar agendamento, responda no formato JSON:
{
  "acao": "agendar",
  "dados": {
    "cliente": "Nome do Cliente",
    "telefone": "(11) 99999-9999",
    "servico": "Nome do Serviço",
    "data": "2025-01-16",
    "horario": "14:30"
  }
}`;

    // Chamar IA
    const aiResponse = await AIService.callGemini(
      agent.model,
      message,
      systemPrompt,
      agent.temperature,
      agent.max_tokens,
      gemini_api_key
    );

    // Verificar se a resposta contém uma ação de agendamento
    let agendamentoCriado = null;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*"acao":\s*"agendar"[\s\S]*\}/);
      if (jsonMatch) {
        const agendamentoData = JSON.parse(jsonMatch[0]);
        if (agendamentoData.acao === 'agendar' && agendamentoData.dados) {
          // Buscar serviço
          const servico = servicos.find(s => 
            s.nome.toLowerCase().includes(agendamentoData.dados.servico.toLowerCase())
          );

          if (servico) {
            // Criar agendamento automaticamente
            agendamentoCriado = await db.agendamentos.create(userId, {
              cliente: agendamentoData.dados.cliente,
              telefone: agendamentoData.dados.telefone,
              data: agendamentoData.dados.data,
              horario: agendamentoData.dados.horario,
              servico: servico.nome,
              valor: servico.preco,
              status: 'confirmado',
              created_by_ai: true
            });
          }
        }
      }
    } catch (error) {
      console.log('Não foi possível processar agendamento automático:', error.message);
    }

    res.json({
      success: true,
      data: {
        response: aiResponse,
        agendamento_criado: agendamentoCriado
      }
    });

  } catch (error) {
    console.error('Erro no chat IA:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

export default router;