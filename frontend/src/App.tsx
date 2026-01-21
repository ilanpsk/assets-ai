import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSystemStatus } from './api/system';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import Setup from './pages/Setup';
import Login from './pages/Login';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetails from './pages/AssetDetails';
import AssetSets from './pages/AssetSets';
import Settings from './pages/Settings';
import Users from './pages/Users';
import UserDetails from './pages/UserDetails';
import Admin from './pages/Admin';
import Reports from './pages/Reports';
import Requests from './pages/Requests';
import Imports from './pages/Imports';
import NotFound from './pages/NotFound';
import Docs from './pages/Docs';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useThemeStore();
  const { isAuthenticated, user, fetchUser } = useAuthStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Validate session on mount
  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUser();
    }
  }, [isAuthenticated, user, fetchUser]);

  const { data: status, isLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: getSystemStatus,
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && status) {
      if (!status.initialized && location.pathname !== '/setup') {
        navigate('/setup');
      } else if (status.initialized && location.pathname === '/setup') {
        navigate('/login');
      }
    }
  }, [status, isLoading, navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/requests" element={<Requests />} />
            
            {/* Asset Management - Requires asset:view_all */}
            <Route element={<ProtectedRoute requiredPermission="asset:view_all" />}>
              <Route path="/assets" element={<Assets />} />
              <Route path="/assets/:id" element={<AssetDetails />} />
              <Route path="/imports" element={<Imports />} />
            </Route>

            {/* Inventory/Sets - Requires set:read */}
            <Route element={<ProtectedRoute requiredPermission="set:read" />}>
              <Route path="/inventory" element={<AssetSets />} />
            </Route>

            {/* People/Users - Requires user:read */}
            <Route element={<ProtectedRoute requiredPermission="user:read" />}>
              <Route path="/people" element={<Users />} />
              <Route path="/people/:id" element={<UserDetails />} />
            </Route>

            {/* Reports/Audit - Requires audit:read */}
            <Route element={<ProtectedRoute requiredPermission="audit:read" />}>
              <Route path="/reports" element={<Reports />} />
            </Route>

            {/* Settings - Requires config:read */}
            <Route element={<ProtectedRoute requiredPermission="config:read" />}>
              <Route path="/settings" element={<Settings />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
            
            {/* Docs - Available to all authenticated users */}
            <Route path="/docs" element={<Docs />} />
          </Route>
        </Route>
        
        {/* Catch-all route for 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
