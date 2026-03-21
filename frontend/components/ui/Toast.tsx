'use client'

import { useWishlistStore } from '@/store/wishlistStore'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Toast() {
  const { toast, hideToast } = useWishlistStore()
  const [isRendered, setIsRendered] = useState(false)

  useEffect(() => {
    if (toast.visible) {
      setIsRendered(true)
    } else {
      const timer = setTimeout(() => setIsRendered(false), 500)
      return () => clearTimeout(timer)
    }
  }, [toast.visible])

  if (!isRendered) return null

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-primary" />,
  }

  return (
    <div className={`fixed bottom-8 right-8 z-[100] transition-all duration-500 transform ${
      toast.visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90'
    }`}>
      <div className="glass bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[1.5rem] p-4 pr-12 shadow-2xl shadow-black/10 flex items-center gap-4 min-w-[300px] relative overflow-hidden group">
        {/* Progress Bar */}
        <div className={`absolute bottom-0 left-0 h-1 bg-current transition-all duration-[3000ms] ease-linear ${
          toast.visible ? 'w-full' : 'w-0'
        } ${
          toast.type === 'success' ? 'text-green-500' : 
          toast.type === 'error' ? 'text-red-500' : 'text-primary'
        }`} />

        <div className={`p-2 rounded-xl ${
          toast.type === 'success' ? 'bg-green-100/50' : 
          toast.type === 'error' ? 'bg-red-100/50' : 'bg-primary/10'
        }`}>
          {icons[toast.type]}
        </div>

        <div>
          <p className="text-sm font-black text-gray-900 leading-tight">
            {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Notification'}
          </p>
          <p className="text-xs font-bold text-gray-500 mt-0.5">{toast.message}</p>
        </div>

        <button onClick={hideToast} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
