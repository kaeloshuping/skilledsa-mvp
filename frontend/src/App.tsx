// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ToastContainer } from './components/common/ToastContainer';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { VerificationUpload } from './pages/VerificationUpload';
import { VerificationPending } from './pages/VerificationPending';
import { Landing } from './pages/Landing';
import { PostJob } from './pages/customer/PostJob';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { getLogger } from './utils/logger';

const log = getLogger('App');

function App() {
  useEffect(() => {
    log.info('App mounted');
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin public route – reuses the Login component */}
        <Route path="/admin" element={<Login redirectTo="/admin/dashboard" />} />
        
        <Route path="/admin/signup" element={<Signup allowedRoles={['admin']} redirectTo="/admin/dashboard" />} />
       

        {/* Protected routes (require authentication) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/verify" element={<VerificationUpload />} />
          <Route path="/verification-pending" element={<VerificationPending />} />
          <Route path="/dashboard" element={<div>Dashboard (coming soon)</div>} />
        </Route>

        {/* Admin protected route (requires admin role) */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={['admin']}
              requireVerification={false}
              redirectTo="/admin"
            />
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>

        {/* Customer-only routes */}
        <Route element={<ProtectedRoute allowedRoles={['customer']} requireVerification />}>
          <Route path="/post-job" element={<PostJob />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;