// Skip @testing-library/react-native version check
// (react@18.2.0 in package.json but jest-expo uses React 19 at runtime)
process.env.RNTL_SKIP_DEPS_CHECK = '1';

/** @type {import('jest').Config} */
module.exports = {
    preset: 'jest-expo',
    transformIgnorePatterns: [
        '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|react-native-svg|zustand))',
        '/node_modules/react-native-reanimated/plugin/',
    ],
    moduleNameMapper: {
        // Mock the @zerog/ui package to provide theme values in tests
        '^@zerog/ui$': '<rootDir>/__mocks__/@zerog/ui.js',
    },
    // Ensure hoisted packages resolve react from apps/mobile/node_modules (React 19)
    // rather than the root node_modules (React 18), keeping versions consistent
    moduleDirectories: ['node_modules', '<rootDir>/node_modules'],
    testPathIgnorePatterns: ['/node_modules/', '/maestro/'],
    collectCoverageFrom: [
        'stores/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
    ],
};
