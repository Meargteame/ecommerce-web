# API Testing Guide - E-Commerce Platform

This guide provides step-by-step instructions for testing all backend API endpoints.

## Prerequisites

- Backend server running on `http://localhost:5000`
- PostgreSQL database running with migrations applied
- Redis running
- API testing tool (Postman, Insomnia, or curl)

## Testing Tools Setup

### Option 1: Using curl (Command Line)
All examples below use curl commands that can be run directly in your terminal.

### Option 2: Using Postman
1. Import the provided Postman collection (if available)
2. Set base URL to `http://localhost:5000`
3. Use environment variables for tokens

### Option 3: Using VS Code REST Client
Install the REST Client extension and use the provided `.http` files.

---

## Test Flow Overview

We'll test in this order:
1. **Health Check** - Verify server is running
2. **Authentication** - Register, login, get tokens
3. **Categories** - Create categories for products
4. **Products** - Create and manage products
5. **Cart** - Add items to cart
6. **Orders** - Create and manage orders
7. **Payments** - Process payments
8. **Shipping** - Create shipments and track
9. **Reviews** - Add product reviews
10. **Promotions** - Create and apply coupons
11. **Analytics** - Track events and view metrics

---

## 1. Health Check

### Check Server Status
```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-13T...",
  "uptime": 123.456
}
```

---

## 2. Authentication Flow

### 2.1 Register a New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer"
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Save the `accessToken` for subsequent requests!**

### 2.2 Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

### 2.3 Get Current User
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2.4 Register Admin User (for testing admin endpoints)
```bash
# First, manually update the user role in database:
psql ecommerce_db -c "UPDATE users SET role = 'admin' WHERE email = 'test@example.com';"

# Then login again to get new token with admin role
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

---

## 3. Categories (Admin)

### 3.1 Create Category
```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and accessories"
  }'
```

**Save the category `id` for creating products!**

### 3.2 Get All Categories
```bash
curl http://localhost:5000/api/categories
```

---

## 4. Products

### 4.1 Create Product (Admin)
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "slug": "wireless-headphones",
    "description": "High-quality wireless headphones with noise cancellation",
    "basePrice": 99.99,
    "categoryId": "YOUR_CATEGORY_ID",
    "brand": "TechBrand",
    "status": "published",
    "specifications": {
      "color": "Black",
      "battery": "30 hours",
      "connectivity": "Bluetooth 5.0"
    }
  }'
```

**Save the product `id`!**

### 4.2 Create Product Variant (Admin)
```bash
curl -X POST http://localhost:5000/api/products/YOUR_PRODUCT_ID/variants \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "WH-BLK-001",
    "variantName": "Black",
    "attributes": {
      "color": "Black"
    },
    "priceAdjustment": 0,
    "stockQuantity": 100,
    "weight": 250
  }'
```

### 4.3 Get All Products
```bash
curl "http://localhost:5000/api/products?limit=10&offset=0"
```

### 4.4 Get Product by ID
```bash
curl http://localhost:5000/api/products/YOUR_PRODUCT_ID
```

### 4.5 Search Products
```bash
curl "http://localhost:5000/api/products/search?q=headphones"
```

---

## 5. User Profile & Addresses

### 5.1 Get User Profile
```bash
curl http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5.2 Update Profile
```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "phone": "+1234567890"
  }'
```

### 5.3 Add Address
```bash
curl -X POST http://localhost:5000/api/users/addresses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addressType": "shipping",
    "fullName": "John Doe",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1234567890",
    "isDefault": true
  }'
```

**Save the address `id`!**

---

## 6. Cart Operations

### 6.1 Add Item to Cart
```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "variantId": "YOUR_VARIANT_ID",
    "quantity": 2
  }'
```

### 6.2 Get Cart
```bash
curl http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 6.3 Update Cart Item Quantity
```bash
curl -X PUT http://localhost:5000/api/cart/items/YOUR_CART_ITEM_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'
```

### 6.4 Validate Cart (before checkout)
```bash
curl http://localhost:5000/api/cart/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 7. Order Flow

### 7.1 Create Order (Checkout)
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "fullName": "John Doe",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "+1234567890"
    },
    "billingAddress": {
      "fullName": "John Doe",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "+1234567890"
    },
    "customerEmail": "test@example.com",
    "customerPhone": "+1234567890"
  }'
```

**Save the order `id`!**

### 7.2 Get Order Details
```bash
curl http://localhost:5000/api/orders/YOUR_ORDER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7.3 Get User's Orders
```bash
curl http://localhost:5000/api/users/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 8. Payment Processing

### 8.1 Process Payment
```bash
curl -X POST http://localhost:5000/api/payments/process \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "YOUR_ORDER_ID",
    "paymentMethod": "credit_card",
    "paymentGateway": "stripe",
    "paymentDetails": {
      "cardNumber": "4242424242424242",
      "expiryMonth": "12",
      "expiryYear": "2025",
      "cvv": "123"
    }
  }'
```

### 8.2 Get Payment by Order ID
```bash
curl http://localhost:5000/api/payments/order/YOUR_ORDER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 9. Shipping

### 9.1 Calculate Shipping Cost
```bash
curl -X POST http://localhost:5000/api/shipping/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "address": {
      "country": "US",
      "state": "NY",
      "city": "New York",
      "postalCode": "10001"
    },
    "items": [
      {
        "productId": "YOUR_PRODUCT_ID",
        "quantity": 2,
        "weight": 0.5
      }
    ]
  }'
```

### 9.2 Create Shipment (Admin)
```bash
curl -X POST http://localhost:5000/api/shipping/shipments \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "YOUR_ORDER_ID",
    "courier": "dhl",
    "weight": 1.5,
    "weightUnit": "kg"
  }'
```

**Save the `trackingNumber`!**

### 9.3 Track Shipment
```bash
curl http://localhost:5000/api/shipping/track/YOUR_TRACKING_NUMBER
```

### 9.4 Get Supported Couriers
```bash
curl http://localhost:5000/api/shipping/couriers
```

---

## 10. Reviews

### 10.1 Create Review
```bash
curl -X POST http://localhost:5000/api/reviews \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "orderId": "YOUR_ORDER_ID",
    "rating": 5,
    "title": "Excellent product!",
    "comment": "These headphones are amazing. Great sound quality and battery life."
  }'
```

### 10.2 Get Product Reviews
```bash
curl "http://localhost:5000/api/reviews/product/YOUR_PRODUCT_ID?limit=10&offset=0"
```

### 10.3 Create Product Question
```bash
curl -X POST http://localhost:5000/api/reviews/questions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "YOUR_PRODUCT_ID",
    "question": "Is this compatible with iPhone?"
  }'
```

---

## 11. Promotions

### 11.1 Create Promotion (Admin)
```bash
curl -X POST http://localhost:5000/api/promotions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "name": "20% Off Spring Sale",
    "description": "Get 20% off on all products",
    "discountType": "percentage",
    "discountValue": 20,
    "minPurchaseAmount": 50,
    "maxDiscountAmount": 100,
    "usageLimit": 1000,
    "perUserLimit": 1,
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2026-04-01T00:00:00Z"
  }'
```

### 11.2 Get Active Promotions
```bash
curl http://localhost:5000/api/promotions/active
```

### 11.3 Validate Coupon
```bash
curl -X POST http://localhost:5000/api/promotions/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "cartTotal": 100
  }'
```

### 11.4 Apply Coupon
```bash
curl -X POST http://localhost:5000/api/promotions/apply \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "cartTotal": 100
  }'
```

---

## 12. Analytics

### 12.1 Track Event
```bash
curl -X POST http://localhost:5000/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "product_view",
    "sessionId": "session-123",
    "eventData": {
      "productId": "YOUR_PRODUCT_ID",
      "productName": "Wireless Headphones"
    }
  }'
```

### 12.2 Get Dashboard Metrics (Admin)
```bash
curl "http://localhost:5000/api/analytics/dashboard?startDate=2026-03-01&endDate=2026-03-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 12.3 Get Sales Metrics (Admin)
```bash
curl "http://localhost:5000/api/analytics/sales?startDate=2026-03-01&endDate=2026-03-31" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Complete Order Flow Test

Here's a complete end-to-end test scenario:

```bash
# 1. Register user
USER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@test.com","password":"Test@1234","firstName":"Jane","lastName":"Buyer"}')

TOKEN=$(echo $USER_RESPONSE | jq -r '.accessToken')

# 2. Get products
curl -s http://localhost:5000/api/products?limit=1 | jq

# 3. Add to cart (use actual product ID from step 2)
curl -s -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"YOUR_PRODUCT_ID","quantity":1}' | jq

# 4. View cart
curl -s http://localhost:5000/api/cart \
  -H "Authorization: Bearer $TOKEN" | jq

# 5. Create order
ORDER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress":{"fullName":"Jane Buyer","addressLine1":"456 Oak St","city":"Boston","state":"MA","postalCode":"02101","country":"US"},
    "billingAddress":{"fullName":"Jane Buyer","addressLine1":"456 Oak St","city":"Boston","state":"MA","postalCode":"02101","country":"US"},
    "customerEmail":"buyer@test.com"
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.id')

# 6. Process payment
curl -s -X POST http://localhost:5000/api/payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"orderId\":\"$ORDER_ID\",\"paymentMethod\":\"credit_card\",\"paymentGateway\":\"stripe\"}" | jq

# 7. Check order status
curl -s http://localhost:5000/api/orders/$ORDER_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Testing Checklist

- [ ] Server health check passes
- [ ] User registration works
- [ ] User login returns valid JWT token
- [ ] Protected endpoints require authentication
- [ ] Admin endpoints require admin role
- [ ] Categories can be created and retrieved
- [ ] Products can be created with variants
- [ ] Products can be searched and filtered
- [ ] Cart operations work (add, update, remove)
- [ ] Orders can be created from cart
- [ ] Inventory is reserved on order creation
- [ ] Payments can be processed
- [ ] Order status updates correctly after payment
- [ ] Shipments can be created and tracked
- [ ] Reviews can be added to products
- [ ] Promotions can be created and validated
- [ ] Coupons can be applied to orders
- [ ] Analytics events are tracked
- [ ] Email notifications are logged (check console)

---

## Common Issues & Solutions

### Issue: "Unauthorized" error
**Solution:** Make sure you're including the Bearer token in the Authorization header

### Issue: "Product not found" when adding to cart
**Solution:** Ensure the product exists and is published (status = 'published')

### Issue: "Insufficient stock" error
**Solution:** Check product variant stock quantity in database

### Issue: "Order not in valid state for payment"
**Solution:** Order must be in 'placed' status before payment

### Issue: Database connection errors
**Solution:** Verify PostgreSQL is running: `pg_isready`

### Issue: Redis connection errors
**Solution:** Verify Redis is running: `redis-cli ping`

---

## Next Steps

After testing the API:
1. Document any bugs or issues found
2. Fix any failing endpoints
3. Add more test data (products, categories, users)
4. Proceed to frontend integration
5. Build automated tests (unit, integration, E2E)

