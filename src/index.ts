import { gunzipSync } from 'zlib';
import { kHogEvents, isDebugEnabled, type CapturedEvent } from './symbols';
import { extractEventsFromBody } from './utils';
import type { Page, TestType, Route } from '@playwright/test';

export { matchers } from './matchers';

export type HogPage = Page & {
  [kHogEvents]: CapturedEvent[];
};

const posthogIngestPattern = /posthog\.com\/(e|capture|batch|s)(\/|$|\?)/;

export function withPostHogTracking<T extends TestType<any, any>>(test: T): T {
  return test.extend({
    page: async ({ page: originalPage }: { page: Page }, use: (page: HogPage) => Promise<void>) => {
      const hogPage = originalPage as HogPage;
      const debug = isDebugEnabled();

      hogPage[kHogEvents] = [];


      await hogPage.route(posthogIngestPattern, async (route: Route) => {
        const request = route.request();
        const url = request.url();
        const postDataBuffer = request.postDataBuffer();

        if (debug) {
          console.log(`[posthog-playwright] Intercepted: ${url}`);
        }

        if (postDataBuffer) {
          try {
            const decompressed = gunzipSync(postDataBuffer).toString('utf-8');
            const body = JSON.parse(decompressed);

            const events = extractEventsFromBody(body, debug);
            hogPage[kHogEvents].push(...events);

            if (debug && events.length > 0) {
              console.log(`[posthog-playwright] Captured ${events.length} event(s)`);
            }
          } catch {
            // Not gzip/JSON - ignore
          }
        }

        await route.continue();
      });

      await use(hogPage);

      if (debug) {
        console.log(`[posthog-playwright] Test complete. Total: ${hogPage[kHogEvents].length} event(s)`);
      }
    },
  }) as T;
}

export function getCapturedEvents(page: Page): CapturedEvent[] {
  return (page as HogPage)[kHogEvents] || [];
}

export function clearCapturedEvents(page: Page): void {
  const hogPage = page as HogPage;
  if (hogPage[kHogEvents]) {
    hogPage[kHogEvents] = [];
  }
}

export type { CapturedEvent } from './symbols';
export type { MatcherConfig } from './matchers';
export { extractEventsFromBody } from './utils';
