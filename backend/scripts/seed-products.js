#!/usr/bin/env node
// Seed: categories + 38 products
// Run: node scripts/seed-products.js
const fs = require('fs')
const path = require('path')

// Load .env manually
try {
  const envPath = path.join(__dirname, '..', '.env')
  const lines = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
} catch(e) {}

const { Pool } = require('pg')
const LOG = path.join(__dirname, '..', 'seed_output.txt')
const log = (msg) => { fs.appendFileSync(LOG, msg + '\n') }

fs.writeFileSync(LOG, 'Seed started\n')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ecommerce_db',
  connectionTimeoutMillis: 5000,
})

const CATEGORIES = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home & Living', slug: 'home-living' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Books', slug: 'books' },
  { name: 'Toys & Kids', slug: 'toys' },
  { name: 'Automotive', slug: 'automotive' },
]

const PRODUCTS = [
  { cat:'electronics', name:'Sony WH-1000XM5 Headphones', price:279.99, orig:349.99, stock:45,
    desc:'Industry-leading noise canceling. 30-hour battery.',
    img:'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80' },
  { cat:'electronics', name:'Apple MacBook Air M2 13"', price:1099.00, orig:1299.00, stock:20,
    desc:'M2 chip. 13.6-inch Liquid Retina display. 18-hour battery.',
    img:'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80' },
  { cat:'electronics', name:'Samsung 55" 4K QLED Smart TV', price:699.99, orig:899.99, stock:15,
    desc:'Quantum Dot technology. Alexa and Google Assistant built-in.',
    img:'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80' },
  { cat:'electronics', name:'iPhone 15 Pro 256GB', price:1099.00, orig:null, stock:30,
    desc:'A17 Pro chip. 48MP camera. USB-C. Titanium design.',
    img:'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80' },
  { cat:'electronics', name:'Canon EOS R50 Mirrorless Camera', price:679.99, orig:799.99, stock:12,
    desc:'24.2MP APS-C sensor. 4K video. Perfect for creators.',
    img:'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80' },
  { cat:'electronics', name:'iPad Pro 11 M4 Wi-Fi 256GB', price:999.00, orig:null, stock:25,
    desc:'Ultra Retina XDR display. M4 chip. Apple Pencil Pro compatible.',
    img:'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80' },
  { cat:'electronics', name:'Bose QuietComfort 45 Headphones', price:229.99, orig:329.99, stock:38,
    desc:'Acclaimed noise cancellation. 24-hour battery.',
    img:'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80' },
  { cat:'electronics', name:'Samsung Galaxy S24 Ultra 512GB', price:1199.99, orig:null, stock:22,
    desc:'200MP camera. Built-in S Pen. AI-powered features.',
    img:'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80' },
  { cat:'fashion', name:'Classic Leather Jacket Black', price:189.99, orig:249.99, stock:60,
    desc:'Premium genuine leather. Slim fit. Timeless style.',
    img:'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80' },
  { cat:'fashion', name:'Nike Air Max 270 Sneakers', price:129.99, orig:159.99, stock:80,
    desc:'Max Air unit for all-day comfort. Breathable mesh upper.',
    img:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
  { cat:'fashion', name:'Levis 501 Original Fit Jeans', price:69.99, orig:89.99, stock:120,
    desc:'The original straight leg jean. Button fly. 100% cotton.',
    img:'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80' },
  { cat:'fashion', name:'Floral Summer Dress', price:49.99, orig:79.99, stock:75,
    desc:'Lightweight chiffon. Floral print. Perfect for warm weather.',
    img:'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80' },
  { cat:'fashion', name:'Ray-Ban Aviator Classic Sunglasses', price:154.99, orig:179.99, stock:50,
    desc:'Iconic metal frame. 100% UV protection.',
    img:'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80' },
  { cat:'fashion', name:'Adidas Ultraboost 22 Running Shoes', price:149.99, orig:189.99, stock:65,
    desc:'Responsive Boost midsole. Primeknit upper.',
    img:'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80' },
  { cat:'home-living', name:'Nespresso Vertuo Next Coffee Machine', price:149.99, orig:199.99, stock:35,
    desc:'Brews 5 cup sizes. Centrifusion technology.',
    img:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80' },
  { cat:'home-living', name:'KitchenAid Stand Mixer 5Qt Red', price:379.99, orig:449.99, stock:18,
    desc:'10 speeds. Tilt-head design. Includes flat beater and dough hook.',
    img:'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80' },
  { cat:'home-living', name:'Dyson V15 Detect Cordless Vacuum', price:649.99, orig:749.99, stock:14,
    desc:'Laser dust detection. HEPA filtration. 60-minute run time.',
    img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
  { cat:'home-living', name:'Minimalist Wooden Desk Lamp', price:59.99, orig:79.99, stock:90,
    desc:'Warm LED light. Adjustable arm. USB charging port built-in.',
    img:'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80' },
  { cat:'home-living', name:'Luxury Scented Candle Set 3-pack', price:39.99, orig:54.99, stock:150,
    desc:'Hand-poured soy wax. 40-hour burn time each.',
    img:'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80' },
  { cat:'home-living', name:'Instant Pot Duo 7-in-1 6Qt', price:89.99, orig:119.99, stock:42,
    desc:'Pressure cooker, slow cooker, rice cooker, steamer, saute, yogurt maker.',
    img:'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80' },
  { cat:'sports', name:'Premium Yoga Mat Non-Slip', price:79.99, orig:99.99, stock:200,
    desc:'Non-slip surface. 6mm thick. Eco-friendly TPE material.',
    img:'https://images.unsplash.com/photo-1601925228008-f5e4c5e5e5e5?w=600&q=80' },
  { cat:'sports', name:'Adjustable Dumbbell Set 5-52 lbs', price:349.99, orig:429.99, stock:25,
    desc:'Replaces 15 sets of weights. Quick-adjust dial.',
    img:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80' },
  { cat:'sports', name:'Garmin Forerunner 255 GPS Watch', price:299.99, orig:349.99, stock:30,
    desc:'Advanced running dynamics. 14-day battery. Heart rate monitoring.',
    img:'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80' },
  { cat:'sports', name:'Hydro Flask 32oz Water Bottle', price:44.99, orig:54.99, stock:300,
    desc:'TempShield insulation. Keeps cold 24h, hot 12h. BPA-free.',
    img:'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80' },
  { cat:'sports', name:'Trek FX 3 Disc Hybrid Bike', price:849.99, orig:999.99, stock:8,
    desc:'Lightweight aluminum frame. Hydraulic disc brakes. 24 speeds.',
    img:'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80' },
  { cat:'beauty', name:'Dyson Airwrap Multi-Styler Complete', price:549.99, orig:599.99, stock:20,
    desc:'Styles and dries simultaneously. No extreme heat.',
    img:'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80' },
  { cat:'beauty', name:'La Mer Moisturizing Cream 60ml', price:189.99, orig:220.00, stock:40,
    desc:'Legendary Miracle Broth. Deeply hydrates and renews skin.',
    img:'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80' },
  { cat:'beauty', name:'Charlotte Tilbury Pillow Talk Lipstick', price:34.99, orig:null, stock:85,
    desc:'Iconic nude-pink shade. Matte Revolution formula.',
    img:'https://images.unsplash.com/photo-1586495777744-4e6232bf2f9b?w=600&q=80' },
  { cat:'beauty', name:'Foreo Luna 4 Face Cleansing Device', price:199.99, orig:249.99, stock:28,
    desc:'T-Sonic pulsations. Ultra-hygienic silicone. 300 uses per charge.',
    img:'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80' },
  { cat:'books', name:'Atomic Habits by James Clear', price:16.99, orig:24.99, stock:500,
    desc:'The proven framework for building good habits and breaking bad ones.',
    img:'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80' },
  { cat:'books', name:'The Psychology of Money by Morgan Housel', price:14.99, orig:19.99, stock:400,
    desc:'Timeless lessons on wealth, greed, and happiness.',
    img:'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80' },
  { cat:'books', name:'Deep Work by Cal Newport', price:15.99, orig:22.99, stock:350,
    desc:'Rules for focused success in a distracted world.',
    img:'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80' },
  { cat:'toys', name:'LEGO Technic Bugatti Chiron 42083', price:349.99, orig:399.99, stock:22,
    desc:'3599 pieces. Working 8-speed gearbox. Authentic Bugatti details.',
    img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
  { cat:'toys', name:'Nintendo Switch OLED Console', price:349.99, orig:null, stock:35,
    desc:'7-inch OLED screen. Enhanced audio. 64GB internal storage.',
    img:'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&q=80' },
  { cat:'toys', name:'Barbie Dreamhouse Playset', price:199.99, orig:249.99, stock:18,
    desc:'3 stories, 8 rooms, 70+ accessories. Working elevator and pool.',
    img:'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80' },
  { cat:'automotive', name:'Anker Roav Dash Cam C2 Pro', price:79.99, orig:99.99, stock:55,
    desc:'1080p Full HD. Night vision. Wide-angle lens. Loop recording.',
    img:'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80' },
  { cat:'automotive', name:'NOCO Boost Plus GB40 Jump Starter', price:99.99, orig:129.99, stock:40,
    desc:'1000A peak current. Starts up to 6L gas engines. USB charging.',
    img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80' },
  { cat:'automotive', name:'Meguiars Complete Car Care Kit', price:49.99, orig:69.99, stock:75,
    desc:'Everything for a showroom shine. Wax, polish, microfiber cloths.',
    img:'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&q=80' },
]

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function seed() {
  log('Connecting to DB...')
  let client
  try {
    client = await pool.connect()
    log('Connected!')
  } catch(e) {
    log('DB connect error: ' + e.message)
    process.exit(1)
  }

  try {
    const adminRes = await client.query("SELECT id FROM users WHERE role='admin' LIMIT 1")
    if (!adminRes.rows.length) { log('No admin user'); process.exit(1) }
    const adminId = adminRes.rows[0].id
    log('Admin: ' + adminId)

    const sp = await client.query('SELECT id FROM seller_profiles WHERE user_id=$1', [adminId])
    if (!sp.rows.length) {
      await client.query(
        "INSERT INTO seller_profiles(user_id,store_name,contact_email,is_verified,is_active) VALUES($1,'ShopHub Official','admin@shophub.com',true,true)",
        [adminId]
      )
      log('Created seller profile')
    } else {
      log('Seller profile exists')
    }

    const catMap = {}
    for (const c of CATEGORIES) {
      const ex = await client.query('SELECT id FROM categories WHERE slug=$1', [c.slug])
      if (ex.rows.length) {
        catMap[c.slug] = ex.rows[0].id
      } else {
        const r = await client.query(
          'INSERT INTO categories(name,slug,is_active) VALUES($1,$2,true) RETURNING id',
          [c.name, c.slug]
        )
        catMap[c.slug] = r.rows[0].id
        log('+ Category: ' + c.name)
      }
    }

    let created = 0, skipped = 0
    for (const p of PRODUCTS) {
      const slug = slugify(p.name)
      const ex = await client.query('SELECT id FROM products WHERE slug=$1', [slug])
      if (ex.rows.length) { skipped++; continue }

      const sku = 'SH-' + slug.replace(/-/g,'').toUpperCase().slice(0,10)
      const catId = catMap[p.cat]
      const pr = await client.query(
        `INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',true) RETURNING id`,
        [adminId, catId, p.name, slug, sku, p.desc, p.price, p.orig || p.price, p.stock]
      )
      const pid = pr.rows[0].id
      await client.query(
        'INSERT INTO product_images(product_id,url,is_primary,display_order) VALUES($1,$2,true,0)',
        [pid, p.img]
      )
      created++
      log('+ Product: ' + p.name)
    }

    log('DONE: ' + created + ' created, ' + skipped + ' skipped.')
  } catch(e) {
    log('ERROR: ' + e.message)
    log(e.stack || '')
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch(e => { log('FATAL: ' + e.message); process.exit(1) })
