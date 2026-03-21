'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Tag, Typography, Space, Input, Select, Button, Avatar, message, Popconfirm } from 'antd'
import { SearchOutlined, ShopOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchVendors = async (p = page) => {
    setLoading(true)
    try {
      const params: any = { page: p, limit: 20, role: 'seller' }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/users', { params })
      setVendors(data.data?.users || [])
      setTotal(data.data?.total || 0)
    } catch { setVendors([]) }
    setLoading(false)
  }

  useEffect(() => { fetchVendors() }, [page, statusFilter])

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/users/${id}/status`, { status })
      message.success('Vendor status updated')
      fetchVendors()
    } catch { message.error('Failed to update status') }
  }

  const columns = [
    {
      title: 'Vendor', key: 'vendor',
      render: (_: any, r: any) => (
        <Space>
          <Avatar size={36} style={{ background: '#7c3aed' }} icon={<ShopOutlined />}>
            {r.first_name?.[0]}
          </Avatar>
          <div>
            <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>
              {r.first_name} {r.last_name}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Typography.Text>
          </div>
        </Space>
      )
    },
    { title: 'Products', dataIndex: 'product_count', key: 'product_count', render: (v: number) => v ?? 0 },
    { title: 'Orders', dataIndex: 'order_count', key: 'order_count', render: (v: number) => v ?? 0 },
    { title: 'Revenue', dataIndex: 'total_revenue', key: 'total_revenue', render: (v: number) => v ? `$${Number(v).toFixed(2)}` : '$0.00' },
    { title: 'Joined', dataIndex: 'created_at', key: 'created_at', render: (d: string) => d ? new Date(d).toLocaleDateString() : '—' },
    {
      title: 'Status', dataIndex: 'account_status', key: 'account_status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : s === 'suspended' ? 'red' : 'orange'}>{s || 'active'}</Tag>
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          {r.account_status !== 'suspended' ? (
            <Popconfirm title="Suspend this vendor?" onConfirm={() => updateStatus(r.id, 'suspended')}>
              <Button size="small" danger>Suspend</Button>
            </Popconfirm>
          ) : (
            <Button size="small" type="primary" onClick={() => updateStatus(r.id, 'active')}>Reactivate</Button>
          )}
        </Space>
      )
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Vendor Management</Title>
        <Button icon={<ReloadOutlined />} onClick={() => fetchVendors()}>Refresh</Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search
            placeholder="Search vendors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={() => { setPage(1); fetchVendors(1) }}
            style={{ width: 260 }}
            enterButton={<SearchOutlined />}
          />
          <Select
            placeholder="Filter by status" allowClear
            value={statusFilter || undefined}
            onChange={v => { setStatusFilter(v || ''); setPage(1) }}
            style={{ width: 160 }}
          >
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="suspended">Suspended</Select.Option>
            <Select.Option value="pending">Pending</Select.Option>
          </Select>
        </Space>
        <Table
          columns={columns} dataSource={vendors} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `${t} vendors` }}
          size="small"
        />
      </Card>
    </div>
  )
}
