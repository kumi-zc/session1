import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Typography, message, Modal, Steps } from 'antd';
import { UserOutlined, LockOutlined, KeyOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';

const { Text } = Typography;

export default function Welcome() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(0);
  const [forgotData, setForgotData] = useState({ username: '', resetCode: '', newPassword: '', confirmPassword: '' });
  const [resetResult, setResetResult] = useState(null);
  const [regForm] = Form.useForm();

  const onLogin = async (values) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('Login successful');
      navigate('/dashboard');
    } catch (err) {
      message.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', values);
      if (res.data?.pending) {
        message.info('Registration successful! Please wait for admin approval.');
        setShowRegister(false);
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async () => {
    try {
      const res = await api.post('/auth/forgot-password', { username: forgotData.username });
      setResetResult(res.data);
      setForgotStep(1);
    } catch (err) {
      message.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleResetPassword = async () => {
    if (forgotData.newPassword !== forgotData.confirmPassword) {
      message.error('Passwords do not match');
      return;
    }
    try {
      await api.post('/auth/reset-password', {
        username: forgotData.username,
        resetCode: forgotData.resetCode,
        newPassword: forgotData.newPassword,
      });
      message.success('Password reset successful');
      setForgotOpen(false);
      setForgotStep(0);
      setForgotData({ username: '', resetCode: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      message.error(err.response?.data?.error || 'Reset failed');
    }
  };

  const inputStyle = {
    height: 46,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(217,178,106,0.25)',
    color: '#fff',
    fontSize: 14,
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Full background image */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />

      {/* Gradient transition from image to right panel */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '50%',
        height: '100%',
        background: 'linear-gradient(to right, transparent 0%, rgba(18,8,5,0.7) 30%, rgba(18,8,5,0.92) 60%, rgba(18,8,5,0.96) 100%)',
      }} />

      {/* Form content - positioned on right side */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '42%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 50px',
        zIndex: 3,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <Text style={{
            color: '#D9B26A',
            fontSize: 46,
            fontWeight: 300,
            fontFamily: 'Georgia, "Times New Roman", serif',
            letterSpacing: 8,
            lineHeight: 1,
          }}>DLS</Text>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
            <div style={{ width: 35, height: 1, background: 'linear-gradient(90deg, transparent, #D9B26A)' }} />
            <Text style={{ color: '#D9B26A', fontSize: 12, letterSpacing: 7, fontFamily: 'Georgia, serif' }}>GERMANY</Text>
            <div style={{ width: 35, height: 1, background: 'linear-gradient(270deg, transparent, #D9B26A)' }} />
          </div>
        </div>

        {/* Title */}
        <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 6, fontWeight: 600, fontSize: 18, letterSpacing: 0.5 }}>
          Stock Taking Management System
        </h2>
        <Text style={{ color: 'rgba(217,178,106,0.5)', fontSize: 11, letterSpacing: 1.5, display: 'block', textAlign: 'center', marginBottom: 32 }}>
          Smart Inventory • Accurate Stock • Efficient Management
        </Text>

        {/* Form */}
        <div className="dark-input" style={{ width: '100%', maxWidth: 320 }}>
          {!showRegister ? (
            <Form onFinish={onLogin} size="large">
              <Form.Item name="username" rules={[{ required: true, message: 'Please enter username' }]}>
                <Input prefix={<UserOutlined style={{ color: 'rgba(217,178,106,0.4)' }} />} placeholder="Username" style={inputStyle} />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: 'Please enter password' }]}>
                <Input.Password
                  prefix={<LockOutlined style={{ color: 'rgba(217,178,106,0.4)' }} />}
                  placeholder="Password"
                  iconRender={(v) => v ? <EyeTwoTone twoToneColor="#D9B26A" /> : <EyeInvisibleOutlined style={{ color: 'rgba(217,178,106,0.4)' }} />}
                  style={inputStyle}
                />
              </Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Checkbox style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Remember Me</Checkbox>
                <a onClick={() => setForgotOpen(true)} style={{ color: '#D9B26A', fontSize: 12 }}>Forgot Password?</a>
              </div>
              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}
                  style={{ height: 44, borderRadius: 8, fontSize: 15, fontWeight: 600, background: 'linear-gradient(135deg, #D9B26A, #c4a050)', border: 'none', color: '#1a0808', letterSpacing: 2, boxShadow: '0 4px 12px rgba(217,178,106,0.2)' }}>
                  Login
                </Button>
              </Form.Item>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  Don't have an account? <a onClick={() => setShowRegister(true)} style={{ color: '#D9B26A' }}>Sign Up</a>
                </Text>
              </div>
            </Form>
          ) : (
            <Form form={regForm} onFinish={onRegister} size="large">
              <Form.Item name="username" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined style={{ color: 'rgba(217,178,106,0.4)' }} />} placeholder="Username" style={inputStyle} />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, min: 6 }]}>
                <Input.Password prefix={<LockOutlined style={{ color: 'rgba(217,178,106,0.4)' }} />} placeholder="Password (min 6 chars)" style={inputStyle} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}
                  style={{ height: 44, borderRadius: 8, fontSize: 15, fontWeight: 600, background: 'linear-gradient(135deg, #D9B26A, #c4a050)', border: 'none', color: '#1a0808', letterSpacing: 2 }}>
                  Sign Up
                </Button>
              </Form.Item>
              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  Already have an account? <a onClick={() => setShowRegister(false)} style={{ color: '#D9B26A' }}>Sign In</a>
                </Text>
              </div>
            </Form>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 320, marginTop: 40, paddingTop: 12, borderTop: '1px solid rgba(217,178,106,0.06)' }}>
          <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>Version 1.0.0</Text>
          <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10 }}>©2026 DLS Germany</Text>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal title="Reset Password" open={forgotOpen}
        onCancel={() => { setForgotOpen(false); setForgotStep(0); }}
        footer={null} width={420}>
        <Steps current={forgotStep} size="small" style={{ marginBottom: 24 }} items={[{ title: 'Username' }, { title: 'Verify' }, { title: 'New Password' }]} />
        {forgotStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input prefix={<UserOutlined />} placeholder="Username" value={forgotData.username} onChange={(e) => setForgotData({ ...forgotData, username: e.target.value })} />
            <Button type="primary" block onClick={handleForgotRequest}>Get Reset Code</Button>
          </div>
        )}
        {forgotStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {resetResult && <div style={{ padding: 12, background: '#f6ffed', borderRadius: 8 }}><Text style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>{resetResult.resetCode}</Text></div>}
            <Input prefix={<KeyOutlined />} placeholder="Reset code" value={forgotData.resetCode} onChange={(e) => setForgotData({ ...forgotData, resetCode: e.target.value })} />
            <Button type="primary" block onClick={() => setForgotStep(2)}>Verify</Button>
          </div>
        )}
        {forgotStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input.Password prefix={<LockOutlined />} placeholder="New password" value={forgotData.newPassword} onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })} />
            <Input.Password prefix={<LockOutlined />} placeholder="Confirm password" value={forgotData.confirmPassword} onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })} />
            <Button type="primary" block onClick={handleResetPassword}>Reset</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
