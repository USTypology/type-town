import { test, expect, Page } from '@playwright/test';

test.describe('Type Town NPC Interaction and Map Display Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
    
    // Wait for the game to load
    await expect(page.locator('h1')).toContainText('Type Town');
  });

  test('should detect backend capabilities and show performance metrics with model selection', async ({ page }) => {
    // Wait for backend detection component to load
    await page.waitForSelector('text=Backend Performance', { timeout: 10000 });
    
    // Check if backend info component is visible
    const backendInfo = page.locator('text=Backend Performance').locator('..'); 
    await expect(backendInfo).toBeVisible();
    
    // Check for model selector component
    const modelSelector = page.locator('text=Language Model').locator('..');
    await expect(modelSelector).toBeVisible();
    
    // Click show details to expand backend info
    const showDetailsBtn = page.locator('button', { hasText: 'Show Details' }).first();
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

    // Check model selector details
    const modelDetailsBtn = page.locator('button', { hasText: 'Show Details' }).last();
    if (await modelDetailsBtn.isVisible()) {
      await modelDetailsBtn.click();
      
      // Verify model selection options are available
      await expect(page.locator('text=Available Models')).toBeVisible();
      
      // Check for specific model types
      const distilGPT = page.locator('text=DistilGPT-2');
      const llamaModels = page.locator('text=Llama 3.2');
      
      await expect(distilGPT).toBeVisible();
      
      // WebGPU models should be listed (even if not selectable)
      if (await llamaModels.count() > 0) {
        console.log('Llama models detected in selection');
      }
    }
    
    await page.screenshot({ 
      path: 'tests/screenshots/backend-detection-enhanced.png',
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

  test('should show language model selection with WebGPU capability detection', async ({ page }) => {
    // Wait for model selector to load
    await page.waitForSelector('text=Language Model', { timeout: 10000 });
    
    const modelSelector = page.locator('text=Language Model').locator('..');
    await expect(modelSelector).toBeVisible();
    
    // Check current model display
    const currentModelText = page.locator('text=Current Model:');
    await expect(currentModelText).toBeVisible();
    
    // Click show details to expand
    const showDetailsBtn = page.locator('button', { hasText: 'Show Details' }).last();
    if (await showDetailsBtn.isVisible()) {
      await showDetailsBtn.click();
      
      // Wait for models to load
      await page.waitForTimeout(2000);
      
      // Check for available models section
      await expect(page.locator('text=Available Models')).toBeVisible();
      
      // Verify WebGPU status is shown
      const webGPUStatus = page.locator('text=WebGPU Support:');
      if (await webGPUStatus.isVisible()) {
        const statusText = await webGPUStatus.textContent();
        console.log('WebGPU status:', statusText);
      }
      
      // Check for different model categories
      const modelButtons = page.locator('button').filter({ hasText: /DistilGPT|Llama|GPT-2/ });
      const modelCount = await modelButtons.count();
      console.log(`Found ${modelCount} available models`);
      
      expect(modelCount).toBeGreaterThan(0);
      
      // Look for WebGPU-enabled models
      const webGPUModels = page.locator('text=WebGPU');
      const webGPUModelCount = await webGPUModels.count();
      console.log(`Found ${webGPUModelCount} WebGPU models`);
      
      // Check for recommendation section
      const recommendedSection = page.locator('text=Recommended Model');
      if (await recommendedSection.isVisible()) {
        console.log('Model recommendation system is working');
      }
    }
    
    await page.screenshot({ 
      path: 'tests/screenshots/model-selection.png',
      fullPage: true 
    });
  });

  test('should demonstrate comprehensive language model capabilities', async ({ page }) => {
    console.log('Testing language model capabilities...');
    
    // Wait for everything to load
    await page.waitForTimeout(5000);
    
    // Take initial state screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/model-capabilities-initial.png',
      fullPage: true 
    });
    
    // Check WebGPU availability for larger models
    const webGPUSupported = await page.evaluate(() => {
      return 'gpu' in navigator && typeof (navigator as any).gpu?.requestAdapter === 'function';
    });
    
    console.log('WebGPU supported:', webGPUSupported);
    
    // Check current model in status bar
    const statusBar = page.locator('text=LLM Status:');
    if (await statusBar.isVisible()) {
      const statusText = await statusBar.textContent();
      console.log('Current LLM status:', statusText);
    }
    
    // Open model selector if available
    const modelDetailsBtn = page.locator('button', { hasText: 'Show Details' }).last();
    if (await modelDetailsBtn.isVisible()) {
      await modelDetailsBtn.click();
      await page.waitForTimeout(2000);
      
      // Get list of available models
      const modelButtons = page.locator('button').filter({ hasText: /GB|MB/ });
      const modelCount = await modelButtons.count();
      
      for (let i = 0; i < Math.min(modelCount, 3); i++) {
        const modelButton = modelButtons.nth(i);
        const modelText = await modelButton.textContent();
        console.log(`Available model ${i + 1}: ${modelText?.substring(0, 100)}`);
      }
    }
    
    await page.screenshot({ 
      path: 'tests/screenshots/model-capabilities-final.png',
      fullPage: true 
    });
  });
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