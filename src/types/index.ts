// Tipos principais da aplicação
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  company?: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  phone?: string;
  avatar?: string;
  is_active: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  objective: string;
  personality: 'formal' | 'casual' | 'friendly' | 'professional';
  ai_provider: 'chatgpt' | 'gemini' | 'huggingface';
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  total_conversations?: number;
  active_conversations?: number;
  avg_response_time?: number;
  avg_satisfaction?: number;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  channel_type: 'whatsapp' | 'telegram' | 'web' | 'api';
  status: 'active' | 'resolved' | 'pending' | 'closed';
  priority: number;
  satisfaction_rating?: number;
  start_time: string;
  end_time?: string;
  resolution_time?: number;
  agent_name?: string;
  message_count?: number;
  last_message_time?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender: 'user' | 'agent';
  message_type: 'text' | 'image' | 'audio' | 'document' | 'video';
  media_url?: string;
  whatsapp_message_id?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  response_time?: number;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface AIProvider {
  id: string;
  name: string;
  type: 'chatgpt' | 'gemini' | 'huggingface';
  models: string[];
  isConfigured: boolean;
  apiKey?: string;
  config?: Record<string, any>;
}

export interface DashboardStats {
  overview: {
    totalAgents: number;
    activeAgents: number;
    totalConversations: number;
    activeConversations: number;
    avgSatisfaction: number;
    avgResponseTime: number;
  };
  trends: {
    dailyConversations: TrendData[];
    dailyAgents: TrendData[];
  };
}

export interface TrendData {
  date: string;
  count: number;
}

export interface AdminDashboardStats {
  users: {
    total_users: number;
    active_users: number;
    new_users_30d: number;
    active_users_7d: number;
    admin_users: number;
  };
  system: {
    total_clients: number;
    active_clients: number;
    active_databases: number;
    actions_24h: number;
  };
  aggregated: {
    total_agents: number;
    total_conversations: number;
    total_messages: number;
    avg_satisfaction: number;
  };
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_values?: any;
  new_values?: any;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id?: string;
  user_name?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message?: string;
  is_read: boolean;
  is_resolved: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}