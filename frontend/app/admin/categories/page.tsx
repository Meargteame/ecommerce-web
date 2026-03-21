'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Button, Typography, Space, Tag, Popconfirm, message, Modal, Form, Input, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title } = Typography

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/categories')
      setCategories(data.data || [])
    } catch { setCategories([]) }
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description,
      image_url: record.image_url,
      display_order: record.display_order,
    })
    setModalOpen(true)
  }

  const handleSave = async (values: any) => {
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/admin/categories/${editing.id}`, values)
        message.success('Category updated')
      } else {
        await api.post('/admin/categories', values)
        message.success('Category created')
      }
      setModalOpen(false)
      form.resetFields()
      fetchCategories()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Failed to save')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/categories/${id}`)
      message.success('Category deleted')
      fetchCategories()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Failed to delete')
    }
  }

  const columns = [
    {
      title: 'Category', key: 'name',
      render: (_: any, r: any) => (
        <Space>
          {r.image_url
            ? <img src={r.image_url} alt={r.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6 }} />
            : <div style={{ width: 32, height: 32, background: '#f5f3ff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FolderOutlined style={{ color: '#7c3aed' }} /></div>
          }
          <div>
            <Typography.Text strong>{r.name}</Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{r.slug}</Typography.Text>
          </div>
        </Space>
      )
    },
    { title: 'Products', dataIndex: 'product_count', key: 'product_count', render: (v: number) => <Tag color="blue">{v ?? 0}</Tag> },
    { title: 'Order', dataIndex: 'display_order', key: 'display_order' },
    { title: 'Description', dataIndex: 'description', key: 'description', render: (d: string) => d || '—', ellipsis: true },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
          <Popconfirm
            title={`Delete "${r.name}"? This will fail if it has products.`}
            onConfirm={() => handleDelete(r.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      )
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Category Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Category</Button>
      </div>
      <Card>
        <Table columns={columns} dataSource={categories} rowKey="id" loading={loading} size="small" pagination={{ pageSize: 20 }} />
      </Card>

      <Modal
        title={editing ? 'Edit Category' : 'Create Category'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        okText={editing ? 'Save' : 'Create'}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Electronics" onChange={e => {
              if (!editing) form.setFieldValue('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
            }} />
          </Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}>
            <Input placeholder="e.g. electronics" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="image_url" label="Image URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="display_order" label="Display Order" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
