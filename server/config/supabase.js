import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('✅ Supabase configurado com sucesso');
} else {
  console.log('⚠️  Supabase não configurado - usando dados locais');
}

// Função para testar conexão
export const testConnection = async () => {
  if (!supabase) {
    console.log('⚠️  Supabase não configurado');
    return false;
  }

  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro de conexão Supabase:', error.message);
      return false;
    }
    
    console.log('✅ Supabase conectado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão Supabase:', error.message);
    return false;
  }
};

// Operações do banco de dados
export const db = {
  // Usuários
  users: {
    async create(userData) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async findByEmail(email) {
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    
    async findById(id) {
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async update(id, updates) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async getAll(limit = 50, offset = 0, filters = {}) {
      if (!supabase) return [];
      
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      
      const { data, error } = await query.range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data || [];
    },
    
    async delete(id) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    }
  },
  
  // Agentes
  agents: {
    async create(agentData) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async findByUserId(userId) {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    
    async update(id, updates) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async delete(id) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    }
  },
  
  // Conversas
  conversations: {
    async create(conversationData) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async findByUserId(userId, filters = {}) {
      if (!supabase) return [];
      
      let query = supabase
        .from('conversations')
        .select(`
          *,
          agents(name)
        `)
        .eq('user_id', userId);
      
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.agent_id) query = query.eq('agent_id', filters.agent_id);
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  },
  
  // Mensagens
  messages: {
    async create(messageData) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async findByConversationId(conversationId) {
      if (!supabase) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  },
  
  // Agendamentos (Barbearia)
  agendamentos: {
    async create(agendamentoData) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('agendamentos')
        .insert(agendamentoData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async findByUserId(userId, filters = {}) {
      if (!supabase) return [];
      
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('user_id', userId);
      
      if (filters.data) query = query.eq('data', filters.data);
      if (filters.status) query = query.eq('status', filters.status);
      
      const { data, error } = await query.order('data', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    
    async update(id, updates) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('agendamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },
  
  // Configurações
  configs: {
    async get(userId, configKey) {
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('user_id', userId)
        .eq('chave', configKey)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.valor;
    },
    
    async set(userId, configKey, configValue) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('configuracoes')
        .upsert({ 
          user_id: userId, 
          chave: configKey, 
          valor: configValue 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  },
  
  // Configurações globais
  globalConfigs: {
    async get(configKey) {
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('global_configs')
        .select('config_value')
        .eq('config_key', configKey)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data?.config_value;
    },
    
    async set(configKey, configValue) {
      if (!supabase) throw new Error('Supabase não configurado');
      
      const { data, error } = await supabase
        .from('global_configs')
        .upsert({ 
          config_key: configKey, 
          config_value: configValue,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async getAll() {
      if (!supabase) return {};
      
      const { data, error } = await supabase
        .from('global_configs')
        .select('config_key, config_value')
        .eq('is_active', true);
      
      if (error) throw error;
      
      const configs = {};
      (data || []).forEach(config => {
        configs[config.config_key] = config.config_value;
      });
      
      return configs;
    }
  }
};

export { supabase };