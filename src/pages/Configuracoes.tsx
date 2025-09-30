import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useNotification } from '../contexts/NotificationContext';
import { apiService } from '../services/api';

interface WhatsAppConfig {
  id?: string;
  name: string;
  access_token: string;
  phone_number_id: string;
  webhook_verify_token: string;
  business_account_id: string;
  is_active: boolean;
}

interface EmailConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  from_name: string;
  from_email: string;
}

export const Configuracoes: React.FC = () => {
  const { showSuccess, showError } = useNotification();
  const [whatsappConfigs, setWhatsappConfigs] = useState<WhatsAppConfig[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    from_name: '',
    from_email: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddWhatsApp, setShowAddWhatsApp] = useState(false);
  const [newWhatsApp, setNewWhatsApp] = useState<WhatsAppConfig>({
    name: '',
    access_token: '',
    phone_number_id: '',
    webhook_verify_token: '',
    business_account_id: '',
    is_active: true,
  });
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfiguracoes();
  }, []);

  const loadConfiguracoes = async () => {
    try {
      setLoading(true);
      
      const [whatsappRes, emailRes] = await Promise.all([
        apiService.get('/config/whatsapp'),
        apiService.get('/config/email')
      ]);
      
      if (whatsappRes.success) {
        setWhatsappConfigs(whatsappRes.data || []);
      }
      
      if (emailRes.success) {
        setEmailConfig(prev => ({ ...prev, ...emailRes.data }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      showError('Erro', 'Não foi possível carregar as configurações');
    } finally {
      setLoading(false);
    }
  };

  const addWhatsAppConfig = async () => {
    if (!newWhatsApp.name || !newWhatsApp.access_token || !newWhatsApp.phone_number_id) {
      showError('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);
      
      const response = await apiService.post('/config/whatsapp', newWhatsApp);
      
      if (response.success) {
        setWhatsappConfigs(prev => [...prev, response.data]);
        setNewWhatsApp({
          name: '',
          access_token: '',
          phone_number_id: '',
          webhook_verify_token: '',
          business_account_id: '',
          is_active: true,
        });
        setShowAddWhatsApp(false);
        showSuccess('WhatsApp adicionado!', 'Configuração salva com sucesso');
      } else {
        showError('Erro', response.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao adicionar WhatsApp:', error);
      showError('Erro', 'Não foi possível salvar a configuração');
    } finally {
      setSaving(false);
    }
  };

  const removeWhatsAppConfig = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover esta configuração?')) {
      return;
    }

    try {
      const response = await apiService.delete(`/config/whatsapp/${id}`);
      
      if (response.success) {
        setWhatsappConfigs(prev => prev.filter(config => config.id !== id));
        showSuccess('WhatsApp removido!', 'Configuração excluída com sucesso');
      } else {
        showError('Erro', response.error || 'Erro ao remover configuração');
      }
    } catch (error) {
      console.error('Erro ao remover WhatsApp:', error);
      showError('Erro', 'Não foi possível remover a configuração');
    }
  };

  const saveEmailConfig = async () => {
    try {
      setSaving(true);
      
      const response = await apiService.post('/config/email', emailConfig);
      
      if (response.success) {
        showSuccess('Email configurado!', 'Configurações de email salvas com sucesso');
      } else {
        showError('Erro', response.error || 'Erro ao salvar configurações de email');
      }
    } catch (error) {
      console.error('Erro ao salvar email:', error);
      showError('Erro', 'Não foi possível salvar as configurações de email');
    } finally {
      setSaving(false);
    }
  };

  const testWhatsAppConnection = async (config: WhatsAppConfig) => {
    try {
      setTesting(prev => ({ ...prev, [config.id!]: true }));
      
      const response = await apiService.post('/config/test-whatsapp', {
        access_token: config.access_token,
        phone_number_id: config.phone_number_id
      });
      
      setTestResults(prev => ({ ...prev, [config.id!]: response.success }));
      
      if (response.success) {
        showSuccess('Teste bem-sucedido!', 'WhatsApp conectado com sucesso');
      } else {
        showError('Teste falhou', response.error || 'Erro na conexão');
      }
    } catch (error) {
      console.error('Erro ao testar WhatsApp:', error);
      setTestResults(prev => ({ ...prev, [config.id!]: false }));
      showError('Erro', 'Não foi possível testar a conexão');
    } finally {
      setTesting(prev => ({ ...prev, [config.id!]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Configurações de API
          </h1>
          <p className="text-gray-600 mt-2">Configure suas integrações WhatsApp e configurações de email</p>
        </div>
      </div>

      {/* WhatsApp Configurations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              📱 WhatsApp Business API
            </h2>
            <p className="text-gray-600 mt-1">Conecte seus agentes de IA ao WhatsApp</p>
          </div>
          <button
            onClick={() => setShowAddWhatsApp(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Adicionar WhatsApp
          </button>
        </div>

        {/* WhatsApp List */}
        <div className="space-y-4">
          {whatsappConfigs.map((config) => (
            <div key={config.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{config.name}</h3>
                  <p className="text-sm text-gray-500">Phone ID: {config.phone_number_id}</p>
                  <div className="flex items-center mt-2">
                    <div className={`w-3 h-3 rounded-full mr-2 ${config.is_active ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <span className={`text-sm ${config.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                      {config.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => testWhatsAppConnection(config)}
                    disabled={testing[config.id!]}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {testing[config.id!] ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      'Testar'
                    )}
                  </button>
                  <button
                    onClick={() => removeWhatsAppConfig(config.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                  {testResults[config.id!] !== undefined && (
                    testResults[config.id!] ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-6 h-6 text-red-500" />
                    )
                  )}
                </div>
              </div>
            </div>
          ))}

          {whatsappConfigs.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum WhatsApp configurado</h3>
              <p className="text-gray-500 mb-4">Adicione sua primeira configuração WhatsApp</p>
              <button
                onClick={() => setShowAddWhatsApp(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Adicionar WhatsApp
              </button>
            </div>
          )}
        </div>

        {/* Add WhatsApp Modal */}
        {showAddWhatsApp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Adicionar WhatsApp</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Configuração *
                  </label>
                  <input
                    type="text"
                    value={newWhatsApp.name}
                    onChange={(e) => setNewWhatsApp(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: WhatsApp Principal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token *
                  </label>
                  <input
                    type="password"
                    value={newWhatsApp.access_token}
                    onChange={(e) => setNewWhatsApp(prev => ({ ...prev, access_token: e.target.value }))}
                    placeholder="EAAx..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number ID *
                  </label>
                  <input
                    type="text"
                    value={newWhatsApp.phone_number_id}
                    onChange={(e) => setNewWhatsApp(prev => ({ ...prev, phone_number_id: e.target.value }))}
                    placeholder="123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook Verify Token
                  </label>
                  <input
                    type="text"
                    value={newWhatsApp.webhook_verify_token}
                    onChange={(e) => setNewWhatsApp(prev => ({ ...prev, webhook_verify_token: e.target.value }))}
                    placeholder="seu_token_verificacao"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddWhatsApp(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={addWhatsAppConfig}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Email Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8"
      >
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          📧 Configurações de Email
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Servidor SMTP
            </label>
            <input
              type="text"
              value={emailConfig.smtp_host}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_host: e.target.value }))}
              placeholder="smtp.gmail.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Porta
            </label>
            <input
              type="text"
              value={emailConfig.smtp_port}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_port: e.target.value }))}
              placeholder="587"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuário
            </label>
            <input
              type="email"
              value={emailConfig.smtp_user}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_user: e.target.value }))}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              type="password"
              value={emailConfig.smtp_pass}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, smtp_pass: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Remetente
            </label>
            <input
              type="text"
              value={emailConfig.from_name}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, from_name: e.target.value }))}
              placeholder="Sua Empresa"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email do Remetente
            </label>
            <input
              type="email"
              value={emailConfig.from_email}
              onChange={(e) => setEmailConfig(prev => ({ ...prev, from_email: e.target.value }))}
              placeholder="noreply@suaempresa.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={saveEmailConfig}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações de Email'}
          </button>
        </div>
      </motion.div>

      {/* Informações importantes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 border border-blue-200 rounded-2xl p-6"
      >
        <div className="flex items-start">
          <ExclamationTriangleIcon className="w-6 h-6 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">Informações Importantes</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• Configure pelo menos um WhatsApp para usar os agentes de IA</p>
              <p>• Cada agente pode ser vinculado a WhatsApps específicos</p>
              <p>• As configurações de email são usadas para notificações do sistema</p>
              <p>• Teste sempre suas configurações após salvá-las</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Configuracoes;