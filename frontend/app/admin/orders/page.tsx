'use client'

import { useEffect, useState } from 'react'
import { Table, Tag, Select, Input, Space, Typography, Card, Button } from 'antd'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography

const STATUS_COLORS: Record<string, string> = {
  pending: 'orange', processing: 'blue', shipped: 'cyan',
  delivered: 'green', cancelled: 'red', refunded: 'purple',
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const fetchOrders = async (p = page) => {
    setLoading(true)
    try {
      const params: any = { offset: (p - 1) * 20, limit: 20 }
      if (status) params.status = status
      const { data } = await api.get('/admin/orders', { params })
      setOrders(data.data?.orders || [])
      setTotal(data.data?.total || 0)
    } catch { setOrders([]) }
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [page, status])

  const updateStatus = async (id: string, newStatus: string) => {
    try { await api.patch(`/orders/${id}/status`, { status: newStatus }); fetchOrders() } catch { /* ignore */ }
  }

  const columns = [
    { title: 'Order Number', dataIndex: 'orderNumber', key: 'orderNumber', render: (n: string) => <Typography.Text code>#{n}</Typography.Text> },
    { title: 'Customer', dataIndex: 'customerEmail', key: 'customerEmail' },
    { title: 'Items', dataIndex: 'itemCount', key: 'itemCount', render: (v: number) => `${v || 0} items` },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => `$${Number(v || 0).toFixed(2)}`, sorter: (a: any, b: any) => a.totalAmount - b.totalAmount },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string, record: any) => (
        <Select size="small" value={s} onChange={(val) => updateStatus(record.id, val)} style={{ width: 130 }}>
          {Object.keys(STATUS_COLORS).map(st => <Select.Option key={st} value={st}><Tag color={STATUS_COLORS[st]}>{st.toUpperCase()}</Tag></Select.Option>)}
        </Select>
      )
    },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleDateString() : '—' },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>Orders Management</Title>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input placeholder="Search orders..." prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} style={{ width: 240 }} />
          <Select placeholder="Filter by status" allowClear value={status || undefined} onChange={v => { setStatus(v || ''); setPage(1) }} style={{ width: 160 }}>
            {Object.keys(STATUS_COLORS).map(s => <Select.Option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</Select.Option>)}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={() => fetchOrders()}>Refresh</Button>
        </Space>
        <Table columns={columns} dataSource={orders} rowKey="id" loading={loading} pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `${t} orders` }} size="small" />
      </Card>
    </div>
  )
}
