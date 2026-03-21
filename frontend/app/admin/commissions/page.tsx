'use client'

import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Typography, InputNumber, Button, message, Space, Tag } from 'antd'
import { DollarOutlined, PercentageOutlined, ShoppingOutlined, SaveOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title, Text } = Typography

export default function AdminCommissionsPage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [rate, setRate] = useState<number>(10)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: res } = await api.get('/admin/commissions')
      setData(res.data || {})
      setRate(parseFloat(res.data?.commission_rate || '10'))
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const saveRate = async () => {
    setSaving(true)
    try {
      await api.put('/admin/commissions/rate', { rate })
      message.success('Commission rate updated')
    } catch { message.error('Failed to save') }
    setSaving(false)
  }

  const summary = data.summary || {}

  const columns = [
    {
      title: 'Seller', key: 'seller',
      render: (_: any, r: any) => (
        <div>
          <Text strong style={{ display: 'block' }}>{r.store_name || `${r.first_name} ${r.last_name}`}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
        </div>
      )
    },
    { title: 'Orders', dataIndex: 'order_count', key: 'order_count', render: (v: number) => v ?? 0 },
    { title: 'Seller Revenue', dataIndex: 'seller_revenue', key: 'seller_revenue', render: (v: number) => '$' + Number(v || 0).toFixed(2) },
    {
      title: 'Commission Owed', dataIndex: 'commission_owed', key: 'commission_owed',
      render: (v: number) => <Tag color="purple">${Number(v || 0).toFixed(2)}</Tag>,
      sorter: (a: any, b: any) => a.commission_owed - b.commission_owed,
      defaultSortOrder: 'descend' as const,
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>Commissions & Payments</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic title="Gross Revenue" value={'$' + Number(summary.gross_revenue || 0).toFixed(2)} prefix={<DollarOutlined style={{ color: '#7c3aed' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic title="Platform Commission" value={'$' + Number(summary.total_commission || 0).toFixed(2)} prefix={<PercentageOutlined style={{ color: '#059669' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic title="Total Orders" value={summary.total_orders || 0} prefix={<ShoppingOutlined style={{ color: '#d97706' }} />} />
          </Card>
        </Col>
      </Row>

      <Card title="Commission Rate" style={{ marginBottom: 16 }}>
        <Space align="center">
          <Text>Platform takes</Text>
          <InputNumber
            min={0} max={100} value={rate}
            onChange={v => setRate(v ?? 10)}
            formatter={v => `${v}%`}
            parser={v => parseFloat(v?.replace('%', '') || '10') as any}
            style={{ width: 100 }}
          />
          <Text>of each sale</Text>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveRate}>
            Save Rate
          </Button>
        </Space>
      </Card>

      <Card title="Commission by Seller" loading={loading}>
        <Table
          columns={columns}
          dataSource={data.sellers || []}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </div>
  )
}
