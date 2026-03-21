'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Tag, Typography, Space, Input, Button, Avatar, message, Popconfirm, Badge, Tooltip } from 'antd'
import { SearchOutlined, ShopOutlined, CheckCircleOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title, Text } = Typography

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const fetchSellers = async (p = page, q = search) => {
    setLoading(true)
    try {
      const params: any = { limit: 20, offset: (p - 1) * 20 }
      if (q) params.search = q
      const { data } = await api.get('/admin/sellers', { params })
      setSellers(data.data?.sellers || [])
      setTotal(data.data?.total || 0)
    } catch { setSellers([]) }
    setLoading(false)
  }

  useEffect(() => { fetchSellers() }, [page])

  const toggleVerify = async (id: string, verified: boolean) => {
    try {
      await api.patch(`/admin/sellers/${id}/verify`, { verified: !verified })
      message.success(verified ? 'Seller unverified' : 'Seller verified')
      fetchSellers()
    } catch { message.error('Failed to update') }
  }

  const toggleStatus = async (id: string, status: string) => {
    const newStatus = status === 'active' ? 'suspended' : 'active'
    try {
      await api.patch(`/admin/sellers/${id}/status`, { status: newStatus })
      message.success(`Seller ${newStatus}`)
      fetchSellers()
    } catch { message.error('Failed to update') }
  }

  const columns = [
    {
      title: 'Seller', key: 'seller',
      render: (_: any, r: any) => (
        <Space>
          <Avatar size={36} style={{ background: '#7c3aed' }} icon={<ShopOutlined />}>{r.first_name?.[0]}</Avatar>
          <div>
            <Text strong style={{ display: 'block', fontSize: 13 }}>{r.store_name || `${r.first_name} ${r.last_name}`}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      )
    },
    { title: 'Products', dataIndex: 'product_count', key: 'product_count', render: (v: number) => v ?? 0 },
    { title: 'Revenue', dataIndex: 'total_revenue', key: 'total_revenue', render: (v: number) => '$' + Number(v || 0).toFixed(2) },
    {
      title: 'Verified', dataIndex: 'is_verified', key: 'is_verified',
      render: (v: boolean, r: any) => (
        <Tooltip title={v ? 'Click to unverify' : 'Click to verify'}>
          <Tag
            color={v ? 'green' : 'default'}
            style={{ cursor: 'pointer' }}
            onClick={() => toggleVerify(r.id, v)}
            icon={v ? <CheckCircleOutlined /> : undefined}
          >
            {v ? 'Verified' : 'Unverified'}
          </Tag>
        </Tooltip>
      )
    },
    {
      title: 'Status', dataIndex: 'account_status', key: 'account_status',
      render: (s: string) => <Tag color={s === 'active' || !s ? 'green' : 'red'}>{s || 'active'}</Tag>
    },
    { title: 'Joined', dataIndex: 'created_at', key: 'created_at', render: (d: string) => d ? new Date(d).toLocaleDateString() : '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => {
        const isActive = !r.account_status || r.account_status === 'active'
        return (
          <Popconfirm
            title={isActive ? 'Suspend this seller?' : 'Reactivate this seller?'}
            onConfirm={() => toggleStatus(r.id, r.account_status || 'active')}
          >
            <Button size="small" danger={isActive} type={isActive ? 'default' : 'primary'}
              icon={isActive ? <StopOutlined /> : <CheckCircleOutlined />}>
              {isActive ? 'Suspend' : 'Reactivate'}
            </Button>
          </Popconfirm>
        )
      }
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Seller Management</Title>
        <Button icon={<ReloadOutlined />} onClick={() => fetchSellers()}>Refresh</Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search sellers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={q => { setPage(1); fetchSellers(1, q) }}
            style={{ width: 280 }}
            enterButton={<SearchOutlined />}
          />
        </Space>
        <Table
          columns={columns} dataSource={sellers} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `${t} sellers` }}
          size="small"
        />
      </Card>
    </div>
  )
}
