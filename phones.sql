-- Migration: Add image, affiliate link, and review columns if they don't exist
ALTER TABLE phones ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS amazon_link TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS flipkart_link TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS ai_review TEXT;

-- Create articles table for AI content engine
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW()
);


-- Clear previous data to avoid duplicates (optional, commented out)
-- TRUNCATE TABLE phones;

-- Insert 25 popular smartphones sold in India (2024-2026) with images, affiliate links, and AI-generated reviews
INSERT INTO phones (brand, model, price, chipset, battery, camera, display, score_camera, score_gaming, score_battery, image_url, amazon_link, flipkart_link, ai_review) VALUES
('Apple', 'iPhone 15 Pro Max', 148000, 'A17 Pro', '4441 mAh', '48MP Main + 12MP Telephoto + 12MP Ultra-Wide', '6.7 inch LTPO Super Retina XDR OLED, 120Hz', 10, 10, 8, 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500', 'https://www.amazon.in/s?k=Apple+iPhone+15+Pro+Max', 'https://www.flipkart.com/search?q=Apple+iPhone+15+Pro+Max', '### Pros
- Industry-leading A17 Pro chipset performs flawlessly under heavy gaming.
- Outstanding 5x optical zoom camera captures incredible details.
- High-end premium titanium build is lightweight and durable.

### Cons
- Extremely high price tag.
- Charging speed is slow compared to Android rivals.

### Verdict
The ultimate premium flagship for power users and mobile photographers who want the absolute best iOS has to offer.'),

('Apple', 'iPhone 15 Plus', 81999, 'A16 Bionic', '4383 mAh', '48MP Main + 12MP Ultra-Wide', '6.7 inch Super Retina XDR OLED', 9, 8, 9, 'https://images.unsplash.com/photo-1695048133031-645318ad81d4?w=500', 'https://www.amazon.in/s?k=Apple+iPhone+15+Plus', 'https://www.flipkart.com/search?q=Apple+iPhone+15+Plus', '### Pros
- Incredible battery endurance lasting up to 2 full days.
- Vibrant, expansive 6.7-inch display is great for media.
- Main 48MP camera offers crisp portrait shots.

### Cons
- Screen is limited to a slow 60Hz refresh rate.
- Lacks a dedicated telephoto zoom lens.

### Verdict
The best option for iOS users prioritizing screen size and long-lasting battery life without paying the Pro premium.'),

('Apple', 'iPhone 15', 71999, 'A16 Bionic', '3349 mAh', '48MP Main + 12MP Ultra-Wide', '6.1 inch Super Retina XDR OLED', 9, 8, 7, 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=500', 'https://www.amazon.in/s?k=Apple+iPhone+15', 'https://www.flipkart.com/search?q=Apple+iPhone+15', '### Pros
- Compact, lightweight, and very comfortable for one-handed use.
- Interactive Dynamic Island replaces the older notch.
- Excellent daylight photography and class-leading video.

### Cons
- Screen refresh rate is stuck at 60Hz.
- Average battery capacity requires daily charging.

### Verdict
A solid, compact everyday device, though outclassed in technical specs by cheaper Android alternatives.'),

('Samsung', 'Galaxy S24 Ultra', 129999, 'Snapdragon 8 Gen 3', '5000 mAh', '200MP Main + 50MP Telephoto + 12MP Ultra-Wide', '6.8 inch Dynamic AMOLED 2X, 120Hz', 10, 10, 9, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500', 'https://www.amazon.in/s?k=Samsung+Galaxy+S24+Ultra', 'https://www.flipkart.com/search?q=Samsung+Galaxy+S24+Ultra', '### Pros
- Unmatched processing power with Snapdragon 8 Gen 3.
- Bright 120Hz display with flat design and anti-reflective glass.
- Extremely versatile quad-camera array with 200MP sensor and S-Pen utility.

### Cons
- Boxy design can feel large and heavy in hand.
- Slower charging speeds compared to Chinese competitors.

### Verdict
The absolute best overall Android flagship for multitasking, note-taking, and elite-level mobile photography.'),

('Samsung', 'Galaxy S24', 74999, 'Exynos 2400', '4000 mAh', '50MP Main + 10MP Telephoto + 12MP Ultra-Wide', '6.2 inch Dynamic AMOLED 2X, 120Hz', 8, 8, 7, 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500', 'https://www.amazon.in/s?k=Samsung+Galaxy+S24', 'https://www.flipkart.com/search?q=Samsung+Galaxy+S24', '### Pros
- Gorgeous, compact design with symmetric ultra-thin bezels.
- Excellent 120Hz LTPO display with extreme peak brightness.
- Dynamic camera system with dedicated 3x optical zoom.

### Cons
- Exynos 2400 chipset is slightly less efficient than Snapdragon variants.
- Small 4000 mAh battery capacity.

### Verdict
An excellent compact premium flagship, ideal for users who want premium features in a pocket-friendly size.'),

('Samsung', 'Galaxy A55', 39999, 'Exynos 1480', '5000 mAh', '50MP Main + 12MP Ultra-Wide + 5MP Macro', '6.6 inch Super AMOLED, 120Hz', 7, 7, 9, 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500', 'https://www.amazon.in/s?k=Samsung+Galaxy+A55', 'https://www.flipkart.com/search?q=Samsung+Galaxy+A55', '### Pros
- Premium glass-sandwich build with a metallic frame.
- IP67 water and dust resistance rating.
- Dependable 5000 mAh battery with efficient daily runtime.

### Cons
- Charging is capped at a slow 25W; charger not included.
- Mid-range Exynos performance exhibits minor stutter in heavy gaming.

### Verdict
A premium, highly secure, and durable mid-ranger that offers the classic Samsung flagship look at a sensible price.'),

('Samsung', 'Galaxy M34', 16999, 'Exynos 1280', '6000 mAh', '50MP Main + 8MP Ultra-Wide + 2MP Macro', '6.5 inch Super AMOLED, 120Hz', 6, 5, 10, 'https://images.unsplash.com/photo-1565630916779-e303be97b6f5?w=500', 'https://www.amazon.in/s?k=Samsung+Galaxy+M34', 'https://www.flipkart.com/search?q=Samsung+Galaxy+M34', '### Pros
- Massive 6000 mAh battery provides up to 3 days of light use.
- Beautiful 120Hz AMOLED display in the budget segment.
- 50MP main camera features optical image stabilization (OIS).

### Cons
- Dated waterdrop notch design and thick bottom bezel.
- Heavy and chunky profile due to the large battery.

### Verdict
A fantastic budget utility device for users who prioritize battery longevity, screen quality, and OIS stability.'),

('OnePlus', '12', 64999, 'Snapdragon 8 Gen 3', '5400 mAh', '50MP Main + 64MP Periscope + 48MP Ultra-Wide', '6.82 inch 2K Fluid AMOLED, 120Hz', 9, 9, 9, 'https://images.unsplash.com/photo-1598327106026-d9521da673d1?w=500', 'https://www.amazon.in/s?k=OnePlus+12', 'https://www.flipkart.com/search?q=OnePlus+12', '### Pros
- Exceptional performance and cooling with Snapdragon 8 Gen 3.
- Super-fast 100W wired and 50W wireless charging.
- Stupendous Hasselblad camera array with 3x periscope lens.

### Cons
- Lacks a flat screen option (curved display may attract accidental touches).
- Only IP65 rated, not fully submergible.

### Verdict
A true flagship killer offering top-tier performance, rapid charging, and camera capabilities at a competitive price.'),

('OnePlus', '12R', 39999, 'Snapdragon 8 Gen 2', '5500 mAh', '50MP Main + 8MP Ultra-Wide + 2MP Macro', '6.78 inch AMOLED ProXDR, 120Hz', 7, 9, 10, 'https://images.unsplash.com/photo-1598327106026-d9521da673d1?w=500', 'https://www.amazon.in/s?k=OnePlus+12R', 'https://www.flipkart.com/search?q=OnePlus+12R', '### Pros
- Stellar Snapdragon 8 Gen 2 gaming performance with advanced cooling.
- Massive 5500 mAh battery combined with 100W fast charging.
- Premium metal-frame build and gorgeous ProXDR display.

### Cons
- Secondary cameras (8MP wide + 2MP macro) are average.
- No wireless charging support.

### Verdict
The ultimate mid-range performance beast, perfect for gamers and heavy users looking for battery life and speed.'),

('OnePlus', 'Nord CE 4', 24999, 'Snapdragon 7 Gen 3', '5500 mAh', '50MP Main + 8MP Ultra-Wide', '6.7 inch Fluid AMOLED, 120Hz', 7, 8, 10, 'https://images.unsplash.com/photo-1598327106026-d9521da673d1?w=500', 'https://www.amazon.in/s?k=OnePlus+Nord+CE+4', 'https://www.flipkart.com/search?q=OnePlus+Nord+CE+4', '### Pros
- Efficient Snapdragon 7 Gen 3 chip delivers solid gaming.
- 5500 mAh battery paired with class-leading 100W charging.
- Clean software experience with expandable storage support.

### Cons
- Plastic back panel and frame feel less premium.
- Average camera performance in low-light environments.

### Verdict
A highly practical and speedy mid-range device focusing on battery durability, fast charging, and fluid software.'),

('Xiaomi', '14', 69999, 'Snapdragon 8 Gen 3', '4610 mAh', '50MP Leica Main + 50MP Telephoto + 50MP Ultra-Wide', '6.36 inch LTPO OLED, 120Hz', 9, 9, 8, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Xiaomi+14', 'https://www.flipkart.com/search?q=Xiaomi+14', '### Pros
- Best-in-class Leica floating lens camera system.
- Compact form factor with symmetric thin bezels.
- Flagship Snapdragon 8 Gen 3 processor with 90W fast charging.

### Cons
- HyperOS software interface has a learning curve.
- Device can get warm during sustained gaming sessions.

### Verdict
The best compact flagship for mobile photography enthusiasts who do not want a massive screen size.'),

('Xiaomi', 'Redmi Note 13 Pro+', 31999, 'Dimensity 7200 Ultra', '5000 mAh', '200MP Main + 8MP Ultra-Wide + 2MP Macro', '6.67 inch Curved AMOLED, 120Hz', 8, 7, 8, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Redmi+Note+13+Pro%2B', 'https://www.flipkart.com/search?q=Redmi+Note+13+Pro%2B', '### Pros
- Stunning curved 120Hz AMOLED display with narrow bezels.
- Powerful 200MP main camera with excellent detail.
- Full IP68 water resistance and rapid 120W charging.

### Cons
- Comes with pre-installed bloatware.
- Performance is decent but not suited for hardcore competitive gaming.

### Verdict
A feature-packed mid-range device that feels premium, charges incredibly fast, and captures great high-res photos.'),

('Xiaomi', 'Redmi 13C', 9999, 'Helio G85', '5000 mAh', '50MP Main + 2MP Depth', '6.74 inch IPS LCD, 90Hz', 5, 4, 8, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Redmi+13C', 'https://www.flipkart.com/search?q=Redmi+13C', '### Pros
- Large 90Hz display in the sub-10k price segment.
- Decent 5000 mAh battery life.
- Clean design with a modern glass-like rear finish.

### Cons
- Helio G85 performance is laggy under multi-tasking.
- Low-resolution 720p display; slow 18W charging.

### Verdict
An entry-level budget device suitable for basic messaging, browsing, and media playback.'),

('Realme', 'GT 6', 40999, 'Snapdragon 8s Gen 3', '5500 mAh', '50MP Main + 50MP Telephoto + 8MP Ultra-Wide', '6.78 inch 8T LTPO AMOLED, 120Hz', 8, 9, 10, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Realme+GT+6', 'https://www.flipkart.com/search?q=Realme+GT+6', '### Pros
- Flagship-level performance with Snapdragon 8s Gen 3.
- Incredible 6000 nits local peak brightness display.
- Large 5500 mAh battery with 120W superVOOC charging.

### Cons
- Plastic frame is used instead of metal.
- Software includes notifications that require disabling.

### Verdict
A performance powerhouse that rivals flagships in display tech and charging speed at a fraction of the cost.'),

('Realme', '12 Pro+', 29999, 'Snapdragon 7s Gen 2', '5000 mAh', '64MP Periscope + 50MP Main + 8MP Ultra-Wide', '6.7 inch Curved OLED, 120Hz', 8, 6, 9, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Realme+12+Pro%2B', 'https://www.flipkart.com/search?q=Realme+12+Pro%2B', '### Pros
- Only mid-ranger with a dedicated 64MP periscope telephoto lens.
- Luxurious vegan leather back panel design with metallic accents.
- Smooth curved OLED display.

### Cons
- Snapdragon 7s Gen 2 underperforms in heavy gaming.
- No official IP rating for water protection.

### Verdict
A premium-looking lifestyle phone that excels in portrait photography and design aesthetics.'),

('iQOO', '12', 52999, 'Snapdragon 8 Gen 3', '5000 mAh', '50MP Main + 64MP Periscope + 50MP Ultra-Wide', '6.78 inch LTPO AMOLED, 144Hz', 8, 10, 8, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=iQOO+12', 'https://www.flipkart.com/search?q=iQOO+12', '### Pros
- The cheapest Snapdragon 8 Gen 3 smartphone with raw performance.
- Gaming-focused software features and dedicated Q1 chip.
- High refresh rate 144Hz AMOLED screen.

### Cons
- Funtouch OS software has bloatware pre-installed.
- Camera processing can look over-sharpened at times.

### Verdict
The absolute best choice for performance enthusiasts and mobile gamers wanting raw processing power.'),

('iQOO', 'Z9x', 12999, 'Snapdragon 6 Gen 1', '6000 mAh', '50MP Main + 2MP Depth', '6.72 inch IPS LCD, 120Hz', 5, 6, 10, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=iQOO+Z9x', 'https://www.flipkart.com/search?q=iQOO+Z9x', '### Pros
- Massive 6000 mAh battery yields exceptional screen-on-time.
- Efficient Snapdragon 6 Gen 1 chip runs cooler.
- Loud dual stereo speakers.

### Cons
- Display is IPS LCD, not AMOLED.
- Cameras struggle in indoor or night conditions.

### Verdict
An excellent, reliable budget phone for users who want maximum battery backup and solid everyday performance.'),

('Nothing', 'Phone (2a)', 23999, 'Dimensity 7200 Pro', '5000 mAh', '50MP Main + 50MP Ultra-Wide', '6.7 inch Flexible AMOLED, 120Hz', 7, 7, 9, 'https://images.unsplash.com/photo-1598327106026-d9521da673d1?w=500', 'https://www.amazon.in/s?k=Nothing+Phone+2a', 'https://www.flipkart.com/search?q=Nothing+Phone+2a', '### Pros
- Unique glyph interface back design with symmetric front bezels.
- Clean, ad-free Nothing OS software experience.
- Great battery life and dependable 50MP main camera.

### Cons
- Lacks a charger in the box.
- Plastic construction can scratch easily if not cased.

### Verdict
The most stylish and user-friendly clean Android interface in the sub-25k segment.'),

('Nothing', 'Phone (2)', 37999, 'Snapdragon 8+ Gen 1', '4700 mAh', '50MP Main + 50MP Ultra-Wide', '6.7 inch LTPO OLED, 120Hz', 8, 8, 8, 'https://images.unsplash.com/photo-1598327106026-d9521da673d1?w=500', 'https://www.amazon.in/s?k=Nothing+Phone+2', 'https://www.flipkart.com/search?q=Nothing+Phone+2', '### Pros
- Premium glass design with interactive glyph lighting.
- Top-tier, smooth Nothing OS with customized widgets.
- Competent Snapdragon 8+ Gen 1 performance.

### Cons
- Ultrawide camera quality drops in low-light.
- Average battery capacity of 4700 mAh.

### Verdict
A premium design-first smartphone that combines reliable performance with an unmatched aesthetic appeal.'),

('Motorola', 'Edge 50 Pro', 31999, 'Snapdragon 7 Gen 3', '4500 mAh', '50MP Main + 10MP Telephoto + 13MP Ultra-Wide', '6.7 inch pOLED, 144Hz', 8, 7, 7, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Motorola+Edge+50+Pro', 'https://www.flipkart.com/search?q=Motorola+Edge+50+Pro', '### Pros
- Superb Pantone-validated 144Hz curved pOLED display.
- Sleek vegan leather design with a lightweight frame.
- Clean software with solid 3x optical zoom camera.

### Cons
- Modest 4500 mAh battery capacity.
- Device gets warm during fast 125W turbo-charging.

### Verdict
A gorgeous, clean Android phone with premium display and cameras, though let down slightly by battery endurance.'),

('Motorola', 'G64', 14999, 'Dimensity 7025', '6000 mAh', '50MP Main + 2MP Macro', '6.5 inch IPS LCD, 120Hz', 6, 6, 10, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Motorola+G64', 'https://www.flipkart.com/search?q=Motorola+G64', '### Pros
- Huge 6000 mAh battery lasts easily over a day and a half.
- Near-stock clean Android interface with no ads.
- Main camera features OIS for stable budget shots.

### Cons
- Display is IPS LCD; charging capped at 30W.
- Dimensity 7025 struggles with graphics-heavy games.

### Verdict
A dependable clean-Android budget phone prioritizing battery backup, OIS stability, and ad-free daily usage.'),

('Vivo', 'V30 Pro', 41999, 'Dimensity 8200', '5000 mAh', '50MP Zeiss Main + 50MP Telephoto + 50MP Ultra-Wide', '6.78 inch AMOLED, 120Hz', 9, 8, 8, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Vivo+V30+Pro', 'https://www.flipkart.com/search?q=Vivo+V30+Pro', '### Pros
- Zeiss-tuned camera setup produces exceptional portrait shots.
- Slim, elegant form factor with smart Aura light feature.
- Fluid and bright 1.5K AMOLED curved display.

### Cons
- Funtouch OS includes promotional notifications.
- Lacks stereo speakers.

### Verdict
The ultimate mid-range smartphone for portrait photography and thin-design fans.'),

('Poco', 'F6', 29999, 'Snapdragon 8s Gen 3', '5000 mAh', '50MP Main + 8MP Ultra-Wide', '6.67 inch AMOLED, 120Hz', 7, 9, 8, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Poco+F6', 'https://www.flipkart.com/search?q=Poco+F6', '### Pros
- Extreme processing power for price with Snapdragon 8s Gen 3.
- Beautiful AMOLED panel with 90W fast charging in box.
- Very lightweight build.

### Cons
- Entirely plastic build (back and frame).
- Bloatware needs to be cleaned up on first boot.

### Verdict
The absolute best price-to-performance smartphone for gamers who want raw speed under 30k.'),

('Poco', 'X6 Pro', 25999, 'Dimensity 8300 Ultra', '5000 mAh', '64MP Main + 8MP Ultra-Wide + 2MP Macro', '6.67 inch AMOLED, 120Hz', 7, 9, 8, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Poco+X6+Pro', 'https://www.flipkart.com/search?q=Poco+X6+Pro', '### Pros
- Flagship-grade Dimensity 8300 Ultra performance and LPDDR5X RAM.
- Beautiful thin-bezel AMOLED screen.
- Excellent haptics and 67W fast charging.

### Cons
- Back panel attracts fingerprints easily (glossy finish).
- Average secondary cameras.

### Verdict
An absolute steal for mid-range gaming and speed, outperforming everything in its price bracket.'),

('Google', 'Pixel 8a', 52999, 'Tensor G3', '4492 mAh', '64MP Main + 13MP Ultra-Wide', '6.1 inch OLED, 120Hz', 9, 7, 7, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500', 'https://www.amazon.in/s?k=Google+Pixel+8a', 'https://www.flipkart.com/search?q=Google+Pixel+8a', '### Pros
- Elite Pixel camera quality with class-leading photo processing.
- Clean Pixel UI with 7 years of OS updates guaranteed.
- Compact design and IP67 water protection.

### Cons
- Thick, dated screen bezels.
- Tensor G3 runs warm and throttles during heavy gaming; slow charging.

### Verdict
The ideal phone for photo purists and clean software lovers wanting long-term support.');

