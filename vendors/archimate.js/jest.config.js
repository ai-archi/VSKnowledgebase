/**
 * Jest configuration for archimate.js
 */

module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/test/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' },
          modules: 'commonjs'
        }]
      ]
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(diagram-js|moddle|moddle-xml|ids|min-dash|min-dom|tiny-svg|inherits-browser|didi|object-refs)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000, // 30 seconds timeout for async tests
  verbose: true
};
