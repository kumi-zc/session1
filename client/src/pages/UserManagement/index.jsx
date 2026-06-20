import { useEffect, useState } from 'react';
import { Table, Typography, Card, Button, Space, Tag, message, Modal, Input, Tabs, Popconfirm } from 'antd';
import { CheckOutlined, CloseOutlined, UserOutlined, LockOutlined, SettingOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [changePwdModal, setChangePwdModal] = useState(null);
  const [changePwdForm, setChangePwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const approveUser = async (id) => {
    try {
      await api.put(`/auth/users/${id}/approve`);
      message.success('User approved');
      fetchUsers();
    } catch (err) {
      message.error('Failed to approve');
    }
  };

  const rejectUser = async (id) => {
    try {
      await api.put(`/auth/users/${id}/reject`);
      message.success('User rejected');
      fetchUsers();
    } catch (err) {
      message.error('Failed to reject');
    }
  };

  const changeRole = async (id, role) => {
    try {
      await api.put(`/auth/users/${id}/role`, { role });
      message.success('Role updated');
      fetchUsers();
    } catch (err) {
      message.error('Failed to update role');
    }
  };

  const handleChangePassword = async () => {
    if (changePwdForm.newPassword !== changePwdForm.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    if (changePwdForm.newPassword.length < 6) {
      message.error('Password must be at least 6 characters');
      return;
    }
    try {
      await api.put('/auth/change-password', {
        oldPassword: changePwdForm.oldPassword,
        newPassword: changePwdForm.newPassword,
      });
      message.success('Password changed');
      setChangePwdModal(null);
      setChangePwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed to change password');
    }
  };

  const pendingUsers = users.filter(u => u.status === 'PENDING');
  const approvedUsers = users.filter(u => u.status === 'APPROVED');
  const rejectedUsers = users.filter(u => u.status === 'REJECTED');

  const userColumns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role, record) => (
        <Tag color={role === 'ADMIN' ? 'purple' : 'blue'}>{role}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colors = { PENDING: 'orange', APPROVED: 'green', REJECTED: 'red' };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
    {
      title: 'Joined',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (v) => new Date(v).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          {record.status === 'PENDING' && (
            <>
              <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => approveUser(record.id)}>Approve</Button>
              <Popconfirm title="Reject this user?" onConfirm={() => rejectUser(record.id)}>
                <Button size="small" danger icon={<CloseOutlined />}>Reject</Button>
              </Popconfirm>
            </>
          )}
          {record.status === 'APPROVED' && (
            <Button size="small" icon={<SettingOutlined />}
              onClick={() => changeRole(record.id, record.role === 'ADMIN' ? 'COUNTER' : 'ADMIN')}>
              {record.role === 'ADMIN' ? 'Set Counter' : 'Set Admin'}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          User Management
        </Title>
        <Button icon={<LockOutlined />} onClick={() => setChangePwdModal(true)}>
          Change My Password
        </Button>
      </div>

      <Tabs defaultActiveKey="pending" items={[
        {
          key: 'pending',
          label: <Space>Pending Approval <Tag color="orange">{pendingUsers.length}</Tag></Space>,
          children: (
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Table dataSource={pendingUsers} columns={userColumns} rowKey="id" loading={loading} pagination={false}
                locale={{ emptyText: 'No pending users' }}
              />
            </Card>
          ),
        },
        {
          key: 'approved',
          label: <Space>Approved <Tag color="green">{approvedUsers.length}</Tag></Space>,
          children: (
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Table dataSource={approvedUsers} columns={userColumns} rowKey="id" loading={loading} pagination={false}
                locale={{ emptyText: 'No approved users' }}
              />
            </Card>
          ),
        },
        {
          key: 'rejected',
          label: <Space>Rejected <Tag color="red">{rejectedUsers.length}</Tag></Space>,
          children: (
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Table dataSource={rejectedUsers} columns={userColumns} rowKey="id" loading={loading} pagination={false}
                locale={{ emptyText: 'No rejected users' }}
              />
            </Card>
          ),
        },
      ]} />

      {/* Change Password Modal */}
      <Modal
        title="Change Password"
        open={!!changePwdModal}
        onCancel={() => { setChangePwdModal(null); setChangePwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}
        onOk={handleChangePassword}
        width={400}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>Current Password</Text>
            <Input.Password value={changePwdForm.oldPassword} onChange={(e) => setChangePwdForm({ ...changePwdForm, oldPassword: e.target.value })} />
          </div>
          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>New Password</Text>
            <Input.Password value={changePwdForm.newPassword} onChange={(e) => setChangePwdForm({ ...changePwdForm, newPassword: e.target.value })} />
          </div>
          <div>
            <Text style={{ display: 'block', marginBottom: 4 }}>Confirm New Password</Text>
            <Input.Password value={changePwdForm.confirmPassword} onChange={(e) => setChangePwdForm({ ...changePwdForm, confirmPassword: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
