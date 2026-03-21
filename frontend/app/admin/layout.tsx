'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { ConfigProvider, Layout, Menu, Avatar, Typography } from 'antd'
import {
  DashboardOutlined, AppstoreOutlined, ShoppingOutlined,
  UserOutlined, TagOutlined, BarChartOutlined, LogoutOutlined,
  InboxOutlined, ShopOutlined, DollarOutlined, StarOutlined,
  CustomerServiceOutlined, SettingOutlined, FileTextOutlined,
  FolderOutlined,
} from '@ant-design/icons'

const { Sider, Content } = Layout
const { Text } = Typography

const antTheme = {
  token: {
    colorPrimary: '#7c3aed',
    colorLink: '#7c3aed',
    borderRadius: 12,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  components: {
    Menu: {
      itemSelectedBg: '#f5f3ff',
      itemSelectedColor: '#7c3aed',
      itemHoverBg: '#f5f3ff',
      itemHoverColor: '#7c3aed',
    },
    Button: { borderRadius: 999, borderRadiusSM: 999, borderRadiusLG: 999 },
    Card: { borderRadius: 16, borderRadiusLG: 20 },
    Table: { borderRadius: 12 },
    Input: { borderRadius: 999, borderRadiusSM: 999, borderRadiusLG: 999 },
    Select: { borderRadius: 999, borderRadiusSM: 999 },
    Tag: { borderRadius: 999 },
    Modal: { borderRadius: 20, borderRadiusLG: 20 },
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/')
    if (!user) router.push('/auth/login')
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  const selectedKey =
    pathname === '/admin' ? 'dashboard'
    : pathname.startsWith('/admin/sellers') ? 'sellers'
    : pathname.startsWith('/admin/products') ? 'products'
    : pathname.startsWith('/admin/orders') ? 'orders'
    : pathname.startsWith('/admin/inventory') ? 'inventory'
    : pathname.startsWith('/admin/vendors') ? 'vendors'
    : pathname.startsWith('/admin/users') ? 'users'
    : pathname.startsWith('/admin/commissions') ? 'commissions'
    : pathname.startsWith('/admin/promotions') ? 'promotions'
    : pathname.startsWith('/admin/analytics') ? 'analytics'
    : pathname.startsWith('/admin/categories') ? 'categories'
    : pathname.startsWith('/admin/reviews') ? 'reviews'
    : pathname.startsWith('/admin/support') ? 'support'
    : pathname.startsWith('/admin/settings') ? 'settings'
    : pathname.startsWith('/admin/logs') ? 'logs'
    : 'dashboard'

  const menuItems = [
    { key: 'dashboard',   icon: <DashboardOutlined />,       label: <Link href="/admin">Dashboard</Link> },
    { key: 'sellers',     icon: <ShopOutlined />,            label: <Link href="/admin/sellers">Sellers</Link> },
    { key: 'users',       icon: <UserOutlined />,            label: <Link href="/admin/users">Users</Link> },
    { key: 'products',    icon: <AppstoreOutlined />,        label: <Link href="/admin/products">Products</Link> },
    { key: 'orders',      icon: <ShoppingOutlined />,        label: <Link href="/admin/orders">Orders</Link> },
    { key: 'inventory',   icon: <InboxOutlined />,           label: <Link href="/admin/inventory">Inventory</Link> },
    { key: 'commissions', icon: <DollarOutlined />,          label: <Link href="/admin/commissions">Commissions</Link> },
    { key: 'analytics',   icon: <BarChartOutlined />,        label: <Link href="/admin/analytics">Analytics</Link> },
    { key: 'categories',  icon: <FolderOutlined />,          label: <Link href="/admin/categories">Categories</Link> },
    { key: 'promotions',  icon: <TagOutlined />,             label: <Link href="/admin/promotions">Promotions</Link> },
    { key: 'reviews',     icon: <StarOutlined />,            label: <Link href="/admin/reviews">Reviews</Link> },
    { key: 'support',     icon: <CustomerServiceOutlined />, label: <Link href="/admin/support">Support</Link> },
    { key: 'settings',    icon: <SettingOutlined />,         label: <Link href="/admin/settings">Settings</Link> },
    { key: 'logs',        icon: <FileTextOutlined />,        label: <Link href="/admin/logs">Logs</Link> },
  ]

  return (
    <ConfigProvider theme={antTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          width={230}
          theme="light"
          style={{
            borderRight: '1px solid #f0f0f0',
            background: '#ffffff',
            overflow: 'auto',
            height: '100vh',
            position: 'sticky',
            top: 0,
          }}
        >
          <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #f0f0f0' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 6px 16px rgba(124, 58, 237, 0.25)',
                }}
              >
                <ShopOutlined style={{ color: '#ffffff', fontSize: 17 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <Text strong style={{ fontSize: 14, color: '#111827' }}>ShopHub Admin</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>Ecommerce Portal</Text>
              </div>
            </Link>
          </div>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{ border: 'none', flex: 1, padding: '10px 8px 12px', background: 'transparent' }}
          />
          <div style={{ padding: '12px 12px', borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '0 4px' }}>
              <Avatar size={32} style={{ background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </Avatar>
              <div style={{ overflow: 'hidden' }}>
                <Text strong style={{ fontSize: 12, display: 'block' }}>{user.first_name} {user.last_name}</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>{user.email}</Text>
              </div>
            </div>
            <Menu
              mode="inline"
              style={{ border: 'none' }}
              items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true }]}
              onClick={async () => { await logout(); router.push('/') }}
            />
          </div>
        </Sider>
        <Content style={{ background: '#f5f5f5', overflow: 'auto' }}>{children}</Content>
      </Layout>
    </ConfigProvider>
  )
}
