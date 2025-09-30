import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/Layout/Layout';
import { apiService } from './services/api';

const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then(module => ({ default: module.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Agents = lazy(() => import('./pages/Agents').then(module => ({ default: module.Agents })));
const Chat = lazy(() => import('./pages/Chat').then(module => ({ default: module.Chat })));
const Conversations = lazy(() => import('./pages/Conversations').then(module => ({ default: module.Conversations })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Configuracoes = lazy(() => import('./pages/Configuracoes').then(module => ({ default: module.Configuracoes })));
const Barbearia = lazy(() => import('./pages/Barbearia').then(module => ({ default: module.Barbearia })));
const Admin = lazy(() => import('./pages/Admin').then(module => ({ default: module.Admin })));
const Teste = lazy(() => import('./pages/Teste').then(module => ({ default: module.Teste })));

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Carregando...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ 
  children, 
  requiredRole 
}) => {
  const { state, dispatch } = useApp();

  useEffect(() => {
    const checkAuth = () => {
      if (apiService.isAuthenticated()) {
        const user = apiService.getCurrentUser();
        if (user) {
          dispatch({ type: 'SET_USER', payload: user });
        }
      }
    };

    checkAuth();
  }, [dispatch]);

  if (!apiService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && state.user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/teste" element={<Teste />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route
            path="/barbearia"
            element={
              <ProtectedRoute requiredRole="barbearia">
                <Barbearia />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/agents" element={<Agents />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/conversations" element={<Conversations />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
};

function App() {
  return (
    <AppProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AppProvider>
  );
}

export default App;