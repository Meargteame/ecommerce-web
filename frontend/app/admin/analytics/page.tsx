'use client'

import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Typography, Spin } from 'antd'
import { DollarOutlined, ShoppingOutlined, UserOutlined, RiseOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>({})
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, topRes] = await Promise.all([
          api.get('/analytics/dashboard'),
          api.get('/analytics/top-products'),
        ])
        setData(dashRes.data?.data || {})
        setTopProducts(topRes.data?.data || [])
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    { title: 'Total Revenue', value: '$' + Number(data.total_revenue || 0).toLocaleString('en', { minimumFractionDigits: 2 }), icon: <DollarOutlined style={{ color: '#7c3aed' }} /> },
    { title: 'Total Orders', value: data.total_orders || 0, icon: <ShoppingOutlined style={{ color: '#7c3aed' }} /> },
    { title: 'Total Users', value: data.total_users || 0, icon: <UserOutlined style={{ color: '#059669' }} /> },
    { title: 'Avg Order Value', value: '$' + Number(data.avg_order_value || 0).toFixed(2), icon: <RiseOutlined style={{ color: '#d97706' }} /> },
  ]

  const topProductColumns = [
    { title: 'Product', dataIndex: 'name', key: 'name' },
    { title: 'Units Sold', dataIndex: 'total_sold', key: 'total_sold', sorter: (a: any, b: any) => a.total_sold - b.total_sold },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', render: (v: number) => '$' + Number(v || 0).toFixed(2), sorter: (a: any, b: any) => a.revenue - b.revenue },
  ]

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>Analytics</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <Col xs={24} sm={12} lg={6} key={s.title}>
            <Card><Statistic title={s.title} value={s.value} prefix={s.icon} /></Card>
          </Col>
        ))}
      </Row>
      <Card title="Top Selling Products">
        <Table columns={topProductColumns} dataSource={topProducts} rowKey="id" pagination={{ pageSize: 10 }} size="small" />
      </Card>
    </div>
  )
}
