/**
 * Jest config for integration tests.
 *
 * Integration tests are identified by the '.integration.test.ts' suffix
 * and live alongside unit tests in the source tree. They are excluded from
 * the base 'test' and 'test:cov' runs by naming convention.
 *
 * Uses ts-jest with ESM support because package.json declares
 * "type": "module" and tsconfig.json uses module: "NodeNext".
 *
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.integration.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Map ESM-style relative imports ending in '.js' back to extensionless
    // so ts-jest can resolve the corresponding '.ts' source file.
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
