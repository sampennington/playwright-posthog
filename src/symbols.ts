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
 * Symbol key for storing debug configuration.
 */
export const kHogDebug = Symbol('hog:debug');

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
