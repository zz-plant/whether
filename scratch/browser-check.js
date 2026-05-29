import { chromium } from '@playwright/test';
import * as fs from 'fs';

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport to a common mobile size to check mobile UX
  await page.setViewportSize({ width: 375, height: 812 });
  
  console.log('Navigating to http://localhost:3001/v2 ...');
  await page.goto('http://localhost:3001/v2');
  
  // Wait for the main elements to load
  await page.waitForTimeout(2000);
  
  // Click on Evidence & tools to expand
  console.log('Expanding Evidence & tools on mobile...');
  await page.click('summary:has-text("Evidence & tools")');
  await page.waitForTimeout(1000);

  console.log('Saving mobile screenshot to /Users/kanav/Dev/whether/scratch/v2-mobile.png ...');
  await page.screenshot({ path: '/Users/kanav/Dev/whether/scratch/v2-mobile.png', fullPage: true });
  
  // Let's also check console errors or issues
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[ERROR] ${err.toString()}`));
  
  // Set to desktop size
  await page.setViewportSize({ width: 1280, height: 800 });
  console.log('Navigating to http://localhost:3001/v2 on desktop...');
  await page.goto('http://localhost:3001/v2');
  await page.waitForTimeout(2000);
  
  // Click on Evidence & tools to expand
  console.log('Expanding Evidence & tools on desktop...');
  await page.click('summary:has-text("Evidence & tools")');
  await page.waitForTimeout(1000);

  console.log('Saving desktop screenshot to /Users/kanav/Dev/whether/scratch/v2-desktop.png ...');
  await page.screenshot({ path: '/Users/kanav/Dev/whether/scratch/v2-desktop.png', fullPage: true });
  
  // Dump some DOM elements to inspect the structure and layout classes
  const html = await page.content();
  fs.writeFileSync('/Users/kanav/Dev/whether/scratch/v2-content.html', html);
  
  console.log('Logs captured:', logs);
  
  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
