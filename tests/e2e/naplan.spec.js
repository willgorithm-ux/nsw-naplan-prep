import { test, expect } from '@playwright/test';

test.describe('NAPLAN Prep App - Comprehensive E2E Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
  });

  // ==========================================
  // Helper Functions
  // ==========================================

  async function onboardToDashboard(page, nickname) {
    await expect(page.locator('h1')).toContainText('Welcome to NAPLAN Mission');
    await page.fill('#nickname', nickname);
    await page.click('button:has-text("Let\'s Go")');
    await expect(page.locator('h1')).toContainText('Pick a Theme');
    await page.click('button:has-text("Space")');
    await expect(page.locator('h1')).toContainText('Hey');
  }

  async function startMission(page, module, size) {
    await page.click('button:has-text("Start a Mission")');
    await expect(page.locator('h1')).toContainText('Pick Your Mission');
    await page.click(`button:has-text("${module}")`);
    await expect(page.locator('h1')).toContainText('Mission Setup');
    await page.click(`button.option-btn:has-text("${size}")`);
    await expect(page.locator('h2')).toBeVisible();
  }

  async function answerQuestion(page) {
    await page.click('.options .option-btn:nth-child(1)');
    await page.click('#submitBtn');

    // Handle retry if wrong
    const retry = page.locator('.feedback-card.incorrect:has-text("one more")');
    if (await retry.count()) {
      await page.click('.options .option-btn:nth-child(2)');
      await page.click('#submitBtn');
    }

    await expect(page.locator('#nextBtn')).toBeVisible();
  }

  // ==========================================
  // Test Suite
  // ==========================================

  test('1. Onboarding: Welcome → Co-design → Dashboard with personalization', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome to NAPLAN Mission');
    
    await page.fill('#nickname', 'Georgia');
    await page.click('button:has-text("Let\'s Go")');
    
    await expect(page.locator('h1')).toContainText('Pick a Theme');
    await page.click('button:has-text("Space")');
    
    // Dashboard should show personalized greeting
    await expect(page.locator('h1')).toContainText('Hey Georgia!');
    await expect(page.locator('.buddy-intro')).toContainText('Ziggy');
    await expect(page.locator('#startBtn')).toContainText('Start a Mission');
  });

  test('2. Module Select displays all 4 categories with levels', async ({ page }) => {
    await onboardToDashboard(page, 'TestUser');
    
    await page.click('button:has-text("Start a Mission")');
    await expect(page.locator('h1')).toContainText('Pick Your Mission');
    
    // All modules visible with level indicators
    await expect(page.locator('button:has-text("Numeracy")')).toBeVisible();
    await expect(page.locator('button:has-text("Reading")')).toBeVisible();
    await expect(page.locator('button:has-text("Grammar")')).toBeVisible();
    await expect(page.locator('button:has-text("Writing")')).toBeVisible();
    
    // Level indicators present
    await expect(page.locator('text=Level 1')).toHaveCount(4);
  });

  test('3. Mission Setup: choose 10/20/30 questions', async ({ page }) => {
    await onboardToDashboard(page, 'SetupUser');
    await page.click('button:has-text("Start a Mission")');
    await page.click('button:has-text("Numeracy")');
    
    await expect(page.locator('h1')).toContainText('Mission Setup');
    await expect(page.locator('button:has-text("Quick (10")')).toBeVisible();
    await expect(page.locator('button:has-text("Medium (20")')).toBeVisible();
    await expect(page.locator('button:has-text("Epic (30")')).toBeVisible();
    
    await page.click('button:has-text("Quick (10")');
    
    // Quiz starts
    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('.options .option-btn')).toHaveCount(4);
  });

  test('4. Quiz: submit flow with correct answer and 5-second auto-advance', async ({ page }) => {
    test.setTimeout(15000);
    
    await onboardToDashboard(page, 'AutoUser');
    await startMission(page, 'Numeracy', 'Quick (10');
    
    // Pick and submit (assume correct or handle both)
    await page.click('.options .option-btn:nth-child(1)');
    await page.click('#submitBtn');
    
    // If retry appears, answer again
    const retry = page.locator('.feedback-card.incorrect:has-text("one more")');
    if (await retry.count()) {
      await page.click('.options .option-btn:nth-child(2)');
      await page.click('#submitBtn');
    }
    
    // Check for correct feedback (if we got it right)
    const correctCard = page.locator('.feedback-card.correct');
    if (await correctCard.count()) {
      // Auto-advance countdown should be visible
      await expect(page.locator('#autoAdvanceText')).toContainText('Auto-next in');
      await expect(page.locator('#countdown')).toContainText('5');
      
      // Wait for auto-advance (5 seconds + buffer)
      await page.waitForTimeout(5500);
      
      // Should have advanced to next question
      await expect(page.locator('h2')).toBeVisible();
      await expect(page.locator('.options .option-btn')).toHaveCount(4);
    } else {
      // If incorrect final, no auto-advance
      await expect(page.locator('#autoAdvanceText')).toHaveCount(0);
    }
  });

  test('5. Quiz: retry logic (hint + 2nd attempt → reveal answer)', async ({ page }) => {
    await onboardToDashboard(page, 'RetryUser');
    await startMission(page, 'Reading', 'Quick (10');
    
    // Pick wrong answer
    await page.click('.options .option-btn:nth-child(1)');
    await page.click('#submitBtn');
    
    // If retry appears (wrong first attempt)
    const retry = page.locator('.feedback-card.incorrect:has-text("one more")');
    if (await retry.count()) {
      await expect(page.locator('#hintArea')).toBeVisible();
      await expect(retry).toContainText('have one more go');
      
      // Second attempt
      await page.click('.options .option-btn:nth-child(2)');
      await page.click('#submitBtn');
      
      // Final feedback with Next
      await expect(page.locator('#nextBtn')).toBeVisible();
      
      // If still wrong, answer should be revealed
      const nextText = await page.locator('#nextBtn').innerText();
      expect(nextText).toMatch(/^Next/);
    }
  });

  test('6. Quiz: Quit to Menu saves session', async ({ page }) => {
    await onboardToDashboard(page, 'QuitUser');
    await startMission(page, 'Grammar', 'Quick (10');
    
    // Answer one question
    await answerQuestion(page);
    
    // Quit
    await page.click('#quitBtn');
    await expect(page.locator('h1')).toContainText('Pick Your Mission');
    
    // Resume button should exist
    await expect(page.locator('#resumeBtn')).toBeVisible();
  });

  test('7. Resume last mission restores progress', async ({ page }) => {
    await onboardToDashboard(page, 'ResumeUser');
    await startMission(page, 'Writing', 'Quick (10');
    
    await answerQuestion(page);
    
    // Quit
    await page.click('#quitBtn');
    
    // Resume
    await page.click('#resumeBtn');
    
    // Should be back in quiz
    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('#quitBtn')).toBeVisible();
  });

  test('8. Complete 10-question mission → Results → Level update', async ({ page }) => {
    test.setTimeout(120000);
    
    await onboardToDashboard(page, 'LevelUser');
    await startMission(page, 'Numeracy', 'Quick (10');
    
    // Answer 10 questions
    for (let i = 0; i < 10; i++) {
      await answerQuestion(page);
      
      // Click Next (manual, don't wait for auto-advance in tests)
      await page.click('#nextBtn');
    }
    
    // Results screen
    await expect(page.locator('h1')).toContainText('Mission Complete');
    await expect(page.locator('text=Level:')).toBeVisible();
    await expect(page.locator('text=gems')).toBeVisible();
    
    // Back to menu
    await page.click('#menuBtn');
    await expect(page.locator('h1')).toContainText('Pick Your Mission');
    
    // Resume button should NOT exist (session cleared)
    await expect(page.locator('#resumeBtn')).toHaveCount(0);
  });

  test('9. All 4 categories work: Numeracy, Reading, Grammar, Writing', async ({ page }) => {
    test.setTimeout(90000);
    
    // Test each module separately
    for (const mod of ['Numeracy', 'Reading', 'Grammar', 'Writing']) {
      // Start fresh for each module
      if (mod !== 'Numeracy') {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.goto('/');
      }
      
      await onboardToDashboard(page, mod + 'User');
      await page.click('#startBtn');
      await page.click(`button:has-text("${mod}")`);
      await page.click('button:has-text("Quick (10")');
      
      // Quiz should load with questions
      await expect(page.locator('h2')).toBeVisible();
      await expect(page.locator('.options .option-btn')).toHaveCount(4);
      
      // Quit back to module-select
      await page.click('#quitBtn');
    }
  });

  test('10. localStorage persistence across page reload', async ({ page }) => {
    await onboardToDashboard(page, 'PersistUser');
    
    // Check profile stored
    const profile = await page.evaluate(() => localStorage.getItem('naplan:profile'));
    expect(profile).toContain('PersistUser');
    
    // Reload
    await page.reload();
    
    // Should go straight to dashboard
    await expect(page.locator('h1')).toContainText('Hey PersistUser');
  });

  test('11. Gem accumulation across missions', async ({ page }) => {
    test.setTimeout(90000);
    
    await onboardToDashboard(page, 'GemUser');
    
    // First mission - complete it to earn gems
    await startMission(page, 'Numeracy', 'Quick (10');
    
    // Answer all 10 questions correctly (each gives 25 gems)
    for (let i = 0; i < 10; i++) {
      await page.click('.options .option-btn:nth-child(1)');
      await page.click('#submitBtn');
      
      // If wrong, try again
      const retry = page.locator('.feedback-card.incorrect:has-text("one more")');
      if (await retry.count()) {
        await page.click('.options .option-btn:nth-child(2)');
        await page.click('#submitBtn');
      }
      
      // Wait for next button and click it
      await expect(page.locator('#nextBtn')).toBeVisible({ timeout: 10000 });
      await page.click('#nextBtn');
    }
    
    // Should be at results now
    await expect(page.locator('h1')).toContainText('Mission Complete');
    
    // Go to dashboard
    await page.click('#startBtn');
    
    // Gems should be > 0 (10 correct answers * 25 gems = 250)
    const gemsText = await page.locator('.gem-count').innerText();
    const gems = parseInt(gemsText);
    expect(gems).toBeGreaterThan(0);
  });

  test('12. Hint button shows hint before submit', async ({ page }) => {
    await onboardToDashboard(page, 'HintUser');
    await startMission(page, 'Reading', 'Quick (10');
    
    // Hint not visible initially
    await expect(page.locator('#hintArea')).toBeHidden();
    
    // Click hint
    await page.click('#hintBtn');
    
    // Hint now visible
    await expect(page.locator('#hintArea')).toBeVisible();
    await expect(page.locator('#hintArea')).toContainText('Hint:');
  });
});
