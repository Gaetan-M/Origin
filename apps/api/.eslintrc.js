module.exports = {
  ...require('@origin/config/eslint-base'),
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    ...require('@origin/config/eslint-base').rules,
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
