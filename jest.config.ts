import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    // CSS files → class-name proxy (identity-obj-proxy)
    '\\.(css|scss)$': 'identity-obj-proxy',
    // Image files → stub string
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/src/__mocks__/fileMock.ts',
    // Markdown files → stub string
    '\\.md$': '<rootDir>/src/__mocks__/markdownMock.ts',
    // react-markdown v10 is ESM-only; replace with a simple sync mock
    '^react-markdown$': '<rootDir>/src/__mocks__/ReactMarkdown.tsx',
  },
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)', '**/*.test.(ts|tsx)'],
  // Exclude node_modules and the worktree backup dir
  testPathIgnorePatterns: ['/node_modules/', '/node_modules_worktree_bak/'],
  // Don't transform node_modules (CJS packages work natively)
  transformIgnorePatterns: ['/node_modules/', '/node_modules_worktree_bak/'],
  // Use tsconfig.test.json which includes @types/jest and omits 'exclude'
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};

export default config;
