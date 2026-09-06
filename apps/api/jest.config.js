/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: true,
    }]
  },
  moduleNameMapper: {
    '^@afyaToken/types(.*)$': '<rootDir>/../../packages/types/src$1',
    '^@afyaToken/zod-schemas(.*)$': '<rootDir>/../../packages/zod-schemas/src$1'
  }
};
