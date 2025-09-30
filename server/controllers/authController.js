import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../config/supabase.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const authController = {
  async register(req, res) {
    try {
      const { name, email, password, company, phone, role } = req.body;

      // Verificar se email já existe
      const existingUser = await db.users.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email já está em uso'
        });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 12);

      // Criar usuário
      const user = await db.users.create({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'user',
        plan: 'free',
        company,
        phone,
        is_active: true,
        email_verified: true
      });

      // Gerar token
      const token = generateToken(user.id);

      // Remover senha do retorno
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
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await db.users.findByEmail(email);
      
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

      // Atualizar último login
      await db.users.update(user.id, { last_login: new Date() });

      const token = generateToken(user.id);

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
  },

  async getProfile(req, res) {
    try {
      const user = await db.users.findById(req.userId);
      if (!user) {
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
  },

  async updateProfile(req, res) {
    try {
      const updates = req.body;
      const userId = req.userId;

      // Se está atualizando senha, fazer hash
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }

      const updatedUser = await db.users.update(userId, updates);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.userId;

      const user = await db.users.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          error: 'Senha atual incorreta'
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await db.users.update(userId, { password: hashedPassword });

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  },

  async refreshToken(req, res) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token é obrigatório'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await db.users.findById(decoded.userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      const newToken = generateToken(user.id);

      res.json({
        success: true,
        token: newToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token inválido ou expirado'
        });
      }
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
};

export default authController;