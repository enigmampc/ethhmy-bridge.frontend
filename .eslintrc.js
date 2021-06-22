module.exports = {
  extends: ['react-app', 'plugin:@typescript-eslint/eslint-recommended'],
  env: {
    browser: true,
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  rules: {
    curly: 'error',
    'require-await': 'off',
  },
};
