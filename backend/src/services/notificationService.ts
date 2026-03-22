import pool from '../config/database'

// In production, import SendGrid or AWS SES
// import sgMail from '@sendgrid/mail'
// sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

interface OrderData {
  orderNumber: string
  customerEmail: string
  customerName: string
  totalAmount: number
  currency: string
  items: any[]
  shippingAddress: any
}

export class NotificationService {
  private fromName = process.env.FROM_NAME || 'E-Commerce Platform'

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
      const apiKey = process.env.SENDGRID_API_KEY
      const fromEmail = process.env.FROM_EMAIL || 'noreply@example.com'

      if (apiKey) {
        // Real SendGrid send
        const sgMail = (await import('@sendgrid/mail')).default
        sgMail.setApiKey(apiKey)
        await sgMail.send({
          to,
          from: { email: fromEmail, name: this.fromName },
          subject,
          html,
          text: text || this.stripHtml(html),
        })
      } else {
        // Dev fallback — log to console
        console.log(`[EMAIL] To: ${to} | Subject: ${subject}`)
        console.log(`[EMAIL] ${text || this.stripHtml(html)}`)
      }
    }

  async sendOrderConfirmation(orderId: string): Promise<void> {
    const orderData = await this.getOrderData(orderId)

    if (!orderData) {
      throw new Error('Order not found')
    }

    const subject = `Order Confirmation - ${orderData.orderNumber}`
    const html = this.generateOrderConfirmationEmail(orderData)

    await this.sendEmail(orderData.customerEmail, subject, html)
  }

  async sendOrderStatusUpdate(orderId: string, status: string): Promise<void> {
    const orderData = await this.getOrderData(orderId)

    if (!orderData) {
      throw new Error('Order not found')
    }

    const statusMessages: Record<string, string> = {
      payment_confirmed: 'Your payment has been confirmed',
      processing: 'Your order is being processed',
      packed: 'Your order has been packed',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled',
    }

    const subject = `Order Update - ${orderData.orderNumber}`
    const html = this.generateOrderStatusUpdateEmail(
      orderData,
      status,
      statusMessages[status] || 'Order status updated'
    )

    await this.sendEmail(orderData.customerEmail, subject, html)
  }

  async sendShippingNotification(orderId: string, trackingNumber: string): Promise<void> {
    const orderData = await this.getOrderData(orderId)

    if (!orderData) {
      throw new Error('Order not found')
    }

    // Get shipment details
    const shipmentResult = await pool.query(
      'SELECT courier, tracking_url FROM shipments WHERE order_id = ? AND tracking_number = ?',
      [orderId, trackingNumber]
    )

    if (shipmentResult.rows.length === 0) {
      throw new Error('Shipment not found')
    }

    const shipment = shipmentResult.rows[0]

    const subject = `Your Order Has Shipped - ${orderData.orderNumber}`
    const html = this.generateShippingNotificationEmail(
      orderData,
      trackingNumber,
      shipment.courier,
      shipment.tracking_url
    )

    await this.sendEmail(orderData.customerEmail, subject, html)
  }

  async sendRefundConfirmation(orderId: string, amount: number): Promise<void> {
    const orderData = await this.getOrderData(orderId)

    if (!orderData) {
      throw new Error('Order not found')
    }

    const subject = `Refund Processed - ${orderData.orderNumber}`
    const html = this.generateRefundConfirmationEmail(orderData, amount)

    await this.sendEmail(orderData.customerEmail, subject, html)
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`

    const subject = 'Password Reset Request'
    const html = this.generatePasswordResetEmail(resetUrl)

    await this.sendEmail(email, subject, html)
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`
    const subject = 'Verify your email address'
    const html = `<p>Click the link below to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`
    await this.sendEmail(email, subject, html)
  }

  async sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
    const subject = 'Welcome to Our E-Commerce Platform'
    const html = this.generateWelcomeEmail(firstName)

    await this.sendEmail(email, subject, html)
  }

  async sendLowStockAlert(sku: string, quantity: number): Promise<void> {
    // Get admin emails
    const adminResult = await pool.query(
      "SELECT email FROM users WHERE role = 'admin'"
    )

    if (adminResult.rows.length === 0) {
      return
    }

    // Get product details
    const productResult = await pool.query(
      `SELECT p.name, pv.variant_name
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       WHERE pv.sku = ?`,
      [sku]
    )

    if (productResult.rows.length === 0) {
      return
    }

    const product = productResult.rows[0]
    const productName = product.variant_name
      ? `${product.name} - ${product.variant_name}`
      : product.name

    const subject = `Low Stock Alert - ${productName}`
    const html = this.generateLowStockAlertEmail(productName, sku, quantity)

    // Send to all admins
    for (const admin of adminResult.rows) {
      await this.sendEmail(admin.email, subject, html)
    }
  }

  async sendNewReviewNotification(productId: string, reviewId: string): Promise<void> {
    // Get admin emails
    const adminResult = await pool.query(
      "SELECT email FROM users WHERE role = 'admin'"
    )

    if (adminResult.rows.length === 0) {
      return
    }

    // Get product and review details
    const reviewResult = await pool.query(
      `SELECT p.name, r.rating, r.title, r.comment, u.email as reviewer_email
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [reviewId]
    )

    if (reviewResult.rows.length === 0) {
      return
    }

    const review = reviewResult.rows[0]

    const subject = `New Review - ${review.name}`
    const html = this.generateNewReviewNotificationEmail(review)

    // Send to all admins
    for (const admin of adminResult.rows) {
      await this.sendEmail(admin.email, subject, html)
    }
  }

  // Email template generators

  private generateOrderConfirmationEmail(orderData: OrderData): string {
    const itemsHtml = orderData.items
      .map(
        item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${orderData.currency} ${parseFloat(item.subtotal).toFixed(2)}</td>
        </tr>
      `
      )
      .join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8b5cf6;">Order Confirmation</h1>
        <p>Hi ${orderData.customerName},</p>
        <p>Thank you for your order! We've received your order and will process it shortly.</p>
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Order Details</h2>
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Total Amount:</strong> ${orderData.currency} ${orderData.totalAmount.toFixed(2)}</p>
        </div>

        <h3>Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: center;">Quantity</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
          <p>We'll send you another email when your order ships.</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          Thank you for shopping with us!<br>
          ${this.fromName}
        </p>
      </body>
      </html>
    `
  }

  private generateOrderStatusUpdateEmail(
    orderData: OrderData,
    status: string,
    message: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8b5cf6;">Order Update</h1>
        <p>Hi ${orderData.customerName},</p>
        <p>${message}</p>
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Status:</strong> ${status.replace(/_/g, ' ').toUpperCase()}</p>
        </div>

        <p>Thank you for your patience!</p>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          ${this.fromName}
        </p>
      </body>
      </html>
    `
  }

  private generateShippingNotificationEmail(
    orderData: OrderData,
    trackingNumber: string,
    courier: string,
    trackingUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Order Has Shipped</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8b5cf6;">Your Order Has Shipped!</h1>
        <p>Hi ${orderData.customerName},</p>
        <p>Great news! Your order has been shipped and is on its way to you.</p>
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Courier:</strong> ${courier.toUpperCase()}</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${trackingUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Track Your Package</a>
        </div>

        <p>You can use the tracking number above to monitor your shipment's progress.</p>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          ${this.fromName}
        </p>
      </body>
      </html>
    `
  }

  private generateRefundConfirmationEmail(orderData: OrderData, amount: number): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Refund Processed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8b5cf6;">Refund Processed</h1>
        <p>Hi ${orderData.customerName},</p>
        <p>Your refund has been processed successfully.</p>
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
          <p><strong>Refund Amount:</strong> ${orderData.currency} ${amount.toFixed(2)}</p>
        </div>

        <p>The refund will appear in your account within 5-10 business days, depending on your payment method.</p>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          ${this.fromName}
        </p>
      </body>
      </html>
    `
  }

  private generatePasswordResetEmail(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8b5cf6;">Password Reset Request</h1>
        <p>We received a request to reset your password.</p>
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </div>

        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          ${this.fromName}
        </p>
      </body>
      </html>
    `
  }

  private generateWelcomeEmail(firstName?: string): string {
    const greeting = firstName ? `Hi ${firstName}` : 'Hello'

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8b5cf6;">Welcome to ${this.fromName}!</h1>
        <p>${greeting},</p>
        <p>Thank you for creating an account with us. We're excited to have you on board!</p>
        
        <p>Start exploring our products and enjoy a seamless shopping experience.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Start Shopping</a>
        </div>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          ${this.fromName}
        </p>
      </body>
      </html>
    `
  }

  private generateLowStockAlertEmail(
    productName: string,
    sku: string,
    quantity: number
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Low Stock Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ef4444;">Low Stock Alert</h1>
        <p>The following product is running low on stock:</p>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 5px; border-left: 4px solid #ef4444; margin: 20px 0;">
          <p><strong>Product:</strong> ${productName}</p>
          <p><strong>SKU:</strong> ${sku}</p>
          <p><strong>Current Stock:</strong> ${quantity} units</p>
        </div>

        <p>Please restock this item to avoid running out.</p>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          ${this.fromName} - Admin Notification
        </p>
      </body>
      </html>
    `
  }

  private generateNewReviewNotificationEmail(review: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Review</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8b5cf6;">New Product Review</h1>
        <p>A new review has been submitted for one of your products:</p>
        
        <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Product:</strong> ${review.name}</p>
          <p><strong>Rating:</strong> ${'⭐'.repeat(review.rating)}</p>
          <p><strong>Title:</strong> ${review.title || 'N/A'}</p>
          <p><strong>Comment:</strong> ${review.comment || 'N/A'}</p>
          <p><strong>Reviewer:</strong> ${review.reviewer_email}</p>
        </div>

        <p>Please review and moderate if necessary.</p>

        <p style="margin-top: 30px; color: #666; font-size: 14px;">
          ${this.fromName} - Admin Notification
        </p>
      </body>
      </html>
    `
  }

  // Helper methods

  private async getOrderData(orderId: string): Promise<OrderData | null> {
    const orderResult = await pool.query(
      `SELECT o.*, 
              COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Customer') as customer_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    )

    if (orderResult.rows.length === 0) {
      return null
    }

    const order = orderResult.rows[0]

    // Get order items
    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    )

    return {
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      customerName: order.customer_name,
      totalAmount: parseFloat(order.total_amount),
      currency: order.currency,
      items: itemsResult.rows,
      shippingAddress: order.shipping_address,
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  }
}

export default new NotificationService()
