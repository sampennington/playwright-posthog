# playwright-hog

Test PostHog analytics events in your Playwright tests with ease.

## Features

- **Zero Configuration**: Automatically intercepts PostHog requests
- **Type-Safe**: Full TypeScript support with autocomplete
- **Async Polling**: Waits for analytics events (they're async by nature)
- **Subset Matching**: Test specific event properties without exact matches
- **Debug Mode**: Optional logging to see captured events
- **Flexible API**: Use standalone or compose with existing fixtures

## Installation

```bash
npm install --save-dev playwright-hog
# or
yarn add --dev playwright-hog
# or
pnpm add --save-dev playwright-hog
```

## Quick Start

### Standalone Usage (Recommended)

Replace your Playwright imports with `playwright-hog`:

```typescript
import { test, expect } from 'playwright-hog';

test('user signup tracking works', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByText('Sign Up').click();

  // Assert the event was fired
  await expect(page).toHaveFiredEvent('user_signed_up', {
    plan: 'pro',
    source: 'web'
  });
});
```

### Composition Mode (Advanced)

Merge with your existing custom fixtures:

```typescript
// test-utils.ts
import { test as base, expect as baseExpect } from '@playwright/test';
import { hogFixture, hogMatchers } from 'playwright-hog';

// Extend with your custom fixtures
export const test = base.extend({
  ...hogFixture,
  // Your custom fixtures here
});

export const expect = baseExpect.extend(hogMatchers);
```

## API Reference

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

### Configuration Options

Enable debug mode to see captured events in the console:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    hogDebug: true, // Enable debug logging
  },
});
```

Or per-test:

```typescript
test.use({ hogDebug: true });

test('debug this test', async ({ page }) => {
  // Will log all captured events
  await page.goto('/');
});
```

### Utility Functions

```typescript
import { getCapturedEvents, clearCapturedEvents } from 'playwright-hog';

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

playwright-hog automatically detects these PostHog endpoints:

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
    // Other properties in the event are ignored
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

### With Custom Fixtures

```typescript
// custom-test.ts
import { test as base } from '@playwright/test';
import { hogFixture, hogMatchers } from 'playwright-hog';

type CustomFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<CustomFixtures>({
  ...hogFixture,

  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[name=email]', 'user@example.com');
    await page.fill('[name=password]', 'password');
    await page.click('button[type=submit]');
    await use(page);
  },
});

export const expect = base.expect.extend(hogMatchers);
```

## TypeScript

Full TypeScript support is included. The custom matchers will appear in your IDE autocomplete when you use `expect(page).to...`.

Type definitions are automatically included when you import from `playwright-hog`.

## Troubleshooting

### Events not being captured

1. **Enable debug mode** to see what's happening:
   ```typescript
   test.use({ hogDebug: true });
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

## Credits

Built for developers who want robust analytics testing without the hassle.
