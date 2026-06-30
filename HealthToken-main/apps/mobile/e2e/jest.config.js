/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  maxWorkers: 1,
  testMatch: ['**/*.e2e.js'],
  setupFilesAfterEnv: ['./init.js'],
  reporters: ['detox/runners/jest/reporter'],
  verbose: true,
};
