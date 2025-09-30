import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  StarIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../contexts/AppContext';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { MetricsChart } from '../components/Dashboard/MetricsChart';
import { apiService } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

export const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const { showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Carregar dados reais do backend
        const [agentStats, conversationStats, agents, conversations] = await Promise.all([
          apiService.getAgentStats().catch(() => ({ success: false, data: { stats: { total: 0, active: 0 } } })),
          apiService.getConversationStats().catch(() => ({ success: false, data: { stats: { total: 0, active: 0, avgSatisfaction: 0, avgResponseTime: 0 } } })),
          apiService.getAgents().catch(() => ({ success: false, data: { agents: [] } })),
          apiService.getConversations({ limit: 10 }).catch(() => ({ success: false, data: { conversations: [] } }))
        ]);
        
        // Construir estatísticas do dashboard com dados reais
        const dashboardStats = {
          overview: {
            totalAgents: agentStats.data?.stats?.total || 0,
            activeAgents: agentStats.data?.stats?.active || 0,
            totalConversations: conversationStats.data?.stats?.total || 0,
            activeConversations: conversationStats.data?.stats?.active || 0,
            avgSatisfaction: conversationStats.data?.stats?.avgSatisfaction || 0,
            avgResponseTime: conversationStats.data?.stats?.avgResponseTime || 0
          },
          trends: {
            dailyConversations: conversationStats.data?.stats?.dailyConversations || [],
            dailyAgents: agentStats.data?.stats?.dailyCreated || []
          }
        };
        
        // Atualizar estado global com dados reais
        dispatch({ type: 'SET_DASHBOARD_STATS', payload: dashboardStats });
        dispatch({ type: 'SET_AGENTS', payload: agents.data?.agents || [] });
        dispatch({ type: 'SET_CONVERSATIONS', payload: conversations.data?.conversations || [] });
        
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados do dashboard';
        setError(errorMessage);
        showError('Erro no Dashboard', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [dispatch, showError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const stats = state.dashboardStats;

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-purple-50 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Visão geral da sua plataforma de agentes de IA</p>
        </div>
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          <span className="text-sm text-gray-500">Sistema Dinâmica v2.0</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Agentes"
          value={stats?.overview?.totalAgents || 0}
          change={`${stats?.overview?.activeAgents || 0} ativos`}
          changeType="positive"
          icon={UserGroupIcon}
          color="blue"
        />
        <StatsCard
          title="Conversas Ativas"
          value={stats?.overview?.activeConversations || 0}
          change={`${stats?.overview?.totalConversations || 0} total`}
          changeType="positive"
          icon={ChatBubbleLeftRightIcon}
          color="green"
        />
        <StatsCard
          title="Tempo Médio de Resposta"
          value={`${stats?.overview?.avgResponseTime?.toFixed(1) || '0.0'}s`}
          change="Últimos 7 dias"
          changeType="neutral"
          icon={ClockIcon}
          color="yellow"
        />
        <StatsCard
          title="Satisfação Média"
          value={stats?.overview?.avgSatisfaction?.toFixed(1) || '0.0'}
          change="Avaliação geral"
          changeType="neutral"
          icon={StarIcon}
          color="purple"
        />
      </div>

      {/* Charts */}
      {stats?.trends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricsChart
            data={stats.trends.dailyConversations}
            title="Conversas por Dia"
            dataKey="count"
            color="#3B82F6"
            type="area"
          />
          <MetricsChart
            data={stats.trends.dailyAgents}
            title="Novos Agentes por Dia"
            dataKey="count"
            color="#10B981"
            type="line"
          />
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Agents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
            Agentes Mais Ativos
          </h3>
          <div className="space-y-4">
            {Array.isArray(state.agents) && state.agents.length > 0 ? (
              state.agents.slice(0, 3).map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${agent.is_active ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{agent.name}</p>
                      <p className="text-sm text-gray-500">{agent.total_conversations || 0} conversas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{agent.avg_satisfaction?.toFixed(1) || '0.0'}</p>
                    <p className="text-xs text-gray-500">satisfação</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhum agente encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Crie seu primeiro agente para começar</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Conversations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-green-600" />
            Conversas Recentes
          </h3>
          <div className="space-y-4">
            {Array.isArray(state.conversations) && state.conversations.length > 0 ? (
              state.conversations.slice(0, 3).map((conversation) => (
                <div key={conversation.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      conversation.status === 'active' ? 'bg-green-400' : 
                      conversation.status === 'resolved' ? 'bg-blue-400' : 'bg-yellow-400'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{conversation.customer_name || 'Cliente'}</p>
                      <p className="text-sm text-gray-500">{conversation.agent_name || 'Sem agente'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{conversation.message_count || 0}</p>
                    <p className="text-xs text-gray-500">mensagens</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Nenhuma conversa encontrada</p>
                <p className="text-sm text-gray-400 mt-1">As conversas aparecerão aqui quando iniciadas</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg">
            <UserGroupIcon className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Criar Agente</span>
          </button>
          <button className="p-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all shadow-lg">
            <ChatBubbleLeftRightIcon className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Nova Conversa</span>
          </button>
          <button className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg">
            <CogIcon className="h-6 w-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Configurações</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;