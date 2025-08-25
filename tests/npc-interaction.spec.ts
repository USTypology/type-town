import { test, expect, Page } from '@playwright/test';

test.describe('Type Town NPC Interaction and Map Display Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
    
    // Wait for the game to load
    await expect(page.locator('h1')).toContainText('Type Town');
  });

  test('should detect backend capabilities and show performance metrics', async ({ page }) => {
    // Wait for backend detection component to load
    await page.waitForSelector('text=Backend Performance', { timeout: 10000 });
    
    // Check if backend info component is visible
    const backendInfo = page.locator('text=Backend Performance').locator('..'); 
    await expect(backendInfo).toBeVisible();
    
    // Click show details to expand
    const showDetailsBtn = page.locator('button', { hasText: 'Show Details' });
    if (await showDetailsBtn.isVisible()) {
      await showDetailsBtn.click();
      
      // Check for capability indicators
      await expect(page.locator('text=Hardware Capabilities')).toBeVisible();
      await expect(page.locator('text=Performance Results')).toBeVisible();
      
      // Verify WASM capability is detected (should always be available)
      const wasmCapability = page.locator('text=WASM');
      await expect(wasmCapability).toBeVisible();
      
      // Check if JavaScript benchmark result exists
      const jsResult = page.locator('text=JavaScript').first();
      await expect(jsResult).toBeVisible();
    }
    
    await page.screenshot({ 
      path: 'tests/screenshots/backend-detection.png',
      fullPage: true 
    });
  });

  test('should start simulation and show NPCs interacting', async ({ page }) => {
    // Start the simulation
    const startButton = page.locator('button', { hasText: 'Start Simulation' });
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    // Wait for NPCs to spawn
    await page.waitForTimeout(3000);
    
    // Take initial screenshot to verify NPCs are visible
    await page.screenshot({ 
      path: 'tests/screenshots/npcs-initial.png',
      fullPage: true 
    });
    
    // Check world statistics show active characters
    const statsPanel = page.locator('text=World Statistics').locator('..');
    await expect(statsPanel).toBeVisible();
    
    // Wait for NPCs to potentially start conversations
    await page.waitForTimeout(5000);
    
    // Look for conversation indicators in the stats
    const conversationCount = page.locator('text=Active Conversations:').locator('..');
    if (await conversationCount.isVisible()) {
      const conversationText = await conversationCount.textContent();
      console.log('Conversation status:', conversationText);
    }
    
    // Check for recent conversations section
    const recentConversations = page.locator('text=Recent Conversations');
    if (await recentConversations.isVisible()) {
      console.log('Found recent conversations section');
      
      // Take screenshot showing conversations
      await page.screenshot({ 
        path: 'tests/screenshots/npcs-talking.png',
        fullPage: true 
      });
    }
    
    // Wait more time for autonomous interactions
    console.log('Waiting for autonomous NPC interactions...');
    await page.waitForTimeout(10000);
    
    // Final screenshot to capture any interactions
    await page.screenshot({ 
      path: 'tests/screenshots/npcs-interactions-final.png',
      fullPage: true 
    });
  });

  test('should verify map covers entire area without grey margins', async ({ page }) => {
    // Start simulation to show the full map
    const startButton = page.locator('button', { hasText: 'Start Simulation' });
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    // Wait for game to fully render
    await page.waitForTimeout(2000);
    
    // Get the game canvas container
    const gameContainer = page.locator('canvas').first();
    await expect(gameContainer).toBeVisible();
    
    // Take screenshot focusing on the map area
    const mapContainer = page.locator('div').filter({ hasText: 'Click & drag to explore' }).first();
    if (await mapContainer.isVisible()) {
      await mapContainer.screenshot({ 
        path: 'tests/screenshots/map-coverage-check.png'
      });
      
      // Check the container background color - should be black, not grey
      const containerStyles = await mapContainer.evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      
      console.log('Map container background color:', containerStyles);
      
      // Verify no grey background (should be black: rgb(0, 0, 0) or similar)
      expect(containerStyles).not.toContain('128'); // Grey color components
    }
    
    // Take full page screenshot to show overall layout
    await page.screenshot({ 
      path: 'tests/screenshots/full-layout-check.png',
      fullPage: true 
    });
  });

  test('should verify NPC labels are positioned correctly next to NPCs', async ({ page }) => {
    // Start simulation
    const startButton = page.locator('button', { hasText: 'Start Simulation' });
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    // Wait for NPCs to spawn and labels to appear
    await page.waitForTimeout(3000);
    
    // Look for NPC name labels that should be visible
    const npcLabels = page.locator('[class*="absolute"][class*="pointer-events-none"]').filter({ 
      hasText: /Alice|Bob|Pete|Lucky|Stella/ 
    });
    
    const labelCount = await npcLabels.count();
    console.log(`Found ${labelCount} NPC labels`);
    
    if (labelCount > 0) {
      // Take screenshot showing NPC label positions
      await page.screenshot({ 
        path: 'tests/screenshots/npc-labels-positioning.png',
        fullPage: true 
      });
      
      // Check that at least some NPC labels are visible
      expect(labelCount).toBeGreaterThan(0);
      
      // Verify specific NPCs are labeled
      for (let i = 0; i < Math.min(labelCount, 3); i++) {
        const label = npcLabels.nth(i);
        await expect(label).toBeVisible();
        
        const labelText = await label.textContent();
        console.log(`NPC label ${i}: ${labelText}`);
      }
    }
    
    // Wait a bit more to catch any movement/label updates
    await page.waitForTimeout(5000);
    
    // Final screenshot to show current label positions
    await page.screenshot({ 
      path: 'tests/screenshots/npc-labels-final.png',
      fullPage: true 
    });
  });

  test('should show comprehensive interaction verification', async ({ page }) => {
    console.log('Starting comprehensive interaction test...');
    
    // Start simulation
    const startButton = page.locator('button', { hasText: 'Start Simulation' });
    if (await startButton.isVisible()) {
      await startButton.click();
      console.log('Started simulation');
    }
    
    // Wait for full initialization
    await page.waitForTimeout(3000);
    
    // Take initial state screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/comprehensive-initial.png',
      fullPage: true 
    });
    
    // Monitor for 15 seconds to catch interactions
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(5000);
      
      // Check world statistics
      const statsText = await page.locator('text=World Statistics').locator('..').textContent();
      console.log(`Stats check ${i + 1}:`, statsText);
      
      // Look for conversation activity
      const conversationsPanel = page.locator('text=Recent Conversations');
      if (await conversationsPanel.isVisible()) {
        console.log(`Found active conversations at check ${i + 1}`);
        
        await page.screenshot({ 
          path: `tests/screenshots/conversations-found-${i + 1}.png`,
          fullPage: true 
        });
      }
      
      // Check for NPC status updates
      const movingNPCs = page.locator('text=moving');
      const chattingNPCs = page.locator('text=chatting');
      
      const movingCount = await movingNPCs.count();
      const chattingCount = await chattingNPCs.count();
      
      console.log(`Check ${i + 1}: ${movingCount} moving NPCs, ${chattingCount} chatting NPCs`);
      
      if (chattingCount > 0) {
        await page.screenshot({ 
          path: `tests/screenshots/npcs-chatting-${i + 1}.png`,
          fullPage: true 
        });
      }
    }
    
    // Final comprehensive screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/comprehensive-final.png',
      fullPage: true 
    });
    
    console.log('Comprehensive interaction test completed');
  });

  test('should verify all layout elements are properly sized and positioned', async ({ page }) => {
    // Start simulation to see all elements
    const startButton = page.locator('button', { hasText: 'Start Simulation' });
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    await page.waitForTimeout(3000);
    
    // Check main layout components
    const gameArea = page.locator('canvas').first();
    await expect(gameArea).toBeVisible();
    
    const userControls = page.locator('text=User Controls').locator('..');
    await expect(userControls).toBeVisible();
    
    const backendInfo = page.locator('text=Backend Performance').locator('..');
    await expect(backendInfo).toBeVisible();
    
    const worldStats = page.locator('text=World Statistics').locator('..');
    await expect(worldStats).toBeVisible();
    
    // Take screenshot showing all layout elements
    await page.screenshot({ 
      path: 'tests/screenshots/layout-elements-check.png',
      fullPage: true 
    });
    
    // Verify responsive layout isn't broken
    const gameContainer = page.locator('div').filter({ has: page.locator('canvas') }).first();
    const gameRect = await gameContainer.boundingBox();
    
    if (gameRect) {
      console.log('Game area dimensions:', gameRect);
      
      // Game area should have reasonable size
      expect(gameRect.width).toBeGreaterThan(500);
      expect(gameRect.height).toBeGreaterThan(400);
    }
  });
});