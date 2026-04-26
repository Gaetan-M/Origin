module.exports = {
  ...require('@origin/config/eslint-base'),
  extends: [
    ...require('@origin/config/eslint-base').extends,
    'next/core-web-vitals',
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    ...require('@origin/config/eslint-base').rules,
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
