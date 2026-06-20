import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Typography, Space, InputNumber, Tag, message, Card, Row, Col, Progress, Empty, Spin, Alert, Tooltip } from 'antd';
import {
  SaveOutlined,
  CheckOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const statusConfig = {
  PENDING: { color: 'default', text: 'Pending' },
  IN_PROGRESS: { color: 'processing', text: 'In Progress' },
  REVIEWING: { color: 'warning', text: 'Reviewing' },
  COMPLETED: { color: 'success', text: 'Completed' },
  ADJUSTED: { color: 'success', text: 'Adjusted' },
};

export default function StockTakingExecute() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
      setItems(res.data.items.map(i => ({ ...i, actualQty: i.actualQty ?? undefined })));
    } catch (err) {
      message.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTask(); }, [id]);

  const updateItem = (itemId, value) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, actualQty: value } : i));
  };

  const saveItems = async () => {
    setSaving(true);
    try {
      const toSave = items.filter(i => i.actualQty !== undefined && i.actualQty !== null).map(i => ({ itemId: i.id, actualQty: i.actualQty }));
      await api.put(`/tasks/${id}/items`, { items: toSave });
      message.success('Saved');
      fetchTask();
    } catch (err) {
      message.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    try {
      await api.post(`/tasks/${id}/review`, { action: 'submit' });
      message.success('Submitted for review');
      fetchTask();
    } catch (err) {
      message.error(err.response?.data?.error || 'Submit failed');
    }
  };

  const approveAndAdjust = async () => {
    try {
      await api.post(`/tasks/${id}/review`, { action: 'approve' });
      message.success('Approved & stock adjusted');
      fetchTask();
    } catch (err) {
      message.error(err.response?.data?.error || 'Approval failed');
    }
  };

  if (loading && !task) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  if (!task) return null;

  const counted = items.filter(i => i.actualQty !== undefined && i.actualQty !== null).length;
  const diffItems = items.filter(i => i.actualQty !== undefined && i.actualQty !== null && i.actualQty !== i.systemQty);
  const gainItems = diffItems.filter(i => i.actualQty > i.systemQty);
  const lossItems = diffItems.filter(i => i.actualQty < i.systemQty);
  const totalGain = gainItems.reduce((sum, i) => sum + (i.actualQty - i.systemQty), 0);
  const totalLoss = lossItems.reduce((sum, i) => sum + (i.systemQty - i.actualQty), 0);
  const progressPercent = items.length > 0 ? Math.round((counted / items.length) * 100) : 0;
  const isEditable = task.status === 'PENDING' || task.status === 'IN_PROGRESS';
  const config = statusConfig[task.status] || { color: 'default', text: task.status };

  const columns = [
    { title: 'SKU', dataIndex: 'product', key: 'sku', width: 120, render: (v) => <Text code>{v?.sku}</Text> },
    { title: 'Item Name', dataIndex: 'product', key: 'name', render: (v) => <Text strong>{v?.name}</Text> },
    { title: 'System Qty', dataIndex: 'systemQty', key: 'systemQty', width: 100 },
    {
      title: 'Actual Qty', key: 'actualQty', width: 130,
      render: (_, record) => isEditable ? (
        <InputNumber min={0} value={record.actualQty} onChange={(v) => updateItem(record.id, v)} style={{ width: 110 }} placeholder="Enter qty" />
      ) : <Text strong>{record.actualQty ?? '-'}</Text>,
    },
    {
      title: 'Diff', key: 'diff', width: 120,
      render: (_, record) => {
        if (record.actualQty === undefined || record.actualQty === null) return <Text type="secondary">N/A</Text>;
        const diff = record.actualQty - record.systemQty;
        if (diff === 0) return <Tag icon={<MinusOutlined />} color="default">Match</Tag>;
        return <Tag color={diff > 0 ? 'green' : 'red'} icon={diff > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>{diff > 0 ? '+' : ''}{diff}</Tag>;
      },
    },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 80, render: (v) => <Tag color={v === 'PENDING' ? 'default' : 'success'}>{v === 'PENDING' ? 'Pending' : 'Counted'}</Tag> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard/stock-taking')}>Back</Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>Stock Take - {task.code}</Title>
            <Space style={{ marginTop: 4 }}>
              <Tag color={config.color}>{config.text}</Tag>
              <Text type="secondary">Assignee: {task.assignee?.username}</Text>
            </Space>
          </div>
        </Space>
        <Space>
          {isEditable && <Button type="primary" icon={<SaveOutlined />} onClick={saveItems} loading={saving}>Save</Button>}
          {task.status === 'IN_PROGRESS' && <Button icon={<CheckOutlined />} onClick={submitForReview}>Submit for Review</Button>}
          {task.status === 'REVIEWING' && user?.role === 'ADMIN' && <Button type="primary" danger icon={<CheckCircleOutlined />} onClick={approveAndAdjust}>Approve & Adjust</Button>}
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary">Progress</Text>
                <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{progressPercent}%</div>
                <Text type="secondary" style={{ fontSize: 12 }}>{counted}/{items.length} counted</Text>
              </div>
              <Progress type="circle" percent={progressPercent} size={64} strokeColor={progressPercent === 100 ? '#52c41a' : '#1890ff'} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary">Overage</Text>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a', marginTop: 4 }}>+{totalGain}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>{gainItems.length} items</Text>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#52c41a' }}><ArrowUpOutlined /></div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered={false} style={{ borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text type="secondary">Shortage</Text>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f', marginTop: 4 }}>-{totalLoss}</div>
                <Text type="secondary" style={{ fontSize: 12 }}>{lossItems.length} items</Text>
              </div>
              <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#fff2f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#ff4d4f' }}><ArrowDownOutlined /></div>
            </div>
          </Card>
        </Col>
      </Row>

      {task.status === 'REVIEWING' && <Alert message="Awaiting Review" description="All items counted. Admin please review and approve." type="info" showIcon icon={<FileSearchOutlined />} style={{ marginBottom: 16 }} />}
      {task.status === 'ADJUSTED' && <Alert message="Stock Take Complete" description="Inventory has been adjusted based on count results." type="success" showIcon style={{ marginBottom: 16 }} />}

      <Card bordered={false} style={{ borderRadius: 8 }}>
        <Table dataSource={items} columns={columns} rowKey="id" loading={loading} pagination={false}
          locale={{ emptyText: <Empty description="No items" /> }}
          rowClassName={(record) => {
            if (record.actualQty === undefined || record.actualQty === null) return '';
            const diff = record.actualQty - record.systemQty;
            if (diff > 0) return 'row-gain';
            if (diff < 0) return 'row-loss';
            return 'row-match';
          }}
        />
      </Card>
    </div>
  );
}
