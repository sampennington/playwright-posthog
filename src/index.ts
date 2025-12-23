/**
 * playwright-posthog
 *
 * Test PostHog analytics events in your Playwright tests
 *
 * @example
 * ```typescript
 * // fixtures.ts
 * import { test as base, expect as baseExpect } from '@playwright/test';
 * import { withPostHogTracking, matchers } from 'playwright-posthog';
 *
 * export const test = withPostHogTracking(base);
 * export const expect = baseExpect.extend(matchers);
 * ```
 *
 * @example
 * ```typescript
 * // my-test.spec.ts
 * import { test, expect } from './fixtures';
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
 */

/// <reference path="./global.d.ts" />

import { kHogEvents, isDebugEnabled, type CapturedEvent } from './symbols';
import { isPostHogRequest, extractEventsFromRequest } from './hog-watcher';
import type { Page, Route, Request, TestType } from '@playwright/test';

export { matchers } from './matchers';

/**
 * Extended Page type that includes the internal storage symbols
 */
export type HogPage = Page & {
  [kHogEvents]: CapturedEvent[];
};

/**
 * Extends any Playwright test instance with PostHog event tracking.
 * This allows you to compose with your existing custom fixtures.
 *
 * @param test - Your Playwright test instance (can be base or already extended)
 * @returns Extended test instance with PostHog tracking on the page fixture
 *
 * @example
 * ```typescript
 * import { test as base } from '@playwright/test';
 * import { withPostHogTracking } from 'playwright-posthog';
 *
 * export const test = withPostHogTracking(base);
 * ```
 */
export function withPostHogTracking<T extends TestType<any, any>>(test: T): T {
  return test.extend({
    page: async ({ page: originalPage }: { page: Page }, use: (page: HogPage) => Promise<void>) => {
      const hogPage = originalPage as HogPage;
      const debug = isDebugEnabled();

      hogPage[kHogEvents] = [];

      if (debug) {
        console.log('[playwright-posthog] Initializing PostHog event capture');
      }

      await hogPage.route('**/*', async (route: Route, request: Request) => {
        const url = request.url();

        if (isPostHogRequest(url)) {
          if (debug) {
            console.log(`[playwright-posthog] Intercepted PostHog request: ${url}`);
          }

          const events = await extractEventsFromRequest(request);

          hogPage[kHogEvents].push(...events);

          if (debug && events.length > 0) {
            console.log(`[playwright-posthog] Total events captured: ${hogPage[kHogEvents].length}`);
            console.log(`[playwright-posthog] Latest events:`, events.map((e: CapturedEvent) => ({
              event: e.event,
              properties: e.properties,
            })));
          }
        }

        await route.continue();
      });

      await use(hogPage);

      if (debug) {
        console.log(`[playwright-posthog] Test complete. Total events captured: ${hogPage[kHogEvents].length}`);
      }
    },
  }) as T;
}

/**
 * Get all captured PostHog events from the page
 */
export function getCapturedEvents(page: Page): CapturedEvent[] {
  const hogPage = page as HogPage;
  return hogPage[kHogEvents] || [];
}

/**
 * Clear all captured PostHog events from the page
 */
export function clearCapturedEvents(page: Page): void {
  const hogPage = page as HogPage;
  if (hogPage[kHogEvents]) {
    hogPage[kHogEvents] = [];
  }
}

/**
 * Re-export types and utilities
 */
export type { CapturedEvent } from './symbols';
export type { MatcherConfig } from './matchers';
export { isPostHogRequest, extractEventsFromRequest, matchesProperties } from './hog-watcher';
