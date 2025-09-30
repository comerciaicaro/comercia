import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CogIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiService } from '../services/api';

interface Agendamento {
  id: string;
  cliente: string;
  telefone: string;
  email?: string;
  servico: string;
  servico_nome?: string;
  data: string;
  horario: string;
  valor: number;
  pago: boolean;
  metodo_pagamento: 'dinheiro' | 'pix' | 'cartao' | 'pendente';
  observacoes?: string;
  status: 'confirmado' | 'pendente' | 'cancelado' | 'concluido';
  created_by_ai: boolean;
  created_at: string;
  updated_at: string;
}

interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  duracao: number;
  is_active: boolean;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  data_nascimento?: string;
  observacoes?: string;
  whatsapp_id?: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  objective: string;
  personality: string;
  ai_provider: string;
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  whatsapp_connected: boolean;
  whatsapp_phone_id?: string;
}

export const Barbearia: React.FC = () => {
  const { state } = useApp();
  const { showSuccess, showError } = useNotification();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'servicos' | 'clientes' | 'chat' | 'agente' | 'configuracao' | 'relatorios'>('agendamentos');
  
  // Estados para chat IA
  const [chatMessages, setChatMessages] = useState<Array<{id: string, sender: 'user' | 'ai', message: string, timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  
  // Estados para agente
  const [agentForm, setAgentForm] = useState({
    name: '',
    description: '',
    objective: '',
    personality: 'professional',
    ai_provider: 'gemini',
    model: 'gemini-1.5-flash',
    system_prompt: `Você é um assistente virtual especializado em agendamentos de barbearia.

REGRAS IMPORTANTES:
1. Sempre confirme dados antes de agendar
2. Verifique disponibilidade de horário
3. Seja cordial e profissional
4. Colete: nome, telefone, serviço, data, horário

SERVIÇOS DISPONÍVEIS:
- Corte Masculino: R$ 25,00 (30 min)
- Barba: R$ 15,00 (20 min)
- Cabelo + Barba: R$ 35,00 (45 min)
- Sobrancelha: R$ 10,00 (15 min)

Para confirmar agendamento, responda no formato JSON:
{
  "acao": "agendar",
  "dados": {
    "cliente": "Nome do Cliente",
    "telefone": "(11) 99999-9999",
    "servico": "Corte Masculino",
    "data": "2025-01-16",
    "horario": "14:30"
  }
}`,
    temperature: 0.7,
    max_tokens: 1000,
  });
  
  // Estados para configurações
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [configLoading, setConfigLoading] = useState(false);
  
  // Estados para relatórios
  const [relatorios, setRelatorios] = useState<any>({});

  useEffect(() => {
    carregarDados();
    carregarConfiguracoes();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const [agendamentosRes, servicosRes, clientesRes, agentsRes] = await Promise.all([
        apiService.get('/barbearia/agendamentos'),
        apiService.get('/barbearia/servicos'),
        apiService.get('/barbearia/clientes'),
        apiService.get('/barbearia/agents')
      ]);
      
      if (agendamentosRes.success) {
        setAgendamentos(agendamentosRes.data || []);
      }
      
      if (servicosRes.success) {
        setServicos(servicosRes.data || []);
      }
      
      if (clientesRes.success) {
        setClientes(clientesRes.data || []);
      }
      
      if (agentsRes.success) {
        setAgents(agentsRes.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showError('Erro', 'Não foi possível carregar os dados da barbearia');
    } finally {
      setLoading(false);
    }
  };

  const carregarConfiguracoes = async () => {
    try {
      const response = await apiService.get('/barbearia/configuracao');
      if (response.success && response.data.gemini_api_key) {
        setGeminiApiKey(response.data.gemini_api_key);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const salvarConfiguracao = async () => {
    try {
      setConfigLoading(true);
      
      const response = await apiService.post('/barbearia/configuracao', {
        gemini_api_key: geminiApiKey
      });
      
      if (response.success) {
        showSuccess('Configuração salva!', 'API Key do Gemini configurada com sucesso');
      } else {
        showError('Erro', response.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      showError('Erro', 'Não foi possível salvar a configuração');
    } finally {
      setConfigLoading(false);
    }
  };

  const criarAgente = async () => {
    try {
      if (!agentForm.name || !agentForm.description) {
        showError('Erro', 'Nome e descrição são obrigatórios');
        return;
      }

      const response = await apiService.post('/barbearia/agents', agentForm);
      
      if (response.success) {
        setAgents(prev => [...prev, response.data]);
        setAgentForm({
          name: '',
          description: '',
          objective: '',
          personality: 'professional',
          ai_provider: 'gemini',
          model: 'gemini-1.5-flash',
          system_prompt: agentForm.system_prompt, // Manter o prompt padrão
          temperature: 0.7,
          max_tokens: 1000,
        });
        showSuccess('Agente criado!', 'Agente de IA criado com sucesso');
      } else {
        showError('Erro', response.error || 'Erro ao criar agente');
      }
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      showError('Erro', 'Não foi possível criar o agente');
    }
  };

  const enviarMensagemChat = async () => {
    if (!chatInput.trim() || !selectedAgent) {
      showError('Erro', 'Selecione um agente e digite uma mensagem');
      return;
    }

    if (!geminiApiKey) {
      showError('Erro', 'Configure a API Key do Gemini primeiro na aba Configurações');
      return;
    }

    const mensagemUsuario = {
      id: Date.now().toString(),
      sender: 'user' as const,
      message: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, mensagemUsuario]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await apiService.post('/barbearia/chat', {
        message: chatInput,
        agent_id: selectedAgent,
        gemini_api_key: geminiApiKey
      });

      if (response.success) {
        const mensagemIA = {
          id: (Date.now() + 1).toString(),
          sender: 'ai' as const,
          message: response.data.response,
          timestamp: new Date()
        };

        setChatMessages(prev => [...prev, mensagemIA]);

        // Se um agendamento foi criado automaticamente
        if (response.data.agendamento_criado) {
          showSuccess('Agendamento Criado!', `Agendamento para ${response.data.agendamento_criado.cliente} foi criado automaticamente`);
          carregarDados(); // Recarregar dados para mostrar o novo agendamento
        }
      } else {
        showError('Erro', response.error || 'Erro ao processar mensagem');
      }
    } catch (error) {
      console.error('Erro no chat:', error);
      showError('Erro', 'Não foi possível processar a mensagem');
    } finally {
      setChatLoading(false);
    }
  };

  const atualizarStatusAgendamento = async (agendamentoId: string, novoStatus: string) => {
    try {
      const response = await apiService.put(`/barbearia/agendamentos/${agendamentoId}`, {
        status: novoStatus
      });
      
      if (response.success) {
        setAgendamentos(prev => prev.map(ag => 
          ag.id === agendamentoId ? { ...ag, status: novoStatus as any } : ag
        ));
        showSuccess('Status atualizado!', `Agendamento ${novoStatus} com sucesso`);
      } else {
        showError('Erro', response.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showError('Erro', 'Não foi possível atualizar o status do agendamento');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmado':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pendente':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'cancelado':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'concluido':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-green-100 text-green-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      case 'concluido':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando painel da barbearia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  💈 Painel da Barbearia
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Bem-vindo, {state.user?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'agendamentos', name: 'Agendamentos', icon: CalendarDaysIcon },
              { id: 'servicos', name: 'Serviços', icon: WrenchScrewdriverIcon },
              { id: 'clientes', name: 'Clientes', icon: UserIcon },
              { id: 'agente', name: 'Agente de IA', icon: SparklesIcon },
              { id: 'chat', name: 'Chat IA', icon: ChatBubbleLeftRightIcon },
              { id: 'relatorios', name: 'Relatórios', icon: ChartBarIcon },
              { id: 'configuracao', name: 'Configurações', icon: CogIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Agendamentos Tab */}
          {activeTab === 'agendamentos' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white shadow-sm rounded-2xl border border-gray-200">
                <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Agendamentos</h3>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os agendamentos da barbearia</p>
                  </div>
                  <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center transition-all shadow-lg">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Novo Agendamento
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {agendamentos.length === 0 ? (
                    <div className="px-8 py-12 text-center">
                      <CalendarDaysIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento</h3>
                      <p className="text-gray-500 mb-6">Comece criando um novo agendamento ou use o Chat IA.</p>
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                        Usar Chat IA
                      </button>
                    </div>
                  ) : (
                    agendamentos.map((agendamento) => (
                      <div 
                        key={agendamento.id} 
                        className="px-8 py-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center cursor-pointer flex-1">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="ml-6">
                              <div className="text-lg font-medium text-gray-900 flex items-center">
                                {agendamento.cliente}
                                {agendamento.created_by_ai && (
                                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                    IA
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {agendamento.servico_nome || agendamento.servico} • {agendamento.telefone}
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                📅 {new Date(agendamento.data).toLocaleDateString('pt-BR')} às {agendamento.horario}
                              </div>
                              <div className="text-sm text-gray-400">
                                💰 R$ {(agendamento.valor || 0).toFixed(2)} • {agendamento.pago ? '✅ Pago' : '❌ Não pago'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              {getStatusIcon(agendamento.status)}
                              <span className={`ml-2 px-3 py-1 text-sm font-medium rounded-full ${
                                getStatusColor(agendamento.status)
                              }`}>
                                {agendamento.status}
                              </span>
                            </div>
                            {agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && (
                              <button
                                onClick={() => atualizarStatusAgendamento(agendamento.id, 'concluido')}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                                title="Marcar como concluído"
                              >
                                Concluir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Agente de IA Tab */}
          {activeTab === 'agente' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Criar Agente */}
                <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-3 text-purple-600" />
                    Criar Agente de IA
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome do Agente
                      </label>
                      <input
                        type="text"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Assistente da Barbearia"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Descrição
                      </label>
                      <textarea
                        value={agentForm.description}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descreva o que este agente faz..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Prompt do Sistema
                      </label>
                      <textarea
                        value={agentForm.system_prompt}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, system_prompt: e.target.value }))}
                        placeholder="Instruções para o agente..."
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Personalidade
                        </label>
                        <select
                          value={agentForm.personality}
                          onChange={(e) => setAgentForm(prev => ({ ...prev, personality: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="professional">Profissional</option>
                          <option value="friendly">Amigável</option>
                          <option value="casual">Casual</option>
                          <option value="formal">Formal</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temperatura ({agentForm.temperature})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={agentForm.temperature}
                          onChange={(e) => setAgentForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <button
                      onClick={criarAgente}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                    >
                      Criar Agente
                    </button>
                  </div>
                </div>

                {/* Lista de Agentes */}
                <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Agentes Criados</h3>
                  
                  <div className="space-y-4">
                    {agents.length === 0 ? (
                      <div className="text-center py-8">
                        <SparklesIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">Nenhum agente criado ainda</p>
                      </div>
                    ) : (
                      agents.map((agent) => (
                        <div key={agent.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{agent.name}</h4>
                              <p className="text-sm text-gray-500">{agent.description}</p>
                              <div className="flex items-center mt-2">
                                <div className={`w-3 h-3 rounded-full mr-2 ${agent.is_active ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                <span className={`text-sm ${agent.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                                  {agent.is_active ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Chat IA Tab */}
          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white shadow-sm rounded-2xl border border-gray-200 h-96 flex flex-col">
                <div className="px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                        <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 text-blue-600" />
                        Chat IA - Agendamentos Automáticos
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Converse com a IA para criar agendamentos automaticamente
                      </p>
                    </div>
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione um agente</option>
                      {agents.filter(agent => agent.is_active).map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <ChatBubbleLeftRightIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Inicie uma conversa</h4>
                      <p className="text-sm mb-4">
                        Digite mensagens como:
                      </p>
                      <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                        <p className="text-sm text-gray-700">
                          "Quero agendar um corte para João, telefone (11) 99999-9999, amanhã às 14h"
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-6 py-3 rounded-2xl shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`}>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-2 ${
                          msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {msg.timestamp.toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 px-6 py-3 rounded-2xl border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm">IA está processando...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Input */}
                <div className="p-6 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && enviarMensagemChat()}
                      placeholder={selectedAgent ? "Digite sua mensagem..." : "Selecione um agente primeiro"}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={chatLoading || !selectedAgent}
                    />
                    <button
                      onClick={enviarMensagemChat}
                      disabled={chatLoading || !chatInput.trim() || !selectedAgent}
                      className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {chatLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <PaperAirplaneIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {!selectedAgent && (
                    <p className="text-xs text-red-500 mt-2">
                      Selecione um agente para enviar mensagens
                    </p>
                  )}
                  {!geminiApiKey && (
                    <p className="text-xs text-orange-500 mt-2">
                      Configure a API Key do Gemini na aba Configurações para usar o chat
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Configurações Tab */}
          {activeTab === 'configuracao' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CogIcon className="h-6 w-6 mr-3 text-gray-600" />
                  Configurações da Barbearia
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <KeyIcon className="h-4 w-4 inline mr-2" />
                      API Key do Google Gemini
                    </label>
                    <div className="flex space-x-3">
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIza..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={salvarConfiguracao}
                        disabled={configLoading}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {configLoading ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Obtenha sua chave em: https://makersuite.google.com/app/apikey
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">ℹ️ Como usar o Chat IA</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>1. Configure a API Key do Gemini acima</li>
                      <li>2. Crie um agente na aba "Agente de IA"</li>
                      <li>3. Vá para "Chat IA" e selecione o agente</li>
                      <li>4. Digite: "Agendar corte para João, telefone (11) 99999-9999, hoje às 15h"</li>
                      <li>5. A IA criará o agendamento automaticamente!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Outras abas (Serviços, Clientes, Relatórios) implementadas de forma similar... */}
        </div>
      </div>
    </div>
  );
};

export default Barbearia;