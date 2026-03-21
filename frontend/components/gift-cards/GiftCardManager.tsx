'use client'

import { useState } from 'react'
import { useGiftCardStore } from '@/store/returnsAndGiftCardsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Gift, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function GiftCardManager() {
  const { received, sent, fetchCards, purchaseCard, redeemCard, checkBalance, loading } = useGiftCardStore()
  const [activeTab, setActiveTab] = useState('received')
  const [redeemCode, setRedeemCode] = useState('')
  const [checkCode, setCheckCode] = useState('')
  const [balanceInfo, setBalanceInfo] = useState<{ balance: number; expiresAt?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRedeem = async () => {
    setError(null)
    try {
      await redeemCard(redeemCode)
      setRedeemCode('')
      await fetchCards()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to redeem gift card')
    }
  }

  const handleCheckBalance = async () => {
    setError(null)
    try {
      const info = await checkBalance(checkCode)
      setBalanceInfo(info)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid gift card code')
      setBalanceInfo(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Redeem Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Redeem Gift Card
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter gift card code (e.g., GC-XXXX-XXXX)"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button onClick={handleRedeem} disabled={!redeemCode || loading}>
              Redeem
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check Balance Section */}
      <Card>
        <CardHeader>
          <CardTitle>Check Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter code to check balance"
              value={checkCode}
              onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button onClick={handleCheckBalance} disabled={!checkCode} variant="outline">
              Check
            </Button>
          </div>
          {balanceInfo && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Gift Card Active</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                ${balanceInfo.balance.toFixed(2)}
              </p>
              {balanceInfo.expiresAt && (
                <p className="text-sm text-green-600 mt-1">
                  Expires: {new Date(balanceInfo.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* My Gift Cards */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">Received ({received.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          {received.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Gift className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No gift cards received yet</p>
            </div>
          ) : (
            received.map((card) => (
              <Card key={card.id} className={cn(
                card.status === 'redeemed' && "opacity-75"
              )}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        Gift Card {card.status === 'redeemed' && '(Redeemed)'}
                      </p>
                      <p className="text-sm text-gray-500">
                        From: {card.sender_first_name} {card.sender_last_name}
                      </p>
                      {card.message && (
                        <p className="text-sm italic mt-2">"{card.message}"</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${card.current_balance.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">of ${card.initial_balance.toFixed(2)}</p>
                    </div>
                  </div>
                  {card.expires_at && new Date(card.expires_at) < new Date() && (
                    <p className="text-red-600 text-sm mt-2">Expired</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sent.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Gift className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No gift cards sent yet</p>
            </div>
          ) : (
            sent.map((card) => (
              <Card key={card.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Gift Card to {card.recipient_name || card.recipient_email}</p>
                      <p className="text-sm text-gray-500">
                        Sent: {new Date(card.purchased_at).toLocaleDateString()}
                      </p>
                      {card.message && (
                        <p className="text-sm italic mt-2">"{card.message}"</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">${card.initial_balance.toFixed(2)}</p>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        card.status === 'active' && "bg-green-100 text-green-800",
                        card.status === 'redeemed' && "bg-blue-100 text-blue-800",
                        card.status === 'expired' && "bg-red-100 text-red-800"
                      )}>
                        {card.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function PurchaseGiftCardForm() {
  const { purchaseCard, loading } = useGiftCardStore()
  const [amount, setAmount] = useState<number>(50)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'digital' | 'physical'>('digital')
  const [success, setSuccess] = useState(false)

  const presetAmounts = [25, 50, 100, 200, 500]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await purchaseCard({
        amount,
        recipientEmail,
        recipientName,
        message,
        type
      })
      setSuccess(true)
    } catch (err) {
      // Error handled in store
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Gift Card Sent!</h3>
        <p className="text-gray-600">
          Your ${amount} gift card has been sent to {recipientEmail}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Selection */}
      <div>
        <Label className="font-medium">Select Amount</Label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={cn(
                "py-2 rounded-lg border font-medium transition-colors",
                amount === preset
                  ? "border-primary bg-primary text-white"
                  : "hover:bg-gray-50"
              )}
            >
              ${preset}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label className="text-sm">Custom Amount ($10 - $1,000)</Label>
          <Input
            type="number"
            min={10}
            max={1000}
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            className="mt-1"
          />
        </div>
      </div>

      {/* Recipient Info */}
      <div className="space-y-3">
        <div>
          <Label htmlFor="recipient-email">Recipient Email *</Label>
          <Input
            id="recipient-email"
            type="email"
            required
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="recipient-name">Recipient Name</Label>
          <Input
            id="recipient-name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <Label htmlFor="message">Personal Message</Label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
          placeholder="Add a personal message (optional)"
          className="w-full mt-1 px-3 py-2 border rounded-lg min-h-[100px]"
        />
        <p className="text-xs text-gray-500 mt-1">{message.length}/200 characters</p>
      </div>

      {/* Type */}
      <div>
        <Label className="font-medium">Delivery Method</Label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => setType('digital')}
            className={cn(
              "p-4 rounded-lg border text-center transition-colors",
              type === 'digital'
                ? "border-primary bg-primary/5"
                : "hover:bg-gray-50"
            )}
          >
            <div className="font-medium">Digital</div>
            <div className="text-sm text-gray-500">Delivered by email</div>
          </button>
          <button
            type="button"
            onClick={() => setType('physical')}
            disabled
            className="p-4 rounded-lg border text-center opacity-50 cursor-not-allowed"
          >
            <div className="font-medium">Physical Card</div>
            <div className="text-sm text-gray-500">Shipped to recipient</div>
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total:</span>
          <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
        </div>
      </div>

      <Button type="submit" disabled={loading || amount < 10 || !recipientEmail} className="w-full">
        {loading ? 'Processing...' : 'Purchase Gift Card'}
      </Button>
    </form>
  )
}
