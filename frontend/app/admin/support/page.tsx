'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Tag, Typography, Space, Button, Select, message, Modal, Form, Input, Descriptions } from 'antd'
import { ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title, Text } = Typography

const STATUS_COLORS: Record<string, string> = {
  open: 'orange', in_progress: 'blue', resolved: 'green', closed: 'default',
}
const PRIORITY_COLORS: Record<string, string> = {
  low: 'default', normal: 'blue', high: 'orange', urgent: 'red',
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchTickets = async (p = page) => {
    setLoading(true)
    try {
      const params: any = { limit: 20, offset: (p - 1) * 20 }
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/admin/support', { params })
      setTickets(data.data?.tickets || [])
      setTotal(data.data?.total || 0)
    } catch { setTickets([]) }
    setLoading(false)
  }

  useEffect(() => { fetchTickets() }, [page, statusFilter])

  const openTicket = (ticket: any) => {
    setSelected(ticket)
    form.setFieldsValue({ status: ticket.status, admin_response: ticket.admin_response || '' })
    setModalOpen(true)
  }

  const handleUpdate = async (values: any) => {
    try {
      await api.patch(`/admin/support/${selected.id}`, values)
      message.success('Ticket updated')
      setModalOpen(false)
      fetchTickets()
    } catch { message.error('Failed to update') }
  }

  const columns = [
    { title: 'Subject', dataIndex: 'subject', key: 'subject', render: (s: string) => <Text strong>{s}</Text> },
    {
      title: 'User', key: 'user',
      render: (_: any, r: any) => (
        <div>
          <Text style={{ fontSize: 13 }}>{r.first_name} {r.last_name}</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{r.user_email}</Text>
        </div>
      )
    },
    { title: 'Category', dataIndex: 'category', key: 'category', render: (c: string) => <Tag>{c || 'general'}</Tag> },
    {
      title: 'Priority', dataIndex: 'priority', key: 'priority',
      render: (p: string) => <Tag color={PRIORITY_COLORS[p] || 'default'}>{p || 'normal'}</Tag>
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{s?.replace('_', ' ').toUpperCase()}</Tag>
    },
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', render: (d: string) => d ? new Date(d).toLocaleDateString() : '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openTicket(r)}>View</Button>
      )
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Support & Disputes</Title>
        <Button icon={<ReloadOutlined />} onClick={() => fetchTickets()}>Refresh</Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filter by status" allowClear value={statusFilter || undefined}
            onChange={v => { setStatusFilter(v || ''); setPage(1) }} style={{ width: 160 }}
          >
            <Select.Option value="open">Open</Select.Option>
            <Select.Option value="in_progress">In Progress</Select.Option>
            <Select.Option value="resolved">Resolved</Select.Option>
            <Select.Option value="closed">Closed</Select.Option>
          </Select>
        </Space>
        <Table
          columns={columns} dataSource={tickets} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `${t} tickets` }}
          size="small"
        />
      </Card>

      <Modal
        title="Support Ticket"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Update Ticket"
        width={600}
      >
        {selected && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Subject">{selected.subject}</Descriptions.Item>
              <Descriptions.Item label="From">{selected.first_name} {selected.last_name} ({selected.user_email})</Descriptions.Item>
              <Descriptions.Item label="Category"><Tag>{selected.category}</Tag></Descriptions.Item>
              <Descriptions.Item label="Message">{selected.message}</Descriptions.Item>
            </Descriptions>
            <Form form={form} layout="vertical" onFinish={handleUpdate}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="open">Open</Select.Option>
                  <Select.Option value="in_progress">In Progress</Select.Option>
                  <Select.Option value="resolved">Resolved</Select.Option>
                  <Select.Option value="closed">Closed</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="admin_response" label="Admin Response">
                <Input.TextArea rows={4} placeholder="Write your response to the user..." />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  )
}
