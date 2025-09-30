import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

import { testConnection } from './config/supabase.js';
import { 
  sanitizeInput, 
  errorHandler, 
  notFoundHandler 
} from './middleware/validation.js';

// Import routes
import authRoutes from './routes/auth.js';
import agentRoutes from './routes/agents.js';
import conversationRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';
import barbeariaRoutes from './routes/barbearia.js';
import adminRoutes from './routes/admin.js';
import configRoutes from './routes/config.js';

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Input sanitization
app.use(sanitizeInput);

// Trust proxy
app.set('trust proxy', 1);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/barbearia', barbeariaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    database: 'Supabase PostgreSQL'
  });
});

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`Cliente ${socket.id} entrou na sala ${room}`);
  });

  socket.on('send_message', async (data) => {
    try {
      // Processar mensagem e resposta da IA aqui
      io.to(data.conversationId).emit('new_message', data);
    } catch (error) {
      socket.emit('error', { message: 'Erro ao processar mensagem' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Start server
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.log('⚠️  Iniciando servidor sem conexão com Supabase');
      console.log('📝 Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
    }
    
    server.listen(PORT, () => {
      console.log('\n🚀 ===================================');
      console.log(`🚀 Sistema Dinâmica SaaS v2.0`);
      console.log(`🚀 Porta: ${PORT}`);
      console.log(`🚀 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 Database: Supabase PostgreSQL`);
      console.log(`🚀 ===================================`);
      console.log(`🔗 API: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend: http://localhost:5173`);
      console.log('🚀 ===================================\n');
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

export { app, server, io };