import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Typography, Space, Tag, message, Card, Empty, Progress, Tooltip, Tabs, Modal, Select, Input, Popconfirm } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;

const statusConfig = {
  PENDING: { color: 'default', icon: <ClockCircleOutlined />, text: 'Pending' },
  IN_PROGRESS: { color: 'processing', icon: <SyncOutlined spin />, text: 'In Progress' },
  REVIEWING: { color: 'warning', icon: <FileSearchOutlined />, text: 'Reviewing' },
  COMPLETED: { color: 'success', icon: <CheckCircleOutlined />, text: 'Completed' },
  ADJUSTED: { color: 'success', icon: <CheckCircleOutlined />, text: 'Adjusted' },
};

export default function StockTaking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportModal, setReportModal] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [newTask, setNewTask] = useState({ type: 'FULL', assigneeId: null, category: '', area: '' });

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      message.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch {}
  };

  useEffect(() => { fetchTasks(); fetchUsers(); }, []);

  const createTask = async () => {
    try {
      const payload = { type: newTask.type };
      if (newTask.assigneeId) payload.assigneeId = newTask.assigneeId;
      if (newTask.type === 'CATEGORY' && newTask.category) payload.category = newTask.category;
      if (newTask.type === 'AREA' && newTask.area) payload.area = newTask.area;
      await api.post('/tasks', payload);
      message.success('Task created');
      setCreateModalOpen(false);
      setNewTask({ type: 'FULL', assigneeId: null, category: '', area: '' });
      fetchTasks();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to create');
    }
  };

  const deleteTask = async (id) => {
    try {
      await api.delete(`/tasks/${id}`);
      message.success('Task deleted');
      fetchTasks();
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const viewReport = async (taskId) => {
    setReportModal(taskId);
    setReportLoading(true);
    try {
      const res = await api.get(`/reports/diff/${taskId}`);
      setReportData(res.data);
    } catch {
      message.error('Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const activeTasks = tasks.filter(t => ['PENDING', 'IN_PROGRESS', 'REVIEWING'].includes(t.status));
  const historyTasks = tasks.filter(t => ['COMPLETED', 'ADJUSTED'].includes(t.status));

  const activeColumns = [
    { title: 'Task No.', dataIndex: 'code', key: 'code', width: 200, render: (text) => <Text strong>{text}</Text> },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      render: (status) => { const config = statusConfig[status] || { color: 'default', text: status }; return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>; },
    },
    { title: 'Assignee', key: 'assignee', width: 100, render: (_, r) => r.assignee?.username || '-' },
    {
      title: 'Progress', key: 'progress', width: 180,
      render: (_, r) => {
        const total = r.items?.length || 0;
        const counted = r.items?.filter(i => i.status !== 'PENDING').length || 0;
        const percent = total > 0 ? Math.round((counted / total) * 100) : 0;
        return (
          <div>
            <Progress percent={percent} size="small" status={percent === 100 ? 'success' : 'active'} />
            <Text type="secondary" style={{ fontSize: 12 }}>{counted}/{total} items</Text>
          </div>
        );
      },
    },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 120, render: (v) => new Date(v).toLocaleDateString() },
    {
      title: '', key: 'action', width: 160,
      render: (_, record) => {
        const isEditable = record.status === 'PENDING' || record.status === 'IN_PROGRESS';
        return (
          <Space>
            <Button type={isEditable ? 'primary' : 'default'} size="small" icon={isEditable ? <EditOutlined /> : <EyeOutlined />} onClick={() => navigate(`/dashboard/stock-taking/${record.id}`)}>
              {isEditable ? 'Count' : 'View'}
            </Button>
            {user?.role === 'ADMIN' && record.status !== 'ADJUSTED' && (
              <Popconfirm title="Delete this task?" onConfirm={() => deleteTask(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const historyColumns = [
    { title: 'Task No.', dataIndex: 'code', key: 'code', width: 200, render: (text) => <Text strong>{text}</Text> },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      render: (status) => { const config = statusConfig[status] || { color: 'default', text: status }; return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>; },
    },
    { title: 'Assignee', key: 'assignee', width: 100, render: (_, r) => r.assignee?.username || '-' },
    {
      title: 'Result', key: 'result', width: 200,
      render: (_, r) => {
        const total = r.items?.length || 0;
        const counted = r.items?.filter(i => i.status !== 'PENDING').length || 0;
        const diffItems = r.items?.filter(i => i.actualQty !== null && i.actualQty !== i.systemQty) || [];
        const overage = diffItems.filter(i => i.actualQty > i.systemQty).length;
        const shortage = diffItems.filter(i => i.actualQty < i.systemQty).length;
        return (
          <Space size={12}>
            <Text>{counted}/{total} counted</Text>
            {overage > 0 && <Tag color="green">+{overage}</Tag>}
            {shortage > 0 && <Tag color="red">-{shortage}</Tag>}
          </Space>
        );
      },
    },
    { title: 'Completed', dataIndex: 'completedAt', key: 'completedAt', width: 120, render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
    {
      title: '', key: 'action', width: 200,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/dashboard/stock-taking/${record.id}`)}>View</Button>
          <Button size="small" icon={<BarChartOutlined />} onClick={() => viewReport(record.id)}>Report</Button>
          {user?.role === 'ADMIN' && record.status !== 'ADJUSTED' && (
            <Popconfirm title="Delete this task?" onConfirm={() => deleteTask(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Stock Taking</Title>
        {user?.role === 'ADMIN' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>New Task</Button>
        )}
      </div>

      <Tabs defaultActiveKey="active" items={[
        {
          key: 'active',
          label: <Space><SyncOutlined />Active ({activeTasks.length})</Space>,
          children: (
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Table dataSource={activeTasks} columns={activeColumns} rowKey="id" loading={loading}
                pagination={{ pageSize: 10, showTotal: (total) => `${total} tasks` }}
                locale={{ emptyText: <Empty description="No active tasks. Click 'New Task' to create one." /> }}
              />
            </Card>
          ),
        },
        {
          key: 'history',
          label: <Space><HistoryOutlined />History ({historyTasks.length})</Space>,
          children: (
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Table dataSource={historyTasks} columns={historyColumns} rowKey="id" loading={loading}
                pagination={{ pageSize: 10, showTotal: (total) => `${total} completed tasks` }}
                locale={{ emptyText: <Empty description="No completed tasks yet." /> }}
              />
            </Card>
          ),
        },
      ]} />

      {/* Report Modal */}
      <Modal
        title={`Report - ${reportModal ? tasks.find(t => t.id === reportModal)?.code || '' : ''}`}
        open={!!reportModal}
        onCancel={() => { setReportModal(null); setReportData(null); }}
        footer={null}
        width={900}
      >
        {reportLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : reportData ? (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color="green">Overage: {reportData.summary.stockGain} pcs (+¥{reportData.summary.totalGainAmount.toFixed(2)})</Tag>
              <Tag color="red">Shortage: {reportData.summary.stockLoss} pcs (profit ¥{reportData.summary.totalLossAmount.toFixed(2)})</Tag>
              <Tag color={reportData.summary.totalLossAmount - reportData.summary.totalGainAmount >= 0 ? 'green' : 'red'}>
                Net: ¥{(reportData.summary.totalLossAmount - reportData.summary.totalGainAmount).toFixed(2)}
              </Tag>
            </Space>
            <Table
              dataSource={reportData.items}
              rowKey="productId"
              pagination={false}
              size="small"
              columns={[
                { title: 'SKU', dataIndex: 'sku', width: 100 },
                { title: 'Item', dataIndex: 'name' },
                { title: 'System', dataIndex: 'systemQty', width: 70 },
                { title: 'Actual', dataIndex: 'actualQty', width: 70 },
                {
                  title: 'Diff', dataIndex: 'diff', width: 70,
                  render: (v) => v === 0 ? '-' : <Tag color={v > 0 ? 'green' : 'red'}>{v > 0 ? '+' : ''}{v}</Tag>,
                },
                {
                  title: 'Amount', dataIndex: 'diffAmount', width: 120,
                  render: (v, r) => r.diff === 0 ? '-' : <Text style={{ color: r.diff > 0 ? '#fa8c16' : '#52c41a', fontWeight: 600 }}>
                    {r.diff > 0 ? '-' : '+'}¥{v.toFixed(2)}
                  </Text>,
                },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      {/* Create Task Modal */}
      <Modal
        title="Create Stock Taking Task"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={createTask}
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>Task Type</Text>
            <Select value={newTask.type} onChange={(v) => setNewTask({ ...newTask, type: v })} style={{ width: '100%' }}>
              <Select.Option value="FULL">Full Inventory</Select.Option>
              <Select.Option value="CATEGORY">By Category</Select.Option>
              <Select.Option value="AREA">By Area</Select.Option>
            </Select>
          </div>
          {newTask.type === 'CATEGORY' && (
            <div>
              <Text style={{ display: 'block', marginBottom: 6 }}>Category</Text>
              <Input placeholder="e.g. Electronics" value={newTask.category} onChange={(e) => setNewTask({ ...newTask, category: e.target.value })} />
            </div>
          )}
          {newTask.type === 'AREA' && (
            <div>
              <Text style={{ display: 'block', marginBottom: 6 }}>Area</Text>
              <Input placeholder="e.g. A-01" value={newTask.area} onChange={(e) => setNewTask({ ...newTask, area: e.target.value })} />
            </div>
          )}
          <div>
            <Text style={{ display: 'block', marginBottom: 6 }}>Assign To</Text>
            <Select
              placeholder="Select assignee (optional)"
              value={newTask.assigneeId}
              onChange={(v) => setNewTask({ ...newTask, assigneeId: v })}
              allowClear
              style={{ width: '100%' }}
            >
              {users.map(u => (
                <Select.Option key={u.id} value={u.id}>{u.username} ({u.role})</Select.Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
