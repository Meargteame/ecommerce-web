'use client'

import { useState } from 'react'
import { useReturnsStore } from '@/store/returnsAndGiftCardsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Package, Truck, RotateCcw, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InitiateReturnFormProps {
  orderId: string
  orderItems: Array<{
    id: string
    product_id: string
    product_name: string
    product_image?: string
    variant_name?: string
    quantity: number
    unit_price: number
  }>
  onSuccess?: () => void
  onCancel?: () => void
}

const returnReasons = [
  { value: 'defective', label: 'Item defective or not working' },
  { value: 'wrong_item', label: 'Received wrong item' },
  { value: 'not_as_described', label: 'Item not as described' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'arrived_late', label: 'Item arrived too late' },
  { value: 'other', label: 'Other reason' }
]

const returnMethods = [
  { value: 'pickup', label: 'Schedule Pickup' },
  { value: 'dropoff', label: 'Drop off at location' },
  { value: 'mail', label: 'Mail the item back' }
]

export function InitiateReturnForm({ orderId, orderItems, onSuccess, onCancel }: InitiateReturnFormProps) {
  const { initiateReturn, loading } = useReturnsStore()
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [reasonDetails, setReasonDetails] = useState('')
  const [returnMethod, setReturnMethod] = useState('pickup')

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
    
    if (!returnQuantities[itemId]) {
      const item = orderItems.find(i => i.id === itemId)
      setReturnQuantities(prev => ({ ...prev, [itemId]: item?.quantity || 1 }))
    }
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setReturnQuantities(prev => ({ ...prev, [itemId]: quantity }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const items = selectedItems.map(itemId => ({
      orderItemId: itemId,
      quantity: returnQuantities[itemId] || 1
    }))

    await initiateReturn({
      orderId,
      reason,
      reasonDetails,
      returnMethod,
      items
    })

    onSuccess?.()
  }

  const totalRefund = selectedItems.reduce((sum, itemId) => {
    const item = orderItems.find(i => i.id === itemId)
    const quantity = returnQuantities[itemId] || 1
    return sum + (item?.unit_price || 0) * quantity
  }, 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="font-medium mb-3">Select items to return</h3>
        <div className="space-y-3">
          {orderItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                selectedItems.includes(item.id) && "border-primary bg-primary/5"
              )}
            >
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleItemToggle(item.id)}
              />
              
              <div className="flex-1 flex gap-3">
                <div className="w-16 h-16 rounded bg-gray-100 flex-shrink-0">
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-gray-300" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.product_name}</p>
                  {item.variant_name && (
                    <p className="text-sm text-gray-500">{item.variant_name}</p>
                  )}
                  <p className="text-sm font-medium mt-1">${item.unit_price}</p>
                  
                  {selectedItems.includes(item.id) && (
                    <div className="flex items-center gap-2 mt-2">
                      <Label className="text-xs">Qty to return:</Label>
                      <Input
                        type="number"
                        min={1}
                        max={item.quantity}
                        value={returnQuantities[item.id] || 1}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                        className="w-20 h-8"
                      />
                      <span className="text-xs text-gray-500">/ {item.quantity} purchased</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <>
          <div>
            <Label htmlFor="reason" className="font-medium">Reason for return *</Label>
            <Select value={reason} onValueChange={setReason} required>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {returnReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reason-details">Additional details</Label>
            <Textarea
              id="reason-details"
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="Please provide more details about the issue..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="font-medium">Return method</Label>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {returnMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setReturnMethod(method.value)}
                  className={cn(
                    "p-3 rounded-lg border text-center text-sm transition-colors",
                    returnMethod === method.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "hover:bg-gray-50"
                  )}
                >
                  {method.value === 'pickup' && <Truck className="h-5 w-5 mx-auto mb-1" />}
                  {method.value === 'dropoff' && <Package className="h-5 w-5 mx-auto mb-1" />}
                  {method.value === 'mail' && <RotateCcw className="h-5 w-5 mx-auto mb-1" />}
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Estimated Refund:</span>
              <span className="text-xl font-bold">${totalRefund.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Refund will be processed to your original payment method within 5-7 business days
            </p>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={selectedItems.length === 0 || !reason || loading}
          className="flex-1"
        >
          {loading ? 'Submitting...' : 'Submit Return Request'}
        </Button>
      </div>
    </form>
  )
}

export function ReturnStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    pending: { icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    approved: { icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800', label: 'Approved' },
    received: { icon: <Package className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800', label: 'Received' },
    refunded: { icon: <RotateCcw className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800', label: 'Refunded' },
    rejected: { icon: <X className="h-4 w-4" />, color: 'bg-red-100 text-red-800', label: 'Rejected' },
    closed: { icon: <AlertCircle className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800', label: 'Closed' },
    cancelled: { icon: <X className="h-4 w-4" />, color: 'bg-red-100 text-red-800', label: 'Cancelled' }
  }

  const { icon, color, label } = config[status] || config.pending

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", color)}>
      {icon}
      {label}
    </span>
  )
}
