import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import HeadsetsPage from './pages/HeadsetsPage.jsx';
import CloudPage from './pages/CloudPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import { AnimatePresence } from 'framer-motion';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isLoggedIn, role } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default function App() {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
          <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/home" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/headsets" element={<HeadsetsPage />} />
          <Route path="/cloud" element={<CloudPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
