'use client'

import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Typography, Alert, Space } from 'antd'
import {
  ShoppingOutlined, UserOutlined, DollarOutlined, AppstoreOutlined,
  ShopOutlined, PercentageOutlined,
} from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange', processing: 'blue', shipped: 'cyan',
  delivered: 'green', cancelled: 'red', refunded: 'purple',
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => setStats(data.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { title: 'Total Revenue', value: '$' + Number(stats.total_revenue || 0).toLocaleString('en', { minimumFractionDigits: 2 }), icon: <DollarOutlined />, color: '#7c3aed' },
    { title: 'Platform Commission', value: '$' + Number(stats.platform_commission || 0).toLocaleString('en', { minimumFractionDigits: 2 }), icon: <PercentageOutlined />, color: '#059669' },
    { title: 'Total Orders', value: stats.total_orders || 0, icon: <ShoppingOutlined />, color: '#7c3aed' },
    { title: 'Total Users', value: stats.total_users || 0, icon: <UserOutlined />, color: '#0891b2' },
    { title: 'Active Sellers', value: stats.total_sellers || 0, icon: <ShopOutlined />, color: '#d97706' },
    { title: 'Total Products', value: stats.total_products || 0, icon: <AppstoreOutlined />, color: '#dc2626' },
  ]

  const columns = [
    { title: 'Order', dataIndex: 'order_number', key: 'order_number', render: (n: string, r: any) => <Typography.Text code>#{n || r.id?.slice(0, 8)}</Typography.Text> },
    { title: 'Customer', dataIndex: 'customer_email', key: 'customer_email', render: (e: string) => e || '—' },
    { title: 'Total', dataIndex: 'total_amount', key: 'total_amount', render: (v: number) => '$' + Number(v || 0).toFixed(2) },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{s?.toUpperCase()}</Tag>
    },
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', render: (d: string) => d ? new Date(d).toLocaleDateString() : '—' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>Control Center</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((s) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={s.title}>
            <Card loading={loading}>
              <Statistic
                title={s.title}
                value={s.value}
                prefix={<span style={{ color: s.color }}>{s.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Recent Orders" loading={loading}>
        <Table
          columns={columns}
          dataSource={stats.recent_orders || []}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}
