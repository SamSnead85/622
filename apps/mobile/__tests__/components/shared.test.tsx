// ============================================
// Shared Components — Render Tests
// Verifies components render without crashing
// ============================================

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// ============================================
// Mocks
// ============================================

// Mock expo-router (used by BackButton)
jest.mock('expo-router', () => ({
    useRouter: () => ({
        back: jest.fn(),
        push: jest.fn(),
        replace: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
    useSegments: () => [],
    Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-image (used by Avatar)
jest.mock('expo-image', () => {
    const { View } = require('react-native');
    return {
        Image: (props: any) => <View {...props} testID="expo-image" />,
    };
});

// Mock expo-haptics (used by Button)
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy',
    },
}));

// Mock react-native-safe-area-context (used by ScreenHeader)
jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
    const { Text } = require('react-native');
    return {
        Ionicons: (props: any) => <Text testID={`icon-${props.name}`}>{props.name}</Text>,
    };
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
}));

// ============================================
// Component Imports
// ============================================

import { BackButton } from '../../components/BackButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Avatar } from '../../components/Avatar';
import { GlassCard } from '../../components/GlassCard';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingView } from '../../components/LoadingView';
import { EmptyState } from '../../components/EmptyState';

// ============================================
// Tests
// ============================================

describe('Shared Components', () => {
    // ------------------------------------------
    // BackButton
    // ------------------------------------------
    describe('BackButton', () => {
        it('renders without crashing', () => {
            const { getByLabelText } = render(<BackButton />);
            expect(getByLabelText('Go back')).toBeTruthy();
        });

        it('renders with custom label', () => {
            const { getByLabelText } = render(<BackButton label="Navigate back" />);
            expect(getByLabelText('Navigate back')).toBeTruthy();
        });
    });

    // ------------------------------------------
    // ScreenHeader
    // ------------------------------------------
    describe('ScreenHeader', () => {
        it('renders with title', () => {
            const { getByText } = render(<ScreenHeader title="Settings" />);
            expect(getByText('Settings')).toBeTruthy();
        });

        it('renders without back button when showBack is false', () => {
            const { getByText, queryByLabelText } = render(
                <ScreenHeader title="Home" showBack={false} />
            );
            expect(getByText('Home')).toBeTruthy();
            expect(queryByLabelText('Go back')).toBeNull();
        });

        it('renders with right element', () => {
            const { getByText } = render(
                <ScreenHeader
                    title="Profile"
                    rightElement={<Text>Edit</Text>}
                />
            );
            expect(getByText('Profile')).toBeTruthy();
            expect(getByText('Edit')).toBeTruthy();
        });
    });

    // ------------------------------------------
    // Avatar
    // ------------------------------------------
    describe('Avatar', () => {
        it('renders with image URI', () => {
            const { getByLabelText } = render(
                <Avatar uri="https://example.com/avatar.jpg" name="John" />
            );
            expect(getByLabelText("John's avatar")).toBeTruthy();
        });

        it('renders fallback initial when no URI', () => {
            const { getByText } = render(<Avatar name="Sarah" />);
            expect(getByText('S')).toBeTruthy();
        });

        it('renders ? when no name or URI', () => {
            const { getByText } = render(<Avatar />);
            expect(getByText('?')).toBeTruthy();
        });

        it('renders with different sizes', () => {
            const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
            sizes.forEach((size) => {
                const { unmount } = render(<Avatar name="A" size={size} />);
                unmount();
            });
        });
    });

    // ------------------------------------------
    // GlassCard
    // ------------------------------------------
    describe('GlassCard', () => {
        it('renders with children', () => {
            const { getByText } = render(
                <GlassCard>
                    <Text>Card content</Text>
                </GlassCard>
            );
            expect(getByText('Card content')).toBeTruthy();
        });

        it('renders with gold variant', () => {
            const { getByText } = render(
                <GlassCard gold>
                    <Text>Gold card</Text>
                </GlassCard>
            );
            expect(getByText('Gold card')).toBeTruthy();
        });

        it('renders with different padding sizes', () => {
            const paddings = ['none', 'sm', 'md', 'lg'] as const;
            paddings.forEach((padding) => {
                const { unmount } = render(
                    <GlassCard padding={padding}>
                        <Text>Content</Text>
                    </GlassCard>
                );
                unmount();
            });
        });
    });

    // ------------------------------------------
    // Button
    // ------------------------------------------
    describe('Button', () => {
        it('renders with title', () => {
            const { getByText } = render(
                <Button title="Submit" onPress={() => {}} />
            );
            expect(getByText('Submit')).toBeTruthy();
        });

        it('renders all variants without errors', () => {
            const variants = ['primary', 'secondary', 'ghost', 'danger'] as const;
            variants.forEach((variant) => {
                const { unmount } = render(
                    <Button title={variant} variant={variant} onPress={() => {}} />
                );
                unmount();
            });
        });

        it('renders all sizes without errors', () => {
            const sizes = ['sm', 'md', 'lg'] as const;
            sizes.forEach((size) => {
                const { unmount } = render(
                    <Button title="Test" size={size} onPress={() => {}} />
                );
                unmount();
            });
        });

        it('renders in loading state', () => {
            const { queryByText } = render(
                <Button title="Submit" onPress={() => {}} loading />
            );
            // When loading, title text should not be visible
            expect(queryByText('Submit')).toBeNull();
        });

        it('renders in disabled state', () => {
            const { getByLabelText } = render(
                <Button title="Submit" onPress={() => {}} disabled />
            );
            expect(getByLabelText('Submit')).toBeTruthy();
        });
    });

    // ------------------------------------------
    // Input
    // ------------------------------------------
    describe('Input', () => {
        it('renders without crashing', () => {
            const { getByLabelText } = render(
                <Input placeholder="Enter text" />
            );
            expect(getByLabelText('Enter text')).toBeTruthy();
        });

        it('renders with label', () => {
            const { getByText } = render(
                <Input label="Email" placeholder="Enter email" />
            );
            expect(getByText('Email')).toBeTruthy();
        });

        it('renders with error message', () => {
            const { getByText } = render(
                <Input label="Password" error="Too short" placeholder="Password" />
            );
            expect(getByText('Too short')).toBeTruthy();
        });

        it('renders with icon', () => {
            const { getByTestId } = render(
                <Input icon="mail-outline" placeholder="Email" />
            );
            expect(getByTestId('icon-mail-outline')).toBeTruthy();
        });
    });

    // ------------------------------------------
    // LoadingView
    // ------------------------------------------
    describe('LoadingView', () => {
        it('renders without crashing', () => {
            const { getByLabelText } = render(<LoadingView />);
            expect(getByLabelText('Loading')).toBeTruthy();
        });

        it('renders with custom message', () => {
            const { getByText } = render(<LoadingView message="Fetching data..." />);
            expect(getByText('Fetching data...')).toBeTruthy();
        });
    });

    // ------------------------------------------
    // EmptyState
    // ------------------------------------------
    describe('EmptyState', () => {
        it('renders with message', () => {
            const { getByText } = render(
                <EmptyState message="No posts yet" />
            );
            expect(getByText('No posts yet')).toBeTruthy();
        });

        it('renders with title and message', () => {
            const { getByText } = render(
                <EmptyState title="All caught up!" message="Check back later" />
            );
            expect(getByText('All caught up!')).toBeTruthy();
            expect(getByText('Check back later')).toBeTruthy();
        });

        it('renders with action button', () => {
            const mockAction = jest.fn();
            const { getByText } = render(
                <EmptyState
                    message="No results"
                    actionLabel="Try again"
                    onAction={mockAction}
                />
            );
            expect(getByText('Try again')).toBeTruthy();
        });

        it('renders in compact mode', () => {
            const { getByText } = render(
                <EmptyState message="Empty" compact />
            );
            expect(getByText('Empty')).toBeTruthy();
        });
    });
});
