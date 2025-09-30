import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserGroupIcon,
  CogIcon,
  ChartBarIcon,
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useNotification } from '../contexts/NotificationContext';
import { apiService } from '../services/api';

interface GlobalConfig {
  openai_api_key: string;
  gemini_api_key: string;
  huggingface_api_key: string;
  system_name: string;
  max_agents_per_user: string;
  max_whatsapp_per_user: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  company?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export const Admin: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'configs' | 'system'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [globalConfigs, setGlobalConfigs] = useState<GlobalConfig>({
    openai_api_key: '',
    gemini_api_key: '',
    huggingface_api_key: '',
    system_name: 'Dinâmica SaaS',
    max_agents_per_user: '10',
    max_whatsapp_per_user: '3',
  });
  const [systemStats, setSystemStats] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      const [usersRes, configsRes, statsRes] = await Promise.all([
        apiService.get('/admin/users'),
        apiService.get('/admin/configs'),
        apiService.get('/admin/dashboard')
      ]);

      if (usersRes.success) {
        setUsers(usersRes.data.users || []);
      }

      if (configsRes.success) {
        setGlobalConfigs(prev => ({ ...prev, ...configsRes.data }));
      }

      if (statsRes.success) {
        setSystemStats(statsRes.data.overview || {});
      }
    } catch (error) {
      console.error('Erro ao carregar dados admin:', error);
      showError('Erro', 'Não foi possível carregar os dados administrativos');
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalConfig = async (key: keyof GlobalConfig) => {
    try {
      setSaving(true);
      
      const response = await apiService.post('/admin/configs', {
        config_key: key,
        config_value: globalConfigs[key]
      });

      if (response.success) {
        showSuccess('Configuração salva!', `${key} foi atualizada com sucesso`);
      } else {
        showError('Erro', response.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      showError('Erro', 'Não foi possível salvar a configuração');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await apiService.put(`/admin/users/${userId}`, {
        is_active: !currentStatus
      });

      if (response.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, is_active: !currentStatus } : user
        ));
        showSuccess('Status atualizado!', `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
      } else {
        showError('Erro', response.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showError('Erro', 'Não foi possível atualizar o status do usuário');
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const response = await apiService.delete(`/admin/users/${userId}`);

      if (response.success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        showSuccess('Usuário excluído!', `${userName} foi removido do sistema`);
      } else {
        showError('Erro', response.error || 'Erro ao excluir usuário');
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      showError('Erro', 'Não foi possível excluir o usuário');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Painel Administrativo
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Sistema Dinâmica v2.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon },
              { id: 'users', name: 'Usuários', icon: UserGroupIcon },
              { id: 'configs', name: 'APIs Globais', icon: KeyIcon },
              { id: 'system', name: 'Sistema', icon: CogIcon },
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

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Usuários</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.activeUsers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Agentes</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalAgents || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-yellow-100">
                  <ShieldCheckIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Conversas Hoje</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalConversations || 0}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Gestão de Usuários</h3>
              <p className="text-sm text-gray-500">Gerencie todos os usuários do sistema</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img
                              className="h-10 w-10 rounded-full"
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                              alt={user.name}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'barbearia' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">{user.plan}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : 'Nunca'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium ${
                            user.is_active 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {user.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(user.id, user.name)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Global Configs Tab */}
        {activeTab === 'configs' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">APIs Globais de Inteligência Artificial</h3>
              <p className="text-sm text-gray-600 mb-6">
                Configure as chaves de API que serão usadas por todos os usuários do sistema
              </p>

              <div className="space-y-6">
                {/* OpenAI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="password"
                      value={globalConfigs.openai_api_key}
                      onChange={(e) => setGlobalConfigs(prev => ({ ...prev, openai_api_key: e.target.value }))}
                      placeholder="sk-proj-..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => saveGlobalConfig('openai_api_key')}
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                {/* Gemini */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Gemini API Key
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="password"
                      value={globalConfigs.gemini_api_key}
                      onChange={(e) => setGlobalConfigs(prev => ({ ...prev, gemini_api_key: e.target.value }))}
                      placeholder="AIza..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => saveGlobalConfig('gemini_api_key')}
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                {/* Hugging Face */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hugging Face API Key
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="password"
                      value={globalConfigs.huggingface_api_key}
                      onChange={(e) => setGlobalConfigs(prev => ({ ...prev, huggingface_api_key: e.target.value }))}
                      placeholder="hf_..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => saveGlobalConfig('huggingface_api_key')}
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Configurações do Sistema</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Sistema
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={globalConfigs.system_name}
                      onChange={(e) => setGlobalConfigs(prev => ({ ...prev, system_name: e.target.value }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => saveGlobalConfig('system_name')}
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máx. Agentes por Usuário
                  </label>
                  <div className="flex space-x-3">
                    <input
                      type="number"
                      value={globalConfigs.max_agents_per_user}
                      onChange={(e) => setGlobalConfigs(prev => ({ ...prev, max_agents_per_user: e.target.value }))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={() => saveGlobalConfig('max_agents_per_user')}
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200"
          >
            {/* Content already rendered above */}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Admin;