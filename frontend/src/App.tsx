import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QueryPage from './pages/QueryPage';
import DashboardRedirect from './components/DashboardRedirect';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Публичные роуты */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Публичный роут для просмотра дашборда по UID */}
            <Route 
              path="/dashboard/:uid" 
              element={<DashboardPage />} 
            />
            
            {/* Роут /dashboard без UID - редирект на последний дашборд или логин */}
            <Route 
              path="/dashboard" 
              element={<DashboardRedirect />} 
            />
            
            {/* Защищенный роут для создания запроса */}
            <Route 
              path="/query" 
              element={
                <ProtectedRoute>
                  <QueryPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Редирект с главной страницы на дашборд */}
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />} 
            />
            
            {/* Обработка несуществующих роутов */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <p className="text-gray-600 mb-4">Страница не найдена</p>
                    <Navigate to="/dashboard" replace />
                  </div>
                </div>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
