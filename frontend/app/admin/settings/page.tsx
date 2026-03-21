'use client'

import { useEffect, useState } from 'react'
import { Card, Form, Input, InputNumber, Switch, Button, message, Typography, Row, Col, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import api from '@/lib/api'

const { Title, Text } = Typography

export default function AdminSettingsPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => {
        const s = data.data || {}
        form.setFieldsValue({
          commission_rate: parseFloat(s.commission_rate || '10'),
          tax_rate: parseFloat(s.tax_rate || '0'),
          free_shipping_threshold: parseFloat(s.free_shipping_threshold || '50'),
          max_products_per_seller: parseInt(s.max_products_per_seller || '500'),
          maintenance_mode: s.maintenance_mode === 'true',
          allow_seller_registration: s.allow_seller_registration !== 'false',
          stripe_enabled: s.stripe_enabled !== 'false',
          email_notifications: s.email_notifications !== 'false',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (values: any) => {
    setSaving(true)
    try {
      const payload: Record<string, string> = {}
      Object.entries(values).forEach(([k, v]) => {
        payload[k] = String(v)
      })
      await api.put('/admin/settings', payload)
      message.success('Settings saved')
    } catch { message.error('Failed to save settings') }
    setSaving(false)
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>Platform Settings</Title>
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Row gutter={24}>
          <Col xs={24} lg={12}>
            <Card title="Commerce Settings" style={{ marginBottom: 16 }} loading={loading}>
              <Form.Item name="commission_rate" label="Platform Commission Rate (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
              <Form.Item name="tax_rate" label="Default Tax Rate (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
              <Form.Item name="free_shipping_threshold" label="Free Shipping Threshold ($)">
                <InputNumber min={0} style={{ width: '100%' }} addonBefore="$" />
              </Form.Item>
              <Form.Item name="max_products_per_seller" label="Max Products per Seller">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Feature Toggles" style={{ marginBottom: 16 }} loading={loading}>
              <Form.Item name="maintenance_mode" label="Maintenance Mode" valuePropName="checked">
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
                When enabled, the storefront shows a maintenance page to visitors.
              </Text>
              <Divider />
              <Form.Item name="allow_seller_registration" label="Allow Seller Registration" valuePropName="checked">
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
              <Divider />
              <Form.Item name="stripe_enabled" label="Stripe Payments" valuePropName="checked">
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
              <Divider />
              <Form.Item name="email_notifications" label="Email Notifications" valuePropName="checked">
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
          Save All Settings
        </Button>
      </Form>
    </div>
  )
}
