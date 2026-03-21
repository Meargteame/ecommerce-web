# API Testing Guide

## Authentication Endpoints

Base URL: `http://localhost:5000`

### 1. Register a New User

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

**Expected Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "emailVerified": false,
      "accountStatus": "active",
      "role": "customer",
      "createdAt": "2026-03-13T...",
      "updatedAt": "2026-03-13T..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### 3. Get Current User Info

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "userId": "uuid",
    "email": "test@example.com",
    "role": "customer"
  }
}
```

### 4. Refresh Access Token

```bash
curl -X POST http://localhost:5000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new_access_token"
  }
}
```

### 5. Change Password

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "Test@1234",
    "newPassword": "NewTest@5678"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Password changed successfully"
}
```

### 6. Request Password Reset

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

### 7. Reset Password

```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RESET_TOKEN_FROM_EMAIL",
    "newPassword": "NewTest@5678"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Password reset successful"
}
```

### 8. Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "message": "Logout successful"
}
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## Rate Limiting

- Login endpoint: 5 requests per 15 minutes
- Password reset: 3 requests per hour
- Other endpoints: 100 requests per 15 minutes (general limit)

## Error Responses

### 400 Bad Request - Validation Error
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid email or password"
}
```

### 409 Conflict
```json
{
  "error": "User with this email already exists"
}
```

### 423 Locked
```json
{
  "error": "Account is locked. Try again in 15 minutes"
}
```

### 429 Too Many Requests
```json
{
  "message": "Too many attempts, please try again later"
}
```

## Health Check

```bash
curl http://localhost:5000/health
```

**Expected Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2026-03-13T...",
  "uptime": 123.456
}
```


---

## User Profile Endpoints

### 1. Get User Profile

```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "emailVerified": false,
    "accountStatus": "active",
    "role": "customer",
    "createdAt": "2026-03-13T...",
    "updatedAt": "2026-03-13T..."
  }
}
```

### 2. Update User Profile

```bash
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1987654321"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Profile updated successfully",
  "data": { ... }
}
```

---

## Address Management Endpoints

### 1. Get All Addresses

```bash
curl -X GET http://localhost:5000/api/users/addresses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "addressType": "shipping",
      "fullName": "John Doe",
      "addressLine1": "123 Main St",
      "addressLine2": "Apt 4B",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US",
      "phone": "+1234567890",
      "isDefault": true,
      "createdAt": "2026-03-13T...",
      "updatedAt": "2026-03-13T..."
    }
  ]
}
```

### 2. Get Single Address

```bash
curl -X GET http://localhost:5000/api/users/addresses/ADDRESS_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Create Address

```bash
curl -X POST http://localhost:5000/api/users/addresses \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addressType": "shipping",
    "fullName": "John Doe",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1234567890",
    "isDefault": true
  }'
```

**Expected Response** (201 Created):
```json
{
  "message": "Address created successfully",
  "data": { ... }
}
```

### 4. Update Address

```bash
curl -X PUT http://localhost:5000/api/users/addresses/ADDRESS_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Brooklyn",
    "postalCode": "11201"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Address updated successfully",
  "data": { ... }
}
```

### 5. Delete Address

```bash
curl -X DELETE http://localhost:5000/api/users/addresses/ADDRESS_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "message": "Address deleted successfully"
}
```

---

## Wishlist Endpoints

### 1. Get Wishlist

```bash
curl -X GET http://localhost:5000/api/users/wishlist \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "productId": "uuid",
      "createdAt": "2026-03-13T...",
      "product": {
        "name": "Product Name",
        "slug": "product-name",
        "basePrice": 99.99,
        "status": "published",
        "averageRating": 4.5,
        "imageUrl": "https://..."
      }
    }
  ]
}
```

### 2. Add to Wishlist

```bash
curl -X POST http://localhost:5000/api/users/wishlist \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_UUID"
  }'
```

**Expected Response** (201 Created):
```json
{
  "message": "Product added to wishlist"
}
```

### 3. Remove from Wishlist

```bash
curl -X DELETE http://localhost:5000/api/users/wishlist/WISHLIST_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "message": "Product removed from wishlist"
}
```

---

## Order History Endpoint

### Get Order History

```bash
curl -X GET "http://localhost:5000/api/users/orders?limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-20260313-001",
      "status": "delivered",
      "subtotal": 99.99,
      "shippingCost": 10.00,
      "taxAmount": 8.50,
      "discountAmount": 5.00,
      "totalAmount": 113.49,
      "currency": "USD",
      "createdAt": "2026-03-13T...",
      "updatedAt": "2026-03-13T..."
    }
  ]
}
```

---

## Address Validation Rules

- `addressType`: Must be either "shipping" or "billing"
- `fullName`: Required, max 200 characters
- `addressLine1`: Required, max 255 characters
- `addressLine2`: Optional, max 255 characters
- `city`: Required, max 100 characters
- `state`: Optional, max 100 characters
- `postalCode`: Required, max 20 characters
- `country`: Required, 2-letter ISO country code (e.g., "US", "GB", "CA")
- `phone`: Optional, international format (e.g., "+1234567890")
- `isDefault`: Optional boolean, sets as default address for the address type


---

## Product Endpoints

### 1. List Products

```bash
curl -X GET "http://localhost:5000/api/products?limit=20&offset=0&sortBy=newest"
```

**Query Parameters**:
- `categoryId` (UUID) - Filter by category
- `brand` (string) - Filter by brand
- `minPrice` (number) - Minimum price
- `maxPrice` (number) - Maximum price
- `minRating` (number) - Minimum rating (0-5)
- `status` (string) - Product status (draft, published, archived)
- `search` (string) - Search in name and description
- `sortBy` (string) - Sort order: price_asc, price_desc, rating, newest, popular
- `limit` (number) - Results per page (max 100, default 20)
- `offset` (number) - Pagination offset (default 0)

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Product Name",
      "slug": "product-name",
      "description": "Product description",
      "specifications": {},
      "basePrice": 99.99,
      "categoryId": "uuid",
      "brand": "Brand Name",
      "status": "published",
      "averageRating": 4.5,
      "reviewCount": 42,
      "viewCount": 1234,
      "createdAt": "2026-03-13T...",
      "updatedAt": "2026-03-13T..."
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### 2. Search Products

```bash
curl -X GET "http://localhost:5000/api/products/search?search=laptop&minPrice=500&maxPrice=2000"
```

### 3. Get Product by ID

```bash
curl -X GET http://localhost:5000/api/products/PRODUCT_ID
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "id": "uuid",
    "name": "Product Name",
    "slug": "product-name",
    "description": "Product description",
    "specifications": {
      "color": "Black",
      "size": "Large"
    },
    "basePrice": 99.99,
    "categoryId": "uuid",
    "brand": "Brand Name",
    "status": "published",
    "averageRating": 4.5,
    "reviewCount": 42,
    "viewCount": 1235,
    "createdAt": "2026-03-13T...",
    "updatedAt": "2026-03-13T...",
    "images": [
      {
        "id": "uuid",
        "productId": "uuid",
        "imageUrl": "https://...",
        "altText": "Product image",
        "displayOrder": 0,
        "isPrimary": true,
        "createdAt": "2026-03-13T..."
      }
    ],
    "variants": [
      {
        "id": "uuid",
        "productId": "uuid",
        "sku": "PROD-001-BLK-L",
        "variantName": "Black - Large",
        "attributes": {
          "color": "Black",
          "size": "Large"
        },
        "priceAdjustment": 0,
        "stockQuantity": 50,
        "lowStockThreshold": 10,
        "weightGrams": 500,
        "createdAt": "2026-03-13T...",
        "updatedAt": "2026-03-13T..."
      }
    ]
  }
}
```

### 4. Get Brands

```bash
curl -X GET http://localhost:5000/api/products/brands
```

**Expected Response** (200 OK):
```json
{
  "data": ["Apple", "Samsung", "Sony", "Nike", "Adidas"]
}
```

### 5. Create Product (Admin Only)

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Product",
    "slug": "new-product",
    "description": "Product description",
    "specifications": {
      "color": "Blue",
      "material": "Cotton"
    },
    "basePrice": 49.99,
    "categoryId": "CATEGORY_UUID",
    "brand": "Brand Name",
    "status": "draft"
  }'
```

**Expected Response** (201 Created):
```json
{
  "message": "Product created successfully",
  "data": { ... }
}
```

### 6. Update Product (Admin Only)

```bash
curl -X PUT http://localhost:5000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Product Name",
    "basePrice": 59.99,
    "status": "published"
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Product updated successfully",
  "data": { ... }
}
```

### 7. Delete Product (Admin Only)

```bash
curl -X DELETE http://localhost:5000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "message": "Product deleted successfully"
}
```

---

## Category Endpoints

### 1. Get All Categories

```bash
curl -X GET http://localhost:5000/api/categories
```

**Expected Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic devices and accessories",
      "parentId": null,
      "imageUrl": "https://...",
      "displayOrder": 0,
      "createdAt": "2026-03-13T...",
      "updatedAt": "2026-03-13T..."
    }
  ]
}
```

### 2. Get Category by ID

```bash
curl -X GET http://localhost:5000/api/categories/CATEGORY_ID
```

### 3. Get Products by Category

```bash
curl -X GET "http://localhost:5000/api/categories/CATEGORY_ID/products?limit=20&sortBy=popular"
```

**Expected Response** (200 OK):
```json
{
  "data": [ ... ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Product Validation Rules

- `name`: Required, max 255 characters
- `slug`: Required, max 255 characters, lowercase letters, numbers, and hyphens only
- `description`: Optional text
- `specifications`: Optional JSON object
- `basePrice`: Required, must be positive number
- `categoryId`: Required, valid UUID
- `brand`: Optional, max 100 characters
- `status`: Optional, one of: draft, published, archived (default: draft)

---

## Caching

- Products are cached in Redis for 1 hour
- Categories are cached in Redis for 6 hours
- Cache is automatically invalidated on product updates/deletes
- View counts are incremented asynchronously


---

## Cart Endpoints

### 1. Get Cart

```bash
curl -X GET http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "userId": "uuid",
    "items": [
      {
        "id": "uuid",
        "productId": "uuid",
        "variantId": "uuid",
        "quantity": 2,
        "product": {
          "name": "Product Name",
          "slug": "product-name",
          "basePrice": 99.99,
          "imageUrl": "https://...",
          "status": "published"
        },
        "variant": {
          "sku": "PROD-001-BLK-L",
          "variantName": "Black - Large",
          "priceAdjustment": 10.00,
          "stockQuantity": 50
        },
        "unitPrice": 109.99,
        "subtotal": 219.98
      }
    ],
    "subtotal": 219.98,
    "itemCount": 2
  }
}
```

### 2. Add Item to Cart

```bash
curl -X POST http://localhost:5000/api/cart/items \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_UUID",
    "variantId": "VARIANT_UUID",
    "quantity": 2
  }'
```

**Expected Response** (201 Created):
```json
{
  "message": "Item added to cart",
  "data": { ... }
}
```

### 3. Update Cart Item Quantity

```bash
curl -X PUT http://localhost:5000/api/cart/items/CART_ITEM_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3
  }'
```

**Expected Response** (200 OK):
```json
{
  "message": "Cart item updated",
  "data": { ... }
}
```

### 4. Remove Item from Cart

```bash
curl -X DELETE http://localhost:5000/api/cart/items/CART_ITEM_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "message": "Item removed from cart",
  "data": { ... }
}
```

### 5. Save Item for Later (Move to Wishlist)

```bash
curl -X POST http://localhost:5000/api/cart/save-for-later/CART_ITEM_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "message": "Item saved for later",
  "data": { ... }
}
```

### 6. Clear Cart

```bash
curl -X DELETE http://localhost:5000/api/cart \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "message": "Cart cleared"
}
```

### 7. Validate Cart

```bash
curl -X GET http://localhost:5000/api/cart/validate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200 OK):
```json
{
  "data": {
    "valid": true,
    "errors": []
  }
}
```

**Or if invalid**:
```json
{
  "data": {
    "valid": false,
    "errors": [
      "Insufficient stock for Product Name (Black - Large)",
      "Product XYZ is no longer available"
    ]
  }
}
```

---

## Cart Features

- **Redis Caching**: Active carts are cached in Redis for 1 hour for fast access
- **Stock Validation**: Automatically checks product availability and stock levels
- **Price Calculation**: Calculates unit price (base price + variant adjustment) and subtotals
- **Save for Later**: Moves items from cart to wishlist
- **Automatic Updates**: If item already exists in cart, quantity is incremented
- **Cart Validation**: Validates cart before checkout (availability, stock, status)

---

## Cart Validation Rules

- `productId`: Required, valid UUID
- `variantId`: Optional, valid UUID (required if product has variants)
- `quantity`: Required, must be positive integer
- Products must be in "published" status
- Sufficient stock must be available for variants
- Cart items are automatically validated before checkout
