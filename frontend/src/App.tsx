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
import { CustomerProfile } from './pages/customer/CustomerProfile';
import { getLogger } from './utils/logger';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { VerificationQueue } from './pages/admin/VerificationQueue';
import { UserManagement } from './pages/admin/UserManagement';

import { BrowseJobs } from './pages/contractor/BrowseJobs';
import { JobDetail } from './pages/contractor/JobDetail';
import { ContractorDashboard } from './pages/contractor/ContractorDashboard';
import { ContractorProfile } from './pages/contractor/ContractorProfile';

const log = getLogger('App');

function App() {
  useEffect(() => {
    log.info('App mounted');
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/login" element={<Login redirectTo="/admin/dashboard" />} />
        <Route
          path="/admin/signup"
          element={<Signup allowedRoles={['admin']} redirectTo="/admin/dashboard" />}
        />

        {/* AUTHENTICATED */}
        <Route element={<ProtectedRoute />}>
          <Route path="/verify" element={<VerificationUpload />} />
          <Route path="/verification-pending" element={<VerificationPending />} />
        </Route>

        {/* CUSTOMER */}
        <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/profile" element={<CustomerProfile />} />
        </Route>

        {/* CONTRACTOR */}
        <Route element={<ProtectedRoute allowedRoles={['contractor', 'admin']} />}>
          <Route path="/contractor/dashboard" element={<ContractorDashboard />} />
          <Route path="/contractor/profile" element={<ContractorProfile />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['contractor', 'admin']} requireVerification />}>
          <Route path="/contractor/jobs" element={<BrowseJobs />} />
          <Route path="/contractor/jobs/:id" element={<JobDetail />} />
        </Route>

        {/* ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login" />}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/verifications" element={<VerificationQueue />} />
          <Route path="/admin/users" element={<UserManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;