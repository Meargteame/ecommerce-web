'use client'

import { useState } from 'react'
import { useLoyaltyStore } from '@/store/loyaltyStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Star, Trophy, Gift, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoyaltyDashboard() {
  const { points, fetchPoints, redeemPoints, loading } = useLoyaltyStore()
  const [redeemAmount, setRedeemAmount] = useState(100)

  const tierColors = {
    bronze: 'bg-amber-100 text-amber-800',
    silver: 'bg-gray-100 text-gray-800',
    gold: 'bg-yellow-100 text-yellow-800',
    platinum: 'bg-purple-100 text-purple-800'
  }

  const tierIcons = {
    bronze: <Trophy className="h-4 w-4" />,
    silver: <Trophy className="h-4 w-4" />,
    gold: <Trophy className="h-4 w-4" />,
    platinum: <Trophy className="h-4 w-4" />
  }

  const handleRedeem = async () => {
    await redeemPoints(redeemAmount)
    setRedeemAmount(100)
  }

  return (
    <div className="space-y-6">
      {/* Points Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available Points</p>
                <p className="text-3xl font-bold text-primary">{points?.available_points || 0}</p>
              </div>
              <Star className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Points Value</p>
                <p className="text-3xl font-bold">${points?.pointsValue || 0}</p>
              </div>
              <Gift className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lifetime Points</p>
                <p className="text-3xl font-bold text-purple-600">{points?.lifetime_points || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Status */}
      {points && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {tierIcons[points.tier]}
              {points.tier.charAt(0).toUpperCase() + points.tier.slice(1)} Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={tierColors[points.tier]}>
                Current Tier: {points.tier.toUpperCase()}
              </Badge>
              {points.nextTier && (
                <Badge variant="outline">
                  {points.pointsToNextTier} points to {points.nextTier}
                </Badge>
              )}
            </div>

            {/* Progress to next tier */}
            {points.nextTier && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress to {points.nextTier}</span>
                  <span>{points.pointsToNextTier} points</span>
                </div>
                <Progress 
                  value={((points.lifetime_points - (points.pointsToNextTier + 2000)) / 2000) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Tier Benefits */}
            <div>
              <h4 className="font-medium mb-2">Your Benefits:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{points.benefits.discount}%</div>
                  <div className="text-sm text-gray-600">Member Discount</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{points.benefits.pointsMultiplier}x</div>
                  <div className="text-sm text-gray-600">Points Multiplier</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">${points.benefits.freeShippingThreshold}</div>
                  <div className="text-sm text-gray-600">Free Shipping</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redeem Points */}
      <Card>
        <CardHeader>
          <CardTitle>Redeem Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[100, 500, 1000, 2000].map((amount) => (
              <button
                key={amount}
                onClick={() => setRedeemAmount(amount)}
                className={cn(
                  "p-3 rounded-lg border text-center transition-colors",
                  redeemAmount === amount
                    ? "border-primary bg-primary/5"
                    : "hover:bg-gray-50"
                )}
              >
                <div className="font-bold">{amount}</div>
                <div className="text-sm text-gray-500">points</div>
                <div className="text-sm font-medium">${amount * 0.01}</div>
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="custom-amount">Custom Amount</Label>
            <Input
              id="custom-amount"
              type="number"
              min={100}
              max={points?.available_points || 0}
              value={redeemAmount}
              onChange={(e) => setRedeemAmount(parseInt(e.target.value))}
              className="mt-1"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Store Credit:</span>
              <span className="text-xl font-bold">${(redeemAmount * 0.01).toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Points will be converted to store credit immediately
            </p>
          </div>

          <Button 
            onClick={handleRedeem} 
            disabled={loading || !points || redeemAmount > points.available_points || redeemAmount < 100}
            className="w-full"
          >
            {loading ? 'Redeeming...' : `Redeem ${redeemAmount} Points`}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {points?.recentTransactions && points.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {points.recentTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full",
                      transaction.type === 'earn' && "bg-green-100",
                      transaction.type === 'redeem' && "bg-red-100",
                      transaction.type === 'bonus' && "bg-blue-100"
                    )}>
                      {transaction.type === 'earn' && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {transaction.type === 'redeem' && <Gift className="h-4 w-4 text-red-600" />}
                      {transaction.type === 'bonus' && <Star className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description || transaction.type}</p>
                      {transaction.order_number && (
                        <p className="text-sm text-gray-500">Order #{transaction.order_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "font-bold",
                      transaction.points > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {transaction.points > 0 ? '+' : ''}{transaction.points}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
