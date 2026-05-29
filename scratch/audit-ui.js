import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PAGES = [
  { name: 'Root Page', path: '/' },
  { name: 'V2 Home', path: '/v2' },
  { name: 'Planning Page', path: '/planning' },
  { name: 'Trust Page', path: '/trust' },
  { name: 'History Page', path: '/history' },
  { name: 'Evidence Page', path: '/evidence' }
];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812 }
];

async function audit() {
  console.log('Starting UI & Accessibility Audit in Browser...');
  const browser = await chromium.launch({ headless: true });
  
  const auditResults = [];
  const outDir = path.resolve('/Users/kanav/Dev/whether/scratch/audit-results');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const pageInfo of PAGES) {
    for (const viewport of VIEWPORTS) {
      console.log(`Auditing ${pageInfo.name} (${viewport.name})...`);
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();
      
      const consoleErrors = [];
      const consoleWarnings = [];
      const networkFailures = [];
      
      page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') {
          consoleErrors.push(text);
        } else if (msg.type() === 'warning') {
          consoleWarnings.push(text);
        }
      });
      
      page.on('pageerror', err => {
        consoleErrors.push(`[UNCAUGHT EXCEPTION] ${err.toString()}`);
      });
      
      page.on('requestfailed', req => {
        networkFailures.push(`${req.method()} ${req.url()}: ${req.failure().errorText}`);
      });

      const url = `http://localhost:3000${pageInfo.path}`;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 5000 });
      } catch (err) {
        // Try port 3001 if port 3000 failed
        const altUrl = `http://localhost:3001${pageInfo.path}`;
        console.log(`Port 3000 connection issue, trying ${altUrl}...`);
        try {
          await page.goto(altUrl, { waitUntil: 'load', timeout: 5000 });
        } catch (innerErr) {
          consoleErrors.push(`Failed to navigate to page: ${innerErr.message}`);
          await page.close();
          await context.close();
          continue;
        }
      }
      
      // Wait extra time for hydration and dynamic elements
      await page.waitForTimeout(2000);
      
      // Expand details elements to check their layout contents
      try {
        await page.evaluate(() => {
          document.querySelectorAll('details').forEach(d => d.open = true);
        });
      } catch (e) {}
      await page.waitForTimeout(500);

      // 1. Check for Horizontal Scroll Overflow
      const overflowDetails = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const viewWidth = window.innerWidth;
        const overflowElements = [];
        
        if (docWidth > viewWidth) {
          // Find which element is sticking out
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > viewWidth && rect.width > 0 && rect.height > 0) {
              // Get path/identifier of element
              let path = el.tagName.toLowerCase();
              if (el.id) path += '#' + el.id;
              if (el.className) path += '.' + Array.from(el.classList).join('.');
              overflowElements.push({
                selector: path,
                width: rect.width,
                right: rect.right,
                parentWidth: el.parentElement ? el.parentElement.clientWidth : null
              });
            }
          }
        }
        return { docWidth, viewWidth, overflowElements };
      });

      // 2. Check for Tap Target Sizes (Mobile only)
      let tinyTapTargets = [];
      if (viewport.name === 'mobile') {
        tinyTapTargets = await page.evaluate(() => {
          const targets = [];
          // Buttons, Links, Inputs, Selects, textareas, summary
          const elements = document.querySelectorAll('button, a, input, select, textarea, summary, [role="button"], [role="link"]');
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            // Filter out hidden or collapsed elements
            if (rect.width === 0 || rect.height === 0) continue;
            
            // Check if bounds are smaller than 44px
            if (rect.width < 44 || rect.height < 44) {
              let identifier = el.tagName.toLowerCase();
              if (el.id) identifier += '#' + el.id;
              if (el.className) {
                identifier += '.' + Array.from(el.classList).slice(0, 3).join('.');
              }
              const text = (el.textContent || el.value || '').trim().slice(0, 30);
              
              // Only report if it has some visibility (e.g. opacity > 0, display !== none)
              const style = window.getComputedStyle(el);
              if (style.opacity === '0' || style.display === 'none' || style.visibility === 'hidden') {
                continue;
              }
              
              targets.push({
                identifier,
                text,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                left: rect.left
              });
            }
          }
          return targets;
        });
      }

      // Capture screenshot
      const screenshotName = `${pageInfo.name.replace(/\s+/g, '-').toLowerCase()}-${viewport.name}.png`;
      const screenshotPath = path.join(outDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      auditResults.push({
        pageName: pageInfo.name,
        path: pageInfo.path,
        viewport: viewport.name,
        viewportWidth: viewport.width,
        consoleErrors,
        consoleWarnings,
        networkFailures,
        hasOverflow: overflowDetails.docWidth > overflowDetails.viewWidth,
        overflowDetails,
        tinyTapTargets,
        screenshotName
      });

      await page.close();
      await context.close();
    }
  }

  await browser.close();

  // Save audit report
  fs.writeFileSync(
    path.join(outDir, 'report.json'),
    JSON.stringify(auditResults, null, 2)
  );

  console.log('\nAudit complete! Generating summary...');
  
  let totalErrors = 0;
  let totalOverflows = 0;
  let totalTinyTargets = 0;

  for (const res of auditResults) {
    console.log(`\n----------------------------------------`);
    console.log(`Page: ${res.pageName} (${res.viewport})`);
    console.log(`Path: ${res.path}`);
    
    if (res.consoleErrors.length > 0) {
      console.log(`❌ Console Errors (${res.consoleErrors.length}):`);
      res.consoleErrors.forEach(e => console.log(`   - ${e}`));
      totalErrors += res.consoleErrors.length;
    } else {
      console.log(`✅ No console errors.`);
    }

    if (res.hasOverflow) {
      console.log(`❌ Horizontal Overflow Detected! Page width: ${res.overflowDetails.docWidth}px (Viewport: ${res.overflowDetails.viewWidth}px)`);
      console.log(`   Sticking-out elements:`);
      res.overflowDetails.overflowElements.slice(0, 3).forEach(el => {
        console.log(`   - ${el.selector} (width: ${el.width}px, right: ${el.right}px)`);
      });
      totalOverflows++;
    } else {
      console.log(`✅ No horizontal overflow.`);
    }

    if (res.tinyTapTargets.length > 0) {
      console.log(`⚠ Small Tap Targets Detected (${res.tinyTapTargets.length}):`);
      res.tinyTapTargets.slice(0, 5).forEach(t => {
        console.log(`   - <${t.identifier}> "${t.text}" is ${t.width.toFixed(1)}x${t.height.toFixed(1)}`);
      });
      if (res.tinyTapTargets.length > 5) {
        console.log(`   - ...and ${res.tinyTapTargets.length - 5} more.`);
      }
      totalTinyTargets += res.tinyTapTargets.length;
    } else if (res.viewport === 'mobile') {
      console.log(`✅ All tap targets on mobile are >= 44x44px.`);
    }
  }

  console.log(`\n========================================`);
  console.log(`AUDIT SUMMARY:`);
  console.log(`- Pages Audited: ${PAGES.length}`);
  console.log(`- Console Errors/Uncaught Exceptions: ${totalErrors}`);
  console.log(`- Horizontal Scroll Overflows: ${totalOverflows}`);
  console.log(`- Tiny Tap Targets (< 44px): ${totalTinyTargets}`);
  console.log(`========================================`);
}

audit().catch(console.error);
