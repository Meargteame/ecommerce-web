'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Tag, Typography, Space, Button, Popconfirm, message, Rate, Input } from 'antd'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title, Text } = Typography

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const fetchReviews = async (p = page) => {
    setLoading(true)
    try {
      const { data } = await api.get('/admin/reviews', { params: { limit: 20, offset: (p - 1) * 20 } })
      setReviews(data.data?.reviews || [])
      setTotal(data.data?.total || 0)
    } catch { setReviews([]) }
    setLoading(false)
  }

  useEffect(() => { fetchReviews() }, [page])

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/reviews/${id}`)
      message.success('Review deleted')
      fetchReviews()
    } catch { message.error('Failed to delete') }
  }

  const columns = [
    {
      title: 'Product', dataIndex: 'productName', key: 'productName',
      render: (n: string) => <Text strong>{n}</Text>
    },
    {
      title: 'Reviewer', key: 'reviewer',
      render: (_: any, r: any) => (
        <div>
          <Text style={{ display: 'block', fontSize: 13 }}>{r.firstName} {r.lastName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.userEmail}</Text>
        </div>
      )
    },
    {
      title: 'Rating', dataIndex: 'rating', key: 'rating',
      render: (v: number) => <Rate disabled defaultValue={v} style={{ fontSize: 12 }} />
    },
    {
      title: 'Review', key: 'review',
      render: (_: any, r: any) => (
        <div>
          {r.title && <Text strong style={{ display: 'block', fontSize: 13 }}>{r.title}</Text>}
          <Text type="secondary" style={{ fontSize: 12 }}>{r.comment?.slice(0, 100)}{r.comment?.length > 100 ? '...' : ''}</Text>
        </div>
      )
    },
    {
      title: 'Verified', dataIndex: 'isVerifiedPurchase', key: 'isVerifiedPurchase',
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Verified' : 'Unverified'}</Tag>
    },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => d ? new Date(d).toLocaleDateString() : '—' },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Popconfirm title="Delete this review?" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      )
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 16 }}>Reviews Moderation</Title>
      <Card>
        <Table
          columns={columns} dataSource={reviews} rowKey="id" loading={loading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: t => `${t} reviews` }}
          size="small"
        />
      </Card>
    </div>
  )
}
