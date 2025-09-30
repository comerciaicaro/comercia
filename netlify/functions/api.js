import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const app = express();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

app.use(helmet());
app.use(cors());
app.use(express.json());

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ success: false, error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
};

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, company, phone, role } = req.body;

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email já está em uso'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'user',
        plan: 'free',
        company,
        phone,
        is_active: true,
        email_verified: true
      })
      .select()
      .single();

    if (error) throw error;

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Conta desativada'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

app.get('/agents', authMiddleware, async (req, res) => {
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: agents || []
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar agentes'
    });
  }
});

app.post('/agents', authMiddleware, async (req, res) => {
  try {
    const agentData = {
      ...req.body,
      user_id: req.userId
    };

    const { data: agent, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Agente criado com sucesso',
      data: agent
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar agente'
    });
  }
});

app.put('/agents/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: agent, error } = await supabase
      .from('agents')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Agente atualizado com sucesso',
      data: agent
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar agente'
    });
  }
});

app.delete('/agents/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Agente excluído com sucesso'
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao excluir agente'
    });
  }
});

app.get('/conversations', authMiddleware, async (req, res) => {
  try {
    let query = supabase
      .from('conversations')
      .select('*, agents(name)')
      .eq('user_id', req.userId);

    if (req.query.status) {
      query = query.eq('status', req.query.status);
    }

    if (req.query.agent_id) {
      query = query.eq('agent_id', req.query.agent_id);
    }

    const { data: conversations, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: conversations || []
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar conversas'
    });
  }
});

app.post('/chat/send', authMiddleware, async (req, res) => {
  try {
    const { conversationId, message, agentId } = req.body;

    const { data: messageData, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: messageData
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao enviar mensagem'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

export const handler = serverless(app);
