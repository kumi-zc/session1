import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import StockTaking from './pages/StockTaking';
import StockTakingExecute from './pages/StockTaking/execute';
import Reports from './pages/Reports';
import LowStock from './pages/LowStock';
import UserManagement from './pages/UserManagement';
import Welcome from './pages/Welcome';
import GlobalSearch from './components/GlobalSearch';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  const theme = {
    token: {
      colorPrimary: '#D9B26A',
      colorLink: '#D9B26A',
      colorLinkHover: '#c4a050',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      borderRadius: 8,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    components: {
      Button: {
        primaryShadow: '0 2px 8px rgba(217,178,106,0.3)',
      },
      Menu: {
        darkItemBg: 'transparent',
        darkItemSelectedBg: 'rgba(217,178,106,0.15)',
        darkItemSelectedColor: '#D9B26A',
        darkItemColor: 'rgba(255,255,255,0.65)',
        darkItemHoverColor: '#D9B26A',
        darkItemHoverBg: 'rgba(217,178,106,0.08)',
      },
      Table: {
        headerBg: '#fafafa',
        rowHoverBg: 'rgba(217,178,106,0.06)',
      },
      Input: {
        activeBorderColor: '#D9B26A',
        hoverBorderColor: 'rgba(217,178,106,0.5)',
      },
      Select: {
        optionSelectedBg: 'rgba(217,178,106,0.1)',
      },
      Tabs: {
        inkBarColor: '#D9B26A',
        itemActiveColor: '#D9B26A',
        itemSelectedColor: '#D9B26A',
      },
      Tag: {
        colorPrimary: '#D9B26A',
      },
      Checkbox: {
        colorPrimary: '#D9B26A',
      },
    },
  };

  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Navigate to="/" />} />
            <Route path="/register" element={<Navigate to="/" />} />
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="stock-taking" element={<StockTaking />} />
              <Route path="stock-taking/:id" element={<StockTakingExecute />} />
              <Route path="reports" element={<Reports />} />
              <Route path="low-stock" element={<LowStock />} />
              <Route path="users" element={<UserManagement />} />
            </Route>
          </Routes>
          <GlobalSearch />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
