-- =====================================================
-- SETUP COMPLETO DO BANCO SUPABASE PARA SISTEMA DINÂMICA
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- FUNÇÃO AUXILIAR: UPDATE updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO AUXILIAR: UID DO JWT
-- =====================================================
CREATE OR REPLACE FUNCTION uid() RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')
  )::uuid;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- TABELA USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'barbearia')),
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium', 'enterprise')),
  company VARCHAR(255),
  phone VARCHAR(20),
  avatar TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- RLS e Políticas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (uid() = id);
DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (uid() = id);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABELA AGENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  objective TEXT,
  personality VARCHAR(20) DEFAULT 'professional' CHECK (personality IN ('formal', 'casual', 'friendly', 'professional')),
  ai_provider VARCHAR(20) NOT NULL CHECK (ai_provider IN ('chatgpt', 'gemini', 'huggingface')),
  model VARCHAR(100) NOT NULL,
  system_prompt TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  whatsapp_connected BOOLEAN DEFAULT false,
  whatsapp_phone_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);

-- RLS
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own agents" ON agents;
CREATE POLICY "Users can manage own agents" ON agents
  FOR ALL USING (user_id = uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABELA CONVERSATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  whatsapp_chat_id VARCHAR(255),
  channel_type VARCHAR(20) DEFAULT 'chat' CHECK (channel_type IN ('whatsapp','telegram','web','api','chat')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','resolved','pending','closed')),
  priority INTEGER DEFAULT 1,
  satisfaction_rating DECIMAL(2,1),
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  resolution_time INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp ON conversations(whatsapp_chat_id);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;
CREATE POLICY "Users can manage own conversations" ON conversations
  FOR ALL USING (user_id = uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABELA MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender VARCHAR(10) NOT NULL CHECK (sender IN ('user','agent')),
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text','image','audio','document','video')),
  media_url TEXT,
  whatsapp_message_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent','delivered','read','failed')),
  response_time DECIMAL(8,2),
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access messages from own conversations" ON messages;
CREATE POLICY "Users can access messages from own conversations" ON messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = uid()
    )
  );

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABELA WHATSAPP_CONFIGS
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  phone_number_id VARCHAR(255) NOT NULL,
  webhook_verify_token VARCHAR(255),
  business_account_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_user ON whatsapp_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone ON whatsapp_configs(phone_number_id);

-- RLS
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own whatsapp configs" ON whatsapp_configs;
CREATE POLICY "Users can manage own whatsapp configs" ON whatsapp_configs
  FOR ALL USING (user_id = uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_whatsapp_configs_updated_at ON whatsapp_configs;
CREATE TRIGGER update_whatsapp_configs_updated_at
  BEFORE UPDATE ON whatsapp_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABELA GLOBAL_CONFIGS
-- =====================================================
CREATE TABLE IF NOT EXISTS global_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_global_configs_key ON global_configs(config_key);

-- RLS
ALTER TABLE global_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only admins can manage global configs" ON global_configs;
CREATE POLICY "Only admins can manage global configs" ON global_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = uid() AND role = 'admin'
    )
  );

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_global_configs_updated_at ON global_configs;
CREATE TRIGGER update_global_configs_updated_at
  BEFORE UPDATE ON global_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MÓDULO BARBEARIA: AGENDAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cliente VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  data DATE NOT NULL,
  horario TIME NOT NULL,
  servico VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) DEFAULT 0.00,
  pago BOOLEAN DEFAULT false,
  metodo_pagamento VARCHAR(20) DEFAULT 'pendente' CHECK (metodo_pagamento IN ('dinheiro','pix','cartao','pendente')),
  observacoes TEXT,
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('confirmado','pendente','cancelado','concluido')),
  created_by_ai BOOLEAN DEFAULT false,
  whatsapp_message_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_user ON agendamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);

-- RLS
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own agendamentos" ON agendamentos;
CREATE POLICY "Users can manage own agendamentos" ON agendamentos
  FOR ALL USING (user_id = uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON agendamentos;
CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MÓDULO BARBEARIA: SERVIÇOS
-- =====================================================
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  duracao INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicos_user ON servicos(user_id);
CREATE INDEX IF NOT EXISTS idx_servicos_active ON servicos(is_active);

-- RLS
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own servicos" ON servicos;
CREATE POLICY "Users can manage own servicos" ON servicos
  FOR ALL USING (user_id = uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_servicos_updated_at ON servicos;
CREATE TRIGGER update_servicos_updated_at
  BEFORE UPDATE ON servicos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MÓDULO BARBEARIA: CLIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),
  data_nascimento DATE,
  observacoes TEXT,
  whatsapp_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_user ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_whatsapp ON clientes(whatsapp_id);

-- RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own clientes" ON clientes;
CREATE POLICY "Users can manage own clientes" ON clientes
  FOR ALL USING (user_id = uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CONFIGURAÇÕES DO USUÁRIO
-- =====================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chave VARCHAR(100) NOT NULL,
  valor TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, chave)
);

CREATE INDEX IF NOT EXISTS idx_config_user ON configuracoes(user_id);

-- RLS
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own configs" ON configuracoes;
CREATE POLICY "Users can manage own configs" ON configuracoes
  FOR ALL USING (user_id = uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON configuracoes;
CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
