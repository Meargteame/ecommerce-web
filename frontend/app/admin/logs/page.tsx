'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Tag, Typography, Select, Space, Button, Tooltip } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title, Text } = Typography

const EVENT_COLORS: Record<string, string> = {
  page_view: 'default',
  product_view: 'blue',
  add_to_cart: 'cyan',
  remove_from_cart: 'orange',
  checkout_start: 'purple',
  checkout_complete: 'green',
  search: 'geekblue',
  click: 'default',
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')

  const fetchLogs = async (p = page) => {
    setLoading(true)
    try {
      const params: any = { limit: 50, offset: (p - 1) * 50 }
      if (typeFilter) params.type = typeFilter
      const { data } = await api.get('/admin/logs', { params })
      setLogs(data.data?.logs || [])
      setTotal(data.data?.total || 0)
    } catch { setLogs([]) }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [page, typeFilter])

  const columns = [
    {
      title: 'Event', dataIndex: 'event_type', key: 'event_type',
      render: (t: string) => <Tag color={EVENT_COLORS[t] || 'default'}>{t?.replace(/_/g, ' ').toUpperCase()}</Tag>
    },
    {
      title: 'User', dataIndex: 'user_email', key: 'user_email',
      render: (e: string) => e ? <Text style={{ fontSize: 12 }}>{e}</Text> : <Text type="secondary" style={{ fontSize: 12 }}>Anonymous</Text>
    },
    {
      title: 'IP Address', dataIndex: 'ip_address', key: 'ip_address',
      render: (ip: string) => <Text code style={{ fontSize: 11 }}>{ip || '—'}</Text>
    },
    {
      title: 'User Agent', dataIndex: 'user_agent', key: 'user_agent',
      ellipsis: true,
      render: (ua: string) => (
        <Tooltip title={ua}>
          <Text type="secondary" style={{ fontSize: 11 }}>{ua?.slice(0, 60) || '—'}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Data', dataIndex: 'event_data', key: 'event_data',
      render: (d: any) => {
        if (!d || Object.keys(d).length === 0) return '—'
        return <Text code style={{ fontSize: 11 }}>{JSON.stringify(d).slice(0, 60)}</Text>
      }
    },
    {
      title: 'Time', dataIndex: 'created_at', key: 'created_at',
      render: (d: string) => d ? new Date(d).toLocaleString() : '—'
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>System Logs</Title>
        <Button icon={<ReloadOutlined />} onClick={() => fetchLogs()}>Refresh</Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by event type" allowClear value={typeFilter || undefined}
            onChange={v => { setTypeFilter(v || ''); setPage(1) }} style={{ width: 200 }}
          >
            {Object.keys(EVENT_COLORS).map(t => (
              <Select.Option key={t} value={t}>{t.replace(/_/g, ' ')}</Select.Option>
            ))}
          </Select>
        </Space>
        <Table
          columns={columns} dataSource={logs} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 50, onChange: setPage, showTotal: t => `${t} events` }}
          size="small"
        />
      </Card>
    </div>
  )
}
