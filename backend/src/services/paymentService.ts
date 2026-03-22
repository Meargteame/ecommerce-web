import Stripe from 'stripe'
import pool from '../config/database'
import crypto from 'crypto'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-02-25.clover' as any,
})

interface CreatePaymentIntentDTO {
  orderId: string
  currency?: string
}

interface ConfirmPaymentDTO {
  orderId: string
  paymentIntentId: string
}

interface Payment {
  id: string
  orderId: string
  paymentGateway: string
  transactionId?: string
  paymentMethod: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  paymentDetails?: any
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

interface RefundDTO {
  paymentId: string
  amount: number
  reason: string
  processedBy: string
}

export class PaymentService {
  /**
   * Create a Stripe PaymentIntent for an order.
   * Returns the clientSecret to the frontend for Stripe Elements.
   */
  async createPaymentIntent(data: CreatePaymentIntentDTO): Promise<{
    clientSecret: string
    paymentIntentId: string
    amount: number
    currency: string
  }> {
    const orderResult = await pool.query(
      'SELECT id, total_amount, currency, status FROM orders WHERE id = ?',
      [data.orderId]
    )
    if (orderResult.rows.length === 0) throw new Error('Order not found')

    const order = orderResult.rows[0]
    if (!['placed'].includes(order.status)) {
      throw new Error('Order is not in a valid state for payment')
    }

    const currency = (data.currency || order.currency || 'usd').toLowerCase()
    // Stripe amounts are in smallest currency unit (cents)
    const amountCents = Math.round(parseFloat(order.total_amount) * 100)

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      metadata: { orderId: data.orderId },
      automatic_payment_methods: { enabled: true },
    })

    // Upsert a pending payment record
    await pool.query(
      `INSERT INTO payments (id, order_id, payment_gateway, payment_method, amount, currency, status, transaction_id)
       VALUES (?, ?, 'stripe', 'credit_card', ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE transaction_id = VALUES(transaction_id), status = 'pending', updated_at = CURRENT_TIMESTAMP`,
      [crypto.randomUUID(), data.orderId, order.total_amount, currency, intent.id]
    )

    return {
      clientSecret: intent.client_secret!,
      paymentIntentId: intent.id,
      amount: parseFloat(order.total_amount),
      currency,
    }
  }

  /**
   * Confirm payment after Stripe Elements succeeds on the frontend.
   * Verifies the PaymentIntent status with Stripe, then updates DB.
   */
  async confirmPayment(data: ConfirmPaymentDTO): Promise<Payment> {
    const intent = await stripe.paymentIntents.retrieve(data.paymentIntentId)

    if (intent.metadata.orderId !== data.orderId) {
      throw new Error('PaymentIntent does not match order')
    }

    if (intent.status !== 'succeeded') {
      throw new Error(`Payment not succeeded. Status: ${intent.status}`)
    }

    const client = await pool.getConnection()
    try {
      await client.beginTransaction()

      await client.query(
        `UPDATE payments SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ? AND transaction_id = ?`,
        [data.orderId, data.paymentIntentId]
      )

      await client.query(
        `UPDATE orders SET status = 'payment_confirmed', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [data.orderId]
      )

      await client.query(
        `INSERT INTO order_status_history (id, order_id, status, notes) VALUES (?, ?, ?, ?)`,
        [crypto.randomUUID(), data.orderId, 'payment_confirmed', 'Payment confirmed via Stripe']
      )

      await client.commit()
    } catch (err) {
      await client.rollback()
      throw err
    } finally {
      client.release()
    }

    const result = await pool.query(
      'SELECT * FROM payments WHERE order_id = ? AND transaction_id = ?',
      [data.orderId, data.paymentIntentId]
    )
    return this.mapPayment(result.rows[0])
  }

  /**
   * Handle Stripe webhook events.
   * Verifies signature, processes payment_intent.succeeded / payment_intent.payment_failed.
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification')
    }

    let event: Stripe.Event
    try {
      event = webhookSecret
        ? stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        : JSON.parse(rawBody.toString())
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${(err as Error).message}`)
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        const orderId = intent.metadata?.orderId
        if (!orderId) break

        const client = await pool.getConnection()
        try {
          await client.beginTransaction()
          await client.query(
            `UPDATE payments SET status = 'completed', updated_at = CURRENT_TIMESTAMP
             WHERE order_id = ? AND transaction_id = ? AND status != 'completed'`,
            [orderId, intent.id]
          )
          await client.query(
            `UPDATE orders SET status = 'payment_confirmed', updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 'placed'`,
            [orderId]
          )
          try {
            await client.query(
              `INSERT INTO order_status_history (id, order_id, status, notes) VALUES (?, ?, ?, ?)`,
              [crypto.randomUUID(), orderId, 'payment_confirmed', 'Payment confirmed via Stripe webhook']
            )
          } catch {
            // Ignore duplicate entry errors
          }
          await client.commit()
        } catch (err) {
          await client.rollback()
          console.error('Webhook DB error:', err)
        } finally {
          client.release()
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        const orderId = intent.metadata?.orderId
        if (!orderId) break

        await pool.query(
          `UPDATE payments SET status = 'failed',
             error_message = ?, updated_at = CURRENT_TIMESTAMP
           WHERE order_id = ? AND transaction_id = ?`,
          [intent.last_payment_error?.message || 'Payment failed', orderId, intent.id]
        )
        break
      }

      default:
        // Unhandled event type — ignore
        break
    }
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    const result = await pool.query(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    )
    if (result.rows.length === 0) return null
    return this.mapPayment(result.rows[0])
  }

  async processRefund(data: RefundDTO): Promise<any> {
    const client = await pool.getConnection()
    try {
      await client.beginTransaction()

      const [paymentRows] = await client.query(
        'SELECT * FROM payments WHERE id = ?', [data.paymentId]
      )
      const paymentResult = paymentRows as any[]
      if (paymentResult.length === 0) throw new Error('Payment not found')

      const payment = paymentResult[0]
      if (payment.status !== 'completed') throw new Error('Payment is not completed')
      if (data.amount > parseFloat(payment.amount)) throw new Error('Refund amount exceeds payment amount')

      // Issue refund via Stripe
      const refundAmountCents = Math.round(data.amount * 100)
      const stripeRefund = await stripe.refunds.create({
        payment_intent: payment.transaction_id,
        amount: refundAmountCents,
        reason: 'requested_by_customer',
      })

      const id = crypto.randomUUID()
      await client.query(
        `INSERT INTO refunds (id, payment_id, order_id, amount, reason, status, processed_by, refund_transaction_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, data.paymentId, payment.order_id, data.amount,
          data.reason, 'completed', data.processedBy, stripeRefund.id,
        ]
      )

      if (data.amount >= parseFloat(payment.amount)) {
        await client.query(
          `UPDATE payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [data.paymentId]
        )
      }

      await client.commit()
      
      const [refundRows] = await client.query('SELECT * FROM refunds WHERE id = ?', [id])
      const refund = (refundRows as any[])[0]
      return {
        id: refund.id,
        paymentId: refund.payment_id,
        orderId: refund.order_id,
        amount: parseFloat(refund.amount),
        reason: refund.reason,
        status: refund.status,
        refundTransactionId: refund.refund_transaction_id,
      }
    } catch (error) {
      await client.rollback()
      throw error
    } finally {
      client.release()
    }
  }

  private mapPayment(row: any): Payment {
    return {
      id: row.id,
      orderId: row.order_id,
      paymentGateway: row.payment_gateway,
      transactionId: row.transaction_id,
      paymentMethod: row.payment_method,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      paymentDetails: row.payment_details,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new PaymentService()
