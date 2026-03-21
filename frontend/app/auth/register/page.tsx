'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthModalStore } from '@/store/authModalStore'
import { useAuthStore } from '@/store/authStore'
import { Suspense } from 'react'

function RegisterRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const openModal = useAuthModalStore((s) => s.openModal)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user) {
      router.replace('/')
      return
    }
    const isSeller = searchParams.get('seller') === 'true'
    router.replace(isSeller ? '/?auth=register&seller=true' : '/?auth=register')
  }, [user, router, openModal, searchParams])

  return null
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterRedirect />
    </Suspense>
  )
}
