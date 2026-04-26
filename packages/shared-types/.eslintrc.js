module.exports = {
  ...require('@origin/config/eslint-base'),
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
};
