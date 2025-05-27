import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, BrowserRouter } from 'react-router-dom'; // Ensure BrowserRouter is imported
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import LoginPage from '@/pages/LoginPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import ProjectManagerDashboardPage from '@/pages/ProjectManagerDashboardPage';
import WorkerDashboardPage from '@/pages/WorkerDashboardPage';
import NotFoundPage from '@/pages/NotFoundPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/layouts/MainLayout';
import { Toaster } from '@/components/ui/toaster';

import UserManagementPage from '@/pages/admin/UserManagementPage';
import AdminProjectManagementPage from '@/pages/admin/AdminProjectManagementPage';
import ManagerProjectManagementPage from '@/pages/manager/ManagerProjectManagementPage';
import WorkerManagementPage from '@/pages/manager/WorkerManagementPage';
import ManagerTaskPage from '@/pages/manager/ManagerTaskPage';
import WorkerSiteViewPage from '@/pages/worker/WorkerSiteViewPage';
import AttendancePage from '@/pages/worker/AttendancePage';
import SystemSettingsPage from '@/pages/admin/SystemSettingsPage';
import ProjectReadOnlyPage from '@/pages/ProjectReadOnlyPage';
import ResourceRequestsPage from '@/pages/admin/ResourceRequestsPage';
import ManagerPendingTasksPage from '@/pages/manager/ManagerPendingTasksPage';
import WorkerTasksPage from '@/pages/worker/WorkerTasksPage';

function AppContent() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <LoginPage />} />
      
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/dashboard" element={<MainLayout><AdminDashboardPage /></MainLayout>} />
        <Route path="/admin/users" element={<MainLayout><UserManagementPage /></MainLayout>} />
        <Route path="/admin/projects" element={<MainLayout><AdminProjectManagementPage /></MainLayout>} />
        <Route path="/admin/settings" element={<MainLayout><SystemSettingsPage /></MainLayout>} />
        <Route path="/admin/resource-requests" element={<MainLayout><ResourceRequestsPage /></MainLayout>} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['project_manager']} />}>
        <Route path="/project_manager/dashboard" element={<MainLayout><ProjectManagerDashboardPage /></MainLayout>} />
        <Route path="/project_manager/projects" element={<MainLayout><ManagerProjectManagementPage /></MainLayout>} />
        <Route path="/project_manager/workers" element={<MainLayout><WorkerManagementPage /></MainLayout>} />
        <Route path="/project_manager/tasks/:projectId" element={<MainLayout><ManagerTaskPage /></MainLayout>} />
        <Route path="/project_manager/pending-tasks" element={<MainLayout><ManagerPendingTasksPage /></MainLayout>} />
        {/* Ruta de solo lectura para proyectos */}
        <Route path="/project_manager/projects/:id/view" element={<MainLayout><ProjectReadOnlyPage /></MainLayout>} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
        <Route path="/worker/dashboard" element={<MainLayout><WorkerDashboardPage /></MainLayout>} />
        <Route path="/worker/site" element={<MainLayout><WorkerSiteViewPage /></MainLayout>} />
        <Route path="/worker/attendance" element={<MainLayout><AttendancePage /></MainLayout>} />
        <Route path="/worker/tasks" element={<MainLayout><WorkerTasksPage /></MainLayout>} />
      </Route>

      <Route path="/" element={user ? <Navigate to={`/${user.role}/dashboard`} replace /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
