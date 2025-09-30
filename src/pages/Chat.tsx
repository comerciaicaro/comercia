import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  PaperAirplaneIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../contexts/AppContext';
import { useNotification } from '../contexts/NotificationContext';
import { apiService } from '../services/api';
import io from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: string;
  response_time?: number;
}

interface Conversation {
  id: string;
  agent_id: string;
  customer_name: string;
  agent_name?: string;
  message_count?: number;
  last_message_time?: string;
  status: string;
}

export const Chat: React.FC = () => {
  const { state } = useApp();
  const { showError, showSuccess } = useNotification();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    initializeSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSocket = () => {
    const newSocket = io('http://localhost:3001');
    
    newSocket.on('connect', () => {
      console.log('Socket conectado');
      const token = localStorage.getItem('token');
      const user = apiService.getCurrentUser();
      
      if (token && user) {
        newSocket.emit('authenticate', { userId: user.id, token });
      }
    });

    newSocket.on('authenticated', (data) => {
      console.log('Socket autenticado:', data);
    });

    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('authentication_error', (error) => {
      console.error('Erro de autenticação do socket:', error);
      showError('Erro de conexão', 'Não foi possível conectar ao chat em tempo real');
    });

    setSocket(newSocket);
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getConversations();
      
      if (response.success) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      showError('Erro', 'Não foi possível carregar as conversas');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await apiService.getConversationMessages(conversationId);
      
      if (response.success) {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      showError('Erro', 'Não foi possível carregar as mensagens');
    }
  };

  const createNewConversation = async () => {
    if (!selectedAgent) {
      showError('Erro', 'Selecione um agente primeiro');
      return;
    }

    try {
      const response = await apiService.createConversation({
        agent_id: selectedAgent,
        customer_name: 'Nova Conversa',
        channel_type: 'chat'
      });

      if (response.success) {
        const newConv = response.data.conversation;
        setConversations(prev => [newConv, ...prev]);
        setSelectedConversation(newConv);
        setMessages([]);
        
        if (socket) {
          socket.emit('join_conversation', { conversationId: newConv.id });
        }
        
        showSuccess('Conversa criada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      showError('Erro', 'Não foi possível criar a conversa');
    }
  };

  const selectConversation = (conversation: Conversation) => {
    if (selectedConversation && socket) {
      socket.emit('leave_conversation', { conversationId: selectedConversation.id });
    }
    
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    
    if (socket) {
      socket.emit('join_conversation', { conversationId: conversation.id });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedAgent) {
      return;
    }

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      if (socket) {
        socket.emit('send_message', {
          conversationId: selectedConversation.id,
          message: messageText,
          agentId: selectedAgent
        });
      } else {
        // Fallback para API REST
        const response = await apiService.sendMessage(selectedConversation.id, messageText, selectedAgent);
        
        if (response.success) {
          setMessages(prev => [
            ...prev,
            response.data.userMessage,
            response.data.aiMessage
          ]);
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showError('Erro', 'Não foi possível enviar a mensagem');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando chat...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar - Lista de Conversas */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Conversas</h2>
            <button
              onClick={createNewConversation}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
          
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione um agente</option>
            {state.agents.filter(agent => agent.is_active).map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <ChatBubbleLeftRightIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            conversations.map(conversation => (
              <div
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {conversation.customer_name || 'Cliente'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {conversation.agent_name || 'Sem agente'} • {conversation.message_count || 0} mensagens
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedConversation.customer_name || 'Cliente'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.agent_name || 'Sem agente atribuído'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className={`text-xs ${
                        message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                      {message.response_time && (
                        <p className={`text-xs ${
                          message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {message.response_time.toFixed(1)}s
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={sending || !selectedAgent}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim() || !selectedAgent}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
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
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Selecione uma conversa
              </h3>
              <p className="text-gray-500 mb-4">
                Escolha uma conversa existente ou crie uma nova para começar
              </p>
              <button
                onClick={createNewConversation}
                disabled={!selectedAgent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Nova Conversa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;