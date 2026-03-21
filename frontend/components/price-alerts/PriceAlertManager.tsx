'use client'

import { useState } from 'react'
import { usePriceAlertStore } from '@/store/returnsAndGiftCardsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, BellOff, TrendingDown, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PriceAlertButtonProps {
  productId: string
  currentPrice: number
  productName: string
  trigger?: React.ReactNode
}

export function PriceAlertButton({ productId, currentPrice, productName, trigger }: PriceAlertButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [targetPrice, setTargetPrice] = useState(Math.floor(currentPrice * 0.8))
  const { createAlert, loading } = usePriceAlertStore()

  const handleCreate = async () => {
    await createAlert(productId, targetPrice)
    setIsOpen(false)
  }

  const Trigger = trigger || (
    <Button variant="outline" size="sm" className="gap-2">
      <Bell className="h-4 w-4" />
      Price Alert
    </Button>
  )

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{Trigger}</div>
      
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Set Price Alert</h3>
              <button onClick={() => setIsOpen(false)}>
                <BellOff className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Notify me when <strong>{productName}</strong> drops below:
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">$</span>
                  <Input
                    type="number"
                    min="0.01"
                    max={currentPrice - 0.01}
                    step="0.01"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(parseFloat(e.target.value))}
                    className="text-2xl font-bold h-12"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Current: ${currentPrice}</span>
                  <span className="text-green-600">
                    Save ${(currentPrice - targetPrice).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Quick suggestions:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTargetPrice(Math.floor(currentPrice * 0.9))}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    -10%
                  </button>
                  <button
                    onClick={() => setTargetPrice(Math.floor(currentPrice * 0.8))}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    -20%
                  </button>
                  <button
                    onClick={() => setTargetPrice(Math.floor(currentPrice * 0.7))}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    -30%
                  </button>
                  <button
                    onClick={() => setTargetPrice(Math.floor(currentPrice * 0.5))}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    -50%
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={targetPrice >= currentPrice || loading}
                  className="flex-1"
                >
                  {loading ? 'Creating...' : 'Create Alert'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export function PriceAlertManager() {
  const { alerts, fetchAlerts, deleteAlert, loading } = usePriceAlertStore()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    try {
      await deleteAlert(id)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete alert')
    }
  }

  const reachedAlerts = alerts.filter(a => a.alert_status === 'target_reached')
  const waitingAlerts = alerts.filter(a => a.alert_status === 'waiting')

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Alerts</p>
                <p className="text-2xl font-bold">{waitingAlerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Target Reached</p>
                <p className="text-2xl font-bold text-green-600">{reachedAlerts.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reached Alerts */}
      {reachedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Price Drops Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reachedAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-gray-100">
                      {alert.image ? (
                        <img
                          src={alert.image}
                          alt={alert.product_name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <TrendingDown className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{alert.product_name}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Target: ${alert.target_price}</span>
                        <span className="text-green-600 font-bold">Now: ${alert.current_price}</span>
                        <span className="text-green-600">
                          Save ${(alert.target_price - alert.current_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" asChild>
                    <a href={`/products/${alert.slug}`}>Buy Now</a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiting Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Active Price Alerts ({waitingAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No price alerts set</p>
              <p className="text-sm mt-1">Set alerts on product pages to get notified of price drops</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-gray-100">
                      {alert.image ? (
                        <img
                          src={alert.image}
                          alt={alert.product_name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Bell className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{alert.product_name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Current: ${alert.current_price}</span>
                        <span>Target: ${alert.target_price}</span>
                        <span className="text-orange-600">
                          Need -${(alert.current_price - alert.target_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      Waiting
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(alert.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
}
