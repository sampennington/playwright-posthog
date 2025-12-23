import { test as base, type Page, type Route, type Request } from '@playwright/test';
import { kHogEvents, kHogDebug, type CapturedEvent } from './symbols';
import { isPostHogRequest, extractEventsFromRequest } from './hog-watcher';

/**
 * Extended Page type that includes the internal storage symbols
 */
export type HogPage = Page & {
  [kHogEvents]: CapturedEvent[];
  [kHogDebug]: boolean;
};

export interface HogFixtureOptions {
  /**
   * Enable debug logging to console
   * @default false
   */
  hogDebug: boolean;
}

export type HogFixtures = {
  hogDebug: boolean;
  page: HogPage;
};

/**
 * Playwright fixture that automatically intercepts PostHog requests
 * and stores captured events on the page object using symbols.
 */
export const hogFixture = base.extend<HogFixtures>({
  hogDebug: [false, { option: true }],

  page: async ({ page: originalPage, hogDebug }, use: (page: HogPage) => Promise<void>) => {
    const hogPage = originalPage as HogPage;

    hogPage[kHogEvents] = [];
    hogPage[kHogDebug] = hogDebug;

    if (hogDebug) {
      console.log('[playwright-hog] Initializing PostHog event capture');
    }

    await hogPage.route('**/*', async (route: Route, request: Request) => {
      const url = request.url();

      if (isPostHogRequest(url)) {
        if (hogDebug) {
          console.log(`[playwright-hog] Intercepted PostHog request: ${url}`);
        }

        const events = await extractEventsFromRequest(request, hogDebug);

        hogPage[kHogEvents].push(...events);

        if (hogDebug && events.length > 0) {
          console.log(`[playwright-hog] Total events captured: ${hogPage[kHogEvents].length}`);
          console.log(`[playwright-hog] Latest events:`, events.map((e: CapturedEvent) => ({
            event: e.event,
            properties: e.properties,
          })));
        }
      }

      await route.continue();
    });

    await use(hogPage);

    if (hogDebug) {
      console.log(`[playwright-hog] Test complete. Total events captured: ${hogPage[kHogEvents].length}`);
    }
  },
});

export function getCapturedEvents(page: Page): CapturedEvent[] {
  const hogPage = page as HogPage;
  return hogPage[kHogEvents] || [];
}

export function clearCapturedEvents(page: Page): void {
  const hogPage = page as HogPage;
  if (hogPage[kHogEvents]) {
    hogPage[kHogEvents] = [];
  }
}
