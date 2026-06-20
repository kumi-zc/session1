import { useEffect, useState, useRef } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, Typography, message, Tag, Tabs, Card, Tooltip, Badge, Upload, Progress } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  WarningOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import EmptyState from '../../components/EmptyState';
import { confirmDelete } from '../../components/ConfirmDialog';

const { Title, Text } = Typography;

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedType, setSelectedType] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const res = await api.get('/products', { params });
      setProducts(res.data);
    } catch (err) {
      message.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [search]);

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => p.category === activeCategory);

  const handleSave = async (values) => {
    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, values);
        message.success('Updated');
      } else {
        await api.post('/products', values);
        message.success('Created');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchProducts();
    } catch (err) {
      message.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Deleted');
      fetchProducts();
    } catch (err) {
      message.error('Delete failed');
    }
  };

  const handleAdjust = async (values) => {
    try {
      await api.post('/stock/movement', {
        productId: adjusting.id,
        type: selectedType,
        quantity: values.quantity,
        remark: values.remark,
      });
      const labels = { SET: 'Stock updated', IN: 'Stock added', OUT: 'Stock removed' };
      message.success(labels[selectedType] || 'Done');
      setAdjustModalOpen(false);
      adjustForm.resetFields();
      setAdjusting(null);
      setSelectedType(null);
      fetchProducts();
    } catch (err) {
      message.error(err.response?.data?.error || 'Operation failed');
    }
  };

  const handleImport = async (file) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setImportResult(data);
      if (data.success > 0) {
        message.success(`Imported ${data.success} products`);
        fetchProducts();
      }
    } catch (err) {
      message.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['SKU', 'Name', 'Category', 'Unit', 'Cost', 'Price', 'Safety Stock', 'Location', 'Stock'];
    const example = ['ITEM-001', 'Example Product', 'Electronics', 'pcs', '10.00', '20.00', '5', 'A-01', '100'];
    const csv = [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const lowStockCount = products.filter(p => (p.stock?.quantity || 0) < p.safetyStock).length;

  const columns = [
    {
      title: 'Item Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          {record.location && <div><Text type="secondary" style={{ fontSize: 12 }}>{record.location}</Text></div>}
        </div>
      ),
    },
    {
      title: 'Item No.',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      sorter: (a, b) => a.sku.localeCompare(b.sku),
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: 'Cartons',
      key: 'cartons',
      width: 100,
      sorter: (a, b) => (a.stock?.quantity || 0) - (b.stock?.quantity || 0),
      render: (_, r) => {
        const qty = r.stock?.quantity || 0;
        const isLow = qty < r.safetyStock;
        return (
          <Tooltip title={isLow ? `Below safety stock (${r.safetyStock})` : ''}>
            <span style={{
              color: isLow ? '#ff4d4f' : undefined,
              fontWeight: isLow ? 600 : undefined,
            }}>
              {qty}
              {isLow && <WarningOutlined style={{ marginLeft: 4, fontSize: 12 }} />}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Landing Price',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 110,
      render: (v) => <Text>¥{v?.toFixed(2)}</Text>,
    },
    {
      title: 'Selling Price',
      dataIndex: 'sellPrice',
      key: 'sellPrice',
      width: 120,
      render: (v) => <Text>¥{v?.toFixed(2)}</Text>,
    },
    {
      title: 'Profit',
      key: 'profit',
      width: 100,
      render: (_, r) => {
        const profit = r.sellPrice - r.costPrice;
        return (
          <Text style={{ color: profit > 0 ? '#52c41a' : profit < 0 ? '#ff4d4f' : undefined, fontWeight: 600 }}>
            ¥{profit.toFixed(2)}
          </Text>
        );
      },
    },
  ];

  if (user?.role === 'ADMIN') {
    columns.push({
      title: '',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Adjust Stock">
            <Button
              size="small"
              type="primary"
              ghost
              icon={<PlusCircleOutlined />}
              onClick={() => { setAdjusting(record); setSelectedType(null); adjustForm.resetFields(); setAdjustModalOpen(true); }}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(record);
                form.setFieldsValue(record);
                setModalOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(record.name, () => handleDelete(record.id))} />
          </Tooltip>
        </Space>
      ),
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ margin: 0 }}>Inventory</Title>
          {lowStockCount > 0 && (
            <Badge count={lowStockCount} style={{ backgroundColor: '#ff4d4f' }}>
              <Tag icon={<WarningOutlined />} color="error">Low Stock</Tag>
            </Badge>
          )}
        </div>
        <Space>
          <Input.Search
            placeholder="Search name or SKU"
            style={{ width: 250 }}
            onSearch={setSearch}
            allowClear
          />
          {user?.role === 'ADMIN' && (
            <Space>
              <Button icon={<UploadOutlined />} onClick={() => { setImportResult(null); setImportModalOpen(true); }}>
                Import
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>
                Add Product
              </Button>
            </Space>
          )}
        </Space>
      </div>

      {/* Category Filter Tabs */}
      {categories.length > 1 && (
        <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          items={categories.map(c => ({
            key: c,
            label: c === 'all' ? `全部 (${products.length})` : `${c} (${products.filter(p => p.category === c).length})`,
          }))}
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        dataSource={filteredProducts}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (total) => `${total} items total` }}
        locale={{ emptyText: <EmptyState type="inventory" description='No products yet. Click "Add Product" to create one.' /> }}
      />

      {/* Add/Edit Product Modal */}
      <Modal
        title={editing ? 'Edit Product' : 'Add Product'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); form.resetFields(); }}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave} initialValues={editing || {}}>
          <Form.Item name="sku" label="SKU" rules={[{ required: true, message: 'Please enter SKU' }]}>
            <Input placeholder="e.g. PHONE-001" disabled={!!editing} autoFocus />
          </Form.Item>
          <Form.Item name="name" label="Item Name" rules={[{ required: true, message: 'Please enter item name' }]}>
            <Input placeholder="e.g. iPhone 15" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item name="category" label="Category">
              <Input placeholder="e.g. Phone" />
            </Form.Item>
            <Form.Item name="unit" label="Unit" initialValue="pcs">
              <Input placeholder="pcs/box/kg" />
            </Form.Item>
            <Form.Item name="location" label="Location">
              <Input placeholder="e.g. A-01" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Form.Item name="costPrice" label="Landing Price" initialValue={0}>
              <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sellPrice" label="Selling Price" initialValue={0}>
              <InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="safetyStock" label="Safety Stock" initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Stock Adjust Modal */}
      <Modal
        title={`Adjust Stock - ${adjusting?.name || ''}`}
        open={adjustModalOpen}
        onCancel={() => { setAdjustModalOpen(false); setAdjusting(null); adjustForm.resetFields(); setSelectedType(null); }}
        onOk={() => {
          if (!selectedType) { message.warning('Please select an action type'); return; }
          adjustForm.setFieldsValue({ type: selectedType });
          adjustForm.submit();
        }}
        width={420}
        destroyOnClose
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
          <Text type="secondary">Current Stock:</Text>
          <Text strong style={{ fontSize: 18, marginLeft: 8 }}>{adjusting?.stock?.quantity || 0}</Text>
          <Text type="secondary" style={{ marginLeft: 4 }}>{adjusting?.unit}</Text>
        </div>
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjust}>
          <Form.Item label="Action Type" required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { type: 'SET', label: 'Set', icon: <EditOutlined />, color: '#1890ff', bg: '#e6f7ff', border: '#91d5ff' },
                { type: 'IN', label: 'In', icon: <PlusCircleOutlined />, color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
                { type: 'OUT', label: 'Out', icon: <MinusCircleOutlined />, color: '#ff4d4f', bg: '#fff2f0', border: '#ffccc7' },
              ].map(opt => {
                const isActive = selectedType === opt.type;
                return (
                  <Button
                    key={opt.type}
                    block
                    onClick={() => setSelectedType(opt.type)}
                    style={{
                      height: 44,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? opt.color : '#595959',
                      background: isActive ? opt.bg : '#fff',
                      borderColor: isActive ? opt.color : '#d9d9d9',
                      borderWidth: isActive ? 2 : 1,
                      boxShadow: isActive ? `0 0 0 1px ${opt.color}` : 'none',
                    }}
                  >
                    <span style={{ color: opt.color, marginRight: 4 }}>{opt.icon}</span>
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </Form.Item>
          <Form.Item name="type" hidden><Input /></Form.Item>
          <Form.Item
            name="quantity"
            label={selectedType === 'SET' ? 'Set to' : 'Quantity'}
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder={selectedType === 'SET' ? 'Enter target stock' : 'Enter quantity'} />
          </Form.Item>
          <Form.Item name="remark" label="Remark">
            <Input.TextArea rows={2} placeholder="Optional remark" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="Import Products"
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); setImportResult(null); }}
        footer={null}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate} style={{ marginBottom: 12 }}>
            Download Template
          </Button>
          <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
            Supported columns: SKU, Name, Category, Unit, Cost, Price, Safety Stock, Location, Stock
          </Text>
          <Upload.Dragger
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={(file) => { handleImport(file); return false; }}
            disabled={importing}
          >
            <p style={{ fontSize: 32, color: '#1890ff' }}><UploadOutlined /></p>
            <p>Click or drag file to upload</p>
            <p style={{ fontSize: 12, color: '#8c8c8c' }}>Supports .xlsx, .xls, .csv</p>
          </Upload.Dragger>
        </div>
        {importing && <Progress percent={100} status="active" style={{ marginBottom: 12 }} />}
        {importResult && (
          <div style={{ padding: 12, background: '#fafafa', borderRadius: 8 }}>
            <Text strong>Import Result:</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color="green">Success: {importResult.success}</Tag>
              <Tag color="red">Failed: {importResult.failed}</Tag>
            </div>
            {importResult.errors?.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 120, overflow: 'auto' }}>
                {importResult.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#ff4d4f' }}>{err}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
