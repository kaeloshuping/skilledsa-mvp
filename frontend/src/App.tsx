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
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { getLogger } from './utils/logger';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { VerificationQueue } from './pages/admin/VerificationQueue';

// Contractor pages
import { BrowseJobs } from './pages/contractor/BrowseJobs';
import { JobDetail } from './pages/contractor/JobDetail';

const log = getLogger('App');

function App() {
  useEffect(() => {
    log.info('App mounted');
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* ============================================================
            PUBLIC ROUTES
            ============================================================ */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin authentication (public) */}
        <Route path="/admin/login" element={<Login redirectTo="/admin/dashboard" />} />
        <Route
          path="/admin/signup"
          element={<Signup allowedRoles={['admin']} redirectTo="/admin/dashboard" />}
        />

        {/* ============================================================
            PROTECTED ROUTES (authenticated users)
            ============================================================ */}
        <Route element={<ProtectedRoute />}>
          <Route path="/verify" element={<VerificationUpload />} />
          <Route path="/verification-pending" element={<VerificationPending />} />
        </Route>

        {/* ============================================================
            CUSTOMER-ONLY ROUTES
            ============================================================ */}
        <Route element={<ProtectedRoute allowedRoles={['customer']} requireVerification />}>
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/post-job" element={<PostJob />} />
        </Route>

        {/* ============================================================
            CONTRACTOR-ONLY ROUTES (browsing jobs)
            ============================================================ */}
        <Route element={<ProtectedRoute allowedRoles={['contractor', 'admin']} requireVerification />}>
          <Route path="/contractor/jobs" element={<BrowseJobs />} />
          <Route path="/contractor/jobs/:id" element={<JobDetail />} />
        </Route>

        {/* ============================================================
            ADMIN-ONLY ROUTES
            ============================================================ */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login" />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/verifications" element={<VerificationQueue />} />
          {/* Add other admin routes as needed */}
        </Route>

        {/* ============================================================
            CATCH-ALL
            ============================================================ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;