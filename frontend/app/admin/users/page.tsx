'use client'

import { useEffect, useState } from 'react'
import { Table, Input, Tag, Typography, Card, Avatar, Space, Select } from 'antd'
import { SearchOutlined, UserOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')

  const fetchUsers = async (p = page) => {
    setLoading(true)
    try {
      const params: any = { page: p, limit: 20 }
      if (search) params.search = search
      if (role) params.role = role
      const { data } = await api.get('/users', { params })
      setUsers(data.data?.users || [])
      setTotal(data.data?.total || 0)
    } catch { setUsers([]) }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [page, role])

  const columns = [
    {
      title: 'User', key: 'user',
      render: (_: any, r: any) => (
        <Space>
          <Avatar size={32} style={{ background: '#7c3aed' }} icon={<UserOutlined />}>{r.first_name?.[0]}</Avatar>
          <div>
            <Typography.Text strong style={{ display: 'block', fontSize: 13 }}>{r.first_name} {r.last_name}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Typography.Text>
          </div>
        </Space>
      )
    },
    { title: 'Role', dataIndex: 'role', key: 'role', render: (r: string) => <Tag color={r === 'admin' ? 'purple' : 'blue'}>{r?.toUpperCase()}</Tag> },
    { title: 'Orders', dataIndex: 'order_count', key: 'order_count', render: (v: number) => v ?? 0 },
    { title: 'Joined', dataIndex: 'created_at', key: 'created_at', render: (d: string) => d ? new Date(d).toLocaleDateString() : '—' },
    { title: 'Status', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v !== false ? 'green' : 'red'}>{v !== false ? 'Active' : 'Inactive'}</Tag> },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>Users Management</Title>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} onSearch={() => { setPage(1); fetchUsers(1) }} style={{ width: 260 }} />
          <Select placeholder="Filter by role" allowClear value={role || undefined} onChange={v => { setRole(v || ''); setPage(1) }} style={{ width: 140 }}>
            <Select.Option value="user">User</Select.Option>
            <Select.Option value="admin">Admin</Select.Option>
          </Select>
        </Space>
        <Table columns={columns} dataSource={users} rowKey="id" loading={loading} pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `${t} users` }} size="small" />
      </Card>
    </div>
  )
}
