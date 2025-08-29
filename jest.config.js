export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverage: true,
  coverageReporters: ['text'],
  collectCoverageFrom: [
    'courseconverter.js',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true
};