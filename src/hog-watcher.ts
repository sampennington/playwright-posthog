import type { Request } from '@playwright/test';
import { isDebugEnabled, type CapturedEvent } from './symbols';

/**
 * Determines if a URL is a PostHog analytics endpoint.
 * Common PostHog endpoints: /e/, /capture/, /batch/, /decide/, /s/
 */
export function isPostHogRequest(url: string): boolean {
  return (
    url.includes('/e/') ||
    url.includes('/capture') ||
    url.includes('/batch') ||
    url.includes('/s/')
  );
}

/**
 * Extracts and normalizes PostHog events from a request.
 * Handles multiple formats:
 * - Single event object
 * - Batch array of events
 * - Nested batch structures
 * - Base64 encoded payloads (if needed)
 */
export async function extractEventsFromRequest(
  request: Request
): Promise<CapturedEvent[]> {
  const events: CapturedEvent[] = [];
  const debug = isDebugEnabled();

  try {
    const body = request.postDataJSON();

    if (!body) {
      if (debug) {
        console.log('[playwright-posthog] No POST data found in request');
      }
      return events;
    }

    if (debug) {
      console.log('[playwright-posthog] Request body:', JSON.stringify(body, null, 2));
    }

    if (body.batch && Array.isArray(body.batch)) {
      for (const event of body.batch) {
        events.push(normalizeEvent(event));
      }
    } else if (Array.isArray(body)) {
      for (const event of body) {
        events.push(normalizeEvent(event));
      }
    } else if (body.event || body.e) {
      events.push(normalizeEvent(body));
    } else if (body.data) {
      if (Array.isArray(body.data)) {
        for (const event of body.data) {
          events.push(normalizeEvent(event));
        }
      } else {
        events.push(normalizeEvent(body.data));
      }
    }

    if (debug && events.length > 0) {
      console.log(`[playwright-posthog] Extracted ${events.length} event(s):`,
        events.map((e: CapturedEvent) => e.event).join(', '));
    }
  } catch (error) {
    if (debug) {
      console.error('[playwright-posthog] Error parsing PostHog request:', error);
    }
  }

  return events;
}

/**
 * Normalizes an event object to a consistent structure.
 * PostHog events can have different field names (event vs e, properties vs p)
 */
function normalizeEvent(rawEvent: any): CapturedEvent {
  const event: CapturedEvent = {
    event: rawEvent.event || rawEvent.e || 'unknown',
    properties: rawEvent.properties || rawEvent.p || {},
    timestamp: rawEvent.timestamp || rawEvent.ts || Date.now(),
    distinct_id: rawEvent.distinct_id || rawEvent.d,
  };

  for (const [key, value] of Object.entries(rawEvent)) {
    if (!['event', 'e', 'properties', 'p', 'timestamp', 'ts', 'distinct_id', 'd'].includes(key)) {
      event[key] = value;
    }
  }

  return event;
}

/**
 * Checks if event properties match expected properties (subset matching)
 */
export function matchesProperties(
  actual: Record<string, any> | undefined,
  expected: Record<string, any> | undefined
): boolean {
  if (!expected || Object.keys(expected).length === 0) {
    return true;
  }

  if (!actual) {
    return false;
  }

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = actual[key];

    if (!deepEqual(actualValue, expectedValue)) {
      return false;
    }
  }

  return true;
}

/**
 * Deep equality check with support for nested objects and arrays
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => deepEqual(val, b[index]));
  }

  if (Array.isArray(a) || Array.isArray(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  return keysA.every(key => deepEqual(a[key], b[key]));
}
