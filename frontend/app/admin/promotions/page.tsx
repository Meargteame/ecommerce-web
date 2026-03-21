'use client'

import { useEffect, useState } from 'react'
import { Table, Button, Tag, Typography, Card, Space, Popconfirm, message, Modal, Form, Input, Select, InputNumber, DatePicker } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '@/lib/api'
import dayjs from 'dayjs'

const { Title } = Typography

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const fetchPromos = async () => {
    setLoading(true)
    try { const { data } = await api.get('/promotions'); setPromos(data.data || []) }
    catch { setPromos([]) }
    setLoading(false)
  }

  useEffect(() => { fetchPromos() }, [])

  const handleDelete = async (id: string) => {
    try { await api.delete(`/promotions/${id}`); message.success('Deleted'); fetchPromos() }
    catch { message.error('Failed to delete') }
  }

  const handleCreate = async (values: any) => {
    try {
      await api.post('/promotions', { ...values, start_date: values.start_date?.toISOString(), end_date: values.end_date?.toISOString() })
      message.success('Promotion created'); setModalOpen(false); form.resetFields(); fetchPromos()
    } catch { message.error('Failed to create promotion') }
  }

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (c: string) => <Typography.Text code>{c}</Typography.Text> },
    { title: 'Type', dataIndex: 'discount_type', key: 'discount_type', render: (t: string) => <Tag>{t}</Tag> },
    { title: 'Value', dataIndex: 'discount_value', key: 'discount_value', render: (v: number, r: any) => r.discount_type === 'percentage' ? `${v}%` : `$${v}` },
    { title: 'Min Order', dataIndex: 'min_order_amount', key: 'min_order_amount', render: (v: number) => v ? `$${v}` : '—' },
    { title: 'Uses', dataIndex: 'usage_count', key: 'usage_count', render: (v: number, r: any) => `${v || 0}${r.max_uses ? ` / ${r.max_uses}` : ''}` },
    { title: 'Status', dataIndex: 'is_active', key: 'is_active', render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag> },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Popconfirm title="Delete this promotion?" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      )
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Promotions</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>New Promotion</Button>
      </div>
      <Card>
        <Table columns={columns} dataSource={promos} rowKey="id" loading={loading} size="small" />
      </Card>
      <Modal title="Create Promotion" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="Create">
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="code" label="Promo Code" rules={[{ required: true }]}><Input placeholder="SAVE20" /></Form.Item>
          <Form.Item name="discount_type" label="Discount Type" rules={[{ required: true }]}>
            <Select><Select.Option value="percentage">Percentage</Select.Option><Select.Option value="fixed">Fixed Amount</Select.Option></Select>
          </Form.Item>
          <Form.Item name="discount_value" label="Discount Value" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="min_order_amount" label="Min Order Amount"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="max_uses" label="Max Uses"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="end_date" label="Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
