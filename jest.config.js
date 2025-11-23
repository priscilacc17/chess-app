module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/nnn.js',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**'
  ],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/server/server.js"
  ],
  coverageReporters: ['lcov', 'text', 'html'],
  testMatch: ['**/tests/**/*.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 10000,
  // Forzar cierre de handles abiertos
  openHandlesTimeout: 1000
};