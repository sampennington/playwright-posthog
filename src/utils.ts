import { type CapturedEvent } from './symbols';

export function extractEventsFromBody(body: any, debug: boolean = false): CapturedEvent[] {
  if (!body) return [];

  if (debug) {
    console.log('[posthog-playwright] Parsing body:', JSON.stringify(body, null, 2));
  }

  const rawEvents = body.batch ?? body.data ?? (Array.isArray(body) ? body : [body]);
  const eventsArray = Array.isArray(rawEvents) ? rawEvents : [rawEvents];

  return eventsArray
    .filter((e: any) => e?.event)
    .map(normalizeEvent);
}

function normalizeEvent(rawEvent: any): CapturedEvent {
  return {
    event: rawEvent.event || 'unknown',
    properties: rawEvent.properties || {},
    timestamp: rawEvent.properties?.$time || Date.now(),
    distinct_id: rawEvent.properties?.distinct_id,
  };
}
