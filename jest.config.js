// @ts-check

/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'], // Treat .ts as ESM
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Adjust imports ending in .js
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [ // Transform TS/TSX with ts-jest using ESM options
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json', // Explicitly point to tsconfig
      },
    ],
  },
  testMatch: ['**/test/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  testTimeout: 10000,
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};

export default config;