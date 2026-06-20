import { useEffect, useState } from 'react';
import { Table, Typography, Card, Row, Col, Statistic, Select, message, Tag, Empty, Spin, Space, Button } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined, ShoppingCartOutlined, BarChartOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import api from '../../api';

const { Title, Text } = Typography;

export default function Reports() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [report, setReport] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/tasks').then(res => setTasks(res.data)).catch(() => {});
    api.get('/reports/inventory-overview').then(res => setOverview(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedTask) {
      setLoading(true);
      api.get(`/reports/diff/${selectedTask}`)
        .then(res => setReport(res.data))
        .catch(() => message.error('Failed to load report'))
        .finally(() => setLoading(false));
    }
  }, [selectedTask]);

  const overviewEntries = overview ? Object.entries(overview) : [];
  const totalQty = overviewEntries.reduce((sum, [, v]) => sum + v.totalQty, 0);
  const totalValue = overviewEntries.reduce((sum, [, v]) => sum + v.totalValue, 0);

  // Auto-fit column width
  const fitColumns = (data, keys) => {
    return keys.map(k => {
      const maxLen = Math.max(
        k.length,
        ...data.map(row => String(row[k] ?? '').length)
      );
      return { wch: Math.min(maxLen + 2, 40) };
    });
  };

  const exportToExcel = () => {
    if (!report) { message.warning('Please select a task first'); return; }
    const wb = XLSX.utils.book_new();

    // Sheet 1: Stock Take Detail
    const detailKeys = ['SKU', 'Item Name', 'Category', 'System Qty', 'Actual Qty', 'Diff', 'Landing Price', 'Selling Price', 'Profit/pc', 'Amount'];
    const detailData = report.items.map(item => ({
      'SKU': item.sku,
      'Item Name': item.name,
      'Category': item.category,
      'System Qty': item.systemQty,
      'Actual Qty': item.actualQty ?? '-',
      'Diff': item.diff,
      'Landing Price': `¥${item.costPrice.toFixed(2)}`,
      'Selling Price': `¥${item.sellPrice.toFixed(2)}`,
      'Profit/pc': `¥${(item.sellPrice - item.costPrice).toFixed(2)}`,
      'Amount': item.diff > 0
        ? `Cost: ¥${item.diffAmount.toFixed(2)}`
        : item.diff < 0
          ? `Profit: ¥${item.diffAmount.toFixed(2)}`
          : '-',
    }));
    const ws1 = XLSX.utils.json_to_sheet(detailData);
    ws1['!cols'] = fitColumns(detailData, detailKeys);
    XLSX.utils.book_append_sheet(wb, ws1, 'Stock Take Detail');

    // Sheet 2: Summary
    const summaryData = [
      { 'Metric': 'Total Items', 'Value': report.summary.totalItems },
      { 'Metric': 'Overage (pcs)', 'Value': report.summary.stockGain },
      { 'Metric': 'Shortage (pcs)', 'Value': report.summary.stockLoss },
      { 'Metric': 'Stock In Cost', 'Value': `¥${report.summary.totalGainAmount.toFixed(2)}` },
      { 'Metric': 'Sales Profit', 'Value': `¥${report.summary.totalLossAmount.toFixed(2)}` },
      { 'Metric': 'Net Profit', 'Value': `¥${(report.summary.totalLossAmount - report.summary.totalGainAmount).toFixed(2)}` },
    ];
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    ws2['!cols'] = fitColumns(summaryData, ['Metric', 'Value']);
    ws2['!cols'] = [{ wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    // Sheet 3: Inventory Overview
    if (overviewEntries.length > 0) {
      const invKeys = ['Category', 'Product Count', 'Total Qty', 'Total Value'];
      const invData = overviewEntries.map(([cat, v]) => ({
        'Category': cat,
        'Product Count': v.count,
        'Total Qty': v.totalQty,
        'Total Value': `¥${v.totalValue.toFixed(2)}`,
      }));
      const ws3 = XLSX.utils.json_to_sheet(invData);
      ws3['!cols'] = fitColumns(invData, invKeys);
      XLSX.utils.book_append_sheet(wb, ws3, 'Inventory Overview');
    }

    // Find task code for filename
    const task = tasks.find(t => t.id === selectedTask);
    const filename = `StockTake_${task?.code || 'Report'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    message.success('Report exported');
  };

  const diffColumns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (text) => <Text code>{text}</Text> },
    { title: 'Item Name', dataIndex: 'name', key: 'name', render: (text) => <Text strong>{text}</Text> },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 100, render: (text) => text ? <Tag>{text}</Tag> : '-' },
    { title: 'System', dataIndex: 'systemQty', key: 'systemQty', width: 80 },
    { title: 'Actual', dataIndex: 'actualQty', key: 'actualQty', width: 80, render: (v) => v ?? <Text type="secondary">-</Text> },
    {
      title: 'Diff', dataIndex: 'diff', key: 'diff', width: 80,
      render: (v) => {
        if (v === 0) return <Tag>Match</Tag>;
        return <Tag color={v > 0 ? 'green' : 'red'} icon={v > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>{v > 0 ? '+' : ''}{v}</Tag>;
      },
    },
    {
      title: 'Amount', dataIndex: 'diffAmount', key: 'diffAmount', width: 140,
      render: (v, record) => {
        if (record.diff === 0) return '-';
        const isOverage = record.diff > 0;
        const profit = record.sellPrice - record.costPrice;
        return (
          <Text style={{ color: isOverage ? '#fa8c16' : '#52c41a', fontWeight: 600 }}>
            {isOverage ? '-' : '+'}¥{v.toFixed(2)}
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
              ({isOverage ? 'cost' : `profit ¥${profit}/pc`})
            </Text>
          </Text>
        );
      },
    },
  ];

  const categoryColors = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2'];

  return (
    <div>
      <Title level={4}>Reports</Title>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16 }}
        title={<Space><BarChartOutlined /><span>Inventory Overview</span></Space>}>
        {overviewEntries.length === 0 ? (
          <Empty description="No inventory data" />
        ) : (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={8}>
                <Card size="small" bordered={false} style={{ backgroundColor: '#f0f5ff', borderRadius: 8 }}>
                  <Statistic title="Categories" value={overviewEntries.length} suffix="types" prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" bordered={false} style={{ backgroundColor: '#f6ffed', borderRadius: 8 }}>
                  <Statistic title="Total Stock" value={totalQty} suffix="pcs" prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />} />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small" bordered={false} style={{ backgroundColor: '#fff7e6', borderRadius: 8 }}>
                  <Statistic title="Total Value" value={totalValue} precision={2} prefix={<DollarOutlined style={{ color: '#fa8c16' }} />} />
                </Card>
              </Col>
            </Row>
            <Title level={5} style={{ marginBottom: 12 }}>By Category</Title>
            <Row gutter={[16, 16]}>
              {overviewEntries.map(([cat, data], i) => (
                <Col xs={24} sm={12} md={8} lg={6} key={cat}>
                  <Card size="small" bordered={false} style={{ borderRadius: 8, borderTop: `3px solid ${categoryColors[i % categoryColors.length]}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{cat}</Text>
                        <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{data.totalQty} pcs</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>{data.count} items</Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Value</Text>
                        <div style={{ fontSize: 16, fontWeight: 500, color: '#fa8c16' }}>¥{data.totalValue.toFixed(2)}</div>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Card>

      <Card bordered={false} style={{ borderRadius: 8 }}
        title={<Space><BarChartOutlined /><span>Stock Take Report</span></Space>}
        extra={report && (
          <Button type="primary" icon={<DownloadOutlined />} onClick={exportToExcel}>
            Export Excel
          </Button>
        )}>
        <div style={{ marginBottom: 16 }}>
          <Select placeholder="Select a task to view report" style={{ width: 350 }} onChange={setSelectedTask} allowClear size="large">
            {tasks.map(t => (
              <Select.Option key={t.id} value={t.id}>
                {t.code} ({t.status === 'ADJUSTED' ? 'Adjusted' : t.status})
              </Select.Option>
            ))}
          </Select>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : report ? (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}>
                <Card size="small" bordered={false} style={{ backgroundColor: '#fafafa', borderRadius: 8 }}>
                  <Statistic title="Total Items" value={report.summary.totalItems} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bordered={false} style={{ backgroundColor: '#fff7e6', borderRadius: 8 }}>
                  <div>
                    <Text style={{ fontSize: 12, color: '#8c8c8c' }}>Stock In (cost)</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text style={{ color: '#fa8c16', fontSize: 20, fontWeight: 600 }}>+{report.summary.stockGain} pcs</Text>
                    </div>
                    <Text style={{ color: '#fa8c16', fontSize: 13 }}>-¥{report.summary.totalGainAmount.toFixed(2)}</Text>
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bordered={false} style={{ backgroundColor: '#f6ffed', borderRadius: 8 }}>
                  <div>
                    <Text style={{ fontSize: 12, color: '#8c8c8c' }}>Stock Out (sold)</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text style={{ color: '#52c41a', fontSize: 20, fontWeight: 600 }}>-{report.summary.stockLoss} pcs</Text>
                    </div>
                    <Text style={{ color: '#52c41a', fontSize: 13 }}>+¥{report.summary.totalLossAmount.toFixed(2)} profit</Text>
                  </div>
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" bordered={false} style={{ backgroundColor: (report.summary.totalLossAmount - report.summary.totalGainAmount) >= 0 ? '#f6ffed' : '#fff2f0', borderRadius: 8 }}>
                  <Statistic title="Net Profit" value={report.summary.totalLossAmount - report.summary.totalGainAmount} precision={2} prefix="¥"
                    valueStyle={{ color: (report.summary.totalLossAmount - report.summary.totalGainAmount) >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 20, fontWeight: 600 }} />
                </Card>
              </Col>
            </Row>
            <Table dataSource={report.items} columns={diffColumns} rowKey="productId" pagination={false} size="small"
              rowClassName={(record) => record.diff === 0 ? '' : record.diff > 0 ? 'row-gain' : 'row-loss'} />
          </>
        ) : (
          <Empty description="Select a task to view the report" />
        )}
      </Card>
    </div>
  );
}
