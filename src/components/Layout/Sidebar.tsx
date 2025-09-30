import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  CogIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/AppContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard/', icon: HomeIcon },
  { name: 'Agentes de IA', href: '/dashboard/agents', icon: UserGroupIcon },
  { name: 'Conversas', href: '/dashboard/conversations', icon: ChatBubbleLeftRightIcon },
  { name: 'Chat IA', href: '/dashboard/chat', icon: ChatBubbleLeftRightIcon },
  { name: 'Configurações', href: '/dashboard/settings', icon: CogIcon },
  { name: 'APIs', href: '/dashboard/configuracoes', icon: WrenchScrewdriverIcon },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { state } = useApp();

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <span className="text-white text-sm font-bold">D</span>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">Dinâmica</h1>
            <p className="text-xs text-gray-500">IA Platform</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      {state.user && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <img
              className="w-10 h-10 rounded-full"
              src={state.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user.name)}&background=6366f1&color=fff`}
              alt={state.user.name}
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{state.user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{state.user.plan} plan</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === '/dashboard/' && location.pathname === '/dashboard');
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-600'
                }`}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Quick Stats */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estatísticas</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Agentes Ativos</span>
              <span className="font-medium text-green-600">
                {Array.isArray(state.agents) ? state.agents.filter(a => a.is_active).length : 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Conversas Ativas</span>
              <span className="font-medium text-blue-600">
                {state.dashboardStats?.overview?.activeConversations || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};