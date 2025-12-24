import type { Page } from '@playwright/test';
import { kHogEvents, isDebugEnabled, type CapturedEvent } from './symbols';
import isMatch from 'lodash.ismatch';

type HogPage = Page & {
  [kHogEvents]: CapturedEvent[];
};

export interface MatcherConfig {
  timeout?: number;
  pollInterval?: number;
}

const DEFAULT_CONFIG: Required<MatcherConfig> = {
  timeout: 2000,
  pollInterval: 100,
};

function formatProps(props?: Record<string, any>): string {
  return props ? ` with properties ${JSON.stringify(props)}` : '';
}

function formatEventList(events: CapturedEvent[]): string {
  return events.map(e => e.event).join(', ');
}

function buildFailureMessage(
  eventName: string,
  expectedProperties: Record<string, any> | undefined,
  timeout: number,
  events: CapturedEvent[]
): string {
  const lines: string[] = [
    `Expected page to have fired event "${eventName}"${formatProps(expectedProperties)}, but it did not.`,
    '',
    `Waited ${timeout}ms and captured ${events.length} total event(s).`,
    '',
  ];

  if (events.length === 0) {
    lines.push(
      'No PostHog events were captured at all. Possible reasons:',
      '  • PostHog is not initialized on the page',
      '  • The event is sent to a different endpoint',
      '  • Network interception is not working'
    );
  } else {
    const matchingEvents = events.filter(e => e.event === eventName);

    if (matchingEvents.length > 0) {
      lines.push(
        `Found ${matchingEvents.length} event(s) named "${eventName}" but properties didn't match:`,
        ''
      );
      matchingEvents.forEach((event, i) => {
        lines.push(`  Event ${i + 1}: ${JSON.stringify(event.properties, null, 2)}`);
      });
      lines.push('', `Expected: ${JSON.stringify(expectedProperties, null, 2)}`);
    } else {
      lines.push(
        `Events captured: [${formatEventList(events)}]`,
        '',
        'The event name did not match any captured events.'
      );
    }
  }

  return lines.join('\n');
}

async function toHaveFiredEvent(
  page: Page,
  eventName: string,
  expectedProperties?: Record<string, any>,
  config?: MatcherConfig
): Promise<{ pass: boolean; message: () => string }> {
  const hogPage = page as HogPage;
  const { timeout, pollInterval } = { ...DEFAULT_CONFIG, ...config };
  const debug = isDebugEnabled();

  if (debug) {
    console.log(`[posthog-playwright] Looking for: "${eventName}"${formatProps(expectedProperties)}`);
  }

  const startTime = Date.now();
  let foundEvent: CapturedEvent | undefined;
  const propsToMatch = expectedProperties || {};

  while (Date.now() - startTime < timeout) {
    const events = hogPage[kHogEvents] || [];

    foundEvent = events.find((event: CapturedEvent) => {
      return event.event === eventName && isMatch(event.properties || {}, propsToMatch);
    });

    if (foundEvent) {
      if (debug) {
        console.log(`[posthog-playwright] ✓ Found after ${Date.now() - startTime}ms`);
      }
      break;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  const pass = !!foundEvent;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected page NOT to have fired event "${eventName}"${formatProps(expectedProperties)}, but it did.`;
      }
      return buildFailureMessage(eventName, expectedProperties, timeout, hogPage[kHogEvents] || []);
    },
  };
}

async function notToHaveFiredEvent(
  page: Page,
  eventName: string,
  expectedProperties?: Record<string, any>,
  config?: MatcherConfig
): Promise<{ pass: boolean; message: () => string }> {
  const result = await toHaveFiredEvent(page, eventName, expectedProperties, config);
  return { pass: !result.pass, message: result.message };
}

function toHaveCapturedEvents(
  page: Page,
  count?: number
): { pass: boolean; message: () => string } {
  const events = (page as HogPage)[kHogEvents] || [];
  const actual = events.length;
  const pass = count === undefined ? actual > 0 : actual === count;

  return {
    pass,
    message: () => {
      if (count === undefined) {
        return pass
          ? `Expected no events, but captured ${actual}.`
          : `Expected events, but none were captured.`;
      }
      return pass
        ? `Expected NOT to capture ${count} event(s), but did.`
        : `Expected ${count} event(s), got ${actual}. Events: [${formatEventList(events)}]`;
    },
  };
}

export const matchers = {
  toHaveFiredEvent,
  notToHaveFiredEvent,
  toHaveCapturedEvents,
};
