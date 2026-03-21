'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthModalStore } from '@/store/authModalStore'

export default function AuthModalTrigger() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const openModal = useAuthModalStore((s) => s.openModal)

  useEffect(() => {
    const auth = searchParams.get('auth')
    if (auth === 'login') {
      openModal('login')
      router.replace('/')
    } else if (auth === 'register') {
      openModal('register')
      router.replace('/')
    }
  }, [searchParams, openModal, router])

  return null
}
