/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { diagnostics: { ignoreCodes: [151002] } },
    ],
  },
  // S-012 — coverage scope. Measure hand-written application logic only and
  // exclude framework boilerplate / declarative files that carry no testable
  // branches, so the percentage reflects real test depth. The authorization
  // tests (modules/authorization/*.spec.ts) are picked up by testRegex above.
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/index.ts',
    '!main.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/dto/**',
    '!**/entities/**',
    '!**/*.entity.ts',
    '!**/*.interface.ts',
    '!**/*.enum.ts',
    '!**/*.config.ts',
    '!**/*.decorator.ts',
  ],
  coverageDirectory: '../coverage',
  // Modest global floor: deliberately set LOW so the current low-coverage code
  // plus the new authorization tests pass today without forcing the build red.
  // These are a ratchet — bump each threshold up a few points every sprint as
  // coverage grows, until we reach the target (~70%+). Enforced only when jest
  // runs with --coverage (npm run test:cov); the default CI `test` step does
  // not pass --coverage, so thresholds never block a normal pipeline run.
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 8,
      lines: 10,
      statements: 10,
    },
  },
  testEnvironment: 'node',
};
