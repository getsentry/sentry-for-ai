---
name: sentry-setup-nextjs
description: Manually install and configure Sentry SDK in Next.js projects. Use this when asked to set up Sentry in a Next.js application, add Sentry monitoring, or manually configure Sentry for Next.js.
allowed-tools: Read, Edit, Write, Bash, Grep, Glob, AskUserQuestion
---

# Sentry Next.js Manual Setup

This skill guides you through manually installing and configuring the Sentry SDK in a Next.js project using the official manual setup steps.

## When to Use This Skill

Invoke this skill when:
- User asks to "install Sentry in Next.js" or "set up Sentry monitoring"
- User wants to "add Sentry to a Next.js project"
- User requests "manual Sentry configuration for Next.js"
- User mentions they need error tracking in their Next.js app
- User wants to configure Sentry without using the wizard

## Prerequisites Check

Before starting, verify:
1. **Next.js Project Exists**: Confirm `package.json` and `next.config.(js|ts)` exist
2. **Node Package Manager**: Check which package manager is used (npm, yarn, pnpm, bun)
3. **Next.js Version**: Read `package.json` to identify Next.js version (App Router vs Pages Router)
4. **TypeScript or JavaScript**: Check if project uses `.ts` or `.js` files
5. **Sentry Account Info**: Ask user for DSN (required) and optionally org/project slugs

## Required Information from User

Before proceeding, gather:
- **DSN** (Data Source Name): Required for all Sentry initialization
- **Organization Slug**: Optional, needed for source maps and releases
- **Project Slug**: Optional, needed for source maps and releases
- **Auth Token**: Optional, required for uploading source maps

Ask the user for this information if not already provided:
```
To set up Sentry, I'll need some information:

1. **DSN** (Required): Your Sentry DSN from your project settings
   Example: https://examplePublicKey@o0.ingest.sentry.io/0

2. **Organization Slug** (Optional): For source map uploads
3. **Project Slug** (Optional): For source map uploads
4. **Auth Token** (Optional): For uploading source maps to Sentry
   Can be set as SENTRY_AUTH_TOKEN environment variable later

Which of these do you have available now?
```

## Workflow

### Phase 1: Install Sentry SDK

1. **Determine Package Manager**
   Check for lock files:
   ```bash
   ls -la package-lock.json yarn.lock pnpm-lock.yaml bun.lockb
   ```

2. **Install @sentry/nextjs**
   Use the appropriate command:
   - npm: `npm install @sentry/nextjs --save`
   - yarn: `yarn add @sentry/nextjs`
   - pnpm: `pnpm add @sentry/nextjs`
   - bun: `bun add @sentry/nextjs`

3. **Verify Installation**
   Read `package.json` to confirm `@sentry/nextjs` was added to dependencies.

### Phase 2: Create Configuration Files

Determine file extension (`.js` or `.ts`) based on project setup.

#### 2.1: Create Client Configuration

Create `instrumentation-client.(js|ts)` in project root:

**For JavaScript projects** (`instrumentation-client.js`):
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_DSN_HERE",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});
```

**For TypeScript projects** (`instrumentation-client.ts`):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_DSN_HERE",

  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Important**: Replace `YOUR_DSN_HERE` with the actual DSN provided by the user.

#### 2.2: Create Server Configuration

Create `sentry.server.config.(js|ts)` in project root:

**For JavaScript projects** (`sentry.server.config.js`):
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_DSN_HERE",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});
```

**For TypeScript projects** (`sentry.server.config.ts`):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_DSN_HERE",
  tracesSampleRate: 1.0,
});
```

#### 2.3: Create Edge Configuration

Create `sentry.edge.config.(js|ts)` in project root:

**For JavaScript projects** (`sentry.edge.config.js`):
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_DSN_HERE",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,

  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps
});
```

**For TypeScript projects** (`sentry.edge.config.ts`):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_DSN_HERE",
  tracesSampleRate: 1.0,
});
```

#### 2.4: Create Instrumentation File

Create `instrumentation.(js|ts)` in project root:

**For JavaScript projects** (`instrumentation.js`):
```javascript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
```

**For TypeScript projects** (`instrumentation.ts`):
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
```

### Phase 3: Configure Next.js

#### 3.1: Update next.config file

1. **Read Existing Configuration**
   Read `next.config.js` or `next.config.ts` to understand current setup.

2. **Wrap with Sentry Config**

   **For JavaScript projects** (`next.config.js`):

   If the file exports a simple object:
   ```javascript
   const { withSentryConfig } = require("@sentry/nextjs");

   const nextConfig = {
     // Your existing Next.js config
   };

   module.exports = withSentryConfig(nextConfig, {
     // For all available options, see:
     // https://github.com/getsentry/sentry-webpack-plugin#options

     org: "YOUR_ORG_SLUG",
     project: "YOUR_PROJECT_SLUG",

     // Only print logs for uploading source maps in CI
     silent: !process.env.CI,

     // For all available options, see:
     // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

     // Upload a larger set of source maps for prettier stack traces (increases build time)
     widenClientFileUpload: true,

     // Automatically annotate React components to show their full name in breadcrumbs and session replay
     reactComponentAnnotation: {
       enabled: true,
     },

     // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
     // This can increase your server load as well as your hosting bill.
     // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
     // side errors will fail.
     tunnelRoute: "/monitoring",

     // Hides source maps from generated client bundles
     hideSourceMaps: true,

     // Automatically tree-shake Sentry logger statements to reduce bundle size
     disableLogger: true,

     // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
     // See the following for more information:
     // https://docs.sentry.io/product/crons/
     // https://vercel.com/docs/cron-jobs
     automaticVercelMonitors: true,
   });
   ```

   If the file uses `module.exports = ...` directly, modify to store in variable first, then wrap.

   **For TypeScript projects** (`next.config.ts` or `.mjs`):
   ```typescript
   import { withSentryConfig } from "@sentry/nextjs";

   const nextConfig = {
     // Your existing Next.js config
   };

   export default withSentryConfig(nextConfig, {
     org: "YOUR_ORG_SLUG",
     project: "YOUR_PROJECT_SLUG",
     silent: !process.env.CI,
     widenClientFileUpload: true,
     reactComponentAnnotation: {
       enabled: true,
     },
     tunnelRoute: "/monitoring",
     hideSourceMaps: true,
     disableLogger: true,
     automaticVercelMonitors: true,
   });
   ```

3. **Replace Placeholders**
   - Replace `YOUR_ORG_SLUG` with organization slug (if provided) or remove the line
   - Replace `YOUR_PROJECT_SLUG` with project slug (if provided) or remove the line
   - If org/project not provided, remove those options and inform user they can add later for source maps

### Phase 4: Add Error Boundary Components

The error boundary setup differs based on Next.js router type.

#### For App Router (Next.js 13+)

Check if `app` directory exists. If yes, create:

**`app/global-error.(jsx|tsx)`** in the app directory:

**For JavaScript/JSX**:
```jsx
"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({ error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={undefined} />
      </body>
    </html>
  );
}
```

**For TypeScript/TSX**:
```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={undefined} />
      </body>
    </html>
  );
}
```

#### For Pages Router (Next.js 12 and below)

Check if `pages` directory exists. If yes, create:

**`pages/_error.(jsx|tsx)`**:

**For JavaScript/JSX**:
```jsx
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";

function CustomErrorComponent(props) {
  return <NextError statusCode={props.statusCode} />;
}

CustomErrorComponent.getInitialProps = async (contextData) => {
  await Sentry.captureUnderscoreErrorException(contextData);
  return NextError.getInitialProps(contextData);
};

export default CustomErrorComponent;
```

**For TypeScript/TSX**:
```tsx
import * as Sentry from "@sentry/nextjs";
import type { NextPage } from "next";
import type { ErrorProps } from "next/error";
import NextError from "next/error";

const CustomErrorComponent: NextPage<ErrorProps> = (props) => {
  return <NextError statusCode={props.statusCode} />;
};

CustomErrorComponent.getInitialProps = async (contextData) => {
  await Sentry.captureUnderscoreErrorException(contextData);
  return NextError.getInitialProps(contextData);
};

export default CustomErrorComponent;
```

### Phase 5: Environment Variables (Optional)

If user provided auth token, inform them to add to their environment:

Create or update `.env.local` (do NOT commit this file):
```
SENTRY_AUTH_TOKEN=your_auth_token_here
```

Also recommend adding to `.gitignore`:
```
.env.local
.env*.local
```

Inform user they should also set this in their deployment environment (Vercel, etc.).

### Phase 6: Verification

1. **List Created Files**
   Show the user all files that were created:
   ```
   Created the following Sentry configuration files:
   - instrumentation-client.(js|ts)
   - sentry.server.config.(js|ts)
   - sentry.edge.config.(js|ts)
   - instrumentation.(js|ts)
   - next.config.(js|ts) (modified)
   - app/global-error.(jsx|tsx) OR pages/_error.(jsx|tsx)
   ```

2. **Next Steps for User**
   Inform the user:
   ```
   Sentry is now configured! Next steps:

   1. Test the setup:
      - Run your development server: npm run dev
      - Trigger a test error to verify Sentry captures it

   2. Optional configurations:
      - Adjust tracesSampleRate for production (currently set to 1.0)
      - Configure release tracking with SENTRY_RELEASE env var
      - Set up source maps with auth token for better stack traces

   3. Deploy:
      - Add SENTRY_AUTH_TOKEN to your deployment environment
      - Verify error tracking works in production
   ```

## Important Notes

### DSN Security
- The DSN is safe to include in client-side code - it's public by design
- The Auth Token should NEVER be committed to git - it's secret
- Always use environment variables for the auth token

### Configuration Options

**Recommended for Production:**
- Lower `tracesSampleRate` to 0.1 or 0.2 (captures 10-20% of transactions)
- Lower `replaysSessionSampleRate` to 0.01 or less (captures 1% of sessions)
- Keep `replaysOnErrorSampleRate` at 1.0 (captures 100% of error sessions)

**Source Maps:**
- Requires `org`, `project`, and auth token
- Dramatically improves error stack traces
- Uploaded automatically during build
- Set `hideSourceMaps: true` to keep them out of production bundles

**Tunneling:**
- Use `tunnelRoute` to bypass ad blockers
- Increases server load
- Default route: `/monitoring`
- Ensure it doesn't conflict with your app's routes

### File Locations

All configuration files go in the **project root** (same level as `package.json`):
```
my-nextjs-app/
├── package.json
├── next.config.js
├── instrumentation.js
├── instrumentation-client.js
├── sentry.server.config.js
├── sentry.edge.config.js
├── app/
│   └── global-error.jsx
└── pages/
    └── _error.jsx
```

### Router Detection

**App Router indicators:**
- `app/` directory exists
- `app/layout.(js|jsx|ts|tsx)` exists
- Next.js 13+ in package.json

**Pages Router indicators:**
- `pages/` directory exists
- `pages/_app.(js|jsx|ts|tsx)` exists
- Next.js 12 or earlier

Some projects may have both (gradual migration). In this case, create error boundaries for both.

## Common Issues and Solutions

### Issue: "Cannot find module '@sentry/nextjs'"
**Solution**: Verify installation completed, check `package.json` dependencies

### Issue: "instrumentation.ts is not working"
**Solution**: Ensure `experimental.instrumentationHook = true` in `next.config.js` for Next.js < 15

### Issue: Errors not appearing in Sentry
**Solution**:
1. Verify DSN is correct
2. Check browser console for Sentry connection errors
3. Ensure error boundary components are in correct locations
4. Test with a deliberate error: `throw new Error("Test Sentry")`

### Issue: Source maps not uploading
**Solution**:
1. Verify `SENTRY_AUTH_TOKEN` is set
2. Check `org` and `project` slugs are correct
3. Look at build logs for Sentry plugin output
4. Ensure auth token has `project:releases` and `org:read` permissions

## Testing the Setup

After setup, add a test error button to verify:

**App Router** (`app/page.tsx`):
```tsx
export default function Page() {
  return (
    <button
      onClick={() => {
        throw new Error("Sentry Test Error");
      }}
    >
      Test Sentry
    </button>
  );
}
```

**Pages Router** (`pages/index.tsx`):
```tsx
export default function Home() {
  return (
    <button
      onClick={() => {
        throw new Error("Sentry Test Error");
      }}
    >
      Test Sentry
    </button>
  );
}
```

Click the button and check Sentry dashboard for the error.

## Best Practices

### DO:
- ✅ Use environment variables for auth tokens
- ✅ Lower sample rates in production
- ✅ Test error tracking before deploying
- ✅ Set up source maps for better debugging
- ✅ Configure release tracking
- ✅ Review and adjust performance monitoring settings

### DON'T:
- ❌ Commit auth tokens to git
- ❌ Use 100% trace sampling in production
- ❌ Skip error boundary setup
- ❌ Forget to test the integration
- ❌ Ignore Sentry's build output messages
- ❌ Deploy without configuring environment variables

## Quick Command Reference

**Install**: `npm install @sentry/nextjs --save`
**Test dev server**: `npm run dev`
**Build**: `npm run build`
**Check installation**: `grep @sentry/nextjs package.json`

## Success Criteria

A successful setup includes:
- ✅ @sentry/nextjs installed in package.json
- ✅ All 4 configuration files created with correct DSN
- ✅ next.config wrapped with withSentryConfig
- ✅ Error boundary component(s) created
- ✅ Auth token configured (if doing source maps)
- ✅ Test error successfully captured in Sentry dashboard

## Additional Resources

- Official docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- Sentry Next.js GitHub: https://github.com/getsentry/sentry-javascript/tree/develop/packages/nextjs
- Configuration options: https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/
