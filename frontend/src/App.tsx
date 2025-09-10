import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import QueryPage from './pages/QueryPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Публичные роуты */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Защищенные роуты */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            
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
                <ProtectedRoute>
                  <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                      <p className="text-gray-600 mb-4">Страница не найдена</p>
                      <Navigate to="/dashboard" replace />
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
