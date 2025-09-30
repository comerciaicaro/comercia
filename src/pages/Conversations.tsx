import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  UserIcon,
  ClockIcon,
  StarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiService } from '../services/api';

interface Conversation {
  id: string;
  agent_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  channel_type: string;
  status: string;
  priority: number;
  satisfaction_rating?: number;
  start_time: string;
  end_time?: string;
  agent_name?: string;
  message_count?: number;
  last_message_time?: string;
}

export const Conversations: React.FC = () => {
  const { state } = useApp();
  const { showError } = useNotification();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    channel_type: '',
    agent_id: '',
    search: ''
  });

  useEffect(() => {
    loadConversations();
  }, [filters]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getConversations(filters);
      
      if (response.success) {
        setConversations(response.data.conversations || []);
      } else {
        throw new Error(response.error || 'Erro ao carregar conversas');
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      showError('Erro', 'Não foi possível carregar as conversas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return '📱';
      case 'telegram': return '✈️';
      case 'web': return '🌐';
      case 'chat': return '💬';
      default: return '📞';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversas</h1>
          <p className="text-gray-600">Gerencie todas as conversas dos seus agentes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Nome, email ou telefone..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="resolved">Resolvido</option>
              <option value="pending">Pendente</option>
              <option value="closed">Fechado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Canal
            </label>
            <select
              value={filters.channel_type}
              onChange={(e) => setFilters(prev => ({ ...prev, channel_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os canais</option>
              <option value="chat">Chat</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="web">Web</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agente
            </label>
            <select
              value={filters.agent_id}
              onChange={(e) => setFilters(prev => ({ ...prev, agent_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos os agentes</option>
              {state.agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Carregando conversas...</span>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma conversa encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            As conversas aparecerão aqui quando os clientes interagirem com seus agentes.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation, index) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg">{getChannelIcon(conversation.channel_type)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {conversation.customer_name || 'Cliente Anônimo'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{conversation.customer_email || conversation.customer_phone || 'Sem contato'}</span>
                        <span>•</span>
                        <span>{conversation.agent_name || 'Sem agente'}</span>
                        <span>•</span>
                        <span>{conversation.message_count || 0} mensagens</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {conversation.satisfaction_rating && (
                      <div className="flex items-center space-x-1">
                        <StarIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-gray-600">
                          {conversation.satisfaction_rating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.status)}`}>
                      {conversation.status}
                    </span>

                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {formatDate(conversation.start_time)}
                      </p>
                      {conversation.last_message_time && (
                        <p className="text-xs text-gray-500">
                          Última: {formatDate(conversation.last_message_time)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Conversations;