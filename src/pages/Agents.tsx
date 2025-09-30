import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiService } from '../services/api';

interface AgentFormData {
  name: string;
  description: string;
  objective: string;
  personality: 'formal' | 'casual' | 'friendly' | 'professional';
  ai_provider: 'chatgpt' | 'gemini' | 'huggingface';
  model: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
}

interface AgentFormErrors {
  name?: string;
  description?: string;
  objective?: string;
  ai_provider?: string;
  model?: string;
  system_prompt?: string;
  temperature?: string;
  max_tokens?: string;
  general?: string;
}

export const Agents: React.FC = () => {
  const { state, dispatch } = useApp();
  const { showSuccess, showError } = useNotification();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    objective: '',
    personality: 'professional',
    ai_provider: 'chatgpt',
    model: 'gpt-3.5-turbo',
    system_prompt: '',
    temperature: 0.7,
    max_tokens: 1000,
  });
  const [editFormData, setEditFormData] = useState<AgentFormData>({
    name: '',
    description: '',
    objective: '',
    personality: 'professional',
    ai_provider: 'chatgpt',
    model: 'gpt-3.5-turbo',
    system_prompt: '',
    temperature: 0.7,
    max_tokens: 1000,
  });
  const [formErrors, setFormErrors] = useState<AgentFormErrors>({});

  useEffect(() => {
    const loadAgents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiService.getAgents();
        
        if (response.success) {
          dispatch({ type: 'SET_AGENTS', payload: response.data.agents || [] });
        } else {
          throw new Error(response.error || 'Erro ao carregar agentes');
        }
      } catch (error) {
        console.error('Erro ao carregar agentes:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar agentes';
        setError(errorMessage);
        showError('Erro ao carregar agentes', errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadAgents();
  }, [dispatch, showError]);

  const validateForm = (): boolean => {
    const errors: AgentFormErrors = {};

    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 2) {
      errors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (!formData.description.trim()) {
      errors.description = 'Descrição é obrigatória';
    } else if (formData.description.length < 10) {
      errors.description = 'Descrição deve ter pelo menos 10 caracteres';
    }

    if (!formData.objective.trim()) {
      errors.objective = 'Objetivo é obrigatório';
    }

    if (!formData.model.trim()) {
      errors.model = 'Modelo é obrigatório';
    }

    if (!formData.system_prompt.trim()) {
      errors.system_prompt = 'Prompt do sistema é obrigatório';
    }

    if (formData.temperature < 0 || formData.temperature > 2) {
      errors.temperature = 'Temperatura deve estar entre 0 e 2';
    }

    if (formData.max_tokens < 100 || formData.max_tokens > 4000) {
      errors.max_tokens = 'Tokens máximos devem estar entre 100 e 4000';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof AgentFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      if (field === 'ai_provider') {
        switch (value) {
          case 'gemini':
            newData.model = 'gemini-1.5-flash';
            break;
          case 'chatgpt':
            newData.model = 'gpt-3.5-turbo';
            break;
          case 'huggingface':
            newData.model = 'microsoft/DialoGPT-large';
            break;
        }
      }
      
      return newData;
    });
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      objective: '',
      personality: 'professional',
      ai_provider: 'chatgpt',
      model: 'gpt-3.5-turbo',
      system_prompt: '',
      temperature: 0.7,
      max_tokens: 1000,
    });
    setFormErrors({});
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setCreateLoading(true);
      setFormErrors({});
      
      const response = await apiService.createAgent(formData);
      
      if (response.success) {
        dispatch({ type: 'ADD_AGENT', payload: response.data.agent });
        showSuccess('Agente criado!', `${response.data.agent.name} foi criado com sucesso`);
        setShowCreateModal(false);
        resetForm();
      } else {
        throw new Error(response.error || 'Erro ao criar agente');
      }
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar agente';
      setFormErrors({ general: errorMessage });
      showError('Erro ao criar agente', errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    const agent = state.agents.find(a => a.id === agentId);
    if (!window.confirm(`Tem certeza que deseja excluir o agente "${agent?.name}"?`)) {
      return;
    }

    setActionLoading(agentId);
    try {
      const response = await apiService.deleteAgent(agentId);
      
      if (response.success) {
        dispatch({ type: 'DELETE_AGENT', payload: agentId });
        showSuccess('Agente excluído!', `${agent?.name} foi excluído com sucesso`);
      } else {
        throw new Error(response.error || 'Erro ao excluir agente');
      }
    } catch (error) {
      console.error('Erro ao excluir agente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir agente';
      showError('Erro ao excluir agente', errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleView = (agent: any) => {
    setSelectedAgent(agent);
    setShowViewModal(true);
  };

  const handleEdit = (agent: any) => {
    setSelectedAgent(agent);
    setEditFormData({
      name: agent.name || '',
      description: agent.description || '',
      objective: agent.objective || '',
      personality: agent.personality || 'professional',
      ai_provider: agent.ai_provider || 'chatgpt',
      model: agent.model || 'gpt-3.5-turbo',
      system_prompt: agent.system_prompt || '',
      temperature: agent.temperature || 0.7,
      max_tokens: agent.max_tokens || 1000,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    setEditLoading(true);
    try {
      const response = await apiService.updateAgent(selectedAgent.id, editFormData);
      if (response.success) {
        dispatch({ type: 'UPDATE_AGENT', payload: response.data.agent });
        setShowEditModal(false);
        setSelectedAgent(null);
        showSuccess('Agente atualizado com sucesso!');
      } else {
        throw new Error(response.error || 'Erro ao atualizar agente');
      }
    } catch (error) {
      console.error('Erro ao atualizar agente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar agente';
      showError('Erro ao atualizar agente', errorMessage);
    } finally {
      setEditLoading(false);
    }
  };

  const toggleAgentStatus = async (agentId: string) => {
    try {
      setActionLoading(agentId);
      const agent = state.agents.find(a => a.id === agentId);
      if (agent) {
        const response = await apiService.updateAgent(agentId, { 
          is_active: !agent.is_active 
        });
        
        if (response.success) {
          dispatch({ type: 'UPDATE_AGENT', payload: response.data.agent });
          showSuccess(
            `Agente ${response.data.agent.is_active ? 'ativado' : 'desativado'}!`,
            `${response.data.agent.name} foi ${response.data.agent.is_active ? 'ativado' : 'desativado'} com sucesso`
          );
        } else {
          throw new Error(response.error || 'Erro ao atualizar agente');
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status do agente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar agente';
      showError('Erro ao atualizar status', errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'chatgpt': return 'bg-green-100 text-green-800';
      case 'gemini': return 'bg-blue-100 text-blue-800';
      case 'huggingface': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPersonalityIcon = (personality: string) => {
    switch (personality) {
      case 'formal': return '🎩';
      case 'casual': return '😊';
      case 'friendly': return '🤝';
      case 'professional': return '💼';
      default: return '🤖';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agentes de IA</h1>
          <p className="text-gray-600">Gerencie seus agentes de atendimento inteligentes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Novo Agente
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Carregando agentes...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Agentes</p>
              <p className="text-2xl font-bold text-gray-900">{state.agents.length}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Agentes Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {Array.isArray(state.agents) ? state.agents.filter(a => a.is_active).length : 0}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <PlayIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversas Hoje</p>
              <p className="text-2xl font-bold text-purple-600">
                {Array.isArray(state.agents) ? state.agents.reduce((sum, agent) => sum + (agent.total_conversations || 0), 0) : 0}
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Satisfação Média</p>
              <p className="text-2xl font-bold text-yellow-600">
                {Array.isArray(state.agents) && state.agents.length > 0 
                  ? (state.agents.reduce((sum, agent) => sum + (agent.avg_satisfaction || 0), 0) / state.agents.length).toFixed(1)
                  : '0.0'
                }
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {state.agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
          >
            {/* Agent Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getPersonalityIcon(agent.personality)}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-500">{agent.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleAgentStatus(agent.id)}
                  disabled={actionLoading === agent.id}
                  className={`p-2 rounded-lg transition-colors ${
                    actionLoading === agent.id
                      ? 'text-gray-400 cursor-not-allowed'
                      : agent.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {actionLoading === agent.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  ) : agent.is_active ? (
                    <PauseIcon className="w-4 h-4" />
                  ) : (
                    <PlayIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className={`text-sm font-medium ${agent.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                  {agent.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getProviderColor(agent.ai_provider)}`}>
                {agent.ai_provider.toUpperCase()}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-gray-900">{agent.total_conversations || 0}</p>
                <p className="text-xs text-gray-500">Conversas</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-gray-900">{agent.avg_satisfaction?.toFixed(1) || '0.0'}</p>
                <p className="text-xs text-gray-500">Satisfação</p>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tempo de Resposta</span>
                <span className="font-medium">{typeof agent.avg_response_time === 'number' ? agent.avg_response_time.toFixed(1) : '0.0'}s</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Conversas Ativas</span>
                <span className="font-medium">{agent.active_conversations || 0}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleView(agent)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleEdit(agent)}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(agent.id)}
                  disabled={actionLoading === agent.id}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === agent.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                  ) : (
                    <TrashIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="text-xs text-gray-500">
                {agent.ai_provider}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {!loading && state.agents.length === 0 && (
        <div className="text-center py-12">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum agente criado</h3>
          <p className="mt-1 text-sm text-gray-500">Comece criando seu primeiro agente de IA.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Novo Agente
            </button>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Criar Novo Agente</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {formErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700 text-sm">{formErrors.general}</span>
                </div>
              )}

              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Agente *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Assistente de Vendas"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Descreva brevemente o que este agente faz..."
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objetivo *
                  </label>
                  <textarea
                    value={formData.objective}
                    onChange={(e) => handleInputChange('objective', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.objective ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Qual é o objetivo principal deste agente?"
                  />
                  {formErrors.objective && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.objective}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Personalidade
                    </label>
                    <select
                      value={formData.personality}
                      onChange={(e) => handleInputChange('personality', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="professional">Profissional</option>
                      <option value="friendly">Amigável</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provedor de IA
                    </label>
                    <select
                      value={formData.ai_provider}
                      onChange={(e) => handleInputChange('ai_provider', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="chatgpt">ChatGPT</option>
                      <option value="gemini">Gemini</option>
                      <option value="huggingface">Hugging Face</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo *
                  </label>
                  {formData.ai_provider === 'gemini' ? (
                    <select
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.model ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="gemini-1.5-flash">gemini-1.5-flash (Recomendado)</option>
                      <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    </select>
                  ) : formData.ai_provider === 'chatgpt' ? (
                    <select
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.model ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                      <option value="gpt-4">gpt-4</option>
                      <option value="gpt-4-turbo">gpt-4-turbo</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.model ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ex: microsoft/DialoGPT-large"
                    />
                  )}
                  {formErrors.model && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.model}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt do Sistema *
                  </label>
                  <textarea
                    value={formData.system_prompt}
                    onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.system_prompt ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Instruções detalhadas sobre como o agente deve se comportar..."
                  />
                  {formErrors.system_prompt && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.system_prompt}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperatura ({formData.temperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Conservador</span>
                      <span>Criativo</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="4000"
                      value={formData.max_tokens}
                      onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formErrors.max_tokens ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.max_tokens && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.max_tokens}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={createLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {createLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Criando...
                      </>
                    ) : (
                      'Criar Agente'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};