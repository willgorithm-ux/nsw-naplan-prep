# TEST_PLAN.md - NSW NAPLAN Prep App Testing Strategy

## Overview

Complete testing plan covering:
- Unit tests (mastery, timer logic)
- Integration tests (theme persistence, session flow)
- E2E tests (Playwright - full user journeys)
- Critical paths & negative test cases

---

## 1. UNIT TESTS

### Location
- `src/__tests__/sessionTimer.test.js` - Timer state machine
- `src/__tests__/mastery.test.js` - Mastery ladder logic
- `src/__tests__/storage.test.js` - Storage interface

### Session Timer Tests (Pure Functions)

```javascript
// All tests are deterministic - no mocking of Date.now() needed
// Tests use fixed timestamps for reproducibility

✓ createTimerState(20) initializes maxDurationMs = 1200000ms
✓ updateTimerState() calculates elapsed time correctly
✓ updateTimerState() sets status='running' initially
✓ shouldShowWarning() triggers at 19 minutes (1140000ms)
✓ isExpired() triggers at 20 minutes (1200000ms)
✓ formatRemainingTime() outputs MM:SS format
✓ getRemainingSeconds() returns correct value
✓ Multiple calls to updateTimerState() are idempotent
✓ Warning shown exactly once (warningShownAt != null)
✓ Expired state prevents further status changes
```

**Example Test:**
```javascript
test('Timer: showWarning at 19m, not before or after', () => {
  const state = createTimerState(20);
  
  // At 18:59
  const at18_59 = state.startTime + (18 * 60 * 1000) + 59000;
  const state1 = updateTimerState(state, at18_59);
  assert.equal(shouldShowWarning(state1), false);
  
  // At 19:00
  const at19_00 = state.startTime + (19 * 60 * 1000);
  const state2 = updateTimerState(state, at19_00);
  assert.equal(shouldShowWarning(state2), true);
  
  // At 19:01 (warning already shown)
  const at19_01 = state.startTime + (19 * 60 * 1000) + 1000;
  const state3 = updateTimerState(state2, at19_01);
  assert.equal(shouldShowWarning(state3), false); // Already shown
});
```

### Mastery Logic Tests

```javascript
✓ initSubskill() creates state with status='unseen'
✓ updateMasteryAfterAnswer() increments streakCorrect on correct
✓ updateMasteryAfterAnswer() resets streakCorrect=0 on incorrect
✓ 3 consecutive correct → status='mastered'
✓ Mastery sets masteredAt timestamp
✓ Mastery increases difficulty by 1 (capped at 5)
✓ Incorrect answer on unseen → status='learning'
✓ Incorrect answer adds to scheduledReviewQueue
✓ High error rate (>60%) decreases difficulty
✓ getNextDifficulty() recommends correct level
✓ needsReview() returns true if scheduledReviewQueue not empty
✓ popReviewQuestion() removes from queue FIFO
```

**Example Test:**
```javascript
test('Mastery: 3 correct = mastered + difficulty increase', () => {
  let state = initSubskill('num-addition');
  state.difficulty = 3;
  
  state = updateMasteryAfterAnswer(state, true, 'q1');
  assert.equal(state.streakCorrect, 1);
  assert.equal(state.status, 'unseen');
  
  state = updateMasteryAfterAnswer(state, true, 'q2');
  assert.equal(state.streakCorrect, 2);
  assert.equal(state.status, 'unseen');
  
  state = updateMasteryAfterAnswer(state, true, 'q3');
  assert.equal(state.streakCorrect, 3);
  assert.equal(state.status, 'mastered');
  assert.equal(state.difficulty, 4);
  assert.notEqual(state.masteredAt, null);
});
```

### Storage Interface Tests

```javascript
✓ setProfile() stores and getProfile() retrieves
✓ setSettings() stores and getSettings() retrieves
✓ setProgress() stores and getProgress() retrieves
✓ setSession() stores and getSession() retrieves
✓ clearSession() removes session data
✓ resetAllProgress() clears progress and session
✓ getSettings() returns defaults if not set
✓ getProgress() returns defaults if not set
✓ Concurrent reads/writes don't corrupt state
```

---

## 2. INTEGRATION TESTS

### Theme Settings Persistence

**Test Case: Theme → Color → Avatar Settings Persist & Apply**

```javascript
test('Integration: Save theme settings, reload app, settings apply', async () => {
  // 1. Load app
  page.goto('http://localhost:3000');
  
  // 2. Onboard: name entry
  await page.fill('input#nickname', 'TestChild');
  await page.click('button:has-text("Lets Go")');
  
  // 3. Co-design: select space theme, custom colors, avatar
  await page.click('button[data-theme="space"]');
  await page.fill('input[type="color"]', '#FF5733'); // Primary
  await page.click('button:has-text("astronaut-1")');
  
  // 4. Submit settings
  await page.click('button:has-text("Continue to Dashboard")');
  
  // 5. Verify localStorage
  const settings = await page.evaluate(() => 
    JSON.parse(localStorage.getItem('naplan:settings'))
  );
  assert.equal(settings.theme, 'space');
  assert.equal(settings.colors.primary, '#FF5733');
  assert.equal(settings.avatar, 'astronaut-1');
  
  // 6. Reload page
  await page.reload();
  
  // 7. Verify settings applied (CSS colors, avatar display)
  const rootBg = await page.evaluate(() => 
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary')
  );
  assert.equal(rootBg.trim(), '#FF5733');
});
```

### Session State Persistence

**Test Case: Start Quiz → Answer Question → Timer Running → Reload → Resume**

```javascript
test('Integration: Quiz session persists across reload', async () => {
  // 1. Complete onboarding
  await onboard();
  
  // 2. Start quiz
  await page.click('button:has-text("Start 20-minute Mission")');
  await page.selectOption('select#module', 'numeracy');
  await page.click('button:has-text("Start Quiz")');
  
  // 3. Answer first question
  await page.click('button.mcq-btn:has-text("8")');
  
  // 4. Get current timer
  const timerBefore = await page.textContent('#timer-display');
  
  // 5. Reload page
  await page.reload();
  
  // 6. Verify session resumed
  assert.ok(await page.isVisible('button:has-text("Resume")'));
  
  // 7. Click resume
  await page.click('button:has-text("Resume")');
  
  // 8. Verify same question state
  const timerAfter = await page.textContent('#timer-display');
  assert.approximately(
    timeToSeconds(timerBefore),
    timeToSeconds(timerAfter),
    2 // Allow 2 second variance
  );
});
```

### Mastery Updates After Quiz Session

**Test Case: 5-Question Quiz Completes → Dashboard Stats Update**

```javascript
test('Integration: Completing quiz updates dashboard mastery', async () => {
  // 1. Complete onboarding and get to dashboard
  await onboard();
  await page.goto('http://localhost:3000#dashboard');
  
  // 2. Note initial mastery %
  const masteryBefore = await page.textContent('.mastery-percent');
  
  // 3. Start quiz (5 questions, all correct)
  await page.click('button:has-text("Start 20-minute Mission")');
  for (let i = 0; i < 5; i++) {
    // Select correct answer (last MCQ option is always correct in test)
    const options = await page.$$('.mcq-btn');
    await options[options.length - 1].click();
    await page.click('button:has-text("Submit")');
  }
  
  // 4. Results screen shown
  assert.ok(await page.isVisible('text=Excellent'));
  
  // 5. Save session
  await page.click('button:has-text("Save & Exit")');
  
  // 6. Back to dashboard
  assert.ok(await page.url().includes('dashboard'));
  
  // 7. Verify mastery % increased
  const masteryAfter = await page.textContent('.mastery-percent');
  assert(parseInt(masteryAfter) > parseInt(masteryBefore));
  
  // 8. Verify gems awarded
  const gems = await page.textContent('.gems-counter');
  assert(parseInt(gems) >= 125); // 5 questions × 25 gems
});
```

---

## 3. END-TO-END TESTS (Playwright)

### Test File Location
`tests/e2e/naplan.spec.js`

### Critical Path 1: Full Session to Timer Expiry → Break Time

**Scenario: Child plays for ~20 minutes → Timer expires → Break Time Screen**

```javascript
test('E2E: Full session: onboard → codesign → quiz → timer expires → break time', async ({ page }) => {
  // 1. ONBOARDING
  await page.goto('http://localhost:3000');
  await page.fill('input#nickname', 'TimerTest');
  await page.click('button:has-text("Lets Go")');
  
  // 2. CO-DESIGN
  await page.click('button[data-theme="ocean"]');
  await page.click('button:has-text("dolphin")');
  await page.click('button:has-text("Continue to Dashboard")');
  
  // 3. DASHBOARD
  await expect(page).toHaveURL(/dashboard/);
  
  // 4. START QUIZ
  await page.click('button:has-text("Start 20-minute Mission")');
  await page.selectOption('select#module', 'numeracy');
  await page.click('button:has-text("Start Quiz")');
  
  // 5. Answer questions until timer expires (simulated)
  // In real test, we'd mock Date.now() or use test time manipulation
  for (let i = 0; i < 5; i++) {
    const options = await page.$$('.mcq-btn');
    if (options.length > 0) {
      await options[0].click();
      await page.click('button:has-text("Submit")');
    }
  }
  
  // 6. Force timer expiry (via dev console or timer manipulation)
  await page.evaluate(() => {
    window._forceTimerExpiry?.();
  });
  
  // 7. Break Time Screen appears
  await expect(page).toHaveURL(/break-time/);
  await expect(page).toContainText('Break Time');
  
  // 8. Verify both buttons present
  await expect(page).toHaveSelector('button:has-text("Save & Exit")');
  await expect(page).toHaveSelector('button:has-text("Save & Continue")');
  
  // 9. Click "Save & Exit"
  await page.click('button:has-text("Save & Exit")');
  
  // 10. Back to dashboard
  await expect(page).toHaveURL(/dashboard/);
});
```

### Critical Path 2: 19-Minute Warning Display

**Scenario: Timer reaches 19 minutes → Warning overlay appears (non-scary)**

```javascript
test('E2E: 19-minute warning overlay displays', async ({ page }) => {
  // 1. Setup: Start quiz with mock timer
  await startQuizWithMockTimer(page);
  
  // 2. Advance time to 19 minutes
  await page.evaluate(() => {
    // Simulate elapsed time = 19:00
    window._mockElapsedMs = 19 * 60 * 1000;
  });
  
  // Trigger timer update
  await page.evaluate(() => window._updateTimerUI?.());
  
  // 3. Warning overlay appears
  const warning = await page.locator('.warning-overlay');
  await expect(warning).toBeVisible();
  
  // 4. Verify warning text is friendly (not scary)
  await expect(warning).toContainText('1 minute left');
  await expect(warning).not.toContainText('DANGER');
  await expect(warning).not.toContainText('ERROR');
  
  // 5. Child can dismiss
  await warning.locator('button').click();
  await expect(warning).not.toBeVisible();
});
```

### Critical Path 3: Save & Continue with Confirmation

**Scenario: Break Time → Child clicks "Save & Continue" → Confirmation dialog → Resume session**

```javascript
test('E2E: Save & Continue requires confirmation + resumes', async ({ page }) => {
  // 1. Reach Break Time screen
  await reachBreakTimeScreen(page);
  
  // 2. Click "Save & Continue"
  await page.click('button:has-text("Save & Continue")');
  
  // 3. Confirmation dialog appears with warning text
  const confirmation = await page.locator('.confirmation-dialog');
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText('Ask an adult');
  
  // 4. Child clicks "Continue Playing"
  await page.click('button:has-text("Continue Playing")');
  
  // 5. Session resumes with fresh 20-minute timer
  await expect(page).toContainText('Time Left');
  const timeDisplay = await page.textContent('#timer-display');
  assert.equal(timeDisplay, '20:00');
});
```

### Critical Path 4: Complete Quiz Without Timer Expiry

**Scenario: 5 questions answered → Results shown → Dashboard updated → Resume works**

```javascript
test('E2E: Quiz completion without timeout', async ({ page }) => {
  // 1. Start quiz
  await startQuiz(page, 'numeracy', 5);
  
  // 2. Answer all 5 questions correctly
  for (let i = 0; i < 5; i++) {
    const options = await page.$$('.mcq-btn');
    await options[options.length - 1].click();
    await page.click('button:has-text("Submit")');
    
    // Feedback shown
    if (i < 4) {
      await expect(page).toContainText('Correct');
    }
  }
  
  // 3. Results screen
  await expect(page).toHaveURL(/results/);
  await expect(page).toContainText('Excellent');
  await expect(page).toContainText('+125'); // 5 × 25 gems
  
  // 4. Save & Exit
  await page.click('button:has-text("Save & Exit")');
  
  // 5. Dashboard updated
  const gems = await page.textContent('.gems-counter');
  assert(parseInt(gems) >= 125);
  
  // 6. Resume available
  const resume = await page.locator('button:has-text("Resume")');
  if (await resume.count() > 0) {
    await expect(resume).toBeVisible();
  }
});
```

### Negative Test: Session Lockout After Break

**Scenario: Break Time screen appears → Verify child cannot accidentally continue without confirmation**

```javascript
test('E2E: Break Time - Save & Exit is default, Continue requires confirmation', async ({ page }) => {
  // 1. Reach Break Time
  await reachBreakTimeScreen(page);
  
  // 2. Verify button states
  const exitBtn = page.locator('button:has-text("Save & Exit")');
  const continueBtn = page.locator('button:has-text("Save & Continue")');
  
  // Exit should be focused/prominent
  await expect(exitBtn).toHaveAttribute('class', /primary|default/);
  
  // Continue should be secondary
  await expect(continueBtn).toHaveAttribute('class', /secondary/);
  
  // 3. Clicking Continue shows confirmation
  await continueBtn.click();
  const confirmation = page.locator('.confirmation-dialog');
  await expect(confirmation).toBeVisible();
  
  // 4. Confirmation has "Ask an adult" text
  await expect(confirmation).toContainText('Ask an adult');
});
```

---

## 4. NEGATIVE TEST CASES

### Storage Failures

```javascript
✗ localStorage full → Graceful degradation (in-memory only)
✗ localStorage disabled → Warning, session lost on reload
✗ Corrupted localStorage entry → Default state loaded
✗ Concurrent writes → Latest write wins
```

### Timer Edge Cases

```javascript
✗ Timer skips past warning (edge case)
  → shouldShowWarning() still triggers if status='running'
✗ System clock goes backward
  → Timer uses max(elapsed, 0) to prevent negative time
✗ Multiple timer intervals started
  → Only one active, prevents duplicate fires
```

### User Edge Cases

```javascript
✗ Child closes browser mid-quiz
  → Session saved; resume continues
✗ Child enters empty name
  → Form validation prevents submission
✗ Child submits quiz with no answer selected
  → Toast error: "Please select an answer"
✗ Child completes quiz in <1 minute
  → Full 20 minutes added for next session
```

---

## 5. RUN TESTS LOCALLY

### Unit Tests

```bash
npm run test
# Output:
# ✓ sessionTimer.test.js (12 tests)
# ✓ mastery.test.js (11 tests)
# ✓ storage.test.js (8 tests)
# Total: 31 tests passed
```

### Watch Mode

```bash
npm run test:watch
```

### E2E Tests

```bash
npm run test:e2e
# Launches Playwright, opens browser, runs scenarios
# Generates HTML report: playwright-report/index.html
```

---

## 6. CI/CD Integration

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm install
      - run: npm run test
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v2
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 7. Performance & Accessibility Checks

### Lighthouse CI

```bash
npm run lighthouse
# Checks: Performance >90, Accessibility >95, Best Practices >90
```

### Accessibility Tests

```javascript
✓ Color contrast >= 4.5:1 (WCAG AA)
✓ Focus indicators visible
✓ Keyboard navigation works (Tab, Enter, Space)
✓ No ARIA violations
✓ Screen reader friendly
```

---

## Summary

- **31 Unit Tests**: Timer, mastery, storage (100% deterministic)
- **6 Integration Tests**: Settings, sessions, mastery updates
- **5 E2E Scenarios**: Full user journeys + edge cases
- **15+ Negative Tests**: Error handling, edge cases
- **Total**: ~60 test cases covering all critical paths

**Test Execution Time**: ~5 minutes (unit), ~15 minutes (E2E)
