import { useEffect, useState } from 'react';
import { Table, Typography, Card, Row, Col, Statistic, Tag, Empty, Spin, Progress, Button, Space } from 'antd';
import { WarningOutlined, AlertOutlined, ArrowDownOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const { Title, Text } = Typography;

export default function LowStock() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = () => {
    setLoading(true);
    api.get('/stock/alerts')
      .then(res => setAlerts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, []);

  const totalShortage = alerts.reduce((sum, a) => sum + (a.product.safetyStock - a.quantity), 0);

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'product',
      key: 'name',
      render: (p) => <Text strong>{p?.name}</Text>,
    },
    {
      title: 'SKU',
      dataIndex: 'product',
      key: 'sku',
      width: 120,
      render: (p) => <Text code>{p?.sku}</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'product',
      key: 'category',
      width: 100,
      render: (p) => p?.category ? <Tag>{p.category}</Tag> : '-',
    },
    {
      title: 'Current Stock',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (v) => <Text style={{ color: '#ff4d4f', fontWeight: 600, fontSize: 16 }}>{v}</Text>,
    },
    {
      title: 'Safety Stock',
      dataIndex: 'product',
      key: 'safetyStock',
      width: 120,
      render: (p) => <Text>{p?.safetyStock}</Text>,
    },
    {
      title: 'Shortage',
      key: 'shortage',
      width: 100,
      render: (_, r) => {
        const shortage = r.product.safetyStock - r.quantity;
        return <Tag color="red">-{shortage}</Tag>;
      },
    },
    {
      title: 'Stock Level',
      key: 'level',
      width: 180,
      render: (_, r) => {
        const percent = r.product.safetyStock > 0
          ? Math.round((r.quantity / r.product.safetyStock) * 100)
          : 0;
        return (
          <div>
            <Progress
              percent={percent}
              size="small"
              status="exception"
              strokeColor="#ff4d4f"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{percent}% of safety</Text>
          </div>
        );
      },
    },
    {
      title: 'Location',
      dataIndex: 'product',
      key: 'location',
      width: 80,
      render: (p) => <Text type="secondary">{p?.location || '-'}</Text>,
    },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Low Stock Alerts
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAlerts}>Refresh</Button>
          <Button onClick={() => navigate('/dashboard/inventory')}>View Inventory</Button>
        </Space>
      </div>

      {/* Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, backgroundColor: '#fff2f0' }}>
            <Statistic
              title="Low Stock Items"
              value={alerts.length}
              suffix="items"
              prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, backgroundColor: '#fff2f0' }}>
            <Statistic
              title="Total Shortage"
              value={totalShortage}
              suffix="pcs needed"
              prefix={<ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 12, backgroundColor: '#f6ffed' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff2f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WarningOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              </div>
              <div>
                <Text style={{ fontSize: 13, color: '#8c8c8c' }}>Action Required</Text>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#595959' }}>Restock items below safety level</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Table */}
      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          dataSource={alerts}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (total) => `${total} items below safety stock` }}
          locale={{ emptyText: <Empty description="All stock levels are healthy" /> }}
        />
      </Card>
    </div>
  );
}
