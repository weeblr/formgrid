module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            diagnostics: {
                ignoreCodes: [6133],
            },
        }],
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/server.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
    testTimeout: 30000,
    forceExit: true,
    // Run tests in sequence to avoid database conflicts
    maxWorkers: 1,
    // Clear mocks and modules between tests
    clearMocks: true,
    restoreMocks: true,
};
