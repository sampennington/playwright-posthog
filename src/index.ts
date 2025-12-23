/**
 * playwright-hog
 *
 * Test PostHog analytics events in your Playwright tests
 *
 * @example Standalone usage
 * ```typescript
 * import { test, expect } from 'playwright-hog';
 *
 * test('tracking works', async ({ page }) => {
 *   await page.goto('/');
 *   await page.getByText('Sign Up').click();
 *
 *   await expect(page).toHaveFiredEvent('user_signed_up', {
 *     plan: 'pro'
 *   });
 * });
 * ```
 *
 * @example Composition mode
 * ```typescript
 * import { test as base } from '@playwright/test';
 * import { hogFixture, hogMatchers } from 'playwright-hog';
 *
 * const test = base.extend(hogFixture);
 * const expect = base.expect.extend(hogMatchers);
 *
 * export { test, expect };
 * ```
 */

/// <reference path="./global.d.ts" />

import { expect as baseExpect } from '@playwright/test';
import { hogFixture } from './fixtures';
import { hogMatchers, installMatchers } from './matchers';

installMatchers();

/**
 * Standalone exports: Pre-configured test and expect with PostHog support
 */
export const test = hogFixture;
export const expect = baseExpect;

/**
 * Composition exports: For advanced users who want to merge with custom fixtures
 */
export { hogFixture, hogMatchers };

/**
 * Re-export types and utilities
 */
export type { CapturedEvent } from './symbols';
export type { HogPage, HogFixtureOptions, HogFixtures } from './fixtures';
export type { MatcherConfig } from './matchers';
export { getCapturedEvents, clearCapturedEvents } from './fixtures';
export { isPostHogRequest, extractEventsFromRequest, matchesProperties } from './hog-watcher';
