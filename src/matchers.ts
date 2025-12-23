import { expect, type Page } from '@playwright/test';
import { kHogEvents, isDebugEnabled, type CapturedEvent } from './symbols';
import { matchesProperties } from './hog-watcher';

type HogPage = Page & {
  [kHogEvents]: CapturedEvent[];
};

/**
 * Configuration for the matcher polling behavior
 */
export interface MatcherConfig {
  /**
   * Maximum time to wait for the event (in milliseconds)
   * @default 2000
   */
  timeout?: number;

  /**
   * Interval between polling attempts (in milliseconds)
   * @default 100
   */
  pollInterval?: number;
}

const DEFAULT_CONFIG: Required<MatcherConfig> = {
  timeout: 2000,
  pollInterval: 100,
};

/**
 * Custom matcher: toHaveFiredEvent
 *
 * Checks if a PostHog event with the given name and properties was captured.
 * Uses async polling to account for the asynchronous nature of analytics.
 *
 * @param page - The Playwright page object
 * @param eventName - The name of the event to check for
 * @param expectedProperties - Optional properties to match (subset matching)
 * @param config - Optional configuration for timeout and polling
 */
async function toHaveFiredEvent(
  page: Page,
  eventName: string,
  expectedProperties?: Record<string, any>,
  config?: MatcherConfig
): Promise<{ pass: boolean; message: () => string }> {
  const hogPage = page as HogPage;
  const { timeout, pollInterval } = { ...DEFAULT_CONFIG, ...config };
  const debug = isDebugEnabled();

  const startTime = Date.now();
  let foundEvent: CapturedEvent | undefined;

  if (debug) {
    console.log(`[playwright-posthog] Checking for event: "${eventName}"`,
      expectedProperties ? `with properties: ${JSON.stringify(expectedProperties)}` : '');
  }

  while (Date.now() - startTime < timeout) {
    const events = hogPage[kHogEvents] || [];

    foundEvent = events.find((event: CapturedEvent) => {
      const nameMatches = event.event === eventName;
      const propsMatch = matchesProperties(event.properties, expectedProperties);
      return nameMatches && propsMatch;
    });

    if (foundEvent) {
      if (debug) {
        console.log(`[playwright-posthog] ✓ Event found after ${Date.now() - startTime}ms`);
      }
      break;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  const pass = !!foundEvent;

  const message = () => {
    if (pass) {
      return `Expected page NOT to have fired event "${eventName}"${
        expectedProperties ? ` with properties ${JSON.stringify(expectedProperties)}` : ''
      }, but it did.`;
    } else {
      const events = hogPage[kHogEvents] || [];
      const eventNames = events.map((e: CapturedEvent) => e.event);
      const matchingNameEvents = events.filter((e: CapturedEvent) => e.event === eventName);

      let msg = `Expected page to have fired event "${eventName}"${
        expectedProperties ? ` with properties ${JSON.stringify(expectedProperties)}` : ''
      }, but it did not.\n\n`;

      msg += `Waited ${timeout}ms and captured ${events.length} total event(s).\n\n`;

      if (events.length === 0) {
        msg += 'No PostHog events were captured at all. Possible reasons:\n';
        msg += '  • PostHog is not initialized on the page\n';
        msg += '  • The event is sent to a different endpoint\n';
        msg += '  • Network interception is not working\n';
      } else if (matchingNameEvents.length > 0) {
        msg += `Found ${matchingNameEvents.length} event(s) with name "${eventName}" but properties didn't match:\n\n`;
        matchingNameEvents.forEach((event: CapturedEvent, index: number) => {
          msg += `  Event ${index + 1}: ${JSON.stringify(event.properties, null, 2)}\n`;
        });
        msg += `\nExpected properties: ${JSON.stringify(expectedProperties, null, 2)}\n`;
      } else {
        msg += `Event names captured: [${eventNames.join(', ')}]\n\n`;
        msg += 'The event name did not match any captured events.\n';
      }

      return msg;
    }
  };

  return { pass, message };
}

async function notToHaveFiredEvent(
  page: Page,
  eventName: string,
  expectedProperties?: Record<string, any>,
  config?: MatcherConfig
): Promise<{ pass: boolean; message: () => string }> {
  const result = await toHaveFiredEvent(page, eventName, expectedProperties, config);

  return {
    pass: !result.pass,
    message: result.message,
  };
}

function toHaveCapturedEvents(
  page: Page,
  count?: number
): { pass: boolean; message: () => string } {
  const hogPage = page as HogPage;
  const events = hogPage[kHogEvents] || [];
  const actualCount = events.length;

  const pass = count === undefined ? actualCount > 0 : actualCount === count;

  const message = () => {
    if (count === undefined) {
      return pass
        ? `Expected page NOT to have captured any events, but captured ${actualCount}.`
        : `Expected page to have captured events, but none were captured.`;
    } else {
      return pass
        ? `Expected page NOT to have captured ${count} event(s), but it did.`
        : `Expected page to have captured ${count} event(s), but captured ${actualCount}.\n\nEvents: ${events.map((e: CapturedEvent) => e.event).join(', ')}`;
    }
  };

  return { pass, message };
}

/**
 * Export matchers object for composition mode
 */
export const hogMatchers = {
  toHaveFiredEvent,
  notToHaveFiredEvent,
  toHaveCapturedEvents,
};

export function installMatchers(): void {
  expect.extend(hogMatchers);
}
