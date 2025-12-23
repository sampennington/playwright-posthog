/**
 * Example test file demonstrating playwright-hog usage
 *
 * This file shows various patterns for testing PostHog analytics
 * events in your Playwright tests.
 */

import { test, expect } from 'playwright-hog';

test.describe('PostHog Analytics Tracking', () => {
  test('basic event tracking', async ({ page }) => {
    // Navigate to your app
    await page.goto('https://example.com');

    // Perform an action that triggers an event
    await page.getByText('Sign Up').click();

    // Assert the event was fired
    await expect(page).toHaveFiredEvent('signup_clicked');
  });

  test('event with properties', async ({ page }) => {
    await page.goto('https://example.com/pricing');

    // Click on a plan
    await page.getByTestId('plan-pro').click();

    // Assert event with specific properties
    await expect(page).toHaveFiredEvent('plan_selected', {
      plan: 'pro',
      price: 99.99,
    });
  });

  test('multiple events in sequence', async ({ page }) => {
    await page.goto('https://example.com/product/123');

    // First event
    await expect(page).toHaveFiredEvent('product_viewed', {
      product_id: '123',
    });

    // Trigger another event
    await page.getByText('Add to Cart').click();

    // Second event
    await expect(page).toHaveFiredEvent('add_to_cart', {
      product_id: '123',
    });

    // Third event
    await page.getByText('Checkout').click();
    await expect(page).toHaveFiredEvent('checkout_started');
  });

  test('negative assertion - event should NOT fire', async ({ page }) => {
    await page.goto('https://example.com');

    // Navigate around but don't trigger error
    await page.getByText('About').click();

    // Assert error event was NOT fired
    await expect(page).notToHaveFiredEvent('error_occurred');
  });

  test('custom timeout for slow events', async ({ page }) => {
    await page.goto('https://example.com');

    // Some events might take longer to fire
    await page.getByText('Submit').click();

    // Wait up to 5 seconds for this event
    await expect(page).toHaveFiredEvent(
      'form_submitted',
      { form_type: 'contact' },
      { timeout: 5000 }
    );
  });

  test('partial property matching', async ({ page }) => {
    await page.goto('https://example.com/settings');

    await page.getByLabel('Theme').selectOption('dark');
    await page.getByText('Save').click();

    // Only check specific properties, ignore others
    await expect(page).toHaveFiredEvent('settings_updated', {
      theme: 'dark',
      // Other properties in the actual event are ignored
    });
  });

  test('checking event count', async ({ page }) => {
    await page.goto('https://example.com');

    // Assert that at least some events were captured
    await expect(page).toHaveCapturedEvents();

    // Or assert exact count
    await expect(page).toHaveCapturedEvents(3);
  });
});

test.describe('Debug Mode Examples', () => {
  // Enable debug mode for this test
  test.use({ hogDebug: true });

  test('debug captured events', async ({ page }) => {
    // With debug mode on, you'll see console logs of all captured events
    await page.goto('https://example.com');
    await page.getByText('Sign Up').click();

    // Check the console output to see what events were captured
    await expect(page).toHaveFiredEvent('signup_clicked');
  });
});

test.describe('Advanced Usage', () => {
  test('using utility functions', async ({ page }) => {
    const { getCapturedEvents, clearCapturedEvents } = await import('playwright-hog');

    await page.goto('https://example.com/step1');

    // Get all captured events so far
    let events = getCapturedEvents(page);
    console.log('Step 1 events:', events);

    // Clear events before next step
    clearCapturedEvents(page);

    await page.goto('https://example.com/step2');

    // Now only events from step2 are captured
    events = getCapturedEvents(page);
    console.log('Step 2 events:', events);

    await expect(page).toHaveFiredEvent('step2_viewed');
  });

  test('complex property matching', async ({ page }) => {
    await page.goto('https://example.com/checkout');

    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=card]', '4242424242424242');
    await page.getByText('Pay').click();

    // Match nested properties
    await expect(page).toHaveFiredEvent('payment_submitted', {
      email: 'user@example.com',
      payment_method: 'card',
      // You can match nested objects too
      metadata: {
        source: 'web',
      },
    });
  });
});
