/**
 * Internal symbols used to store PostHog event data on the Page object.
 * Using symbols prevents pollution of the public API surface.
 */

/**
 * Symbol key for storing captured PostHog events on the page object.
 * This array contains all events captured during the test.
 */
export const kHogEvents = Symbol('hog:events');

/**
 * Check if debug mode is enabled via environment variable.
 * Supports: DEBUG=true, DEBUG=1, DEBUG=posthog-playwright
 */
export function isDebugEnabled(): boolean {
  const debug = process.env.DEBUG;
  return debug === 'true' || debug === '1' || debug === 'posthog-playwright';
}

/**
 * Type definition for the captured event structure
 */
export interface CapturedEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: string | number;
  distinct_id?: string;
  [key: string]: any;
}
