module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  globals: {
    __TEST__: true
  },
  setupFiles: ['<rootDir>/src/spec/helpers/set_env_vars.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/spec/helpers/jest_setup.ts'],
  globalSetup: '<rootDir>/src/spec/helpers/global_setup.ts',
  globalTeardown: '<rootDir>/src/spec/helpers/global_teardown.ts',
  testPathIgnorePatterns: [".d.ts", ".js"]
};