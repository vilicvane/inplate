module.exports = {
  root: true,
  extends: 'eslint:recommended',
  env: {
    es2017: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'no-console': ['error', {allow: ['info', 'warn', 'error']}],
  },
  overrides: [
    {
      files: 'test/**/*.js',
      globals: {
        test: true,
        expect: true,
      },
    },
  ],
};
