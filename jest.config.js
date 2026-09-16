module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'js/engine/**/*.js',
    '!js/engine/speechEngine.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testMatch: ['**/tests/**/*.test.js']
};
