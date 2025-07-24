/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  preset: "ts-jest",
  testEnvironment: "node",

  // Root directory
  rootDir: ".",

  // Test file patterns
  testMatch: ["<rootDir>/tests/**/*.test.ts"],

  // Module file extensions
  moduleFileExtensions: ["ts", "js", "json", "node"],

  // Transform configuration
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov", "html", "json"],
  collectCoverageFrom: [
    "core/**/*.ts",
    "!core/**/*.d.ts",
    "!core/**/*.test.ts",
    "!core/**/*.spec.ts",
    "!**/node_modules/**",
    "!**/dist/**",
    "!**/build/**",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Test timeout
  testTimeout: 300000, // 5 minutes for comprehensive tests

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Test organization (simplified - projects disabled for now)
  // projects: [
  //   {
  //     displayName: 'Unit Tests',
  //     testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  //     setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
  //   },
  //   {
  //     displayName: 'Integration Tests',
  //     testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  //     setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
  //   }
  // ],

  // Reporter configuration
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "./test-reports",
        filename: "test-report.html",
        expand: true,
        hideIcon: false,
        pageTitle: "OpenFlow SDK Test Report",
      },
    ],
    [
      "jest-junit",
      {
        outputDirectory: "./test-reports",
        outputName: "junit.xml",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}",
        ancestorSeparator: " › ",
        usePathForSuiteName: true,
      },
    ],
  ],

  // Error handling
  errorOnDeprecated: true,

  // Cache configuration
  cache: true,
  cacheDirectory: "<rootDir>/.jest-cache",

  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/build/",
    "<rootDir>/coverage/",
    "<rootDir>/test-reports/",
    "<rootDir>/of_tmp/",
    "<rootDir>/temp/",
    "<rootDir>/test_temp/",
  ],

  // Module resolution
  resolver: undefined,

  // Test execution
  maxWorkers: "50%",
  bail: false,

  // Environment variables
  testEnvironmentOptions: {
    NODE_ENV: "test",
  },
};
