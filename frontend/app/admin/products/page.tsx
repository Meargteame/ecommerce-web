'use client'

import { useEffect, useState } from 'react'
import {
  Table, Button, Input, Space, Tag, Typography, Card,
  Popconfirm, message, Modal, Form, InputNumber, Select, Upload,
} from 'antd'
import {
  SearchOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, UploadOutlined,
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import api from '@/lib/api'

const { Title } = Typography

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  const fetchProducts = async (p = page, q = search) => {
    setLoading(true)
    try {
      const params: any = { offset: (p - 1) * 20, limit: 20 }
      if (q) params.search = q
      const { data } = await api.get('/admin/products', { params })
      setProducts(data.data?.products || [])
      setTotal(data.data?.total || 0)
    } catch { setProducts([]) }
    setLoading(false)
  }

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories')
      setCategories(data.data || [])
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchProducts(); fetchCategories() }, [])
  useEffect(() => { fetchProducts() }, [page])

  const openCreate = () => {
    setEditing(null)
    setImageUrl('')
    setFileList([])
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setEditing(record)
    const existingImage = record.image_url || record.images?.[0]?.url || ''
    setImageUrl(existingImage)
    setFileList(
      existingImage
        ? [{ uid: '-1', name: 'current-image', status: 'done', url: existingImage }]
        : []
    )
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      basePrice: record.basePrice,
      categoryId: record.categoryId,
      brand: record.brand,
      status: record.status,
      stockQuantity: record.stockQuantity,
    })
    setModalOpen(true)
  }

  // Custom upload handler — sends to POST /api/upload
  const handleUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file as File)
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url: string = data.data.url
      setImageUrl(url)
      onSuccess?.(data)
      message.success('Image uploaded')
    } catch (err: any) {
      onError?.(err)
      message.error(err?.response?.data?.error || 'Image upload failed')
    }
    setUploading(false)
  }

  const handleSave = async (values: any) => {
    setSaving(true)
    try {
      const payload = { ...values, image_url: imageUrl || undefined }
      if (editing) {
        await api.put(`/products/${editing.id}`, payload)
        message.success('Product updated')
      } else {
        const slug = values.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
        await api.post('/products', { ...payload, slug })
        message.success('Product created')
      }
      setModalOpen(false)
      form.resetFields()
      setImageUrl('')
      setFileList([])
      fetchProducts()
    } catch (e: any) {
      message.error(e?.response?.data?.error || 'Failed to save product')
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`)
      message.success('Product deleted')
      fetchProducts()
    } catch {
      message.error('Failed to delete product')
    }
  }

  const columns = [
    {
      title: 'Image', key: 'image', width: 60,
      render: (_: any, r: any) => {
        const src = r.image_url || r.images?.[0]?.url
        return src
          ? <img src={src} alt={r.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
          : <div style={{ width: 40, height: 40, background: '#f0f0f0', borderRadius: 4 }} />
      },
    },
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n: string) => <Typography.Text strong>{n}</Typography.Text> },
    { title: 'Category', dataIndex: 'categoryName', key: 'categoryName', render: (c: string) => c ? <Tag>{c}</Tag> : '—' },
    { title: 'Price', dataIndex: 'basePrice', key: 'basePrice', render: (v: number) => `$${Number(v || 0).toFixed(2)}` },
    { title: 'Stock', dataIndex: 'stockQuantity', key: 'stockQuantity', render: (v: number) => <Tag color={v > 10 ? 'green' : v > 0 ? 'orange' : 'red'}>{v ?? 0}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'published' ? 'green' : s === 'draft' ? 'default' : 'red'}>{s}</Tag> },
    { title: 'Rating', dataIndex: 'averageRating', key: 'averageRating', render: (v: number) => v ? `${Number(v).toFixed(1)} ★` : '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
            <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Products Management</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Product</Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search products..." value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={() => { setPage(1); fetchProducts(1, search) }}
            style={{ width: 280 }} enterButton={<SearchOutlined />}
          />
        </Space>
        <Table
          columns={columns} dataSource={products} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `${t} products` }}
          size="small"
        />
      </Card>

      <Modal
        title={editing ? 'Edit Product' : 'Create Product'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setImageUrl(''); setFileList([]) }}
        onOk={() => form.submit()}
        okText={editing ? 'Save Changes' : 'Create'}
        confirmLoading={saving}
        width={620}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} style={{ marginTop: 16 }}>
          <Form.Item label="Product Image">
            <Upload
              listType="picture-card"
              fileList={fileList}
              customRequest={handleUpload}
              onChange={({ fileList: fl }) => setFileList(fl)}
              maxCount={1}
              accept="image/jpeg,image/png,image/webp,image/gif"
              onRemove={() => { setImageUrl(''); setFileList([]) }}
            >
              {fileList.length === 0 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>{uploading ? 'Uploading...' : 'Upload'}</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Form.Item name="name" label="Product Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Wireless Headphones" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Product description..." />
          </Form.Item>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="basePrice" label="Price ($)" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="0.00" />
            </Form.Item>
            <Form.Item name="stockQuantity" label="Stock Qty" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size={16}>
            <Form.Item name="categoryId" label="Category" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Select category">
                {categories.map((c: any) => (
                  <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="status" label="Status" initialValue="draft" style={{ flex: 1 }}>
              <Select>
                <Select.Option value="draft">Draft</Select.Option>
                <Select.Option value="published">Published</Select.Option>
                <Select.Option value="archived">Archived</Select.Option>
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="brand" label="Brand">
            <Input placeholder="e.g. Sony" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
