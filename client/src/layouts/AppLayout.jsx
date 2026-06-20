import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Button, Space, Avatar, Dropdown, theme } from 'antd';
import PageTransition from '../components/PageTransition';
import {
  DashboardOutlined,
  DatabaseOutlined,
  AuditOutlined,
  BarChartOutlined,
  WarningOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/dashboard/inventory', icon: <DatabaseOutlined />, label: 'Inventory' },
  { key: '/dashboard/stock-taking', icon: <AuditOutlined />, label: 'Stock Taking' },
  { key: '/dashboard/reports', icon: <BarChartOutlined />, label: 'Reports' },
  { key: '/dashboard/low-stock', icon: <WarningOutlined />, label: 'Low Stock' },
  { key: '/dashboard/users', icon: <SettingOutlined />, label: 'Users', adminOnly: true },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-collapse on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (window.innerWidth <= 768) setCollapsed(true);
  }, [location.pathname]);

  const { token: { colorBgContainer } } = theme.useToken();

  // Determine selected menu key based on pathname
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/dashboard') return '/dashboard';
    if (path.startsWith('/dashboard/inventory')) return '/dashboard/inventory';
    if (path.startsWith('/dashboard/stock-taking')) return '/dashboard/stock-taking';
    if (path.startsWith('/dashboard/reports')) return '/dashboard/reports';
    if (path.startsWith('/dashboard/low-stock')) return '/dashboard/low-stock';
    if (path.startsWith('/dashboard/users')) return '/dashboard/users';
    return '/dashboard';
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: () => {
        logout();
        navigate('/');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          background: 'linear-gradient(180deg, #3D0A0A 0%, #2A0606 100%)',
        }}
      >
        {/* Logo */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(217,178,106,0.15)',
          padding: '0 12px',
        }}>
          <img
            src="/dls-logo.png"
            alt="DLS Germany"
            style={{
              height: collapsed ? 36 : 44,
              maxWidth: collapsed ? 36 : 140,
              objectFit: 'contain',
            }}
          />
        </div>

        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems.filter(item => !item.adminOnly || user?.role === 'ADMIN')}
          onClick={({ key }) => navigate(key)}
          style={{
            borderRight: 0,
            background: 'transparent',
          }}
          className="dls-menu"
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 9,
          borderBottom: '1px solid rgba(217,178,106,0.1)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, color: '#5B0A0A' }}
          />

          <Space>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#D9B26A' }}
                />
                <Text strong>{user?.username}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: 24,
          minHeight: 280,
        }}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </Content>
      </Layout>
    </Layout>
  );
}
