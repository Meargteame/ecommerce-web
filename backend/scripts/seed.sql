-- Seed categories and products
-- Run: psql -U postgres -d ecommerce_db -f scripts/seed.sql

DO $$
DECLARE
  admin_id UUID;
  cat_electronics UUID;
  cat_fashion UUID;
  cat_home UUID;
  cat_sports UUID;
  cat_beauty UUID;
  cat_books UUID;
  cat_toys UUID;
  cat_auto UUID;
  pid UUID;
BEGIN

-- Get admin user
SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
IF admin_id IS NULL THEN RAISE EXCEPTION 'No admin user found'; END IF;
RAISE NOTICE 'Admin: %', admin_id;

-- Ensure seller profile
INSERT INTO seller_profiles(user_id, store_name, contact_email, is_verified, is_active)
VALUES(admin_id, 'ShopHub Official', 'admin@shophub.com', true, true)
ON CONFLICT (user_id) DO NOTHING;

-- Categories
INSERT INTO categories(name, slug, is_active) VALUES('Electronics','electronics',true) ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name, slug, is_active) VALUES('Fashion','fashion',true) ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name, slug, is_active) VALUES('Home & Living','home-living',true) ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name, slug, is_active) VALUES('Sports','sports',true) ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name, slug, is_active) VALUES('Beauty','beauty',true) ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name, slug, is_active) VALUES('Books','books',true) ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name, slug, is_active) VALUES('Toys & Kids','toys',true) ON CONFLICT(slug) DO NOTHING;
INSERT INTO categories(name, slug, is_active) VALUES('Automotive','automotive',true) ON CONFLICT(slug) DO NOTHING;

SELECT id INTO cat_electronics FROM categories WHERE slug='electronics';
SELECT id INTO cat_fashion FROM categories WHERE slug='fashion';
SELECT id INTO cat_home FROM categories WHERE slug='home-living';
SELECT id INTO cat_sports FROM categories WHERE slug='sports';
SELECT id INTO cat_beauty FROM categories WHERE slug='beauty';
SELECT id INTO cat_books FROM categories WHERE slug='books';
SELECT id INTO cat_toys FROM categories WHERE slug='toys';
SELECT id INTO cat_auto FROM categories WHERE slug='automotive';

RAISE NOTICE 'Categories ready';

-- ── ELECTRONICS ──────────────────────────────────────────────────────────────
INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_electronics,'Sony WH-1000XM5 Headphones','sony-wh-1000xm5-headphones','SH-SONYWH1000',
  'Industry-leading noise canceling. 30-hour battery.',279.99,349.99,45,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='sony-wh-1000xm5-headphones');
SELECT id INTO pid FROM products WHERE slug='sony-wh-1000xm5-headphones';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_electronics,'Apple MacBook Air M2','apple-macbook-air-m2','SH-MACBOOKM2',
  'M2 chip. 13.6-inch Liquid Retina display. 18-hour battery.',1099.00,1299.00,20,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='apple-macbook-air-m2');
SELECT id INTO pid FROM products WHERE slug='apple-macbook-air-m2';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_electronics,'Samsung 55" 4K QLED Smart TV','samsung-55-4k-qled-tv','SH-SAMSUNGTV',
  'Quantum Dot technology. Alexa and Google Assistant built-in.',699.99,899.99,15,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='samsung-55-4k-qled-tv');
SELECT id INTO pid FROM products WHERE slug='samsung-55-4k-qled-tv';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1593359677879-a4bb92f829e1?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_electronics,'iPhone 15 Pro 256GB','iphone-15-pro-256gb','SH-IPHONE15P',
  'A17 Pro chip. 48MP camera. USB-C. Titanium design.',1099.00,1099.00,30,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='iphone-15-pro-256gb');
SELECT id INTO pid FROM products WHERE slug='iphone-15-pro-256gb';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_electronics,'Canon EOS R50 Mirrorless Camera','canon-eos-r50-camera','SH-CANONR50',
  '24.2MP APS-C sensor. 4K video. Perfect for creators.',679.99,799.99,12,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='canon-eos-r50-camera');
SELECT id INTO pid FROM products WHERE slug='canon-eos-r50-camera';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_electronics,'Bose QuietComfort 45 Headphones','bose-quietcomfort-45','SH-BOSEQC45',
  'Acclaimed noise cancellation. 24-hour battery.',229.99,329.99,38,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='bose-quietcomfort-45');
SELECT id INTO pid FROM products WHERE slug='bose-quietcomfort-45';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_electronics,'Samsung Galaxy S24 Ultra 512GB','samsung-galaxy-s24-ultra','SH-S24ULTRA',
  '200MP camera. Built-in S Pen. AI-powered features.',1199.99,1199.99,22,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='samsung-galaxy-s24-ultra');
SELECT id INTO pid FROM products WHERE slug='samsung-galaxy-s24-ultra';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_electronics,'iPad Pro 11 M4 Wi-Fi 256GB','ipad-pro-11-m4','SH-IPADPROM4',
  'Ultra Retina XDR display. M4 chip. Apple Pencil Pro compatible.',999.00,999.00,25,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='ipad-pro-11-m4');
SELECT id INTO pid FROM products WHERE slug='ipad-pro-11-m4';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

-- ── FASHION ───────────────────────────────────────────────────────────────────
INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_fashion,'Classic Leather Jacket Black','classic-leather-jacket-black','SH-LEATHERJKT',
  'Premium genuine leather. Slim fit. Timeless style.',189.99,249.99,60,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='classic-leather-jacket-black');
SELECT id INTO pid FROM products WHERE slug='classic-leather-jacket-black';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_fashion,'Nike Air Max 270 Sneakers','nike-air-max-270-sneakers','SH-NIKEAM270',
  'Max Air unit for all-day comfort. Breathable mesh upper.',129.99,159.99,80,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='nike-air-max-270-sneakers');
SELECT id INTO pid FROM products WHERE slug='nike-air-max-270-sneakers';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_fashion,'Levis 501 Original Fit Jeans','levis-501-original-fit-jeans','SH-LEVIS501',
  'The original straight leg jean. Button fly. 100% cotton.',69.99,89.99,120,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='levis-501-original-fit-jeans');
SELECT id INTO pid FROM products WHERE slug='levis-501-original-fit-jeans';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_fashion,'Floral Summer Dress','floral-summer-dress','SH-FLORALDRS',
  'Lightweight chiffon. Floral print. Perfect for warm weather.',49.99,79.99,75,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='floral-summer-dress');
SELECT id INTO pid FROM products WHERE slug='floral-summer-dress';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_fashion,'Ray-Ban Aviator Classic Sunglasses','ray-ban-aviator-classic','SH-RAYBANAVT',
  'Iconic metal frame. 100% UV protection.',154.99,179.99,50,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='ray-ban-aviator-classic');
SELECT id INTO pid FROM products WHERE slug='ray-ban-aviator-classic';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_fashion,'Adidas Ultraboost 22 Running Shoes','adidas-ultraboost-22','SH-ADIDASUB22',
  'Responsive Boost midsole. Primeknit upper.',149.99,189.99,65,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='adidas-ultraboost-22');
SELECT id INTO pid FROM products WHERE slug='adidas-ultraboost-22';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

-- ── HOME & LIVING ─────────────────────────────────────────────────────────────
INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_home,'Nespresso Vertuo Next Coffee Machine','nespresso-vertuo-next','SH-NESPRESSO',
  'Brews 5 cup sizes. Centrifusion technology.',149.99,199.99,35,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='nespresso-vertuo-next');
SELECT id INTO pid FROM products WHERE slug='nespresso-vertuo-next';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_home,'KitchenAid Stand Mixer 5Qt Red','kitchenaid-stand-mixer-5qt-red','SH-KITCHENAID',
  '10 speeds. Tilt-head design. Includes flat beater and dough hook.',379.99,449.99,18,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='kitchenaid-stand-mixer-5qt-red');
SELECT id INTO pid FROM products WHERE slug='kitchenaid-stand-mixer-5qt-red';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_home,'Dyson V15 Detect Cordless Vacuum','dyson-v15-detect-vacuum','SH-DYSONV15',
  'Laser dust detection. HEPA filtration. 60-minute run time.',649.99,749.99,14,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='dyson-v15-detect-vacuum');
SELECT id INTO pid FROM products WHERE slug='dyson-v15-detect-vacuum';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_home,'Minimalist Wooden Desk Lamp','minimalist-wooden-desk-lamp','SH-DESKLAMP',
  'Warm LED light. Adjustable arm. USB charging port built-in.',59.99,79.99,90,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='minimalist-wooden-desk-lamp');
SELECT id INTO pid FROM products WHERE slug='minimalist-wooden-desk-lamp';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_home,'Instant Pot Duo 7-in-1 6Qt','instant-pot-duo-7in1-6qt','SH-INSTANTPOT',
  'Pressure cooker, slow cooker, rice cooker, steamer, saute, yogurt maker.',89.99,119.99,42,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='instant-pot-duo-7in1-6qt');
SELECT id INTO pid FROM products WHERE slug='instant-pot-duo-7in1-6qt';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

-- ── SPORTS ────────────────────────────────────────────────────────────────────
INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_sports,'Premium Yoga Mat Non-Slip','premium-yoga-mat-non-slip','SH-YOGAMAT',
  'Non-slip surface. 6mm thick. Eco-friendly TPE material.',79.99,99.99,200,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='premium-yoga-mat-non-slip');
SELECT id INTO pid FROM products WHERE slug='premium-yoga-mat-non-slip';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1601925228008-f5e4c5e5e5e5?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_sports,'Adjustable Dumbbell Set 5-52 lbs','adjustable-dumbbell-set-5-52','SH-DUMBBELLS',
  'Replaces 15 sets of weights. Quick-adjust dial.',349.99,429.99,25,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='adjustable-dumbbell-set-5-52');
SELECT id INTO pid FROM products WHERE slug='adjustable-dumbbell-set-5-52';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_sports,'Garmin Forerunner 255 GPS Watch','garmin-forerunner-255-gps-watch','SH-GARMIN255',
  'Advanced running dynamics. 14-day battery. Heart rate monitoring.',299.99,349.99,30,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='garmin-forerunner-255-gps-watch');
SELECT id INTO pid FROM products WHERE slug='garmin-forerunner-255-gps-watch';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_sports,'Hydro Flask 32oz Water Bottle','hydro-flask-32oz-water-bottle','SH-HYDROFLSK',
  'TempShield insulation. Keeps cold 24h, hot 12h. BPA-free.',44.99,54.99,300,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='hydro-flask-32oz-water-bottle');
SELECT id INTO pid FROM products WHERE slug='hydro-flask-32oz-water-bottle';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

-- ── BEAUTY ────────────────────────────────────────────────────────────────────
INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_beauty,'Dyson Airwrap Multi-Styler Complete','dyson-airwrap-multi-styler','SH-DYSONAIR',
  'Styles and dries simultaneously. No extreme heat.',549.99,599.99,20,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='dyson-airwrap-multi-styler');
SELECT id INTO pid FROM products WHERE slug='dyson-airwrap-multi-styler';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_beauty,'La Mer Moisturizing Cream 60ml','la-mer-moisturizing-cream-60ml','SH-LAMER60',
  'Legendary Miracle Broth. Deeply hydrates and renews skin.',189.99,220.00,40,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='la-mer-moisturizing-cream-60ml');
SELECT id INTO pid FROM products WHERE slug='la-mer-moisturizing-cream-60ml';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_beauty,'Charlotte Tilbury Pillow Talk Lipstick','charlotte-tilbury-pillow-talk','SH-CTPILLOW',
  'Iconic nude-pink shade. Matte Revolution formula.',34.99,34.99,85,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='charlotte-tilbury-pillow-talk');
SELECT id INTO pid FROM products WHERE slug='charlotte-tilbury-pillow-talk';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1586495777744-4e6232bf2f9b?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

-- ── BOOKS ─────────────────────────────────────────────────────────────────────
INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_books,'Atomic Habits by James Clear','atomic-habits-james-clear','SH-ATOMICHBT',
  'The proven framework for building good habits and breaking bad ones.',16.99,24.99,500,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='atomic-habits-james-clear');
SELECT id INTO pid FROM products WHERE slug='atomic-habits-james-clear';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_books,'The Psychology of Money','the-psychology-of-money','SH-PSYCHMONY',
  'Timeless lessons on wealth, greed, and happiness.',14.99,19.99,400,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='the-psychology-of-money');
SELECT id INTO pid FROM products WHERE slug='the-psychology-of-money';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_books,'Deep Work by Cal Newport','deep-work-cal-newport','SH-DEEPWORK',
  'Rules for focused success in a distracted world.',15.99,22.99,350,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='deep-work-cal-newport');
SELECT id INTO pid FROM products WHERE slug='deep-work-cal-newport';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

-- ── TOYS ──────────────────────────────────────────────────────────────────────
INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_toys,'Nintendo Switch OLED Console','nintendo-switch-oled-console','SH-SWITCHOLED',
  '7-inch OLED screen. Enhanced audio. 64GB internal storage.',349.99,349.99,35,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='nintendo-switch-oled-console');
SELECT id INTO pid FROM products WHERE slug='nintendo-switch-oled-console';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_toys,'LEGO Technic Bugatti Chiron','lego-technic-bugatti-chiron','SH-LEGOBUGAT',
  '3599 pieces. Working 8-speed gearbox. Authentic Bugatti details.',349.99,399.99,22,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='lego-technic-bugatti-chiron');
SELECT id INTO pid FROM products WHERE slug='lego-technic-bugatti-chiron';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

-- ── AUTOMOTIVE ────────────────────────────────────────────────────────────────
INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_auto,'Anker Roav Dash Cam C2 Pro','anker-roav-dash-cam-c2-pro','SH-DASHCAM',
  '1080p Full HD. Night vision. Wide-angle lens. Loop recording.',79.99,99.99,55,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='anker-roav-dash-cam-c2-pro');
SELECT id INTO pid FROM products WHERE slug='anker-roav-dash-cam-c2-pro';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_auto,'NOCO Boost Plus GB40 Jump Starter','noco-boost-plus-gb40','SH-NOCOGB40',
  '1000A peak current. Starts up to 6L gas engines. USB charging.',99.99,129.99,40,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='noco-boost-plus-gb40');
SELECT id INTO pid FROM products WHERE slug='noco-boost-plus-gb40';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

INSERT INTO products(seller_id,category_id,name,slug,sku,description,price,base_price,stock_quantity,status,is_active)
SELECT admin_id,cat_auto,'Meguiars Complete Car Care Kit','meguiars-complete-car-care-kit','SH-MEGUIARS',
  'Everything for a showroom shine. Wax, polish, microfiber cloths.',49.99,69.99,75,'published',true
WHERE NOT EXISTS(SELECT 1 FROM products WHERE slug='meguiars-complete-car-care-kit');
SELECT id INTO pid FROM products WHERE slug='meguiars-complete-car-care-kit';
INSERT INTO product_images(product_id,url,is_primary,display_order)
SELECT pid,'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=600&q=80',true,0
WHERE NOT EXISTS(SELECT 1 FROM product_images WHERE product_id=pid);

RAISE NOTICE 'Seed complete!';
END $$;
