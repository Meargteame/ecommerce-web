'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthModalStore } from '@/store/authModalStore'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const openModal = useAuthModalStore((s) => s.openModal)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user) {
      router.replace('/')
      return
    }
    // Go to homepage and open the modal there
    router.replace('/?auth=login')
  }, [user, router, openModal])

  return null
}
