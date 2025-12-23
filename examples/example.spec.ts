/**
 * Example test file demonstrating playwright-posthog usage
 *
 * This file shows various patterns for testing PostHog analytics
 * events in your Playwright tests.
 */

import { test as base, expect as baseExpect } from '@playwright/test';
import { withPostHogTracking, hogMatchers } from 'playwright-posthog';

// Setup: extend your test with PostHog tracking
const test = withPostHogTracking(base);
const expect = baseExpect.extend(hogMatchers);

test.describe('PostHog Analytics Tracking', () => {
  test('basic event tracking', async ({ page }) => {
    await page.goto('https://example.com');

    await page.getByText('Sign Up').click();

    await expect(page).toHaveFiredEvent('signup_clicked');
  });

  test('event with properties', async ({ page }) => {
    await page.goto('https://example.com/pricing');

    await page.getByTestId('plan-pro').click();

    await expect(page).toHaveFiredEvent('plan_selected', {
      plan: 'pro',
      price: 99.99,
    });
  });

  test('multiple events in sequence', async ({ page }) => {
    await page.goto('https://example.com/product/123');

    await expect(page).toHaveFiredEvent('product_viewed', {
      product_id: '123',
    });

    await page.getByText('Add to Cart').click();

    await expect(page).toHaveFiredEvent('add_to_cart', {
      product_id: '123',
    });

    await page.getByText('Checkout').click();
    await expect(page).toHaveFiredEvent('checkout_started');
  });

  test('negative assertion - event should NOT fire', async ({ page }) => {
    await page.goto('https://example.com');

    await page.getByText('About').click();

    await expect(page).notToHaveFiredEvent('error_occurred');
  });

  test('custom timeout for slow events', async ({ page }) => {
    await page.goto('https://example.com');

    await page.getByText('Submit').click();

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

    await expect(page).toHaveFiredEvent('settings_updated', {
      theme: 'dark',
    });
  });

  test('checking event count', async ({ page }) => {
    await page.goto('https://example.com');

    await expect(page).toHaveCapturedEvents();

    await expect(page).toHaveCapturedEvents(3);
  });
});

test.describe('Advanced Usage', () => {
  test('using utility functions', async ({ page }) => {
    const { getCapturedEvents, clearCapturedEvents } = await import('playwright-posthog');

    await page.goto('https://example.com/step1');

    let events = getCapturedEvents(page);
    console.log('Step 1 events:', events);

    clearCapturedEvents(page);

    await page.goto('https://example.com/step2');

    events = getCapturedEvents(page);
    console.log('Step 2 events:', events);

    await expect(page).toHaveFiredEvent('step2_viewed');
  });

  test('complex property matching', async ({ page }) => {
    await page.goto('https://example.com/checkout');

    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=card]', '4242424242424242');
    await page.getByText('Pay').click();

    await expect(page).toHaveFiredEvent('payment_submitted', {
      email: 'user@example.com',
      payment_method: 'card',
      metadata: {
        source: 'web',
      },
    });
  });
});
