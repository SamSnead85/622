// Entry point shim for Metro bundler in monorepo setup.
// Metro's _resolveRelativePath requires a relative path in package.json "main".
// This file bridges to expo-router/entry which is hoisted to the monorepo root.
import 'expo-router/entry';
