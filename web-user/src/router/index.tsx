import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Login from '../pages/Login';
import ChatLayout from '../layouts/ChatLayout';
import ChatHome from '../pages/ChatHome';
import ProjectList from '../pages/ProjectList';
import ProjectNew from '../pages/ProjectNew';
import ProjectDetail from '../pages/ProjectDetail';
import ReviewDetail from '../pages/ReviewDetail';
import BidCompareResult from '../pages/BidCompareResult';
import CompetitorLibrary from '../pages/CompetitorLibrary';
import VersionDiff from '../pages/VersionDiff';
import ProjectReport from '../pages/ProjectReport';

const REQUIRED_ROLE = 'bidder';

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
        <Route element={<ChatLayout />}>
          <Route path="/" element={<ChatHome />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/review/:versionNo" element={<ReviewDetail />} />
          <Route path="/projects/:id/compare" element={<BidCompareResult />} />
          <Route path="/projects/:id/library" element={<CompetitorLibrary />} />
          <Route path="/projects/:id/diff" element={<VersionDiff />} />
          <Route path="/projects/:id/report" element={<ProjectReport />} />
        </Route>
        <Route path="/projects/new" element={<ProjectNew />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
