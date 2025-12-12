const commonConfig = {
  clearMocks: true,
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  modulePathIgnorePatterns: ["lib", "build", "docs", "packages-bak"],
  notify: true,
  notifyMode: "always",
  snapshotSerializers: ["jest-serializer-path"],
  testEnvironment: "node",
  testPathIgnorePatterns: ["utils.ts"],
  preset: "ts-jest",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  transformIgnorePatterns: [
    // These are ESM modules that need to be transpiled before Jest can run them
    "/node_modules/(?!(d3.*|internmap|delaunator|robust-predicates)/)",
  ],
};

module.exports = {
  coverageDirectory: "coverage",
  coverageReporters: ["text", "clover"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  ...commonConfig,
  projects: [
    {
      displayName: "extension-tests",
      testMatch: [
        "<rootDir>/extension/architool/**/?(*.)+(spec|test).[jt]s?(x)",
        "<rootDir>/extension/architool/**/__tests__/**/*.[jt]s?(x)",
      ],
      ...commonConfig,
    },
    {
      displayName: "domain-tests",
      testMatch: [
        "<rootDir>/domain/**/?(*.)+(spec|test).[jt]s?(x)",
        "<rootDir>/domain/**/__tests__/**/*.[jt]s?(x)",
      ],
      ...commonConfig,
    },
    {
      displayName: "infrastructure-tests",
      testMatch: [
        "<rootDir>/infrastructure/**/?(*.)+(spec|test).[jt]s?(x)",
        "<rootDir>/infrastructure/**/__tests__/**/*.[jt]s?(x)",
      ],
      ...commonConfig,
    },
  ],
};
