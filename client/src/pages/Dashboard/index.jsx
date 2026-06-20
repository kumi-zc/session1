import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Typography, Button, Space, Empty, Tag, Tooltip, Skeleton } from 'antd';
import CountUp from '../../components/CountUp';
import {
  DatabaseOutlined,
  AuditOutlined,
  PlusOutlined,
  BarChartOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2', '#f5222d', '#faad14'];

const statusConfig = {
  PENDING: { color: 'default', text: 'Pending' },
  IN_PROGRESS: { color: 'processing', text: 'In Progress' },
  REVIEWING: { color: 'warning', text: 'Reviewing' },
  COMPLETED: { color: 'success', text: 'Completed' },
  ADJUSTED: { color: 'success', text: 'Adjusted' },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <Text strong style={{ fontSize: 13 }}>{label}</Text>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, marginTop: 2 }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [movements, setMovements] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/summary').then(r => setSummary(r.data)),
      api.get('/reports/inventory-overview').then(r => setOverview(r.data)),
      api.get('/reports/stock-distribution').then(r => setDistribution(r.data)),
      api.get('/reports/movements').then(r => setMovements(r.data)),
      api.get('/reports/trend').then(r => setTrend(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const stats = summary || { totalProducts: 0, totalTasks: 0, lowStockCount: 0, recentTasks: [] };
  const totalStockQty = distribution.reduce((sum, d) => sum + d.value, 0);

  // Bar chart: inventory by category
  const barData = overview ? Object.entries(overview).map(([name, v]) => ({
    name,
    Quantity: v.totalQty,
    Value: v.totalValue,
  })) : [];

  // Pie chart: real stock distribution by product
  const pieData = distribution.length > 0
    ? distribution.map(d => ({ name: d.name, value: d.value }))
    : [];

  // Movement summary for today
  const today = new Date().toISOString().slice(0, 10);
  const todayMovements = movements.filter(m => m.createdAt?.startsWith(today));
  const stockInToday = todayMovements.filter(m => m.type === 'IN' || m.type === 'STOCK_IN').reduce((s, m) => s + m.quantity, 0);
  const stockOutToday = todayMovements.filter(m => m.type === 'OUT' || m.type === 'STOCK_OUT').reduce((s, m) => s + m.quantity, 0);

  if (loading) return (
    <div>
      <Skeleton active paragraph={{ rows: 0 }} style={{ marginBottom: 16 }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[1,2,3].map(i => (
          <Col xs={24} sm={8} key={i}>
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <div>
      {/* Welcome Header */}
      <div style={{
        background: 'linear-gradient(135deg, #5B0A0A 0%, #3D0A0A 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 20, color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <Title level={3} style={{ color: '#D9B26A', margin: 0, fontWeight: 600 }}>Welcome, {user?.username}</Title>
          <Text style={{ color: 'rgba(217,178,106,0.7)', fontSize: 14 }}>Here's your inventory overview</Text>
        </div>
        <Space size={12}>
          {user?.role === 'ADMIN' && (
            <Button icon={<PlusOutlined />} onClick={() => navigate('/dashboard/stock-taking')}
              style={{ background: 'rgba(217,178,106,0.15)', borderColor: 'rgba(217,178,106,0.4)', color: '#D9B26A' }}>
              New Task
            </Button>
          )}
          <Button onClick={() => navigate('/dashboard/reports')}
            style={{ background: 'rgba(217,178,106,0.15)', borderColor: 'rgba(217,178,106,0.4)', color: '#D9B26A' }}>
            View Reports
          </Button>
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Products', value: stats.totalProducts, icon: <DatabaseOutlined />, bg: '#e6f7ff', color: '#1890ff' },
          { label: 'Total Stock', value: totalStockQty, icon: <AuditOutlined />, bg: '#f9f0ff', color: '#722ed1' },
          { label: 'Low Stock Alert', value: stats.lowStockCount, icon: <WarningOutlined />, bg: stats.lowStockCount > 0 ? '#fff2f0' : '#f6ffed', color: stats.lowStockCount > 0 ? '#ff4d4f' : '#52c41a' },
        ].map((s, i) => (
          <Col xs={24} sm={8} key={i}>
            <Card bordered={false} style={{ borderRadius: 12 }} bodyStyle={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text style={{ fontSize: 13, color: '#8c8c8c' }}>{s.label}</Text>
                  <div style={{ fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1.3 }}>
                    <CountUp target={s.value} duration={800} />
                  </div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: s.color }}>
                  {s.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Bar Chart */}
        <Col xs={24} lg={14}>
          <Card bordered={false} style={{ borderRadius: 12 }}
            title={<Space><BarChartOutlined style={{ color: '#fa8c16', fontSize: 16 }} /><Text strong style={{ fontSize: 15 }}>Inventory by Category</Text></Space>}
          >
            {barData.length === 0 ? <Empty description="No inventory data" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} barSize={40} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#595959' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#8c8c8c' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="Quantity" radius={[6, 6, 0, 0]} fill="#1890ff" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Pie Chart - Real distribution */}
        <Col xs={24} lg={10}>
          <Card bordered={false} style={{ borderRadius: 12 }}
            title={<Space><DatabaseOutlined style={{ color: '#722ed1', fontSize: 16 }} /><Text strong style={{ fontSize: 15 }}>Stock Distribution</Text></Space>}
          >
            {pieData.length === 0 ? <Empty description="No stock data" /> : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <ResponsiveContainer width="45%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} pcs`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ maxHeight: 220, overflow: 'auto', flex: 1, paddingRight: 4 }}>
                  {pieData.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <Text style={{ fontSize: 12, color: '#595959', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Text>
                      <Text strong style={{ fontSize: 12 }}>{item.value}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Trend Chart */}
      {trend.length > 0 && (
        <Card bordered={false} style={{ borderRadius: 12, marginBottom: 20 }}
          title={<Space><BarChartOutlined style={{ color: '#52c41a', fontSize: 16 }} /><Text strong style={{ fontSize: 15 }}>Stock Movement Trend</Text></Space>}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#595959' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8c8c8c' }} axisLine={false} tickLine={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Area type="monotone" dataKey="stockIn" stroke="#52c41a" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} name="Stock In" />
              <Area type="monotone" dataKey="stockOut" stroke="#ff4d4f" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} name="Stock Out" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Today's Movement + Recent Tasks */}
      <Row gutter={[16, 16]}>
        {/* Today Summary */}
        <Col xs={24} lg={8}>
          <Card bordered={false} style={{ borderRadius: 12 }}
            title={<Text strong style={{ fontSize: 15 }}>Today's Activity</Text>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f6ffed', borderRadius: 8 }}>
                <ArrowUpOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                <div>
                  <Text style={{ fontSize: 13, color: '#8c8c8c' }}>Stock In</Text>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#52c41a' }}>{stockInToday}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff2f0', borderRadius: 8 }}>
                <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                <div>
                  <Text style={{ fontSize: 13, color: '#8c8c8c' }}>Stock Out</Text>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ff4d4f' }}>{stockOutToday}</div>
                </div>
              </div>
              <div style={{ padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
                <Text style={{ fontSize: 13, color: '#8c8c8c' }}>Recent Movements</Text>
                <div style={{ marginTop: 8, maxHeight: 160, overflow: 'auto' }}>
                  {movements.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 13 }}>No movements yet</Text>
                  ) : (
                    movements.slice(0, 5).map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                        <Text style={{ fontSize: 13 }}>{m.product?.name}</Text>
                        <Tag color={m.type === 'IN' || m.type === 'STOCK_IN' ? 'green' : 'red'} style={{ margin: 0 }}>
                          {m.type === 'IN' || m.type === 'STOCK_IN' ? '+' : '-'}{m.quantity}
                        </Tag>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* Recent Tasks */}
        <Col xs={24} lg={16}>
          <Card bordered={false} style={{ borderRadius: 12 }}
            title={<Text strong style={{ fontSize: 15 }}>Recent Tasks</Text>}
            extra={<Button type="link" onClick={() => navigate('/dashboard/stock-taking')}>View All</Button>}
          >
            {stats.recentTasks.length === 0 ? (
              <Empty description="No tasks yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.recentTasks.map(task => (
                  <div key={task.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: '#fafafa', borderRadius: 8, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                    onClick={() => navigate(`/dashboard/stock-taking/${task.id}`)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
                  >
                    <Space size={16}>
                      <Text strong style={{ fontSize: 14 }}>{task.code}</Text>
                      <Tag color={statusConfig[task.status]?.color} style={{ margin: 0 }}>{statusConfig[task.status]?.text}</Tag>
                    </Space>
                    <Space size={20}>
                      <Text style={{ fontSize: 13, color: '#8c8c8c' }}>{task.assignee?.username}</Text>
                      <Text style={{ fontSize: 12, color: '#bfbfbf' }}>{new Date(task.createdAt).toLocaleDateString()}</Text>
                    </Space>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
