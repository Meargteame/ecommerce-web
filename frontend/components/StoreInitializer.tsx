'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'

// Initializes stores from localStorage on first client render
export default function StoreInitializer() {
  const loadUser = useAuthStore((s) => s.loadUser)
  const fetchCart = useCartStore((s) => s.fetchCart)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    if (user) fetchCart()
  }, [user, fetchCart])

  return null
}
