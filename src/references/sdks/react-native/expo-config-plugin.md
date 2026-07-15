# Expo Config Plugin Reference — Sentry React Native SDK

Configure the plugin in `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "url": "https://sentry.io/",
          "project": "my-project",
          "organization": "my-org",
          "note": "Set SENTRY_AUTH_TOKEN env var for native builds"
        }
      ]
    ]
  }
}
```

Or in `app.config.js` (allows env var interpolation):

```javascript
export default {
  expo: {
    plugins: [
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: process.env.SENTRY_PROJECT,
          organization: process.env.SENTRY_ORG,
          disableAutoUpload: process.env.NODE_ENV === "development",
        },
      ],
    ],
  },
};
```

> **Tip:** Set `disableAutoUpload: true` during local development to speed up builds by skipping source map and dSYM uploads. The option is available in SDK ≥8.13.0.
