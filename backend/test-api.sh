#!/bin/bash

# E-Commerce API Test Script
# This script tests the complete order flow end-to-end

set -e  # Exit on error

BASE_URL="http://localhost:5000"
TEST_EMAIL="testuser_$(date +%s)@example.com"
ADMIN_EMAIL="admin_$(date +%s)@example.com"
TIMESTAMP=$(date +%s)

echo "=========================================="
echo "E-Commerce API Testing Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info
info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Test 1: Health Check
info "Testing health check..."
HEALTH=$(curl -s $BASE_URL/health)
if echo $HEALTH | grep -q "ok"; then
    success "Health check passed"
else
    error "Health check failed"
    exit 1
fi

# Test 2: Register User
info "Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"Test@1234\",
        \"firstName\": \"Test\",
        \"lastName\": \"User\"
    }")

if echo $REGISTER_RESPONSE | grep -q "accessToken"; then
    success "User registration successful"
    ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    USER_ID=$(echo $REGISTER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
    error "User registration failed"
    echo $REGISTER_RESPONSE
    exit 1
fi

# Test 3: Login
info "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"Test@1234\"
    }")

if echo $LOGIN_RESPONSE | grep -q "accessToken"; then
    success "Login successful"
else
    error "Login failed"
    exit 1
fi

# Test 4: Get Current User
info "Getting current user..."
ME_RESPONSE=$(curl -s $BASE_URL/api/auth/me \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo $ME_RESPONSE | grep -q "$TEST_EMAIL"; then
    success "Get current user successful"
else
    error "Get current user failed"
    exit 1
fi

# Test 5: Create Admin User (for testing admin endpoints)
info "Creating admin user..."
ADMIN_REGISTER=$(curl -s -X POST $BASE_URL/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"Admin@1234\",
        \"firstName\": \"Admin\",
        \"lastName\": \"User\"
    }")

ADMIN_ID=$(echo $ADMIN_REGISTER | grep -o '"id":"[^"]*' | cut -d'"' -f4)

# Update user role to admin in database
info "Updating user role to admin..."
psql -U postgres -d ecommerce_db -c "UPDATE users SET role = 'admin' WHERE id = '$ADMIN_ID';" > /dev/null 2>&1

# Login as admin
ADMIN_LOGIN=$(curl -s -X POST $BASE_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"Admin@1234\"
    }")

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
success "Admin user created and logged in"

# Test 6: Create Category
info "Creating category..."
CATEGORY_RESPONSE=$(curl -s -X POST $BASE_URL/api/categories \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Electronics_$TIMESTAMP\",
        \"slug\": \"electronics-$TIMESTAMP\",
        \"description\": \"Electronic devices\"
    }")

if echo $CATEGORY_RESPONSE | grep -q "id"; then
    success "Category created"
    CATEGORY_ID=$(echo $CATEGORY_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
    error "Category creation failed"
    echo $CATEGORY_RESPONSE
    exit 1
fi

# Test 7: Create Product
info "Creating product..."
PRODUCT_RESPONSE=$(curl -s -X POST $BASE_URL/api/products \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"Test Headphones\",
        \"slug\": \"test-headphones-$(date +%s)\",
        \"description\": \"High-quality test headphones\",
        \"basePrice\": 99.99,
        \"categoryId\": \"$CATEGORY_ID\",
        \"brand\": \"TestBrand\",
        \"status\": \"published\"
    }")

if echo $PRODUCT_RESPONSE | grep -q "id"; then
    success "Product created"
    PRODUCT_ID=$(echo $PRODUCT_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
    error "Product creation failed"
    echo $PRODUCT_RESPONSE
    exit 1
fi

# Test 8: Create Product Variant
info "Creating product variant..."
VARIANT_RESPONSE=$(curl -s -X POST $BASE_URL/api/products/$PRODUCT_ID/variants \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"sku\": \"TEST-$TIMESTAMP\",
        \"variantName\": \"Black\",
        \"priceAdjustment\": 0,
        \"stockQuantity\": 100,
        \"weight\": 250
    }")

if echo $VARIANT_RESPONSE | grep -q "id"; then
    success "Product variant created"
    VARIANT_ID=$(echo $VARIANT_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
    error "Product variant creation failed"
    echo $VARIANT_RESPONSE
    exit 1
fi

# Test 9: Get Products
info "Getting products..."
PRODUCTS=$(curl -s "$BASE_URL/api/products?limit=10")
if echo $PRODUCTS | grep -q "data"; then
    success "Get products successful"
else
    error "Get products failed"
fi

# Test 10: Add to Cart
info "Adding item to cart..."
CART_ADD=$(curl -s -X POST $BASE_URL/api/cart/items \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"productId\": \"$PRODUCT_ID\",
        \"variantId\": \"$VARIANT_ID\",
        \"quantity\": 2
    }")

if echo $CART_ADD | grep -q "id"; then
    success "Item added to cart"
    CART_ITEM_ID=$(echo $CART_ADD | grep -o '"id":"[^"]*' | cut -d'"' -f4)
else
    error "Add to cart failed"
    echo $CART_ADD
    exit 1
fi

# Test 11: Get Cart
info "Getting cart..."
CART=$(curl -s $BASE_URL/api/cart \
    -H "Authorization: Bearer $ACCESS_TOKEN")

if echo $CART | grep -q "items"; then
    success "Get cart successful"
else
    error "Get cart failed"
fi

# Test 12: Create Order
info "Creating order..."
ORDER_RESPONSE=$(curl -s -X POST $BASE_URL/api/orders \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"shippingAddress\": {
            \"fullName\": \"Test User\",
            \"addressLine1\": \"123 Test St\",
            \"city\": \"Test City\",
            \"state\": \"TS\",
            \"postalCode\": \"12345\",
            \"country\": \"US\"
        },
        \"billingAddress\": {
            \"fullName\": \"Test User\",
            \"addressLine1\": \"123 Test St\",
            \"city\": \"Test City\",
            \"state\": \"TS\",
            \"postalCode\": \"12345\",
            \"country\": \"US\"
        },
        \"customerEmail\": \"$TEST_EMAIL\"
    }")

if echo $ORDER_RESPONSE | grep -q "orderNumber"; then
    success "Order created"
    ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    ORDER_NUMBER=$(echo $ORDER_RESPONSE | grep -o '"orderNumber":"[^"]*' | cut -d'"' -f4)
    info "Order Number: $ORDER_NUMBER"
else
    error "Order creation failed"
    echo $ORDER_RESPONSE
    exit 1
fi

# Test 13: Process Payment
info "Processing payment..."
PAYMENT_RESPONSE=$(curl -s -X POST $BASE_URL/api/payments/process \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"orderId\": \"$ORDER_ID\",
        \"paymentMethod\": \"credit_card\",
        \"paymentGateway\": \"stripe\"
    }")

if echo $PAYMENT_RESPONSE | grep -q "id"; then
    success "Payment processed"
    PAYMENT_STATUS=$(echo $PAYMENT_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)
    info "Payment Status: $PAYMENT_STATUS"
else
    error "Payment processing failed"
    echo $PAYMENT_RESPONSE
    exit 1
fi

# Test 14: Create Shipment
info "Creating shipment..."
SHIPMENT_RESPONSE=$(curl -s -X POST $BASE_URL/api/shipping/shipments \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"orderId\": \"$ORDER_ID\",
        \"courier\": \"dhl\",
        \"weight\": 0.5
    }")

if echo $SHIPMENT_RESPONSE | grep -q "trackingNumber"; then
    success "Shipment created"
    TRACKING_NUMBER=$(echo $SHIPMENT_RESPONSE | grep -o '"trackingNumber":"[^"]*' | cut -d'"' -f4)
    info "Tracking Number: $TRACKING_NUMBER"
else
    error "Shipment creation failed"
    echo $SHIPMENT_RESPONSE
    exit 1
fi

# Test 15: Track Shipment
info "Tracking shipment..."
TRACKING=$(curl -s $BASE_URL/api/shipping/track/$TRACKING_NUMBER)
if echo $TRACKING | grep -q "trackingNumber"; then
    success "Shipment tracking successful"
else
    error "Shipment tracking failed"
fi

# Test 16: Create Review
info "Creating review..."
REVIEW_RESPONSE=$(curl -s -X POST $BASE_URL/api/reviews \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"productId\": \"$PRODUCT_ID\",
        \"orderId\": \"$ORDER_ID\",
        \"rating\": 5,
        \"title\": \"Great product!\",
        \"comment\": \"This is a test review.\"
    }")

if echo $REVIEW_RESPONSE | grep -q "id"; then
    success "Review created"
else
    error "Review creation failed"
    echo $REVIEW_RESPONSE
fi

# Test 17: Create Promotion
info "Creating promotion..."
PROMO_RESPONSE=$(curl -s -X POST $BASE_URL/api/promotions \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"code\": \"TEST20_$TIMESTAMP\",
        \"name\": \"Test 20% Off\",
        \"description\": \"Test promotion\",
        \"discountType\": \"percentage\",
        \"discountValue\": 20,
        \"minPurchaseAmount\": 50,
        \"startDate\": \"2026-01-01T00:00:00Z\",
        \"endDate\": \"2026-12-31T23:59:59Z\"
    }")

if echo $PROMO_RESPONSE | grep -q "id"; then
    success "Promotion created"
else
    error "Promotion creation failed"
    echo $PROMO_RESPONSE
fi

# Test 18: Validate Coupon
info "Validating coupon..."
COUPON_VALID=$(curl -s -X POST $BASE_URL/api/promotions/validate \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"code\": \"TEST20_$TIMESTAMP\",
        \"cartTotal\": 100
    }")

if echo $COUPON_VALID | grep -q "valid"; then
    success "Coupon validation successful"
else
    error "Coupon validation failed"
fi

# Test 19: Track Analytics Event
info "Tracking analytics event..."
ANALYTICS=$(curl -s -X POST $BASE_URL/api/analytics/events \
    -H "Content-Type: application/json" \
    -d "{
        \"eventType\": \"product_view\",
        \"sessionId\": \"test-session-123\",
        \"eventData\": {
            \"productId\": \"$PRODUCT_ID\"
        }
    }")

if echo $ANALYTICS | grep -q "tracked"; then
    success "Analytics event tracked"
else
    error "Analytics tracking failed"
fi

# Test 20: Get Dashboard Metrics
info "Getting dashboard metrics..."
DASHBOARD=$(curl -s "$BASE_URL/api/analytics/dashboard?startDate=2026-01-01&endDate=2026-12-31" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo $DASHBOARD | grep -q "sales"; then
    success "Dashboard metrics retrieved"
else
    error "Dashboard metrics failed"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
success "All tests passed!"
echo ""
echo "Test Data Created:"
echo "  User Email: $TEST_EMAIL"
echo "  Admin Email: $ADMIN_EMAIL"
echo "  Product ID: $PRODUCT_ID"
echo "  Order Number: $ORDER_NUMBER"
echo "  Tracking Number: $TRACKING_NUMBER"
echo ""
echo "You can now test the API manually using these credentials."
echo "=========================================="
