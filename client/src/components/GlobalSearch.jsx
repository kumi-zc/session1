import { useState, useEffect } from 'react';
import { Modal, Input, List, Typography, Space } from 'antd';
import { SearchOutlined, DatabaseOutlined, AuditOutlined, BarChartOutlined, WarningOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

const menuItems = [
  { key: '/dashboard', icon: <DatabaseOutlined />, label: 'Dashboard', keywords: ['home', 'overview'] },
  { key: '/dashboard/inventory', icon: <DatabaseOutlined />, label: 'Inventory', keywords: ['products', 'stock', 'items'] },
  { key: '/dashboard/stock-taking', icon: <AuditOutlined />, label: 'Stock Taking', keywords: ['count', 'tasks'] },
  { key: '/dashboard/reports', icon: <BarChartOutlined />, label: 'Reports', keywords: ['export', 'excel'] },
  { key: '/dashboard/low-stock', icon: <WarningOutlined />, label: 'Low Stock', keywords: ['alerts', 'warning'] },
  { key: '/dashboard/users', icon: <UserOutlined />, label: 'Users', keywords: ['admin', 'manage'] },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredItems = query
    ? menuItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.keywords.some(k => k.includes(query.toLowerCase()))
      )
    : menuItems;

  const handleSelect = (key) => {
    navigate(key);
    setOpen(false);
    setQuery('');
  };

  return (
    <Modal
      open={open}
      onCancel={() => { setOpen(false); setQuery(''); }}
      footer={null}
      width={480}
      closable={false}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          placeholder="Search pages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          bordered={false}
          style={{ fontSize: 16 }}
        />
      </div>
      <List
        dataSource={filteredItems}
        renderItem={(item) => (
          <List.Item
            style={{ cursor: 'pointer', padding: '10px 16px' }}
            onClick={() => handleSelect(item.key)}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <Space>
              <span style={{ color: '#8c8c8c' }}>{item.icon}</span>
              <Text>{item.label}</Text>
            </Space>
          </List.Item>
        )}
      />
      <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
        <Text type="secondary" style={{ fontSize: 11 }}>Press Ctrl+K to open • Esc to close</Text>
      </div>
    </Modal>
  );
}
