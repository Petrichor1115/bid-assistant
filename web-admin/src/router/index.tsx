import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Login from '../pages/Login';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../pages/AdminDashboard';
import UserManagement from '../pages/UserManagement';
import ProjectManagement from '../pages/ProjectManagement';
import FileManagement from '../pages/FileManagement';
import AuditManagement from '../pages/AuditManagement';
import PermissionManagement from '../pages/PermissionManagement';
import ConversationManagement from '../pages/ConversationManagement';
import KnowledgeManagement from '../pages/KnowledgeManagement';

const REQUIRED_ROLE = 'admin';

function AuthGuard() {
  const token = localStorage.getItem('token');
  let user: { role?: string } | null = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    user = null;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== REQUIRED_ROLE) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AuthGuard />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="projects" element={<ProjectManagement />} />
          <Route path="files" element={<FileManagement />} />
          <Route path="audits" element={<AuditManagement />} />
          <Route path="permissions" element={<PermissionManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="conversations" element={<ConversationManagement />} />
          <Route path="knowledge" element={<KnowledgeManagement />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
