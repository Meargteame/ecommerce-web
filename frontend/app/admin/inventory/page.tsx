'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Row, Col, Statistic, Tag, Button, InputNumber, Space, Typography, message, Tabs } from 'antd'
import { WarningOutlined, StopOutlined, AppstoreOutlined, DollarOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography

export default function AdminInventoryPage() {
  const [status, setStatus] = useState<any>({})
  const [lowStock, setLowStock] = useState<any[]>([])
  const [outOfStock, setOutOfStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const load = async () => {
    setLoading(true)
    try {
      const [statusRes, lowRes, outRes] = await Promise.all([
        api.get('/inventory/status'),
        api.get('/inventory/low-stock'),
        api.get('/inventory/out-of-stock'),
      ])
      setStatus(statusRes.data?.data || {})
      setLowStock(lowRes.data?.data || [])
      setOutOfStock(outRes.data?.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStock = async (sku: string, operation: 'set' | 'increment') => {
    const qty = quantities[sku]
    if (qty == null || qty < 0) return message.warning('Enter a valid quantity')
    setUpdating(sku)
    try {
      await api.put(`/inventory/${sku}`, { quantity: qty, operation })
      message.success('Stock updated')
      setQuantities(q => ({ ...q, [sku]: 0 }))
      load()
    } catch { message.error('Failed to update stock') }
    setUpdating(null)
  }

  const stockColumns = [
    { title: 'Product', dataIndex: 'productName', key: 'productName', render: (n: string, r: any) => (
      <div>
        <Typography.Text strong>{n}</Typography.Text>
        {r.variantName && <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{r.variantName}</Typography.Text>}
      </div>
    )},
    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (s: string) => <Typography.Text code>{s}</Typography.Text> },
    { title: 'Stock', dataIndex: 'stockQuantity', key: 'stockQuantity', render: (v: number) => (
      <Tag color={v === 0 ? 'red' : v <= 5 ? 'orange' : 'green'}>{v}</Tag>
    )},
    { title: 'Threshold', dataIndex: 'lowStockThreshold', key: 'lowStockThreshold' },
    {
      title: 'Restock', key: 'restock',
      render: (_: any, r: any) => (
        <Space>
          <InputNumber
            min={0} size="small" style={{ width: 80 }}
            value={quantities[r.sku] ?? 0}
            onChange={v => setQuantities(q => ({ ...q, [r.sku]: v ?? 0 }))}
          />
          <Button size="small" loading={updating === r.sku} onClick={() => updateStock(r.sku, 'set')}>Set</Button>
          <Button size="small" type="primary" loading={updating === r.sku} onClick={() => updateStock(r.sku, 'increment')}>Add</Button>
        </Space>
      )
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Inventory Management</Title>
        <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total Products', value: status.totalProducts || 0, icon: <AppstoreOutlined style={{ color: '#7c3aed' }} /> },
          { title: 'Total Variants', value: status.totalVariants || 0, icon: <AppstoreOutlined style={{ color: '#059669' }} /> },
          { title: 'Low Stock', value: status.lowStockCount || 0, icon: <WarningOutlined style={{ color: '#d97706' }} /> },
          { title: 'Out of Stock', value: status.outOfStockCount || 0, icon: <StopOutlined style={{ color: '#dc2626' }} /> },
        ].map(s => (
          <Col xs={24} sm={12} lg={6} key={s.title}>
            <Card><Statistic title={s.title} value={s.value} prefix={s.icon} /></Card>
          </Col>
        ))}
      </Row>

      <Card>
        <Tabs defaultActiveKey="low" items={[
          {
            key: 'low',
            label: <span><WarningOutlined style={{ color: '#d97706' }} /> Low Stock ({lowStock.length})</span>,
            children: <Table columns={stockColumns} dataSource={lowStock} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 15 }} />,
          },
          {
            key: 'out',
            label: <span><StopOutlined style={{ color: '#dc2626' }} /> Out of Stock ({outOfStock.length})</span>,
            children: <Table columns={stockColumns} dataSource={outOfStock} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 15 }} />,
          },
        ]} />
      </Card>
    </div>
  )
}
