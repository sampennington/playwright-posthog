/**
 * Type declarations for playwright-hog custom matchers
 *
 * This file extends Playwright's expect API to include PostHog-specific matchers.
 */

import type { Page } from '@playwright/test';
import type { MatcherConfig } from '../src/matchers';

declare global {
  namespace PlaywrightTest {
    interface Matchers<R, T = unknown> {
      /**
       * Assert that a PostHog event was fired with the given name and optional properties.
       *
       * This matcher polls for up to 2 seconds (configurable) to account for the
       * asynchronous nature of analytics events.
       *
       * @param eventName - The name of the event to check for
       * @param expectedProperties - Optional properties to match (subset matching)
       * @param config - Optional configuration for timeout and polling interval
       *
       * @example
       * ```typescript
       * await expect(page).toHaveFiredEvent('user_signed_up');
       * await expect(page).toHaveFiredEvent('purchase_completed', {
       *   plan: 'pro',
       *   amount: 99.99
       * });
       * await expect(page).toHaveFiredEvent('custom_event', {}, {
       *   timeout: 5000,
       *   pollInterval: 200
       * });
       * ```
       */
      toHaveFiredEvent(
        eventName: string,
        expectedProperties?: Record<string, any>,
        config?: MatcherConfig
      ): Promise<R>;

      /**
       * Assert that a PostHog event was NOT fired with the given name and optional properties.
       *
       * @param eventName - The name of the event to check for
       * @param expectedProperties - Optional properties to match (subset matching)
       * @param config - Optional configuration for timeout and polling interval
       *
       * @example
       * ```typescript
       * await expect(page).notToHaveFiredEvent('error_occurred');
       * ```
       */
      notToHaveFiredEvent(
        eventName: string,
        expectedProperties?: Record<string, any>,
        config?: MatcherConfig
      ): Promise<R>;

      /**
       * Assert that the page has captured a specific number of events (or any events if count is not provided).
       *
       * @param count - Optional number of events to check for
       *
       * @example
       * ```typescript
       * await expect(page).toHaveCapturedEvents(); // At least one event
       * await expect(page).toHaveCapturedEvents(5); // Exactly 5 events
       * ```
       */
      toHaveCapturedEvents(count?: number): R;
    }
  }
}

// This export is necessary to make this a module
export {};
