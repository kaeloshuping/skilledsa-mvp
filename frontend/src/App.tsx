// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { VerificationUpload } from './pages/VerificationUpload';
import { VerificationPending } from './pages/VerificationPending';
import { Landing } from './pages/Landing'; // <-- NEW
import { getLogger } from './utils/logger';

const log = getLogger('App');

function App() {
  useEffect(() => {
    console.log('[FE1] - App mounted');
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes (require authentication) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/verify" element={<VerificationUpload />} />
          <Route path="/verification-pending" element={<VerificationPending />} />
          <Route path="/dashboard" element={<div>Dashboard (coming soon)</div>} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;