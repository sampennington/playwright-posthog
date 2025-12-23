# 🦔 playwright-posthog

Test PostHog analytics events in your Playwright tests with ease.

## ✨ Features

- **🔌 Extends Playwright** - Works with your existing test setup
- **📝 Type-Safe** - Full TypeScript support with autocomplete
- **⏱️ Async Polling** - Waits for analytics events (they're async by nature)
- **🎯 Subset Matching** - Test specific event properties without exact matches
- **🐛 Debug Mode** - Set `DEBUG=true` to see captured events

## 📦 Installation

```bash
npm install --save-dev playwright-posthog
```

## 🚀 Setup

Extend your Playwright test with PostHog tracking:

```typescript
// fixtures.ts
import { test as base, expect as baseExpect } from '@playwright/test';
import { withPostHogTracking, matchers } from 'playwright-posthog';

export const test = withPostHogTracking(base);
export const expect = baseExpect.extend(matchers);
```

Then use in your tests:

```typescript
// my-test.spec.ts
import { test, expect } from './fixtures';

test('user signup tracking works', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByText('Sign Up').click();

  // ✅ Assert the event was fired
  await expect(page).toHaveFiredEvent('user_signed_up', {
    plan: 'pro',
    source: 'web'
  });
});
```

## 📖 API Reference

### `withPostHogTracking(test)`

Extends a Playwright test instance with PostHog event tracking on the `page` fixture.

```typescript
import { test as base } from '@playwright/test';
import { withPostHogTracking } from 'playwright-posthog';

export const test = withPostHogTracking(base);
```

Works with already-extended tests too:

```typescript
const testWithAuth = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // ... login logic
    await use(page);
  },
});

export const test = withPostHogTracking(testWithAuth);
```

### `matchers`

Custom matchers to extend Playwright's `expect`:

```typescript
import { expect as baseExpect } from '@playwright/test';
import { matchers } from 'playwright-posthog';

export const expect = baseExpect.extend(matchers);
```

### 🎯 Matchers

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

> 💡 **Properties Matching**: Uses subset matching - the event properties must *contain* the expected properties but can have additional ones.

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

### 🐛 Debug Mode

Enable debug mode via the `DEBUG` environment variable:

```bash
DEBUG=true npx playwright test
```

### 🛠️ Utility Functions

```typescript
import { getCapturedEvents, clearCapturedEvents } from 'playwright-posthog';

test('advanced usage', async ({ page }) => {
  await page.goto('/');

  // Get all captured events
  const events = getCapturedEvents(page);

  // Clear events (useful for multi-step tests)
  clearCapturedEvents(page);
});
```

## ⚙️ How It Works

1. **🔍 Automatic Interception** - Intercepts requests to PostHog endpoints (`/e/`, `/capture/`, `/batch/`, `/s/`)
2. **🚦 Non-Blocking** - Requests continue to PostHog normally
3. **📦 Event Extraction** - Handles batch arrays, single events, and nested structures
4. **🔒 Hidden Storage** - Events stored using Symbols to keep the API clean
5. **⏳ Async Polling** - Polls for events because analytics are inherently async

## 📚 Examples

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

### Testing a Funnel

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

## 🔧 Troubleshooting

### Events not being captured?

1. **Enable debug mode** to see what's happening:
   ```bash
   DEBUG=true npx playwright test
   ```

2. **Check the endpoint** - Ensure PostHog is sending to a supported endpoint

3. **Verify PostHog initialization** - Make sure PostHog is loaded on your page

### False negatives?

1. Check the event name (case-sensitive)
2. Use debug mode to see actual property values
3. Remember that property matching is subset-based

## 📄 License

MIT
