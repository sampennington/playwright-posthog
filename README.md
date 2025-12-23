# playwright-posthog

Test PostHog analytics events in your Playwright tests with ease.

## Features

- **Extends Playwright**: Works with your existing test setup
- **Type-Safe**: Full TypeScript support with autocomplete
- **Async Polling**: Waits for analytics events (they're async by nature)
- **Subset Matching**: Test specific event properties without exact matches
- **Debug Mode**: Set `DEBUG=true` to see captured events

## Installation

```bash
npm install --save-dev playwright-posthog
# or
yarn add --dev playwright-posthog
# or
pnpm add --save-dev playwright-posthog
```

## Setup

Extend your Playwright test with PostHog tracking:

```typescript
// fixtures.ts
import { test as base, expect as baseExpect } from '@playwright/test';
import { withPostHogTracking, hogMatchers } from 'playwright-posthog';

export const test = withPostHogTracking(base);
export const expect = baseExpect.extend(hogMatchers);
```

Then use in your tests:

```typescript
// my-test.spec.ts
import { test, expect } from './fixtures';

test('user signup tracking works', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByText('Sign Up').click();

  await expect(page).toHaveFiredEvent('user_signed_up', {
    plan: 'pro',
    source: 'web'
  });
});
```

## API Reference

### `withPostHogTracking(test)`

Extends a Playwright test instance with PostHog event tracking on the `page` fixture.

```typescript
import { test as base } from '@playwright/test';
import { withPostHogTracking } from 'playwright-posthog';

export const test = withPostHogTracking(base);
```

Works with already-extended tests too:

```typescript
import { test as base } from '@playwright/test';
import { withPostHogTracking } from 'playwright-posthog';

const testWithAuth = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    // ... login logic
    await use(page);
  },
});

export const test = withPostHogTracking(testWithAuth);
```

### `hogMatchers`

Custom matchers to extend Playwright's `expect`:

```typescript
import { expect as baseExpect } from '@playwright/test';
import { hogMatchers } from 'playwright-posthog';

export const expect = baseExpect.extend(hogMatchers);
```

### Matchers

#### `toHaveFiredEvent(eventName, properties?, config?)`

Asserts that a PostHog event was fired. Automatically polls for up to 2 seconds.

```typescript
// Basic usage
await expect(page).toHaveFiredEvent('button_clicked');

// With property matching (subset match)
await expect(page).toHaveFiredEvent('purchase_completed', {
  plan: 'pro',
  amount: 99.99
});

// With custom timeout
await expect(page).toHaveFiredEvent('slow_event', {}, {
  timeout: 5000,      // Wait up to 5 seconds
  pollInterval: 200   // Check every 200ms
});
```

**Properties Matching**: Uses subset matching, meaning the event properties must *contain* the expected properties but can have additional properties.

#### `notToHaveFiredEvent(eventName, properties?, config?)`

Asserts that an event was NOT fired:

```typescript
await expect(page).notToHaveFiredEvent('error_occurred');
```

#### `toHaveCapturedEvents(count?)`

Asserts that events were captured:

```typescript
// At least one event
await expect(page).toHaveCapturedEvents();

// Exactly 5 events
await expect(page).toHaveCapturedEvents(5);
```

### Debug Mode

Enable debug mode via the `DEBUG` environment variable to see captured events in the console:

```bash
DEBUG=true npx playwright test

# Or use these alternatives
DEBUG=1 npx playwright test
DEBUG=playwright-posthog npx playwright test
```

### Utility Functions

```typescript
import { getCapturedEvents, clearCapturedEvents } from 'playwright-posthog';

test('advanced usage', async ({ page }) => {
  await page.goto('/');

  // Get all captured events
  const events = getCapturedEvents(page);
  console.log('Captured:', events);

  // Clear events (useful for multi-step tests)
  clearCapturedEvents(page);

  // Continue testing...
});
```

## How It Works

1. **Automatic Interception**: The fixture automatically intercepts network requests matching PostHog endpoints (`/e/`, `/capture/`, `/batch/`, `/s/`)

2. **Non-Blocking**: Requests are inspected but continue to PostHog normally (using `route.continue()`)

3. **Event Extraction**: Handles various PostHog payload formats:
   - Single events
   - Batch arrays
   - Nested structures

4. **Hidden Storage**: Events are stored on the Page object using TypeScript Symbols, keeping the API clean

5. **Async Polling**: The matcher polls for events because analytics are inherently asynchronous

## Supported PostHog Endpoints

playwright-posthog automatically detects these PostHog endpoints:

- `/e/` - Events endpoint
- `/capture` - Capture endpoint
- `/batch` - Batch endpoint
- `/s/` - Session recording endpoint

## Examples

### Testing Event Properties

```typescript
test('tracks user preferences', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Theme').selectOption('dark');
  await page.getByText('Save').click();

  await expect(page).toHaveFiredEvent('settings_updated', {
    theme: 'dark',
  });
});
```

### Testing Multiple Events

```typescript
test('tracks funnel events', async ({ page }) => {
  await page.goto('/product');
  await expect(page).toHaveFiredEvent('product_viewed');

  await page.getByText('Add to Cart').click();
  await expect(page).toHaveFiredEvent('add_to_cart');

  await page.getByText('Checkout').click();
  await expect(page).toHaveFiredEvent('checkout_started');
});
```

### Debugging Failed Assertions

When an assertion fails, you get detailed error messages:

```
Expected page to have fired event "user_signed_up" with properties {"plan":"pro"}, but it did not.

Waited 2000ms and captured 3 total event(s).

Found 1 event(s) with name "user_signed_up" but properties didn't match:

  Event 1: {
    "plan": "free",
    "source": "web"
  }

Expected properties: {
  "plan": "pro"
}
```

## TypeScript

Full TypeScript support is included. The custom matchers will appear in your IDE autocomplete when you use `expect(page).to...`.

Type definitions are automatically included when you import from `playwright-posthog`.

## Troubleshooting

### Events not being captured

1. **Enable debug mode** to see what's happening:
   ```bash
   DEBUG=true npx playwright test
   ```

2. **Check the endpoint**: Ensure PostHog is sending to a supported endpoint

3. **Verify PostHog initialization**: Make sure PostHog is actually loaded on your page

### False negatives

If events are being sent but not matched:

1. Check the event name (case-sensitive)
2. Use debug mode to see actual property values
3. Remember that property matching is subset-based

## Contributing

Contributions are welcome! Please open an issue or PR on GitHub.

## License

MIT
