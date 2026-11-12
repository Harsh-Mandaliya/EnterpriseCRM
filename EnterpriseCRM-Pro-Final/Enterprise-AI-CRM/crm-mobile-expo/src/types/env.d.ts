/**
 * Expo inlines `process.env.EXPO_PUBLIC_*` variables at bundle time
 * (see https://docs.expo.dev/guides/environment-variables/).
 *
 * TypeScript 6 no longer auto-includes every `@types/*` package, so
 * `process` is not declared for app code. Rather than pulling the full
 * Node.js global surface into React Native code, declare only the part
 * the app is allowed to read.
 */
declare const process: {
  readonly env: {
    readonly NODE_ENV?: string;
    readonly [key: `EXPO_PUBLIC_${string}`]: string | undefined;
  };
};
