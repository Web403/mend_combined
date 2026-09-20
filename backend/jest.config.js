/**
 * Jest configuration.
 *
 * Tests live outside `src/` on purpose: `npm run build` (and therefore the
 * Docker image) compiles `src` only, so no test code or test dependency can
 * reach production.
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/jest.setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  // nanoid v5 and uuid v13 ship ESM-only builds that Jest's CommonJS runtime
  // cannot require. Production is unaffected — this only redirects test
  // resolution to small CommonJS stand-ins.
  moduleNameMapper: {
    '^nanoid$': '<rootDir>/tests/helpers/nanoid-shim.js',
    '^uuid$': '<rootDir>/tests/helpers/uuid-shim.js',
  },
  testTimeout: 20000,
  // The review module is the unit under test; noise from unrelated modules is
  // not useful signal.
  clearMocks: false,
  verbose: false,
};
