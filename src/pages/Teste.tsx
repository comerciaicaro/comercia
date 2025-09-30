import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DatabaseIcon,
  ServerIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export const Teste: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Conexão com Banco de Dados', status: 'pending', message: 'Aguardando teste...' },
    { name: 'API Backend', status: 'pending', message: 'Aguardando teste...' },
    { name: 'Autenticação JWT', status: 'pending', message: 'Aguardando teste...' },
    { name: 'WebSocket', status: 'pending', message: 'Aguardando teste...' },
    { name: 'CRUD Usuários', status: 'pending', message: 'Aguardando teste...' },
    { name: 'CRUD Agentes', status: 'pending', message: 'Aguardando teste...' },
    { name: 'Sistema de Chat', status: 'pending', message: 'Aguardando teste...' },
    { name: 'Módulo Barbearia', status: 'pending', message: 'Aguardando teste...' },
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, status: 'success' | 'error', message: string, details?: string) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, status, message, details } : test
    ));
  };

  const runTest = async (testName: string, testFunction: () => Promise<{ success: boolean; message: string; details?: string }>) => {
    const index = tests.findIndex(t => t.name === testName);
    
    try {
      const result = await testFunction();
      updateTest(index, result.success ? 'success' : 'error', result.message, result.details);
    } catch (error) {
      updateTest(index, 'error', `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const testDatabase = async () => {
    const response = await fetch('/api/health');
    const data = await response.json();
    
    if (response.ok && data.status === 'OK') {
      return { success: true, message: 'Banco conectado com sucesso' };
    } else {
      return { success: false, message: 'Falha na conexão com banco' };
    }
  };

  const testBackendAPI = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (response.ok) {
        return { 
          success: true, 
          message: 'API funcionando', 
          details: `Versão: ${data.version}, Ambiente: ${data.environment}` 
        };
      } else {
        return { success: false, message: 'API não responde' };
      }
    } catch (error) {
      return { success: false, message: 'Erro de conexão com API' };
    }
  };

  const testAuthentication = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teste@dinamica.com', password: 'teste123' })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.token) {
        return { success: true, message: 'Autenticação funcionando', details: 'Token JWT gerado' };
      } else {
        return { success: false, message: 'Falha na autenticação' };
      }
    } catch (error) {
      return { success: false, message: 'Erro no teste de autenticação' };
    }
  };

  const testWebSocket = async () => {
    return new Promise<{ success: boolean; message: string }>((resolve) => {
      try {
        const socket = new WebSocket('ws://localhost:3001');
        
        socket.onopen = () => {
          socket.close();
          resolve({ success: true, message: 'WebSocket conectado' });
        };
        
        socket.onerror = () => {
          resolve({ success: false, message: 'Erro na conexão WebSocket' });
        };
        
        setTimeout(() => {
          socket.close();
          resolve({ success: false, message: 'Timeout na conexão WebSocket' });
        }, 5000);
      } catch (error) {
        resolve({ success: false, message: 'Erro ao testar WebSocket' });
      }
    });
  };

  const testUsersCRUD = async () => {
    try {
      // Login para obter token
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@dinamica.com', password: 'admin123' })
      });
      
      const loginData = await loginResponse.json();
      
      if (!loginData.success) {
        return { success: false, message: 'Falha no login para teste' };
      }
      
      // Testar busca de perfil
      const profileResponse = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const profileData = await profileResponse.json();
      
      if (profileResponse.ok && profileData.success) {
        return { success: true, message: 'CRUD usuários funcionando', details: `Usuário: ${profileData.user.name}` };
      } else {
        return { success: false, message: 'Erro no CRUD usuários' };
      }
    } catch (error) {
      return { success: false, message: 'Erro no teste CRUD usuários' };
    }
  };

  const testAgentsCRUD = async () => {
    try {
      // Login
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teste@dinamica.com', password: 'teste123' })
      });
      
      const loginData = await loginResponse.json();
      
      if (!loginData.success) {
        return { success: false, message: 'Falha no login para teste' };
      }
      
      // Testar listagem de agentes
      const agentsResponse = await fetch('/api/agents', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const agentsData = await agentsResponse.json();
      
      if (agentsResponse.ok && agentsData.success) {
        return { success: true, message: 'CRUD agentes funcionando', details: `${agentsData.data.agents.length} agentes encontrados` };
      } else {
        return { success: false, message: 'Erro no CRUD agentes' };
      }
    } catch (error) {
      return { success: false, message: 'Erro no teste CRUD agentes' };
    }
  };

  const testChatSystem = async () => {
    try {
      // Login
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'teste@dinamica.com', password: 'teste123' })
      });
      
      const loginData = await loginResponse.json();
      
      if (!loginData.success) {
        return { success: false, message: 'Falha no login para teste' };
      }
      
      // Testar listagem de conversas
      const conversationsResponse = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const conversationsData = await conversationsResponse.json();
      
      if (conversationsResponse.ok && conversationsData.success) {
        return { success: true, message: 'Sistema de chat funcionando', details: `${conversationsData.data.conversations.length} conversas encontradas` };
      } else {
        return { success: false, message: 'Erro no sistema de chat' };
      }
    } catch (error) {
      return { success: false, message: 'Erro no teste do chat' };
    }
  };

  const testBarbeariaModule = async () => {
    try {
      // Login como barbearia
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'barbearia@dinamica.com', password: 'barbearia123' })
      });
      
      const loginData = await loginResponse.json();
      
      if (!loginData.success) {
        return { success: false, message: 'Falha no login barbearia' };
      }
      
      // Testar agendamentos
      const agendamentosResponse = await fetch('/api/barbearia/agendamentos', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const agendamentosData = await agendamentosResponse.json();
      
      if (agendamentosResponse.ok && agendamentosData.success) {
        return { success: true, message: 'Módulo barbearia funcionando', details: `${agendamentosData.data.length} agendamentos encontrados` };
      } else {
        return { success: false, message: 'Erro no módulo barbearia' };
      }
    } catch (error) {
      return { success: false, message: 'Erro no teste barbearia' };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending', message: 'Executando...' })));
    
    // Run tests sequentially
    await runTest('Conexão com Banco de Dados', testDatabase);
    await runTest('API Backend', testBackendAPI);
    await runTest('Autenticação JWT', testAuthentication);
    await runTest('WebSocket', testWebSocket);
    await runTest('CRUD Usuários', testUsersCRUD);
    await runTest('CRUD Agentes', testAgentsCRUD);
    await runTest('Sistema de Chat', testChatSystem);
    await runTest('Módulo Barbearia', testBarbeariaModule);
    
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      default:
        return <ClockIcon className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getTestIcon = (testName: string) => {
    if (testName.includes('Banco')) return <DatabaseIcon className="w-5 h-5" />;
    if (testName.includes('API')) return <ServerIcon className="w-5 h-5" />;
    if (testName.includes('WebSocket')) return <WifiIcon className="w-5 h-5" />;
    if (testName.includes('Chat')) return <ChatBubbleLeftRightIcon className="w-5 h-5" />;
    if (testName.includes('Usuários') || testName.includes('Agentes')) return <UserGroupIcon className="w-5 h-5" />;
    return <CogIcon className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🧪 Página de Testes do Sistema
            </h1>
            <p className="text-gray-600">
              Teste todas as funcionalidades do sistema Dinâmica
            </p>
          </div>

          <div className="mb-8">
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                isRunning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isRunning ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Executando Testes...
                </div>
              ) : (
                'Executar Todos os Testes'
              )}
            </button>
          </div>

          <div className="space-y-4">
            {tests.map((test, index) => (
              <motion.div
                key={test.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  test.status === 'success'
                    ? 'border-green-200 bg-green-50'
                    : test.status === 'error'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-500">
                      {getTestIcon(test.name)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{test.name}</h3>
                      <p className={`text-sm ${
                        test.status === 'success'
                          ? 'text-green-600'
                          : test.status === 'error'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}>
                        {test.message}
                      </p>
                      {test.details && (
                        <p className="text-xs text-gray-500 mt-1">{test.details}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    {getStatusIcon(test.status)}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">ℹ️ Informações Importantes</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Esta página testa a conectividade e funcionalidade básica do sistema</li>
              <li>• Certifique-se de que o backend esteja rodando na porta 3001</li>
              <li>• O banco de dados MySQL deve estar configurado e rodando</li>
              <li>• Para testes de IA, configure as API Keys nas configurações</li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Sistema Dinâmica v1.0.0 - Página de Testes
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Teste;