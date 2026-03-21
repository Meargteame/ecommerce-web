import pool from '../config/database'

interface Address {
  country: string
  state?: string
  city: string
  postalCode: string
}

interface CartItem {
  productId: string
  quantity: number
  weight?: number
}

interface ShippingOption {
  courier: string
  serviceName: string
  cost: number
  currency: string
  estimatedDays: number
  description: string
}

interface Courier {
  code: string
  name: string
  services: string[]
  trackingUrl: string
}

interface CreateShipmentDTO {
  orderId: string
  courier: string
  weight: number
  weightUnit?: string
  notes?: string
}

interface Shipment {
  id: string
  orderId: string
  courier: string
  trackingNumber: string
  trackingUrl: string
  status: string
  weight: number
  weightUnit: string
  estimatedDeliveryDate?: Date
  actualDeliveryDate?: Date
  shippedAt?: Date
  deliveredAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

interface TrackingInfo {
  trackingNumber: string
  courier: string
  status: string
  estimatedDeliveryDate?: Date
  actualDeliveryDate?: Date
  events: TrackingEvent[]
}

interface TrackingEvent {
  timestamp: Date
  status: string
  location: string
  description: string
}

export class ShippingService {
  // Supported couriers
  private couriers: Courier[] = [
    {
      code: 'dhl',
      name: 'DHL Express',
      services: ['express', 'standard'],
      trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}',
    },
    {
      code: 'fedex',
      name: 'FedEx',
      services: ['overnight', 'express', 'ground'],
      trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr={trackingNumber}',
    },
    {
      code: 'ups',
      name: 'UPS',
      services: ['express', 'standard', 'ground'],
      trackingUrl: 'https://www.ups.com/track?tracknum={trackingNumber}',
    },
    {
      code: 'usps',
      name: 'USPS',
      services: ['priority', 'express', 'first_class'],
      trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={trackingNumber}',
    },
  ]

  async calculateShipping(address: Address, items: CartItem[]): Promise<ShippingOption[]> {
    // Calculate total weight
    const totalWeight = items.reduce((sum, item) => {
      const weight = item.weight || 1.0 // Default 1kg if not specified
      return sum + weight * item.quantity
    }, 0)

    // Determine shipping zone based on country
    const zone = this.getShippingZone(address.country)

    // Calculate shipping options for each courier
    const options: ShippingOption[] = []

    // DHL options
    options.push({
      courier: 'dhl',
      serviceName: 'DHL Express',
      cost: this.calculateShippingCost('dhl', 'express', zone, totalWeight),
      currency: 'USD',
      estimatedDays: zone === 'domestic' ? 2 : zone === 'international' ? 5 : 7,
      description: 'Fast international shipping with tracking',
    })

    options.push({
      courier: 'dhl',
      serviceName: 'DHL Standard',
      cost: this.calculateShippingCost('dhl', 'standard', zone, totalWeight),
      currency: 'USD',
      estimatedDays: zone === 'domestic' ? 5 : zone === 'international' ? 10 : 15,
      description: 'Economical shipping option',
    })

    // FedEx options
    options.push({
      courier: 'fedex',
      serviceName: 'FedEx Overnight',
      cost: this.calculateShippingCost('fedex', 'overnight', zone, totalWeight),
      currency: 'USD',
      estimatedDays: 1,
      description: 'Next business day delivery',
    })

    options.push({
      courier: 'fedex',
      serviceName: 'FedEx Express',
      cost: this.calculateShippingCost('fedex', 'express', zone, totalWeight),
      currency: 'USD',
      estimatedDays: zone === 'domestic' ? 2 : 4,
      description: 'Fast and reliable shipping',
    })

    // UPS options
    options.push({
      courier: 'ups',
      serviceName: 'UPS Ground',
      cost: this.calculateShippingCost('ups', 'ground', zone, totalWeight),
      currency: 'USD',
      estimatedDays: zone === 'domestic' ? 5 : 10,
      description: 'Cost-effective ground shipping',
    })

    // USPS options (domestic only)
    if (zone === 'domestic') {
      options.push({
        courier: 'usps',
        serviceName: 'USPS Priority Mail',
        cost: this.calculateShippingCost('usps', 'priority', zone, totalWeight),
        currency: 'USD',
        estimatedDays: 3,
        description: 'Affordable priority shipping',
      })
    }

    return options.sort((a, b) => a.cost - b.cost)
  }

  async createShipment(data: CreateShipmentDTO): Promise<Shipment> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Verify order exists and is in valid state
      const orderResult = await client.query(
        'SELECT id, status FROM orders WHERE id = $1',
        [data.orderId]
      )

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found')
      }

      const order = orderResult.rows[0]

      if (!['payment_confirmed', 'processing', 'packed'].includes(order.status)) {
        throw new Error('Order is not ready for shipment')
      }

      // Generate tracking number
      const trackingNumber = this.generateTrackingNumber(data.courier)

      // Get courier info
      const courier = this.couriers.find(c => c.code === data.courier)
      if (!courier) {
        throw new Error('Invalid courier')
      }

      const trackingUrl = courier.trackingUrl.replace('{trackingNumber}', trackingNumber)

      // Calculate estimated delivery date
      const estimatedDeliveryDate = new Date()
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5) // Default 5 days

      // Create shipment record
      const shipmentResult = await client.query(
        `INSERT INTO shipments (
          order_id, courier, tracking_number, tracking_url, status,
          weight, weight_unit, estimated_delivery_date, notes, shipped_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          data.orderId,
          data.courier,
          trackingNumber,
          trackingUrl,
          'picked_up',
          data.weight,
          data.weightUnit || 'kg',
          estimatedDeliveryDate,
          data.notes,
        ]
      )

      // Update order status to shipped
      await client.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['shipped', data.orderId]
      )

      // Add to order status history
      await client.query(
        'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
        [data.orderId, 'shipped', `Shipped via ${courier.name} - Tracking: ${trackingNumber}`]
      )

      await client.query('COMMIT')

      return this.mapShipment(shipmentResult.rows[0])
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getTrackingInfo(trackingNumber: string): Promise<TrackingInfo | null> {
    const result = await pool.query(
      'SELECT * FROM shipments WHERE tracking_number = $1',
      [trackingNumber]
    )

    if (result.rows.length === 0) {
      return null
    }

    const shipment = result.rows[0]

    // In production, this would call the courier's API for real-time tracking
    // For now, we'll simulate tracking events
    const events = this.simulateTrackingEvents(shipment.status, shipment.shipped_at)

    return {
      trackingNumber: shipment.tracking_number,
      courier: shipment.courier,
      status: shipment.status,
      estimatedDeliveryDate: shipment.estimated_delivery_date,
      actualDeliveryDate: shipment.actual_delivery_date,
      events,
    }
  }

  async updateShipmentStatus(
    trackingNumber: string,
    status: string,
    notes?: string
  ): Promise<Shipment> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const validStatuses = [
        'pending',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed',
        'returned',
      ]

      if (!validStatuses.includes(status)) {
        throw new Error('Invalid shipment status')
      }

      // Update shipment status
      const updateFields: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP']
      const values: any[] = [status]
      let paramCount = 1

      if (status === 'delivered') {
        updateFields.push(`delivered_at = CURRENT_TIMESTAMP`)
        updateFields.push(`actual_delivery_date = CURRENT_DATE`)
      }

      if (notes) {
        paramCount++
        updateFields.push(`notes = $${paramCount}`)
        values.push(notes)
      }

      paramCount++
      values.push(trackingNumber)

      const shipmentResult = await client.query(
        `UPDATE shipments SET ${updateFields.join(', ')} 
         WHERE tracking_number = $${paramCount}
         RETURNING *`,
        values
      )

      if (shipmentResult.rows.length === 0) {
        throw new Error('Shipment not found')
      }

      const shipment = shipmentResult.rows[0]

      // Update order status if delivered
      if (status === 'delivered') {
        await client.query(
          'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['delivered', shipment.order_id]
        )

        await client.query(
          'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
          [shipment.order_id, 'delivered', notes || 'Package delivered successfully']
        )
      }

      await client.query('COMMIT')

      return this.mapShipment(shipment)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async getShipmentByOrderId(orderId: string): Promise<Shipment | null> {
    const result = await pool.query(
      'SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return this.mapShipment(result.rows[0])
  }

  getSupportedCouriers(): Courier[] {
    return this.couriers
  }

  private getShippingZone(country: string): 'domestic' | 'international' | 'remote' {
    // Assuming US as domestic
    if (country === 'US') {
      return 'domestic'
    }

    // North America and Europe as international
    const internationalCountries = ['CA', 'MX', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH']
    if (internationalCountries.includes(country)) {
      return 'international'
    }

    // Everything else as remote
    return 'remote'
  }

  private calculateShippingCost(
    courier: string,
    service: string,
    zone: string,
    weight: number
  ): number {
    // Base rates per kg
    const baseRates: Record<string, Record<string, number>> = {
      dhl: {
        express: 25,
        standard: 15,
      },
      fedex: {
        overnight: 35,
        express: 28,
        ground: 12,
      },
      ups: {
        express: 26,
        standard: 18,
        ground: 10,
      },
      usps: {
        priority: 8,
        express: 22,
        first_class: 5,
      },
    }

    // Zone multipliers
    const zoneMultipliers: Record<string, number> = {
      domestic: 1.0,
      international: 1.8,
      remote: 2.5,
    }

    const baseRate = baseRates[courier]?.[service] || 15
    const zoneMultiplier = zoneMultipliers[zone] || 1.0

    // Calculate cost: base rate * weight * zone multiplier
    const cost = baseRate * Math.max(weight, 0.5) * zoneMultiplier

    // Round to 2 decimal places
    return Math.round(cost * 100) / 100
  }

  private generateTrackingNumber(courier: string): string {
    const prefix = courier.toUpperCase().substring(0, 3)
    const timestamp = Date.now().toString().substring(5)
    const random = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `${prefix}${timestamp}${random}`
  }

  private simulateTrackingEvents(status: string, shippedAt: Date): TrackingEvent[] {
    const events: TrackingEvent[] = []
    const baseDate = new Date(shippedAt)

    events.push({
      timestamp: baseDate,
      status: 'picked_up',
      location: 'Origin Facility',
      description: 'Package picked up by courier',
    })

    if (['in_transit', 'out_for_delivery', 'delivered'].includes(status)) {
      const transitDate = new Date(baseDate)
      transitDate.setHours(transitDate.getHours() + 12)
      events.push({
        timestamp: transitDate,
        status: 'in_transit',
        location: 'Sorting Facility',
        description: 'Package in transit',
      })
    }

    if (['out_for_delivery', 'delivered'].includes(status)) {
      const outDate = new Date(baseDate)
      outDate.setDate(outDate.getDate() + 2)
      events.push({
        timestamp: outDate,
        status: 'out_for_delivery',
        location: 'Local Delivery Center',
        description: 'Out for delivery',
      })
    }

    if (status === 'delivered') {
      const deliveredDate = new Date(baseDate)
      deliveredDate.setDate(deliveredDate.getDate() + 3)
      events.push({
        timestamp: deliveredDate,
        status: 'delivered',
        location: 'Destination',
        description: 'Package delivered successfully',
      })
    }

    return events
  }

  private mapShipment(row: any): Shipment {
    return {
      id: row.id,
      orderId: row.order_id,
      courier: row.courier,
      trackingNumber: row.tracking_number,
      trackingUrl: row.tracking_url,
      status: row.status,
      weight: parseFloat(row.weight),
      weightUnit: row.weight_unit,
      estimatedDeliveryDate: row.estimated_delivery_date,
      actualDeliveryDate: row.actual_delivery_date,
      shippedAt: row.shipped_at,
      deliveredAt: row.delivered_at,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

export default new ShippingService()
