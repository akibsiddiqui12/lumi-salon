import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Customers from './pages/Customers';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Settings from './pages/Settings';

function Guard({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
          <Route path="/appointments" element={<Guard><Appointments /></Guard>} />
          <Route path="/customers" element={<Guard roles={['admin', 'manager', 'receptionist']}><Customers /></Guard>} />
          <Route path="/pos" element={<Guard roles={['admin', 'manager', 'receptionist']}><POS /></Guard>} />
          <Route path="/inventory" element={<Guard roles={['admin', 'manager']}><Inventory /></Guard>} />
          <Route path="/finance" element={<Guard roles={['admin', 'manager']}><Finance /></Guard>} />
          <Route path="/settings" element={<Guard roles={['admin', 'manager']}><Settings /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
