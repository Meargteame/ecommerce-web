import Stripe from 'stripe'
import pool from '../config/database'

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
      'SELECT id, total_amount, currency, status FROM orders WHERE id = $1',
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

    // Upsert a pending payment record (check-then-insert/update to avoid needing unique constraint)
    const existingPayment = await pool.query(
      'SELECT id FROM payments WHERE order_id = $1 LIMIT 1',
      [data.orderId]
    )
    if (existingPayment.rows.length > 0) {
      await pool.query(
        `UPDATE payments SET transaction_id = $1, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE order_id = $2`,
        [intent.id, data.orderId]
      )
    } else {
      await pool.query(
        `INSERT INTO payments (order_id, payment_gateway, payment_method, amount, currency, status, transaction_id)
         VALUES ($1, 'stripe', 'credit_card', $2, $3, 'pending', $4)`,
        [data.orderId, order.total_amount, currency, intent.id]
      )
    }

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

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `UPDATE payments SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE order_id = $1 AND transaction_id = $2`,
        [data.orderId, data.paymentIntentId]
      )

      await client.query(
        `UPDATE orders SET status = 'payment_confirmed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [data.orderId]
      )

      await client.query(
        `INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)`,
        [data.orderId, 'payment_confirmed', 'Payment confirmed via Stripe']
      )

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    const result = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 AND transaction_id = $2',
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

        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          await client.query(
            `UPDATE payments SET status = 'completed', updated_at = CURRENT_TIMESTAMP
             WHERE order_id = $1 AND transaction_id = $2 AND status != 'completed'`,
            [orderId, intent.id]
          )
          await client.query(
            `UPDATE orders SET status = 'payment_confirmed', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND status = 'placed'`,
            [orderId]
          )
          try {
            await client.query(
              `INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)`,
              [orderId, 'payment_confirmed', 'Payment confirmed via Stripe webhook']
            )
          } catch {
            // Ignore duplicate entry errors
          }
          await client.query('COMMIT')
        } catch (err) {
          await client.query('ROLLBACK')
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
             error_message = $1, updated_at = CURRENT_TIMESTAMP
           WHERE order_id = $2 AND transaction_id = $3`,
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
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    )
    if (result.rows.length === 0) return null
    return this.mapPayment(result.rows[0])
  }

  async processRefund(data: RefundDTO): Promise<any> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const paymentResult = await client.query(
        'SELECT * FROM payments WHERE id = $1', [data.paymentId]
      )
      if (paymentResult.rows.length === 0) throw new Error('Payment not found')

      const payment = paymentResult.rows[0]
      if (payment.status !== 'completed') throw new Error('Payment is not completed')
      if (data.amount > parseFloat(payment.amount)) throw new Error('Refund amount exceeds payment amount')

      // Issue refund via Stripe
      const refundAmountCents = Math.round(data.amount * 100)
      const stripeRefund = await stripe.refunds.create({
        payment_intent: payment.transaction_id,
        amount: refundAmountCents,
        reason: 'requested_by_customer',
      })

      const refundResult = await client.query(
        `INSERT INTO refunds (payment_id, order_id, amount, reason, status, processed_by, refund_transaction_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          data.paymentId, payment.order_id, data.amount,
          data.reason, 'completed', data.processedBy, stripeRefund.id,
        ]
      )

      if (data.amount >= parseFloat(payment.amount)) {
        await client.query(
          `UPDATE payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [data.paymentId]
        )
      }

      await client.query('COMMIT')
      const refund = refundResult.rows[0]
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
      await client.query('ROLLBACK')
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
