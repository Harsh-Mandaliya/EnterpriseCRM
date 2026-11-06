module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  // React Native + web (react-native-web) run in both environments;
  // `window` is only touched behind Platform.OS === 'web' checks.
  env: { es2021: true, node: true, browser: true },
  globals: {
    __DEV__: 'readonly',
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'web-build/'],
  rules: {
    // TypeScript reports unused symbols itself (noUnused* / editor);
    // the core rule does not understand type-only usages.
    'no-unused-vars': 'off',
  },
};
