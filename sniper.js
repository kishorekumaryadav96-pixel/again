/**
 * Private Sniper Engine
 * Stealth Logic: Uses playwright-extra and stealth to mimic a human user
 * - Loads all missions from shopping_missions where status = 'tracking'
 * - For each mission, goes to Amazon URL (or searches via ASIN)
 * - Waits 2-4 seconds to simulate "reading" the page
 * - Extracts current price and stock status
 * - Updates Supabase with new price and last_checked timestamp
 */

import playwright from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { chromium } from 'playwright-extra';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Stealth Logic: Enable stealth plugin to mimic human user
playwright.use(StealthPlugin());

// Randomization: User-Agent pool for iPhone and Windows laptop
const USER_AGENTS = {
  iphone: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 20_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/20.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ],
  windows: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  ],
};

/**
 * Get random User-Agent (iPhone or Windows laptop)
 */
function getRandomUserAgent() {
  const deviceType = Math.random() > 0.5 ? 'iphone' : 'windows';
  const agents = USER_AGENTS[deviceType];
  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Get random wait time between 2-4 seconds (simulate reading)
 */
function getRandomWaitTime() {
  return Math.floor(Math.random() * 2000) + 2000; // 2000-4000ms
}

/**
 * Initialize Supabase client
 */
function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ndodkzgoprdqkesueysv.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_MBsae672o1h4uTGGEjTxzQ_RiTAeo1R';
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Extract price from Amazon page
 * Looks for .a-price-whole class
 */
async function extractPrice(page) {
  try {
    // Wait for price element to load
    await page.waitForSelector('.a-price-whole', { timeout: 10000 });
    
    // Extract price from .a-price-whole class
    const priceText = await page.textContent('.a-price-whole');
    
    if (!priceText) {
      console.log('Price element found but no text content');
      return null;
    }

    // Clean and parse price (remove commas, extract numbers)
    const priceStr = priceText.replace(/[₹,\s]/g, '');
    const price = parseFloat(priceStr);

    if (isNaN(price)) {
      console.log('Could not parse price:', priceText);
      return null;
    }

    return price;
  } catch (error) {
    console.error('Error extracting price:', error.message);
    return null;
  }
}

/**
 * Extract stock status from Amazon page
 */
async function extractStockStatus(page) {
  try {
    // Check for "In Stock" indicator
    const inStockSelectors = [
      '#availability span',
      '.a-color-success',
      '#availability .a-color-state',
    ];

    for (const selector of inStockSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && (text.includes('In Stock') || text.includes('in stock'))) {
            return 'in_stock';
          }
          if (text && (text.includes('Out of Stock') || text.includes('out of stock'))) {
            return 'out_of_stock';
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // Check for "Add to Cart" button as stock indicator
    const addToCartButton = await page.$('#add-to-cart-button, #buy-now-button');
    if (addToCartButton) {
      return 'in_stock';
    }

    return 'unknown';
  } catch (error) {
    console.error('Error extracting stock status:', error.message);
    return 'unknown';
  }
}

/**
 * Navigate to Amazon product page
 * Either via URL or by searching ASIN
 */
async function navigateToProduct(page, amazonUrl, asin) {
  if (amazonUrl && amazonUrl.includes('amazon')) {
    // Use provided URL
    await page.goto(amazonUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
  } else if (asin) {
    // Search via ASIN
    const searchUrl = `https://www.amazon.in/s?k=${asin}`;
    await page.goto(searchUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Try to click first result if available
    try {
      await page.waitForSelector('[data-asin]', { timeout: 5000 });
      const firstResult = await page.$('[data-asin]');
      if (firstResult) {
        await firstResult.click();
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
      }
    } catch (e) {
      console.log('Could not click first result, using search page');
    }
  } else {
    throw new Error('No Amazon URL or ASIN provided');
  }
}

/**
 * Scrape Amazon product page and update Supabase
 */
async function snipeProduct(amazonUrl, asin, missionId, productName) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const userAgent = getRandomUserAgent(); // Randomization: Different User-Agent each time

  const context = await browser.newContext({
    userAgent: userAgent,
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  const page = await context.newPage();

  try {
    console.log(`\n--- Checking: ${productName} ---`);
    console.log(`URL: ${amazonUrl || `Search: ${asin}`}`);
    console.log(`User-Agent: ${userAgent}`);

    // Navigate to Amazon product page (or search via ASIN)
    await navigateToProduct(page, amazonUrl, asin);

    // Stealth Logic: Wait 2-4 seconds to simulate "reading" the page
    const waitTime = getRandomWaitTime();
    console.log(`Waiting ${waitTime}ms (simulating reading)...`);
    await page.waitForTimeout(waitTime);

    // Extract price and stock status
    const price = await extractPrice(page);
    const stockStatus = await extractStockStatus(page);

    if (price === null) {
      console.log('Price not found, skipping update');
      return { success: false, reason: 'Price not found' };
    }

    console.log(`Price extracted: ₹${price}`);
    console.log(`Stock status: ${stockStatus}`);

    // Supabase Update: Update database with new price and last_checked
    const supabase = initSupabase();
    const updateData = {
      current_price: price,
      last_checked: new Date().toISOString(),
    };

    // Add stock_status if column exists (optional)
    if (stockStatus !== 'unknown') {
      updateData.stock_status = stockStatus;
    }

    const { error } = await supabase
      .from('shopping_missions')
      .update(updateData)
      .eq('id', missionId);

    if (error) {
      console.error('Supabase update error:', error);
      return { success: false, reason: error.message };
    }

    console.log(`✅ Successfully updated mission ${missionId}`);
    return { success: true, price, stockStatus };

  } catch (error) {
    console.error('Sniper error:', error);
    return { success: false, reason: error.message };
  } finally {
    await browser.close();
  }
}

/**
 * Main function: Check all tracking missions
 * Stealth Logic: Loads all missions from shopping_missions where status = 'tracking'
 */
async function checkAllMissions() {
  const supabase = initSupabase();

  // Load all missions from shopping_missions where status = 'tracking'
  const { data: missions, error } = await supabase
    .from('shopping_missions')
    .select('id, amazon_url, asin, product_name')
    .eq('status', 'tracking')
    .not('amazon_url', 'is', null);

  if (error) {
    console.error('Error fetching missions:', error);
    return;
  }

  if (!missions || missions.length === 0) {
    console.log('No missions to check');
    return;
  }

  console.log(`Found ${missions.length} missions to check`);

  // Process each mission
  for (const mission of missions) {
    const result = await snipeProduct(
      mission.amazon_url,
      mission.asin,
      mission.id,
      mission.product_name
    );
    
    if (result.success) {
      console.log(`✅ Success: ₹${result.price} (${result.stockStatus})`);
    } else {
      console.log(`❌ Failed: ${result.reason}`);
    }

    // Add delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log('\n--- All missions checked ---');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAllMissions().catch(console.error);
}

export { snipeProduct, checkAllMissions };
